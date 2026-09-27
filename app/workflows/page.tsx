'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, type Project, type LandParcel } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Building2,
  CreditCard,
  X,
  CheckCircle,
  Plus,
  XCircle,
  Layers,
  ChevronRight,
  User,
  Calendar,
  LogOut,
  LandPlot,
  Paperclip,
  UserCheck,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ParcelContextHub from '@/components/ParcelContextHub'

interface EnrichedParcelContext {
  id: string
  parcel_number: string
  project_code: string
  owner_name: string
  village_name: string
  survey_number: string
  khasra_no?: string
  notified_area_sqm: number | null
  affected_area_sqm: number | null
  possession_status: string
  land_type: string
  field_verification_status: string
  field_verified_at: string | null
  field_verified_by: string | null
  field_remarks: string | null
}

interface EnrichedActiveAssignment {
  id: string
  assigned_officer_id: string
  assigned_officer_name: string
  assigned_officer_email: string
  assigned_at: string
  status: string
  remarks: string | null
}

interface WorkflowReadiness {
  status: 'READY' | 'ATTENTION' | 'BLOCKED'
  reasons: string[]
  checks: {
    field_verification: {
      status: string
      applicable: boolean
      passed: boolean
    }
    evidence: {
      count: number
      applicable: boolean
      passed: boolean
    }
    assignment: {
      status: string
      applicable: boolean
      passed: boolean
    }
  }
}

interface WorkflowRecord {
  id?: string
  project_code?: string
  land_parcel_id?: string | null
  workflow_type?: string
  stage_name?: string
  status?: string
  assigned_to?: string
  submitted_by?: string
  approved_by?: string
  remarks?: string
  created_at?: string
  updated_at?: string
  approved_at?: string | null
  parcel?: EnrichedParcelContext | null
  evidence_count?: number
  active_assignment?: EnrichedActiveAssignment | null
  readiness?: WorkflowReadiness | null
}

const ALLOWED_WORKFLOW_TYPES = [
  'Section 3A - Intent to Acquire',
  'Section 3C - Hearing of Objections',
  'Section 3D - Declaration of Acquisition',
  'Section 11 - Gazette Notification',
  'Section 19 - Declaration of Acquisition',
  'Section 23 - Award Determination',
  'Section 3G - Compensation Disbursement',
  'Section 3H - Rehabilitation & Resettlement',
]

const CANONICAL_TIMELINE_STAGES = [
  { key: 'Section 3A', name: 'Section 3A - Intent to Acquire', subtitle: 'Intent to Acquire' },
  { key: 'Section 3C', name: 'Section 3C - Hearing of Objections', subtitle: 'Hearing of Objections' },
  { key: 'Section 3D', name: 'Section 3D - Declaration of Acquisition', subtitle: 'Declaration of Acquisition' },
  { key: 'Section 11', name: 'Section 11 - Gazette Notification', subtitle: 'Gazette Notification' },
  { key: 'Section 19', name: 'Section 19 - Declaration of Acquisition', subtitle: 'Declaration of Acquisition' },
  { key: 'Section 23', name: 'Section 23 - Award Determination', subtitle: 'Award Determination' },
  { key: 'Section 3G', name: 'Section 3G - Compensation Disbursement', subtitle: 'Compensation Disbursement' },
  { key: 'Section 3H', name: 'Section 3H - Rehabilitation & Resettlement', subtitle: 'Rehabilitation & Resettlement' },
]

const DEMO_OFFICER_ROLES = [
  'Special Land Acquisition Officer (SLAO)',
  'MoRTH Nodal Officer',
  'Competent Authority (CALA)',
  'District Land Acquisition Officer',
  'Rehabilitation Officer N. K. Saxena',
  'Revenue Inspector V. D. Kulkarni',
]

const DEMO_AUTHORITIES = [
  'Competent Authority A. Sharma, IAS',
  'District Collector & CALA Desk',
  'Project Director, MoRTH',
  'Ministry Nodal Desk',
]

