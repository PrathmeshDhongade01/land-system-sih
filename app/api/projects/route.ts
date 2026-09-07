import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile, createServiceRoleClient } from '@/lib/supabase/server'

/* -------------------------------------------------------------------------- */
/* RBAC                                                                       */
/* -------------------------------------------------------------------------- */

const ALLOWED_CREATE_ROLES = new Set(['Admin', 'SLAO', 'MoRTH Nodal Officer'])

const ALLOWED_PROJECT_TYPES = new Set([
  'National Highway',
  'State Highway',
  'Railway',
  'Irrigation',
  'Power Transmission',
  'Urban Development',
  'Defence',
  'Other',
])

const ALLOWED_GIS_TYPES = new Set([
  'application/json',
  'application/geo+json',
  'application/vnd.google-earth.kml+xml',
  'application/xml',
  'text/xml',
  'text/plain', // some KML exports
])

const ALLOWED_DOC_TYPES = new Set(['application/pdf'])

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

/* -------------------------------------------------------------------------- */
/* POST /api/projects                                                         */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    if (!ALLOWED_CREATE_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Only Admin, SLAO, or MoRD Nodal Officers can create projects.' },
        { status: 403 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()

    const project_name       = (formData.get('project_name') as string | null)?.trim()
    const project_code       = (formData.get('project_code') as string | null)?.trim()
    const state              = (formData.get('state') as string | null)?.trim() || null
    const district           = (formData.get('district') as string | null)?.trim() || null
    const acquiring_authority = (formData.get('acquiring_authority') as string | null)?.trim() || null
    const project_type       = (formData.get('project_type') as string | null)?.trim() || null
    const total_area_required_ha = formData.get('total_area_required_ha')
    const target_date        = (formData.get('target_date') as string | null)?.trim() || null
    const description        = (formData.get('description') as string | null)?.trim() || null
    const corridor_length_km = formData.get('corridor_length_km')
    const gisFile            = formData.get('gis_file') as File | null
    const docFile            = formData.get('proposal_document') as File | null

    // Validation
    if (!project_name) {
      return NextResponse.json({ success: false, error: 'project_name is required.' }, { status: 400 })
    }
    if (!project_code) {
      return NextResponse.json({ success: false, error: 'project_code is required.' }, { status: 400 })
    }
    if (project_type && !ALLOWED_PROJECT_TYPES.has(project_type)) {
      return NextResponse.json({ success: false, error: `Invalid project_type: ${project_type}` }, { status: 400 })
    }

    const dbClient = createServiceRoleClient() || authRes.supabase

    let gis_file_url: string | null = null
    let proposal_document_url: string | null = null

    // Upload GIS file if provided
    if (gisFile && gisFile.size > 0) {
      const fileNameLower = (gisFile.name || '').toLowerCase()
      const isGisExtValid = /\.(geojson|json|kml)$/i.test(fileNameLower)
      const isGisMimeValid = ALLOWED_GIS_TYPES.has(gisFile.type)

      if (!isGisMimeValid && !isGisExtValid) {
        return NextResponse.json(
          { success: false, error: `GIS file type '${gisFile.type}' not allowed. Use GeoJSON or KML.` },
          { status: 400 }
        )
      }
      if (gisFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, error: 'GIS file exceeds 20 MB limit.' }, { status: 400 })
      }

      const gisExt = fileNameLower.endsWith('.kml') ? 'kml' : 'geojson'
      const gisPath = `projects/${project_code}/${Date.now()}_boundary.${gisExt}`

      const arrayBuf = await gisFile.arrayBuffer()
      const uploadContentType = gisFile.type && gisFile.type !== 'application/octet-stream'
        ? gisFile.type
        : (gisExt === 'kml' ? 'application/vnd.google-earth.kml+xml' : 'application/json')

      const { error: gisErr } = await dbClient.storage
        .from('project-gis')
        .upload(gisPath, arrayBuf, { contentType: uploadContentType, upsert: true })

      if (gisErr) {
        // Non-fatal: log and continue without GIS URL (bucket may not exist yet)
        console.warn('[POST /api/projects] GIS upload warning:', gisErr.message)
      } else {
        const { data: signedData } = await dbClient.storage
          .from('project-gis')
          .createSignedUrl(gisPath, 60 * 60 * 24 * 365) // 1-year signed URL
        gis_file_url = signedData?.signedUrl || gisPath
      }
    }

    // Upload proposal document if provided
    if (docFile && docFile.size > 0) {
      if (!ALLOWED_DOC_TYPES.has(docFile.type)) {
        return NextResponse.json(
          { success: false, error: 'Proposal document must be a PDF.' },
          { status: 400 }
        )
      }
      if (docFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, error: 'Proposal document exceeds 20 MB limit.' }, { status: 400 })
      }

      const docPath = `projects/${project_code}/${Date.now()}_proposal.pdf`
      const arrayBuf = await docFile.arrayBuffer()
      const { error: docErr } = await dbClient.storage
        .from('project-documents')
        .upload(docPath, arrayBuf, { contentType: 'application/pdf', upsert: true })

      if (docErr) {
        console.warn('[POST /api/projects] Document upload warning:', docErr.message)
      } else {
        const { data: signedData } = await dbClient.storage
          .from('project-documents')
          .createSignedUrl(docPath, 60 * 60 * 24 * 365)
        proposal_document_url = signedData?.signedUrl || docPath
      }
    }

    // Insert project record
    const insertPayload: Record<string, any> = {
      project_name,
      project_code,
      state,
      district,
      department: 'Ministry of Rural Development',
      acquiring_authority,
      project_type,
      description,
      target_date: target_date || null,
      corridor_length_km: corridor_length_km ? parseFloat(String(corridor_length_km)) : null,
      total_area_required_ha: total_area_required_ha ? parseFloat(String(total_area_required_ha)) : null,
      status: 'Draft',
      review_status: 'Submitted',
      submitted_by: authRes.user.id,
      submitted_at: new Date().toISOString(),
      gis_file_url,
      proposal_document_url,
    }

    const { data: newProject, error: insertErr } = await dbClient
      .from('projects')
      .insert(insertPayload)
      .select()
      .single()

    if (insertErr) {
      console.error('[POST /api/projects] Insert error:', insertErr)
      return NextResponse.json(
        { success: false, error: `Failed to create project: ${insertErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: newProject },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[POST /api/projects] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* GET /api/projects  — list projects (all authenticated roles)               */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let query = authRes.supabase
      .from('projects')
      .select('id, project_code, project_name, state, district, status, review_status, project_type, total_area_required_ha, target_date, gis_file_url, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const dbClient = createServiceRoleClient() || authRes.supabase
    const projectsWithFreshUrls = await Promise.all(
      (data || []).map(async (p: any) => {
        if (!p.gis_file_url) return p
        try {
          let path = p.gis_file_url
          if (path.includes('/project-gis/')) {
            path = path.split('/project-gis/')[1].split('?')[0]
          }
          if (path && !path.startsWith('http')) {
            const { data: signedData } = await dbClient.storage
              .from('project-gis')
              .createSignedUrl(path, 60 * 60 * 24 * 365)
            if (signedData?.signedUrl) {
              return { ...p, gis_file_url: signedData.signedUrl }
            }
          }
        } catch (e) {
          console.warn('[GET /api/projects] Signed URL refresh error:', e)
        }
        return p
      })
    )

    return NextResponse.json({ success: true, data: projectsWithFreshUrls }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
