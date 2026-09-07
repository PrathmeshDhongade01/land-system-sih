'use client'

import { useRouter } from 'next/navigation'
import { X, ExternalLink, AlertTriangle, AlertCircle, Clock, Info, ShieldAlert, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlertRecord {
  id: string
  alert_key: string
  event_type: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  entity_type: string
  entity_id: string
  title: string
  explanation: string
  recommendation: string
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'
  target_role?: string | null
  assigned_officer_id?: string | null
  created_at: string
  resolved_at?: string | null
}

interface AlertDetailModalProps {
  alert: AlertRecord | null
  onClose: () => void
}

export default function AlertDetailModal({ alert, onClose }: AlertDetailModalProps) {
  const router = useRouter()
  if (!alert) return null

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          label: 'Immediate Action Required',
          icon: AlertTriangle,
          badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
        }
      case 'HIGH':
        return {
          label: 'High Priority',
          icon: AlertCircle,
          badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
        }
      case 'MEDIUM':
        return {
          label: 'Attention Needed',
          icon: Clock,
          badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
        }
      case 'LOW':
      default:
        return {
          label: 'Informational',
          icon: Info,
          badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        }
    }
  }

  const sevInfo = getSeverityBadge(alert.severity)
  const IconComponent = sevInfo.icon

  const handleNavigateToRecord = () => {
    onClose()
    if (alert.entity_type === 'land_parcels') {
      router.push(`/field-verification?parcel_id=${alert.entity_id}`)
    } else if (alert.entity_type === 'statutory_workflows') {
      router.push('/workflows')
    } else if (alert.entity_type === 'parcel_assignments') {
      router.push('/assignments')
    } else {
      router.push('/')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 p-5">
          <div className="flex items-center gap-3 pr-2">
            <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg border', sevInfo.badge)}>
              <IconComponent className="size-5" />
            </div>
            <div>
              <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase border mb-1', sevInfo.badge)}>
                {sevInfo.label}
              </span>
              <h3 id="alert-detail-title" className="font-serif text-base font-bold text-foreground leading-snug">
                {alert.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail modal"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
          {/* Explanation Box */}
          <div className="space-y-1.5">
            <label className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px] block">
              Issue Explanation (DETECT & EXPLAIN)
            </label>
            <div className="rounded-lg border border-border bg-muted/30 p-3.5 text-foreground leading-relaxed">
              {alert.explanation}
            </div>
          </div>

          {/* Recommendation Box */}
          <div className="space-y-1.5">
            <label className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px] block">
              Recommended Action (RECOMMEND & ACT)
            </label>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-200 leading-relaxed font-medium">
              {alert.recommendation}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60 text-muted-foreground text-[11px]">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Event Type</span>
              <span className="font-mono text-foreground font-medium">{alert.event_type}</span>
            </div>

            <div>
              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Target Entity</span>
              <span className="font-mono text-foreground font-medium truncate block" title={`${alert.entity_type}:${alert.entity_id}`}>
                {alert.entity_type}
              </span>
            </div>

            <div>
              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Target Role</span>
              <span className="text-foreground font-medium">{alert.target_role || 'All Authorized Roles'}</span>
            </div>

            <div>
              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Current Status</span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                  alert.status === 'ACTIVE'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                )}
              >
                {alert.status}
              </span>
            </div>

            <div className="col-span-2">
              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Detected Timestamp</span>
              <span className="text-foreground">
                {new Date(alert.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleNavigateToRecord}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <span>Open Related Record</span>
            <ExternalLink className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
