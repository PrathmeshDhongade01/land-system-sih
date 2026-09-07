import { createServiceRoleClient } from '@/lib/supabase/server'
import { calculateWorkflowReadiness } from '@/app/api/workflows/route'

/* -------------------------------------------------------------------------- */
/* TypeScript Interfaces & Types                                             */
/* -------------------------------------------------------------------------- */

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AlertStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED'

export interface AlertInput {
  alert_key: string
  event_type: string
  severity: AlertSeverity
  entity_type: string
  entity_id: string
  title: string
  explanation: string
  recommendation: string
  target_role?: string | null
  assigned_officer_id?: string | null
}

export interface AlertEvaluationSummary {
  created: number
  resolved: number
  unchanged: number
  errors: number
  details?: string[]
}

/* -------------------------------------------------------------------------- */
/* Helper: Get Default Supabase Client                                        */
/* -------------------------------------------------------------------------- */

function getEngineClient(providedClient?: any) {
  if (providedClient) return providedClient
  const serviceClient = createServiceRoleClient()
  if (serviceClient) return serviceClient
  throw new Error('Supabase client unavailable for alert engine execution.')
}

/* -------------------------------------------------------------------------- */
/* Low-Level Alert Actions: Create & Resolve                                  */
/* -------------------------------------------------------------------------- */

/**
 * Creates an active alert idempotently.
 * If an active alert with the same alert_key already exists, the database 
 * partial unique index (idx_alerts_active_key) will reject the insert, 
 * returning 'unchanged'.
 */
export async function createAlert(
  alertData: AlertInput,
  providedClient?: any
): Promise<'created' | 'unchanged' | 'error'> {
  try {
    const supabase = getEngineClient(providedClient)

    // Check if active alert already exists to prevent unnecessary DB constraint errors
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_key', alertData.alert_key)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (existing) {
      return 'unchanged'
    }

    const { error } = await supabase.from('alerts').insert({
      alert_key: alertData.alert_key,
      event_type: alertData.event_type,
      severity: alertData.severity,
      entity_type: alertData.entity_type,
      entity_id: alertData.entity_id,
      title: alertData.title,
      explanation: alertData.explanation,
      recommendation: alertData.recommendation,
      status: 'ACTIVE',
      target_role: alertData.target_role || null,
      assigned_officer_id: alertData.assigned_officer_id || null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      // 23505 is PostgreSQL unique constraint violation (duplicate key)
      if (error.code === '23505') {
        return 'unchanged'
      }
      console.error(`[AlertEngine] Error creating alert ${alertData.alert_key}:`, error)
      return 'error'
    }

    // Notification Bridge: Create in-app notifications for target user(s) on NEW active alerts
    try {
      const notifTitle = `${alertData.severity === 'CRITICAL' ? 'Critical Alert: ' : alertData.severity === 'HIGH' ? 'High Priority: ' : ''}${alertData.title}`
      const notifType = alertData.severity === 'CRITICAL' ? 'CRITICAL' : alertData.severity === 'HIGH' ? 'WARNING' : 'INFO'
      const linkUrl = alertData.entity_type === 'land_parcels'
        ? `/field-verification?parcel_id=${alertData.entity_id}`
        : alertData.entity_type === 'statutory_workflows'
        ? '/workflows'
        : '/'

      let targetUserIds: string[] = []

      if (alertData.assigned_officer_id) {
        targetUserIds.push(alertData.assigned_officer_id)
      } else if (alertData.target_role) {
        const { data: targetProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', alertData.target_role)
          .eq('is_active', true)
          .limit(10)

        if (targetProfiles) {
          targetUserIds = targetProfiles.map((p: any) => p.id)
        }
      }

      if (targetUserIds.length > 0) {
        const notificationRecords = targetUserIds.map((uId) => ({
          user_id: uId,
          title: notifTitle,
          message: alertData.explanation,
          type: notifType,
          link_url: linkUrl,
          is_read: false,
          created_at: new Date().toISOString(),
        }))

        await supabase.from('notifications').insert(notificationRecords)
      }
    } catch (notifErr) {
      console.error(`[AlertEngine] Non-blocking notification bridge error for ${alertData.alert_key}:`, notifErr)
    }

    return 'created'
  } catch (err) {
    console.error(`[AlertEngine] Exception in createAlert for ${alertData.alert_key}:`, err)
    return 'error'
  }
}

/**
 * Resolves an active alert by alert_key.
 * Updates status to 'RESOLVED' and sets resolved_at timestamp.
 */
export async function resolveAlert(
  alertKey: string,
  providedClient?: any
): Promise<'resolved' | 'unchanged' | 'error'> {
  try {
    const supabase = getEngineClient(providedClient)

    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_key', alertKey)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (!existing) {
      return 'unchanged'
    }

    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'RESOLVED',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error(`[AlertEngine] Error resolving alert ${alertKey}:`, error)
      return 'error'
    }

    return 'resolved'
  } catch (err) {
    console.error(`[AlertEngine] Exception in resolveAlert for ${alertKey}:`, err)
    return 'error'
  }
}

