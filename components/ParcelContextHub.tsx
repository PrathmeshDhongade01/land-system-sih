'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LandPlot,
  UserCheck,
  FileText,
  ShieldCheck,
  Paperclip,
  CreditCard,
  X,
  ExternalLink,
  Building2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ParcelContextHubProps {
  parcelId: string | null
  isOpen: boolean
  onClose: () => void
  userRole?: string | null
}

interface ParcelDetail {
  id: string
  project_id?: string | null
  project_code: string | null
  parcel_number: string | null
  owner_name: string
  village_name: string
  survey_number: string | null
  khasra_no?: string | null
  notified_area_sqm: number | null
  affected_area_sqm: number | null
  possession_status: string | null
  land_type: string | null
  field_verification_status: string | null
  field_verified_at: string | null
  field_verified_by: string | null
  field_remarks: string | null
  compensation_assessed?: number | null
  compensation_approved?: number | null
  compensation_paid?: number | null
  payment_status?: string | null
  rehabilitation_status?: string | null
}

interface EvidenceItem {
  id: string
  parcel_id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  description: string | null
  created_at: string
  signed_url: string | null
}

interface ActiveAssignment {
  id: string
  parcel_id: string
  assigned_officer_id: string
  assigned_officer_name?: string
  assigned_officer_email?: string
  assigned_at: string
  status: string
  remarks?: string | null
}

interface LinkedWorkflow {
  id: string
  project_code: string
  workflow_type?: string
  stage_name?: string
  status: string
  assigned_to?: string
  created_at?: string
  readiness?: {
    status: 'READY' | 'ATTENTION' | 'BLOCKED'
    reasons: string[]
  } | null
}

export function ParcelContextHub({
  parcelId,
  isOpen,
  onClose,
}: ParcelContextHubProps) {
  const router = useRouter()

  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [parcel, setParcel] = useState<ParcelDetail | null>(null)
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([])
  const [activeAssignment, setActiveAssignment] = useState<ActiveAssignment | null>(null)
  const [workflowsList, setWorkflowsList] = useState<LinkedWorkflow[]>([])

  const fetchHubData = useCallback(async (id: string) => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const [parcelRes, evidenceRes, assignRes, wfRes] = await Promise.all([
        fetch(`/api/parcels?id=${encodeURIComponent(id)}`),
        fetch(`/api/evidence?parcel_id=${encodeURIComponent(id)}`),
        fetch(`/api/assignments?parcel_id=${encodeURIComponent(id)}`),
        fetch('/api/workflows')
      ])

      const [parcelJson, evidenceJson, assignJson, wfJson] = await Promise.all([
        parcelRes.json(),
        evidenceRes.json(),
        assignRes.json(),
        wfRes.json()
      ])

      let fetchedParcel: ParcelDetail | null = null
      if (parcelRes.ok && parcelJson.success && Array.isArray(parcelJson.data)) {
        fetchedParcel = parcelJson.data[0] || null
      }
      setParcel(fetchedParcel)

      if (evidenceRes.ok && evidenceJson.success) {
        setEvidenceList(evidenceJson.data || [])
      } else {
        setEvidenceList([])
      }

      if (assignRes.ok && assignJson.success && Array.isArray(assignJson.data)) {
        const active = assignJson.data.find((a: any) => a.status === 'Active') || null
        setActiveAssignment(active)
      } else {
        setActiveAssignment(null)
      }

      if (wfRes.ok && wfJson.success && Array.isArray(wfJson.data)) {
        const linked = wfJson.data.filter((w: any) => w.land_parcel_id === id)
        setWorkflowsList(linked)
      } else {
        setWorkflowsList([])
      }
    } catch (err: any) {
      console.error('Error fetching Parcel Context Hub data:', err)
      setErrorMsg(err?.message || 'Failed to load 360° parcel details.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && parcelId) {
      fetchHubData(parcelId)
    } else {
      setParcel(null)
      setEvidenceList([])
      setActiveAssignment(null)
      setWorkflowsList([])
    }
  }, [isOpen, parcelId, fetchHubData])

  if (!isOpen) return null

  // Navigation Helpers
  const handleNavFieldVerification = () => {
    onClose()
    if (parcelId) {
      router.push(`/field-verification?parcel_id=${encodeURIComponent(parcelId)}`)
    } else {
      router.push('/field-verification')
    }
  }

  const handleNavAssignments = () => {
    onClose()
    router.push('/assignments')
  }

  const handleNavWorkflows = () => {
    onClose()
    router.push('/workflows')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl h-full sm:h-[94vh] overflow-hidden rounded-none sm:rounded-xl border border-border bg-card shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tricolor top rule */}
        <div className="flex h-1.5 w-full shrink-0">
          <div className="flex-1 bg-saffron" />
          <div className="flex-1 bg-card" />
          <div className="flex-1 bg-green-india" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <LandPlot className="size-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-foreground truncate">
                  360° Parcel Context Hub
                </span>
                {parcel?.parcel_number && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {parcel.parcel_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {parcel ? `Project: ${parcel.project_code || 'N/A'} · Owner: ${parcel.owner_name} (${parcel.village_name})` : 'Land Acquisition Parcel Profile'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Parcel Context Hub"
            className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading 360° Parcel Profile &amp; Module Context...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg flex items-center gap-2">
              <AlertCircle className="size-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : parcel ? (
            <>
              {/* SECTION 1: PARCEL IDENTITY */}
              <section className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                    <Building2 className="size-4 text-primary" />
                    <span>Parcel Identity &amp; Spatial Specifications</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    UUID: {parcel.id.substring(0, 8)}...
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Parcel Number</span>
                    <span className="font-mono font-bold text-foreground">{parcel.parcel_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Target Project</span>
                    <span className="font-mono font-semibold text-foreground">{parcel.project_code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Owner Name</span>
                    <span className="font-medium text-foreground">{parcel.owner_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Village Name</span>
                    <span className="font-medium text-foreground">{parcel.village_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Survey / Khasra No.</span>
                    <span className="font-medium text-foreground">{parcel.survey_number || parcel.khasra_no || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Land Type</span>
                    <span className="font-medium text-foreground">{parcel.land_type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Notified Area</span>
                    <span className="font-medium text-foreground">
                      {parcel.notified_area_sqm
                        ? `${parcel.notified_area_sqm.toLocaleString('en-IN')} m² (${(parcel.notified_area_sqm / 10000).toFixed(2)} Ha)`
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Affected Area</span>
                    <span className="font-medium text-foreground">
                      {parcel.affected_area_sqm
                        ? `${parcel.affected_area_sqm.toLocaleString('en-IN')} m² (${(parcel.affected_area_sqm / 10000).toFixed(2)} Ha)`
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Possession Status</span>
                    <span className="font-semibold text-foreground">{parcel.possession_status || 'Pending'}</span>
                  </div>
                </div>
              </section>

              {/* SECTION 2: FIELD VERIFICATION */}
              <section className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                    <LandPlot className="size-4 text-primary" />
                    <span>Field Verification Status</span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border',
                      parcel.field_verification_status === 'Verified' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                      parcel.field_verification_status === 'Needs Review' && 'bg-amber-50 text-amber-700 border-amber-300',
                      parcel.field_verification_status === 'Pending' && 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {parcel.field_verification_status || 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Verifying Officer</span>
                    <span className="font-medium text-foreground">{parcel.field_verified_by || 'Not Verified Yet'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Verified Timestamp</span>
                    <span className="font-medium text-foreground">
                      {parcel.field_verified_at
                        ? new Date(parcel.field_verified_at).toLocaleString('en-IN')
                        : 'N/A'}
                    </span>
                  </div>
                  {parcel.field_remarks && (
                    <div className="sm:col-span-2 rounded bg-muted/30 p-2 border border-border">
                      <span className="font-semibold text-[10px] uppercase text-muted-foreground block mb-0.5">
                        Officer Remarks:
                      </span>
                      <p className="text-foreground font-sans">{parcel.field_remarks}</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNavFieldVerification}
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <span>Open Field Verification</span>
                    <ExternalLink className="size-3.5" />
                  </button>
                </div>
              </section>

              {/* SECTION 3: FIELD EVIDENCE */}
              <section className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                    <Paperclip className="size-4 text-primary" />
                    <span>Field Evidence Files ({evidenceList.length})</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Private Supabase Storage
                  </span>
                </div>

                {evidenceList.length > 0 ? (
                  <div className="space-y-2">
                    {evidenceList.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-foreground truncate">{ev.file_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {(ev.file_size_bytes / 1024).toFixed(1)} KB · {new Date(ev.created_at).toLocaleDateString('en-IN')}
                            {ev.description && ` · ${ev.description}`}
                          </p>
                        </div>
                        {ev.signed_url && (
                          <a
                            href={ev.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-background border border-border text-[11px] font-medium text-foreground hover:bg-accent shrink-0"
                          >
                            <span>View</span>
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No field evidence files uploaded for this land parcel.
                  </p>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNavFieldVerification}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    <span>View Evidence / Field Verification</span>
                    <ExternalLink className="size-3.5" />
                  </button>
                </div>
              </section>

              {/* SECTION 4: PARCEL ASSIGNMENTS */}
              <section className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                    <UserCheck className="size-4 text-primary" />
                    <span>Active Field Officer Assignment</span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border',
                      activeAssignment ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {activeAssignment ? 'Active' : 'Unassigned'}
                  </span>
                </div>

                {activeAssignment ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Assigned Officer</span>
                      <span className="font-semibold text-foreground">
                        {activeAssignment.assigned_officer_name || 'Field Officer'} ({activeAssignment.assigned_officer_email || 'N/A'})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Assignment Date</span>
                      <span className="font-medium text-foreground">
                        {new Date(activeAssignment.assigned_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    {activeAssignment.remarks && (
                      <div className="sm:col-span-2 rounded bg-muted/30 p-2 border border-border">
                        <span className="font-semibold text-[10px] uppercase text-muted-foreground block mb-0.5">
                          Assignment Remarks:
                        </span>
                        <p className="text-foreground font-sans">{activeAssignment.remarks}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No active field officer currently assigned to this parcel.
                  </p>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNavAssignments}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    <span>Open Assignments</span>
                    <ExternalLink className="size-3.5" />
                  </button>
                </div>
              </section>

              {/* SECTION 5: STATUTORY WORKFLOWS & READINESS */}
              <section className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                    <FileText className="size-4 text-primary" />
                    <span>Statutory Workflows &amp; Readiness</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    RFCTLARR Act, 2013
                  </span>
                </div>

                {workflowsList.length > 0 ? (
                  <div className="space-y-3">
                    {workflowsList.map((wf) => (
                      <div
                        key={wf.id}
                        className="p-3 rounded-md border border-border bg-muted/20 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {wf.workflow_type || wf.stage_name}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[11px] font-bold border',
                              (wf.status || '').toLowerCase().includes('approved') && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                              (wf.status || '').toLowerCase().includes('pending') && 'bg-amber-50 text-amber-700 border-amber-300',
                              (wf.status || '').toLowerCase().includes('reject') && 'bg-red-50 text-red-700 border-red-300'
                            )}
                          >
                            {wf.status}
                          </span>
                        </div>

                        {/* Readiness Status Badge */}
                        {wf.readiness && (
                          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                            <span className="text-muted-foreground">Server Readiness:</span>
                            <span
                              className={cn(
                                'font-bold px-2 py-0.5 rounded text-[10px] ring-1 ring-inset',
                                wf.readiness.status === 'READY' && 'bg-emerald-100 text-emerald-800 ring-emerald-600/30',
                                wf.readiness.status === 'ATTENTION' && 'bg-amber-100 text-amber-800 ring-amber-600/30',
                                wf.readiness.status === 'BLOCKED' && 'bg-red-100 text-red-800 ring-red-600/30'
                              )}
                            >
                              {wf.readiness.status === 'READY' && '🟢 READY'}
                              {wf.readiness.status === 'ATTENTION' && '🟡 ATTENTION'}
                              {wf.readiness.status === 'BLOCKED' && '🔴 BLOCKED'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No statutory workflow stages currently initiated specifically for this land parcel.
                  </p>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNavWorkflows}
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <span>Open Workflows</span>
                    <ExternalLink className="size-3.5" />
                  </button>
                </div>
              </section>

              {/* SECTION 6: COMPENSATION & FINANCIALS */}
              <section className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                    <CreditCard className="size-4 text-emerald-600" />
                    <span>Compensation &amp; R&amp;R Financial Status</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-emerald-700">
                    PFMS Integration Status
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Assessed Compensation</span>
                    <span className="font-semibold text-foreground font-mono">
                      {parcel.compensation_assessed !== undefined && parcel.compensation_assessed !== null ? `₹${parcel.compensation_assessed.toLocaleString('en-IN')}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Approved Compensation</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {parcel.compensation_approved !== undefined && parcel.compensation_approved !== null ? `₹${parcel.compensation_approved.toLocaleString('en-IN')}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Paid Amount</span>
                    <span className="font-semibold text-foreground font-mono">
                      {parcel.compensation_paid !== undefined && parcel.compensation_paid !== null ? `₹${parcel.compensation_paid.toLocaleString('en-IN')}` : '₹0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Payment Status</span>
                    <span className="font-semibold text-foreground">{parcel.payment_status || 'Not assessed'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Rehabilitation Status</span>
                    <span className="font-semibold text-foreground">{parcel.rehabilitation_status || 'Not started'}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNavWorkflows}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <span>View Workflows &amp; PFMS Payout</span>
                    <ExternalLink className="size-3.5 text-emerald-600" />
                  </button>
                </div>
              </section>
            </>
          ) : null}
        </div>

        {/* Drawer Footer Actions */}
        <div className="border-t border-border bg-muted/30 p-4 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            NLAMS 360° Parcel Context Hub · Government of India
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleNavFieldVerification}
              className="inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              <span>Field Verification</span>
            </button>
            <button
              type="button"
              onClick={handleNavAssignments}
              className="inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              <span>Assignments</span>
            </button>
            <button
              type="button"
              onClick={handleNavWorkflows}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <span>Workflows</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParcelContextHub
