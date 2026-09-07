import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile, createServiceRoleClient } from '@/lib/supabase/server'
import { evaluateParcelAlerts } from '@/lib/alerts/engine'

/* -------------------------------------------------------------------------- */
/* Canonical Field Verification Allowed Statuses                              */
/* -------------------------------------------------------------------------- */

const ALLOWED_VERIFICATION_STATUSES = new Set(['Pending', 'Verified', 'Needs Review'])

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* -------------------------------------------------------------------------- */
/* GET /api/parcels                                                           */
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

    const ALLOWED_GET_ROLES = new Set([
      'Admin',
      'SLAO',
      'CALA',
      'MoRTH Nodal Officer',
      'Field Officer',
      'Viewer',
    ])

    if (!ALLOWED_GET_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const project_code = searchParams.get('project_code')
    const verification_status =
      searchParams.get('verification_status') || searchParams.get('field_verification_status')
    const possession_status = searchParams.get('possession_status')
    const search = searchParams.get('search')

    if (id && !UUID_REGEX.test(id.trim())) {
      return NextResponse.json(
        { success: false, error: 'Invalid id UUID format.' },
        { status: 400 }
      )
    }

    let query = authRes.supabase
      .from('land_parcels')
      .select(
        'id, project_id, project_code, parcel_number, parcel_no, owner_name, village_name, survey_number, survey_no, khasra_no, notified_area_sqm, affected_area_sqm, possession_status, land_type, field_verification_status, field_verified_at, field_verified_by, field_remarks, latitude, longitude, compensation_assessed, compensation_approved, compensation_paid, payment_status, rehabilitation_status, created_at, updated_at'
      )
      .order('created_at', { ascending: false })

    if (id && id.trim()) {
      query = query.eq('id', id.trim())
    }

    if (project_code && project_code.trim()) {
      query = query.eq('project_code', project_code.trim())
    }

    if (verification_status && verification_status.trim()) {
      query = query.eq('field_verification_status', verification_status.trim())
    }

    if (possession_status && possession_status.trim()) {
      query = query.eq('possession_status', possession_status.trim())
    }

    if (search && search.trim()) {
      const s = search.trim().replace(/[%_]/g, '')
      if (s) {
        query = query.or(
          `parcel_number.ilike.%${s}%,owner_name.ilike.%${s}%,village_name.ilike.%${s}%,survey_number.ilike.%${s}%,khasra_no.ilike.%${s}%`
        )
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching land_parcels in GET /api/parcels:', error)
      return NextResponse.json(
        { success: false, error: `Database query failed: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] }, { status: 200 })
  } catch (err: any) {
    console.error('Unexpected error in GET /api/parcels:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH /api/parcels                                                         */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    const ALLOWED_PATCH_ROLES = new Set([
      'Admin',
      'SLAO',
      'CALA',
      'MoRTH Nodal Officer',
      'Field Officer',
    ])

    if (!ALLOWED_PATCH_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload in request body.' },
        { status: 400 }
      )
    }

    const { id, field_verification_status, field_remarks } = body || {}

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { success: false, error: 'Parcel id is required.' },
        { status: 400 }
      )
    }

    const trimmedId = id.trim()
    if (!UUID_REGEX.test(trimmedId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid parcel id format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    if (
      field_verification_status !== undefined &&
      (typeof field_verification_status !== 'string' || !field_verification_status.trim())
    ) {
      return NextResponse.json(
        { success: false, error: 'field_verification_status must be a non-empty string when provided.' },
        { status: 400 }
      )
    }

    let trimmedStatus: string | undefined = undefined
    if (field_verification_status !== undefined) {
      const statusVal = field_verification_status.trim()
      if (!ALLOWED_VERIFICATION_STATUSES.has(statusVal)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid field_verification_status. Must be one of: ${Array.from(
              ALLOWED_VERIFICATION_STATUSES
            ).join(', ')}`,
          },
          { status: 400 }
        )
      }
      trimmedStatus = statusVal
    }

    if (field_verification_status === undefined && field_remarks === undefined) {
      return NextResponse.json(
        { success: false, error: 'At least one field to update (field_verification_status or field_remarks) must be provided.' },
        { status: 400 }
      )
    }

    // 1. Verify Parcel Exists
    const { data: existingParcel, error: findErr } = await authRes.supabase
      .from('land_parcels')
      .select('id, field_verification_status, field_verified_at, field_verified_by, field_remarks')
      .eq('id', trimmedId)
      .maybeSingle()

    if (findErr) {
      console.error('Error finding land parcel in PATCH /api/parcels:', findErr)
      return NextResponse.json(
        { success: false, error: `Database error finding land parcel: ${findErr.message}` },
        { status: 500 }
      )
    }

    if (!existingParcel) {
      return NextResponse.json(
        { success: false, error: 'Land parcel not found.' },
        { status: 404 }
      )
    }

    // 2. Construct Safe Server-Calculated Update Payload
    const now = new Date().toISOString()
    const updates: Record<string, any> = {
      updated_at: now,
    }

    if (trimmedStatus !== undefined) {
      updates.field_verification_status = trimmedStatus

      const verifierEmail = authRes.profile.email || authRes.user?.email || 'authenticated_officer'

      if (trimmedStatus === 'Verified' || trimmedStatus === 'Needs Review') {
        updates.field_verified_at = now
        updates.field_verified_by = verifierEmail
      } else if (trimmedStatus === 'Pending') {
        updates.field_verified_at = null
        updates.field_verified_by = null
      }
    }

    if (field_remarks !== undefined) {
      updates.field_remarks = typeof field_remarks === 'string' ? field_remarks.trim() : null
    }

    // 3. Execute Controlled Database Update
    const dbClient = createServiceRoleClient() || authRes.supabase
    const { data: updatedData, error: updateErr } = await dbClient
      .from('land_parcels')
      .update(updates)
      .eq('id', trimmedId)
      .select(
        'id, project_id, project_code, parcel_number, parcel_no, owner_name, village_name, survey_number, survey_no, khasra_no, notified_area_sqm, affected_area_sqm, possession_status, land_type, field_verification_status, field_verified_at, field_verified_by, field_remarks, latitude, longitude, compensation_assessed, compensation_approved, compensation_paid, payment_status, rehabilitation_status, created_at, updated_at'
      )

    if (updateErr) {
      console.error('Update error in PATCH /api/parcels:', updateErr)
      return NextResponse.json(
        { success: false, error: `Failed to update land parcel: ${updateErr.message}` },
        { status: 500 }
      )
    }

    // Safe non-blocking alert evaluation
    try {
      await evaluateParcelAlerts(trimmedId)
    } catch (alertErr) {
      console.error('[API /api/parcels PATCH] Alert evaluation error:', alertErr)
    }

    return NextResponse.json(
      { success: true, data: updatedData ? updatedData[0] : null },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/parcels:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}
