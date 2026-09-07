'use client'

import { AlertTriangle, AlertCircle, Clock, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlertSummaryCounts {
  critical: number
  high: number
  medium: number
  low: number
  total: number
}

interface AlertSummaryProps {
  counts: AlertSummaryCounts
  loading?: boolean
  className?: string
}

export default function AlertSummary({ counts, loading, className }: AlertSummaryProps) {
  return (
    <section aria-label="Early warning alert summary" className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3.5', className)}>
      {/* Critical Alerts Card */}
      <div className="rounded-lg border border-red-200 bg-red-50/60 p-3.5 dark:bg-red-950/30 dark:border-red-900/50 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
            Critical Alerts
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-red-900 dark:text-red-100">
            {loading ? '...' : counts.critical}
          </p>
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 font-medium">
            Immediate Action Required
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200">
          <AlertTriangle className="size-5" />
        </div>
      </div>

      {/* High Priority Alerts Card */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 dark:bg-amber-950/30 dark:border-amber-900/50 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            High Priority
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-amber-900 dark:text-amber-100">
            {loading ? '...' : counts.high}
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
            Urgent Review Needed
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/50 dark:text-amber-200">
          <AlertCircle className="size-5" />
        </div>
      </div>

      {/* Medium / Attention Alerts Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 dark:bg-blue-950/30 dark:border-blue-900/50 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Attention Needed
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-blue-900 dark:text-blue-100">
            {loading ? '...' : counts.medium}
          </p>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
            Medium Priority Items
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-200">
          <Clock className="size-5" />
        </div>
      </div>

      {/* Low / Informational Alerts Card */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 dark:bg-slate-900/40 dark:border-slate-800 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Informational
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-slate-900 dark:text-slate-100">
            {loading ? '...' : counts.low}
          </p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            Low Priority System Alerts
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300">
          <Info className="size-5" />
        </div>
      </div>
    </section>
  )
}
