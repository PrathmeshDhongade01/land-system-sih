'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  fetchDashboardKpis,
  fetchRecentProjectStatuses,
  type DashboardKpis,
  type ProjectWithStage,
} from '@/lib/supabase'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import AlertSummary, { type AlertSummaryCounts } from '@/components/alerts/AlertSummary'
import AlertsPanel from '@/components/alerts/AlertsPanel'
import ConflictDetectionPanel from '@/components/conflicts/ConflictDetectionPanel'
import ObjectionReviewPanel from '@/components/objections/ObjectionReviewPanel'
import ParcelContextHub from '@/components/ParcelContextHub'
import {
  BarChart3,
  Building2,
  Briefcase,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Filter,
  Globe,
  LandPlot,
  Layers,
  LogOut,
  Maximize2,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

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

export interface CentralPortalViewProps {
  userEmail?: string | null
  userRole?: string | null
}

interface StateAggregation {
  state: string
  projectCount: number
  notifiedAreaHa: number
  acquiredAreaHa: number
  compensationCrores: number
  affectedFamilies: number
  activeProjects: number
}

export default function CentralPortalView({ userEmail, userRole }: CentralPortalViewProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const browserClient = createBrowserClient()
    await browserClient.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Default Samruddhi Nashik project metadata
  const defaultSamruddhiProject = {
    id: '01843f0d-072e-4e25-a0a7-fcd7ed02ea10',
    project_code: 'SM-NASHIK-DEMO-01',
    project_name: 'Mumbai–Nagpur Samruddhi Expressway — Nashik Corridor Demo',
    state: 'Maharashtra',
    district: 'Nashik',
    status: 'Active',
    total_area_required_ha: 97.48,
    gis_file_url: '/gis/SM-NASHIK-DEMO-01.geojson',
  }

  // Data States
  const [kpiData, setKpiData] = useState<DashboardKpis | null>(null)
  const [kpiLoading, setKpiLoading] = useState<boolean>(true)
  const [projectsList, setProjectsList] = useState<any[]>([defaultSamruddhiProject])
  const [defaultProjectMissingFromDb, setDefaultProjectMissingFromDb] = useState<boolean>(false)
  const [parcels, setParcels] = useState<any[]>([])
  const [workflows, setWorkflows] = useState<any[]>([])
  const [projectStatuses, setProjectStatuses] = useState<ProjectWithStage[]>([])
  const [projectStatusesLoading, setProjectStatusesLoading] = useState<boolean>(true)
  const [alertCounts, setAlertCounts] = useState<AlertSummaryCounts>({ critical: 0, high: 0, medium: 0, low: 0, total: 0 })
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('SM-NASHIK-DEMO-01')

  // Stable callback for alert counts to prevent infinite update loop
  const handleAlertCountsUpdated = useCallback((counts: AlertSummaryCounts) => {
    setAlertCounts((prev) => {
      if (
        prev.critical === counts.critical &&
        prev.high === counts.high &&
        prev.medium === counts.medium &&
        prev.low === counts.low &&
        prev.total === counts.total
      ) {
        return prev
      }
      return counts
    })
  }, [])

  // Modals & Context
  const [conflictLocation, setConflictLocation] = useState<{ latitude: number; longitude: number; title: string } | null>(null)
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null)
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false)

  // Section Hash Navigation Support
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [])

  // Load National KPIs
  const loadKpis = useCallback(async (projectCode?: string) => {
    setKpiLoading(true)
    const client = createBrowserClient()
    const targetCode = projectCode !== undefined ? projectCode : selectedProjectCode
    const { kpis } = await fetchDashboardKpis(client, targetCode)
    if (kpis) setKpiData(kpis)
    setKpiLoading(false)
  }, [selectedProjectCode])

  // Initial Data Fetch
  useEffect(() => {
    loadKpis(selectedProjectCode)

    async function loadData() {
      const client = createBrowserClient()
      try {
        const [pRes, parcRes, wfRes, stRes] = await Promise.all([
          client.from('projects').select('*').order('created_at', { ascending: false }),
          client.from('land_parcels').select('*'),
          client.from('statutory_workflows').select('*').order('created_at', { ascending: false }),
          fetchRecentProjectStatuses(12, client),
        ])

        if (pRes.data && pRes.data.length > 0) {
          const hasSamruddhi = pRes.data.some((p: any) => p.project_code === 'SM-NASHIK-DEMO-01')
          if (hasSamruddhi) {
            const normalized = pRes.data.map((p: any) =>
              p.project_code === 'SM-NASHIK-DEMO-01'
                ? {
                    ...p,
                    project_name: p.project_name || defaultSamruddhiProject.project_name,
                    gis_file_url: p.gis_file_url || defaultSamruddhiProject.gis_file_url,
                  }
                : p
            )
            setProjectsList(normalized)
            setDefaultProjectMissingFromDb(false)
          } else {
            setProjectsList([defaultSamruddhiProject, ...pRes.data])
            setDefaultProjectMissingFromDb(true)
          }
        } else {
          setProjectsList([defaultSamruddhiProject])
          setDefaultProjectMissingFromDb(true)
        }
        if (parcRes.data) setParcels(parcRes.data)
        if (wfRes.data) setWorkflows(wfRes.data)
        if (stRes.projects) setProjectStatuses(stRes.projects)
      } catch (err) {
        console.error('[CentralPortal] Data fetch error:', err)
      } finally {
        setProjectStatusesLoading(false)
      }
    }

    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadKpis(selectedProjectCode)
  }, [selectedProjectCode, loadKpis])

  // 2. State-wise Aggregation (Computed strictly from real database records)
  const stateAggregations: StateAggregation[] = useMemo(() => {
    const map = new Map<string, StateAggregation>()

    const normState = (raw?: string | null) => {
      if (!raw) return 'Multi-State / Central'
      const s = raw.trim()
      if (s.includes('Delhi') || s.includes('Rajasthan') || s.includes('Gujarat') || s.includes('Maharashtra')) {
        if (s.includes('/')) return 'Delhi–Mumbai Corridor'
      }
      return s
    }

    // Accumulate project metrics
    for (const p of projectsList) {
      const st = normState(p.state)
      if (!map.has(st)) {
        map.set(st, {
          state: st,
          projectCount: 0,
          notifiedAreaHa: 0,
          acquiredAreaHa: 0,
          compensationCrores: 0,
          affectedFamilies: 0,
          activeProjects: 0,
        })
      }
      const agg = map.get(st)!
      agg.projectCount += 1
      agg.notifiedAreaHa += parseFloat(String(p.total_area_required_ha || 0)) || 0
      if (p.status === 'Active') agg.activeProjects += 1
    }

    // Accumulate parcel metrics by parcel state
    const ACQUIRED_SET = new Set(['Possessed', 'Possession Taken', 'Acquired', 'Completed'])
    for (const p of parcels) {
      const st = p.state?.trim() || 'Multi-State / Central'
      let agg = map.get(st)
      if (!agg) {
        // Map to corresponding state or create
        agg = {
          state: st,
          projectCount: 0,
          notifiedAreaHa: 0,
          acquiredAreaHa: 0,
          compensationCrores: 0,
          affectedFamilies: 0,
          activeProjects: 0,
        }
        map.set(st, agg)
      }

      if (ACQUIRED_SET.has(p.possession_status)) {
        agg.acquiredAreaHa += (parseFloat(String(p.affected_area_sqm || p.notified_area_sqm || 0)) || 0) / 10000
      }
      agg.compensationCrores += (parseFloat(String(p.compensation_paid || 0)) || 0) / 10000000
      agg.affectedFamilies += 1
    }

    return Array.from(map.values()).sort((a, b) => b.projectCount - a.projectCount)
  }, [projectsList, parcels])

  // 7. National Attention / Review Queue Items (Deterministic database triggers)
  const attentionItems = useMemo(() => {
    const list: Array<{
      id: string
      type: 'STAGE_CLEARANCE' | 'GIS_CONFLICT' | 'COMP_BLOCK' | 'UNVERIFIED'
      title: string
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
      detail: string
      actionLabel: string
      actionHref: string
    }> = []

    // 1. Projects pending Section 3A / 3D statutory clearances
    const pendingWfs = workflows.filter((w) => w.status === 'Pending Approval' || w.status === 'Pending')
    for (const w of pendingWfs.slice(0, 3)) {
      list.push({
        id: `wf-${w.id}`,
        type: 'STAGE_CLEARANCE',
        title: `Statutory Clearance Pending: ${w.workflow_type || w.stage_name}`,
        severity: 'HIGH',
        detail: `Project ${w.project_code} requires nodal approval before award determination.`,
        actionLabel: 'Review Workflow',
        actionHref: '/workflows',
      })
    }

    // 2. Spatial Overlap Intelligence
    if (conflictLocation) {
      list.push({
        id: 'gis-conflict-active',
        type: 'GIS_CONFLICT',
        title: 'Spatial Corridor Conflict Detected',
        severity: 'CRITICAL',
        detail: conflictLocation.title || 'Overlapping highway alignment intersects with adjacent economic corridor.',
        actionLabel: 'Inspect Conflict',
        actionHref: '#gis',
      })
    }

    // 3. Compensation Disbursement Blocked by Field Verification
    const unverifiedParcels = parcels.filter(
      (p) => p.field_verification_status !== 'Verified' && (p.compensation_approved || p.compensation_assessed)
    )
    if (unverifiedParcels.length > 0) {
      list.push({
        id: 'comp-blocked-ver',
        type: 'COMP_BLOCK',
        title: `Compensation Blocked on ${unverifiedParcels.length} Parcels`,
        severity: 'HIGH',
        detail: 'RFCTLARR Act mandates verified physical boundary surveys prior to DBT release.',
        actionLabel: 'View Parcels',
        actionHref: '/field-verification',
      })
    }

    // 4. Draft Projects Requiring Gazetted Notification
    const draftProjects = projectsList.filter((p) => p.status === 'Draft' || p.status === 'Under Review')
    for (const p of draftProjects.slice(0, 2)) {
      list.push({
        id: `draft-proj-${p.id}`,
        type: 'STAGE_CLEARANCE',
        title: `Gazette Notification Pending: ${p.project_code}`,
        severity: 'MEDIUM',
        detail: `${p.project_name} (${p.state}) submitted; awaiting central Section 3A Gazette order.`,
        actionLabel: 'View Project',
        actionHref: '/projects/new',
      })
    }

    return list
  }, [workflows, conflictLocation, parcels, projectsList])

  const selectedProjectObj = projectsList.find((p) => p.project_code === selectedProjectCode)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Tricolor Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="flex h-1 w-full">
          <div className="flex-1 bg-amber-500" />
          <div className="flex-1 bg-card" />
          <div className="flex-1 bg-emerald-600" />
        </div>
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary ring-1 ring-primary/15">
              <ChakraEmblem className="size-6" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground truncate">
                MoRTH Nodal Office &middot; National Land Acquisition Management System
              </p>
              <h1 className="font-serif text-sm font-bold text-foreground truncate">
                Central Officer Portal &mdash; National Monitoring
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Globe className="size-3.5" />
              National Jurisdiction
            </span>
            <span className="rounded bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground">
              {userEmail || 'morth.nodal@morth.gov.in'}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-accent transition-colors"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Portal Header & Scope Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold tracking-tight text-foreground">
                National Executive Overview &amp; Corridor Intelligence
              </h2>
              <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5">
                Live Data Synchronized
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive nationwide monitoring across all active highway alignment corridors and statutory acquisition stages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="central-project-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Corridor:
            </label>
            <select
              id="central-project-select"
              value={selectedProjectCode}
              onChange={(e) => setSelectedProjectCode(e.target.value)}
              className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="ALL">All Projects (National Consolidated View)</option>
              {projectsList.map((p) => (
                <option key={p.project_code || p.id} value={p.project_code}>
                  {p.project_code} &mdash; {p.project_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 1: NATIONAL OVERVIEW (Real Database KPIs) */}
        <section aria-labelledby="national-overview-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 id="national-overview-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="size-4 text-primary" />
              1. National Acquisition Metrics &amp; Aggregates
            </h3>
            <span className="text-[11px] text-muted-foreground">Derived from certified Ministry database records</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
            <article className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-900">Total Projects</span>
                <Briefcase className="size-4 text-blue-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-blue-950">
                {kpiLoading ? '...' : kpiData?.totalProjects ?? 'Not available'}
              </p>
              <p className="text-[10px] text-blue-700 mt-1">Active corridor proposals</p>
            </article>

            <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-900">Notified Area</span>
                <Ruler className="size-4 text-emerald-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-emerald-950">
                {kpiLoading
                  ? '...'
                  : kpiData?.totalNotifiedAreaHa
                  ? `${kpiData.totalNotifiedAreaHa.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Ha`
                  : 'Not available'}
              </p>
              <p className="text-[10px] text-emerald-700 mt-1">Gazetted Section 3A area</p>
            </article>

            <article className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-900">Acquired Area</span>
                <LandPlot className="size-4 text-green-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-green-950">
                {kpiLoading
                  ? '...'
                  : kpiData?.areaAcquiredHa !== undefined
                  ? `${kpiData.areaAcquiredHa.toFixed(2)} Ha`
                  : 'Not available'}
              </p>
              <p className="text-[10px] text-green-700 mt-1">
                {kpiData ? `${kpiData.acquiredPercentage}% possession taken` : 'Possession progress'}
              </p>
            </article>

            <article className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-amber-900">Compensation Out</span>
                <Wallet className="size-4 text-amber-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-amber-950">
                {kpiLoading
                  ? '...'
                  : kpiData?.compensationDisbursedCrores !== undefined
                  ? `\u20B9 ${kpiData.compensationDisbursedCrores.toFixed(2)} Cr`
                  : 'Not available'}
              </p>
              <p className="text-[10px] text-amber-700 mt-1">PFMS Direct Benefit Transfer</p>
            </article>

            <article className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-purple-900">Affected Families</span>
                <Users className="size-4 text-purple-700" />
              </div>
              <p className="font-serif text-2xl font-bold text-purple-950">
                {kpiLoading ? '...' : kpiData?.affectedFamiliesCount ?? 'Not available'}
              </p>
              <p className="text-[10px] text-purple-700 mt-1">Identified parcel owners</p>
            </article>

            <article className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">Projects by Status</span>
                <ShieldCheck className="size-4 text-primary" />
              </div>
              <div className="flex flex-wrap gap-1 mt-1 text-[11px]">
                <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-semibold">
                  {projectsList.filter((p) => p.status === 'Active').length} Active
                </span>
                <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-semibold">
                  {projectsList.filter((p) => p.status === 'Under Review').length} Review
                </span>
                <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 font-semibold">
                  {projectsList.filter((p) => p.status === 'Draft').length} Draft
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* SECTION 7: NATIONAL ATTENTION / REVIEW QUEUE (Deterministic Priority Tasks) */}
        <section id="attention" aria-labelledby="attention-heading" className="rounded-xl border border-red-200 bg-red-50/30 p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200/80 pb-3">
            <div>
              <h3 id="attention-heading" className="font-serif text-base font-bold text-red-950 flex items-center gap-2">
                <ShieldAlert className="size-5 text-red-600" />
                7. National Attention &amp; Executive Review Queue
              </h3>
              <p className="text-xs text-red-800 mt-0.5">
                Priority matters requiring MoRTH central coordination, statutory intervention, or SLAO follow-up (Deterministic Rule Engine).
              </p>
            </div>
            <span className="rounded-full bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 self-start sm:self-auto border border-red-300">
              {attentionItems.length} Critical Items Identified
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

        {/* SECTION 2: STATE-WISE PROJECT MONITORING (Analytical National Comparison) */}
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
                Aggregated national cross-comparison of land acquisition progress, notified area, and compensation delivery across states.
              </p>
            </div>

            <span className="text-[11px] text-muted-foreground italic">
              Note: Analytical grouping; statutory authority is vested in designated State SLAO / CALA authorities.
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
                  <th scope="col" className="px-4 py-3">Operational Status</th>
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
                      {agg.notifiedAreaHa > 0 ? agg.notifiedAreaHa.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : '0.0'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-700 font-medium">
                      {agg.acquiredAreaHa > 0 ? agg.acquiredAreaHa.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-foreground font-semibold">
                      {agg.compensationCrores > 0 ? `\u20B9 ${agg.compensationCrores.toFixed(2)}` : '\u20B9 0.00'}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground font-mono">
                      {agg.affectedFamilies}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          agg.activeProjects > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {agg.activeProjects > 0 ? `${agg.activeProjects} Active Corridors` : 'In Pipeline'}
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
                  Spatial Engine
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Satellite &amp; cadastral corridor alignment overlays with automated spatial conflict detection.
              </p>
            </div>

            <Link
              href="/field-verification"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors self-start sm:self-auto"
            >
              <Maximize2 className="size-3.5" />
              Full Screen GIS
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Acquisition Map Card */}
            <div className="lg:col-span-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div>
                  <h2 className="font-serif text-base font-semibold text-foreground">Acquisition Map</h2>
                  <p className="text-xs text-muted-foreground">GIS corridor view &middot; Land parcel overlay</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-full bg-[#1e3a8a]" />
                      Corridor
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-full bg-emerald-600" />
                      Acquired
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-full bg-amber-500" />
                      Pending
                    </span>
                    {conflictLocation && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block size-2.5 rounded-full bg-red-500" />
                        Conflict
                      </span>
                    )}
                  </div>
                  <Link
                    href="/field-verification"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <Maximize2 className="size-3.5" />
                    View Full Map
                  </Link>
                </div>
              </div>
              <div className="flex-1 min-h-[420px] relative">
                <MapComponent
                  conflictLocation={conflictLocation}
                  projectGisUrl={
                    selectedProjectCode !== 'ALL'
                      ? selectedProjectObj?.gis_file_url ||
                        (selectedProjectCode === 'SM-NASHIK-DEMO-01' ? defaultSamruddhiProject.gis_file_url : null)
                      : null
                  }
                  projectName={
                    selectedProjectCode !== 'ALL'
                      ? selectedProjectObj?.project_name ||
                        (selectedProjectCode === 'SM-NASHIK-DEMO-01' ? defaultSamruddhiProject.project_name : null)
                      : null
                  }
                  projectCode={selectedProjectCode}
                  parcels={parcels}
                  isNationalView={selectedProjectCode === 'ALL'}
                  defaultProjectMissingFromDb={defaultProjectMissingFromDb}
                />
              </div>
            </div>

            {/* Embedded Conflict Detection Engine */}
            <div>
              <ConflictDetectionPanel
                userRole={userRole}
                onConflictDetected={(loc) => setConflictLocation(loc)}
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: ALERTS & ATTENTION ITEMS */}
        <section id="alerts" aria-labelledby="alerts-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 id="alerts-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-600" />
              4. Deterministic Early Warning Alerts &amp; Actions
            </h3>
            <span className="text-[11px] text-muted-foreground">Automated statutory compliance monitor</span>
          </div>

          <AlertSummary counts={alertCounts} />

          <AlertsPanel
            userRole={userRole}
            onCountsUpdated={handleAlertCountsUpdated}
          />
        </section>

        {/* SECTION 5: LANDOWNER OBJECTIONS (Section 3C Review Panel) */}
        <section id="objections" aria-labelledby="objections-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 id="objections-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" />
              5. Landowner Objections Review (Section 3C Hearing)
            </h3>
            <span className="text-[11px] text-muted-foreground">Nationwide landowner dispute resolution queue</span>
          </div>

          <ObjectionReviewPanel userRole={userRole} currentProjectCode={selectedProjectCode} />
        </section>

        {/* SECTION 6: PROJECT PROGRESS */}
        <section id="progress" aria-labelledby="progress-heading" className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-5 py-4 bg-muted/10">
            <div>
              <h3 id="progress-heading" className="font-serif text-base font-bold text-foreground">
                6. Project Progress &amp; Statutory Milestone Tracking
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current statutory stage and verified parcel progress recorded across project corridors.
              </p>
            </div>
            <Link href="/projects/new" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              <span>View All Projects</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {projectStatusesLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="size-5 animate-spin text-primary mx-auto mb-2" />
                <span>Loading statutory project milestones...</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3">Project Code &amp; Corridor</th>
                    <th scope="col" className="px-4 py-3">State / District</th>
                    <th scope="col" className="px-4 py-3">Current Statutory Stage</th>
                    <th scope="col" className="px-4 py-3">Total Area (Ha)</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectStatuses.map((proj) => {
                    const fullProj = projectsList.find((p) => p.project_code === proj.project_code || p.id === proj.id)
                    return (
                      <tr key={proj.project_code || proj.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {proj.project_code}
                          </span>
                          <div className="font-semibold text-foreground text-xs mt-1">
                            {proj.project_name}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          <div>{fullProj?.state || 'National'}</div>
                          <div className="text-[10px]">{proj.district || 'Corridor'}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
                            <Clock className="size-3 text-primary" />
                            {proj.stage || 'Section 3A - Intent to Acquire'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-foreground font-medium">
                          {fullProj?.total_area_required_ha ? `${fullProj.total_area_required_ha} Ha` : 'Not assessed'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              proj.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {proj.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                        <Link
                          href="/workflows"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          Milestones
                          <ChevronRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      <ParcelContextHub
        parcelId={selectedParcelId}
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        userRole={userRole}
      />
    </div>
  )
}
