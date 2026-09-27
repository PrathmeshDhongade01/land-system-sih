'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  MapPin,
  RefreshCw,
  Upload,
  Footprints,
  Clock,
  ChevronRight,
  FileCheck,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface EnrichedAssignment {
  id: string
  parcel_id: string
  assigned_officer_id: string
  assigned_by: string
  assigned_at: string
  status: 'Active' | 'Completed' | 'Cancelled'
  remarks?: string | null
  parcel_number?: string | null
  parcel_no?: string | null
  owner_name?: string | null
  village_name?: string | null
  district?: string | null
  project_code?: string | null
  field_verification_status?: string | null
  possession_status?: string | null
  evidenceCount?: number
}

interface MyTasksPanelProps {
  userRole?: string | null
  onOpenParcel?: (parcelId: string) => void
  selectedProjectCode?: string | null
}

/* -------------------------------------------------------------------------- */
/* Badge helpers                                                               */
/* -------------------------------------------------------------------------- */

function VerificationBadge({ status }: { status?: string | null }) {
  const s = (status || 'Pending').trim()
  if (s === 'Verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 ring-1 ring-green-200">
        <CheckCircle2 className="size-3" />
        Verified
      </span>
    )
  }
  if (s === 'Needs Review') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
        <AlertCircle className="size-3" />
        Needs Review
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      <Clock className="size-3" />
      Pending
    </span>
  )
}

function getTaskAction(verificationStatus?: string | null): string {
  const s = (verificationStatus || 'Pending').trim()
  if (s === 'Verified') return 'Review & Update'
  if (s === 'Needs Review') return 'Re-verify Required'
  return 'Field Visit Required'
}

function getTaskActionBg(verificationStatus?: string | null): string {
  const s = (verificationStatus || 'Pending').trim()
  if (s === 'Verified') return 'bg-green-50 text-green-800 border-green-200'
  if (s === 'Needs Review') return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-blue-50 text-blue-800 border-blue-200'
}

/* -------------------------------------------------------------------------- */
/* Single Task Card                                                            */
/* -------------------------------------------------------------------------- */

function TaskCard({
  task,
  onOpenParcel,
}: {
  task: EnrichedAssignment
  onOpenParcel?: (parcelId: string) => void
}) {
  const parcelLabel =
    task.parcel_number || task.parcel_no || `LP-${task.parcel_id.slice(0, 8).toUpperCase()}`
  const projectLabel = task.project_code || 'N/A'
  const locationLabel = [task.village_name, task.district].filter(Boolean).join(', ') || 'N/A'
  const verStatus = task.field_verification_status || 'Pending'

  return (
    <article className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div
        className={cn(
          'h-1 w-full',
          verStatus === 'Verified'
            ? 'bg-green-500'
            : verStatus === 'Needs Review'
            ? 'bg-amber-500'
            : 'bg-blue-500',
        )}
      />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                {parcelLabel}
              </span>
              <span className="text-xs text-muted-foreground font-medium">{projectLabel}</span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </p>
          </div>
          <div className="shrink-0">
            <VerificationBadge status={verStatus} />
          </div>
        </div>

        {task.owner_name && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Owner:</span> {task.owner_name}
          </p>
        )}

        <div
          className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium',
            getTaskActionBg(verStatus),
          )}
        >
          <Footprints className="size-3.5 shrink-0" />
          <span>Task: {getTaskAction(verStatus)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileCheck className="size-3.5" />
            Evidence:{' '}
            {task.evidenceCount !== undefined && task.evidenceCount > 0 ? (
              <span className="font-medium text-green-700">{task.evidenceCount} file(s) uploaded</span>
            ) : (
              <span className="font-medium text-amber-700">Required</span>
            )}
          </span>
          <span className="text-[10px]">
            {new Date(task.assigned_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
          {onOpenParcel && (
            <button
              type="button"
              onClick={() => onOpenParcel(task.parcel_id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Eye className="size-3.5" />
              View Parcel
            </button>
          )}
          <Link
            href="/field-verification"
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-100"
          >
            <Footprints className="size-3.5" />
            {verStatus === 'Verified' ? 'Re-visit' : 'Start Visit'}
          </Link>
          <Link
            href="/field-verification"
            className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800 transition-colors hover:bg-green-100"
          >
            <ClipboardCheck className="size-3.5" />
            Verify
          </Link>
          <button
            type="button"
            onClick={() => onOpenParcel?.(task.parcel_id)}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            <Upload className="size-3.5" />
            Upload Evidence
          </button>
        </div>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/* My Tasks Panel                                                              */
/* -------------------------------------------------------------------------- */

export default function MyTasksPanel({ userRole, onOpenParcel, selectedProjectCode }: MyTasksPanelProps) {
  const [tasks, setTasks] = useState<EnrichedAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/assignments?assigned_to_me=true&status=Active')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        setError(json.error || 'Unable to load your tasks')
        setTasks([])
      } else {
        setTasks(json.data || [])
      }
    } catch (err: any) {
      setError('Unable to load your tasks. Please try again.')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const displayTasks = selectedProjectCode && selectedProjectCode !== 'ALL'
    ? tasks.filter((t) => t.project_code === selectedProjectCode)
    : tasks

  const pendingCount = displayTasks.filter(
    (t) => !t.field_verification_status || t.field_verification_status === 'Pending',
  ).length
  const reviewCount = displayTasks.filter((t) => t.field_verification_status === 'Needs Review').length
  const verifiedCount = displayTasks.filter((t) => t.field_verification_status === 'Verified').length

  return (
    <section aria-label="My Tasks" className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border bg-blue-50/60 px-5 py-4">
        <div>
          <h2 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
            <Inbox className="size-4.5 text-blue-600" />
            My Tasks
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active parcel assignments requiring your action
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
              {displayTasks.length} Active
            </span>
          )}
          <button
            type="button"
            onClick={fetchTasks}
            disabled={loading}
            aria-label="Refresh tasks"
            className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && !error && displayTasks.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-muted/20">
          <div className="px-4 py-3 text-center">
            <p className="font-mono text-xl font-bold text-blue-700">{pendingCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Pending Visit</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="font-mono text-xl font-bold text-amber-700">{reviewCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Needs Review</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="font-mono text-xl font-bold text-green-700">{verifiedCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Verified</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <RefreshCw className="size-4 animate-spin text-blue-600" />
            <span>Loading your assignments...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <AlertCircle className="size-4 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Could not load tasks</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">All clear!</p>
              <p className="text-xs text-muted-foreground mt-0.5">No active assignments right now.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayTasks.map((task) => (
              <TaskCard key={task.id} task={task} onOpenParcel={onOpenParcel} />
            ))}
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="border-t border-border px-5 py-3">
          <Link
            href="/assignments"
            className="flex items-center justify-center gap-1 rounded-md py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            View all assignments
            <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </section>
  )
}
