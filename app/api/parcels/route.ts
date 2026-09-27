import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile, createServiceRoleClient } from '@/lib/supabase/server'
import { evaluateParcelAlerts } from '@/lib/alerts/engine'

/* -------------------------------------------------------------------------- */
/* Canonical Field Verification Allowed Statuses                              */
/* -------------------------------------------------------------------------- */

const ALLOWED_VERIFICATION_STATUSES = new Set(['Pending', 'Verified', 'Needs Review'])

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PARCEL_SELECT_COLUMNS =
  'id, project_id, project_code, parcel_number, parcel_no, owner_name, village_name, taluka_name, district, state, survey_number, survey_no, khasra_no, notified_area_sqm, affected_area_sqm, possession_status, land_type, field_verification_status, field_verified_at, field_verified_by, field_remarks, latitude, longitude, compensation_assessed, compensation_approved, compensation_paid, payment_status, payment_reference, payment_released_at, rehabilitation_status, rehabilitation_amount, rehabilitation_remarks, rehabilitation_completed_at, owner_profile_id, created_at, updated_at'

/* -------------------------------------------------------------------------- */
/* GET /api/parcels                                                           */
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

    const userRole = authRes.profile.role

    let query = authRes.supabase
      .from('land_parcels')
      .select(PARCEL_SELECT_COLUMNS)
      .order('created_at', { ascending: false })

    // Server-side role scoping
    if (userRole === 'Viewer') {
      // Direct ID access check for Viewer
      if (id && id.trim()) {
        const reqId = id.trim()
        const { data: ownedParcel, error: checkErr } = await authRes.supabase
          .from('land_parcels')
          .select('id')
          .eq('id', reqId)
          .eq('owner_profile_id', authRes.user.id)
          .maybeSingle()

        if (checkErr || !ownedParcel) {
          return NextResponse.json(
            { success: false, error: 'Access denied or parcel not found.' },
            { status: 403 }
          )
        }
      }

      query = query.eq('owner_profile_id', authRes.user.id)
    } else if (userRole === 'Field Officer') {
      const dbClient = createServiceRoleClient() || authRes.supabase
      const { data: assignments, error: assignErr } = await dbClient
        .from('parcel_assignments')
        .select('parcel_id')
        .eq('assigned_officer_id', authRes.user.id)
        .eq('status', 'Active')

      if (assignErr) {
        console.error('Error checking officer assignments in GET /api/parcels:', assignErr)
        return NextResponse.json(
          { success: false, error: 'Database query failed checking assignments' },
          { status: 500 }
        )
      }

      const assignedParcelIds = Array.from(
        new Set((assignments || []).map((a: any) => a.parcel_id).filter(Boolean))
      ) as string[]

      // Direct ID access check for Field Officer
      if (id && id.trim()) {
        const reqId = id.trim()
        if (!assignedParcelIds.includes(reqId)) {
          return NextResponse.json(
            { success: false, error: 'Access denied. You are not assigned to this parcel.' },
            { status: 403 }
          )
        }
      }

      if (assignedParcelIds.length === 0) {
        // Officer has no active assignments; return empty list securely
        return NextResponse.json({ success: true, data: [] }, { status: 200 })
      }

      query = query.in('id', assignedParcelIds)
    }

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
      if (
        userRole === 'Viewer' &&
        (error.code === 'PGRST204' || (error.message && error.message.includes('owner_profile_id')))
      ) {
        return NextResponse.json({ success: true, data: [] }, { status: 200 })
      }
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
    const authRes = await getAuthenticatedUserWithProfile(request)
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

    const { id, field_verification_status, field_remarks, land_type, possession_status } =
      body || {}

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
        {
          success: false,
          error: 'field_verification_status must be a non-empty string when provided.',
        },
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

    if (
      field_verification_status === undefined &&
      field_remarks === undefined &&
      land_type === undefined &&
      possession_status === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'At least one field to update (field_verification_status, field_remarks, land_type, or possession_status) must be provided.',
        },
        { status: 400 }
      )
    }

    const dbClient = createServiceRoleClient() || authRes.supabase

    // 1. Verify Parcel Exists
    const { data: existingParcel, error: findErr } = await dbClient
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

    // 1b. For Field Officer: Verify active assignment before allowing update
    if (authRes.profile.role === 'Field Officer') {
      const { data: activeAssignment, error: assignCheckErr } = await dbClient
        .from('parcel_assignments')
        .select('id')
        .eq('parcel_id', trimmedId)
        .eq('assigned_officer_id', authRes.user.id)
        .eq('status', 'Active')
        .maybeSingle()

      if (assignCheckErr) {
        console.error('Error verifying officer assignment in PATCH /api/parcels:', assignCheckErr)
        return NextResponse.json(
          { success: false, error: 'Database error verifying assignment permissions.' },
          { status: 500 }
        )
      }

      if (!activeAssignment) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied. You can only update parcels actively assigned to you.',
          },
          { status: 403 }
        )
      }
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

    if (land_type !== undefined && typeof land_type === 'string' && land_type.trim()) {
      updates.land_type = land_type.trim()
    }

    if (
      possession_status !== undefined &&
      typeof possession_status === 'string' &&
      possession_status.trim()
    ) {
      updates.possession_status = possession_status.trim()
    }

    if (field_remarks !== undefined) {
      const newRemarks = typeof field_remarks === 'string' ? field_remarks.trim() : ''
      const priorRemarks = existingParcel.field_remarks ? existingParcel.field_remarks.trim() : ''
      if (priorRemarks && newRemarks && !newRemarks.includes(priorRemarks)) {
        updates.field_remarks = `${newRemarks}\n[Prior Note: ${priorRemarks}]`
      } else {
        updates.field_remarks = newRemarks || null
      }
    }

    // 3. Execute Controlled Database Update
    const { data: updatedData, error: updateErr } = await dbClient
      .from('land_parcels')
      .update(updates)
      .eq('id', trimmedId)
      .select(PARCEL_SELECT_COLUMNS)

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