/* -------------------------------------------------------------------------- */
/* Single Entity Alert Evaluators                                             */
/* -------------------------------------------------------------------------- */

/**
 * Evaluates all intelligent alert rules for a single land parcel.
 */
export async function evaluateParcelAlerts(
  parcelId: string,
  providedClient?: any
): Promise<AlertEvaluationSummary> {
  const summary: AlertEvaluationSummary = { created: 0, resolved: 0, unchanged: 0, errors: 0 }

  try {
    const supabase = getEngineClient(providedClient)

    // Fetch parcel detail
    const { data: parcel, error: parcelError } = await supabase
      .from('land_parcels')
      .select('*')
      .eq('id', parcelId)
      .maybeSingle()

    if (parcelError || !parcel) {
      summary.errors++
      return summary
    }

    // Fetch active assignment for parcel
    const { data: assignments } = await supabase
      .from('parcel_assignments')
      .select('id, assigned_officer_id, status')
      .eq('parcel_id', parcelId)
      .eq('status', 'Active')

    const activeAssignment = assignments && assignments.length > 0 ? assignments[0] : null
    const assignedOfficerId = activeAssignment?.assigned_officer_id || null

    // Fetch field evidence count for parcel
    const { count: evidenceCount } = await supabase
      .from('field_evidence')
      .select('id', { count: 'exact', head: true })
      .eq('parcel_id', parcelId)

    const actualEvidenceCount = evidenceCount || 0
    const parcelNo = parcel.parcel_number || parcel.survey_number || 'N/A'
    const village = parcel.village_name || 'Project Area'

    /* ---------------------------------------------------------------------- */
    /* 1. VERIFICATION_PENDING                                                */
    /* ---------------------------------------------------------------------- */
    const keyVP = `VERIFICATION_PENDING:land_parcels:${parcel.id}`
    if (parcel.field_verification_status === 'Pending') {
      const res = await createAlert({
        alert_key: keyVP,
        event_type: 'VERIFICATION_PENDING',
        severity: 'MEDIUM',
        entity_type: 'land_parcels',
        entity_id: parcel.id,
        title: 'Field Verification Pending',
        explanation: `Land parcel ${parcelNo} (${village}) is awaiting field verification.`,
        recommendation: 'Complete field verification for this parcel.',
        target_role: 'Field Officer',
        assigned_officer_id: assignedOfficerId,
      }, supabase)
      if (res === 'created') summary.created++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    } else {
      const res = await resolveAlert(keyVP, supabase)
      if (res === 'resolved') summary.resolved++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    }

    /* ---------------------------------------------------------------------- */
    /* 2. VERIFICATION_NEEDS_REVIEW                                          */
    /* ---------------------------------------------------------------------- */
    const keyVNR = `VERIFICATION_NEEDS_REVIEW:land_parcels:${parcel.id}`
    if (parcel.field_verification_status === 'Needs Review') {
      const res = await createAlert({
        alert_key: keyVNR,
        event_type: 'VERIFICATION_NEEDS_REVIEW',
        severity: 'HIGH',
        entity_type: 'land_parcels',
        entity_id: parcel.id,
        title: 'Field Verification Requires Review',
        explanation: `Field verification for parcel ${parcelNo} (${village}) has been marked as Needs Review.`,
        recommendation: 'Review the field verification evidence and update the verification status.',
        target_role: 'SLAO',
        assigned_officer_id: assignedOfficerId,
      }, supabase)
      if (res === 'created') summary.created++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    } else {
      const res = await resolveAlert(keyVNR, supabase)
      if (res === 'resolved') summary.resolved++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    }

    /* ---------------------------------------------------------------------- */
    /* 4. SECTION_23_EVIDENCE_MISSING                                         */
    /* ---------------------------------------------------------------------- */
    const keyS23E = `SECTION_23_EVIDENCE_MISSING:land_parcels:${parcel.id}`
    if (actualEvidenceCount === 0) {
      const res = await createAlert({
        alert_key: keyS23E,
        event_type: 'SECTION_23_EVIDENCE_MISSING',
        severity: 'HIGH',
        entity_type: 'land_parcels',
        entity_id: parcel.id,
        title: 'Section 23 Evidence Missing',
        explanation: `Required field evidence has not been uploaded for parcel ${parcelNo} (${village}).`,
        recommendation: 'Upload the required field evidence before proceeding with statutory awards.',
        target_role: 'Field Officer',
        assigned_officer_id: assignedOfficerId,
      }, supabase)
      if (res === 'created') summary.created++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    } else {
      const res = await resolveAlert(keyS23E, supabase)
      if (res === 'resolved') summary.resolved++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    }

    /* ---------------------------------------------------------------------- */
    /* 5. UNASSIGNED_PARCEL                                                   */
    /* ---------------------------------------------------------------------- */
    const keyUP = `UNASSIGNED_PARCEL:land_parcels:${parcel.id}`
    if (!activeAssignment) {
      const res = await createAlert({
        alert_key: keyUP,
        event_type: 'UNASSIGNED_PARCEL',
        severity: 'MEDIUM',
        entity_type: 'land_parcels',
        entity_id: parcel.id,
        title: 'Parcel Requires Assignment',
        explanation: `Parcel ${parcelNo} (${village}) currently has no active field officer assignment.`,
        recommendation: 'Assign a Field Officer to this parcel.',
        target_role: 'SLAO',
        assigned_officer_id: null,
      }, supabase)
      if (res === 'created') summary.created++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    } else {
      const res = await resolveAlert(keyUP, supabase)
      if (res === 'resolved') summary.resolved++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    }

    /* ---------------------------------------------------------------------- */
    /* 6. COMPENSATION_PAYMENT_PENDING                                       */
    /* ---------------------------------------------------------------------- */
    const keyCPP = `COMPENSATION_PAYMENT_PENDING:land_parcels:${parcel.id}`
    const approvedAmt = Number(parcel.compensation_approved || 0)
    const isPaymentPending = parcel.payment_status === 'Pending'

    if (approvedAmt > 0 && isPaymentPending) {
      const res = await createAlert({
        alert_key: keyCPP,
        event_type: 'COMPENSATION_PAYMENT_PENDING',
        severity: 'HIGH',
        entity_type: 'land_parcels',
        entity_id: parcel.id,
        title: 'Compensation Payment Pending',
        explanation: `Compensation of ₹${approvedAmt.toLocaleString('en-IN')} approved for parcel ${parcelNo} but payment remains pending.`,
        recommendation: 'Review the compensation payment status and execute PFMS payout.',
        target_role: 'SLAO',
        assigned_officer_id: null,
      }, supabase)
      if (res === 'created') summary.created++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    } else {
      const res = await resolveAlert(keyCPP, supabase)
      if (res === 'resolved') summary.resolved++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    }

    /* ---------------------------------------------------------------------- */
    /* 7. GIS_AREA_ANOMALY                                                    */
    /* ---------------------------------------------------------------------- */
    const keyGIS = `GIS_AREA_ANOMALY:land_parcels:${parcel.id}`
    const notified = Number(parcel.notified_area_sqm || 0)
    const affected = Number(parcel.affected_area_sqm || 0)
    const hasMissingCoords = parcel.latitude === null || parcel.longitude === null
    const hasAreaMismatch = affected > 0 && notified > 0 && affected > notified

    if (hasAreaMismatch || hasMissingCoords) {
      let explanation = `GIS anomaly detected for parcel ${parcelNo}.`
      if (hasAreaMismatch) {
        explanation = `Parcel ${parcelNo} affected area (${affected} sqm) exceeds notified area (${notified} sqm).`
      } else if (hasMissingCoords) {
        explanation = `Parcel ${parcelNo} is missing spatial coordinate metadata.`
      }

      const res = await createAlert({
        alert_key: keyGIS,
        event_type: 'GIS_AREA_ANOMALY',
        severity: 'HIGH',
        entity_type: 'land_parcels',
        entity_id: parcel.id,
        title: 'GIS Parcel Data Anomaly',
        explanation,
        recommendation: 'Review the parcel GIS geometry and coordinate information.',
        target_role: 'Admin',
        assigned_officer_id: null,
      }, supabase)
      if (res === 'created') summary.created++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    } else {
      const res = await resolveAlert(keyGIS, supabase)
      if (res === 'resolved') summary.resolved++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    }
  } catch (err) {
    console.error(`[AlertEngine] Exception evaluating parcel alerts for ${parcelId}:`, err)
    summary.errors++
  }

  return summary
}

