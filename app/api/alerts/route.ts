import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'

const ALLOWED_SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
const ALLOWED_STATUSES = new Set(['ACTIVE', 'RESOLVED', 'DISMISSED'])

/* -------------------------------------------------------------------------- */
/* GET /api/alerts                                                            */
/* Returns intelligent alerts relevant to the caller based on RBAC & RLS      */
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

    const { searchParams } = new URL(request.url)
    const severityParam = searchParams.get('severity')?.toUpperCase()
    const statusParam = searchParams.get('status')?.toUpperCase()
    const eventTypeParam = searchParams.get('event_type')?.toUpperCase()

    const entityIdParam = searchParams.get('entity_id')
    const entityTypeParam = searchParams.get('entity_type')

    // Use session-aware client so PostgreSQL RLS policy "Active users can view relevant alerts"
    // automatically enforces visibility based on caller's role and assigned officer ID.
    let query = authRes.supabase
      .from('alerts')
      .select(
        'id, alert_key, event_type, severity, entity_type, entity_id, title, explanation, recommendation, status, target_role, assigned_officer_id, created_at, resolved_at'
      )

    // Optional Filters
    if (entityIdParam && entityIdParam.trim()) {
      query = query.eq('entity_id', entityIdParam.trim())
    }

    if (entityTypeParam && entityTypeParam.trim()) {
      query = query.eq('entity_type', entityTypeParam.trim())
    }

    if (severityParam && ALLOWED_SEVERITIES.has(severityParam)) {
      query = query.eq('severity', severityParam)
    }

    if (statusParam && ALLOWED_STATUSES.has(statusParam)) {
      query = query.eq('status', statusParam)
    } else if (!statusParam) {
      // Default to ACTIVE alerts if no status filter specified
      query = query.eq('status', 'ACTIVE')
    }
    // If statusParam === 'ALL', no status filter applied

    if (eventTypeParam) {
      query = query.eq('event_type', eventTypeParam)
    }

    query = query.order('created_at', { ascending: false }).limit(50)

    const { data: alerts, error } = await query

    if (error) {
      console.error('[API /api/alerts GET] Database error:', error)
      
      // If the alerts table is uninitialized or missing from PostgREST schema cache,
      // treat as 0 active alerts (HTTP 200 with empty list)
      const isMissingTable =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        (error.message && error.message.toLowerCase().includes('schema cache')) ||
        (error.message && error.message.toLowerCase().includes('does not exist'))

      if (isMissingTable) {
        return NextResponse.json(
          {
            success: true,
            data: [],
          },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Unable to load alerts' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: alerts || [],
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[API /api/alerts GET] Unexpected server error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
