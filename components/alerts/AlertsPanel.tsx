'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AlertTriangle, AlertCircle, Clock, Info, RefreshCw, Play, Filter, CheckCircle2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import AlertDetailModal, { AlertRecord } from './AlertDetailModal'

interface AlertsPanelProps {
  userRole?: string | null
  onCountsUpdated?: (counts: { critical: number; high: number; medium: number; low: number; total: number }) => void
  className?: string
}

export default function AlertsPanel({ userRole, onCountsUpdated, className }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null)

  // System Evaluation State
  const [evaluating, setEvaluating] = useState<boolean>(false)
  const [evalResult, setEvalResult] = useState<{ created: number; resolved: number; unchanged: number; errors: number } | null>(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/alerts?status=ACTIVE')
      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        setError(json.error || 'Unable to load active system alerts')
        setAlerts([])
      } else {
        setAlerts(json.data || [])
      }
    } catch (err: any) {
      console.error('[AlertsPanel] Fetch error:', err)
      setError('Unable to load active system alerts')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // Compute counts & report to parent summary card
  useEffect(() => {
    const critical = alerts.filter((a) => a.severity === 'CRITICAL').length
    const high = alerts.filter((a) => a.severity === 'HIGH').length
    const medium = alerts.filter((a) => a.severity === 'MEDIUM').length
    const low = alerts.filter((a) => a.severity === 'LOW').length
    const total = alerts.length

    if (onCountsUpdated) {
      onCountsUpdated({ critical, high, medium, low, total })
    }
  }, [alerts, onCountsUpdated])

  // Trigger system-wide alert engine evaluation
  const handleEvaluate = async () => {
    setEvaluating(true)
    setEvalResult(null)
    try {
      const res = await fetch('/api/alerts/evaluate', { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.success) {
        setEvalResult(json.data)
        await fetchAlerts()
      } else {
        setError(json.error || 'Alert evaluation failed')
      }
    } catch (err: any) {
      console.error('[AlertsPanel] Evaluate error:', err)
      setError('Error triggering alert evaluation')
    } finally {
      setEvaluating(false)
    }
  }

  // Sort by severity order: CRITICAL > HIGH > MEDIUM > LOW
  const sortedAlerts = useMemo(() => {
    const severityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    }

    return [...alerts].sort((a, b) => {
      const wA = severityWeight[a.severity] || 0
      const wB = severityWeight[b.severity] || 0
      if (wA !== wB) return wB - wA
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [alerts])

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'ALL') return sortedAlerts
    return sortedAlerts.filter((a) => a.severity === severityFilter)
  }, [sortedAlerts, severityFilter])

  const canEvaluate = userRole && ['Admin', 'SLAO', 'MoRTH Nodal Officer'].includes(userRole)

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          label: 'Immediate Action',
          icon: AlertTriangle,
          badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300',
          border: 'border-l-4 border-l-red-600',
        }
      case 'HIGH':
        return {
          label: 'High Priority',
          icon: AlertCircle,
          badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
          border: 'border-l-4 border-l-amber-500',
        }
      case 'MEDIUM':
        return {
          label: 'Attention',
          icon: Clock,
          badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
          border: 'border-l-4 border-l-blue-500',
        }
      case 'LOW':
      default:
        return {
          label: 'Informational',
          icon: Info,
          badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
          border: 'border-l-4 border-l-slate-400',
        }
    }
  }

  return (
    <section
      aria-label="Early Warning Intelligent Alerts System"
      className={cn('flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm', className)}
    >
      {/* Panel Header */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base font-semibold text-foreground">
              Early Warning &amp; Intelligent Alerts
            </h2>
            <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[10px] font-bold border border-red-200 dark:bg-red-950 dark:text-red-300">
              {alerts.length} Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Automated SLA breach, statutory bottleneck, and field verification risk detection
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Action */}
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          {/* Role-Aware System-Wide Evaluate Action */}
          {canEvaluate && (
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={evaluating}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Play className={cn('size-3.5 fill-current', evaluating && 'animate-spin')} />
              <span>{evaluating ? 'Evaluating Engine...' : 'Evaluate System Alerts'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Evaluation Feedback Banner */}
      {evalResult && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-5 text-xs text-emerald-900 flex items-center justify-between dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>
              Engine evaluation complete: <strong>{evalResult.created}</strong> created, <strong>{evalResult.resolved}</strong> resolved, <strong>{evalResult.unchanged}</strong> unchanged.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEvalResult(null)}
            className="text-xs underline text-emerald-700 hover:text-emerald-900 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error State Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-3 px-5 text-xs text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded bg-red-100 hover:bg-red-200 px-2 py-1 text-xs font-semibold text-red-800 transition-colors shrink-0"
          >
            <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Filter Tabs Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="size-3.5 text-muted-foreground mr-1" />
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((filterKey) => {
            const isActive = severityFilter === filterKey
            const labelMap: Record<string, string> = {
              ALL: `All (${alerts.length})`,
              CRITICAL: `Critical (${alerts.filter((a) => a.severity === 'CRITICAL').length})`,
              HIGH: `High (${alerts.filter((a) => a.severity === 'HIGH').length})`,
              MEDIUM: `Medium (${alerts.filter((a) => a.severity === 'MEDIUM').length})`,
              LOW: `Low (${alerts.filter((a) => a.severity === 'LOW').length})`,
            }

            return (
              <button
                key={filterKey}
                type="button"
                onClick={() => setSeverityFilter(filterKey)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors shrink-0',
                  isActive
                    ? 'bg-background text-foreground shadow-2xs font-semibold border border-border'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                )}
              >
                {labelMap[filterKey]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Alert Items List */}
      <div className="divide-y divide-border/60">
        {loading && alerts.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw className="size-4 animate-spin text-primary" />
            <span>Scanning database for active system alerts...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground space-y-1">
            <CheckCircle2 className="size-8 text-emerald-600 mx-auto opacity-80" />
            <p className="font-semibold text-foreground text-sm">No Active System Alerts</p>
            <p className="text-muted-foreground">
              {severityFilter === 'ALL'
                ? 'All land parcels and statutory workflows are operating within SLA parameters.'
                : `No active alerts match the "${severityFilter}" severity filter.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const sev = getSeverityStyle(alert.severity)
            const IconComp = sev.icon

            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={cn(
                  'p-4 transition-colors hover:bg-accent/40 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                  sev.border
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md border text-xs mt-0.5', sev.badge)}>
                    <IconComp className="size-4" />
                  </div>

                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border uppercase', sev.badge)}>
                        {sev.label}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                        {alert.event_type}
                      </span>
                      <h3 className="font-semibold text-foreground text-sm truncate">{alert.title}</h3>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {alert.explanation}
                    </p>

                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium line-clamp-1">
                      💡 Recommendation: {alert.recommendation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end shrink-0 gap-1 text-[11px] text-muted-foreground">
                  <span>
                    {new Date(alert.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-1 text-primary font-medium hover:underline">
                    <span>View Detail</span>
                    <ChevronRight className="size-3.5" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Alert Detail Modal */}
      <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </section>
  )
}
