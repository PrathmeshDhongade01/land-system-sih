'use client'

import { useState } from 'react'
import DemoNavBanner from '@/components/demo/DemoNavBanner'
import DemoParcelContextHub from '@/components/demo/DemoParcelContextHub'
import {
  DEMO_PARCELS,
  DEMO_ASSIGNMENTS,
  DEMO_EVIDENCE,
  type DemoParcel,
  type DemoAssignment,
} from '@/lib/demoData'
import {
  Footprints,
  Camera,
  Upload,
  CheckCircle2,
  MapPin,
  FileCheck,
  FileText,
  Clock,
  Navigation,
  Crosshair,
  ShieldCheck,
  RefreshCw,
  Info,
  X,
  ExternalLink,
  Download,
  AlertTriangle,
  Sparkles,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DemoFieldView() {
  const [selectedParcel, setSelectedParcel] = useState<DemoParcel>(DEMO_PARCELS[0])
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false)
  const [hubParcelId, setHubParcelId] = useState<string | null>(null)

  // Demo Action Modal State
  const [demoActionModal, setDemoActionModal] = useState<{
    isOpen: boolean
    title: string
    description: string
    actionType: 'camera' | 'upload' | 'verify'
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'camera',
  })

  // Simulated GPS state
  const [gpsStatus, setGpsStatus] = useState<'acquired' | 'refreshing'>('acquired')
  const [simulatedCoords, setSimulatedCoords] = useState<{ lat: number; lng: number }>({
    lat: selectedParcel.latitude,
    lng: selectedParcel.longitude,
  })

  const handleSelectParcel = (p: DemoParcel) => {
    setSelectedParcel(p)
    setSimulatedCoords({ lat: p.latitude, lng: p.longitude })
  }

  const handleRefreshGps = () => {
    setGpsStatus('refreshing')
    setTimeout(() => {
      setSimulatedCoords({
        lat: selectedParcel.latitude + (Math.random() - 0.5) * 0.0002,
        lng: selectedParcel.longitude + (Math.random() - 0.5) * 0.0002,
      })
      setGpsStatus('acquired')
    }, 600)
  }

  const openDemoAction = (type: 'camera' | 'upload' | 'verify') => {
    if (type === 'camera') {
      setDemoActionModal({
        isOpen: true,
        actionType: 'camera',
        title: 'Simulated Camera & Geo-Tagging Interface',
        description:
          'In production, NLAMS captures real-time EXIF-stamped ground photography with embedded GPS latitude/longitude, timestamp, and device cryptographic signature. For this public hackathon jury demonstration, no actual photo upload is performed, protecting production storage.',
      })
    } else if (type === 'upload') {
      setDemoActionModal({
        isOpen: true,
        actionType: 'upload',
        title: 'Simulated Evidence Ingestion',
        description:
          'In production, inspection documents (cadastral sheets, tree valuation certificates, village notices) are encrypted and stored in private Supabase Storage buckets with strict role-based access control. Public demo mode is read-only.',
      })
    } else {
      setDemoActionModal({
        isOpen: true,
        actionType: 'verify',
        title: 'Simulated Boundary Verification',
        description:
          `In production, marking parcel ${selectedParcel.parcel_number} as "Verified" updates the statutory verification ledger, unblocks DBT compensation disbursal in the PFMS bridge, and notifies the SLAO. In Public Jury Demo Mode, no database mutations are written.`,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Demo Navigation Bar */}
      <DemoNavBanner currentPortal="Field Officer" />

      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
        {/* Sub-header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Field Officer Portal &mdash; Ground Inspection &amp; Mobile Verification
              </h1>
              <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                FIELD AGENT MODE
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Field inspection workspace for ground-truth cadastral survey, geo-tagged boundary evidence, and physical possession reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground">
              inspector.kadam@morth.gov.in &middot; MoRTH Survey Cell
            </span>
          </div>
        </div>

        {/* SECTION 1: FIELD OFFICER KPIS */}
        <section aria-labelledby="field-kpis-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="field-kpis-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCheck className="size-4 text-emerald-600" />
              1. Inspection Progress &amp; Quota (Nashik Division)
            </h2>
            <span className="text-[11px] text-muted-foreground">Corridor: SM-NASHIK-DEMO-01</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <article className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-blue-900">Total Assigned Parcels</span>
              <p className="font-serif text-2xl font-bold text-blue-950 mt-1">24 Parcels</p>
              <p className="text-[10px] text-blue-700 mt-0.5">Igatpuri &amp; Sinnar Talukas</p>
            </article>

            <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-emerald-900">Ground-Truth Verified</span>
              <p className="font-serif text-2xl font-bold text-emerald-950 mt-1">18 Verified</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">75% survey quota completed</p>
            </article>

            <article className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-amber-900">Requires Field Review</span>
              <p className="font-serif text-2xl font-bold text-amber-950 mt-1">3 Under Review</p>
              <p className="text-[10px] text-amber-700 mt-0.5">Boundary discrepancy / heirship</p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-slate-800">Pending Joint Visit</span>
              <p className="font-serif text-2xl font-bold text-slate-900 mt-1">3 Pending</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Scheduled with village Talathi</p>
            </article>
          </div>
        </section>

        {/* 2-COLUMN WORKSPACE: LEFT = ASSIGNMENTS QUEUE, RIGHT = ACTIVE VERIFICATION WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Assigned Task Queue */}
          <section id="assignments-queue" className="rounded-xl border border-border bg-card shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
                <Footprints className="size-4 text-primary" />
                My Assigned Survey Queue
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">Select to Inspect</span>
            </div>

            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {DEMO_PARCELS.map((p) => {
                const isSelected = p.id === selectedParcel.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectParcel(p)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/20'
                        : 'border-border bg-background hover:bg-accent/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">{p.parcel_number}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.2 text-[10px] font-semibold',
                          p.field_verification_status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.field_verification_status === 'Needs Review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {p.field_verification_status}
                      </span>
                    </div>
                    <p className="font-medium text-xs text-foreground truncate mt-1">{p.owner_name}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                      <span>{p.village_name}</span>
                      <span className="font-mono">{(p.affected_area_sqm / 10000).toFixed(2)} Ha</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Right Column: Active Inspection Workspace */}
          <section className="lg:col-span-2 rounded-xl border border-border bg-card shadow-2xs p-5 space-y-5">
            {/* Active Parcel Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded">
                    {selectedParcel.parcel_number}
                  </span>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    {selectedParcel.village_name}, {selectedParcel.taluka_name}
                  </h3>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      selectedParcel.field_verification_status === 'Verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {selectedParcel.field_verification_status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Owner: {selectedParcel.owner_name} &middot; Survey No: {selectedParcel.survey_number} &middot; Land Type: {selectedParcel.land_type}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHubParcelId(selectedParcel.id)
                  setIsHubOpen(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-accent transition-colors shadow-2xs shrink-0 self-start sm:self-auto"
              >
                <Layers className="size-3.5" />
                <span>Open Parcel 360</span>
              </button>
            </div>

            {/* GPS Panel */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Crosshair className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950">
                      GPS Location Acquired &middot; Real-time Geo-lock
                    </span>
                    <p className="text-[11px] text-emerald-800 font-mono">
                      Latitude: {simulatedCoords.lat.toFixed(6)}° N &middot; Longitude: {simulatedCoords.lng.toFixed(6)}° E (Accuracy &plusmn;1.2m)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshGps}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
                >
                  <RefreshCw className={cn('size-3', gpsStatus === 'refreshing' && 'animate-spin')} />
                  <span>{gpsStatus === 'refreshing' ? 'Acquiring...' : 'Refresh GPS'}</span>
                </button>
              </div>
            </div>

            {/* Action Bar (Camera, Upload, Verification) with DEMO ACTION badges */}
            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Field Verification Actions
                </span>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  Demo Simulated Actions &mdash; Read Only
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => openDemoAction('camera')}
                  className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-border bg-card hover:bg-accent transition-all group shadow-2xs text-center cursor-pointer"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform mb-2">
                    <Camera className="size-4.5" />
                  </div>
                  <span className="font-semibold text-xs text-foreground">Open Camera</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">EXIF Geo-tagged Photo</span>
                  <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Demo Action
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openDemoAction('upload')}
                  className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-border bg-card hover:bg-accent transition-all group shadow-2xs text-center cursor-pointer"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform mb-2">
                    <Upload className="size-4.5" />
                  </div>
                  <span className="font-semibold text-xs text-foreground">Upload Evidence</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Cadastral / Valuation PDF</span>
                  <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Demo Action
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openDemoAction('verify')}
                  className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-border bg-card hover:bg-accent transition-all group shadow-2xs text-center cursor-pointer"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform mb-2">
                    <CheckCircle2 className="size-4.5" />
                  </div>
                  <span className="font-semibold text-xs text-foreground">Mark as Verified</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Sign Off Ground Survey</span>
                  <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Demo Action
                  </span>
                </button>
              </div>
            </div>

            {/* Inspection Checklist */}
            <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                Physical Inspection Checklist
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded bg-muted/20">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Highway RoW alignment pegs installed</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-muted/20">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Cadastral boundary survey matches Revenue map</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-muted/20">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Encumbrance &amp; tenancy verification signed</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-muted/20">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Tree and borewell valuation logged</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-muted-foreground text-xs">Officer Field Remarks:</span>
                <p className="p-3 rounded bg-muted/30 font-mono text-[11px] text-foreground mt-1 leading-relaxed border border-border/60">
                  {selectedParcel.field_remarks || 'Boundary demarcated with concrete boundary stones. Joint measurement signed by Talathi.'}
                </p>
              </div>
            </div>

            {/* Evidence Gallery */}
            <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <FileText className="size-4 text-primary" />
                Logged Evidence Documents &amp; Photos
              </h4>

              <div className="space-y-2">
                {DEMO_EVIDENCE.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-2.5 rounded border border-border bg-background text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                        <FileText className="size-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{ev.file_name}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {ev.category} &middot; {ev.uploaded_by} &middot; {(ev.file_size_bytes / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert(`[JURY DEMO] Simulated document inspect: ${ev.file_name}. Synthetic document certified by NLAMS prototype.`)}
                      className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[11px] font-medium text-primary hover:bg-accent transition-colors"
                    >
                      <Download className="size-3" />
                      <span>Inspect</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Demo Action Modal */}
      {demoActionModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                  <Sparkles className="size-4" />
                </div>
                <h3 className="font-serif text-sm font-bold text-foreground">
                  {demoActionModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDemoActionModal({ ...demoActionModal, isOpen: false })}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {demoActionModal.description}
            </p>

            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-[11px] text-amber-900 space-y-1">
              <span className="font-semibold">Security Guardrail Active:</span>
              <p>
                In Public Jury Demo Mode, mutations to production storage buckets and Supabase database tables are disabled. Jurors can safely evaluate the interface without altering live records.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDemoActionModal({ ...demoActionModal, isOpen: false })}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Understood &middot; Continue Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parcel 360 Hub Modal */}
      <DemoParcelContextHub
        parcelId={hubParcelId}
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
      />
    </div>
  )
}
