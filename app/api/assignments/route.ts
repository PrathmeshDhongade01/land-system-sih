import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile, createServiceRoleClient } from '@/lib/supabase/server'
import { evaluateParcelAlerts } from '@/lib/alerts/engine'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* -------------------------------------------------------------------------- */
/* GET /api/assignments                                                       */
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
    const parcel_id = searchParams.get('parcel_id')
    const assigned_officer_id_param = searchParams.get('assigned_officer_id')
    const status = searchParams.get('status')
    const assigned_to_me = searchParams.get('assigned_to_me')

    let query = authRes.supabase
      .from('parcel_assignments')
      .select('*')
      .order('created_at', { ascending: false })

    if (assigned_to_me === 'true' || assigned_to_me === '1') {
      // SECURITY RULE: Always use authenticated user's UUID server-side.
      // NEVER accept an arbitrary user identity to impersonate "my assignments".
      query = query.eq('assigned_officer_id', authRes.user.id)
    } else if (assigned_officer_id_param && assigned_officer_id_param.trim()) {
      if (!UUID_REGEX.test(assigned_officer_id_param.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid assigned_officer_id UUID format.' },
          { status: 400 }
        )
      }
      query = query.eq('assigned_officer_id', assigned_officer_id_param.trim())
    }

    if (parcel_id && parcel_id.trim()) {
      if (!UUID_REGEX.test(parcel_id.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid parcel_id UUID format.' },
          { status: 400 }
        )
      }
      query = query.eq('parcel_id', parcel_id.trim())
    }

    if (status && status.trim()) {
      query = query.eq('status', status.trim())
    }

    const { data: assignments, error: fetchErr } = await query

    if (fetchErr) {
      console.error('Error fetching parcel_assignments in GET /api/assignments:', fetchErr)
      return NextResponse.json(
        { success: false, error: `Database query failed: ${fetchErr.message}` },
        { status: 500 }
      )
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 })
    }

    // Enrich assignments with parcel & officer display information safely
    const dbClient = createServiceRoleClient() || authRes.supabase

    const parcelIds = Array.from(new Set(assignments.map((a: any) => a.parcel_id).filter(Boolean)))
    const officerIds = Array.from(
      new Set(
        assignments
          .flatMap((a: any) => [a.assigned_officer_id, a.assigned_by])
          .filter(Boolean)
      )
    )

    const [parcelsRes, profilesRes] = await Promise.all([
      parcelIds.length > 0
        ? dbClient
            .from('land_parcels')
            .select('id, parcel_number, parcel_no, owner_name, village_name, project_code')
            .in('id', parcelIds)
        : { data: [] },
      officerIds.length > 0
        ? dbClient
            .from('profiles')
            .select('id, full_name, email, role')
            .in('id', officerIds)
        : { data: [] },
    ])

    const parcelsMap = new Map<string, any>()
    if (parcelsRes.data) {
      for (const p of parcelsRes.data) {
        parcelsMap.set(p.id, p)
      }
    }

    const profilesMap = new Map<string, any>()
    if (profilesRes.data) {
      for (const pr of profilesRes.data) {
        profilesMap.set(pr.id, pr)
      }
    }

    const enrichedData = assignments.map((a: any) => {
      const parcel = parcelsMap.get(a.parcel_id) || {}
      const officer = profilesMap.get(a.assigned_officer_id) || {}
      const assigner = profilesMap.get(a.assigned_by) || {}

      return {
        id: a.id,
        parcel_id: a.parcel_id,
        parcel_number: parcel.parcel_number || parcel.parcel_no || 'N/A',
        owner_name: parcel.owner_name || 'N/A',
        village_name: parcel.village_name || 'N/A',
        project_code: parcel.project_code || 'N/A',
        assigned_officer_id: a.assigned_officer_id,
        assigned_officer_name: officer.full_name || 'Unknown Officer',
        assigned_officer_email: officer.email || 'N/A',
        assigned_by: a.assigned_by,
        assigned_by_name: assigner.full_name || 'System / Officer',
        assigned_at: a.assigned_at,
        unassigned_at: a.unassigned_at || null,
        status: a.status,
        remarks: a.remarks || null,
        created_at: a.created_at,
        updated_at: a.updated_at,
      }
    })

    return NextResponse.json({ success: true, data: enrichedData }, { status: 200 })
  } catch (err: any) {
    console.error('Unexpected error in GET /api/assignments:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* POST /api/assignments                                                      */
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

    // STRICT RBAC: Only Admin and SLAO may assign parcels
    const ALLOWED_POST_ROLES = new Set(['Admin', 'SLAO'])
    if (!ALLOWED_POST_ROLES.has(authRes.profile.role)) {
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

    const { parcel_id, assigned_officer_id, remarks } = body || {}

    // Required Field Validations
    if (!parcel_id || typeof parcel_id !== 'string' || !parcel_id.trim()) {
      return NextResponse.json(
        { success: false, error: 'parcel_id is required.' },
        { status: 400 }
      )
    }

    if (!assigned_officer_id || typeof assigned_officer_id !== 'string' || !assigned_officer_id.trim()) {
      return NextResponse.json(
        { success: false, error: 'assigned_officer_id is required.' },
        { status: 400 }
      )
    }

    const trimmedParcelId = parcel_id.trim()
    const trimmedOfficerId = assigned_officer_id.trim()

    if (!UUID_REGEX.test(trimmedParcelId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid parcel_id UUID format.' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(trimmedOfficerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assigned_officer_id UUID format.' },
        { status: 400 }
      )
    }

    const dbClient = createServiceRoleClient() || authRes.supabase

    // 1. Target Officer Validation (Must be active profile with role = 'Field Officer')
    const { data: targetProfile, error: profileErr } = await dbClient
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', trimmedOfficerId)
      .maybeSingle()

    if (profileErr) {
      console.error('Error verifying target officer profile in POST /api/assignments:', profileErr)
      return NextResponse.json(
        { success: false, error: `Database error checking officer profile: ${profileErr.message}` },
        { status: 500 }
      )
    }

    if (!targetProfile) {
      return NextResponse.json(
        { success: false, error: 'Target officer profile not found.' },
        { status: 404 }
      )
    }

    if (targetProfile.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'Target officer account is inactive.' },
        { status: 400 }
      )
    }

    if (targetProfile.role !== 'Field Officer') {
      return NextResponse.json(
        { success: false, error: 'Assigned user must have the Field Officer role.' },
        { status: 400 }
      )
    }

    // 2. Parcel Existence Validation
    const { data: parcel, error: parcelErr } = await dbClient
      .from('land_parcels')
      .select('id, parcel_number, parcel_no, owner_name, village_name, project_code')
      .eq('id', trimmedParcelId)
      .maybeSingle()

    if (parcelErr) {
      console.error('Error verifying land parcel in POST /api/assignments:', parcelErr)
      return NextResponse.json(
        { success: false, error: `Database error checking land parcel: ${parcelErr.message}` },
        { status: 500 }
      )
    }

    if (!parcel) {
      return NextResponse.json(
        { success: false, error: 'Land parcel not found.' },
        { status: 404 }
      )
    }

    // 3. Active Assignment Check (Single Active Assignment Rule)
    const { data: activeAssignments, error: activeErr } = await dbClient
      .from('parcel_assignments')
      .select('id, assigned_officer_id, created_at')
      .eq('parcel_id', trimmedParcelId)
      .eq('status', 'Active')

    if (activeErr) {
      console.error('Error checking active assignments in POST /api/assignments:', activeErr)
      return NextResponse.json(
        { success: false, error: `Database error checking existing assignments: ${activeErr.message}` },
        { status: 500 }
      )
    }

    if (activeAssignments && activeAssignments.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Parcel already has an active assignment.' },
        { status: 409 }
      )
    }

    // 4. Construct Controlled Server Payload & Execute Insert
    const now = new Date().toISOString()
    const newAssignment = {
      parcel_id: trimmedParcelId,
      assigned_officer_id: trimmedOfficerId,
      assigned_by: authRes.user.id, // Strictly derived from server authenticated user
      assigned_at: now,
      unassigned_at: null,
      status: 'Active',
      remarks: typeof remarks === 'string' && remarks.trim() ? remarks.trim() : null,
      created_at: now,
      updated_at: now,
    }

    const { data: insertedData, error: insertErr } = await dbClient
      .from('parcel_assignments')
      .insert([newAssignment])
      .select()

    if (insertErr) {
      console.error('Insert error in POST /api/assignments:', insertErr)
      // Check for partial unique index violation (code 23505)
      if (insertErr.code === '23505' || insertErr.message.includes('unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'Parcel already has an active assignment.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, error: `Failed to create parcel assignment: ${insertErr.message}` },
        { status: 500 }
      )
    }

    const createdRecord = insertedData ? insertedData[0] : newAssignment

    // Safe non-blocking alert evaluation
    try {
      await evaluateParcelAlerts(trimmedParcelId)
    } catch (alertErr) {
      console.error('[API /api/assignments POST] Alert evaluation error:', alertErr)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...createdRecord,
          parcel_number: parcel.parcel_number || parcel.parcel_no || 'N/A',
          owner_name: parcel.owner_name || 'N/A',
          village_name: parcel.village_name || 'N/A',
          project_code: parcel.project_code || 'N/A',
          assigned_officer_name: targetProfile.full_name || 'Unknown Officer',
          assigned_officer_email: targetProfile.email || 'N/A',
          assigned_by_name: authRes.profile.full_name || 'System / Officer',
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Unexpected error in POST /api/assignments:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH /api/assignments                                                     */
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

    // STRICT RBAC: Only Admin and SLAO may update assignment lifecycle
    const ALLOWED_PATCH_ROLES = new Set(['Admin', 'SLAO'])
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

    const { id, status, action, new_assigned_officer_id, assigned_officer_id, remarks } = body || {}

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { success: false, error: 'Assignment id is required.' },
        { status: 400 }
      )
    }

    const trimmedId = id.trim()
    if (!UUID_REGEX.test(trimmedId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment id UUID format.' },
        { status: 400 }
      )
    }

    const dbClient = createServiceRoleClient() || authRes.supabase

    // 1. Fetch Existing Assignment
    const { data: existingAssignment, error: findErr } = await dbClient
      .from('parcel_assignments')
      .select('*')
      .eq('id', trimmedId)
      .maybeSingle()

    if (findErr) {
      console.error('Error finding assignment in PATCH /api/assignments:', findErr)
      return NextResponse.json(
        { success: false, error: `Database error finding assignment: ${findErr.message}` },
        { status: 500 }
      )
    }

    if (!existingAssignment) {
      return NextResponse.json(
        { success: false, error: 'Parcel assignment record not found.' },
        { status: 404 }
      )
    }

    const targetNewOfficer = new_assigned_officer_id || assigned_officer_id
    const isReassignment = action === 'reassign' || (targetNewOfficer && typeof targetNewOfficer === 'string' && targetNewOfficer.trim() !== existingAssignment.assigned_officer_id)

    const now = new Date().toISOString()

    /* ---------------------------------------------------------------------- */
    /* CASE A: REASSIGNMENT                                                   */
    /* ---------------------------------------------------------------------- */
    if (isReassignment) {
      if (!targetNewOfficer || typeof targetNewOfficer !== 'string' || !targetNewOfficer.trim()) {
        return NextResponse.json(
          { success: false, error: 'new_assigned_officer_id is required for reassignment.' },
          { status: 400 }
        )
      }

      const trimmedNewOfficerId = targetNewOfficer.trim()

      if (!UUID_REGEX.test(trimmedNewOfficerId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid new_assigned_officer_id UUID format.' },
          { status: 400 }
        )
      }

      if (trimmedNewOfficerId === existingAssignment.assigned_officer_id) {
        return NextResponse.json(
          { success: false, error: 'New assigned officer must be different from current assigned officer.' },
          { status: 400 }
        )
      }

      // Target officer validation for reassignment
      const { data: targetProfile, error: profileErr } = await dbClient
        .from('profiles')
        .select('id, full_name, email, role, is_active')
        .eq('id', trimmedNewOfficerId)
        .maybeSingle()

      if (profileErr || !targetProfile) {
        return NextResponse.json(
          { success: false, error: 'Target officer profile not found.' },
          { status: 404 }
        )
      }

      if (targetProfile.is_active === false) {
        return NextResponse.json(
          { success: false, error: 'Target officer account is inactive.' },
          { status: 400 }
        )
      }

      if (targetProfile.role !== 'Field Officer') {
        return NextResponse.json(
          { success: false, error: 'Assigned user must have the Field Officer role.' },
          { status: 400 }
        )
      }

      // Step 1: Close existing active assignment safely
      const { error: cancelErr } = await dbClient
        .from('parcel_assignments')
        .update({
          status: 'Cancelled',
          unassigned_at: now,
          updated_at: now,
          remarks: remarks && typeof remarks === 'string' ? remarks.trim() : existingAssignment.remarks,
        })
        .eq('id', trimmedId)

      if (cancelErr) {
        console.error('Error closing current assignment in PATCH /api/assignments:', cancelErr)
        return NextResponse.json(
          { success: false, error: `Failed to update current assignment: ${cancelErr.message}` },
          { status: 500 }
        )
      }

      // Step 2: Create new Active assignment row to preserve history
      const newAssignment = {
        parcel_id: existingAssignment.parcel_id,
        assigned_officer_id: trimmedNewOfficerId,
        assigned_by: authRes.user.id, // Authenticated user performing reassignment
        assigned_at: now,
        unassigned_at: null,
        status: 'Active',
        remarks: typeof remarks === 'string' && remarks.trim() ? remarks.trim() : `Reassigned from officer ${existingAssignment.assigned_officer_id}`,
        created_at: now,
        updated_at: now,
      }

      const { data: insertedData, error: insertErr } = await dbClient
        .from('parcel_assignments')
        .insert([newAssignment])
        .select()

      if (insertErr) {
        console.error('Error inserting reassigned assignment in PATCH /api/assignments:', insertErr)
        // Rollback Step 1 to keep state consistent if insert failed
        await dbClient
          .from('parcel_assignments')
          .update({
            status: existingAssignment.status,
            unassigned_at: existingAssignment.unassigned_at,
            updated_at: now,
          })
          .eq('id', trimmedId)

        return NextResponse.json(
          { success: false, error: `Failed to create new assignment record during reassignment: ${insertErr.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Parcel reassigned successfully.',
          data: insertedData ? insertedData[0] : newAssignment,
        },
        { status: 200 }
      )
    }

    /* ---------------------------------------------------------------------- */
    /* CASE B: COMPLETE OR CANCEL ASSIGNMENT                                  */
    /* ---------------------------------------------------------------------- */
    if (!status || typeof status !== 'string' || !status.trim()) {
      return NextResponse.json(
        { success: false, error: 'status or reassignment target is required.' },
        { status: 400 }
      )
    }

    const trimmedStatus = status.trim()
    const ALLOWED_PATCH_STATUSES = new Set(['Completed', 'Cancelled'])

    if (!ALLOWED_PATCH_STATUSES.has(trimmedStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Update status must be 'Completed' or 'Cancelled', or perform a reassignment.`,
        },
        { status: 400 }
      )
    }

    const updates: Record<string, any> = {
      status: trimmedStatus,
      unassigned_at: now,
      updated_at: now,
    }

    if (remarks !== undefined) {
      updates.remarks = typeof remarks === 'string' ? remarks.trim() : null
    }

    const { data: updatedData, error: updateErr } = await dbClient
      .from('parcel_assignments')
      .update(updates)
      .eq('id', trimmedId)
      .select()

    if (updateErr) {
      console.error('Update error in PATCH /api/assignments:', updateErr)
      return NextResponse.json(
        { success: false, error: `Failed to update assignment status: ${updateErr.message}` },
        { status: 500 }
      )
    }

    // Safe non-blocking alert evaluation
    try {
      await evaluateParcelAlerts(existingAssignment.parcel_id)
    } catch (alertErr) {
      console.error('[API /api/assignments PATCH] Alert evaluation error:', alertErr)
    }

    return NextResponse.json(
      { success: true, data: updatedData ? updatedData[0] : null },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/assignments:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}
