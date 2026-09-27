'use client'

import { useState } from 'react'
import {
  DEMO_PARCELS,
  DEMO_WORKFLOWS,
  DEMO_ASSIGNMENTS,
  DEMO_EVIDENCE,
  type DemoParcel,
} from '@/lib/demoData'
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
  MapPin,
  CheckCircle2,
  Clock,
  Wallet,
  Users,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DemoParcelContextHubProps {
  parcelId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function DemoParcelContextHub({
  parcelId,
  isOpen,
  onClose,
}: DemoParcelContextHubProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'compensation' | 'evidence' | 'workflows'>('overview')

  if (!isOpen || !parcelId) return null

  const parcel = DEMO_PARCELS.find((p) => p.id === parcelId || p.parcel_number === parcelId) || DEMO_PARCELS[0]
  const relevantWorkflows = DEMO_WORKFLOWS.filter((w) => w.project_code === parcel.project_code)
  const relevantAssignments = DEMO_ASSIGNMENTS.filter((a) => a.parcel_number === parcel.parcel_number)
  const relevantEvidence = DEMO_EVIDENCE.filter((e) => e.parcel_id === parcel.id || e.parcel_id === 'demo-parcel-101')

  const formatINR = (val?: number | null) => {
    if (val === null || val === undefined) return '₹ 0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LandPlot className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {parcel.parcel_number}
                </span>
                <span className="text-xs font-semibold text-foreground truncate">
                  Survey: {parcel.survey_number}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    parcel.field_verification_status === 'Verified'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : parcel.field_verification_status === 'Needs Review'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  )}
                >
                  {parcel.field_verification_status}
                </span>
                <span className="rounded bg-amber-500/10 text-amber-700 text-[10px] font-bold px-2 py-0.5 border border-amber-500/20">
                  DEMO PARCEL 360
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {parcel.owner_name} &middot; Village {parcel.village_name}, {parcel.taluka_name}, {parcel.district}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-muted/10 px-5 gap-4 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              'py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0',
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <LandPlot className="size-3.5" />
            <span>Cadastral Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compensation')}
            className={cn(
              'py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0',
              activeTab === 'compensation'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Wallet className="size-3.5" />
            <span>Compensation &amp; PFMS DBT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={cn(
              'py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0',
              activeTab === 'evidence'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Paperclip className="size-3.5" />
            <span>Field Evidence ({relevantEvidence.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workflows')}
            className={cn(
              'py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0',
              activeTab === 'workflows'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="size-3.5" />
            <span>Statutory Workflows ({relevantWorkflows.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Notified Area</span>
                  <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                    {parcel.notified_area_sqm.toLocaleString('en-IN')} sqm
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    ({(parcel.notified_area_sqm / 10000).toFixed(2)} Ha)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Affected Area</span>
                  <p className="font-mono text-sm font-bold text-primary mt-0.5">
                    {parcel.affected_area_sqm.toLocaleString('en-IN')} sqm
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    ({(parcel.affected_area_sqm / 10000).toFixed(2)} Ha)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Land Classification</span>
                  <p className="font-semibold text-foreground mt-0.5">{parcel.land_type}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Khasra: {parcel.khasra_no}</p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Possession Status</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">{parcel.possession_status}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">NHAI RoW Handover</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" />
                  Ground Location &amp; Physical Inspection
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Geo-coordinates:</span>
                    <p className="font-mono font-medium text-foreground mt-0.5">
                      {parcel.latitude.toFixed(6)}° N, {parcel.longitude.toFixed(6)}° E
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Inspecting Officer:</span>
                    <p className="font-medium text-foreground mt-0.5">
                      {parcel.field_verified_by || 'Inspector S. P. Kadam (MoRTH Survey Cell)'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Inspection Remarks:</span>
                    <p className="p-2.5 rounded bg-muted/40 font-mono text-[11px] text-foreground mt-1 leading-relaxed">
                      {parcel.field_remarks || 'Physical inspection and highway pegs confirmed against cadastral map.'}
                    </p>
                  </div>
                </div>
              </div>

              {relevantAssignments.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-2">
                  <h4 className="font-semibold text-blue-950 flex items-center gap-1.5">
                    <UserCheck className="size-4 text-blue-700" />
                    Assigned Field Inspection Duty
                  </h4>
                  {relevantAssignments.map((asg) => (
                    <div key={asg.id} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-blue-900">{asg.assigned_officer_name}</span>
                        <span className="text-blue-700 ml-2">({asg.assigned_officer_email})</span>
                      </div>
                      <span className="rounded bg-blue-100 text-blue-800 font-semibold px-2 py-0.5">
                        Status: {asg.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'compensation' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Assessed Compensation</span>
                  <p className="font-mono text-base font-bold text-foreground mt-1">
                    {formatINR(parcel.compensation_assessed)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">RFCTLARR 2013 Statutory Valuation</p>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Approved Award</span>
                  <p className="font-mono text-base font-bold text-emerald-700 mt-1">
                    {formatINR(parcel.compensation_approved)}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Sanctioned by Competent Authority</p>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">PFMS DBT Disbursement</span>
                  <p className="font-mono text-base font-bold text-blue-700 mt-1">
                    {formatINR(parcel.compensation_paid)}
                  </p>
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    Status: <span className="font-semibold">{parcel.payment_status}</span>
                  </p>
                </div>
              </div>

              {parcel.payment_reference && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                      <CreditCard className="size-4 text-emerald-700" />
                      PFMS Direct Benefit Transfer (DBT) Electronic Advice
                    </span>
                    <span className="rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold px-2 py-0.5">
                      PFMS SUCCESS
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-emerald-800">UTR / Advice Reference:</span>
                      <p className="font-mono font-semibold text-emerald-950 mt-0.5">{parcel.payment_reference}</p>
                    </div>
                    <div>
                      <span className="text-emerald-800">Release Timestamp:</span>
                      <p className="font-mono text-emerald-950 mt-0.5">
                        {parcel.payment_released_at ? new Date(parcel.payment_released_at).toLocaleDateString('en-IN') : 'Released'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-4 space-y-2">
                <span className="font-semibold text-purple-950 flex items-center gap-1.5">
                  <Users className="size-4 text-purple-700" />
                  Rehabilitation &amp; Resettlement (R&amp;R) Entitlement
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-purple-800">R&amp;R Status:</span>
                    <p className="font-semibold text-purple-950 mt-0.5">{parcel.rehabilitation_status}</p>
                  </div>
                  <div>
                    <span className="text-purple-800">Resettlement Grant:</span>
                    <p className="font-mono font-bold text-purple-950 mt-0.5">{formatINR(parcel.rehabilitation_amount)}</p>
                  </div>
                  <div className="sm:col-span-1">
                    <span className="text-purple-800">Entitlement Category:</span>
                    <p className="text-purple-950 mt-0.5">First Schedule RFCTLARR Grant</p>
                  </div>
                </div>
                {parcel.rehabilitation_remarks && (
                  <p className="text-[11px] text-purple-800 italic mt-1">{parcel.rehabilitation_remarks}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Geo-tagged inspection photos, cadastral maps, and certified valuation reports logged in ground verification.
              </p>
              <div className="space-y-2">
                {relevantEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{ev.file_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{ev.description}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {ev.category} &middot; {ev.uploaded_by} &middot; {(ev.file_size_bytes / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`[JURY DEMO] Simulated document download: ${ev.file_name}. Synthetic document authenticated by NLAMS prototype.`)}
                      className="inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-accent transition-colors"
                    >
                      <Download className="size-3" />
                      <span>Inspect</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Statutory acquisition clearance chain mandated under the National Highways Act 1956 and RFCTLARR 2013.
              </p>
              <div className="space-y-2.5">
                {relevantWorkflows.map((wf) => (
                  <div key={wf.id} className="p-3.5 rounded-lg border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs">{wf.stage_name}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          wf.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {wf.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{wf.remarks}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>Assigned to: {wf.assigned_to}</span>
                      <span>Approved by: {wf.approved_by || 'Pending Signature'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/20 px-5 py-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            NLAMS Prototype &middot; Read-only Synthetic Demonstration
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-background px-3 py-1 font-medium hover:bg-accent transition-colors"
          >
            Close 360 View
          </button>
        </div>
      </div>
    </div>
  )
}
