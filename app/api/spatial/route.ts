import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'

export async function GET() {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Insufficient permissions' },
        { status: authRes.status }
      )
    }

    const ALLOWED_SPATIAL_ROLES = new Set([
      'Admin',
      'SLAO',
      'CALA',
      'MoRTH Nodal Officer',
      'Field Officer',
    ])

    if (!ALLOWED_SPATIAL_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const baseUrl = (process.env.SPATIAL_ENGINE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

    const response = await fetch(`${baseUrl}/api/calculate-overlap`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return NextResponse.json(
        {
          status: 'failed',
          error: `Spatial analysis engine returned error status ${response.status}`,
          details: errorText || `HTTP ${response.status}`,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    if (data.status === 'error') {
      return NextResponse.json(
        {
          status: 'failed',
          error: data.message || 'Spatial analysis failed in backend engine.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    console.error('Error proxying request to spatial engine:', err)
    return NextResponse.json(
      {
        status: 'unavailable',
        error: 'Spatial analysis engine is unavailable. Please ensure the GIS service is running.',
        details: err?.message || 'Could not connect to FastAPI backend service',
      },
      { status: 503 }
    )
  }
}
