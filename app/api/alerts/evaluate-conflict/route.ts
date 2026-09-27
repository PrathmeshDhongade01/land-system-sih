import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'
import { evaluateProjectConflictAlert } from '@/lib/alerts/engine'

/* -------------------------------------------------------------------------- */
/* POST /api/alerts/evaluate-conflict                                         */
/* Triggers GIS conflict evaluation and manages PROJECT_SPATIAL_OVERLAP alert  */
/* Restricted to Admin, SLAO, and MoRTH Nodal Officer roles                  */
/* -------------------------------------------------------------------------- */

const ALLOWED_EVALUATE_ROLES = new Set(['Admin', 'SLAO', 'MoRTH Nodal Officer'])

export async function POST(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    if (!ALLOWED_EVALUATE_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient permissions. Role '${authRes.profile.role}' is not authorized to trigger GIS conflict evaluations.`,
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const codeA = typeof body.project_code_a === 'string' ? body.project_code_a.trim() : ''
    const codeB = typeof body.project_code_b === 'string' ? body.project_code_b.trim() : ''

    if (!codeA || !codeB) {
      return NextResponse.json(
        { success: false, error: 'Both project_code_a and project_code_b parameters are required.' },
        { status: 400 }
      )
    }

    if (codeA.toUpperCase() === codeB.toUpperCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot perform spatial conflict evaluation for a project against itself.' },
        { status: 400 }
      )
    }

    // Call internal spatial engine backend
    const baseUrl = (process.env.SPATIAL_ENGINE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

    const engineRes = await fetch(`${baseUrl}/api/detect-conflicts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        project_code_a: codeA,
        project_code_b: codeB,
      }),
      cache: 'no-store',
    })

    const engineJson = await engineRes.json().catch(() => ({}))

    if (!engineRes.ok) {
      const errorMsg = engineJson.detail || engineJson.message || `Spatial engine error ${engineRes.status}`
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
        },
        { status: engineRes.status || 500 }
      )
    }

    // Evaluate database alert using deterministic alert key pattern
    const alertResult = await evaluateProjectConflictAlert(codeA, codeB, engineJson, authRes.supabase)

    return NextResponse.json(
      {
        success: true,
        conflict_detected: engineJson.conflict_detected,
        project_a: engineJson.project_a,
        project_b: engineJson.project_b,
        overlap_area_sqm: engineJson.overlap_area_sqm,
        overlap_area_ha: engineJson.overlap_area_ha,
        overlap_centroid: engineJson.overlap_centroid,
        alert_status: alertResult.status,
        alert_key: alertResult.alert_key,
        alert_created_or_active: alertResult.status === 'created' || alertResult.status === 'unchanged',
        message: engineJson.message,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[API /api/alerts/evaluate-conflict POST] Exception:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error during GIS conflict alert evaluation' },
      { status: 500 }
    )
  }
}
