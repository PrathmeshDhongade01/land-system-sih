'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
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
  MapPin,
  Clock,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Layers,
  HeartHandshake,
  MessageSquareWarning,
  Eye,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MiniLocatorMap = dynamic(() => import('@/components/MiniLocatorMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-lg bg-muted/40 animate-pulse flex items-center justify-center text-xs text-muted-foreground border border-border">
      Loading satellite coordinates...
    </div>
  ),
})

export interface ParcelContextHubProps {
  parcelId: string | null
  isOpen: boolean
  onClose: () => void
  userRole?: string | null
  initialTab?: string
}

interface ParcelDetail {
  id: string
  project_id?: string | null
  project_code: string | null
  parcel_number: string | null
  parcel_no?: string | null
  owner_name: string
  village_name: string
  taluka_name?: string | null
  district?: string | null
  state?: string | null
  survey_number: string | null
  survey_no?: string | null
  khasra_no?: string | null
  notified_area_sqm: number | null
  affected_area_sqm: number | null
  possession_status: string | null
  land_type: string | null
  field_verification_status: string | null
  field_verified_at: string | null
  field_verified_by: string | null
  field_remarks: string | null
  latitude: number | null
  longitude: number | null
  compensation_amount?: number | null
  compensation_assessed?: number | null
  compensation_approved?: number | null
  compensation_paid?: number | null
  payment_status?: string | null
  payment_reference?: string | null
  payment_released_at?: string | null
  rehabilitation_status?: string | null
  rehabilitation_amount?: number | null
  rehabilitation_remarks?: string | null
  rehabilitation_completed_at?: string | null
  owner_profile_id?: string | null
  created_at?: string
  updated_at?: string
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
  captured_latitude?: number | null
  captured_longitude?: number | null
  captured_accuracy_m?: number | null
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
  land_parcel_id?: string | null
  workflow_type?: string
  stage_name?: string
  status: string
  assigned_to?: string
  submitted_by?: string
  approved_by?: string
  created_at?: string
  approved_at?: string
  remarks?: string | null
  readiness?: {
    status: 'READY' | 'ATTENTION' | 'BLOCKED'
    reasons: string[]
  } | null
}

interface ObjectionItem {
  id: string
  parcel_id: string
  submitted_by: string
  objection_type: string
  description: string
  status: string
  submitted_at: string
  reviewed_at?: string | null
  resolved_at?: string | null
  resolution_remarks?: string | null
}

interface ParcelAlert {
  id: string
  alert_key: string
  event_type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  explanation: string
  recommendation: string
  status: string
  created_at: string
}

type TabKey =
  | 'overview'
  | 'land'
  | 'gis'
  | 'acquisition'
  | 'field'
  | 'compensation'
  | 'rehab'
  | 'objections'
  | 'alerts'
  | 'timeline'

