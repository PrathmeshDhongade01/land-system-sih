'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Paperclip,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ObjectionEvidence {
  id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  storage_path: string
  signed_url?: string | null
  created_at: string
}

export interface ObjectionItem {
  id: string
  parcel_id: string
  parcel_number?: string | null
  village_name?: string | null
  survey_number?: string | null
  owner_name?: string | null
  submitted_by: string
  submitted_by_email?: string | null
  objection_type: string
  description: string
  status: 'Submitted' | 'Under Review' | 'Resolved' | 'Rejected'
  submitted_at: string
  updated_at: string
  reviewed_at?: string | null
  resolved_at?: string | null
  reviewer_profile_id?: string | null
  reviewer_name?: string | null
  resolution_remarks?: string | null
  evidence?: ObjectionEvidence[]
}

interface ObjectionReviewPanelProps {
  userRole?: string | null
  currentProjectCode?: string | null
}

export default function ObjectionReviewPanel({
  userRole,
  currentProjectCode,
}: ObjectionReviewPanelProps) {
  const [objections, setObjections] = useState<ObjectionItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Resolution Modal State
  const [activeModal, setActiveModal] = useState<{
    objection: ObjectionItem
    targetStatus: 'Resolved' | 'Rejected'
  } | null>(null)
  const [remarksInput, setRemarksInput] = useState<string>('')
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)

  const isOfficer =
    userRole === 'Admin' ||
    userRole === 'SLAO' ||
    userRole === 'CALA' ||
    userRole === 'MoRTH Nodal Officer'

  const fetchObjections = useCallback(async () => {
    if (!isOfficer) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/objections')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch objections')
      }
      setObjections(Array.isArray(json.data) ? json.data : [])
    } catch (err: any) {
      console.error('[ObjectionReviewPanel] Fetch error:', err)
      setErrorMsg(err?.message || 'Unable to load objections list')
    } finally {
      setLoading(false)
    }
  }, [isOfficer])

  useEffect(() => {
    fetchObjections()
  }, [fetchObjections])

  if (!isOfficer) {
    return null
  }

  const handleMarkUnderReview = async (obj: ObjectionItem) => {
    setActionInProgressId(obj.id)
    try {
      const res = await fetch('/api/objections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: obj.id,
          status: 'Under Review',
          resolution_remarks: 'Under active official review.',
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update objection status')
      }
      await fetchObjections()
    } catch (err: any) {
      alert(err?.message || 'Error updating status')
    } finally {
      setActionInProgressId(null)
    }
  }

  const handleOpenResolveModal = (obj: ObjectionItem, status: 'Resolved' | 'Rejected') => {
    setActiveModal({ objection: obj, targetStatus: status })
    setRemarksInput('')
    setModalError(null)
  }

  const handleSubmitResolution = async () => {
    if (!activeModal) return
    const trimmed = remarksInput.trim()
    if (!trimmed) {
      setModalError('Resolution remarks are mandatory before concluding an objection.')
      return
    }

    setModalSubmitting(true)
    setModalError(null)

    try {
      const res = await fetch('/api/objections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeModal.objection.id,
          status: activeModal.targetStatus,
          resolution_remarks: trimmed,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to mark objection as ${activeModal.targetStatus}`)
      }
      setActiveModal(null)
      setRemarksInput('')
      await fetchObjections()
    } catch (err: any) {
      setModalError(err?.message || 'Failed to submit resolution.')
    } finally {
      setModalSubmitting(false)
    }
  }

  const filteredList = objections.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (item.parcel_number && item.parcel_number.toLowerCase().includes(q)) ||
      (item.village_name && item.village_name.toLowerCase().includes(q)) ||
      (item.owner_name && item.owner_name.toLowerCase().includes(q)) ||
      (item.submitted_by_email && item.submitted_by_email.toLowerCase().includes(q)) ||
      (item.objection_type && item.objection_type.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q))
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <Clock className="size-3" />
            Submitted
          </span>
        )
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <RefreshCw className="size-3 animate-spin text-amber-600" />
            Under Review
          </span>
        )
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="size-3 text-emerald-600" />
            Resolved
          </span>
        )
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800 border border-red-200">
            <XCircle className="size-3 text-red-600" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {status}
          </span>
        )
    }
  }

  const counts = {
    total: objections.length,
    submitted: objections.filter((o) => o.status === 'Submitted').length,
    underReview: objections.filter((o) => o.status === 'Under Review').length,
    resolved: objections.filter((o) => o.status === 'Resolved').length,
    rejected: objections.filter((o) => o.status === 'Rejected').length,
  }

  return (
    <section aria-label="Landowner Objections Review" className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-5 py-4 bg-muted/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base font-bold text-foreground">
              Landowner Objections &amp; Grievances
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
              Section 3C Hearing
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review formal landowner objections submitted under statutory acquisition windows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchObjections}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin text-primary')} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-border bg-muted/20 text-xs divide-y sm:divide-y-0 sm:divide-x divide-border">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={cn('p-3 text-left transition-colors', statusFilter === 'ALL' && 'bg-background font-bold text-primary')}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Total Cases</span>
          <span className="text-base font-bold text-foreground mt-0.5 block">{counts.total}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('Submitted')}
          className={cn('p-3 text-left transition-colors', statusFilter === 'Submitted' && 'bg-background font-bold text-blue-700')}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Submitted</span>
          <span className="text-base font-bold text-blue-700 mt-0.5 block">{counts.submitted}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('Under Review')}
          className={cn('p-3 text-left transition-colors', statusFilter === 'Under Review' && 'bg-background font-bold text-amber-700')}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Under Review</span>
          <span className="text-base font-bold text-amber-700 mt-0.5 block">{counts.underReview}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('Resolved')}
          className={cn('p-3 text-left transition-colors', statusFilter === 'Resolved' && 'bg-background font-bold text-emerald-700')}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Resolved</span>
          <span className="text-base font-bold text-emerald-700 mt-0.5 block">{counts.resolved}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('Rejected')}
          className={cn('p-3 text-left transition-colors', statusFilter === 'Rejected' && 'bg-background font-bold text-red-700')}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Rejected</span>
          <span className="text-base font-bold text-red-700 mt-0.5 block">{counts.rejected}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border bg-background">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parcel, owner, type or number..."
            className="w-full rounded-md border border-input bg-card pl-9 pr-8 py-1.5 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="size-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <option value="ALL">All Statuses ({counts.total})</option>
            <option value="Submitted">Submitted ({counts.submitted})</option>
            <option value="Under Review">Under Review ({counts.underReview})</option>
            <option value="Resolved">Resolved ({counts.resolved})</option>
            <option value="Rejected">Rejected ({counts.rejected})</option>
          </select>
        </div>
      </div>

      {/* Table & Body */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          <RefreshCw className="size-5 animate-spin text-primary mx-auto mb-2" />
          <span>Loading objections records...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-6 text-center text-xs text-red-600 space-y-1">
          <p className="font-semibold">Failed to load objections</p>
          <p>{errorMsg}</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">No objections match current filter</p>
          <p>
            {statusFilter !== 'ALL' || searchQuery
              ? 'Try resetting the search query or status filter.'
              : 'No landowner objections have been submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Objection No &amp; Parcel</th>
                <th scope="col" className="px-4 py-3">Landowner</th>
                <th scope="col" className="px-4 py-3">Category &amp; Statement</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Submitted</th>
                <th scope="col" className="px-4 py-3">Evidence</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredList.map((obj, idx) => {
                const isActioning = actionInProgressId === obj.id
                const objNo = `OBJ-${new Date(obj.submitted_at || Date.now()).getFullYear()}-${String(idx + 1).padStart(4, '0')}`

                return (
                  <tr key={obj.id} className="hover:bg-accent/30 transition-colors">
                    {/* Objection No & Parcel */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <div className="font-mono font-bold text-foreground text-xs">{objNo}</div>
                      <div className="font-mono text-[11px] text-primary mt-0.5">
                        {obj.parcel_number || obj.parcel_id.slice(0, 8)}
                      </div>
                      {(obj.village_name || obj.survey_number) && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {obj.village_name}{obj.survey_number ? ` (Surv: ${obj.survey_number})` : ''}
                        </div>
                      )}
                    </td>

                    {/* Landowner */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-foreground">
                        {obj.owner_name || 'Landowner'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                        {obj.submitted_by_email || obj.submitted_by.slice(0, 8)}
                      </div>
                    </td>

                    {/* Category & Description */}
                    <td className="px-4 py-3 align-top max-w-xs">
                      <span className="inline-block rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground mb-1">
                        {obj.objection_type}
                      </span>
                      <p className="text-muted-foreground text-[11px] line-clamp-3 leading-relaxed">
                        {obj.description}
                      </p>
                      {obj.resolution_remarks && (
                        <div className="mt-2 rounded bg-muted/40 p-2 border border-border/60 text-[10px]">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <MessageSquare className="size-3 text-primary" />
                            Official Remarks ({obj.reviewer_name || 'Officer'}):
                          </span>
                          <p className="text-muted-foreground mt-0.5 italic">{obj.resolution_remarks}</p>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {getStatusBadge(obj.status)}
                    </td>

                    {/* Submitted Date */}
                    <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                      {new Date(obj.submitted_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Evidence */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {obj.evidence && obj.evidence.length > 0 ? (
                        <div className="space-y-1">
                          {obj.evidence.map((ev) => (
                            <div key={ev.id} className="flex items-center gap-1 text-[11px]">
                              {ev.signed_url ? (
                                <a
                                  href={ev.signed_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                >
                                  <Paperclip className="size-3" />
                                  <span className="truncate max-w-[100px]">{ev.file_name}</span>
                                  <ExternalLink className="size-2.5" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Paperclip className="size-3" />
                                  <span className="truncate max-w-[100px]">{ev.file_name}</span>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px] italic">None attached</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {obj.status === 'Submitted' && (
                          <button
                            type="button"
                            disabled={isActioning}
                            onClick={() => handleMarkUnderReview(obj)}
                            className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-800 border border-amber-300 hover:bg-amber-500/20 px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50"
                          >
                            <Clock className="size-3" />
                            Mark Under Review
                          </button>
                        )}

                        {(obj.status === 'Submitted' || obj.status === 'Under Review') && (
                          <>
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleOpenResolveModal(obj, 'Resolved')}
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50"
                            >
                              <Check className="size-3" />
                              Resolve
                            </button>
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleOpenResolveModal(obj, 'Rejected')}
                              className="inline-flex items-center gap-1 rounded bg-red-600 text-white hover:bg-red-700 px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50"
                            >
                              <X className="size-3" />
                              Reject
                            </button>
                          </>
                        )}

                        {(obj.status === 'Resolved' || obj.status === 'Rejected') && (
                          <span className="text-[10px] text-muted-foreground italic">
                            Concluded
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolution / Rejection Modal */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  {activeModal.targetStatus === 'Resolved' ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-red-600" />
                  )}
                  {activeModal.targetStatus === 'Resolved'
                    ? 'Resolve Landowner Objection'
                    : 'Reject Landowner Objection'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Parcel: {activeModal.objection.parcel_number || activeModal.objection.parcel_id} &middot; Type: {activeModal.objection.objection_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-md bg-muted/30 p-3 text-xs space-y-1 border border-border/50">
              <span className="font-semibold text-foreground">Objection Statement:</span>
              <p className="text-muted-foreground italic">&ldquo;{activeModal.objection.description}&rdquo;</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="modal-remarks" className="text-xs font-semibold text-foreground">
                Mandatory Resolution Remarks / Statutory Decision:
              </label>
              <textarea
                id="modal-remarks"
                rows={4}
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
                placeholder="Enter detailed statutory finding, award reference, or grounds for decision..."
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                These remarks are recorded in the official audit trail and will be visible to the landowner.
              </p>
            </div>

            {modalError && (
              <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-800 border border-red-200">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={modalSubmitting}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResolution}
                disabled={modalSubmitting || !remarksInput.trim()}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors disabled:opacity-50',
                  activeModal.targetStatus === 'Resolved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {modalSubmitting ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : activeModal.targetStatus === 'Resolved' ? (
                  <Check className="size-3.5" />
                ) : (
                  <X className="size-3.5" />
                )}
                Confirm {activeModal.targetStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
