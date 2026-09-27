'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import DemoNavBanner from '@/components/demo/DemoNavBanner'
import ConflictDetectionPanel from '@/components/conflicts/ConflictDetectionPanel'
import {
  DEMO_PROJECTS,
  DEMO_PARCELS,
  DEMO_WORKFLOWS,
  DEMO_OBJECTIONS,
  getDemoKpis,
  type DemoProject,
} from '@/lib/demoData'
import {
  BarChart3,
  Building2,
  Briefcase,
  CheckCircle,
  Clock,
  ExternalLink,
  Filter,
  Globe,
  LandPlot,
  Layers,
  MapPin,
  RefreshCw,
  Ruler,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Users,
  Wallet,
  X,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

export default function DemoCentralView() {
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('SM-NASHIK-DEMO-01')
  const [conflictLocation, setConflictLocation] = useState<{ latitude: number; longitude: number; title: string } | null>(null)

  const selectedProjectObj = useMemo(() => {
    return DEMO_PROJECTS.find((p) => p.project_code === selectedProjectCode) || DEMO_PROJECTS[0]
  }, [selectedProjectCode])

  const kpis = useMemo(() => {
    return getDemoKpis(selectedProjectCode)
  }, [selectedProjectCode])

  // State-wise breakdown
  const stateAggregations = useMemo(() => {
    return [
      {
        state: 'Maharashtra (Samruddhi & Western Axis)',
        projectCount: 2,
        notifiedAreaHa: 3547.98,
        acquiredAreaHa: 1228.42,
        compensationCrores: 43.85,
        affectedFamilies: 24,
        status: 'Active Corridors',
      },
      {
        state: 'Delhi–Mumbai Corridor (Multi-State RoW)',
        projectCount: 1,
        notifiedAreaHa: 8120.65,
        acquiredAreaHa: 412.5,
        compensationCrores: 312.4,
        affectedFamilies: 320,
        status: 'Active Corridors',
      },
      {
        state: 'Uttar Pradesh (Freight & Bypass Periphery)',
        projectCount: 2,
        notifiedAreaHa: 3680.0,
        acquiredAreaHa: 185.3,
        compensationCrores: 118.25,
        affectedFamilies: 180,
        status: 'In Pipeline',
      },
      {
        state: 'Bihar / Northern Periphery',
        projectCount: 1,
        notifiedAreaHa: 650.25,
        acquiredAreaHa: 19.0,
        compensationCrores: 12.0,
        affectedFamilies: 16,
        status: 'Draft Stage',
      },
    ]
  }, [])

  // National attention items
  const attentionItems = useMemo(() => {
    return [
      {
        id: 'att-1',
        type: 'STAGE_CLEARANCE',
        title: 'Statutory Clearance Pending: Section 23 Award Determination',
        severity: 'HIGH',
        detail: 'Project SM-NASHIK-DEMO-01 comprehensive award enquiry and compensation calculations awaiting central nodal endorsement.',
        actionLabel: 'Review Corridor Workflows',
        actionHref: '/demo/state#workflows',
      },
      {
        id: 'att-2',
        type: 'GIS_CONFLICT',
        title: 'Spatial Alignment Intelligence: Nashik Corridor Junction',
        severity: conflictLocation ? 'CRITICAL' : 'MEDIUM',
        detail: conflictLocation?.title || 'Overlapping highway alignment intersects with adjacent economic corridor zone.',
        actionLabel: 'Inspect Conflict on Map',
        actionHref: '#gis',
      },
      {
        id: 'att-3',
        type: 'COMP_BLOCK',
        title: 'Compensation Disbursement Review: 3 Parcels Pending Survey Verification',
        severity: 'HIGH',
        detail: 'Parcels SM-NK-105, 111, 119 require boundary rectifications prior to PFMS Direct Benefit Transfer release.',
        actionLabel: 'View Field Queue',
        actionHref: '/demo/field',
      },
      {
        id: 'att-4',
        type: 'STAGE_CLEARANCE',
        title: 'Gazette Notification Pending: NH-709A',
        severity: 'MEDIUM',
        detail: 'Kishanganj Bypass Realignment proposal submitted; awaiting central Section 3A Gazette order.',
        actionLabel: 'View Proposal',
        actionHref: '#progress',
      },
    ]
  }, [conflictLocation])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Demo Navigation Bar */}
      <DemoNavBanner currentPortal="Central Officer" />

      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
        {/* Portal Header & Corridor Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Central Officer Portal &mdash; National Executive Overview
              </h1>
              <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                LIVE DEMO SYNC
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nationwide statutory acquisition monitoring across designated highway corridors, GIS alignments, and PFMS disbursement.
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-card border border-border p-2 rounded-lg shadow-2xs">
            <label htmlFor="central-demo-project-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Corridor:
            </label>
            <select
              id="central-demo-project-select"
              value={selectedProjectCode}
              onChange={(e) => setSelectedProjectCode(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer max-w-[340px] truncate"
            >
              <option value="ALL">All Projects (National Consolidated View)</option>
              {DEMO_PROJECTS.map((p) => (
                <option key={p.project_code} value={p.project_code}>
                  {p.project_code} &mdash; {p.project_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 1: NATIONAL OVERVIEW (KPI Cards) */}
        <section aria-labelledby="national-overview-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="national-overview-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="size-4 text-primary" />
              1. National Acquisition Metrics &amp; Aggregates
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {selectedProjectCode === 'ALL' ? 'Consolidated National View' : `Corridor: ${selectedProjectCode}`}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
            <article className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-900">Total Projects</span>
                <Briefcase className="size-4 text-blue-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-blue-950">
                {kpis.totalProjects}
              </p>
              <p className="text-[10px] text-blue-700 mt-1">
                {selectedProjectCode === 'ALL' ? 'Active corridor proposals' : 'Selected corridor alignment'}
              </p>
            </article>

            <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-900">Notified Area</span>
                <Ruler className="size-4 text-emerald-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-emerald-950">
                {kpis.totalNotifiedAreaHa.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Ha
              </p>
              <p className="text-[10px] text-emerald-700 mt-1">Gazetted statutory area</p>
            </article>

            <article className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-900">Acquired Area</span>
                <LandPlot className="size-4 text-green-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-green-950">
                {kpis.areaAcquiredHa.toFixed(2)} Ha
              </p>
              <p className="text-[10px] text-green-700 mt-1">
                {kpis.acquiredPercentage}% possession taken
              </p>
            </article>

            <article className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-amber-900">Compensation Out</span>
                <Wallet className="size-4 text-amber-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-amber-950">
                ₹ {kpis.compensationDisbursedCrores.toFixed(2)} Cr
              </p>
              <p className="text-[10px] text-amber-700 mt-1">PFMS Direct Benefit Transfer</p>
            </article>

            <article className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-purple-900">Affected Families</span>
                <Users className="size-4 text-purple-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-purple-950">
                {kpis.affectedFamiliesCount}
              </p>
              <p className="text-[10px] text-purple-700 mt-1">
                {kpis.rehabilitatedPercentage}% R&amp;R grants disbursed
              </p>
            </article>

            <article className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">Corridor Status</span>
                <ShieldCheck className="size-4 text-primary" />
              </div>
              <div className="flex flex-wrap gap-1 mt-1 text-[11px]">
                <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-semibold">
                  {kpis.activeProjectsCount} Active
                </span>
                <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-semibold">
                  {kpis.reviewProjectsCount} Review
                </span>
                <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 font-semibold">
                  {kpis.draftProjectsCount} Draft
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* SECTION 7: NATIONAL ATTENTION / REVIEW QUEUE */}
        <section id="attention" aria-labelledby="attention-heading" className="rounded-xl border border-red-200 bg-red-50/30 p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200/80 pb-3">
            <div>
              <h3 id="attention-heading" className="font-serif text-base font-bold text-red-950 flex items-center gap-2">
                <ShieldAlert className="size-5 text-red-600" />
                7. National Attention &amp; Executive Review Queue
              </h3>
              <p className="text-xs text-red-800 mt-0.5">
                Priority matters requiring central MoRTH coordination, statutory intervention, or SLAO follow-up.
              </p>
            </div>
            <span className="rounded-full bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 self-start sm:self-auto border border-red-300">
              {attentionItems.length} Action Items
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-red-200 bg-background p-3.5 space-y-2 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded',
                        item.severity === 'CRITICAL' && 'bg-red-100 text-red-800',
                        item.severity === 'HIGH' && 'bg-amber-100 text-amber-800',
                        item.severity === 'MEDIUM' && 'bg-blue-100 text-blue-800'
                      )}
                    >
                      {item.severity}
                    </span>
                    <AlertTriangle className="size-3.5 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-xs text-foreground line-clamp-2 mt-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {item.detail}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <Link
                    href={item.actionHref}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: STATE-WISE PROJECT MONITORING */}
        <section id="states" aria-labelledby="state-monitoring-heading" className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-5 py-4 bg-muted/10">
            <div>
              <div className="flex items-center gap-2">
                <h3 id="state-monitoring-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="size-4 text-primary" />
                  2. State-wise Project Monitoring &amp; Analytical Comparison
                </h3>
                <span className="rounded bg-primary/10 text-primary font-mono text-[10px] font-semibold px-2 py-0.5">
                  Analytical View
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aggregated national cross-comparison of land acquisition progress, notified area, and PFMS compensation delivery across states.
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground italic">
              Designated State SLAO / CALA jurisdictions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">State / Corridor Jurisdiction</th>
                  <th scope="col" className="px-4 py-3">Projects</th>
                  <th scope="col" className="px-4 py-3">Notified Area (Ha)</th>
                  <th scope="col" className="px-4 py-3">Acquired Area (Ha)</th>
                  <th scope="col" className="px-4 py-3">Compensation (₹ Cr)</th>
                  <th scope="col" className="px-4 py-3">Affected Persons</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stateAggregations.map((agg) => (
                  <tr key={agg.state} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="size-3.5 text-primary shrink-0" />
                      {agg.state}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                      {agg.projectCount}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {agg.notifiedAreaHa.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-700 font-medium">
                      {agg.acquiredAreaHa.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-foreground font-semibold">
                      ₹ {agg.compensationCrores.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground font-mono">
                      {agg.affectedFamilies}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {agg.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3: NATIONAL GIS INTELLIGENCE */}
        <section id="gis" aria-labelledby="gis-heading" className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 id="gis-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="size-4 text-primary" />
                  3. National GIS Intelligence &amp; Alignment Corridor Map
                </h3>
                <span className="rounded bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5">
                  Spatial Engine Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Satellite alignment overlay with automated spatial corridor conflict detection (SM-NASHIK-DEMO-01 Corridor).
              </p>
            </div>

            <span className="text-xs font-mono bg-muted px-2.5 py-1 rounded text-muted-foreground">
              Loaded: {selectedProjectObj.project_name}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* GIS Map Canvas */}
            <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden min-h-[420px] relative">
              <MapComponent
                conflictLocation={conflictLocation}
                projectGisUrl={selectedProjectObj.gis_file_url}
                projectName={selectedProjectObj.project_name}
                projectCode={selectedProjectCode !== 'ALL' ? selectedProjectCode : null}
              />
            </div>

            {/* Embedded Conflict Detection Engine */}
            <div>
              <ConflictDetectionPanel
                userRole="MoRTH Nodal Officer"
                onConflictDetected={(loc) => setConflictLocation(loc)}
              />
            </div>
          </div>
        </section>

        {/* SECTION 5: LANDOWNER OBJECTIONS (Section 3C Hearing Panel) */}
        <section id="objections" aria-labelledby="objections-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 id="objections-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" />
              5. Landowner Objections Review (Section 3C Hearings)
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {DEMO_OBJECTIONS.length} Registered Disputes Recorded
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3">Dispute Ref &amp; Parcel</th>
                    <th scope="col" className="px-4 py-3">Landowner</th>
                    <th scope="col" className="px-4 py-3">Objection Nature</th>
                    <th scope="col" className="px-4 py-3">Dispute Description</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Resolution Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {DEMO_OBJECTIONS.map((obj) => (
                    <tr key={obj.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-primary font-bold text-[11px]">{obj.parcel_number}</span>
                        <div className="text-[10px] text-muted-foreground">Survey: {obj.survey_number}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {obj.owner_name}
                        <div className="text-[10px] text-muted-foreground">{obj.village_name}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                          {obj.objection_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground max-w-xs leading-relaxed text-[11px]">
                        {obj.description}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            obj.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {obj.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-foreground">
                        {obj.resolution_remarks || 'Hearing scheduled before CALA Nashik'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 6: PROJECT PROGRESS & STATUTORY MILESTONES */}
        <section id="progress" aria-labelledby="progress-heading" className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/10">
            <div>
              <h3 id="progress-heading" className="font-serif text-base font-bold text-foreground">
                6. Project Progress &amp; Statutory Milestone Tracking
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current statutory stage and verified parcel progress recorded across project corridors.
              </p>
            </div>
            <Link href="/demo/state" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              <span>Inspect State Workflows</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">Project Code &amp; Name</th>
                  <th scope="col" className="px-4 py-3">State / District</th>
                  <th scope="col" className="px-4 py-3">Current Statutory Stage</th>
                  <th scope="col" className="px-4 py-3">Total Area</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DEMO_PROJECTS.map((p) => (
                  <tr key={p.project_code} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-primary font-bold text-[11px] bg-primary/10 px-2 py-0.5 rounded">
                        {p.project_code}
                      </span>
                      <div className="font-semibold text-foreground text-xs mt-1">{p.project_name}</div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      <div>{p.state}</div>
                      <div className="text-[10px]">{p.district}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
                        <Clock className="size-3 text-primary" />
                        {p.project_code === 'SM-NASHIK-DEMO-01'
                          ? 'Section 19 - Declaration of Acquisition'
                          : 'Section 3A - Intent to Acquire'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-foreground font-medium">
                      {p.total_area_required_ha} Ha
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
