'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import {
  LandPlot,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Wallet,
  Building2,
  ShieldCheck,
  Download,
  ExternalLink,
  RefreshCw,
  LogOut,
  ChevronRight,
  User,
  Compass,
  Paperclip,
  Image as ImageIcon,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  BadgePercent,
  Banknote,
  Home,
  Layers,
  ArrowRight,
  X,
  Upload,
  MessageSquare,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParcelMapItem } from '@/components/ParcelMap'

const ParcelMap = dynamic(() => import('@/components/ParcelMap'), { ssr: false })

function ChakraEmblem({ className }: { className?: string }) {
  const spokes = Array.from({ length: 24 })
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Ashoka Chakra emblem">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
      {spokes.map((_, i) => {
        const angle = (i * 360) / spokes.length
        return (
          <line
            key={i}
            x1="50"
            y1="50"
            x2="50"
            y2="8"
            stroke="currentColor"
            strokeWidth="1.5"
            transform={`rotate(${angle} 50 50)`}
          />
        )
      })}
    </svg>
  )
}

export interface ViewerPortalViewProps {
  userEmail?: string | null
  userName?: string | null
  userRole?: string | null
}

export interface LandownerParcel {
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
  compensation_assessed?: number | null
  compensation_approved?: number | null
  compensation_paid?: number | null
  compensation_amount?: number | null
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

interface StatutoryWorkflowItem {
  id: string
  project_code: string
  land_parcel_id?: string | null
  workflow_type?: string
  stage_name?: string
  status: string
  assigned_to?: string
  submitted_by?: string
  approved_by?: string
  approved_at?: string | null
  remarks?: string | null
  created_at: string
  updated_at?: string | null
}

interface EvidenceDocItem {
  id: string
  parcel_id: string
  file_name: string
  storage_path: string
  file_type: string
  file_size_bytes: number
  description?: string | null
  uploaded_by_email?: string | null
  created_at: string
  signed_url?: string | null
}

export interface ViewerObjection {
  id: string
  parcel_id: string
  parcel_number?: string | null
  village_name?: string | null
  survey_number?: string | null
  owner_name?: string | null
  objection_type: string
  description: string
  status: 'Submitted' | 'Under Review' | 'Resolved' | 'Rejected'
  submitted_at: string
  updated_at?: string
  reviewed_at?: string | null
  resolved_at?: string | null
  reviewer_name?: string | null
  resolution_remarks?: string | null
  evidence?: Array<{
    id: string
    file_name: string
    file_type: string
    file_size_bytes: number
    storage_path: string
    signed_url?: string | null
    created_at: string
  }>
}

const CONTROLLED_OBJECTION_TYPES = [
  'Land / Parcel Details',
  'Acquisition Status',
  'Compensation',
  'Rehabilitation & Resettlement',
  'Measurement / Area',
  'Notice / Documentation',
  'Other',
] as const

function formatINR(val?: number | string | null): string {
  if (val === null || val === undefined || val === '') return 'Not yet recorded'
  const num = Number(val)
  if (isNaN(num)) return 'Not yet recorded'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

function formatArea(sqm?: number | null): string {
  if (sqm === null || sqm === undefined || isNaN(sqm)) return 'N/A'
  const ha = (sqm / 10000).toFixed(4)
  return `${sqm.toLocaleString('en-IN')} sqm (${ha} Ha)`
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Pending'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'Pending'
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return 'Pending'
  }
}

export default function ViewerPortalView({
  userEmail,
  userName,
  userRole,
}: ViewerPortalViewProps) {
  const router = useRouter()

  const [parcels, setParcels] = useState<LandownerParcel[]>([])
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [workflows, setWorkflows] = useState<StatutoryWorkflowItem[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState<boolean>(false)

  const [evidenceList, setEvidenceList] = useState<EvidenceDocItem[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState<boolean>(false)

  const [activeSection, setActiveSection] = useState<
    'overview' | 'status' | 'compensation' | 'location' | 'documents' | 'objections'
  >('overview')

  const [objections, setObjections] = useState<ViewerObjection[]>([])
  const [objectionsLoading, setObjectionsLoading] = useState<boolean>(false)

  // Raise Objection Modal State
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState<boolean>(false)
  const [objectionType, setObjectionType] = useState<string>('Compensation')
  const [objectionDescription, setObjectionDescription] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // Listen to URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (['overview', 'status', 'compensation', 'location', 'documents', 'objections'].includes(hash)) {
        setActiveSection(hash as any)
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const fetchObjections = useCallback(async () => {
    setObjectionsLoading(true)
    try {
      const res = await fetch('/api/objections')
      const json = await res.json()
      if (res.ok && json.success && Array.isArray(json.data)) {
        setObjections(json.data)
      } else {
        setObjections([])
      }
    } catch (err) {
      console.error('[ViewerPortal] Error fetching objections:', err)
      setObjections([])
    } finally {
      setObjectionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchObjections()
  }, [fetchObjections])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      return
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setFileError('Invalid file format. Allowed types: JPG, PNG, WEBP, PDF.')
      setSelectedFile(null)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds the 10MB limit. Please choose a smaller file.')
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleSubmitObjection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedParcelId) return
    const trimmedDesc = objectionDescription.trim()
    if (trimmedDesc.length < 5) {
      setSubmitError('Objection description must be at least 5 characters.')
      return
    }
    setSubmitLoading(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      let res: Response
      if (selectedFile) {
        const formData = new FormData()
        formData.append('parcel_id', selectedParcelId)
        formData.append('objection_type', objectionType)
        formData.append('description', trimmedDesc)
        formData.append('evidence', selectedFile)

        res = await fetch('/api/objections', {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch('/api/objections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parcel_id: selectedParcelId,
            objection_type: objectionType,
            description: trimmedDesc,
          }),
        })
      }

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit objection.')
      }

      setSubmitSuccess('Your objection has been recorded successfully under Section 3C statutory review.')
      setObjectionDescription('')
      setSelectedFile(null)
      setFileError(null)
      await fetchObjections()
      setTimeout(() => {
        setIsRaiseModalOpen(false)
        setSubmitSuccess(null)
        setActiveSection('objections')
      }, 1200)
    } catch (err: any) {
      setSubmitError(err?.message || 'Error submitting objection.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const fetchMyParcels = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/parcels')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load your parcel records.')
      }
      const data: LandownerParcel[] = Array.isArray(json.data) ? json.data : []
      setParcels(data)
      if (data.length > 0) {
        setSelectedParcelId((prev) => (prev && data.some((p) => p.id === prev) ? prev : data[0].id))
      } else {
        setSelectedParcelId(null)
      }
    } catch (err: any) {
      console.error('[ViewerPortal] Error fetching parcels:', err)
      setErrorMsg(err?.message || 'Unable to load your parcel information.')
      setParcels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMyParcels()
  }, [fetchMyParcels])

  const selectedParcel = useMemo(() => {
    return parcels.find((p) => p.id === selectedParcelId) || null
  }, [parcels, selectedParcelId])

  useEffect(() => {
    if (!selectedParcelId) {
      setWorkflows([])
      setEvidenceList([])
      return
    }

    let isMounted = true

    async function loadParcelDetails(pId: string) {
      setWorkflowsLoading(true)
      setEvidenceLoading(true)

      try {
        const [wfRes, evRes] = await Promise.all([
          fetch(`/api/workflows?land_parcel_id=${encodeURIComponent(pId)}`),
          fetch(`/api/evidence?parcel_id=${encodeURIComponent(pId)}`),
        ])

        const [wfJson, evJson] = await Promise.all([wfRes.json(), evRes.json()])

        if (isMounted) {
          if (wfRes.ok && wfJson.success && Array.isArray(wfJson.data)) {
            setWorkflows(wfJson.data)
          } else {
            setWorkflows([])
          }

          if (evRes.ok && evJson.success && Array.isArray(evJson.data)) {
            setEvidenceList(evJson.data)
          } else {
            setEvidenceList([])
          }
        }
      } catch (err) {
        console.error('[ViewerPortal] Error loading parcel contextual data:', err)
        if (isMounted) {
          setWorkflows([])
          setEvidenceList([])
        }
      } finally {
        if (isMounted) {
          setWorkflowsLoading(false)
          setEvidenceLoading(false)
        }
      }
    }

    loadParcelDetails(selectedParcelId)

    return () => {
      isMounted = false
    }
  }, [selectedParcelId])

  const handleSignOut = async () => {
    const bc = createBrowserClient()
    await bc.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const mapParcels: ParcelMapItem[] = useMemo(() => {
    if (!selectedParcel) return []
    return [
      {
        id: selectedParcel.id,
        project_code: selectedParcel.project_code ?? null,
        parcel_number: selectedParcel.parcel_number ?? selectedParcel.parcel_no ?? null,
        parcel_no: selectedParcel.parcel_no ?? null,
        owner_name: selectedParcel.owner_name,
        village_name: selectedParcel.village_name,
        survey_number: selectedParcel.survey_number ?? selectedParcel.survey_no ?? null,
        survey_no: selectedParcel.survey_no ?? null,
        khasra_no: selectedParcel.khasra_no ?? null,
        notified_area_sqm: selectedParcel.notified_area_sqm ?? null,
        affected_area_sqm: selectedParcel.affected_area_sqm ?? null,
        possession_status: selectedParcel.possession_status ?? null,
        field_verification_status: selectedParcel.field_verification_status ?? null,
        latitude: selectedParcel.latitude ?? null,
        longitude: selectedParcel.longitude ?? null,
      },
    ]
  }, [selectedParcel])

  const STAGES_TIMELINE = useMemo(() => {
    const list = [
      {
        code: 'S3A',
        title: 'Preliminary Notification & Intent',
        section: 'Section 3A / 11',
        desc: 'Official notification of intent to acquire land published in the Gazette of India.',
        isMatch: (w: StatutoryWorkflowItem) => {
          const t = (w.workflow_type || w.stage_name || '').toLowerCase()
          return t.includes('3a') || t.includes('11') || t.includes('intent')
        },
      },
      {
        code: 'S3C',
        title: 'Hearing of Objections',
        section: 'Section 3C / 15',
        desc: 'Statutory 21-day window for affected landowners to file objections before the CALA/SLAO.',
        isMatch: (w: StatutoryWorkflowItem) => {
          const t = (w.workflow_type || w.stage_name || '').toLowerCase()
          return t.includes('3c') || t.includes('hearing') || t.includes('objection')
        },
      },
      {
        code: 'S3D',
        title: 'Declaration of Acquisition (Vesting)',
        section: 'Section 3D / 19',
        desc: 'Formal declaration published; land vests absolutely in the Government free from encumbrances.',
        isMatch: (w: StatutoryWorkflowItem) => {
          const t = (w.workflow_type || w.stage_name || '').toLowerCase()
          return t.includes('3d') || t.includes('19') || t.includes('declaration')
        },
      },
      {
        code: 'S23',
        title: 'Award Determination',
        section: 'Section 23 / 26',
        desc: 'Assessment of market value, solatium (100%), and 12% additional value determined by SLAO.',
        isMatch: (w: StatutoryWorkflowItem) => {
          const t = (w.workflow_type || w.stage_name || '').toLowerCase()
          return t.includes('23') || t.includes('award')
        },
      },
      {
        code: 'S3G',
        title: 'Compensation Disbursement (DBT)',
        section: 'Section 3G / PFMS',
        desc: 'Direct Benefit Transfer into the beneficiary bank account verified via PFMS portal.',
        isMatch: (w: StatutoryWorkflowItem) => {
          const t = (w.workflow_type || w.stage_name || '').toLowerCase()
          return t.includes('3g') || t.includes('compensation') || t.includes('disbursement')
        },
      },
      {
        code: 'S3H',
        title: 'Rehabilitation & Resettlement',
        section: 'Section 3H / Schedule II',
        desc: 'Resettlement grant, alternative housing plot or livelihood allowance distribution.',
        isMatch: (w: StatutoryWorkflowItem) => {
          const t = (w.workflow_type || w.stage_name || '').toLowerCase()
          return t.includes('3h') || t.includes('rehabilitation') || t.includes('resettlement')
        },
      },
      {
        code: 'POSS',
        title: 'Possession Handover',
        section: 'Section 16',
        desc: 'Physical possession taken and handed over to executing highway / corridor agency.',
        isMatch: (w: StatutoryWorkflowItem) => {
          const t = (w.workflow_type || w.stage_name || '').toLowerCase()
          return t.includes('possession') || t.includes('handover')
        },
      },
    ]

    return list.map((stage) => {
      const match = workflows.find(stage.isMatch)
      let status: 'Completed' | 'In Progress' | 'Pending' | 'Needs Review' = 'Pending'
      let date: string | null = null
      let approver: string | null = null
      let remarks: string | null = null

      if (match) {
        if (match.status === 'Approved') {
          status = 'Completed'
          date = match.approved_at || match.created_at
          approver = match.approved_by || 'Competent Authority'
        } else if (match.status === 'Pending Approval') {
          status = 'In Progress'
          date = match.created_at
          approver = match.submitted_by || 'Revenue Officer'
        } else if (match.status === 'Rejected') {
          status = 'Needs Review'
          date = match.updated_at || match.created_at
        }
        remarks = match.remarks || null
      } else {
        if (stage.code === 'S3G' && selectedParcel?.payment_status === 'Paid') {
          status = 'Completed'
          date = selectedParcel.payment_released_at ?? null
          remarks = selectedParcel.payment_reference
            ? `Disbursed under Ref: ${selectedParcel.payment_reference}`
            : null
        } else if (
          stage.code === 'S3G' &&
          (selectedParcel?.payment_status === 'Payment Pending' ||
            selectedParcel?.payment_status === 'Assessed')
        ) {
          status = 'In Progress'
        }

        if (stage.code === 'S3H' && selectedParcel?.rehabilitation_status === 'Completed') {
          status = 'Completed'
          date = selectedParcel.rehabilitation_completed_at ?? null
          remarks = selectedParcel.rehabilitation_remarks || null
        } else if (
          stage.code === 'S3H' &&
          selectedParcel?.rehabilitation_status === 'In Progress'
        ) {
          status = 'In Progress'
          remarks = selectedParcel.rehabilitation_remarks || null
        }

        if (
          stage.code === 'POSS' &&
          (selectedParcel?.possession_status === 'Possession Taken' ||
            selectedParcel?.possession_status === 'Acquired' ||
            selectedParcel?.possession_status === 'Completed')
        ) {
          status = 'Completed'
        } else if (
          stage.code === 'POSS' &&
          selectedParcel?.possession_status === 'In Progress'
        ) {
          status = 'In Progress'
        }
      }

      return {
        ...stage,
        status,
        date,
        approver,
        remarks,
      }
    })
  }, [workflows, selectedParcel])

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Tricolor National Stripe */}
      <div className="flex h-1 w-full">
        <div className="flex-1 bg-amber-500" />
        <div className="flex-1 bg-card" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary ring-1 ring-primary/20">
              <ChakraEmblem className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  National Land Acquisition Management System
                </p>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                  Owner Portal
                </span>
              </div>
              <h1 className="font-serif text-base sm:text-lg font-bold text-foreground truncate">
                Parcel Owner Portal
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                View the status and details of your land acquisition case.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right leading-tight">
              <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                {userName || selectedParcel?.owner_name || userEmail || 'Landowner'}
              </span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                {userEmail}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={fetchMyParcels}
                disabled={loading}
                title="Refresh Records"
                className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin text-primary')} />
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Loading State */}
        {loading && parcels.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center shadow-xs">
            <RefreshCw className="size-8 animate-spin text-primary mb-3" />
            <p className="font-medium text-foreground text-sm">Accessing Landowner Registry...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifying authenticated parcel ownership records.
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMsg && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-3">
            <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Unable to load parcel records</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Zero Parcels Linked State */}
        {!loading && parcels.length === 0 && !errorMsg && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center shadow-xs space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              <LandPlot className="size-6" />
            </div>
            <h2 className="font-serif text-base font-bold text-foreground">
              No parcels are currently linked to your account.
            </h2>
            <p className="mx-auto max-w-md text-xs text-muted-foreground leading-relaxed">
              If your land parcel has been notified under an active highway corridor, please confirm that your
              Aadhaar, survey documentation, and Revenue Khata records have been registered with your local Special
              Land Acquisition Officer (SLAO) or Competent Authority (CALA).
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={fetchMyParcels}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="size-3.5" />
                Check for Updates
              </button>
            </div>
          </div>
        )}

        {/* Parcels Found */}
        {parcels.length > 0 && (
          <>
            {/* Section 1: My Parcels Selector */}
            <section aria-labelledby="my-parcels-heading" className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="my-parcels-heading" className="font-serif text-sm font-bold text-foreground uppercase tracking-wider">
                    My Parcels ({parcels.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Select a parcel below to inspect case progress, compensation status, and statutory documents.
                  </p>
                </div>
                {userRole === 'Admin' && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 border border-amber-300">
                    Admin Preview Mode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {parcels.map((p) => {
                  const isSelected = p.id === selectedParcelId
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedParcelId(p.id)}
                      className={cn(
                        'text-left rounded-xl border p-4 transition-all relative shadow-2xs',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary">
                            <LandPlot className="size-3.5" />
                            {p.parcel_number || p.parcel_no || 'Parcel'}
                          </span>
                          <h3 className="font-semibold text-sm text-foreground mt-0.5">
                            {p.owner_name}
                          </h3>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            p.possession_status === 'Possession Taken' || p.possession_status === 'Acquired'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {p.possession_status || 'Pending'}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-t border-border/60 pt-2.5">
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-medium">Location</span>
                          <span className="font-medium text-foreground truncate block">
                            {p.village_name}{p.district ? `, ${p.district}` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-medium">Survey / Khasra</span>
                          <span className="font-mono font-semibold text-foreground truncate block">
                            {p.khasra_no || p.survey_number || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-medium">Notified Area</span>
                          <span className="font-mono text-foreground font-medium truncate block">
                            {p.notified_area_sqm ? `${p.notified_area_sqm.toLocaleString('en-IN')} sqm` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-medium">Corridor / Project</span>
                          <span className="font-mono text-primary font-medium truncate block">
                            {p.project_code || 'NHAI'}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 flex items-center justify-end text-primary text-[11px] font-semibold gap-1">
                          <span>Active Case</span>
                          <ChevronRight className="size-3.5" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Section 2: Selected Parcel Workspace */}
            {selectedParcel && (
              <div className="space-y-6 pt-2">
                {/* Section Navigation Tabs */}
                <div className="border-b border-border bg-card rounded-t-xl px-3 pt-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                  <div className="flex gap-2 shrink-0">
                    {[
                      { id: 'overview', label: 'Parcel Details', icon: LandPlot },
                      { id: 'status', label: 'Acquisition Status & Timeline', icon: FileText },
                      { id: 'compensation', label: 'Compensation & R&R', icon: Wallet },
                      { id: 'location', label: 'Location & GIS', icon: Compass },
                      { id: 'documents', label: 'Documents & Notices', icon: Paperclip },
                      { id: 'objections', label: 'My Objections', icon: AlertTriangle },
                    ].map((tab) => {
                      const Icon = tab.icon
                      const isActive = activeSection === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveSection(tab.id as any)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors',
                            isActive
                              ? 'border-primary text-primary bg-primary/5 rounded-t-md'
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                          )}
                        >
                          <Icon className="size-3.5" />
                          {tab.label}
                          {tab.id === 'objections' && objections.length > 0 && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                              {objections.length}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitError(null)
                        setSubmitSuccess(null)
                        setIsRaiseModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors shrink-0"
                    >
                      <AlertTriangle className="size-3.5" />
                      Raise Objection
                    </button>
                  </div>
                </div>

                {/* TAB 1: OVERVIEW / PARCEL DETAILS */}
                {activeSection === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Primary Details */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Official Land Parcel Identity
                            </span>
                            <h3 className="font-serif text-lg font-bold text-foreground">
                              {selectedParcel.parcel_number || selectedParcel.parcel_no}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                              <CheckCircle className="size-3 text-emerald-600" />
                              Ownership Verified
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Registered Owner</span>
                            <span className="font-bold text-foreground text-sm mt-0.5 block">
                              {selectedParcel.owner_name}
                            </span>
                          </div>
                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Khasra Number</span>
                            <span className="font-mono font-bold text-foreground text-sm mt-0.5 block">
                              {selectedParcel.khasra_no || 'N/A'}
                            </span>
                          </div>
                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Survey Number</span>
                            <span className="font-mono font-bold text-foreground text-sm mt-0.5 block">
                              {selectedParcel.survey_number || selectedParcel.survey_no || 'N/A'}
                            </span>
                          </div>

                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Village / Revenue Circle</span>
                            <span className="font-semibold text-foreground mt-0.5 block">
                              {selectedParcel.village_name}
                            </span>
                          </div>
                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Taluka / Tehsil</span>
                            <span className="font-semibold text-foreground mt-0.5 block">
                              {selectedParcel.taluka_name || 'Revenue Tehsil'}
                            </span>
                          </div>
                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">District & State</span>
                            <span className="font-semibold text-foreground mt-0.5 block">
                              {selectedParcel.district || 'Unspecified'}, {selectedParcel.state || 'India'}
                            </span>
                          </div>

                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Land Classification</span>
                            <span className="font-semibold text-foreground mt-0.5 block">
                              {selectedParcel.land_type || 'Agricultural'}
                            </span>
                          </div>
                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Highway Corridor Project</span>
                            <span className="font-mono font-semibold text-primary mt-0.5 block">
                              {selectedParcel.project_code || 'NHAI'}
                            </span>
                          </div>
                          <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Possession Status</span>
                            <span className="font-semibold text-foreground mt-0.5 block">
                              {selectedParcel.possession_status || 'In Progress'}
                            </span>
                          </div>
                        </div>

                        {/* Area Comparison Card */}
                        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">Land Demarcation & Area Ratio</span>
                            <span className="font-mono text-muted-foreground">
                              {selectedParcel.affected_area_sqm && selectedParcel.notified_area_sqm
                                ? `${Math.round((selectedParcel.affected_area_sqm / selectedParcel.notified_area_sqm) * 100)}% affected`
                                : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[11px] text-muted-foreground">Total Notified Area</p>
                              <p className="text-sm font-mono font-bold text-foreground">
                                {formatArea(selectedParcel.notified_area_sqm)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">Acquired / Affected Area</p>
                              <p className="text-sm font-mono font-bold text-primary">
                                {formatArea(selectedParcel.affected_area_sqm)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right 1 Col: Quick Status Summary */}
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                        <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                          Case Snapshot
                        </h4>

                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Payment Status:</span>
                            <span className={cn(
                              'font-semibold px-2 py-0.5 rounded text-[11px]',
                              selectedParcel.payment_status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            )}>
                              {selectedParcel.payment_status || 'Assessing'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Compensation:</span>
                            <span className="font-mono font-bold text-foreground">
                              {formatINR(selectedParcel.compensation_approved || selectedParcel.compensation_assessed || selectedParcel.compensation_amount)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Field Verification:</span>
                            <span className="font-medium text-foreground">
                              {selectedParcel.field_verification_status || 'Pending'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-muted-foreground">R&R Status:</span>
                            <span className="font-medium text-foreground">
                              {selectedParcel.rehabilitation_status || 'Not Started'}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg bg-blue-50/80 border border-blue-200 p-3 text-[11px] text-blue-900 leading-relaxed">
                          <p className="font-semibold flex items-center gap-1 text-blue-950">
                            <ShieldCheck className="size-3.5 text-blue-700" />
                            Official Landowner Notice
                          </p>
                          <p className="mt-1">
                            This portal displays live statutory acquisition records certified by the Ministry of Road
                            Transport & Highways and the Special Land Acquisition Officer.
                          </p>
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSubmitError(null)
                              setSubmitSuccess(null)
                              setIsRaiseModalOpen(true)
                            }}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 text-xs font-semibold shadow-2xs transition-colors"
                          >
                            <AlertTriangle className="size-3.5" />
                            Raise Objection for this Parcel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ACQUISITION STATUS & TIMELINE */}
                {activeSection === 'status' && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                      <div className="border-b border-border pb-3">
                        <h3 className="font-serif text-base font-bold text-foreground">
                          Statutory Acquisition Journey & Timeline
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Track statutory clearances from preliminary notification under Section 3A to final award determination.
                        </p>
                      </div>

                      {workflowsLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          <RefreshCw className="size-5 animate-spin text-primary mx-auto mb-2" />
                          <span>Loading statutory workflow records...</span>
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                          {STAGES_TIMELINE.map((stage, idx) => {
                            const isCompleted = stage.status === 'Completed'
                            const isInProgress = stage.status === 'In Progress'

                            return (
                              <div key={stage.code} className="relative group">
                                {/* Dot */}
                                <div
                                  className={cn(
                                    'absolute -left-6 top-1 size-5 rounded-full border-2 flex items-center justify-center bg-card transition-colors',
                                    isCompleted
                                      ? 'border-emerald-600 text-emerald-600 bg-emerald-50'
                                      : isInProgress
                                      ? 'border-amber-500 text-amber-600 bg-amber-50 animate-pulse'
                                      : 'border-muted-foreground/30 text-muted-foreground'
                                  )}
                                >
                                  {isCompleted ? (
                                    <CheckCircle className="size-3 stroke-[2.5]" />
                                  ) : isInProgress ? (
                                    <Clock className="size-3 stroke-[2.5]" />
                                  ) : (
                                    <div className="size-1.5 rounded-full bg-muted-foreground/40" />
                                  )}
                                </div>

                                <div className="rounded-lg border border-border bg-background p-4 space-y-2 shadow-2xs">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                        {stage.section}
                                      </span>
                                      <h4 className="font-semibold text-sm text-foreground">
                                        {stage.title}
                                      </h4>
                                    </div>
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold self-start sm:self-auto',
                                        isCompleted
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : isInProgress
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-slate-100 text-slate-700'
                                      )}
                                    >
                                      {stage.status}
                                    </span>
                                  </div>

                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {stage.desc}
                                  </p>

                                  {(stage.date || stage.approver || stage.remarks) && (
                                    <div className="rounded bg-accent/40 p-2.5 text-[11px] text-muted-foreground space-y-1 border border-border/50">
                                      {stage.date && (
                                        <p>
                                          <strong className="text-foreground">Recorded Date:</strong> {formatDate(stage.date)}
                                        </p>
                                      )}
                                      {stage.approver && (
                                        <p>
                                          <strong className="text-foreground">Authority Desk:</strong> {stage.approver}
                                        </p>
                                      )}
                                      {stage.remarks && (
                                        <p>
                                          <strong className="text-foreground">Official Remarks:</strong> {stage.remarks}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: COMPENSATION & R&R */}
                {activeSection === 'compensation' && (
                  <div className="space-y-6">
                    {/* Compensation Grid */}
                    <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                      <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-serif text-base font-bold text-foreground">
                            Compensation Assessment & Disbursement
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Official monetary award determined under Section 23/26 of RFCTLARR Act and Section 3G of NH Act.
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-semibold self-start sm:self-auto',
                            selectedParcel.payment_status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          )}
                        >
                          Payment Status: {selectedParcel.payment_status || 'Not Assessed'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-border bg-background p-4">
                          <div className="flex items-center justify-between text-muted-foreground text-xs">
                            <span>Compensation Assessed</span>
                            <Banknote className="size-4 text-primary" />
                          </div>
                          <p className="font-mono text-xl font-bold text-foreground mt-2">
                            {formatINR(selectedParcel.compensation_assessed || selectedParcel.compensation_amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Preliminary valuation by Revenue Tehsildar
                          </p>
                        </div>

                        <div className="rounded-xl border border-border bg-background p-4">
                          <div className="flex items-center justify-between text-muted-foreground text-xs">
                            <span>Compensation Approved</span>
                            <CheckCircle2 className="size-4 text-emerald-600" />
                          </div>
                          <p className="font-mono text-xl font-bold text-emerald-700 mt-2">
                            {formatINR(selectedParcel.compensation_approved || selectedParcel.compensation_amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Approved by Competent Authority (CALA)
                          </p>
                        </div>

                        <div className="rounded-xl border border-border bg-background p-4">
                          <div className="flex items-center justify-between text-muted-foreground text-xs">
                            <span>Compensation Disbursed</span>
                            <Wallet className="size-4 text-blue-600" />
                          </div>
                          <p className="font-mono text-xl font-bold text-blue-700 mt-2">
                            {formatINR(selectedParcel.compensation_paid)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Disbursed via PFMS Direct Benefit Transfer
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/80 bg-accent/30 p-4 text-xs space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">PFMS Payment Reference</span>
                            <p className="font-mono font-semibold text-foreground text-sm mt-0.5">
                              {selectedParcel.payment_reference || 'Pending Disbursement Batch Generation'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Payment Release Date</span>
                            <p className="font-medium text-foreground mt-0.5">
                              {formatDate(selectedParcel.payment_released_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rehabilitation & Resettlement (R&R) */}
                    <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                      <div className="border-b border-border pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-base font-bold text-foreground">
                            Rehabilitation & Resettlement (R&R)
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Entitlements provided under Section 3H / Schedule II of RFCTLARR Act.
                          </p>
                        </div>
                        <span className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-semibold',
                          selectedParcel.rehabilitation_status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        )}>
                          R&R: {selectedParcel.rehabilitation_status || 'Not Started'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">R&R Grant Package</span>
                          <p className="font-mono text-lg font-bold text-foreground">
                            {formatINR(selectedParcel.rehabilitation_amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Livelihood support & resettlement allowance
                          </p>
                        </div>

                        <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Allotment / Case Remarks</span>
                          <p className="font-medium text-foreground mt-1 leading-relaxed">
                            {selectedParcel.rehabilitation_remarks || 'No resettlement remarks recorded.'}
                          </p>
                          {selectedParcel.rehabilitation_completed_at && (
                            <p className="text-[10px] text-emerald-700 font-semibold pt-1">
                              Completed on {formatDate(selectedParcel.rehabilitation_completed_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: LOCATION & GIS */}
                {activeSection === 'location' && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                      <div className="border-b border-border pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-base font-bold text-foreground">
                            Geographic Location & Survey Map
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Demarcated ground coordinates surveyed for {selectedParcel.parcel_number || selectedParcel.parcel_no}.
                          </p>
                        </div>
                        {selectedParcel.latitude && selectedParcel.longitude && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <MapPin className="size-3.5 text-primary" />
                            <span>{selectedParcel.latitude.toFixed(6)}, {selectedParcel.longitude.toFixed(6)}</span>
                          </div>
                        )}
                      </div>

                      {/* Map Container */}
                      {selectedParcel.latitude && selectedParcel.longitude ? (
                        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border">
                          <ParcelMap
                            parcels={mapParcels}
                            selectedParcelId={selectedParcel.id}
                            onSelectParcel={() => {}}
                          />
                        </div>
                      ) : (
                        <div className="p-12 text-center border border-dashed rounded-lg border-border space-y-2">
                          <Compass className="size-8 text-muted-foreground mx-auto" />
                          <p className="text-sm font-semibold text-foreground">
                            Geographic coordinates pending field survey demarcation
                          </p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            The revenue survey team has not yet uploaded finalized boundary GPS coordinates for this parcel.
                          </p>
                        </div>
                      )}

                      {/* Location Metadata Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                        <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Village</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedParcel.village_name}</p>
                        </div>
                        <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tehsil</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedParcel.taluka_name || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">District</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedParcel.district || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-accent/40 p-3 border border-border/60">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">State</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedParcel.state || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: DOCUMENTS & NOTICES */}
                {activeSection === 'documents' && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                      <div className="border-b border-border pb-3">
                        <h3 className="font-serif text-base font-bold text-foreground">
                          Notices & Inspection Documents
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Authorized statutory Gazette records and ground inspection evidence for your parcel.
                        </p>
                      </div>

                      {evidenceLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          <RefreshCw className="size-5 animate-spin text-primary mx-auto mb-2" />
                          <span>Retrieving authorized documents...</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Gazette & Statutory Notification Records */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Statutory Gazette Records
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {workflows.filter((w) => w.status === 'Approved').length > 0 ? (
                                workflows
                                  .filter((w) => w.status === 'Approved')
                                  .map((wf) => (
                                    <div
                                      key={wf.id}
                                      className="rounded-lg border border-border bg-background p-3.5 space-y-1.5 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                          {wf.workflow_type || wf.stage_name}
                                        </span>
                                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                          <CheckCircle className="size-3" />
                                          Approved
                                        </span>
                                      </div>
                                      <p className="text-xs font-semibold text-foreground">
                                        Gazette Notification Clearance
                                      </p>
                                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                                        {wf.remarks || 'Published in the Gazette of India Extraordinary.'}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                        Approved on {formatDate(wf.approved_at || wf.created_at)} by {wf.approved_by || 'Competent Authority'}
                                      </p>
                                    </div>
                                  ))
                              ) : (
                                <div className="col-span-2 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                                  No approved statutory notifications issued yet.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Field Evidence Documents */}
                          <div className="space-y-2 pt-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Survey Evidence & Field Records ({evidenceList.length})
                            </h4>

                            {evidenceList.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {evidenceList.map((ev) => (
                                  <div
                                    key={ev.id}
                                    className="rounded-lg border border-border bg-background p-3.5 flex items-start justify-between gap-3 shadow-2xs"
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                                        <ImageIcon className="size-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-xs text-foreground truncate">
                                          {ev.file_name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          {(ev.file_size_bytes / 1024).toFixed(1)} KB &middot; {formatDate(ev.created_at)}
                                        </p>
                                        {ev.description && (
                                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                                            {ev.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {ev.signed_url && (
                                      <a
                                        href={ev.signed_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-colors shrink-0"
                                      >
                                        <ExternalLink className="size-3" />
                                        View
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                                No field inspection photographs or survey documents uploaded yet.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 6: MY OBJECTIONS */}
                {activeSection === 'objections' && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-base font-bold text-foreground">
                              My Registered Objections &amp; Grievances
                            </h3>
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                              Section 3C Hearing
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Formal objections filed for your notified parcels under the statutory RFCTLARR / NH Act processes.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSubmitError(null)
                            setSubmitSuccess(null)
                            setIsRaiseModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
                        >
                          <AlertTriangle className="size-3.5" />
                          Raise Objection
                        </button>
                      </div>

                      {objectionsLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          <RefreshCw className="size-5 animate-spin text-primary mx-auto mb-2" />
                          <span>Loading objections records...</span>
                        </div>
                      ) : objections.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-3">
                          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            <AlertTriangle className="size-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-foreground">No objections raised yet</h4>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                              If you have concerns regarding parcel boundary, compensation assessment, or statutory notification, you can raise an objection using the button above.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSubmitError(null)
                              setSubmitSuccess(null)
                              setIsRaiseModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
                          >
                            <AlertTriangle className="size-3.5" />
                            Raise Objection for this Parcel
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {objections.map((obj, idx) => {
                            const objNo = `OBJ-${new Date(obj.submitted_at || Date.now()).getFullYear()}-${String(idx + 1).padStart(4, '0')}`
                            const isResolved = obj.status === 'Resolved'
                            const isRejected = obj.status === 'Rejected'
                            const isUnderReview = obj.status === 'Under Review'

                            return (
                              <div
                                key={obj.id}
                                className="rounded-xl border border-border bg-background p-4 space-y-3 shadow-2xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-foreground">
                                      {objNo}
                                    </span>
                                    <span className="font-mono text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded font-semibold">
                                      {obj.parcel_number || obj.parcel_id.slice(0, 8)}
                                    </span>
                                    <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                                      {obj.objection_type}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                        obj.status === 'Submitted' && 'bg-blue-50 text-blue-700 border border-blue-200',
                                        isUnderReview && 'bg-amber-50 text-amber-800 border border-amber-200',
                                        isResolved && 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                                        isRejected && 'bg-red-50 text-red-800 border border-red-200'
                                      )}
                                    >
                                      {obj.status === 'Submitted' && <Clock className="size-3" />}
                                      {isUnderReview && <RefreshCw className="size-3 animate-spin text-amber-600" />}
                                      {isResolved && <CheckCircle className="size-3 text-emerald-600" />}
                                      {isRejected && <AlertCircle className="size-3 text-red-600" />}
                                      {obj.status}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 text-xs">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Objection Grounds / Statement:
                                  </p>
                                  <p className="text-foreground leading-relaxed">
                                    {obj.description}
                                  </p>
                                </div>

                                {obj.resolution_remarks && (
                                  <div className="rounded-lg bg-muted/40 p-3 text-xs border border-border/60 space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-semibold text-foreground flex items-center gap-1">
                                        <MessageSquare className="size-3.5 text-primary" />
                                        Official Competent Authority Decision:
                                      </span>
                                      {obj.resolved_at && (
                                        <span className="text-muted-foreground font-mono text-[10px]">
                                          {formatDate(obj.resolved_at)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-muted-foreground italic">
                                      &ldquo;{obj.resolution_remarks}&rdquo;
                                    </p>
                                    {obj.reviewer_name && (
                                      <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                                        Reviewed by: {obj.reviewer_name}
                                      </p>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                                  <span>
                                    Submitted on {formatDate(obj.submitted_at)}
                                    {obj.village_name ? ` · Village: ${obj.village_name}` : ''}
                                    {obj.survey_number ? ` · Survey: ${obj.survey_number}` : ''}
                                  </span>

                                  {obj.evidence && obj.evidence.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      {obj.evidence.map((ev) => (
                                        <div key={ev.id} className="flex items-center gap-1">
                                          {ev.signed_url ? (
                                            <a
                                              href={ev.signed_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                                            >
                                              <Paperclip className="size-3" />
                                              <span>{ev.file_name}</span>
                                              <ExternalLink className="size-2.5" />
                                            </a>
                                          ) : (
                                            <span className="flex items-center gap-1">
                                              <Paperclip className="size-3" />
                                              <span>{ev.file_name}</span>
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Raise Objection Modal */}
      {isRaiseModalOpen && selectedParcel && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-amber-600" />
                  Raise Statutory Objection (Section 3C)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  RFCTLARR Act, 2013 &middot; Official Landowner Dispute Hearing
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!submitLoading) {
                    setIsRaiseModalOpen(false)
                    setSubmitError(null)
                    setSubmitSuccess(null)
                  }
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Read-Only Parcel Context */}
            <div className="rounded-lg bg-muted/30 p-3 text-xs border border-border/60 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Target Land Parcel (Read-Only)
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Parcel ID: </span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedParcel.parcel_number || selectedParcel.parcel_no}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Survey / Khasra: </span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedParcel.khasra_no || selectedParcel.survey_number || selectedParcel.survey_no || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Village: </span>
                  <span className="font-medium text-foreground">
                    {selectedParcel.village_name}{selectedParcel.district ? `, ${selectedParcel.district}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Owner: </span>
                  <span className="font-medium text-foreground">
                    {selectedParcel.owner_name}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitObjection} className="space-y-4 text-xs">
              {/* Objection Category */}
              <div className="space-y-1.5">
                <label htmlFor="objection-category" className="font-semibold text-foreground">
                  Objection Category / Grounds <span className="text-red-500">*</span>
                </label>
                <select
                  id="objection-category"
                  value={objectionType}
                  onChange={(e) => setObjectionType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {CONTROLLED_OBJECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="objection-desc" className="font-semibold text-foreground">
                    Detailed Statement of Objection <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {objectionDescription.length} characters (min 5)
                  </span>
                </div>
                <textarea
                  id="objection-desc"
                  rows={4}
                  value={objectionDescription}
                  onChange={(e) => setObjectionDescription(e.target.value)}
                  placeholder="Clearly describe your specific objections regarding land boundary, valuation, compensation rate, or notice timeline..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Supporting Document Upload */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground block">
                  Supporting Document / Evidence (Optional)
                </label>
                <div className="rounded-lg border border-dashed border-input p-3 bg-background flex flex-col items-center justify-center text-center space-y-1">
                  <Upload className="size-4 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">
                    Upload land registry, revenue map, or Aadhaar affidavit (JPG, PNG, WEBP, PDF up to 10MB)
                  </p>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileChange}
                    className="text-[11px] text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-secondary/80 cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="pt-1 text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                      <Check className="size-3" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-600 hover:underline ml-1"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {fileError && (
                    <p className="text-[11px] text-red-600 font-medium">{fileError}</p>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-800 border border-red-200">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  disabled={submitLoading}
                  onClick={() => setIsRaiseModalOpen(false)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading || objectionDescription.trim().length < 5}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                >
                  {submitLoading ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="size-3.5" />
                  )}
                  Submit Objection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