/**
 * Evaluates all intelligent alert rules for a single statutory workflow.
 */
export async function evaluateWorkflowAlerts(
  workflowId: string,
  providedClient?: any
): Promise<AlertEvaluationSummary> {
  const summary: AlertEvaluationSummary = { created: 0, resolved: 0, unchanged: 0, errors: 0 }

  try {
    const supabase = getEngineClient(providedClient)

    const { data: workflow, error: wfError } = await supabase
      .from('statutory_workflows')
      .select('*')
      .eq('id', workflowId)
      .maybeSingle()

    if (wfError || !workflow) {
      summary.errors++
      return summary
    }

    const key3GB = `SECTION_3G_BLOCKED:statutory_workflows:${workflow.id}`
    const isPending = (workflow.status || '').toLowerCase().includes('pending')

    if (workflow.land_parcel_id && isPending) {
      // Fetch associated parcel
      const { data: parcel } = await supabase
        .from('land_parcels')
        .select('*')
        .eq('id', workflow.land_parcel_id)
        .maybeSingle()

      // Fetch evidence count
      const { count: evCount } = await supabase
        .from('field_evidence')
        .select('id', { count: 'exact', head: true })
        .eq('parcel_id', workflow.land_parcel_id)

      // Fetch active assignment
      const { data: assignments } = await supabase
        .from('parcel_assignments')
        .select('id, assigned_officer_id')
        .eq('parcel_id', workflow.land_parcel_id)
        .eq('status', 'Active')

      const activeAssignment = assignments && assignments.length > 0 ? assignments[0] : null
      const readiness = calculateWorkflowReadiness(
        workflow.workflow_type || workflow.stage_name || '',
        workflow.land_parcel_id,
        parcel,
        evCount || 0,
        activeAssignment
      )

      /* -------------------------------------------------------------------- */
      /* 3. SECTION_3G_BLOCKED                                                */
      /* -------------------------------------------------------------------- */
      if (readiness.status === 'BLOCKED') {
        const blockingReason = readiness.reasons.join(' ') || 'Section 3G workflow is blocked due to unfulfilled requirements.'
        const res = await createAlert({
          alert_key: key3GB,
          event_type: 'SECTION_3G_BLOCKED',
          severity: 'CRITICAL',
          entity_type: 'statutory_workflows',
          entity_id: workflow.id,
          title: 'Section 3G Workflow Blocked',
          explanation: blockingReason,
          recommendation: 'Complete field verification and resolve outstanding requirements before proceeding.',
          target_role: 'SLAO',
          assigned_officer_id: activeAssignment?.assigned_officer_id || null,
        }, supabase)
        if (res === 'created') summary.created++
        else if (res === 'unchanged') summary.unchanged++
        else summary.errors++
      } else {
        const res = await resolveAlert(key3GB, supabase)
        if (res === 'resolved') summary.resolved++
        else if (res === 'unchanged') summary.unchanged++
        else summary.errors++
      }
    } else {
      // If workflow is no longer pending or has no parcel, resolve any 3G blocked alert
      const res = await resolveAlert(key3GB, supabase)
      if (res === 'resolved') summary.resolved++
      else if (res === 'unchanged') summary.unchanged++
      else summary.errors++
    }
  } catch (err) {
    console.error(`[AlertEngine] Exception evaluating workflow alerts for ${workflowId}:`, err)
    summary.errors++
  }

  return summary
}

