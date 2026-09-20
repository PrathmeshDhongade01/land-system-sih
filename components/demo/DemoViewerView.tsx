'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import DemoNavBanner from '@/components/demo/DemoNavBanner'
import {
  DEMO_PARCELS,
  DEMO_OBJECTIONS,
  DEMO_EVIDENCE,
  type DemoParcel,
  type DemoObjection,
} from '@/lib/demoData'
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
  ChevronRight,
  User,
  Compass,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  BadgePercent,
  Banknote,
  Home,
  Layers,
  X,
  Upload,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

export default function DemoViewerView() {
  const [selectedParcel, setSelectedParcel] = useState<DemoParcel>(DEMO_PARCELS[0])
  const [activeTab, setActiveTab] = useState<
    'overview' | 'status' | 'compensation' | 'location' | 'documents' | 'objections'
  >('overview')

  // Objections state (allows session-level adding in demo)
  const [objectionsList, setObjectionsList] = useState<DemoObjection[]>(DEMO_OBJECTIONS)
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState<boolean>(false)
  const [objectionType, setObjectionType] = useState<string>('Compensation')
  const [objectionDescription, setObjectionDescription] = useState<string>('')
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const formatINR = (val?: number | null) => {
    if (val === null || val === undefined) return '₹ 0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleRaiseObjectionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!objectionDescription.trim()) return

    const newObj: DemoObjection = {
      id: `obj-session-${Date.now()}`,
      parcel_id: selectedParcel.id,
      parcel_number: selectedParcel.parcel_number,
      village_name: selectedParcel.village_name,
      survey_number: selectedParcel.survey_number,
      owner_name: selectedParcel.owner_name,
      objection_type: objectionType,
      description: objectionDescription.trim(),
      status: 'Submitted',
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      resolved_at: null,
      reviewer_name: null,
      resolution_remarks: null,
    }

    setObjectionsList([newObj, ...objectionsList])
    setSubmitSuccess('Your Section 3C dispute has been registered in Jury Demo Mode! Tracking Token: OBJ-DEMO-2026-NASHIK')
    setTimeout(() => {
      setSubmitSuccess(null)
      setIsRaiseModalOpen(false)
      setObjectionDescription('')
      setActiveTab('objections')
    }, 1800)
  }

  // Quick switch parcels
  const QUICK_DEMO_PARCELS = [
    { id: 'demo-parcel-101', label: 'SM-NK-101 (Paid & Completed)', parcel: DEMO_PARCELS[0] },
    { id: 'demo-parcel-104', label: 'SM-NK-104 (Award Approved)', parcel: DEMO_PARCELS[3] },
    { id: 'demo-parcel-105', label: 'SM-NK-105 (Dispute Under Review)', parcel: DEMO_PARCELS[4] },
    { id: 'demo-parcel-108', label: 'SM-NK-108 (Joint Survey Pending)', parcel: DEMO_PARCELS[7] },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Demo Navigation Bar */}
      <DemoNavBanner currentPortal="Parcel Owner" />

      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* Landowner Header & Parcel Switcher */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20">
                <User className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                    {selectedParcel.owner_name}
                  </h1>
                  <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-300">
                    VERIFIED LANDOWNER
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Citizen Landowner Transparency Portal &middot; Ministry of Road Transport &amp; Highways
                </p>
              </div>
            </div>

            {/* Quick Scenario Switcher */}
            <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border self-start sm:self-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Test Landowner:
              </span>
              <select
                value={selectedParcel.id}
                onChange={(e) => {
                  const p = DEMO_PARCELS.find((dp) => dp.id === e.target.value)
                  if (p) setSelectedParcel(p)
                }}
                className="rounded border border-input bg-background px-2.5 py-1 text-xs font-medium cursor-pointer"
              >
                {QUICK_DEMO_PARCELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
            <div>
              <span className="text-muted-foreground">Parcel Number:</span>
              <p className="font-mono font-bold text-primary mt-0.5">{selectedParcel.parcel_number}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Survey &amp; Khasra:</span>
              <p className="font-medium text-foreground mt-0.5">
                {selectedParcel.survey_number} ({selectedParcel.khasra_no})
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>
              <p className="font-medium text-foreground mt-0.5">
                {selectedParcel.village_name}, {selectedParcel.taluka_name}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Acquisition Status:</span>
              <p className="font-bold text-emerald-700 mt-0.5">{selectedParcel.possession_status}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex border-b border-border gap-2 sm:gap-4 overflow-x-auto text-xs">
          {[
            { id: 'overview', label: '1. My Parcel Overview', icon: LandPlot },
            { id: 'status', label: '2. Acquisition Stages', icon: Clock },
            { id: 'compensation', label: '3. Compensation & DBT', icon: Wallet },
            { id: 'location', label: '4. GIS Alignment Map', icon: MapPin },
            { id: 'documents', label: '5. Notices & Documents', icon: FileText },
            { id: 'objections', label: `6. Objections (${objectionsList.length})`, icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'pb-3 pt-1 px-1.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <section className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-1 shadow-2xs">
                <span className="text-xs font-medium text-blue-900">Total Registered Area</span>
                <p className="font-serif text-xl font-bold text-blue-950">
                  {selectedParcel.notified_area_sqm.toLocaleString('en-IN')} sqm
                </p>
                <p className="text-[11px] text-blue-700">
                  {(selectedParcel.notified_area_sqm / 10000).toFixed(2)} Hectares
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-1 shadow-2xs">
                <span className="text-xs font-medium text-emerald-900">Affected Highway RoW Area</span>
                <p className="font-serif text-xl font-bold text-emerald-950">
                  {selectedParcel.affected_area_sqm.toLocaleString('en-IN')} sqm
                </p>
                <p className="text-[11px] text-emerald-700">
                  {(selectedParcel.affected_area_sqm / 10000).toFixed(2)} Hectares (Expressway RoW)
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-1 shadow-2xs">
                <span className="text-xs font-medium text-amber-900">Compensation Entitlement</span>
                <p className="font-serif text-xl font-bold text-amber-950">
                  {formatINR(selectedParcel.compensation_amount)}
                </p>
                <p className="text-[11px] text-amber-700">
                  Payment Status: <span className="font-bold">{selectedParcel.payment_status}</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-2xs text-xs">
              <h3 className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                Verified Cadastral Records &amp; RoW Demarcation
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <span className="text-muted-foreground">Land Classification:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedParcel.land_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Verification Date:</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedParcel.field_verified_at ? new Date(selectedParcel.field_verified_at).toLocaleDateString('en-IN') : 'Pending'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Inspected By:</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedParcel.field_verified_by || 'SLAO Nashik Field Cell'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Possession Record:</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">{selectedParcel.possession_status}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs mt-3">
                <span className="text-muted-foreground">Field Inspection Notes:</span>
                <p className="font-mono text-[11px] text-foreground mt-0.5">
                  {selectedParcel.field_remarks || 'Boundary demarcated with concrete stones.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: ACQUISITION STAGES */}
        {activeTab === 'status' && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
              <Clock className="size-4 text-primary" />
              Statutory Stage Tracker &mdash; National Highways Act 1956
            </h3>

            <div className="space-y-4 pt-2">
              {[
                { stage: 'Section 3A', title: 'Intent to Acquire Notified', date: '15 Jul 2026', done: true, desc: 'Central Gazette Notification published announcing intention to acquire land.' },
                { stage: 'Section 3C', title: 'Landowner Objection Hearing Window', date: '05 Aug 2026', done: true, desc: '21-day statutory hearing period completed before Competent Authority.' },
                { stage: 'Section 19 / 3D', title: 'Declaration of Acquisition Gazetted', date: '20 Aug 2026', done: true, desc: 'Land permanently vests with Government of India for the expressway corridor.' },
                { stage: 'Section 23 / 3G', title: 'Statutory Compensation Award Determined', date: '01 Sep 2026', done: selectedParcel.compensation_approved > 0, desc: 'Valuation finalized including 100% solatium and rural multiplier.' },
                { stage: 'Possession', title: 'Physical Possession & RoW Handover', date: '05 Sep 2026', done: selectedParcel.possession_status === 'Possession Taken', desc: 'Demarcation stones placed and possession transferred to NHAI.' },
              ].map((step, idx) => (
                <div key={step.stage} className="flex gap-3.5 items-start">
                  <div className="flex flex-col items-center">
                    <div className={cn('flex size-7 items-center justify-center rounded-full text-white', step.done ? 'bg-emerald-600' : 'bg-muted text-muted-foreground')}>
                      {step.done ? <CheckCircle2 className="size-4" /> : <Clock className="size-3.5" />}
                    </div>
                    {idx < 4 && <div className="w-0.5 h-10 bg-border mt-1" />}
                  </div>
                  <div className="min-w-0 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{step.stage}: {step.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{step.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 3: COMPENSATION & PFMS DBT */}
        {activeTab === 'compensation' && (
          <section className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                <Wallet className="size-4 text-emerald-600" />
                Transparent RFCTLARR 2013 Compensation Calculator
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg border border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">Assessed Market Value</span>
                  <p className="font-mono text-lg font-bold text-foreground mt-1">
                    {formatINR(selectedParcel.compensation_assessed / 2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Rural Factor: 1.5x</p>
                </div>

                <div className="p-4 rounded-lg border border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">Statutory Solatium (100%)</span>
                  <p className="font-mono text-lg font-bold text-foreground mt-1">
                    {formatINR(selectedParcel.compensation_assessed / 2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Mandated by RFCTLARR Act</p>
                </div>

                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50">
                  <span className="text-xs text-emerald-900 font-semibold">Total Approved Award</span>
                  <p className="font-mono text-xl font-bold text-emerald-950 mt-1">
                    {formatINR(selectedParcel.compensation_approved)}
                  </p>
                  <p className="text-[10px] text-emerald-700">PFMS Status: {selectedParcel.payment_status}</p>
                </div>
              </div>

              {selectedParcel.payment_reference && (
                <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle className="size-4 text-emerald-700" />
                      PFMS Direct Benefit Transfer (DBT) Disbursal Receipt
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                      CREDITED
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 font-mono">
                    Electronic Payment UTR: {selectedParcel.payment_reference}
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Transferred directly to landowner verified Aadhaar-linked bank account without intermediary deduction.
                  </p>
                </div>
              )}

              {/* R&R Section */}
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/40 space-y-2">
                <span className="font-bold text-xs text-purple-950">
                  Rehabilitation &amp; Resettlement (R&amp;R) Entitlements
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-purple-800">Status:</span>
                    <p className="font-semibold text-purple-950 mt-0.5">{selectedParcel.rehabilitation_status}</p>
                  </div>
                  <div>
                    <span className="text-purple-800">Resettlement Allowance:</span>
                    <p className="font-mono font-bold text-purple-950 mt-0.5">{formatINR(selectedParcel.rehabilitation_amount)}</p>
                  </div>
                  <div>
                    <span className="text-purple-800">Entitlement Grant:</span>
                    <p className="text-purple-950 mt-0.5">First Schedule RFCTLARR Grant</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: GIS ALIGNMENT MAP */}
        {activeTab === 'location' && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" />
                  Cadastral Location on Mumbai–Nagpur Samruddhi Corridor
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Coordinates: {selectedParcel.latitude}° N, {selectedParcel.longitude}° E (Village {selectedParcel.village_name})
                </p>
              </div>
              <span className="text-xs font-mono bg-muted px-2.5 py-1 rounded">
                GIS ID: {selectedParcel.parcel_number}
              </span>
            </div>

            <div className="rounded-xl border border-border overflow-hidden min-h-[440px]">
              <MapComponent
                projectGisUrl="/gis/SM-NASHIK-DEMO-01.geojson"
                projectName={selectedParcel.owner_name}
                projectCode={selectedParcel.parcel_number}
              />
            </div>
          </section>
        )}

        {/* TAB 5: NOTICES & DOCUMENTS */}
        {activeTab === 'documents' && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
              <FileText className="size-4 text-primary" />
              Statutory Gazette Notifications &amp; Inspection Certificates
            </h3>

            <div className="space-y-3 text-xs">
              {DEMO_EVIDENCE.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-background hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">{doc.file_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{doc.description}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {doc.category} &middot; Certified Copy
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`[JURY DEMO] Simulated document download: ${doc.file_name}. Synthetic document certified by NLAMS prototype.`)}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-2.5 py-1.5 font-semibold text-primary hover:bg-accent transition-colors shadow-2xs"
                  >
                    <Download className="size-3" />
                    <span>Download PDF</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 6: SECTION 3C OBJECTIONS */}
        {activeTab === 'objections' && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-4 text-primary" />
                  Section 3C Landowner Objections &amp; Grievances
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Statutory dispute hearings before the designated Competent Authority (CALA / SLAO).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsRaiseModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="size-3.5" />
                <span>Raise New Objection (Demo)</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {objectionsList.map((obj) => (
                <div key={obj.id} className="p-4 rounded-lg border border-border bg-background space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-primary font-bold">{obj.parcel_number}</span>
                      <span className="font-semibold text-foreground">{obj.objection_type}</span>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        obj.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {obj.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">{obj.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/60">
                    <span>Submitted: {new Date(obj.submitted_at).toLocaleDateString('en-IN')}</span>
                    <span>Action: {obj.resolution_remarks || 'Hearing scheduled before CALA Nashik'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Raise Objection Modal */}
      {isRaiseModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-sm font-bold text-foreground">
                  Raise Section 3C Objection (Interactive Demo)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Parcel: {selectedParcel.parcel_number} ({selectedParcel.owner_name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRaiseModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {submitSuccess && (
              <div className="p-3 rounded-md bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                {submitSuccess}
              </div>
            )}

            <form onSubmit={handleRaiseObjectionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Objection Nature / Category:
                </label>
                <select
                  value={objectionType}
                  onChange={(e) => setObjectionType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs"
                >
                  <option value="Compensation">Compensation Valuation Dispute</option>
                  <option value="Measurement / Area">Measurement / RoW Area Discrepancy</option>
                  <option value="Land / Parcel Details">Heirship / Land Title Correction</option>
                  <option value="Rehabilitation & Resettlement">R&R Entitlement Claim</option>
                  <option value="Notice / Documentation">Notice Delivery Grievance</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  Dispute Details &amp; Supporting Grounds:
                </label>
                <textarea
                  rows={4}
                  required
                  value={objectionDescription}
                  onChange={(e) => setObjectionDescription(e.target.value)}
                  placeholder="Describe ground-truth reasons for dispute..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px]">
                <span className="font-semibold">Demo Simulation:</span> Submitting this dispute will register the claim in session memory for jurors to inspect, without modifying production database records.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRaiseModalOpen(false)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Submit Demonstration Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
