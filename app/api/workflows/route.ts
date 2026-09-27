import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthenticatedUserWithProfile, createServiceRoleClient } from '@/lib/supabase/server'
import { evaluateWorkflowAlerts } from '@/lib/alerts/engine'

/* -------------------------------------------------------------------------- */
/* Canonical Statutory Stages & Statuses Allowed                              */
/* -------------------------------------------------------------------------- */

const ALLOWED_WORKFLOW_TYPES = new Set([
  'Section 3A - Intent to Acquire',
  'Section 3C - Hearing of Objections',
  'Section 3D - Declaration of Acquisition',
  'Section 11 - Gazette Notification',
  'Section 19 - Declaration of Acquisition',
  'Section 23 - Award Determination',
  'Section 3G - Compensation Disbursement',
  'Section 3H - Rehabilitation & Resettlement',
])

const ALLOWED_STATUSES = new Set(['Approved', 'Rejected', 'Pending Approval'])

/* -------------------------------------------------------------------------- */
/* Helper: Workflow Readiness Business Logic Calculation                      */
/* -------------------------------------------------------------------------- */

export function calculateWorkflowReadiness(
  workflowType: string,
  landParcelId: string | null,
  parcelData: { field_verification_status?: string | null } | null,
  evidenceCount: number,
  activeAssignment: any | null
) {
  // 1. Project-level workflows (land_parcel_id === null)
  if (!landParcelId) {
    return {
      status: 'READY' as const,
      reasons: ['Project-level statutory notification (parcel-level checks not applicable).'],
      checks: {
        field_verification: {
          status: 'Not Applicable',
          applicable: false,
          passed: true,
        },
        evidence: {
          count: 0,
          applicable: false,
          passed: true,
        },
        assignment: {
          status: 'Not Applicable',
          applicable: false,
          passed: true,
        },
      },
    }
  }

  const verStatus = parcelData?.field_verification_status || 'Pending'
  const isVerified = verStatus === 'Verified'
  const hasEvidence = evidenceCount > 0
  const hasAssignment = Boolean(activeAssignment)

  const typeLower = (workflowType || '').toLowerCase()
  const isSection3G = typeLower.includes('3g') || typeLower.includes('compensation')
  const isSection23 = typeLower.includes('23') || typeLower.includes('award')

  const fvCheck = {
    status: verStatus,
    applicable: true,
    passed: isVerified,
  }

  const evCheck = {
    count: evidenceCount,
    applicable: true,
    passed: hasEvidence,
  }

  const asCheck = {
    status: hasAssignment ? 'Field officer assigned' : 'No active field officer assignment',
    applicable: true,
    passed: true, // Assignment state is operational only
  }

  const reasons: string[] = []

  // 2. Section 3G Hard Block Rule
  if (isSection3G) {
    if (!isVerified) {
      if (verStatus === 'Needs Review') {
        reasons.push('Field verification requires resolution before compensation disbursement approval.')
      } else {
        reasons.push('Field verification must be completed before compensation disbursement approval.')
      }
      return {
        status: 'BLOCKED' as const,
        reasons,
        checks: {
          field_verification: fvCheck,
          evidence: evCheck,
          assignment: asCheck,
        },
      }
    } else {
      reasons.push('Field verification: Verified')
      if (hasEvidence) {
        reasons.push(`Evidence: ${evidenceCount} file(s) attached`)
      } else {
        reasons.push('Evidence: 0 files attached (informational)')
      }
      reasons.push(`Assignment: ${asCheck.status}`)

      return {
        status: 'READY' as const,
        reasons,
        checks: {
          field_verification: fvCheck,
          evidence: evCheck,
          assignment: asCheck,
        },
      }
    }
  }

  // 3. Section 23 Award Determination Rule
  if (isSection23) {
    if (!isVerified || !hasEvidence) {
      if (!isVerified) {
        reasons.push(`Field verification status is '${verStatus}' (expected 'Verified').`)
      }
      if (!hasEvidence) {
        reasons.push('No field evidence uploaded for this parcel.')
      }
      reasons.push(`Assignment: ${asCheck.status}`)

      return {
        status: 'ATTENTION' as const,
        reasons,
        checks: {
          field_verification: fvCheck,
          evidence: evCheck,
          assignment: asCheck,
        },
      }
    } else {
      reasons.push('Field verification: Verified')
      reasons.push(`Evidence: ${evidenceCount} file(s) attached`)
      reasons.push(`Assignment: ${asCheck.status}`)

      return {
        status: 'READY' as const,
        reasons,
        checks: {
          field_verification: fvCheck,
          evidence: evCheck,
          assignment: asCheck,
        },
      }
    }
  }

  // 4. Other Statutory Stages (Section 3A, 3C, 3D, 11, 19, 3H)
  if (!isVerified) {
    reasons.push(`Field verification is currently '${verStatus}'.`)
    if (hasEvidence) {
      reasons.push(`Evidence: ${evidenceCount} file(s) attached`)
    }
    reasons.push(`Assignment: ${asCheck.status}`)

    return {
      status: 'ATTENTION' as const,
      reasons,
      checks: {
        field_verification: fvCheck,
        evidence: evCheck,
        assignment: asCheck,
      },
    }
  } else {
    reasons.push('Field verification: Verified')
    if (hasEvidence) {
      reasons.push(`Evidence: ${evidenceCount} file(s) attached`)
    }
    reasons.push(`Assignment: ${asCheck.status}`)

    return {
      status: 'READY' as const,
      reasons,
      checks: {
        field_verification: fvCheck,
        evidence: evCheck,
        assignment: asCheck,
      },
    }
  }
}

