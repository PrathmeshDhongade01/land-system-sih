import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile, createServiceRoleClient } from '@/lib/supabase/server'

/* -------------------------------------------------------------------------- */
/* GET /api/officers                                                          */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    // STRICT RBAC: Only Admin and SLAO may view the active Field Officers list
    const ALLOWED_ROLES = new Set(['Admin', 'SLAO'])
    if (!ALLOWED_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const dbClient = createServiceRoleClient()
    if (!dbClient) {
      console.error('Service role client unavailable in GET /api/officers')
      return NextResponse.json(
        { success: false, error: 'Server configuration error.' },
        { status: 500 }
      )
    }

    // Query active Field Officers server-side using service-role client
    const { data: officers, error: fetchErr } = await dbClient
      .from('profiles')
      .select('id, email, full_name, designation, department, role')
      .eq('role', 'Field Officer')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (fetchErr) {
      console.error('Error fetching field officers in GET /api/officers:', fetchErr)
      return NextResponse.json(
        { success: false, error: `Database query failed: ${fetchErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: officers || [] },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Unexpected error in GET /api/officers:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}
