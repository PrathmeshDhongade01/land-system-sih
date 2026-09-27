'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

const ParcelMap = dynamic(() => import('@/components/ParcelMap'), { ssr: false })

import {
  LandPlot, CheckCircle2, Clock, AlertCircle, Search, Filter, CheckCircle,
  X, LogOut, RefreshCw, User, Building2, MapPin, FileCheck, ShieldAlert,
  RotateCcw, Layers, ChevronRight, Upload, FileText, Trash2, ExternalLink,
  Paperclip, Image as ImageIcon, Camera, Navigation, NavigationOff, Play,
  Square, Crosshair, WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ParcelContextHub from '@/components/ParcelContextHub'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LandParcelRecord {
  id: string; project_id: string | null; project_code: string | null
  parcel_number: string | null; parcel_no?: string | null
  owner_name: string; village_name: string
  survey_number: string | null; survey_no?: string | null; khasra_no?: string | null
  notified_area_sqm: number | null; affected_area_sqm: number | null
  possession_status: string | null; land_type: string | null
  field_verification_status: string | null; field_verified_at: string | null
  field_verified_by: string | null; field_remarks: string | null
  latitude: number | null; longitude: number | null
  compensation_assessed?: number | null; compensation_approved?: number | null
  compensation_paid?: number | null; payment_status?: string | null
  rehabilitation_status?: string | null; created_at?: string; updated_at?: string
}

interface ProjectRecord { id: string; project_code: string; project_name: string }

interface FieldEvidenceItem {
  id: string; parcel_id: string; file_name: string; storage_path: string
  file_type: string; file_size_bytes: number; description: string | null
  uploaded_by_email: string | null; created_at: string; signed_url: string | null
  captured_latitude?: number | null; captured_longitude?: number | null
  captured_accuracy_m?: number | null
}

interface FileQueueItem {
  id: string; file: File; previewUrl: string | null
  description: string; status: 'pending' | 'uploading' | 'done' | 'error'
  errorMsg: string | null
}

type GpsStatus = 'idle' | 'requesting' | 'acquired' | 'denied' | 'unavailable' | 'timeout'

interface GpsCoords { latitude: number; longitude: number; accuracy: number; timestamp: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_UPDATE_ROLES = new Set(['Admin', 'SLAO', 'CALA', 'MoRTH Nodal Officer', 'Field Officer'])
const ALLOWED_DELETE_ROLES = new Set(['Admin', 'SLAO'])
const ALLOWED_MIME_TYPES_CLIENT = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_FILE_SIZE = 10 * 1024 * 1024

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function uniqueId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }

// ─── GPS Status Panel ─────────────────────────────────────────────────────────

function GpsStatusPanel({ gpsStatus, gpsCoords, onRequest }: {
  gpsStatus: GpsStatus; gpsCoords: GpsCoords | null; onRequest: () => void
}) {
  const cfg: Record<GpsStatus, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: 'GPS not started', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: <Navigation className="size-4 text-slate-400" /> },
    requesting: { label: 'Requesting location…', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <RefreshCw className="size-4 text-amber-500 animate-spin" /> },
    acquired: { label: 'Location acquired', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <Crosshair className="size-4 text-emerald-600" /> },
    denied: { label: 'Permission denied — enable location in browser settings', color: 'text-red-700 bg-red-50 border-red-200', icon: <NavigationOff className="size-4 text-red-500" /> },
    unavailable: { label: 'Location unavailable on this device', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: <WifiOff className="size-4 text-orange-500" /> },
    timeout: { label: 'GPS timed out — tap Refresh GPS to retry', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: <Clock className="size-4 text-orange-500" /> },
  }
  const c = cfg[gpsStatus]
  return (
    <div className={cn('rounded-lg border p-3 space-y-2 text-xs', c.color)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">{c.icon}<span>{c.label}</span></div>
        {gpsStatus !== 'requesting' && (
          <button type="button" onClick={onRequest}
            className="inline-flex items-center gap-1 rounded-md border border-current/30 bg-white/50 px-2.5 py-1 text-xs font-medium hover:bg-white/80 transition-colors shrink-0">
            <RefreshCw className="size-3" />
            {gpsStatus === 'idle' ? 'Get GPS' : 'Refresh GPS'}
          </button>
        )}
      </div>
      {gpsStatus === 'acquired' && gpsCoords && (
        <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
          {[
            { label: 'Latitude', value: `${gpsCoords.latitude.toFixed(6)}°` },
            { label: 'Longitude', value: `${gpsCoords.longitude.toFixed(6)}°` },
            { label: 'Accuracy', value: `±${gpsCoords.accuracy.toFixed(0)} m` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/60 rounded p-2">
              <span className="block text-emerald-600 font-semibold uppercase text-[9px] tracking-wider mb-0.5">{label}</span>
              <span className="font-bold text-emerald-900">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── File Queue Row ───────────────────────────────────────────────────────────

function FileQueueRow({ item, onRemove, onDescriptionChange }: {
  item: FileQueueItem; onRemove: (id: string) => void; onDescriptionChange: (id: string, d: string) => void
}) {
  const isImage = item.file.type.startsWith('image/')
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3 p-3 rounded-lg border transition-colors',
      item.status === 'done' && 'border-emerald-200 bg-emerald-50/50',
      item.status === 'error' && 'border-red-200 bg-red-50/50',
      item.status === 'uploading' && 'border-amber-200 bg-amber-50/50',
      item.status === 'pending' && 'border-border bg-card',
    )}>
      <div className="shrink-0">
        {isImage && item.previewUrl
          ? <img src={item.previewUrl} alt={item.file.name} className="w-16 h-16 object-cover rounded-md border border-border" />
          : <div className="w-16 h-16 flex items-center justify-center rounded-md border border-border bg-slate-100"><FileText className="size-7 text-blue-500" /></div>
        }
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="text-xs font-medium text-foreground truncate" title={item.file.name}>{item.file.name}</p>
          <p className="text-[10px] text-muted-foreground">{formatBytes(item.file.size)} · {item.file.type.split('/')[1]?.toUpperCase()}</p>
        </div>
        {item.status === 'pending' && (
          <input type="text" placeholder="Description (optional)" value={item.description}
            onChange={(e) => onDescriptionChange(item.id, e.target.value)}
            className="w-full rounded border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
        )}
        {item.status === 'uploading' && <div className="flex items-center gap-1.5 text-[11px] text-amber-700"><RefreshCw className="size-3 animate-spin" /> Uploading…</div>}
        {item.status === 'done' && <div className="flex items-center gap-1.5 text-[11px] text-emerald-700"><CheckCircle className="size-3" /> Uploaded</div>}
        {item.status === 'error' && item.errorMsg && <div className="flex items-start gap-1.5 text-[11px] text-red-700"><AlertCircle className="size-3 shrink-0 mt-0.5" /><span>{item.errorMsg}</span></div>}
      </div>
      {item.status === 'pending' && (
        <button type="button" onClick={() => onRemove(item.id)} title="Remove"
          className="shrink-0 self-start p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}


// ─── Main Content Component ────────────────────────────────────────────────────

function FieldVerificationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parcelIdParam = searchParams.get('parcel_id')
  const hasAutoOpenedRef = useRef<boolean>(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  const [parcels, setParcels] = useState<LandParcelRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [assignedParcelIds, setAssignedParcelIds] = useState<Set<string> | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const [projectFilter, setProjectFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [selectedParcel, setSelectedParcel] = useState<LandParcelRecord | null>(null)
  const [hubParcelId, setHubParcelId] = useState<string | null>(null)
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [modalRemarks, setModalRemarks] = useState<string>('')
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [evidenceList, setEvidenceList] = useState<FieldEvidenceItem[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([])
  const [uploadingAll, setUploadingAll] = useState<boolean>(false)
  const [uploadSummary, setUploadSummary] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [visitActive, setVisitActive] = useState<boolean>(false)
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle')
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null)

  // Auth
  useEffect(() => {
    const bc = createBrowserClient()
    bc.auth.getUser().then((res: any) => {
      const data = res?.data
      if (data?.user) {
        setUserEmail(data.user.email ?? null)
        bc.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
          .then((profRes: any) => { const prof = profRes?.data; if (prof?.role) setUserRole(prof.role) })
      }
    })
  }, [])

  const handleSignOut = async () => {
    await createBrowserClient().auth.signOut()
    router.push('/login'); router.refresh()
  }

  // GPS
  const requestGps = useCallback(() => {
    if (!('geolocation' in navigator)) { setGpsStatus('unavailable'); return }
    setGpsStatus('requesting'); setGpsCoords(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp })
        setGpsStatus('acquired')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsStatus('denied')
        else if (err.code === err.TIMEOUT) setGpsStatus('timeout')
        else setGpsStatus('unavailable')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  useEffect(() => { if (visitActive && gpsStatus === 'idle') requestGps() }, [visitActive, gpsStatus, requestGps])

  // Projects
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await createBrowserClient().from('projects').select('id, project_code, project_name').order('project_code', { ascending: true })
      if (!error && data) setProjects(data)
    } catch {}
  }, [])

  // Assigned parcel IDs (Field Officer scope)
  const fetchAssignedParcelIds = useCallback(async () => {
    try {
      const res = await fetch('/api/assignments?assigned_to_me=true&status=Active')
      const json = await res.json()
      if (res.ok && json.success && Array.isArray(json.data)) {
        setAssignedParcelIds(new Set<string>(json.data.map((a: any) => a.parcel_id as string).filter(Boolean)))
      } else { setAssignedParcelIds(new Set()) }
    } catch { setAssignedParcelIds(new Set()) }
  }, [])

  // Parcels
  const fetchParcels = useCallback(async () => {
    setLoading(true); setErrorMsg(null)
    try {
      const p = new URLSearchParams()
      if (projectFilter !== 'All') p.set('project_code', projectFilter)
      if (statusFilter !== 'All') p.set('verification_status', statusFilter)
      if (searchQuery.trim()) p.set('search', searchQuery.trim())
      const res = await fetch(`/api/parcels${p.toString() ? `?${p}` : ''}`)
      const json = await res.json()
      if (!res.ok || !json.success) { setErrorMsg(json.error || 'Failed to fetch land parcels.'); setParcels([]); return }
      setParcels(json.data || [])
    } catch (err: any) { setErrorMsg(err?.message || 'Network error.') } finally { setLoading(false) }
  }, [projectFilter, statusFilter, searchQuery])

  // Evidence
  const fetchEvidence = useCallback(async (parcelId: string) => {
    setEvidenceLoading(true); setEvidenceList([])
    try {
      const res = await fetch(`/api/evidence?parcel_id=${parcelId}`)
      const json = await res.json()
      if (res.ok && json.success) setEvidenceList(json.data || [])
    } catch {} finally { setEvidenceLoading(false) }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => { fetchParcels() }, [fetchParcels])
  useEffect(() => {
    if (userRole === 'Field Officer') fetchAssignedParcelIds()
    else if (userRole !== null) setAssignedParcelIds(null)
  }, [userRole, fetchAssignedParcelIds])

  const isFieldOfficer = userRole === 'Field Officer'
  const isLoadingScope = isFieldOfficer && assignedParcelIds === null

  const visibleParcels: LandParcelRecord[] = (isFieldOfficer && assignedParcelIds !== null)
    ? parcels.filter((p) => assignedParcelIds.has(p.id))
    : parcels

  const totalCount = visibleParcels.length
  const verifiedCount = visibleParcels.filter(p => p.field_verification_status === 'Verified').length
  const pendingCount = visibleParcels.filter(p => p.field_verification_status === 'Pending').length
  const needsReviewCount = visibleParcels.filter(p => p.field_verification_status === 'Needs Review').length

  const openVerificationModal = useCallback((parcel: LandParcelRecord) => {
    setSelectedParcel(parcel); setModalRemarks(parcel.field_remarks || '')
    setModalError(null); setFileQueue([]); setUploadError(null); setUploadSummary(null)
    setIsModalOpen(true); fetchEvidence(parcel.id)
  }, [fetchEvidence])

  useEffect(() => {
    if (parcelIdParam && parcels.length > 0 && !hasAutoOpenedRef.current) {
      const id = parcelIdParam.trim()
      const target = parcels.find(p => p.id === id)
      if (target) {
        if (isFieldOfficer && assignedParcelIds !== null && !assignedParcelIds.has(id)) return
        hasAutoOpenedRef.current = true; openVerificationModal(target)
      }
    }
  }, [parcelIdParam, parcels, openVerificationModal, isFieldOfficer, assignedParcelIds])

  const handleVerificationAction = async (newStatus: 'Verified' | 'Needs Review' | 'Pending') => {
    if (!selectedParcel?.id) return
    setModalSubmitting(true); setModalError(null)
    try {
      const res = await fetch('/api/parcels', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedParcel.id, field_verification_status: newStatus, field_remarks: modalRemarks }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) { setModalError(json.error || `Failed to update status.`); return }
      setIsModalOpen(false); setSelectedParcel(null)
      setSuccessToast(`Status updated to "${newStatus}".`); setTimeout(() => setSuccessToast(null), 4000)
      await fetchParcels()
    } catch (err: any) { setModalError(err?.message || 'Network error.') } finally { setModalSubmitting(false) }
  }

  const validateAndQueueFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const errors: string[] = []; const newItems: FileQueueItem[] = []
    Array.from(files).forEach(file => {
      if (!ALLOWED_MIME_TYPES_CLIENT.has(file.type.toLowerCase())) { errors.push(`${file.name}: Unsupported type`); return }
      if (file.size > MAX_FILE_SIZE) { errors.push(`${file.name}: Exceeds 10 MB`); return }
      if (file.size === 0) { errors.push(`${file.name}: Empty file`); return }
      newItems.push({ id: uniqueId(), file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null, description: '', status: 'pending', errorMsg: null })
    })
    if (errors.length > 0) setUploadError(errors.join('\n')); else setUploadError(null)
    setFileQueue(prev => [...prev, ...newItems]); setUploadSummary(null)
  }

  const removeFromQueue = (id: string) => setFileQueue(prev => { const item = prev.find(i => i.id === id); if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl); return prev.filter(i => i.id !== id) })
  const updateDescription = (id: string, desc: string) => setFileQueue(prev => prev.map(i => i.id === id ? { ...i, description: desc } : i))

  const closeModal = () => {
    fileQueue.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl) })
    setFileQueue([]); setIsModalOpen(false); setSelectedParcel(null); setUploadError(null); setUploadSummary(null)
  }

  const handleUploadAll = async () => {
    if (!selectedParcel || uploadingAll) return
    const pending = fileQueue.filter(i => i.status === 'pending')
    if (pending.length === 0) return
    setUploadingAll(true); setUploadError(null); setUploadSummary(null)
    const currentGps = (visitActive && gpsStatus === 'acquired') ? gpsCoords : null
    let done = 0; let fail = 0
    for (const item of pending) {
      setFileQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i))
      try {
        const fd = new FormData()
        fd.append('parcel_id', selectedParcel.id); fd.append('file', item.file)
        if (item.description.trim()) fd.append('description', item.description.trim())
        if (currentGps) {
          fd.append('captured_latitude', String(currentGps.latitude))
          fd.append('captured_longitude', String(currentGps.longitude))
          fd.append('captured_accuracy_m', String(currentGps.accuracy))
        }
        const res = await fetch('/api/evidence', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok || !json.success) { setFileQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: json.error || 'Upload failed' } : i)); fail++ }
        else { setFileQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done' } : i)); done++ }
      } catch (err: any) { setFileQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: err?.message || 'Network error' } : i)); fail++ }
    }
    setUploadingAll(false)
    if (done > 0 && fail === 0) { setUploadSummary(`${done} file${done > 1 ? 's' : ''} uploaded.`); setSuccessToast(`${done} evidence file${done > 1 ? 's' : ''} uploaded.`); setTimeout(() => setSuccessToast(null), 4000) }
    else if (done > 0) setUploadSummary(`${done} uploaded, ${fail} failed.`)
    else setUploadError(`All ${fail} upload${fail > 1 ? 's' : ''} failed.`)
    await fetchEvidence(selectedParcel.id)
  }

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('Delete this field evidence item?')) return
    setDeletingId(evidenceId)
    try {
      const res = await fetch(`/api/evidence?id=${evidenceId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) { alert(json.error || 'Delete failed.'); return }
      setSuccessToast('Evidence deleted.'); setTimeout(() => setSuccessToast(null), 4000)
      if (selectedParcel) await fetchEvidence(selectedParcel.id)
    } catch (err: any) { alert(err?.message || 'Network error.') } finally { setDeletingId(null) }
  }

  const isRoleAuthorized = userRole ? ALLOWED_UPDATE_ROLES.has(userRole) : false
  const isDeleteAuthorized = userRole ? ALLOWED_DELETE_ROLES.has(userRole) : false
  const pendingUploadCount = fileQueue.filter(i => i.status === 'pending').length


  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:top-5 z-[60] rounded-lg border border-emerald-600/30 bg-emerald-50 p-4 shadow-xl text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="size-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700"><LandPlot className="size-5" /></div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground tracking-tight">Field Verification</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {isFieldOfficer ? 'Verify your assigned land parcels.' : 'Verify land parcels and record field inspection status.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userEmail && (
            <div className="flex items-center gap-2 border-r border-border pr-3">
              <div className="leading-tight text-right">
                <span className="text-xs font-medium text-foreground block truncate max-w-[160px]" title={userEmail}>{userEmail}</span>
                {userRole && <span className="text-[10px] font-semibold text-emerald-700 block">{userRole}</span>}
              </div>
              <button type="button" onClick={handleSignOut} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                <LogOut className="size-3.5" /> Logout
              </button>
            </div>
          )}
          <button type="button" onClick={fetchParcels} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /><span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Field Officer scope banner */}
      {isFieldOfficer && (
        <div className={cn('rounded-lg border p-3 text-xs flex items-center gap-2',
          isLoadingScope ? 'border-amber-200 bg-amber-50 text-amber-800'
            : (assignedParcelIds && assignedParcelIds.size === 0) ? 'border-slate-200 bg-slate-50 text-slate-700'
              : 'border-blue-200 bg-blue-50 text-blue-800')}>
          <User className="size-4 shrink-0" />
          {isLoadingScope ? 'Loading your assigned parcels…'
            : (assignedParcelIds && assignedParcelIds.size === 0) ? 'No parcels currently assigned to you. Contact your SLAO/Admin.'
              : `Showing ${assignedParcelIds?.size ?? 0} parcel(s) assigned to you.`}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Parcels', value: totalCount, color: 'border-border bg-card', textColor: 'text-foreground', icon: <Layers className="size-5" />, iconBg: 'bg-slate-100 text-slate-700' },
          { label: 'Pending', value: pendingCount, color: 'border-amber-200 bg-amber-50/50', textColor: 'text-amber-900', icon: <Clock className="size-5" />, iconBg: 'bg-amber-100 text-amber-700' },
          { label: 'Verified', value: verifiedCount, color: 'border-emerald-200 bg-emerald-50/50', textColor: 'text-emerald-900', icon: <CheckCircle2 className="size-5" />, iconBg: 'bg-emerald-100 text-emerald-700' },
          { label: 'Needs Review', value: needsReviewCount, color: 'border-blue-200 bg-blue-50/50', textColor: 'text-blue-900', icon: <AlertCircle className="size-5" />, iconBg: 'bg-blue-100 text-blue-700' },
        ].map(({ label, value, color, textColor, icon, iconBg }) => (
          <div key={label} className={cn('rounded-lg border p-4 shadow-xs flex items-center justify-between', color)}>
            <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p><p className={cn('text-2xl font-bold mt-1', textColor)}>{value}</p></div>
            <div className={cn('flex size-10 items-center justify-center rounded-full', iconBg)}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        {!isFieldOfficer && (
          <div className="flex items-center gap-2 min-w-[200px]">
            <Building2 className="size-4 text-muted-foreground shrink-0" />
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="All">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.project_code}>{p.project_code} — {p.project_name}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2 min-w-[160px]">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Needs Review">Needs Review</option>
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input type="text" placeholder="Search owner, village, parcel…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}
        </div>
      </div>

      {/* GIS Map */}
      <div className="space-y-2">
        <h2 className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
          <MapPin className="size-4 text-emerald-600" />
          <span>GIS Land Parcel Map ({visibleParcels.filter(p => p.latitude && p.longitude).length} mapped)</span>
        </h2>
        <ParcelMap parcels={visibleParcels} selectedParcelId={selectedParcel?.id || null} onSelectParcel={(p) => openVerificationModal(p as LandParcelRecord)} />
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-3">
          <AlertCircle className="size-4 shrink-0 text-red-600" /><span>{errorMsg}</span>
        </div>
      )}

      {/* Parcel Table */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Parcel Number</th><th className="p-3.5">Owner Name</th>
                <th className="p-3.5 hidden md:table-cell">Village / Survey</th>
                <th className="p-3.5 hidden lg:table-cell">Notified Area</th>
                <th className="p-3.5 hidden xl:table-cell">Affected Area</th>
                <th className="p-3.5 hidden sm:table-cell">Possession Status</th>
                <th className="p-3.5">Verification Status</th>
                <th className="p-3.5 hidden lg:table-cell">Last Verified</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(loading || isLoadingScope) ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2"><RefreshCw className="size-4 animate-spin text-primary" /><span>Loading land parcels…</span></div>
                </td></tr>
              ) : visibleParcels.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">
                  {isFieldOfficer ? 'No assigned parcels found. Contact your SLAO or Admin.' : 'No land parcels found matching the current filters.'}
                </td></tr>
              ) : visibleParcels.map(parcel => {
                const status = parcel.field_verification_status || 'Pending'
                const parcelNo = parcel.parcel_number || parcel.parcel_no || 'N/A'
                const surveyNo = parcel.survey_number || parcel.survey_no || parcel.khasra_no || 'N/A'
                return (
                  <tr key={parcel.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-medium text-foreground">
                      <span className="font-mono">{parcelNo}</span>
                      {parcel.project_code && <span className="block text-[10px] text-muted-foreground">{parcel.project_code}</span>}
                    </td>
                    <td className="p-3.5 text-foreground font-medium">{parcel.owner_name}</td>
                    <td className="p-3.5 hidden md:table-cell">
                      <span>{parcel.village_name}</span>
                      <span className="block text-[10px] text-muted-foreground">Survey: {surveyNo}</span>
                    </td>
                    <td className="p-3.5 hidden lg:table-cell">{parcel.notified_area_sqm ? `${parcel.notified_area_sqm.toLocaleString()} m²` : '0 m²'}</td>
                    <td className="p-3.5 hidden xl:table-cell">{parcel.affected_area_sqm ? `${parcel.affected_area_sqm.toLocaleString()} m²` : '0 m²'}</td>
                    <td className="p-3.5 hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-800">{parcel.possession_status || 'Pending'}</span>
                    </td>
                    <td className="p-3.5">
                      {status === 'Verified' && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"><CheckCircle2 className="size-3 text-emerald-600" />Verified</span>}
                      {status === 'Needs Review' && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300"><AlertCircle className="size-3 text-blue-600" />Needs Review</span>}
                      {status === 'Pending' && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300"><Clock className="size-3 text-amber-600" />Pending</span>}
                    </td>
                    <td className="p-3.5 text-muted-foreground text-[11px] hidden lg:table-cell">
                      {parcel.field_verified_at ? <><span>{new Date(parcel.field_verified_at).toLocaleDateString()}</span>{parcel.field_verified_by && <span className="block text-[10px] text-slate-500 truncate max-w-[140px]" title={parcel.field_verified_by}>by {parcel.field_verified_by}</span>}</> : <span className="text-slate-400 italic">Not verified</span>}
                    </td>
                    <td className="p-3.5 text-right">
                      <button type="button" onClick={() => openVerificationModal(parcel)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent hover:text-primary transition-colors">
                        <span>{isRoleAuthorized ? 'View / Verify' : 'View Details'}</span><ChevronRight className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Verification Modal ─────────────────────────────────────────────────── */}
      {isModalOpen && selectedParcel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4 sm:my-8">

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700"><FileCheck className="size-4 sm:size-5" /></div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">Parcel Verification</h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedParcel.parcel_number || selectedParcel.parcel_no || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setHubParcelId(selectedParcel.id); setIsHubOpen(true) }}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                  <LandPlot className="size-3.5" /><span className="hidden sm:inline">360° Hub</span>
                </button>
                <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><X className="size-5" /></button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {modalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-red-600" /><span>{modalError}</span>
                </div>
              )}

              {/* Parcel Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Owner Name', value: selectedParcel.owner_name },
                  { label: 'Village', value: selectedParcel.village_name },
                  { label: 'Survey / Khasra No.', value: selectedParcel.survey_number || selectedParcel.survey_no || selectedParcel.khasra_no || 'N/A' },
                  { label: 'Project Code', value: selectedParcel.project_code || 'N/A' },
                  { label: 'Notified Area', value: selectedParcel.notified_area_sqm ? `${selectedParcel.notified_area_sqm.toLocaleString()} m²` : '0 m²' },
                  { label: 'Affected Area', value: selectedParcel.affected_area_sqm ? `${selectedParcel.affected_area_sqm.toLocaleString()} m²` : '0 m²' },
                  { label: 'Land Classification', value: selectedParcel.land_type || 'Agricultural' },
                  { label: 'Possession Status', value: selectedParcel.possession_status || 'Pending' },
                  { label: 'Parcel GPS', value: (selectedParcel.latitude && selectedParcel.longitude) ? `${selectedParcel.latitude.toFixed(4)}°, ${selectedParcel.longitude.toFixed(4)}°` : 'Not recorded' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/30 p-3 rounded-lg border border-border">
                    <span className="text-muted-foreground font-medium block uppercase text-[9px] tracking-wider">{label}</span>
                    <span className="font-semibold text-foreground text-xs block mt-0.5">{value}</span>
                  </div>
                ))}
              </div>

              {/* Current Status */}
              <div className="rounded-lg border border-border bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">Current Verification Status</span>
                  <span className={cn('px-2.5 py-0.5 rounded-full font-bold text-[10px]',
                    selectedParcel.field_verification_status === 'Verified' && 'bg-emerald-100 text-emerald-800 border border-emerald-300',
                    selectedParcel.field_verification_status === 'Needs Review' && 'bg-blue-100 text-blue-800 border border-blue-300',
                    (!selectedParcel.field_verification_status || selectedParcel.field_verification_status === 'Pending') && 'bg-amber-100 text-amber-800 border border-amber-300'
                  )}>{selectedParcel.field_verification_status || 'Pending'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div><span className="font-medium text-slate-500">Verified By: </span>{selectedParcel.field_verified_by || 'Not verified'}</div>
                  <div><span className="font-medium text-slate-500">Inspection Date: </span>{selectedParcel.field_verified_at ? new Date(selectedParcel.field_verified_at).toLocaleString() : 'N/A'}</div>
                </div>
              </div>

              {/* ── FIELD VISIT SECTION ── */}
              {isRoleAuthorized && (
                <div className="border border-border rounded-xl overflow-hidden">
                  {/* Visit Header */}
                  <div className={cn('flex items-center justify-between p-4 border-b border-border', visitActive ? 'bg-emerald-50' : 'bg-muted/30')}>
                    <div className="flex items-center gap-2">
                      <div className={cn('flex size-8 items-center justify-center rounded-full', visitActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600')}>
                        {visitActive ? <Square className="size-4" /> : <Play className="size-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{visitActive ? '● Field Visit Active' : 'Field Visit'}</p>
                        <p className="text-[10px] text-muted-foreground">{visitActive ? 'GPS + camera ready' : 'Start to enable GPS and camera'}</p>
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => { if (visitActive) { setVisitActive(false); setGpsStatus('idle'); setGpsCoords(null) } else setVisitActive(true) }}
                      className={cn('inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors',
                        visitActive ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200' : 'bg-emerald-600 text-white hover:bg-emerald-700')}>
                      {visitActive ? <><Square className="size-3.5" /> End Visit</> : <><Play className="size-3.5" /> Start Visit</>}
                    </button>
                  </div>

                  {/* GPS Panel */}
                  {(visitActive || gpsStatus !== 'idle') && (
                    <div className="p-4 border-b border-border space-y-3">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Navigation className="size-3.5 text-emerald-600" />Device GPS Location</p>
                      <GpsStatusPanel gpsStatus={gpsStatus} gpsCoords={gpsCoords} onRequest={requestGps} />
                      {gpsStatus === 'acquired' && <p className="text-[10px] text-muted-foreground">GPS coordinates will be attached to each evidence photo you upload.</p>}
                    </div>
                  )}

                  {/* Evidence Capture */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Camera className="size-3.5 text-emerald-600" />Capture Field Evidence</p>
                      {evidenceList.length > 0 && <span className="text-[10px] text-muted-foreground">{evidenceList.length} uploaded</span>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Camera — opens rear camera on mobile */}
                      <button type="button" onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors active:scale-95 min-h-[44px]">
                        <Camera className="size-4" />Take Photo
                      </button>
                      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
                        onChange={e => validateAndQueueFiles(e.target.files)} onClick={e => { (e.target as HTMLInputElement).value = '' }} />

                      {/* File picker — fallback / PDF / desktop */}
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors active:scale-95 min-h-[44px]">
                        <Paperclip className="size-4" />Choose Files
                      </button>
                      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple className="hidden"
                        onChange={e => validateAndQueueFiles(e.target.files)} onClick={e => { (e.target as HTMLInputElement).value = '' }} />
                    </div>

                    <p className="text-[10px] text-muted-foreground">Supported: JPG, PNG, WEBP, PDF · Max 10 MB per file · Multiple files supported</p>

                    {uploadError && (
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                        <pre className="whitespace-pre-wrap font-sans">{uploadError}</pre>
                      </div>
                    )}
                    {uploadSummary && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 flex items-center gap-2">
                        <CheckCircle className="size-4 shrink-0 text-emerald-600" /><span>{uploadSummary}</span>
                      </div>
                    )}

                    {fileQueue.length > 0 && (
                      <div className="space-y-2">
                        {fileQueue.map(item => (
                          <FileQueueRow key={item.id} item={item} onRemove={removeFromQueue} onDescriptionChange={updateDescription} />
                        ))}
                        {pendingUploadCount > 0 && (
                          <div className="pt-1 flex items-center justify-between gap-3">
                            {gpsStatus === 'acquired'
                              ? <span className="text-[10px] text-emerald-600 flex items-center gap-1"><Crosshair className="size-3" />GPS will be attached</span>
                              : <span className="text-[10px] text-muted-foreground">No GPS — upload without coordinates</span>}
                            <button type="button" onClick={handleUploadAll} disabled={uploadingAll}
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 active:scale-95 min-h-[44px]">
                              {uploadingAll ? <RefreshCw className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                              Upload {pendingUploadCount} File{pendingUploadCount > 1 ? 's' : ''}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Unauthorized viewer notice */}
              {!isRoleAuthorized && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-center gap-2">
                  <ShieldAlert className="size-4 shrink-0 text-amber-600" />
                  <span>Viewing mode (<strong>{userRole || 'Viewer'}</strong>). Updating requires <strong>Field Officer</strong> or higher permissions.</span>
                </div>
              )}

              {/* Field Remarks */}
              {isRoleAuthorized && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-foreground">Field Inspection Remarks</label>
                  <textarea rows={3} placeholder="Enter inspection observations, boundary verification notes…"
                    value={modalRemarks} onChange={e => setModalRemarks(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              )}

              {/* Uploaded Evidence List */}
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Paperclip className="size-4 text-emerald-600" />
                  <span>Field Evidence Attachments ({evidenceList.length})</span>
                </h4>
                {evidenceLoading ? (
                  <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2"><RefreshCw className="size-3.5 animate-spin text-primary" /><span>Loading evidence files…</span></div>
                ) : evidenceList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-muted/20">No field evidence photos or documents attached yet.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {evidenceList.map(item => {
                      const isImage = item.file_type.startsWith('image/')
                      return (
                        <div key={item.id} className="bg-card border border-border p-3 rounded-lg flex items-start justify-between gap-3 shadow-xs hover:border-emerald-600/30 transition-colors">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded bg-slate-100 mt-0.5">
                              {isImage ? <ImageIcon className="size-4 text-emerald-600" /> : <FileText className="size-4 text-blue-600" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate" title={item.file_name}>{item.file_name}</p>
                              {item.description && <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>}
                              <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                <span>{formatBytes(item.file_size_bytes)}</span><span>·</span>
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                {item.uploaded_by_email && <><span>·</span><span className="truncate max-w-[100px]">{item.uploaded_by_email}</span></>}
                              </div>
                              {item.captured_latitude != null && item.captured_longitude != null && (
                                <div className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-mono text-emerald-700">
                                  <Crosshair className="size-2.5" />
                                  {item.captured_latitude.toFixed(5)}, {item.captured_longitude.toFixed(5)}
                                  {item.captured_accuracy_m != null && ` ±${item.captured_accuracy_m.toFixed(0)}m`}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.signed_url
                              ? <a href={item.signed_url} target="_blank" rel="noopener noreferrer" title="View File" className="p-1.5 rounded text-emerald-700 hover:bg-emerald-50 transition-colors"><ExternalLink className="size-3.5" /></a>
                              : <span className="text-[10px] text-slate-400">Unavailable</span>}
                            {isDeleteAuthorized && (
                              <button type="button" disabled={deletingId === item.id} onClick={() => handleDeleteEvidence(item.id)} title="Delete"
                                className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer — Verification Actions */}
            <div className="p-4 border-t border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={closeModal}
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                Close
              </button>
              {isRoleAuthorized && (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={modalSubmitting} onClick={() => handleVerificationAction('Pending')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 active:scale-95 min-h-[40px]">
                    <RotateCcw className="size-3.5" /><span>Reset to Pending</span>
                  </button>
                  <button type="button" disabled={modalSubmitting} onClick={() => handleVerificationAction('Needs Review')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50 active:scale-95 min-h-[40px]">
                    <AlertCircle className="size-3.5 text-blue-600" /><span>Needs Review</span>
                  </button>
                  <button type="button" disabled={modalSubmitting} onClick={() => handleVerificationAction('Verified')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 active:scale-95 min-h-[40px]">
                    {modalSubmitting ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                    <span>Mark as Verified</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ParcelContextHub parcelId={hubParcelId} isOpen={isHubOpen} onClose={() => setIsHubOpen(false)} userRole={userRole} />
    </div>
  )
}

export default function FieldVerificationPage() {
  return (
    <Suspense fallback={<div className="flex-1 min-h-screen flex items-center justify-center bg-background"><RefreshCw className="size-8 animate-spin text-primary" /></div>}>
      <FieldVerificationContent />
    </Suspense>
  )
}

