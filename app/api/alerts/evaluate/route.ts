import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'
import { evaluateAlerts } from '@/lib/alerts/engine'

/* -------------------------------------------------------------------------- */
/* POST /api/alerts/evaluate                                                  */
/* Triggers the intelligent alert evaluation engine                           */
/* Restricted to Admin, SLAO, and MoRTH Nodal Officer roles                  */
/* -------------------------------------------------------------------------- */

const ALLOWED_EVALUATE_ROLES = new Set(['Admin', 'SLAO', 'MoRTH Nodal Officer'])

export async function POST() {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    // Role Authorization Check
    if (!ALLOWED_EVALUATE_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient permissions. Role '${authRes.profile.role}' is not authorized to trigger alert evaluation.`,
        },
        { status: 403 }
      )
    }

    // Run the server-side Alert Engine
    const result = await evaluateAlerts()

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[API /api/alerts/evaluate POST] Server error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error during alert evaluation' },
      { status: 500 }
    )
  }
}
