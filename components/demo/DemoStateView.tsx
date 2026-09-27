'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import DemoNavBanner from '@/components/demo/DemoNavBanner'
import DemoParcelContextHub from '@/components/demo/DemoParcelContextHub'
import {
  DEMO_PROJECTS,
  DEMO_PARCELS,
  DEMO_WORKFLOWS,
  DEMO_ASSIGNMENTS,
  DEMO_OBJECTIONS,
  type DemoParcel,
} from '@/lib/demoData'
import {
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  LandPlot,
  Layers,
  MapPin,
  RefreshCw,
  Ruler,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Users,
  Wallet,
  X,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DemoStateView() {
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null)
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false)

  // Filtered parcels list
  const filteredParcels = useMemo(() => {
    return DEMO_PARCELS.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.parcel_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.village_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.survey_number.toLowerCase().includes(searchQuery.toLowerCase())

      const matchStatus =
        statusFilter === 'ALL' ||
        p.field_verification_status === statusFilter ||
        p.possession_status === statusFilter

      return matchSearch && matchStatus
    })
  }, [searchQuery, statusFilter])

  const verifiedCount = DEMO_PARCELS.filter((p) => p.field_verification_status === 'Verified').length
  const needsReviewCount = DEMO_PARCELS.filter((p) => p.field_verification_status === 'Needs Review').length
  const pendingCount = DEMO_PARCELS.filter((p) => p.field_verification_status === 'Pending').length

  const formatINR = (val?: number | null) => {
    if (val === null || val === undefined) return '₹ 0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Demo Navigation Bar */}
      <DemoNavBanner currentPortal="State Officer" />

      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
        {/* Sub-header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                State Officer Portal &mdash; Maharashtra RoW &amp; SLAO Administration
              </h1>
              <span className="rounded bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5">
                SLAO / CALA JURISDICTION
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Divisional land acquisition authority managing gazetted statutory workflows, verified field parcels, PFMS DBT disbursals, and landowner objections.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground">
              slao.nashik@maharashtra.gov.in
            </span>
          </div>
        </div>

        {/* SECTION 1: STATE EXECUTIVE OVERVIEW (KPIs) */}
        <section aria-labelledby="state-overview-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="state-overview-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-4 text-primary" />
              1. State Division Operational Metrics (Nashik Division)
            </h2>
            <span className="text-[11px] text-muted-foreground">Samruddhi Expressway Corridor SM-NASHIK-DEMO-01</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <article className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-blue-900">Assigned Corridors</span>
              <p className="font-serif text-2xl font-bold text-blue-950 mt-1">2 Active</p>
              <p className="text-[10px] text-blue-700 mt-0.5">Samruddhi &amp; Nashik–Surat</p>
            </article>

            <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-emerald-900">Total Notified Area</span>
              <p className="font-serif text-2xl font-bold text-emerald-950 mt-1">3,548 Ha</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Section 3A / 19 Gazetted</p>
            </article>

            <article className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-green-900">Verified Possession</span>
              <p className="font-serif text-2xl font-bold text-green-950 mt-1">1,228 Ha</p>
              <p className="text-[10px] text-green-700 mt-0.5">18 of 24 parcels acquired</p>
            </article>

            <article className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-amber-900">DBT Compensation</span>
              <p className="font-serif text-2xl font-bold text-amber-950 mt-1">₹ 43.85 Cr</p>
              <p className="text-[10px] text-amber-700 mt-0.5">Direct PFMS E-advices</p>
            </article>

            <article className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-2xs">
              <span className="text-xs font-medium text-purple-900">Field Verification</span>
              <p className="font-serif text-2xl font-bold text-purple-950 mt-1">75% Complete</p>
              <p className="text-[10px] text-purple-700 mt-0.5">18 Verified &middot; 3 Under Review</p>
            </article>
          </div>
        </section>

        {/* SECTION 4: LAND PARCELS & FIELD VERIFICATION DIRECTORY */}
        <section id="parcels" aria-labelledby="parcels-heading" className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 id="parcels-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <LandPlot className="size-4 text-primary" />
                  4. Land Parcels &amp; Physical Verification Directory (SM-NASHIK-DEMO-01)
                </h3>
                <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  24 Parcels
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full cadastral survey ledger comprising landholder profiles, boundary demarcation status, and DBT compensation clearance.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search parcel, owner, survey..."
                  className="rounded-md border border-input bg-background pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48 sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Verified">Verified ({verifiedCount})</option>
                <option value="Needs Review">Needs Review ({needsReviewCount})</option>
                <option value="Pending">Pending ({pendingCount})</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">Parcel No. &amp; Survey</th>
                  <th scope="col" className="px-4 py-3">Landowner Name</th>
                  <th scope="col" className="px-4 py-3">Village &amp; Taluka</th>
                  <th scope="col" className="px-4 py-3">Affected Area</th>
                  <th scope="col" className="px-4 py-3">Possession</th>
                  <th scope="col" className="px-4 py-3">Field Verification</th>
                  <th scope="col" className="px-4 py-3">DBT Amount</th>
                  <th scope="col" className="px-4 py-3 text-right">360 Hub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParcels.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-primary font-bold text-[11px] bg-primary/10 px-1.5 py-0.5 rounded">
                        {p.parcel_number}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{p.survey_number}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {p.owner_name}
                      <div className="text-[10px] text-muted-foreground">{p.land_type}</div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      <div>{p.village_name}</div>
                      <div className="text-[10px]">{p.taluka_name}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-foreground">
                      {(p.affected_area_sqm / 10000).toFixed(2)} Ha
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {p.possession_status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          p.field_verification_status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.field_verification_status === 'Needs Review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {p.field_verification_status === 'Verified' && <CheckCircle2 className="size-3" />}
                        {p.field_verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-foreground">
                      {p.compensation_paid > 0 ? formatINR(p.compensation_paid) : 'Pending'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedParcelId(p.id)
                          setIsHubOpen(true)
                        }}
                        className="inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-accent transition-colors shadow-2xs"
                      >
                        <span>View 360</span>
                        <ChevronRight className="size-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3: STATUTORY WORKFLOWS & SECTION 5: FIELD ASSIGNMENTS (2-column layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statutory Workflows */}
          <section id="workflows" aria-labelledby="workflows-heading" className="rounded-xl border border-border bg-card shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="workflows-heading" className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
                <Clock className="size-4 text-primary" />
                3. Priority Statutory Clearances &amp; Gazetted Stages
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">NH Act 1956</span>
            </div>

            <div className="space-y-3">
              {DEMO_WORKFLOWS.map((wf) => (
                <div key={wf.id} className="p-3.5 rounded-lg border border-border bg-background space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{wf.stage_name}</span>
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
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                    <span>Corridor: {wf.project_code}</span>
                    <span>Assigned: {wf.assigned_to}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Field Assignments */}
          <section id="assignments" aria-labelledby="assignments-heading" className="rounded-xl border border-border bg-card shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="assignments-heading" className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
                <UserCheck className="size-4 text-emerald-600" />
                5. Field Officer Assignments &amp; Ground Inspection Duty
              </h3>
              <Link href="/demo/field" className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                <span>Field Portal</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {DEMO_ASSIGNMENTS.map((asg) => (
                <div key={asg.id} className="p-3.5 rounded-lg border border-border bg-background space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary text-[11px] bg-primary/10 px-1.5 py-0.5 rounded">
                        {asg.parcel_number}
                      </span>
                      <span className="font-medium text-foreground text-xs">{asg.village_name}</span>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        asg.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : asg.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {asg.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{asg.remarks}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                    <span className="font-medium text-foreground">Officer: {asg.assigned_officer_name}</span>
                    <span>Due: {asg.due_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Parcel 360 Hub Modal */}
      <DemoParcelContextHub
        parcelId={selectedParcelId}
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
      />
    </div>
  )
}
