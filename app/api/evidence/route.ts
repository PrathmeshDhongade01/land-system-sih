import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile, createServiceRoleClient } from '@/lib/supabase/server'
import { evaluateParcelAlerts } from '@/lib/alerts/engine'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/* -------------------------------------------------------------------------- */
/* GET /api/evidence?parcel_id=<uuid>                                         */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile(request)
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
    const parcel_id = searchParams.get('parcel_id')

    if (!parcel_id || !UUID_REGEX.test(parcel_id.trim())) {
      return NextResponse.json(
        { success: false, error: 'Valid parcel_id UUID parameter is required.' },
        { status: 400 }
      )
    }

    const trimmedParcelId = parcel_id.trim()
    const dbClient = createServiceRoleClient() || authRes.supabase

    const { data: evidenceItems, error: fetchErr } = await authRes.supabase
      .from('field_evidence')
      .select('*')
      .eq('parcel_id', trimmedParcelId)
      .order('created_at', { ascending: false })

    if (fetchErr) {
      // If table does not exist or relation error, return empty array gracefully
      console.warn('Field evidence query notice:', fetchErr.message)
      return NextResponse.json({ success: true, data: [] }, { status: 200 })
    }

    if (!evidenceItems || evidenceItems.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 })
    }

    // Generate short-lived signed URLs for each item
    const itemsWithSignedUrls = await Promise.all(
      evidenceItems.map(async (item: any) => {
        let signedUrl: string | null = null
        try {
          const { data: signedData } = await dbClient.storage
            .from('field-evidence')
            .createSignedUrl(item.storage_path, 3600)
          signedUrl = signedData?.signedUrl || null
        } catch {
          // Fallback if signed URL generation fails
        }
        return {
          ...item,
          signed_url: signedUrl,
        }
      })
    )

    return NextResponse.json({ success: true, data: itemsWithSignedUrls }, { status: 200 })
  } catch (err: any) {
    console.error('Unexpected error in GET /api/evidence:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* POST /api/evidence                                                         */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile(request)
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    const ALLOWED_POST_ROLES = new Set([
      'Admin',
      'SLAO',
      'CALA',
      'MoRTH Nodal Officer',
      'Field Officer',
    ])

    if (!ALLOWED_POST_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid multipart form data in request body.' },
        { status: 400 }
      )
    }

    const parcel_id = formData.get('parcel_id')
    const file = formData.get('file')
    const description = formData.get('description')

    if (!parcel_id || typeof parcel_id !== 'string' || !UUID_REGEX.test(parcel_id.trim())) {
      return NextResponse.json(
        { success: false, error: 'Valid parcel_id UUID is required.' },
        { status: 400 }
      )
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Evidence file is required.' },
        { status: 400 }
      )
    }

    const trimmedParcelId = parcel_id.trim()

    // 1. Verify Parcel Exists
    const dbClient = createServiceRoleClient() || authRes.supabase
    const { data: existingParcel, error: parcelErr } = await dbClient
      .from('land_parcels')
      .select('id')
      .eq('id', trimmedParcelId)
      .maybeSingle()

    if (parcelErr || !existingParcel) {
      return NextResponse.json(
        { success: false, error: 'Land parcel not found.' },
        { status: 404 }
      )
    }

    // 1b. For Field Officer role, verify active assignment to authenticated user
    if (authRes.profile.role === 'Field Officer') {
      const { data: assignment, error: assignErr } = await dbClient
        .from('parcel_assignments')
        .select('id')
        .eq('parcel_id', trimmedParcelId)
        .eq('assigned_officer_id', authRes.user.id)
        .eq('status', 'Active')
        .maybeSingle()

      if (assignErr || !assignment) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: This parcel is not actively assigned to you.' },
          { status: 403 }
        )
      }
    }

    // 2. Validate File Size & Type
    if (file.size <= 0) {
      return NextResponse.json(
        { success: false, error: 'File cannot be empty.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum allowed limit of 10 MB.' },
        { status: 400 }
      )
    }

    const mimeType = file.type.toLowerCase()
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file type. Only JPG, PNG, WEBP images and PDF documents are permitted.',
        },
        { status: 400 }
      )
    }

    // 2b. Validate optional GPS fields (from device navigator.geolocation)
    // Identity of the user is always derived from the session, never from FormData.
    let capturedLatitude: number | null = null
    let capturedLongitude: number | null = null
    let capturedAccuracyM: number | null = null

    const rawLat = formData.get('captured_latitude')
    const rawLng = formData.get('captured_longitude')
    const rawAcc = formData.get('captured_accuracy_m')

    if (rawLat !== null && rawLat !== '') {
      const lat = Number(rawLat)
      if (!isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json(
          { success: false, error: 'Invalid captured_latitude. Must be a finite number between -90 and 90.' },
          { status: 400 }
        )
      }
      capturedLatitude = lat
    }

    if (rawLng !== null && rawLng !== '') {
      const lng = Number(rawLng)
      if (!isFinite(lng) || lng < -180 || lng > 180) {
        return NextResponse.json(
          { success: false, error: 'Invalid captured_longitude. Must be a finite number between -180 and 180.' },
          { status: 400 }
        )
      }
      capturedLongitude = lng
    }

    if (rawAcc !== null && rawAcc !== '') {
      const acc = Number(rawAcc)
      if (!isFinite(acc) || acc < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid captured_accuracy_m. Must be a non-negative finite number.' },
          { status: 400 }
        )
      }
      capturedAccuracyM = acc
    }

    // 3. Generate Safe Storage Filename and Path
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileExt = sanitizedOriginalName.includes('.')
      ? sanitizedOriginalName.split('.').pop()
      : 'bin'
    const randomSuffix = Math.random().toString(36).substring(2, 10)
    const storagePath = `parcels/${trimmedParcelId}/${Date.now()}_${randomSuffix}.${fileExt}`

    // Ensure bucket exists on server (if using service role client)
    try {
      if (dbClient.storage) {
        await dbClient.storage.createBucket('field-evidence', { public: false })
      }
    } catch {
      // Ignore if bucket already exists
    }

    // 4. Upload File to Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await dbClient.storage
      .from('field-evidence')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadErr) {
      console.error('Storage upload error in POST /api/evidence:', uploadErr)
      return NextResponse.json(
        { success: false, error: `Failed to upload storage file: ${uploadErr.message}` },
        { status: 500 }
      )
    }

    // 5. Insert Metadata into public.field_evidence (including optional GPS)
    const userEmail = authRes.profile.email || authRes.user?.email || 'authenticated_officer'
    const metaRecord = {
      parcel_id: trimmedParcelId,
      file_name: file.name,
      storage_path: storagePath,
      file_type: file.type,
      file_size_bytes: file.size,
      uploaded_by: authRes.user.id,
      uploaded_by_email: userEmail,
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      captured_latitude: capturedLatitude,
      captured_longitude: capturedLongitude,
      captured_accuracy_m: capturedAccuracyM,
    }

    const { data: insertedData, error: metaErr } = await dbClient
      .from('field_evidence')
      .insert([metaRecord])
      .select()

    if (metaErr) {
      console.error('Database insert error in POST /api/evidence:', metaErr)
      // Cleanup uploaded storage file if metadata insert failed
      await dbClient.storage.from('field-evidence').remove([storagePath])
      return NextResponse.json(
        { success: false, error: `Failed to record evidence metadata: ${metaErr.message}` },
        { status: 500 }
      )
    }

    // 6. Generate Signed URL for response
    let signedUrl: string | null = null
    try {
      const { data: signedData } = await dbClient.storage
        .from('field-evidence')
        .createSignedUrl(storagePath, 3600)
      signedUrl = signedData?.signedUrl || null
    } catch {}

    const responsePayload = {
      ...(insertedData ? insertedData[0] : metaRecord),
      signed_url: signedUrl,
    }

    // Safe non-blocking alert evaluation
    try {
      await evaluateParcelAlerts(trimmedParcelId)
    } catch (alertErr) {
      console.error('[API /api/evidence POST] Alert evaluation error:', alertErr)
    }

    return NextResponse.json({ success: true, data: responsePayload }, { status: 201 })
  } catch (err: any) {
    console.error('Unexpected error in POST /api/evidence:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE /api/evidence?id=<uuid>                                             */
/* -------------------------------------------------------------------------- */

export async function DELETE(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile(request)
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    // Evidence deletion restricted strictly to Admin and SLAO
    const ALLOWED_DELETE_ROLES = new Set(['Admin', 'SLAO'])
    if (!ALLOWED_DELETE_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Deletion requires Admin or SLAO role.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || !UUID_REGEX.test(id.trim())) {
      return NextResponse.json(
        { success: false, error: 'Valid evidence id UUID parameter is required.' },
        { status: 400 }
      )
    }

    const trimmedId = id.trim()
    const dbClient = createServiceRoleClient() || authRes.supabase

    // 1. Fetch Metadata Record
    const { data: existingItem, error: findErr } = await authRes.supabase
      .from('field_evidence')
      .select('id, storage_path, parcel_id')
      .eq('id', trimmedId)
      .maybeSingle()

    if (findErr || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Field evidence record not found.' },
        { status: 404 }
      )
    }

    // 2. Remove Storage Object
    const { error: storageErr } = await dbClient.storage.from('field-evidence').remove([existingItem.storage_path])

    if (storageErr) {
      console.error('Storage delete error in DELETE /api/evidence:', storageErr)
      return NextResponse.json(
        { success: false, error: `Failed to remove storage object: ${storageErr.message}` },
        { status: 500 }
      )
    }
    // 3. Delete Metadata Record
    const { error: deleteErr } = await dbClient
      .from('field_evidence')
      .delete()
      .eq('id', trimmedId)

    if (deleteErr) {
      console.error('Delete error in DELETE /api/evidence:', deleteErr)
      return NextResponse.json(
        { success: false, error: `Failed to delete evidence metadata: ${deleteErr.message}` },
        { status: 500 }
      )
    }

    try {
      await evaluateParcelAlerts(existingItem.parcel_id)
    } catch (alertErr) {
      console.error('[API /api/evidence DELETE] Alert evaluation error:', alertErr)
    }

    return NextResponse.json(
      { success: true, message: 'Field evidence deleted successfully.' },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/evidence:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}