/* -------------------------------------------------------------------------- */
/* GET /api/workflows                                                         */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Insufficient permissions' },
        { status: authRes.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const project_code = searchParams.get('project_code')
    const status = searchParams.get('status')

    let query = authRes.supabase
      .from('statutory_workflows')
      .select('*')
      .order('created_at', { ascending: false })

    if (project_code && project_code.trim()) {
      query = query.eq('project_code', project_code.trim())
    }

    if (status && status.trim()) {
      query = query.eq('status', status.trim())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching statutory_workflows in GET /api/workflows:', error)
      return NextResponse.json(
        { success: false, error: `Database query failed: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 })
    }

    const dbClient = createServiceRoleClient() || authRes.supabase

    // Collect unique non-null parcel IDs
    const parcelIds = Array.from(
      new Set(data.map((w: any) => w.land_parcel_id).filter(Boolean))
    ) as string[]

    const parcelsMap = new Map<string, any>()
    const evidenceCountMap = new Map<string, number>()
    const activeAssignmentsMap = new Map<string, any>()

    if (parcelIds.length > 0) {
      // 1. Fetch Parcel Context (Batched)
      const { data: parcelsData } = await dbClient
        .from('land_parcels')
        .select(
          'id, parcel_number, parcel_no, project_code, owner_name, village_name, survey_number, survey_no, khasra_no, notified_area_sqm, affected_area_sqm, possession_status, land_type, field_verification_status, field_verified_at, field_verified_by, field_remarks'
        )
        .in('id', parcelIds)

      if (parcelsData) {
        for (const p of parcelsData) {
          parcelsMap.set(p.id, {
            id: p.id,
            parcel_number: p.parcel_number || p.parcel_no || 'N/A',
            project_code: p.project_code || 'N/A',
            owner_name: p.owner_name || 'N/A',
            village_name: p.village_name || 'N/A',
            survey_number: p.survey_number || p.survey_no || p.khasra_no || 'N/A',
            khasra_no: p.khasra_no || 'N/A',
            notified_area_sqm: p.notified_area_sqm || null,
            affected_area_sqm: p.affected_area_sqm || null,
            possession_status: p.possession_status || 'Pending',
            land_type: p.land_type || 'N/A',
            field_verification_status: p.field_verification_status || 'Pending',
            field_verified_at: p.field_verified_at || null,
            field_verified_by: p.field_verified_by || null,
            field_remarks: p.field_remarks || null,
          })
        }
      }

      // 2. Fetch Evidence Counts (Batched)
      const { data: evidenceData } = await dbClient
        .from('field_evidence')
        .select('parcel_id')
        .in('parcel_id', parcelIds)

      if (evidenceData) {
        for (const e of evidenceData) {
          if (e.parcel_id) {
            evidenceCountMap.set(e.parcel_id, (evidenceCountMap.get(e.parcel_id) || 0) + 1)
          }
        }
      }

      // 3. Fetch Active Assignments (Batched)
      const { data: assignmentsData } = await dbClient
        .from('parcel_assignments')
        .select('id, parcel_id, assigned_officer_id, assigned_at, status, remarks')
        .in('parcel_id', parcelIds)
        .eq('status', 'Active')

      if (assignmentsData && assignmentsData.length > 0) {
        const officerIds = Array.from(
          new Set(assignmentsData.map((a: any) => a.assigned_officer_id).filter(Boolean))
        )

        const profilesMap = new Map<string, any>()
        if (officerIds.length > 0) {
          const { data: profilesData } = await dbClient
            .from('profiles')
            .select('id, full_name, email')
            .in('id', officerIds)

          if (profilesData) {
            for (const pr of profilesData) {
              profilesMap.set(pr.id, pr)
            }
          }
        }

        for (const a of assignmentsData) {
          const officer = profilesMap.get(a.assigned_officer_id) || {}
          activeAssignmentsMap.set(a.parcel_id, {
            id: a.id,
            assigned_officer_id: a.assigned_officer_id,
            assigned_officer_name: officer.full_name || 'Unknown Officer',
            assigned_officer_email: officer.email || 'N/A',
            assigned_at: a.assigned_at,
            status: a.status,
            remarks: a.remarks || null,
          })
        }
      }
    }

    const enrichedWorkflows = data.map((w: any) => {
      const pId = w.land_parcel_id
      const parcel = pId ? parcelsMap.get(pId) || null : null
      const evidenceCount = pId ? evidenceCountMap.get(pId) || 0 : 0
      const activeAssignment = pId ? activeAssignmentsMap.get(pId) || null : null

      const readiness = calculateWorkflowReadiness(
        w.workflow_type || w.stage_name || '',
        pId,
        parcel,
        evidenceCount,
        activeAssignment
      )

      return {
        ...w,
        parcel,
        evidence_count: evidenceCount,
        active_assignment: activeAssignment,
        readiness,
      }
    })

    return NextResponse.json({ success: true, data: enrichedWorkflows }, { status: 200 })
  } catch (err: any) {
    console.error('Unexpected error in GET /api/workflows:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* POST /api/workflows                                                        */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Insufficient permissions' },
        { status: authRes.status }
      )
    }

    const ALLOWED_POST_ROLES = new Set(['Admin', 'SLAO', 'CALA', 'MoRTH Nodal Officer'])
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

    const {
      project_code,
      land_parcel_id,
      workflow_type,
      assigned_to,
      remarks,
      submitted_by,
    } = body || {}

    // Required Field Validations
    if (!project_code || typeof project_code !== 'string' || !project_code.trim()) {
      return NextResponse.json(
        { success: false, error: 'project_code is required.' },
        { status: 400 }
      )
    }

    if (!workflow_type || typeof workflow_type !== 'string' || !workflow_type.trim()) {
      return NextResponse.json(
        { success: false, error: 'workflow_type is required.' },
        { status: 400 }
      )
    }

    if (!assigned_to || typeof assigned_to !== 'string' || !assigned_to.trim()) {
      return NextResponse.json(
        { success: false, error: 'assigned_to is required.' },
        { status: 400 }
      )
    }

    const trimmedType = workflow_type.trim()
    if (!ALLOWED_WORKFLOW_TYPES.has(trimmedType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid statutory workflow type. Must be one of: ${Array.from(
            ALLOWED_WORKFLOW_TYPES
          ).join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 1. Verify Project Exists
    const { data: project, error: projErr } = await authRes.supabase
      .from('projects')
      .select('id, project_code')
      .eq('project_code', project_code.trim())
      .maybeSingle()

    if (projErr) {
      return NextResponse.json(
        { success: false, error: `Database error verifying project: ${projErr.message}` },
        { status: 500 }
      )
    }

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found.' },
        { status: 404 }
      )
    }

    // 2. Verify Land Parcel Exists & Belongs to Specified Project (if land_parcel_id supplied)
    let validParcelId: string | null = null
    if (land_parcel_id && typeof land_parcel_id === 'string' && land_parcel_id.trim()) {
      const pId = land_parcel_id.trim()
      const { data: parcel, error: parcelErr } = await authRes.supabase
        .from('land_parcels')
        .select('id, project_id, project_code')
        .eq('id', pId)
        .maybeSingle()

      if (parcelErr) {
        return NextResponse.json(
          { success: false, error: `Database error verifying land parcel: ${parcelErr.message}` },
          { status: 500 }
        )
      }

      if (!parcel) {
        return NextResponse.json(
          { success: false, error: 'Land parcel not found.' },
          { status: 404 }
        )
      }

      const matchesId = parcel.project_id && parcel.project_id === project.id
      const matchesCode = parcel.project_code && parcel.project_code === project.project_code

      if (!matchesId && !matchesCode) {
        return NextResponse.json(
          { success: false, error: 'Land parcel does not belong to the specified project.' },
          { status: 400 }
        )
      }

      validParcelId = parcel.id
    }

    // 3. Construct and Insert New Statutory Workflow Record
    const now = new Date().toISOString()
    const assignedToVal = assigned_to.trim()
    const submittedByVal =
      submitted_by && typeof submitted_by === 'string' && submitted_by.trim()
        ? submitted_by.trim()
        : assignedToVal

    const newRecord = {
      project_code: project.project_code,
      land_parcel_id: validParcelId,
      workflow_type: trimmedType,
      stage_name: trimmedType, // Legacy mirrored column
      status: 'Pending Approval',
      assigned_to: assignedToVal,
      submitted_by: submittedByVal, // Legacy mirrored column
      remarks: remarks && typeof remarks === 'string' ? remarks.trim() : null,
      created_at: now,
      updated_at: now,
    }

    const dbClient = createServiceRoleClient() || authRes.supabase
    const { data: insertedData, error: insertErr } = await dbClient
      .from('statutory_workflows')
      .insert([newRecord])
      .select()

    if (insertErr) {
      console.error('Insert error in POST /api/workflows:', insertErr)
      return NextResponse.json(
        { success: false, error: `Failed to insert statutory workflow: ${insertErr.message}` },
        { status: 500 }
      )
    }

    try {
      if (insertedData?.[0]?.id) await evaluateWorkflowAlerts(insertedData[0].id)
    } catch (alertErr) {
      console.error('[API /api/workflows POST] Alert evaluation error:', alertErr)
    }

    return NextResponse.json(
      { success: true, data: insertedData ? insertedData[0] : newRecord },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Unexpected error in POST /api/workflows:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH /api/workflows                                                       */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Insufficient permissions' },
        { status: authRes.status }
      )
    }

    const ALLOWED_PATCH_ROLES = new Set(['Admin', 'SLAO', 'MoRTH Nodal Officer'])
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

    const { id, status, approved_by, remarks } = body || {}

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { success: false, error: 'id is required.' },
        { status: 400 }
      )
    }

    if (!status || typeof status !== 'string' || !status.trim()) {
      return NextResponse.json(
        { success: false, error: 'status is required.' },
        { status: 400 }
      )
    }

    const trimmedStatus = status.trim()
    if (!ALLOWED_STATUSES.has(trimmedStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 1. Verify Workflow Record Exists
    const { data: existingWorkflow, error: findErr } = await authRes.supabase
      .from('statutory_workflows')
      .select('*')
      .eq('id', id.trim())
      .maybeSingle()

    if (findErr) {
      return NextResponse.json(
        { success: false, error: `Database error finding workflow: ${findErr.message}` },
        { status: 500 }
      )
    }

    if (!existingWorkflow) {
      return NextResponse.json(
        { success: false, error: 'Statutory workflow record not found.' },
        { status: 404 }
      )
    }

    // 2. Server-side Readiness Check Enforcement prior to Approval
    if (trimmedStatus === 'Approved') {
      const dbClient = createServiceRoleClient() || authRes.supabase
      let parcelData: any = null
      let evidenceCount = 0
      let activeAssignment: any = null

      if (existingWorkflow.land_parcel_id) {
        const [parcelRes, evidRes, assignRes] = await Promise.all([
          dbClient
            .from('land_parcels')
            .select('field_verification_status')
            .eq('id', existingWorkflow.land_parcel_id)
            .maybeSingle(),
          dbClient
            .from('field_evidence')
            .select('id', { count: 'exact', head: true })
            .eq('parcel_id', existingWorkflow.land_parcel_id),
          dbClient
            .from('parcel_assignments')
            .select('id')
            .eq('parcel_id', existingWorkflow.land_parcel_id)
            .eq('status', 'Active')
            .maybeSingle(),
        ])

        parcelData = parcelRes.data
        evidenceCount = evidRes.count || 0
        activeAssignment = assignRes.data
      }

      const readiness = calculateWorkflowReadiness(
        existingWorkflow.workflow_type || existingWorkflow.stage_name || '',
        existingWorkflow.land_parcel_id,
        parcelData,
        evidenceCount,
        activeAssignment
      )

      if (readiness.status === 'BLOCKED') {
        return NextResponse.json(
          {
            success: false,
            error: 'Workflow approval blocked by readiness requirements.',
            readiness,
          },
          { status: 409 }
        )
      }
    }

    // 3. Prepare Updates
    const now = new Date().toISOString()
    const updates: Record<string, any> = {
      status: trimmedStatus,
      updated_at: now,
    }

    if (trimmedStatus === 'Approved') {
      updates.approved_at = now
      if (approved_by && typeof approved_by === 'string' && approved_by.trim()) {
        updates.approved_by = approved_by.trim()
      }
    } else {
      updates.approved_at = null
    }

    // Preserve existing remarks if remarks field is omitted in PATCH body
    if (remarks !== undefined) {
      updates.remarks = typeof remarks === 'string' ? remarks.trim() : null
    }

    const dbClient = createServiceRoleClient() || authRes.supabase
    const { data: updatedData, error: updateErr } = await dbClient
      .from('statutory_workflows')
      .update(updates)
      .eq('id', id.trim())
      .select()

    if (updateErr) {
      console.error('Update error in PATCH /api/workflows:', updateErr)
      return NextResponse.json(
        { success: false, error: `Failed to update statutory workflow: ${updateErr.message}` },
        { status: 500 }
      )
    }

    try {
      await evaluateWorkflowAlerts(id.trim())
    } catch (alertErr) {
      console.error('[API /api/workflows PATCH] Alert evaluation error:', alertErr)
    }

    return NextResponse.json(
      { success: true, data: updatedData ? updatedData[0] : null },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/workflows:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

