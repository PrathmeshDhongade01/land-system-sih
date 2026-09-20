'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
import HierarchyPanel from '@/components/HierarchyPanel'
import ObjectionReviewPanel from '@/components/objections/ObjectionReviewPanel'
import FieldOfficerKpiCards from '@/components/FieldOfficerKpiCards'
import ParcelContextHub from '@/components/ParcelContextHub'
import {
  Building2,
  Briefcase,
  CheckCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  LandPlot,
  Layers,
  LogOut,
  MapPin,
  RefreshCw,
  Ruler,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  UserCheck,
  Users,
  Wallet,
  X,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export interface StatePortalViewProps {
  userEmail?: string | null
  userRole?: string | null
}

export default function StatePortalView({ userEmail, userRole }: StatePortalViewProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const browserClient = createBrowserClient()
    await browserClient.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Data States
  const [kpiData, setKpiData] = useState<DashboardKpis | null>(null)
  const [kpiLoading, setKpiLoading] = useState<boolean>(true)
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [parcels, setParcels] = useState<any[]>([])
  const [workflows, setWorkflows] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [projectStatuses, setProjectStatuses] = useState<ProjectWithStage[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [alertCounts, setAlertCounts] = useState<AlertSummaryCounts>({ critical: 0, high: 0, medium: 0, low: 0, total: 0 })

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

  // Operational Filters
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL')
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL')
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modals & 360 Hub
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null)
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false)

  // Listen to URL hash for deep linking
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [])

  // Load KPIs
  const loadKpis = useCallback(async () => {
    setKpiLoading(true)
    const client = createBrowserClient()
    const { kpis } = await fetchDashboardKpis(client, selectedProjectFilter !== 'ALL' ? selectedProjectFilter : null)
    if (kpis) setKpiData(kpis)
    setKpiLoading(false)
  }, [selectedProjectFilter])

  useEffect(() => {
    loadKpis()

    async function loadData() {
      setLoading(true)
      const client = createBrowserClient()
      try {
        const [pRes, parcRes, wfRes, asRes, stRes] = await Promise.all([
          client.from('projects').select('*').order('created_at', { ascending: false }),
          client.from('land_parcels').select('*').order('created_at', { ascending: false }),
          client.from('statutory_workflows').select('*').order('created_at', { ascending: false }),
          client.from('parcel_assignments').select('*').order('created_at', { ascending: false }),
          fetchRecentProjectStatuses(15, client),
        ])

        if (pRes.data) setProjectsList(pRes.data)
        if (parcRes.data) setParcels(parcRes.data)
        if (wfRes.data) setWorkflows(wfRes.data)
        if (asRes.data) setAssignments(asRes.data)
        if (stRes.projects) setProjectStatuses(stRes.projects)
      } catch (err) {
        console.error('[StatePortal] Data loading error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Extract distinct states present in parcels / projects
  const availableStates = useMemo(() => {
    const set = new Set<string>()
    parcels.forEach((p) => {
      if (p.state) set.add(p.state.trim())
    })
    projectsList.forEach((p) => {
      if (p.state && !p.state.includes('/')) set.add(p.state.trim())
    })
    return Array.from(set).sort()
  }, [parcels, projectsList])

  // Filtered Parcels based on analytical state filter and search
  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      if (selectedStateFilter !== 'ALL' && p.state?.trim() !== selectedStateFilter) return false
      if (selectedProjectFilter !== 'ALL' && p.project_code !== selectedProjectFilter) return false
      if (verificationFilter !== 'ALL' && p.field_verification_status !== verificationFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const pNum = (p.parcel_number || p.parcel_no || '').toLowerCase()
        const oName = (p.owner_name || '').toLowerCase()
        const vName = (p.village_name || '').toLowerCase()
        const sNum = (p.survey_number || '').toLowerCase()
        return pNum.includes(q) || oName.includes(q) || vName.includes(q) || sNum.includes(q)
      }
      return true
    })
  }, [parcels, selectedStateFilter, selectedProjectFilter, verificationFilter, searchQuery])

  // Operational metrics for the State
  const stateMetrics = useMemo(() => {
    const list = selectedStateFilter === 'ALL' ? parcels : parcels.filter((p) => p.state?.trim() === selectedStateFilter)
    const projs = selectedStateFilter === 'ALL' ? projectsList : projectsList.filter((p) => (p.state || '').includes(selectedStateFilter))

    const totalAreaSqm = list.reduce((s, p) => s + (parseFloat(String(p.notified_area_sqm || 0)) || 0), 0)
    const acquiredSqm = list.reduce((s, p) => {
      if (['Possessed', 'Possession Taken', 'Acquired', 'Completed'].includes(p.possession_status)) {
        return s + (parseFloat(String(p.affected_area_sqm || p.notified_area_sqm || 0)) || 0)
      }
      return s
    }, 0)

    const verifiedCount = list.filter((p) => p.field_verification_status === 'Verified').length
    const verifiedRate = list.length > 0 ? Math.round((verifiedCount / list.length) * 100) : 0

    const compDisbursed = list.reduce((s, p) => s + (parseFloat(String(p.compensation_paid || 0)) || 0), 0)
    const compAssessed = list.reduce((s, p) => s + (parseFloat(String(p.compensation_assessed || p.compensation_amount || 0)) || 0), 0)

    const rehabCompleted = list.filter((p) => p.rehabilitation_status === 'Completed').length

    const pendingActions = list.filter(
      (p) => p.field_verification_status !== 'Verified' || p.possession_status === 'Pending'
    ).length

    return {
      projectCount: projs.length,
      parcelCount: list.length,
      notifiedAreaHa: (totalAreaSqm / 10000).toFixed(2),
      acquiredAreaHa: (acquiredSqm / 10000).toFixed(2),
      verifiedRate,
      verifiedCount,
      compDisbursedINR: compDisbursed,
      compAssessedINR: compAssessed,
      rehabCompleted,
      pendingActions,
    }
  }, [parcels, projectsList, selectedStateFilter])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Tricolor Government Header */}
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
                State Land Acquisition Authority &middot; SLAO &amp; CALA Operational Gateway
              </p>
              <h1 className="font-serif text-sm font-bold text-foreground truncate">
                State Officer Portal &mdash; Operational Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-blue-100 text-blue-800 px-2.5 py-1 text-xs font-semibold">
              <Building2 className="size-3.5 text-blue-700" />
              Role: {userRole || 'SLAO / CALA'}
            </span>
            <span className="rounded bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground">
              {userEmail || 'slao.authority@morth.gov.in'}
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
        {/* SECTION 1: STATE OVERVIEW & OPERATIONAL CONTROL */}
        <section aria-labelledby="state-overview-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="state-overview-heading" className="font-serif text-xl font-bold tracking-tight text-foreground">
                  1. State Acquisition Overview &amp; Execution Metrics
                </h2>
                <span className="rounded bg-primary/10 text-primary font-mono text-[10px] font-bold px-2 py-0.5">
                  Live Operations
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time tracking of survey parcels, physical ground verification, awards, and direct compensation disbursement.
              </p>
            </div>

            {/* Analytical State Display Selector with Transparency Disclaimer */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Filter className="size-3.5" />
                <span>State View:</span>
              </div>
              <select
                value={selectedStateFilter}
                onChange={(e) => setSelectedStateFilter(e.target.value)}
                className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-semibold shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="ALL">All States (Full Operational Scope)</option>
                {availableStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50/70 border border-blue-200 p-2.5 text-[11px] text-blue-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-blue-700 shrink-0" />
              <span>
                <strong>Operational Notice:</strong> The State filter above is an analytical display filter. In this prototype, statutory jurisdiction is verified through authenticated officer credentials.
              </span>
            </div>
            <span className="font-mono text-[10px] text-blue-800 uppercase font-semibold">
              Filter: {selectedStateFilter}
            </span>
          </div>

          {/* Operational Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <article className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">State Parcels</span>
                <LandPlot className="size-4 text-primary" />
              </div>
              <p className="font-serif text-2xl font-bold text-foreground">
                {stateMetrics.parcelCount}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Across {stateMetrics.projectCount} corridor projects</p>
            </article>

            <article className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Verification Rate</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <p className="font-serif text-2xl font-bold text-emerald-700">
                {stateMetrics.verifiedRate}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stateMetrics.verifiedCount} of {stateMetrics.parcelCount} physically verified
              </p>
            </article>

            <article className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Compensation Disbursed</span>
                <Wallet className="size-4 text-amber-600" />
              </div>
              <p className="font-serif text-2xl font-bold text-foreground font-mono">
                {stateMetrics.compDisbursedINR > 0
                  ? `\u20B9 ${(stateMetrics.compDisbursedINR / 10000000).toFixed(2)} Cr`
                  : '\u20B9 0.00'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Direct Benefit Transfer (DBT)</p>
            </article>

            <article className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Action Queue</span>
                <AlertTriangle className="size-4 text-amber-600" />
              </div>
              <p className="font-serif text-2xl font-bold text-amber-700">
                {stateMetrics.pendingActions}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Pending verification / awards</p>
            </article>
          </div>
        </section>

        {/* SECTION 2: PROJECT MONITORING */}
        <section id="projects" aria-labelledby="projects-heading" className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-5 py-4 bg-muted/10">
            <div>
              <h3 id="projects-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                <Briefcase className="size-4 text-primary" />
                2. Operational Project Monitoring
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed statutory clearance milestones, corridor lengths, and acquisition stages.
              </p>
            </div>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors self-start sm:self-auto"
            >
              <Plus className="size-3.5" />
              New Corridor Proposal
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">Project Code</th>
                  <th scope="col" className="px-4 py-3">Name &amp; Corridor</th>
                  <th scope="col" className="px-4 py-3">District / Region</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Total Area (Ha)</th>
                  <th scope="col" className="px-4 py-3 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projectsList.map((p) => (
                  <tr key={p.project_code || p.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-primary">
                      {p.project_code}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {p.project_name}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {p.district || p.state || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          p.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {p.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {p.total_area_required_ha ? `${p.total_area_required_ha} Ha` : 'Not recorded'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href="/workflows"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        View Stages
                        <ChevronRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3: FIELD VERIFICATION WORKBENCH */}
        <section id="verification" aria-labelledby="verification-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 id="verification-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle className="size-4 text-emerald-600" />
                3. Field Verification Operations &amp; Inspection Queue
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live ground inspection tracking, surveyor evidence collection, and verification sign-offs.
              </p>
            </div>
            <Link
              href="/field-verification"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors self-start sm:self-auto"
            >
              <ExternalLink className="size-3.5" />
              Open Field Verification Portal
            </Link>
          </div>

          <FieldOfficerKpiCards />

          {/* Verification Records Table */}
          <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border bg-muted/10">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter parcel number, owner or village..."
                  className="w-full rounded-md border border-input bg-card pl-9 pr-4 py-1.5 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium shadow-2xs cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Verified">Verified</option>
                  <option value="Pending">Pending</option>
                  <option value="Needs Review">Needs Review</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-card">
                  <tr>
                    <th scope="col" className="px-5 py-3">Parcel ID &amp; Survey</th>
                    <th scope="col" className="px-4 py-3">Owner &amp; Village</th>
                    <th scope="col" className="px-4 py-3">State / Corridor</th>
                    <th scope="col" className="px-4 py-3">Verification</th>
                    <th scope="col" className="px-4 py-3">Verified By &amp; Date</th>
                    <th scope="col" className="px-4 py-3 text-right">360&deg; Hub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredParcels.slice(0, 15).map((p) => (
                    <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3 align-top">
                        <span className="font-mono text-xs font-bold text-primary">
                          {p.parcel_number || p.parcel_no || 'Parcel'}
                        </span>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Surv: {p.survey_number || p.khasra_no || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-foreground">{p.owner_name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.village_name}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        <div>{p.state || 'N/A'}</div>
                        <div className="text-[10px] font-mono">{p.project_code}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            p.field_verification_status === 'Verified' && 'bg-emerald-100 text-emerald-800',
                            p.field_verification_status === 'Needs Review' && 'bg-amber-100 text-amber-800',
                            (!p.field_verification_status || p.field_verification_status === 'Pending') &&
                              'bg-slate-100 text-slate-700'
                          )}
                        >
                          {p.field_verification_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-[11px] text-muted-foreground">
                        {p.field_verified_by ? (
                          <>
                            <div className="font-medium text-foreground">{p.field_verified_by}</div>
                            <div className="text-[10px]">
                              {p.field_verified_at ? new Date(p.field_verified_at).toLocaleDateString('en-IN') : ''}
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] italic">Not yet verified</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParcelId(p.id)
                            setIsHubOpen(true)
                          }}
                          className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <LandPlot className="size-3" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 4: ASSIGNMENTS & SECTION 5: STATUTORY WORKFLOWS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 4: Assignments */}
          <section id="assignments" aria-labelledby="assignments-heading" className="rounded-xl border border-border bg-card shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 id="assignments-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="size-4 text-primary" />
                  4. Field Officer Assignments
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Task allocation to Field Officers for physical boundary verification.
                </p>
              </div>
              <Link
                href="/assignments"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-3" />
                Assign Officer
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {assignments.length > 0 ? (
                assignments.slice(0, 5).map((as) => (
                  <div key={as.id} className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <div className="font-mono text-xs font-bold text-primary">
                        Assignment #{as.id.slice(0, 8)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Officer: <span className="font-medium text-foreground">{as.assigned_officer_id?.slice(0, 8)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Assigned on {new Date(as.created_at || as.assigned_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        as.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {as.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No active field assignments. Use the button above to assign officers.
                </div>
              )}
            </div>
          </section>

          {/* Section 5: Statutory Workflows */}
          <section id="workflows" aria-labelledby="workflows-heading" className="rounded-xl border border-border bg-card shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 id="workflows-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="size-4 text-primary" />
                  5. Statutory Acquisition Workflows
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Section 3A, 3C, 3D, Award 23 clearances &amp; readiness gates.
                </p>
              </div>
              <Link
                href="/workflows"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Manage Workflows</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {workflows.slice(0, 5).map((wf) => (
                <div key={wf.id} className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {wf.project_code}
                    </span>
                    <div className="font-semibold text-xs text-foreground mt-1">
                      {wf.workflow_type || wf.stage_name}
                    </div>
                    {wf.remarks && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 italic mt-0.5">
                        &ldquo;{wf.remarks}&rdquo;
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0',
                      wf.status === 'Approved' && 'bg-emerald-100 text-emerald-800',
                      wf.status === 'Pending Approval' && 'bg-amber-100 text-amber-800',
                      wf.status === 'Rejected' && 'bg-red-100 text-red-800'
                    )}
                  >
                    {wf.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* SECTION 6: COMPENSATION & R&R (Real Database Info) */}
        <section id="compensation" aria-labelledby="compensation-heading" className="rounded-xl border border-border bg-card shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 id="compensation-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                <Wallet className="size-4 text-emerald-600" />
                6. Compensation Assessment &amp; R&amp;R Operational Account
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Award amounts, DBT disbursement records, and Resettlement entitlements under Schedule II.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Total Recorded Disbursements: {stateMetrics.compDisbursedINR > 0 ? `\u20B9 ${(stateMetrics.compDisbursedINR / 10000000).toFixed(2)} Cr` : '\u20B9 0.00'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg bg-muted/20 border border-border p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Assessed Valuation
              </span>
              <p className="font-mono text-lg font-bold text-foreground">
                {stateMetrics.compAssessedINR > 0 ? `\u20B9 ${stateMetrics.compAssessedINR.toLocaleString('en-IN')}` : 'Not assessed'}
              </p>
              <p className="text-[10px] text-muted-foreground">Base market value + solatium</p>
            </div>

            <div className="rounded-lg bg-emerald-50/50 border border-emerald-200 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Direct Benefit Transfer Released
              </span>
              <p className="font-mono text-lg font-bold text-emerald-900">
                {stateMetrics.compDisbursedINR > 0 ? `\u20B9 ${stateMetrics.compDisbursedINR.toLocaleString('en-IN')}` : '\u20B9 0'}
              </p>
              <p className="text-[10px] text-emerald-700">Bank accounts credited</p>
            </div>

            <div className="rounded-lg bg-purple-50/50 border border-purple-200 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                Rehabilitation &amp; Resettlement
              </span>
              <p className="font-mono text-lg font-bold text-purple-900">
                {stateMetrics.rehabCompleted} Families Completed
              </p>
              <p className="text-[10px] text-purple-700">Alternative housing / grant</p>
            </div>
          </div>
        </section>

        {/* SECTION 7: OBJECTION REVIEW (Section 3C Operational Hearing) */}
        <section id="objections" aria-labelledby="objection-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 id="objection-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" />
              7. Landowner Objection Hearings (Section 3C Statutory Review)
            </h3>
            <span className="text-[11px] text-muted-foreground">Competent Authority hearing bench</span>
          </div>

          <ObjectionReviewPanel userRole={userRole} />
        </section>

        {/* SECTION 8: ALERTS & OPERATIONAL ATTENTION */}
        <section id="alerts" aria-labelledby="state-alerts-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 id="state-alerts-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-600" />
              8. State Operational Early Warnings
            </h3>
            <span className="text-[11px] text-muted-foreground">Compliance alerts and blocking bottlenecks</span>
          </div>

          <AlertSummary counts={alertCounts} />

          <AlertsPanel userRole={userRole} onCountsUpdated={handleAlertCountsUpdated} />
        </section>

        {/* SECTION 9: PROJECT / PARCEL DRILL-DOWN (HierarchyPanel) */}
        <section id="drilldown" aria-labelledby="drilldown-heading" className="rounded-xl border border-border bg-card shadow-2xs p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 id="drilldown-heading" className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
              <Layers className="size-4 text-primary" />
              9. Jurisdictional Hierarchy Drill-Down (State &rarr; District &rarr; Project &rarr; Village &rarr; Parcel)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drill down conceptually from State level to individual revenue Khata parcels and open 360&deg; contextual details.
            </p>
          </div>

          <HierarchyPanel
            onSelectParcel={(pId) => {
              setSelectedParcelId(pId)
              setIsHubOpen(true)
            }}
          />
        </section>
      </main>

      {/* 360 Context Hub */}
      <ParcelContextHub
        parcelId={selectedParcelId}
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        userRole={userRole}
      />
    </div>
  )
}
