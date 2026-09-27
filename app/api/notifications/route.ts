import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* -------------------------------------------------------------------------- */
/* GET /api/notifications                                                     */
/* Returns notifications belonging strictly to the authenticated caller        */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile || !authRes.user) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    // Base query scoped strictly to caller's authenticated user ID
    let query = authRes.supabase
      .from('notifications')
      .select('id, title, message, type, link_url, is_read, created_at')
      .eq('user_id', authRes.user.id)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    query = query.order('created_at', { ascending: false }).limit(20)

    const { data: notifications, error } = await query

    if (error) {
      console.error('[API /api/notifications GET] Database query error:', error)

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
            unread_count: 0,
          },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Get exact unread count for badge indicators
    const { count: unreadCount } = await authRes.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authRes.user.id)
      .eq('is_read', false)

    return NextResponse.json(
      {
        success: true,
        data: notifications || [],
        unread_count: unreadCount || 0,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[API /api/notifications GET] Unexpected server error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH /api/notifications                                                   */
/* Marks specific notification or all notifications as read for caller        */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile || !authRes.user) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    const body = await request.json().catch(() => ({}))

    // Option 1: Mark all notifications as read for current user
    if (body.markAllRead === true) {
      const { error, count } = await authRes.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', authRes.user.id)
        .eq('is_read', false)

      if (error) {
        console.error('[API /api/notifications PATCH markAllRead] Database error:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to update notifications' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          message: 'All notifications marked as read',
          updated_count: count || 0,
        },
        { status: 200 }
      )
    }

    // Option 2: Mark single notification as read by ID
    const notificationId = typeof body.id === 'string' ? body.id.trim() : null
    if (!notificationId || !UUID_REGEX.test(notificationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request. Provide a valid notification "id" or "markAllRead: true".',
        },
        { status: 400 }
      )
    }

    // Update ONLY if notification belongs to authenticated user
    const { data, error } = await authRes.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', authRes.user.id)
      .select('id, is_read')

    if (error) {
      console.error('[API /api/notifications PATCH id] Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update notification status' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Notification marked as read',
        data: data[0],
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[API /api/notifications PATCH] Unexpected server error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