export function ParcelContextHub({
  parcelId,
  isOpen,
  onClose,
  userRole,
  initialTab = 'overview',
}: ParcelContextHubProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [parcel, setParcel] = useState<ParcelDetail | null>(null)
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([])
  const [activeAssignment, setActiveAssignment] = useState<ActiveAssignment | null>(null)
  const [workflowsList, setWorkflowsList] = useState<LinkedWorkflow[]>([])
  const [objectionsList, setObjectionsList] = useState<ObjectionItem[]>([])
  const [objectionsRestricted, setObjectionsRestricted] = useState<boolean>(false)
  const [alertsList, setAlertsList] = useState<ParcelAlert[]>([])

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as TabKey)
    }
  }, [initialTab])

  const fetchHubData = useCallback(async (id: string) => {
    setLoading(true)
    setErrorMsg(null)
    setObjectionsRestricted(false)

    try {
      const [parcelRes, evidenceRes, assignRes, wfRes, objRes, alertRes] = await Promise.all([
        fetch(`/api/parcels?id=${encodeURIComponent(id)}`),
        fetch(`/api/evidence?parcel_id=${encodeURIComponent(id)}`),
        fetch(`/api/assignments?parcel_id=${encodeURIComponent(id)}`),
        fetch('/api/workflows'),
        fetch(`/api/objections?parcel_id=${encodeURIComponent(id)}`),
        fetch(`/api/alerts?entity_id=${encodeURIComponent(id)}`),
      ])

      const [parcelJson, evidenceJson, assignJson, wfJson, alertJson] = await Promise.all([
        parcelRes.json().catch(() => ({})),
        evidenceRes.json().catch(() => ({})),
        assignRes.json().catch(() => ({})),
        wfRes.json().catch(() => ({})),
        alertRes.json().catch(() => ({})),
      ])

      // 1. Parcel Record
      let fetchedParcel: ParcelDetail | null = null
      if (parcelRes.ok && parcelJson.success && Array.isArray(parcelJson.data)) {
        fetchedParcel = parcelJson.data[0] || null
      }
      setParcel(fetchedParcel)

      // 2. Evidence Files
      if (evidenceRes.ok && evidenceJson.success) {
        setEvidenceList(evidenceJson.data || [])
      } else {
        setEvidenceList([])
      }

      // 3. Officer Assignments
      if (assignRes.ok && assignJson.success && Array.isArray(assignJson.data)) {
        const active = assignJson.data.find((a: any) => a.status === 'Active') || null
        setActiveAssignment(active)
      } else {
        setActiveAssignment(null)
      }

      // 4. Workflows
      if (wfRes.ok && wfJson.success && Array.isArray(wfJson.data)) {
        const linked = wfJson.data.filter((w: any) => w.land_parcel_id === id)
        setWorkflowsList(linked)
      } else {
        setWorkflowsList([])
      }

      // 5. Objections (Handle Field Officer 403 gracefully)
      if (objRes.status === 403) {
        setObjectionsRestricted(true)
        setObjectionsList([])
      } else {
        const objJson = await objRes.json().catch(() => ({}))
        if (objRes.ok && objJson.success && Array.isArray(objJson.data)) {
          setObjectionsList(objJson.data)
        } else {
          setObjectionsList([])
        }
      }

      // 6. Alerts
      if (alertRes.ok && alertJson.success && Array.isArray(alertJson.data)) {
        setAlertsList(alertJson.data)
      } else {
        setAlertsList([])
      }
    } catch (err: any) {
      console.error('Error fetching Parcel Context Hub data:', err)
      setErrorMsg(err?.message || 'Failed to load 360° parcel intelligence.')
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
      setObjectionsList([])
      setAlertsList([])
    }
  }, [isOpen, parcelId, fetchHubData])

  // Synthesize Timeline from available parcel timestamps
  const timelineEvents = useMemo(() => {
    if (!parcel) return []

    const events: Array<{
      date: string
      title: string
      description: string
      badge: string
      type: 'creation' | 'assignment' | 'verification' | 'workflow' | 'financial' | 'rehab' | 'objection'
    }> = []

    if (parcel.created_at) {
      events.push({
        date: parcel.created_at,
        title: 'Parcel Record Demarcated',
        description: `Survey Parcel #${parcel.parcel_number || parcel.parcel_no} registered under Project ${parcel.project_code || 'N/A'}.`,
        badge: 'Cadastral Entry',
        type: 'creation',
      })
    }

    if (activeAssignment?.assigned_at) {
      events.push({
        date: activeAssignment.assigned_at,
        title: 'Field Officer Demarcation Assignment',
        description: `Assigned to ${activeAssignment.assigned_officer_name || 'Field Officer'} (${activeAssignment.assigned_officer_email || 'Assigned Officer'}).`,
        badge: 'Assignment',
        type: 'assignment',
      })
    }

    if (parcel.field_verified_at) {
      events.push({
        date: parcel.field_verified_at,
        title: `Ground Verification: ${parcel.field_verification_status}`,
        description: `Inspected by ${parcel.field_verified_by || 'Officer'}. Remarks: ${parcel.field_remarks || 'Inspection completed.'}`,
        badge: parcel.field_verification_status || 'Verified',
        type: 'verification',
      })
    }

    evidenceList.forEach((ev) => {
      events.push({
        date: ev.created_at,
        title: `Field Evidence Uploaded: ${ev.file_name}`,
        description: `${(ev.file_size_bytes / 1024).toFixed(1)} KB document/photo registered in secure storage.`,
        badge: 'Evidence',
        type: 'verification',
      })
    })

    workflowsList.forEach((wf) => {
      if (wf.created_at) {
        events.push({
          date: wf.created_at,
          title: `Workflow Stage: ${wf.workflow_type || wf.stage_name}`,
          description: `Stage status: ${wf.status}. Submitted by: ${wf.submitted_by || 'Authorized Officer'}.`,
          badge: wf.status,
          type: 'workflow',
        })
      }
      if (wf.approved_at) {
        events.push({
          date: wf.approved_at,
          title: `Statutory Approval: ${wf.workflow_type || wf.stage_name}`,
          description: `Stage formally approved by ${wf.approved_by || 'Competent Authority'}.`,
          badge: 'Approved',
          type: 'workflow',
        })
      }
    })

    objectionsList.forEach((obj) => {
      events.push({
        date: obj.submitted_at,
        title: `Objection Lodged: ${obj.objection_type}`,
        description: `Grounds: "${obj.description.substring(0, 100)}..." (Status: ${obj.status}).`,
        badge: obj.status,
        type: 'objection',
      })
      if (obj.resolved_at) {
        events.push({
          date: obj.resolved_at,
          title: `Objection Resolved: ${obj.objection_type}`,
          description: obj.resolution_remarks || 'Formally reviewed and resolved by Competent Authority.',
          badge: 'Resolved',
          type: 'objection',
        })
      }
    })

    if (parcel.payment_released_at) {
      events.push({
        date: parcel.payment_released_at,
        title: 'PFMS Direct Benefit Transfer Released',
        description: `Compensation payment reference ${parcel.payment_reference || 'PFMS-DBT'} successfully credited.`,
        badge: 'Paid',
        type: 'financial',
      })
    }

    if (parcel.rehabilitation_completed_at) {
      events.push({
        date: parcel.rehabilitation_completed_at,
        title: 'R&R Entitlements Disbursed',
        description: parcel.rehabilitation_remarks || 'Resettlement allowance and support package completed.',
        badge: 'R&R Complete',
        type: 'rehab',
      })
    }

    // Sort descending (most recent first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [parcel, activeAssignment, evidenceList, workflowsList, objectionsList])

  if (!isOpen) return null

  const parcelNo = parcel?.parcel_number || parcel?.parcel_no || 'N/A'
  const surveyNo = parcel?.survey_number || parcel?.survey_no || parcel?.khasra_no || 'N/A'
  const khasraNo = parcel?.khasra_no || 'Not Recorded'
  const notifiedAreaHa = parcel?.notified_area_sqm ? (parcel.notified_area_sqm / 10000).toFixed(2) : null
  const affectedAreaHa = parcel?.affected_area_sqm ? (parcel.affected_area_sqm / 10000).toFixed(2) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl h-full sm:h-[94vh] overflow-hidden rounded-none sm:rounded-xl border border-border bg-card shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tricolor top government rule */}
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
                  360° Parcel Intelligence Hub
                </span>
                {parcel && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {parcelNo}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {parcel
                  ? `Project: ${parcel.project_code || 'N/A'} · Survey: ${surveyNo} · Owner: ${parcel.owner_name} (${parcel.village_name})`
                  : 'Land Acquisition Cadastral & Statutory Intelligence Profile'}
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

        {/* Tab Navigation Strip (10 Tabs as per Phase 1 Step 3) */}
        <div className="flex items-center border-b border-border bg-card px-4 overflow-x-auto shrink-0 scrollbar-thin text-xs">
          {[
            { key: 'overview', label: 'Overview', icon: Building2 },
            { key: 'land', label: 'Land & Ownership', icon: LandPlot },
            { key: 'gis', label: 'GIS Location', icon: MapPin },
            { key: 'acquisition', label: 'Acquisition', icon: FileText },
            {
              key: 'field',
              label: 'Field Verification',
              icon: UserCheck,
              badge: evidenceList.length > 0 ? evidenceList.length : undefined,
            },
            { key: 'compensation', label: 'Compensation', icon: CreditCard },
            { key: 'rehab', label: 'R&R', icon: HeartHandshake },
            {
              key: 'objections',
              label: 'Objections',
              icon: MessageSquareWarning,
              badge: objectionsList.length > 0 ? objectionsList.length : undefined,
            },
            {
              key: 'alerts',
              label: 'Alerts',
              icon: AlertTriangle,
              badge: alertsList.length > 0 ? alertsList.length : undefined,
              badgeColor: alertsList.length > 0 ? 'bg-amber-100 text-amber-800' : undefined,
            },
            { key: 'timeline', label: 'Timeline', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition-colors relative text-xs',
                  isActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                      tab.badgeColor || 'bg-primary/10 text-primary'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Drawer Body Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-slate-50/50">
          {loading ? (
            <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading 360° Land Parcel Intelligence...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg flex items-center gap-2">
              <AlertCircle className="size-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : parcel ? (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* High-level status bar */}
                  <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-foreground font-serif">
                            Parcel #{parcelNo}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold border',
                              parcel.possession_status === 'Possession Taken' || parcel.possession_status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : parcel.possession_status === 'Acquired'
                                ? 'bg-teal-50 text-teal-700 border-teal-300'
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                            )}
                          >
                            {parcel.possession_status || 'Pending'}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold border',
                              parcel.field_verification_status === 'Verified'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-blue-50 text-blue-700 border-blue-300'
                            )}
                          >
                            {parcel.field_verification_status || 'Pending Verification'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {parcel.owner_name} · {parcel.village_name}, {parcel.district || 'Nashik'}, {parcel.state || 'Maharashtra'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('gis')}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
                        >
                          <MapPin className="size-3" />
                          <span>Locate on Map</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('field')}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
                        >
                          <UserCheck className="size-3" />
                          <span>Field Evidence</span>
                        </button>
                      </div>
                    </div>

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Notified Area</span>
                        <p className="text-sm font-bold text-foreground mt-0.5">
                          {parcel.notified_area_sqm
                            ? `${parcel.notified_area_sqm.toLocaleString('en-IN')} m²`
                            : 'N/A'}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{notifiedAreaHa ? `${notifiedAreaHa} ha` : ''}</span>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Affected Area</span>
                        <p className="text-sm font-bold text-foreground mt-0.5">
                          {parcel.affected_area_sqm
                            ? `${parcel.affected_area_sqm.toLocaleString('en-IN')} m²`
                            : 'N/A'}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{affectedAreaHa ? `${affectedAreaHa} ha` : ''}</span>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Approved Award</span>
                        <p className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                          {parcel.compensation_approved
                            ? `₹${parcel.compensation_approved.toLocaleString('en-IN')}`
                            : '₹0'}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{parcel.payment_status || 'Not assessed'}</span>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Disbursed DBT</span>
                        <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                          {parcel.compensation_paid
                            ? `₹${parcel.compensation_paid.toLocaleString('en-IN')}`
                            : '₹0'}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{parcel.payment_reference || 'Pending'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Callout Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Active Assignment */}
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <UserCheck className="size-4 text-primary" />
                          Field Officer Assignment
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold border',
                            activeAssignment ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {activeAssignment ? 'Active' : 'Unassigned'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeAssignment
                          ? `${activeAssignment.assigned_officer_name || 'Field Officer'} (${activeAssignment.assigned_officer_email || 'Assigned Officer'})`
                          : 'No active field officer demarcating this parcel.'}
                      </p>
                      {activeAssignment && (
                        <span className="text-[11px] text-muted-foreground block">
                          Assigned: {new Date(activeAssignment.assigned_at).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Statutory Readiness */}
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <FileText className="size-4 text-primary" />
                          Statutory Workflow Stage
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground border border-border">
                          RFCTLARR 2013
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-medium">
                        {workflowsList.length > 0
                          ? `${workflowsList[0].workflow_type || workflowsList[0].stage_name} (${workflowsList[0].status})`
                          : 'Notification Stage / Initial Cadastral Demarcation'}
                      </p>
                      <span className="text-[11px] text-muted-foreground block">
                        {workflowsList.length} statutory workflow milestones registered.
                      </span>
                    </div>
                  </div>

                  {/* Discrepancy & Objections Banner */}
                  {(alertsList.length > 0 || objectionsList.length > 0) && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-amber-800 text-xs">
                        <AlertTriangle className="size-4" />
                        <span>Attention Required: {alertsList.length} Active Alert(s) · {objectionsList.length} Objection(s)</span>
                      </div>
                      <p className="text-xs text-amber-700">
                        Review the Objections and Alerts tabs to resolve active landholder disputes or GIS discrepancies before proceeding to Award declarations.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LAND & OWNERSHIP */}
              {activeTab === 'land' && (
                <div className="space-y-4">
                  {/* Section: Identity */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-4 text-primary" />
                        Cadastral Identity Specifications
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        UUID: {parcel.id.substring(0, 8)}...
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Parcel ID</span>
                        <span className="font-mono font-bold text-foreground">{parcelNo}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Owner Name</span>
                        <span className="font-semibold text-foreground">{parcel.owner_name}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Survey Number</span>
                        <span className="font-medium text-foreground">{surveyNo}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Khasra Number</span>
                        <span className="font-medium text-foreground">{khasraNo}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Khata Number</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Not Recorded
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">ULPIN (Bhu-Aadhaar)</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Pending Demarcation
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Village</span>
                        <span className="font-medium text-foreground">{parcel.village_name}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Taluka / Tehsil</span>
                        <span className="font-medium text-foreground">{parcel.taluka_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">District &amp; State</span>
                        <span className="font-medium text-foreground">
                          {parcel.district || 'Nashik'}, {parcel.state || 'Maharashtra'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Land Measurements */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <LandPlot className="size-4 text-primary" />
                        Land Measurement &amp; Classification
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        {parcel.land_type || 'Agricultural'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Land Classification</span>
                        <span className="font-semibold text-foreground">{parcel.land_type || 'Agricultural'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Total Parcel Area</span>
                        <span className="font-semibold text-foreground">
                          {parcel.notified_area_sqm
                            ? `${parcel.notified_area_sqm.toLocaleString('en-IN')} m²`
                            : 'Not Recorded'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Notified Area</span>
                        <span className="font-semibold text-foreground">
                          {parcel.notified_area_sqm
                            ? `${parcel.notified_area_sqm.toLocaleString('en-IN')} m² (${notifiedAreaHa} Ha)`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Affected Area (ROW)</span>
                        <span className="font-semibold text-foreground">
                          {parcel.affected_area_sqm
                            ? `${parcel.affected_area_sqm.toLocaleString('en-IN')} m² (${affectedAreaHa} Ha)`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GIS LOCATION */}
              {activeTab === 'gis' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Compass className="size-4 text-primary" />
                        Geographic Demarcation &amp; Coordinates
                      </span>
                      {parcel.latitude && parcel.longitude ? (
                        <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {parcel.latitude.toFixed(6)}° N, {parcel.longitude.toFixed(6)}° E
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Coordinates Pending
                        </span>
                      )}
                    </div>

                    {parcel.latitude && parcel.longitude ? (
                      <div className="space-y-3">
                        <MiniLocatorMap
                          latitude={parcel.latitude}
                          longitude={parcel.longitude}
                          parcelNumber={parcelNo}
                          villageName={parcel.village_name}
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                          <div className="rounded bg-muted/40 p-2.5 border border-border">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Target Project</span>
                            <span className="font-semibold text-foreground font-mono">{parcel.project_code || 'N/A'}</span>
                          </div>
                          <div className="rounded bg-muted/40 p-2.5 border border-border">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Affected Impact Ratio</span>
                            <span className="font-semibold text-foreground">
                              {parcel.notified_area_sqm && parcel.affected_area_sqm
                                ? `${((parcel.affected_area_sqm / parcel.notified_area_sqm) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="rounded bg-muted/40 p-2.5 border border-border">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Alignment Buffer</span>
                            <span className="font-semibold text-foreground">Within 60 m ROW Corridor</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed rounded-lg border-border space-y-2">
                        <Compass className="size-8 text-muted-foreground mx-auto" />
                        <p className="text-sm font-semibold text-foreground">
                          Geographic coordinates pending field demarcation
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          The survey team has not yet logged finalized boundary GPS coordinates for this parcel.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ACQUISITION */}
              {activeTab === 'acquisition' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="size-4 text-primary" />
                        Statutory Workflows &amp; Readiness
                      </span>
                      <span className="text-xs text-muted-foreground">RFCTLARR Act, 2013</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-2">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Possession Status</span>
                        <span className="font-bold text-foreground text-sm">{parcel.possession_status || 'Pending'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Current Stage</span>
                        <span className="font-bold text-foreground text-sm">
                          {workflowsList.length > 0
                            ? workflowsList[0].workflow_type || workflowsList[0].stage_name
                            : 'Notification Stage'}
                        </span>
                      </div>
                    </div>

                    {workflowsList.length > 0 ? (
                      <div className="space-y-2.5 pt-2">
                        {workflowsList.map((wf) => (
                          <div
                            key={wf.id}
                            className="p-3 rounded-lg border border-border bg-muted/20 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {wf.workflow_type || wf.stage_name}
                              </span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                  (wf.status || '').toLowerCase().includes('approved')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : (wf.status || '').toLowerCase().includes('pending')
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-red-50 text-red-700 border-red-300'
                                )}
                              >
                                {wf.status}
                              </span>
                            </div>

                            {wf.readiness && (
                              <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                                <span className="text-muted-foreground">Statutory Readiness:</span>
                                <span
                                  className={cn(
                                    'font-bold px-2 py-0.5 rounded text-[10px]',
                                    wf.readiness.status === 'READY' && 'bg-emerald-100 text-emerald-800',
                                    wf.readiness.status === 'ATTENTION' && 'bg-amber-100 text-amber-800',
                                    wf.readiness.status === 'BLOCKED' && 'bg-red-100 text-red-800'
                                  )}
                                >
                                  {wf.readiness.status === 'READY' && '🟢 READY'}
                                  {wf.readiness.status === 'ATTENTION' && '🟡 ATTENTION'}
                                  {wf.readiness.status === 'BLOCKED' && '🔴 BLOCKED'}
                                </span>
                              </div>
                            )}

                            {wf.remarks && (
                              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                {wf.remarks}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-2">
                        No statutory workflow stages currently initiated specifically for this parcel record.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: FIELD VERIFICATION */}
              {activeTab === 'field' && (
                <div className="space-y-4">
                  {/* Status & Officer */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <UserCheck className="size-4 text-primary" />
                        Demarcation &amp; Field Verification Details
                      </span>
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                          parcel.field_verification_status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : parcel.field_verification_status === 'Needs Review'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {parcel.field_verification_status || 'Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Assigned Field Officer</span>
                        <span className="font-semibold text-foreground">
                          {activeAssignment
                            ? `${activeAssignment.assigned_officer_name || 'Field Officer'} (${activeAssignment.assigned_officer_email || 'Officer'})`
                            : 'Unassigned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Verified By</span>
                        <span className="font-medium text-foreground">
                          {parcel.field_verified_by || 'Awaiting Field Inspection'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Verification Date</span>
                        <span className="font-medium text-foreground">
                          {parcel.field_verified_at
                            ? new Date(parcel.field_verified_at).toLocaleDateString('en-IN')
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Demarcation Evidence Files</span>
                        <span className="font-semibold text-foreground">{evidenceList.length} files attached</span>
                      </div>
                      {parcel.field_remarks && (
                        <div className="sm:col-span-2 rounded bg-muted/40 p-2.5 border border-border">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">
                            Field Officer Inspection Remarks:
                          </span>
                          <p className="text-foreground">{parcel.field_remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evidence Files List */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Paperclip className="size-4 text-primary" />
                        Uploaded Field Evidence ({evidenceList.length})
                      </span>
                      <span className="text-xs text-muted-foreground">Private Storage</span>
                    </div>

                    {evidenceList.length > 0 ? (
                      <div className="space-y-2">
                        {evidenceList.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-foreground truncate">{ev.file_name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {(ev.file_size_bytes / 1024).toFixed(1)} KB · {new Date(ev.created_at).toLocaleDateString('en-IN')}
                                {ev.captured_latitude && ` · GPS (${ev.captured_latitude.toFixed(5)}, ${ev.captured_longitude?.toFixed(5)})`}
                              </p>
                            </div>
                            {ev.signed_url && (
                              <a
                                href={ev.signed_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border border-border text-[11px] font-medium text-foreground hover:bg-accent shrink-0"
                              >
                                <span>View</span>
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-2">
                        No field survey photographs or boundary demarcation files logged yet.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: COMPENSATION */}
              {activeTab === 'compensation' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <CreditCard className="size-4 text-emerald-600" />
                        Statutory Compensation &amp; PFMS Payout
                      </span>
                      <span className="font-mono text-xs font-semibold text-emerald-700">
                        {parcel.payment_status || 'Not Assessed'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Assessed Compensation</span>
                        <span className="font-semibold text-foreground font-mono">
                          {parcel.compensation_assessed !== undefined && parcel.compensation_assessed !== null
                            ? `₹${parcel.compensation_assessed.toLocaleString('en-IN')}`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Approved Award Amount</span>
                        <span className="font-semibold text-emerald-700 font-mono">
                          {parcel.compensation_approved !== undefined && parcel.compensation_approved !== null
                            ? `₹${parcel.compensation_approved.toLocaleString('en-IN')}`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Disbursed DBT Amount</span>
                        <span className="font-semibold text-foreground font-mono">
                          {parcel.compensation_paid !== undefined && parcel.compensation_paid !== null
                            ? `₹${parcel.compensation_paid.toLocaleString('en-IN')}`
                            : '₹0'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">PFMS Reference</span>
                        <span className="font-mono font-semibold text-foreground">
                          {parcel.payment_reference || 'Pending Generation'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Payment Disbursal Date</span>
                        <span className="font-medium text-foreground">
                          {parcel.payment_released_at
                            ? new Date(parcel.payment_released_at).toLocaleDateString('en-IN')
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Statutory Solatium Rate</span>
                        <span className="font-medium text-foreground">100% Solatium (RFCTLARR Sec 30)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: R&R */}
              {activeTab === 'rehab' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <HeartHandshake className="size-4 text-primary" />
                        Rehabilitation &amp; Resettlement Entitlements
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold border',
                          parcel.rehabilitation_status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : parcel.rehabilitation_status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {parcel.rehabilitation_status || 'Not Started'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">R&amp;R Status</span>
                        <span className="font-semibold text-foreground">{parcel.rehabilitation_status || 'Not Started'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">R&amp;R Entitlement Package</span>
                        <span className="font-semibold text-foreground font-mono">
                          {parcel.rehabilitation_amount !== undefined && parcel.rehabilitation_amount !== null
                            ? `₹${parcel.rehabilitation_amount.toLocaleString('en-IN')}`
                            : '₹0'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Completion Date</span>
                        <span className="font-medium text-foreground">
                          {parcel.rehabilitation_completed_at
                            ? new Date(parcel.rehabilitation_completed_at).toLocaleDateString('en-IN')
                            : 'Pending'}
                        </span>
                      </div>
                      {parcel.rehabilitation_remarks && (
                        <div className="sm:col-span-3 rounded bg-muted/40 p-2.5 border border-border">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">
                            Entitlement Remarks:
                          </span>
                          <p className="text-foreground">{parcel.rehabilitation_remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: OBJECTIONS */}
              {activeTab === 'objections' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <MessageSquareWarning className="size-4 text-primary" />
                        Landholder Objections &amp; Grievances ({objectionsList.length})
                      </span>
                      <span className="text-xs text-muted-foreground">Section 15 / 3C Statutory Hearings</span>
                    </div>

                    {objectionsRestricted ? (
                      <div className="p-4 bg-muted/50 rounded-lg border border-border text-center space-y-1">
                        <p className="font-semibold text-foreground">Access Restricted</p>
                        <p className="text-xs text-muted-foreground">
                          Field Officers are not authorized to view parcel landholder objections under standard MoRTH security protocols.
                        </p>
                      </div>
                    ) : objectionsList.length > 0 ? (
                      <div className="space-y-3">
                        {objectionsList.map((obj) => (
                          <div key={obj.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{obj.objection_type}</span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold border',
                                  obj.status === 'Resolved'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : obj.status === 'Under Review'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-amber-50 text-amber-700 border-amber-300'
                                )}
                              >
                                {obj.status}
                              </span>
                            </div>
                            <p className="text-xs text-foreground bg-card p-2 rounded border border-border/60">
                              "{obj.description}"
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                              <span>Submitted: {new Date(obj.submitted_at).toLocaleDateString('en-IN')}</span>
                              {obj.resolved_at && (
                                <span>Resolved: {new Date(obj.resolved_at).toLocaleDateString('en-IN')}</span>
                              )}
                            </div>
                            {obj.resolution_remarks && (
                              <p className="text-[11px] text-emerald-800 bg-emerald-50/50 p-1.5 rounded border border-emerald-200">
                                <strong>Hearing Resolution:</strong> {obj.resolution_remarks}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground italic">
                        No formal objections or disputes currently filed for this parcel record.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 9: ALERTS */}
              {activeTab === 'alerts' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <AlertTriangle className="size-4 text-amber-600" />
                        Parcel Discrepancy &amp; Risk Alerts ({alertsList.length})
                      </span>
                      <span className="text-xs text-muted-foreground">Automated Rule Engine</span>
                    </div>

                    {alertsList.length > 0 ? (
                      <div className="space-y-3">
                        {alertsList.map((alert) => (
                          <div
                            key={alert.id}
                            className={cn(
                              'p-3 rounded-lg border space-y-1.5',
                              alert.severity === 'CRITICAL'
                                ? 'bg-red-500/5 border-red-500/30'
                                : alert.severity === 'HIGH'
                                ? 'bg-amber-500/5 border-amber-500/30'
                                : 'bg-blue-500/5 border-blue-500/30'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{alert.title}</span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold',
                                  alert.severity === 'CRITICAL' && 'bg-red-100 text-red-800',
                                  alert.severity === 'HIGH' && 'bg-amber-100 text-amber-800',
                                  alert.severity === 'MEDIUM' && 'bg-blue-100 text-blue-800',
                                  alert.severity === 'LOW' && 'bg-slate-100 text-slate-800'
                                )}
                              >
                                {alert.severity}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{alert.explanation}</p>
                            <div className="rounded bg-background/80 p-2 border border-border/60 text-[11px] text-foreground">
                              <strong>Recommendation:</strong> {alert.recommendation}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-2">
                        <CheckCircle2 className="size-8 text-emerald-600 mx-auto" />
                        <p className="font-semibold text-foreground">All Clear — No Active Alerts</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          This parcel has passed automated GIS area geometry checks, field demarcation verifications, and financial DBT checks.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 10: TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="size-4 text-primary" />
                        Cadastral Audit &amp; Lifecycle Timeline
                      </span>
                      <span className="text-xs text-muted-foreground">Immutable Chronological History</span>
                    </div>

                    {timelineEvents.length > 0 ? (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                        {timelineEvents.map((evt, idx) => (
                          <div key={idx} className="relative group">
                            <span className="absolute -left-6 top-1 size-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />
                            <div className="rounded-lg border border-border bg-card p-3 shadow-2xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">{evt.title}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  {new Date(evt.date).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{evt.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-4 text-center">
                        No historical audit events logged for this parcel record.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Drawer Footer Actions */}
        <div className="border-t border-border bg-muted/30 p-4 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            NLAMS 360° Land Parcel Intelligence · Government of India
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onClose()
                if (parcelId) {
                  router.push(`/field-verification?parcel_id=${encodeURIComponent(parcelId)}`)
                }
              }}
              className="inline-flex items-center gap-1 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              <span>Open Field Portal</span>
              <ExternalLink className="size-3" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParcelContextHub
