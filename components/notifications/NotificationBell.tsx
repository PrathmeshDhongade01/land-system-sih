'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, ExternalLink, Info, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS'
  link_url?: string | null
  is_read: boolean
  created_at: string
}

interface NotificationBellProps {
  userRole?: string | null
  className?: string
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<boolean>(false)
  const [markingAll, setMarkingAll] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) {
        throw new Error('Unable to load notifications')
      }
      const json = await res.json()
      if (json.success) {
        setNotifications(json.data || [])
        setUnreadCount(json.unread_count || 0)
      } else {
        setError(json.error || 'Failed to fetch notifications')
      }
    } catch (err: any) {
      console.error('[NotificationBell] Fetch error:', err)
      setError('Unable to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mark single notification as read
  const handleMarkAsRead = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notification.id }),
        })
      } catch (err) {
        console.error('[NotificationBell] Error marking notification read:', err)
      }
    }

    if (notification.link_url) {
      setOpen(false)
      router.push(notification.link_url)
    }
  }

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    setMarkingAll(true)

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
    } catch (err) {
      console.error('[NotificationBell] Error marking all notifications read:', err)
    } finally {
      setMarkingAll(false)
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return {
          icon: AlertTriangle,
          badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300',
        }
      case 'WARNING':
        return {
          icon: AlertCircle,
          badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
        }
      case 'SUCCESS':
        return {
          icon: CheckCircle2,
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
        }
      case 'INFO':
      default:
        return {
          icon: Info,
          badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
        }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {/* Bell Button */}
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-saffron text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-lg border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchNotifications}
                disabled={loading}
                title="Refresh notifications"
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Mark all as read</span>
                </button>
              )}
            </div>
          </div>

          {/* Panel Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="size-4 animate-spin text-primary" />
                <span>Loading notifications...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-xs text-red-600 bg-red-50/50">
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic">
                No new notifications
              </div>
            ) : (
              notifications.map((item) => {
                const typeInfo = getTypeBadge(item.type)
                const IconComponent = typeInfo.icon

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkAsRead(item)}
                    className={cn(
                      'p-3 text-xs transition-colors cursor-pointer flex gap-3 items-start hover:bg-accent/50',
                      !item.is_read ? 'bg-primary/5 font-medium' : 'opacity-80'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-md border text-xs',
                        typeInfo.badge
                      )}
                    >
                      <IconComponent className="size-3.5" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{item.title}</p>
                        {!item.is_read && (
                          <span className="size-1.5 shrink-0 rounded-full bg-saffron" />
                        )}
                      </div>
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                        <span>
                          {new Date(item.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {item.link_url && (
                          <span className="flex items-center gap-0.5 text-primary">
                            <span>Open</span>
                            <ExternalLink className="size-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