export default function WorkflowsPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const browserClient = createBrowserClient()
    browserClient.auth.getUser().then(({ data }: { data: any }) => {
      if (data?.user) {
        setUserEmail(data.user.email ?? null)
        browserClient
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()
          .then(({ data: prof }: { data: any }) => {
            if (prof?.role) {
              setUserRole(prof.role)
            }
          })
      }
    })
  }, [])

  const handleSignOut = async () => {
    const browserClient = createBrowserClient()
    await browserClient.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Options State (Projects & Land Parcels for Initiate Form & Timeline)
  const [dbProjects, setDbProjects] = useState<Project[]>([])
  const [dbParcels, setDbParcels] = useState<LandParcel[]>([])

  // Project Timeline State
  const [timelineProjectCode, setTimelineProjectCode] = useState<string>('')
  const [timelineWorkflows, setTimelineWorkflows] = useState<WorkflowRecord[]>([])
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)

  // Modal State for PFMS Payout Simulation
  const [pfmsModalRow, setPfmsModalRow] = useState<WorkflowRecord | null>(null)
  const [pfmsStatus, setPfmsStatus] = useState<'idle' | 'processing' | 'success'>('idle')

  // Modal State for Initiate Workflow Form
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState<boolean>(false)
  const [initiateProjectCode, setInitiateProjectCode] = useState<string>('')
  const [initiateWorkflowType, setInitiateWorkflowType] = useState<string>(ALLOWED_WORKFLOW_TYPES[0])
  const [initiateLandParcelId, setInitiateLandParcelId] = useState<string>('')
  const [initiateAssignedTo, setInitiateAssignedTo] = useState<string>(DEMO_OFFICER_ROLES[0])
  const [initiateRemarks, setInitiateRemarks] = useState<string>('')
  const [initiateSubmitting, setInitiateSubmitting] = useState<boolean>(false)
  const [initiateError, setInitiateError] = useState<string | null>(null)

  // Modal State for Review & Action (Approve / Reject)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false)
  const [selectedReviewRow, setSelectedReviewRow] = useState<WorkflowRecord | null>(null)
  const [reviewApprovedBy, setReviewApprovedBy] = useState<string>(DEMO_AUTHORITIES[0])
  const [reviewRemarks, setReviewRemarks] = useState<string>('')
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [showAttentionConfirm, setShowAttentionConfirm] = useState<boolean>(false)
  const [hubParcelId, setHubParcelId] = useState<string | null>(null)
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false)

  // Fetch Timeline Workflows via GET /api/workflows?project_code=...
  const fetchTimelineWorkflows = useCallback(async (projectCode: string) => {
    if (!projectCode) return
    setTimelineLoading(true)
    setTimelineError(null)
    try {
      const res = await fetch(`/api/workflows?project_code=${encodeURIComponent(projectCode)}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        setTimelineError(json.error || 'Unable to load statutory timeline.')
        setTimelineWorkflows([])
      } else {
        setTimelineWorkflows(json.data || [])
      }
    } catch (err: any) {
      console.error('Timeline fetch error:', err)
      setTimelineError(err?.message || 'Unable to load statutory timeline.')
      setTimelineWorkflows([])
    } finally {
      setTimelineLoading(false)
    }
  }, [])

  // Fetch Workflows via GET /api/workflows
  const fetchWorkflows = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/workflows')
      const json = await res.json()

      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Unable to load statutory workflows from API.')
      } else {
        setWorkflows(json.data || [])
      }
    } catch (err: any) {
      console.error('Workflow API fetch error:', err)
      setErrorMsg(err?.message || 'Failed to connect to statutory workflow API.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch Projects & Parcels for Dropdowns
  const fetchFormOptions = useCallback(async () => {
    try {
      const browserClient = createBrowserClient()
      const [projRes, parcelRes] = await Promise.all([
        browserClient.from('projects').select('id, project_code, project_name, state, district'),
        browserClient.from('land_parcels').select('id, project_id, project_code, parcel_number, owner_name, village_name, survey_number'),
      ])

      if (projRes.data && projRes.data.length > 0) {
        setDbProjects(projRes.data)
        const defaultCode = projRes.data[0].project_code
        if (!initiateProjectCode) setInitiateProjectCode(defaultCode)
        if (!timelineProjectCode) {
          setTimelineProjectCode(defaultCode)
          fetchTimelineWorkflows(defaultCode)
        }
      }

      if (parcelRes.data) {
        setDbParcels(parcelRes.data)
      }
    } catch (err) {
      console.error('Error fetching form options:', err)
    }
  }, [initiateProjectCode, timelineProjectCode, fetchTimelineWorkflows])

  useEffect(() => {
    fetchWorkflows()
    fetchFormOptions()
  }, [fetchWorkflows, fetchFormOptions])

  // Handle Timeline Project Selection Change
  function handleTimelineProjectChange(projectCode: string) {
    setTimelineProjectCode(projectCode)
    fetchTimelineWorkflows(projectCode)
  }

  // Filter workflows by search query and status filter
  const filteredWorkflows = workflows.filter((w) => {
    const project = (w.project_code || '').toLowerCase()
    const type = (w.workflow_type || w.stage_name || '').toLowerCase()
    const assigned = (w.assigned_to || w.submitted_by || '').toLowerCase()
    const q = searchQuery.toLowerCase().trim()

    const matchesSearch = !q || project.includes(q) || type.includes(q) || assigned.includes(q)
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Pending' && (w.status || '').toLowerCase().includes('pending')) ||
      (statusFilter === 'Approved' && (w.status || '').toLowerCase().includes('approved') && !(w.status || '').toLowerCase().includes('pending')) ||
      (statusFilter === 'Rejected' && (w.status || '').toLowerCase().includes('reject'))

    return matchesSearch && matchesStatus
  })

  // Handle Form Submission for POST /api/workflows
  async function handleInitiateSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInitiateSubmitting(true)
    setInitiateError(null)

    try {
      const payload = {
        project_code: initiateProjectCode,
        workflow_type: initiateWorkflowType,
        land_parcel_id: initiateLandParcelId || undefined,
        assigned_to: initiateAssignedTo,
        remarks: initiateRemarks,
      }

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setInitiateError(json.error || 'Failed to initiate statutory workflow.')
        return
      }

      // Success
      setIsInitiateModalOpen(false)
      setInitiateRemarks('')
      setInitiateLandParcelId('')
      setSuccessToast(`New workflow stage "${initiateWorkflowType}" initiated successfully.`)
      setTimeout(() => setSuccessToast(null), 4000)

      await fetchWorkflows()
      if (timelineProjectCode === initiateProjectCode) {
        await fetchTimelineWorkflows(timelineProjectCode)
      }
    } catch (err: any) {
      console.error('Initiate workflow error:', err)
      setInitiateError(err?.message || 'Network error initiating workflow.')
    } finally {
      setInitiateSubmitting(false)
    }
  }

  // Handle Workflow Action (Approve / Reject) via PATCH /api/workflows
  async function handleWorkflowAction(actionStatus: 'Approved' | 'Rejected') {
    if (!selectedReviewRow || !selectedReviewRow.id) return

    if (actionStatus === 'Rejected' && !reviewRemarks.trim()) {
      setReviewError('Rejection remarks are required when rejecting a statutory workflow.')
      return
    }

    setReviewSubmitting(true)
    setReviewError(null)

    try {
      const payload = {
        id: selectedReviewRow.id,
        status: actionStatus,
        approved_by: reviewApprovedBy,
        remarks: reviewRemarks,
      }

      const res = await fetch('/api/workflows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setReviewError(json.error || `Failed to set workflow status to ${actionStatus}.`)
        return
      }

      // Success
      setIsReviewModalOpen(false)
      setSelectedReviewRow(null)
      setSuccessToast(`Workflow stage ${actionStatus === 'Approved' ? 'approved' : 'rejected'} successfully.`)
      setTimeout(() => setSuccessToast(null), 4000)

      await fetchWorkflows()
      if (timelineProjectCode === selectedReviewRow.project_code) {
        await fetchTimelineWorkflows(timelineProjectCode)
      }
    } catch (err: any) {
      console.error('Review workflow action error:', err)
      setReviewError(err?.message || 'Network error updating workflow status.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  // Official Section 11 Notification Document Printer/PDF Generator
  function generateSection11PDF(row: WorkflowRecord) {
    const projectCode = row.project_code || 'NHAI-DEL-BOM-01'
    const stage = row.workflow_type || row.stage_name || 'Section 11 Gazette Notification'
    const remarks = row.remarks || 'GIS Spatial Overlap Analysis Verified'
    const dateStr = row.created_at
      ? new Date(row.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Section 11 Gazette Notification - ${projectCode}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; color: #000; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px; }
          .emblem { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
          .subhead { font-size: 14px; text-transform: uppercase; margin-top: 5px; }
          .title { font-size: 18px; font-weight: bold; margin-top: 25px; text-decoration: underline; text-align: center; }
          .content { margin-top: 30px; font-size: 14px; text-align: justify; }
          .meta-table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 13px; }
          .meta-table th, .meta-table td { border: 1px solid #333; padding: 10px; text-align: left; }
          .meta-table th { background-color: #f2f2f2; }
          .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
          .signature { text-align: center; width: 250px; border-top: 1px solid #000; padding-top: 5px; font-size: 13px; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
        </div>

        <div class="header">
          <div class="emblem">Government of India</div>
          <div class="subhead">Ministry of Road Transport & Highways (MoRTH)</div>
          <div class="subhead">National Highways Authority of India (NHAI)</div>
        </div>

        <p style="text-align: right; font-size: 13px;"><strong>Gazette Notification Ref:</strong> NHAI/LA-ACT/2026/${projectCode}</p>
        <p style="text-align: right; font-size: 13px;"><strong>Date:</strong> ${dateStr}</p>

        <div class="title">NOTIFICATION UNDER SECTION 11(1) OF THE RFCTLARR ACT, 2013</div>

        <div class="content">
          <p>Whereas it appears to the Competent Authority that the land specified in the Schedule below is required for the public purpose of constructing and aligning the <strong>${projectCode} Expressway Corridor</strong> under the National Highways Act, 1956 and RFCTLARR Act, 2013.</p>

          <p>Notice is hereby given to all persons interested in the said land that the spatial intersection boundary has been surveyed using GIS satellite analytics and ground verification.</p>

          <table class="meta-table">
            <tr>
              <th>Project Code</th>
              <td>${projectCode}</td>
            </tr>
            <tr>
              <th>Statutory Stage</th>
              <td>${stage}</td>
            </tr>
            <tr>
              <th>Assigned Officer</th>
              <td>${row.assigned_to || row.submitted_by || 'Competent Authority, MoRTH'}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>${row.status || 'Section 11 Issued'}</td>
            </tr>
            <tr>
              <th>Spatial Overlap Survey Remarks</th>
              <td>${remarks}</td>
            </tr>
          </table>

          <p>Any objection to the acquisition of the said land may be filed in writing before the Competent Authority within 21 days from the publication of this notification.</p>
        </div>

        <div class="footer">
          <div>
            <p style="font-size: 11px; color: #555;">Official Seal & System Hash:<br/>SHA256:${Math.random().toString(36).substring(2, 15)}</p>
          </div>
          <div class="signature">
            <strong>(Competent Authority - Land Acquisition)</strong><br/>
            Ministry of Road Transport & Highways<br/>
            Government of India
          </div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  // Trigger PFMS Payment Disbursement Simulation
  function handleTriggerPFMS(row: WorkflowRecord) {
    setPfmsModalRow(row)
    setPfmsStatus('processing')
    setTimeout(() => {
      setPfmsStatus('success')
    }, 1800)
  }

  // Available Land Parcels for Selected Project Code in Initiate Modal
  const availableParcels = dbParcels.filter(
    (p) => p.project_code === initiateProjectCode || (dbProjects.find((dp) => dp.project_code === initiateProjectCode)?.id === p.project_id)
  )

  // --------------------------------------------------------------------------
  // Timeline Stage Mapping & Calculation Logic
  // --------------------------------------------------------------------------

  // Map canonical 8 stages against timelineWorkflows (ordered by created_at DESC)
  const timelineStagesMapped = CANONICAL_TIMELINE_STAGES.map((stg) => {
    const record = timelineWorkflows.find((w) => {
      const type = (w.workflow_type || w.stage_name || '').toLowerCase()
      return type.includes(stg.key.toLowerCase()) || type.includes(stg.subtitle.toLowerCase())
    })

    let status = 'Not Started'
    if (record && record.status) {
      const s = record.status.toLowerCase()
      if (s.includes('pending')) status = 'Pending Approval'
      else if (s.includes('approved')) status = 'Approved'
      else if (s.includes('reject')) status = 'Rejected'
    }

    return {
      ...stg,
      record,
      status,
    }
  })

  // Current Stage Logic: Latest workflow record by created_at DESC
  const currentStageName =
    timelineWorkflows.length > 0
      ? timelineWorkflows[0].workflow_type || timelineWorkflows[0].stage_name || 'Not Started'
      : 'Not Started'

  // Overall Progress Calculation: Approved statutory stages / 8 * 100
  const approvedStagesCount = timelineStagesMapped.filter((s) => s.status === 'Approved').length
  const statutoryProgressPercentage = Math.round((approvedStagesCount / 8) * 100)

  const selectedProjectObj = dbProjects.find((p) => p.project_code === timelineProjectCode)

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification Alert */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-emerald-600/30 bg-emerald-50 p-4 shadow-xl text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="size-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground tracking-tight">
              Statutory Workflows
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            RFCTLARR Act, 2013 · Statutory land acquisition workflow approvals, gazette PDF notifications &amp; PFMS payouts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {userEmail && (
            <div className="flex items-center gap-2 border-r border-border pr-3">
              <div className="leading-tight text-right">
                <span className="text-xs font-medium text-foreground block truncate max-w-[180px]" title={userEmail}>
                  {userEmail}
                </span>
                {userRole && (
                  <span className="text-[10px] font-semibold text-primary block">
                    {userRole}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="size-3.5" />
                Logout
              </button>
            </div>
          )}

          {(!userRole || ['Admin', 'SLAO', 'CALA', 'MoRTH Nodal Officer'].includes(userRole)) && (
            <button
              type="button"
              onClick={() => {
                setInitiateError(null)
                setIsInitiateModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              <Plus className="size-3.5" />
              <span>Initiate Workflow</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchWorkflows()
              if (timelineProjectCode) fetchTimelineWorkflows(timelineProjectCode)
            }}
            disabled={loading || timelineLoading}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn('size-3.5 text-primary', (loading || timelineLoading) && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-md bg-green-india/10 px-3 py-1.5 text-xs font-medium text-green-india">
            <ShieldCheck className="size-3.5" />
            Active Nodal Portal
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Workflows
            </p>
            <p className="mt-1 font-serif text-3xl font-semibold text-foreground">
              {workflows.length}
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pending Approval
            </p>
            <p className="mt-1 font-serif text-3xl font-semibold text-amber-600">
              {workflows.filter((w) => (w.status || '').toLowerCase().includes('pending')).length}
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
            <Clock className="size-5" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Approved
            </p>
            <p className="mt-1 font-serif text-3xl font-semibold text-emerald-600">
              {workflows.filter((w) => (w.status || '').toLowerCase().includes('approved') && !(w.status || '').toLowerCase().includes('pending')).length}
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="size-5" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rejected
            </p>
            <p className="mt-1 font-serif text-3xl font-semibold text-red-600">
              {workflows.filter((w) => (w.status || '').toLowerCase().includes('reject')).length}
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/15 text-red-600">
            <XCircle className="size-5" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PROJECT-LEVEL STATUTORY WORKFLOW TIMELINE SECTION                  */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-label="Project Statutory Lifecycle Timeline"
        className="rounded-lg border border-border bg-card shadow-sm overflow-hidden flex flex-col"
      >
        {/* Timeline Header & Project Selector */}
        <div className="flex flex-col gap-4 border-b border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              <h2 className="font-serif text-lg font-semibold text-foreground">
                Project Land Acquisition Lifecycle Timeline
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              RFCTLARR Act, 2013 · Statutory stage progression &amp; milestone status for selected corridor
            </p>
          </div>

          {/* Project Selector Dropdown & Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-80">
              <label htmlFor="timeline-project-select" className="sr-only">
                Select Project
              </label>
              <select
                id="timeline-project-select"
                value={timelineProjectCode}
                onChange={(e) => handleTimelineProjectChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
              >
                {dbProjects.length > 0 ? (
                  dbProjects.map((p) => (
                    <option key={p.project_code} value={p.project_code}>
                      {p.project_code} — {p.project_name}
                    </option>
                  ))
                ) : (
                  <option value="">No projects available</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Timeline Executive Metrics Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-5 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Current Stage:</span>
            <span className="font-semibold text-foreground rounded-md bg-muted px-2.5 py-1 font-mono">
              {currentStageName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Statutory Progress:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-600/30 px-2.5 py-1 rounded-md">
                {statutoryProgressPercentage}% ({approvedStagesCount}/8 Approved)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="hidden sm:block w-32 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                style={{ width: `${statutoryProgressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Timeline Body / Stepper */}
        <div className="p-6">
          {timelineLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
              <RefreshCw className="size-4 animate-spin text-primary" />
              <span>Loading statutory timeline...</span>
            </div>
          ) : timelineError ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{timelineError}</span>
            </div>
          ) : dbProjects.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No projects available.
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
              {timelineStagesMapped.map((stg, idx) => {
                const isApproved = stg.status === 'Approved'
                const isPending = stg.status === 'Pending Approval'
                const isRejected = stg.status === 'Rejected'
                const isNotStarted = stg.status === 'Not Started'
                const rec = stg.record

                return (
                  <div key={stg.key} className="relative flex items-start gap-4 text-xs">
                    {/* Stepper Node Icon */}
                    <div
                      className={cn(
                        'absolute -left-6 sm:-left-8 top-0 flex size-6 items-center justify-center rounded-full ring-4 ring-card text-white text-[11px] font-bold z-10 transition-colors',
                        isApproved
                          ? 'bg-emerald-600 text-white'
                          : isPending
                          ? 'bg-amber-500 text-white'
                          : isRejected
                          ? 'bg-red-600 text-white'
                          : 'bg-muted-foreground/30 text-muted-foreground',
                      )}
                    >
                      {isApproved && '✓'}
                      {isPending && '⏳'}
                      {isRejected && '✕'}
                      {isNotStarted && '○'}
                    </div>

                    {/* Stage Details Card */}
                    <div
                      className={cn(
                        'flex-1 rounded-lg border p-4 transition-colors shadow-2xs',
                        isApproved
                          ? 'border-emerald-600/30 bg-emerald-50/30'
                          : isPending
                          ? 'border-amber-600/30 bg-amber-50/30'
                          : isRejected
                          ? 'border-red-600/30 bg-red-50/30'
                          : 'border-border bg-card/50',
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground text-sm">
                              {stg.key}
                            </span>
                            <span className="font-medium text-foreground text-sm">
                              · {stg.subtitle}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            {stg.name}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/30'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 ring-amber-600/30'
                                : isRejected
                                ? 'bg-red-50 text-red-700 ring-red-600/30'
                                : 'bg-muted text-muted-foreground ring-border',
                            )}
                          >
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                isApproved
                                  ? 'bg-emerald-500'
                                  : isPending
                                  ? 'bg-amber-500'
                                  : isRejected
                                  ? 'bg-red-500'
                                  : 'bg-muted-foreground',
                              )}
                            />
                            {stg.status}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Information (Only for stages with actual DB records) */}
                      {rec ? (
                        <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <User className="size-3 text-primary shrink-0" />
                            <span>Assigned: <strong className="text-foreground font-medium">{rec.assigned_to || rec.submitted_by || 'N/A'}</strong></span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3 text-primary shrink-0" />
                            <span>Initiated: <strong className="text-foreground font-medium">{rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</strong></span>
                          </div>

                          {rec.approved_by && (
                            <div className="flex items-center gap-1.5 sm:col-span-2">
                              <ShieldCheck className="size-3 text-emerald-600 shrink-0" />
                              <span>Approving Authority: <strong className="text-emerald-800 font-medium">{rec.approved_by}</strong></span>
                            </div>
                          )}

                          {rec.approved_at && (
                            <div className="flex items-center gap-1.5 sm:col-span-2">
                              <CheckCircle className="size-3 text-emerald-600 shrink-0" />
                              <span>Approved Date: <strong className="text-emerald-800 font-medium">{new Date(rec.approved_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                            </div>
                          )}

                          {rec.remarks && (
                            <div className="sm:col-span-2 mt-1 rounded bg-background p-2 border border-border text-foreground font-sans">
                              <span className="font-semibold text-[10px] uppercase text-muted-foreground block mb-0.5">Official Remarks:</span>
                              {rec.remarks}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Stage not initiated in statutory workflow queue.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Data Table Container */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project code, workflow type..."
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>Workflow API Error: {errorMsg}</span>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-6 py-3.5 hidden md:table-cell">
                  Project
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Workflow Type
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 hidden sm:table-cell">
                  Assigned To / Submitted By
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions &amp; Integrations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-primary" />
                      <span>Loading statutory workflows via Next.js API...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredWorkflows.length > 0 ? (
                filteredWorkflows.map((row, idx) => {
                  const statusStr = row.status || 'Pending Approval'
                  const isPending = statusStr.toLowerCase().includes('pending')
                  const isApproved = statusStr.toLowerCase().includes('approved') && !isPending
                  const isRejected = statusStr.toLowerCase().includes('reject')

                  const typeStr = row.workflow_type || row.stage_name || 'Section 3A - Intent to Acquire'
                  const assignedStr = row.assigned_to || row.submitted_by || 'MoRTH Nodal Officer'
                  const projectStr = row.project_code || 'NHAI-DEL-BOM-01'

                  return (
                    <tr key={row.id || idx} className="transition-colors hover:bg-accent/50">
                      <td className="px-6 py-4 font-mono font-medium text-foreground hidden md:table-cell">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
                          {projectStr}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{typeStr}</div>
                        {row.remarks && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                            {row.remarks}
                          </div>
                        )}
                        {row.approved_by && isApproved && (
                          <div className="text-[11px] text-emerald-700 mt-0.5">
                            Approved by: {row.approved_by}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                            isPending
                              ? 'bg-amber-50 text-amber-700 ring-amber-600/30'
                              : isApproved
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/30'
                              : isRejected
                              ? 'bg-red-50 text-red-700 ring-red-600/30'
                              : 'bg-blue-50 text-blue-700 ring-blue-600/30',
                          )}
                        >
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              isPending
                                ? 'bg-amber-500'
                                : isApproved
                                ? 'bg-emerald-500'
                                : isRejected
                                ? 'bg-red-500'
                                : 'bg-blue-500',
                            )}
                          />
                          {statusStr}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                        {assignedStr}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Review & Approve/Reject Action Button */}
                          {isPending && (!userRole || ['Admin', 'SLAO', 'MoRTH Nodal Officer'].includes(userRole)) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReviewRow(row)
                                setReviewApprovedBy('Competent Authority A. Sharma, IAS')
                                setReviewRemarks(row.remarks || '')
                                setReviewError(null)
                                setIsReviewModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-600/30 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 shadow-2xs hover:bg-amber-100 transition-colors"
                              title="Review and Approve or Reject this Statutory Workflow"
                            >
                              <ShieldCheck className="size-3.5 text-amber-600" />
                              <span>Review</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => generateSection11PDF(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-accent transition-colors"
                            title="Generate Official Gazette Notification PDF"
                          >
                            <Download className="size-3.5 text-primary" />
                            <span>PDF Gazette</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTriggerPFMS(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-600/30 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 shadow-2xs hover:bg-emerald-100 transition-colors"
                            title="Trigger Simulated PFMS Financial Disbursement Alert"
                          >
                            <CreditCard className="size-3.5 text-emerald-600" />
                            <span>PFMS Payout</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No statutory workflow records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INITIATE WORKFLOW MODAL */}
      {isInitiateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setIsInitiateModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tricolor rule */}
            <div className="flex h-1.5 w-full">
              <div className="flex-1 bg-saffron" />
              <div className="flex-1 bg-card" />
              <div className="flex-1 bg-green-india" />
            </div>

            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Initiate Statutory Workflow Stage
                </h3>
                <p className="text-xs text-muted-foreground">
                  RFCTLARR Act, 2013 · Create a new statutory acquisition milestone
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInitiateModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleInitiateSubmit} className="p-6 space-y-4 text-xs">
              {initiateError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-md flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{initiateError}</span>
                </div>
              )}

              {/* Project Code */}
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Target Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={initiateProjectCode}
                  onChange={(e) => setInitiateProjectCode(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
                >
                  {dbProjects.map((p) => (
                    <option key={p.project_code} value={p.project_code}>
                      {p.project_code} — {p.project_name} ({p.district || p.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Statutory Stage */}
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Statutory Stage Milestone <span className="text-red-500">*</span>
                </label>
                <select
                  value={initiateWorkflowType}
                  onChange={(e) => setInitiateWorkflowType(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
                >
                  {ALLOWED_WORKFLOW_TYPES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              {/* Land Parcel (Optional) */}
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Specific Land Parcel (Optional)
                </label>
                <select
                  value={initiateLandParcelId}
                  onChange={(e) => setInitiateLandParcelId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
                >
                  <option value="">-- General Project Level Workflow --</option>
                  {availableParcels.map((lp) => (
                    <option key={lp.id} value={lp.id}>
                      {lp.parcel_number || 'Parcel'} · Owner: {lp.owner_name} ({lp.village_name}) · Survey: {lp.survey_number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Officer (Demo Role) */}
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Assigned Officer (Demo Role) <span className="text-red-500">*</span>
                </label>
                <select
                  value={initiateAssignedTo}
                  onChange={(e) => setInitiateAssignedTo(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
                >
                  {DEMO_OFFICER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  * Note: Officer roles are controlled demo assignments until authentication is enabled.
                </p>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Official Stage Remarks &amp; Notes
                </label>
                <textarea
                  value={initiateRemarks}
                  onChange={(e) => setInitiateRemarks(e.target.value)}
                  rows={3}
                  placeholder="Enter gazette details, survey references, or objection notes..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsInitiateModalOpen(false)}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={initiateSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {initiateSubmitting && <RefreshCw className="size-3.5 animate-spin" />}
                  <span>{initiateSubmitting ? 'Submitting...' : 'Initiate Stage'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW & APPROVE / REJECT MODAL */}
      {isReviewModalOpen && selectedReviewRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setIsReviewModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tricolor rule */}
            <div className="flex h-1.5 w-full">
              <div className="flex-1 bg-saffron" />
              <div className="flex-1 bg-card" />
              <div className="flex-1 bg-green-india" />
            </div>

            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Review Statutory Stage
                </h3>
                <p className="text-xs text-muted-foreground">
                  Workflow ID: {selectedReviewRow.id || 'N/A'} · Action Required
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {reviewError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-md flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              {/* Workflow Details Summary Box */}
              <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Code:</span>
                  <span className="font-mono font-semibold text-foreground">{selectedReviewRow.project_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statutory Stage:</span>
                  <span className="font-medium text-foreground">{selectedReviewRow.workflow_type || selectedReviewRow.stage_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Officer:</span>
                  <span className="font-medium text-foreground">{selectedReviewRow.assigned_to || selectedReviewRow.submitted_by}</span>
                </div>
                {selectedReviewRow.land_parcel_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcel UUID:</span>
                    <span className="font-mono text-[11px] text-foreground">{selectedReviewRow.land_parcel_id}</span>
                  </div>
                )}
                {selectedReviewRow.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted At:</span>
                    <span className="font-medium text-muted-foreground">{new Date(selectedReviewRow.created_at).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* WORKFLOW READINESS STATUS CARD */}
              {selectedReviewRow.readiness && (
                <div
                  className={cn(
                    'rounded-md border p-4 space-y-2.5 text-xs shadow-2xs',
                    selectedReviewRow.readiness.status === 'READY' && 'border-emerald-600/30 bg-emerald-50/40 text-emerald-950',
                    selectedReviewRow.readiness.status === 'ATTENTION' && 'border-amber-600/30 bg-amber-50/40 text-amber-950',
                    selectedReviewRow.readiness.status === 'BLOCKED' && 'border-red-600/30 bg-red-50/40 text-red-950'
                  )}
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>Workflow Readiness</span>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ring-inset',
                        selectedReviewRow.readiness.status === 'READY' && 'bg-emerald-100 text-emerald-800 ring-emerald-600/30',
                        selectedReviewRow.readiness.status === 'ATTENTION' && 'bg-amber-100 text-amber-800 ring-amber-600/30',
                        selectedReviewRow.readiness.status === 'BLOCKED' && 'bg-red-100 text-red-800 ring-red-600/30'
                      )}
                    >
                      {selectedReviewRow.readiness.status === 'READY' && '🟢 READY'}
                      {selectedReviewRow.readiness.status === 'ATTENTION' && '🟡 ATTENTION'}
                      {selectedReviewRow.readiness.status === 'BLOCKED' && '🔴 BLOCKED'}
                    </span>
                  </div>

                  {selectedReviewRow.readiness.reasons.map((reason, rIdx) => (
                    <p key={rIdx} className="text-[11px] text-muted-foreground">
                      • {reason}
                    </p>
                  ))}

                  {selectedReviewRow.land_parcel_id === null ? (
                    <p className="text-[11px] font-medium text-muted-foreground italic pt-1">
                      Parcel-level checks: Not Applicable
                    </p>
                  ) : (
                    <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">Field Verification</span>
                        <span className="font-semibold text-foreground">
                          {selectedReviewRow.readiness.checks.field_verification.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Evidence Uploads</span>
                        <span className="font-semibold text-foreground">
                          {selectedReviewRow.readiness.checks.evidence.count} file(s)
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Assignment</span>
                        <span className="font-semibold text-foreground">
                          {selectedReviewRow.readiness.checks.assignment.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedReviewRow.readiness.status === 'BLOCKED' && (
                    <div className="mt-2 p-2.5 rounded-md bg-red-100 border border-red-300 text-red-900 font-semibold text-xs flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0 text-red-600" />
                      <span>Approval blocked: Field verification must be Verified before approval.</span>
                    </div>
                  )}
                </div>
              )}

              {/* LAND PARCEL CONTEXT SECTION */}
              {selectedReviewRow.parcel ? (
                <div className="rounded-md border border-border bg-card p-4 space-y-3 text-xs shadow-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <LandPlot className="size-4 text-primary" />
                      <span>Land Parcel Context</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedReviewRow.land_parcel_id) {
                            setHubParcelId(selectedReviewRow.land_parcel_id)
                            setIsHubOpen(true)
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
                      >
                        <span>Open 360° Hub</span>
                        <ChevronRight className="size-3" />
                      </button>
                      <span className="font-mono text-xs text-primary font-medium">
                        {selectedReviewRow.parcel.parcel_number}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Owner Name</span>
                      <span className="font-medium text-foreground">{selectedReviewRow.parcel.owner_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Village</span>
                      <span className="font-medium text-foreground">{selectedReviewRow.parcel.village_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Survey / Khasra</span>
                      <span className="font-medium text-foreground">{selectedReviewRow.parcel.survey_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Notified Area</span>
                      <span className="font-medium text-foreground">
                        {selectedReviewRow.parcel.notified_area_sqm
                          ? `${selectedReviewRow.parcel.notified_area_sqm.toLocaleString('en-IN')} m² (${(selectedReviewRow.parcel.notified_area_sqm / 10000).toFixed(2)} Ha)`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Affected Area</span>
                      <span className="font-medium text-foreground">
                        {selectedReviewRow.parcel.affected_area_sqm
                          ? `${selectedReviewRow.parcel.affected_area_sqm.toLocaleString('en-IN')} m² (${(selectedReviewRow.parcel.affected_area_sqm / 10000).toFixed(2)} Ha)`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Possession Status</span>
                      <span className="font-medium text-foreground">{selectedReviewRow.parcel.possession_status}</span>
                    </div>
                  </div>

                  {/* Field Verification Context */}
                  <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">Field Verification Status</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                          selectedReviewRow.parcel.field_verification_status === 'Verified' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                          selectedReviewRow.parcel.field_verification_status === 'Needs Review' && 'bg-amber-50 text-amber-700 border-amber-300',
                          selectedReviewRow.parcel.field_verification_status === 'Pending' && 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {selectedReviewRow.parcel.field_verification_status}
                      </span>
                      {selectedReviewRow.parcel.field_verified_by && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Verified by {selectedReviewRow.parcel.field_verified_by}
                          {selectedReviewRow.parcel.field_verified_at && ` on ${new Date(selectedReviewRow.parcel.field_verified_at).toLocaleDateString('en-IN')}`}
                        </p>
                      )}
                    </div>

                    {/* Field Evidence Indicator */}
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">Field Evidence</span>
                      <div className="font-medium text-foreground text-xs flex items-center gap-1.5">
                        <Paperclip className="size-3.5 text-primary" />
                        <span>
                          {selectedReviewRow.evidence_count && selectedReviewRow.evidence_count > 0
                            ? `${selectedReviewRow.evidence_count} Evidence File(s) Uploaded`
                            : 'No field evidence uploaded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active Field Officer Assignment Context */}
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-muted-foreground block text-[11px] mb-1">Assigned Field Officer</span>
                    {selectedReviewRow.active_assignment ? (
                      <div className="text-xs text-foreground font-medium flex items-center justify-between bg-muted/40 p-2 rounded border border-border">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="size-3.5 text-primary" />
                          <span>{selectedReviewRow.active_assignment.assigned_officer_name} ({selectedReviewRow.active_assignment.assigned_officer_email})</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Assigned: {new Date(selectedReviewRow.active_assignment.assigned_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Not currently assigned</p>
                    )}
                  </div>
                </div>
              ) : selectedReviewRow.land_parcel_id === null ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-50/50 p-3 text-amber-800 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-semibold">Project-Level Statutory Notification</span>
                    <p className="text-[11px] text-amber-700">This workflow stage applies to the overall project corridor (no individual land parcel linked).</p>
                  </div>
                </div>
              ) : null}

              {/* Approving Authority (Demo Selector) */}
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Approving Authority (Demo Selector) <span className="text-red-500">*</span>
                </label>
                <select
                  value={reviewApprovedBy}
                  onChange={(e) => setReviewApprovedBy(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
                >
                  {DEMO_AUTHORITIES.map((auth) => (
                    <option key={auth} value={auth}>
                      {auth}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  * Note: Authority selector is for demo evaluation prior to session auth activation.
                </p>
              </div>

              {/* Review Remarks */}
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Authority Remarks &amp; Decision Summary
                </label>
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  rows={3}
                  placeholder="Enter approval details or rejection reasons (required for rejection)..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>

              {/* ATTENTION CONFIRMATION WARNING BANNER */}
              {showAttentionConfirm && selectedReviewRow.readiness?.status === 'ATTENTION' && (
                <div className="rounded-md border border-amber-600/40 bg-amber-100/90 p-3 text-amber-950 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="size-4 text-amber-600 shrink-0" />
                    <span>Incomplete Field Context Warning</span>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    Field verification or supporting evidence is incomplete. Do you want to proceed with approving this statutory workflow stage?
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewModalOpen(false)
                    setShowAttentionConfirm(false)
                  }}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={reviewSubmitting}
                    onClick={() => handleWorkflowAction('Rejected')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="size-4" />
                    <span>Reject Stage</span>
                  </button>

                  <button
                    type="button"
                    disabled={reviewSubmitting || selectedReviewRow.readiness?.status === 'BLOCKED'}
                    onClick={() => {
                      if (selectedReviewRow.readiness?.status === 'ATTENTION' && !showAttentionConfirm) {
                        setShowAttentionConfirm(true)
                        return
                      }
                      handleWorkflowAction('Approved')
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer',
                      showAttentionConfirm ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    )}
                  >
                    <CheckCircle className="size-4" />
                    <span>{showAttentionConfirm ? 'Confirm & Approve' : 'Approve Stage'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PFMS Financial Disbursement Simulation Modal Overlay */}
      {pfmsModalRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setPfmsModalRow(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tricolor rule */}
            <div className="flex h-1.5 w-full">
              <div className="flex-1 bg-amber-500" />
              <div className="flex-1 bg-card" />
              <div className="flex-1 bg-emerald-600" />
            </div>

            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-emerald-600" />
                <h3 className="font-serif text-base font-semibold text-foreground">
                  PFMS Direct Disbursement Gateway
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPfmsModalRow(null)}
                className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="rounded-md border border-emerald-600/30 bg-emerald-50/50 p-3.5 text-emerald-800 space-y-1">
                <p className="font-semibold text-sm">Public Financial Management System (PFMS)</p>
                <p>Direct Benefit Transfer (DBT) Compensation Module</p>
                <p className="font-mono text-[11px] text-emerald-700">
                  Project: {pfmsModalRow.project_code || 'NHAI-DEL-BOM-01'}
                </p>
              </div>

              {pfmsStatus === 'processing' ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-muted-foreground">
                  <RefreshCw className="size-8 animate-spin text-emerald-600" />
                  <p className="font-medium text-foreground text-sm">
                    Connecting to PFMS Banking Portal...
                  </p>
                  <p className="text-[11px]">Validating beneficiary Aadhaar-linked accounts &amp; land award records</p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                    <CheckCircle className="size-5 shrink-0" />
                    <span>PFMS Payout Triggered Successfully!</span>
                  </div>

                  <div className="rounded-md border border-border bg-muted/20 p-3.5 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Batch Reference:</span>
                      <span className="font-mono font-medium text-foreground">PFMS-DBT-2026-88910</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Beneficiaries Processed:</span>
                      <span className="font-medium text-foreground">71,204 Land Owners</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Disbursement Amount:</span>
                      <span className="font-semibold text-emerald-600">₹ 8,942.50 Crore</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SMS Alert Dispatch:</span>
                      <span className="font-medium text-green-india">Sent via Resend Gateway</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-border bg-muted/20 px-5 py-3">
              <button
                type="button"
                onClick={() => setPfmsModalRow(null)}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Close Gateway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 360° Parcel Context Hub Drawer */}
      <ParcelContextHub
        parcelId={hubParcelId}
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        userRole={userRole}
      />
    </div>
  )
}