/* -------------------------------------------------------------------------- */
/* Master System-Wide Evaluator                                              */
/* -------------------------------------------------------------------------- */

/**
 * Main entry point: Evaluates alerts across active parcels and workflows.
 * Safe, idempotent, and non-crashing.
 */
export async function evaluateAlerts(providedClient?: any): Promise<AlertEvaluationSummary> {
  const masterSummary: AlertEvaluationSummary = { created: 0, resolved: 0, unchanged: 0, errors: 0 }

  try {
    const supabase = getEngineClient(providedClient)

    // Bounded fetch of active/recent land parcels (up to 100)
    const { data: parcels, error: parcelErr } = await supabase
      .from('land_parcels')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!parcelErr && parcels) {
      for (const p of parcels) {
        const res = await evaluateParcelAlerts(p.id, supabase)
        masterSummary.created += res.created
        masterSummary.resolved += res.resolved
        masterSummary.unchanged += res.unchanged
        masterSummary.errors += res.errors
      }
    } else if (parcelErr) {
      console.error('[AlertEngine] Error querying parcels for evaluation:', parcelErr)
      masterSummary.errors++
    }

    // Bounded fetch of pending statutory workflows (up to 100)
    const { data: workflows, error: wfErr } = await supabase
      .from('statutory_workflows')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!wfErr && workflows) {
      for (const w of workflows) {
        const res = await evaluateWorkflowAlerts(w.id, supabase)
        masterSummary.created += res.created
        masterSummary.resolved += res.resolved
        masterSummary.unchanged += res.unchanged
        masterSummary.errors += res.errors
      }
    } else if (wfErr) {
      console.error('[AlertEngine] Error querying workflows for evaluation:', wfErr)
      masterSummary.errors++
    }
  } catch (err) {
    console.error('[AlertEngine] Exception in master evaluateAlerts:', err)
    masterSummary.errors++
  }

  return masterSummary
}

/* -------------------------------------------------------------------------- */
/* Project Spatial Conflict Evaluator                                         */
/* -------------------------------------------------------------------------- */

/**
 * Evaluates spatial conflict between two project corridors and manages
 * PROJECT_SPATIAL_OVERLAP alerts idempotently.
 * Uses deterministic key sorting (A+B == B+A).
 */
export async function evaluateProjectConflictAlert(
  codeA: string,
  codeB: string,
  conflictData: {
    conflict_detected: boolean
    project_a?: { project_code: string; project_name: string }
    project_b?: { project_code: string; project_name: string }
    overlap_area_sqm?: number
    overlap_area_ha?: number
    overlap_centroid?: { latitude: number; longitude: number } | null
  },
  providedClient?: any
): Promise<{ status: 'created' | 'resolved' | 'unchanged' | 'error'; alert_key: string }> {
  try {
    const supabase = getEngineClient(providedClient)

    const code1 = (codeA || '').trim().toUpperCase()
    const code2 = (codeB || '').trim().toUpperCase()
    const sortedCodes = [code1, code2].sort()
    const alertKey = `PROJECT_SPATIAL_OVERLAP:${sortedCodes[0]}:${sortedCodes[1]}`

    // Look up project in DB to get valid UUID entity_id
    const { data: projA } = await supabase
      .from('projects')
      .select('id')
      .eq('project_code', sortedCodes[0])
      .maybeSingle()

    const entityId = projA?.id || '00000000-0000-0000-0000-000000000001'

    const nameA = conflictData.project_a?.project_name || sortedCodes[0]
    const nameB = conflictData.project_b?.project_name || sortedCodes[1]
    const sqm = Number(conflictData.overlap_area_sqm || 0)
    const ha = Number(conflictData.overlap_area_ha || 0)
    const lat = conflictData.overlap_centroid?.latitude
    const lng = conflictData.overlap_centroid?.longitude
    const locationStr = lat && lng ? ` near coordinates (${lat}, ${lng})` : ''

    if (conflictData.conflict_detected && sqm > 0) {
      const res = await createAlert({
        alert_key: alertKey,
        event_type: 'PROJECT_SPATIAL_OVERLAP',
        severity: 'HIGH',
        entity_type: 'project_conflict',
        entity_id: entityId,
        title: `Potential GIS Conflict: ${sortedCodes[0]} ↔ ${sortedCodes[1]}`,
        explanation: `Spatial acquisition corridor intersection detected between ${nameA} (${sortedCodes[0]}) and ${nameB} (${sortedCodes[1]}) with an overlapping area of ${sqm.toLocaleString('en-IN')} sqm (${ha} ha)${locationStr}.`,
        recommendation: 'Coordinate with the concerned department and review overlapping acquisition corridors before proceeding further.',
        target_role: 'MoRTH Nodal Officer',
        assigned_officer_id: null,
      }, supabase)

      return { status: res, alert_key: alertKey }
    } else {
      const res = await resolveAlert(alertKey, supabase)
      return { status: res, alert_key: alertKey }
    }
  } catch (err) {
    console.error(`[AlertEngine] Exception in evaluateProjectConflictAlert for ${codeA} vs ${codeB}:`, err)
    return { status: 'error', alert_key: `PROJECT_SPATIAL_OVERLAP:${codeA}:${codeB}` }
  }
}
