import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'

/* -------------------------------------------------------------------------- */
/* POST /api/spatial/conflicts                                                */
/* Proxy endpoint for multi-project spatial conflict detection               */
/* -------------------------------------------------------------------------- */

const ALLOWED_SPATIAL_ROLES = new Set([
  'Admin',
  'SLAO',
  'CALA',
  'MoRTH Nodal Officer',
  'Field Officer',
])

export async function POST(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    if (!ALLOWED_SPATIAL_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const codeA = typeof body.project_code_a === 'string' ? body.project_code_a.trim() : ''
    const codeB = typeof body.project_code_b === 'string' ? body.project_code_b.trim() : ''

    if (!codeA || !codeB) {
      return NextResponse.json(
        { success: false, error: 'Both project_code_a and project_code_b are required.' },
        { status: 400 }
      )
    }

    if (codeA.toUpperCase() === codeB.toUpperCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot perform spatial conflict detection for a project against itself.' },
        { status: 400 }
      )
    }

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

    return NextResponse.json(
      {
        success: true,
        ...engineJson,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[API /api/spatial/conflicts POST] Exception:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'Spatial analysis engine is unavailable. Please ensure the GIS service is running.',
      },
      { status: 503 }
    )
  }
}
