'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  supabase,
  fetchDashboardKpis,
  fetchRecentProjectStatuses,
  type DashboardKpis,
  type ProjectWithStage,
} from '@/lib/supabase'
import ProgressChart from '@/components/ProgressChart'
import RouteMap from '@/components/RouteMap'
import ParcelContextHub from '@/components/ParcelContextHub'
import RoleDashboardSection from '@/components/RoleDashboardSections'
import MyTasksPanel from '@/components/MyTasksPanel'

const Map = dynamic(() => import('../components/Map'), { ssr: false })
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/notifications/NotificationBell'
import AlertSummary, { type AlertSummaryCounts } from '@/components/alerts/AlertSummary'
import AlertsPanel from '@/components/alerts/AlertsPanel'
import HierarchyPanel from '@/components/HierarchyPanel'
import ConflictDetectionPanel from '@/components/conflicts/ConflictDetectionPanel'
import {
  AlertCircle,
  Banknote,
  Bell,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Layers,
  LandPlot,
  LogOut,
  Maximize2,
  Menu,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Upload,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Ashoka Chakra emblem                                                       */
/* -------------------------------------------------------------------------- */

function ChakraEmblem({ className }: { className?: string }) {
  const spokes = Array.from({ length: 24 })
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Ashoka Chakra emblem"
    >
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
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

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

interface DashboardHeaderProps {
  status?: string
  userEmail?: string | null
  userRole?: string | null
  onSignOut?: () => void
}

function DashboardHeader({ status, userEmail, userRole, onSignOut }: DashboardHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="border-b border-border bg-card">
      {/* Tricolor top rule */}
      <div className="flex h-1 w-full">
        <div className="flex-1 bg-saffron" />
        <div className="flex-1 bg-card" />
        <div className="flex-1 bg-green-india" />
      </div>

      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 p-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary ring-1 ring-primary/15 sm:size-12">
            <ChakraEmblem className="size-7 sm:size-9" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
              Government of India · Ministry of Rural Development
            </p>
            <h1 className="truncate font-serif text-base font-semibold text-foreground sm:text-xl">
              National Land Acquisition Management System
            </h1>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-green-india/10 px-2.5 py-1 text-xs font-medium text-green-india">
            <ShieldCheck className="size-3.5" />
            {status ? status : 'Secure Session'}
          </span>
          <NotificationBell userRole={userRole} />
          <div className="flex items-center gap-2 border-l border-border pl-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {userEmail ? userEmail[0].toUpperCase() : 'AS'}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-foreground truncate max-w-[160px]" title={userEmail || 'A. Sharma, IAS'}>
                {userEmail || 'A. Sharma, IAS'}
              </p>
              <p className="text-xs text-muted-foreground">{userRole || 'Competent Authority'}</p>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="ml-2 flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Mobile collapsible panel */}
      {open && (
        <div className="border-t border-border bg-card p-4 sm:px-6 lg:hidden">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {userEmail ? userEmail[0].toUpperCase() : 'AS'}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                  {userEmail || 'A. Sharma, IAS'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userRole || 'Competent Authority'}
                </p>
              </div>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
              >
                <LogOut className="size-3.5" />
                Sign Out
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-green-india/10 px-2.5 py-1 text-xs font-medium text-green-india">
              <ShieldCheck className="size-3.5" />
              {status ? status : 'Secure Session'}
            </span>
            <NotificationBell userRole={userRole} />
          </div>
        </div>
      )}
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/* KPI cards                                                                  */
/* -------------------------------------------------------------------------- */

type Kpi = {
  label: string
  value?: string
  unit?: string
  sub: string
  trend: string
  icon: LucideIcon
  accent: 'primary' | 'saffron' | 'green'
  progress: number
  isAreaCard?: boolean
}

const accentMap = {
  primary: {
    icon: 'bg-primary/10 text-primary',
    bar: 'bg-primary',
  },
  saffron: {
    icon: 'bg-saffron/15 text-saffron-foreground',
    bar: 'bg-saffron',
  },
  green: {
    icon: 'bg-green-india/10 text-green-india',
    bar: 'bg-green-india',
  },
}

interface KpiCardsProps {
  projectData?: any
  kpiData?: DashboardKpis | null
  loading?: boolean
  error?: string | null
}

function KpiCards({ projectData, kpiData, loading, error }: KpiCardsProps) {
  if (error && !kpiData) {
    return (
      <section
        aria-label="Key performance indicators error"
        className="rounded-lg border border-red-200 bg-red-50 p-5 text-xs text-red-800 flex items-center gap-3 shadow-sm"
      >
        <AlertCircle className="size-5 text-red-600 shrink-0" />
        <div>
          <p className="font-semibold text-sm text-red-900">Database KPI Fetch Error</p>
          <p className="mt-0.5 text-red-700">{error}</p>
        </div>
      </section>
    )
  }

  const kpis: Kpi[] = [
    {
      label: 'Total Area Notified',
      value: loading
        ? 'Loading...'
        : kpiData
        ? kpiData.totalNotifiedAreaHa.toLocaleString('en-IN', { maximumFractionDigits: 2 })
        : projectData?.total_area_required_ha || 'Loading...',
      unit: 'hectares',
      sub: kpiData ? `Across ${kpiData.totalProjects} active projects` : 'Across notified corridors',
      trend: kpiData ? `${kpiData.totalProjects} Projects Synced` : 'Database Synced',
      icon: Ruler,
      accent: 'primary',
      progress: 100,
    },
    {
      label: 'Area Acquired',
      value: loading
        ? 'Loading...'
        : kpiData
        ? kpiData.areaAcquiredHa.toLocaleString('en-IN', { maximumFractionDigits: 2 })
        : 'Loading...',
      unit: 'hectares',
      sub: kpiData ? `${kpiData.acquiredPercentage}% of notified area` : 'Possession in progress',
      trend: kpiData ? `${kpiData.acquiredPercentage}% Acquired` : 'Possession in progress',
      icon: LandPlot,
      accent: 'green',
      progress: kpiData ? kpiData.acquiredPercentage : 0,
    },
    {
      label: 'Compensation Disbursed',
      value: loading
        ? 'Loading...'
        : kpiData
        ? `₹ ${kpiData.compensationDisbursedCrores.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
        : 'Loading...',
      unit: 'crore',
      sub: kpiData ? `To ${kpiData.affectedFamiliesCount} beneficiaries` : 'Direct Benefit Transfer',
      trend: kpiData ? `₹ ${kpiData.compensationDisbursedCrores.toFixed(2)} Cr Disbursed` : 'PFMS Direct Benefit Transfer',
      icon: Banknote,
      accent: 'saffron',
      progress: kpiData ? kpiData.acquiredPercentage : 0,
    },
    {
      label: 'Affected Families',
      value: loading
        ? 'Loading...'
        : kpiData
        ? kpiData.affectedFamiliesCount.toLocaleString('en-IN')
        : 'Loading...',
      unit: 'families',
      sub: kpiData ? `${kpiData.rehabilitatedFamiliesCount} rehabilitated` : 'Resettlement status',
      trend: kpiData ? `${kpiData.rehabilitatedPercentage}% resettled` : 'Rehabilitation active',
      icon: Users,
      accent: 'primary',
      progress: kpiData ? kpiData.rehabilitatedPercentage : 0,
    },
  ]

  return (
    <section
      aria-label="Key performance indicators"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {kpis.map((kpi) => {
        const accent = accentMap[kpi.accent]
        const Icon = kpi.icon
        return (
          <article
            key={kpi.label}
            className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground text-pretty">
                {kpi.label}
              </p>
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-md',
                  accent.icon,
                )}
              >
                <Icon className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  {kpi.value}
                </span>
                {kpi.unit && kpi.value !== 'Loading...' && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {kpi.unit}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
            </div>

            <div className="mt-auto space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', accent.bar)}
                  style={{ width: `${kpi.progress}%` }}
                />
              </div>
              <p className="text-xs font-medium text-green-india">{kpi.trend}</p>
            </div>
          </article>
        )
      })}
    </section>
  )
}



/* -------------------------------------------------------------------------- */
/* Project status                                                             */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Project status                                                             */
/* -------------------------------------------------------------------------- */

function getStageStyle(stage: string) {
  const s = stage.toLowerCase()
  if (s.includes('11') || s.includes('notification')) {
    return {
      badge: 'bg-saffron/15 text-saffron-foreground ring-saffron/30',
      label: 'Notification',
      dot: 'bg-saffron',
    }
  }
  if (s.includes('19') || s.includes('3d') || s.includes('declaration')) {
    return {
      badge: 'bg-primary/10 text-primary ring-primary/25',
      label: 'Declaration',
      dot: 'bg-primary',
    }
  }
  if (s.includes('23') || s.includes('award')) {
    return {
      badge: 'bg-green-india/12 text-green-india ring-green-india/30',
      label: 'Award Passed',
      dot: 'bg-green-india',
    }
  }
  if (s.includes('3a') || s.includes('intent')) {
    return {
      badge: 'bg-blue-50 text-blue-700 ring-blue-600/30',
      label: 'Intent Notice',
      dot: 'bg-blue-500',
    }
  }
  if (s.includes('not initiated') || s.includes('not started')) {
    return {
      badge: 'bg-muted text-muted-foreground ring-border',
      label: 'Not Started',
      dot: 'bg-muted-foreground',
    }
  }
  return {
    badge: 'bg-primary/10 text-primary ring-primary/25',
    label: stage.length > 22 ? `${stage.substring(0, 20)}...` : stage,
    dot: 'bg-primary',
  }
}

interface ProjectStatusProps {
  projects?: ProjectWithStage[]
  totalProjects?: number
  loading?: boolean
  error?: string | null
}

function ProjectStatus({ projects = [], totalProjects, loading, error }: ProjectStatusProps) {
  return (
    <section
      aria-label="Recent project status"
      className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="font-serif text-base font-semibold text-foreground">
            Recent Project Status
          </h2>
          <p className="text-xs text-muted-foreground">
            RFCTLARR Act, 2013 · Acquisition stages
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
            <RefreshCw className="size-4 animate-spin text-primary" />
            <span>Loading recent projects from Supabase...</span>
          </div>
        ) : error ? (
          <div className="p-5 text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0" />
            <span>Error loading project status: {error}</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No projects found.
          </div>
        ) : (
          <ul className="min-w-[280px] divide-y divide-border">
            {projects.map((p) => {
              const s = getStageStyle(p.stage)
              return (
                <li key={p.project_code || p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/60 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                          {p.project_code}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {p.project_name}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{p.district}</span>
                        <span aria-hidden>·</span>
                        <Clock className="size-3" />
                        <span>{p.updated}</span>
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                          s.badge,
                        )}
                      >
                        <span className={cn('size-1.5 rounded-full', s.dot)} />
                        {p.stage}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {s.label}
                      </span>
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 sm:px-5">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          View all {totalProjects !== undefined ? totalProjects : projects.length} projects
          <ChevronRight className="size-4" />
        </button>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* CSV Export Helper                                                          */
/* -------------------------------------------------------------------------- */

function exportToCSV(data: any[], filename = 'nashik_expressway_records.csv') {
  if (!data || data.length === 0) return

  const headers = ['ID', 'Owner Name', 'Village Name', 'Notified Area (sqm)', 'Possession Status']
  const keys = ['id', 'owner_name', 'village_name', 'notified_area_sqm', 'possession_status']

  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      keys
        .map((key) => {
          const val = row[key] ?? ''
          const escaped = String(val).replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(','),
    ),
  ]

  const csvString = csvRows.join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/* -------------------------------------------------------------------------- */
/* Land records & affected persons table                                      */
/* -------------------------------------------------------------------------- */

interface LandRecordsTableProps {
  parcels: any[]
  totalCount: number
  searchQuery: string
  setSearchQuery: (val: string) => void
  possessionFilter: string
  setPossessionFilter: (val: string) => void
  possessionStatuses: string[]
  onSelectParcel: (parcel: any) => void
  isProjectView?: boolean
}

function LandRecordsTable({
  parcels,
  totalCount,
  searchQuery,
  setSearchQuery,
  possessionFilter,
  setPossessionFilter,
  possessionStatuses,
  onSelectParcel,
  isProjectView,
}: LandRecordsTableProps) {
  const uniqueOwnersCount = new Set(
    parcels.map((p) => (p.owner_name || '').trim()).filter(Boolean)
  ).size

  const totalAffectedAreaHa = (
    parcels.reduce((sum, p) => sum + parseFloat(String(p.affected_area_sqm || p.notified_area_sqm || 0)), 0) /
    10000
  ).toFixed(2)

  return (
    <section
      aria-label="Land Records and Affected Persons"
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
    >
      {/* Table Header */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-base font-semibold text-foreground">
            {isProjectView ? 'LAND ACQUISITION — AFFECTED PARCELS' : 'Land Records & Affected Persons'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Dynamic survey parcel details and land acquisition records · Click a row to view full 360° details
          </p>
        </div>

        {/* Small Summary Metrics */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            Affected Parcels: {parcels.length}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            Affected Landowners: {uniqueOwnersCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            Affected Area: {totalAffectedAreaHa} Ha
          </span>
        </div>
      </div>

      {/* Search and Dropdown Filter Controls Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Search className="size-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by owner name or village name..."
            className="w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Possession Status Dropdown Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 sm:w-52 min-w-[160px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Filter className="size-3.5" />
            </div>
            <select
              value={possessionFilter}
              onChange={(e) => setPossessionFilter(e.target.value)}
              aria-label="Filter by possession status"
              className="w-full appearance-none rounded-md border border-input bg-background pl-8 pr-8 py-2 text-sm text-foreground shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors cursor-pointer"
            >
              <option value="All">All Possession Statuses</option>
              {possessionStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground">
              <ChevronRight className="size-3.5 rotate-90" />
            </div>
          </div>

          {/* Export Data CSV Button */}
          <button
            type="button"
            onClick={() => exportToCSV(parcels, 'land_acquisition_records.csv')}
            disabled={!parcels || parcels.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Export filtered records as CSV"
          >
            <Download className="size-3.5 text-primary" />
            <span>Export Data</span>
          </button>

          {/* Clear All Filters Button */}
          {(searchQuery || possessionFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setPossessionFilter('All')
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            >
              <X className="size-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 sm:px-6">
                Parcel ID
              </th>
              <th scope="col" className="px-4 py-3 sm:px-6">
                Owner
              </th>
              <th scope="col" className="hidden md:table-cell px-4 py-3 sm:px-6">
                Village
              </th>
              <th scope="col" className="hidden lg:table-cell px-4 py-3 sm:px-6">
                Survey / Khasra
              </th>
              <th scope="col" className="hidden sm:table-cell px-4 py-3 sm:px-6">
                Total Land (Ha)
              </th>
              <th scope="col" className="hidden sm:table-cell px-4 py-3 sm:px-6">
                Affected Land (Ha)
              </th>
              <th scope="col" className="px-4 py-3 sm:px-6">
                Acquisition Status
              </th>
              <th scope="col" className="hidden md:table-cell px-4 py-3 sm:px-6">
                Verification
              </th>
              <th scope="col" className="hidden xl:table-cell px-4 py-3 sm:px-6">
                Compensation
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parcels && parcels.length > 0 ? (
              parcels.map((parcel, idx) => {
                const parcelIdCode = parcel.parcel_number || parcel.parcel_no || `LP-${String(parcel.id || idx).slice(0, 6).toUpperCase()}`
                const surveyKhasra = [parcel.survey_number || parcel.survey_no, parcel.khasra_no || parcel.khasra_number].filter(Boolean).join(' / ') || '-'
                const totalHa = (parseFloat(String(parcel.notified_area_sqm || 0)) / 10000).toFixed(2)
                const affectedHa = (parseFloat(String(parcel.affected_area_sqm || parcel.notified_area_sqm || 0)) / 10000).toFixed(2)
                const compVal = parcel.compensation_paid || parcel.compensation_amount || 0
                const verStatus = parcel.field_verification_status || 'Pending'

                return (
                  <tr
                    key={parcel.id || idx}
                    onClick={() => onSelectParcel(parcel)}
                    className="cursor-pointer transition-colors hover:bg-accent/60"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary sm:px-6">
                      {parcelIdCode}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground sm:px-6 sm:text-sm">
                      {parcel.owner_name}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-muted-foreground sm:px-6 sm:text-sm">
                      {parcel.village_name}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 font-mono text-xs text-muted-foreground sm:px-6">
                      {surveyKhasra}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 font-mono text-xs text-muted-foreground sm:px-6">
                      {totalHa} Ha
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 font-mono text-xs font-semibold text-foreground sm:px-6">
                      {affectedHa} Ha
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          parcel.possession_status === 'Possessed' ||
                            parcel.possession_status === 'Possession Taken' ||
                            parcel.possession_status === 'Completed' ||
                            parcel.possession_status === 'Acquired'
                            ? 'bg-green-india/10 text-green-india'
                            : parcel.possession_status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-saffron/15 text-saffron-foreground',
                        )}
                      >
                        {parcel.possession_status || 'Pending'}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 sm:px-6">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          verStatus === 'Verified'
                            ? 'bg-green-100 text-green-800'
                            : verStatus === 'Needs Review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {verStatus}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell px-4 py-3 font-mono text-xs text-foreground sm:px-6">
                      {compVal > 0 ? `₹ ${Number(compVal).toLocaleString('en-IN')}` : 'Not Assessed'}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <p className="font-medium text-foreground">
                      No matching land records found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your search query or possession status filter.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

const DEFAULT_FALLBACK_PARCELS = [
  { id: 1, owner_name: 'Rajesh Kumar', village_name: 'Rampur', notified_area_sqm: 1250, possession_status: 'Possessed' },
  { id: 2, owner_name: 'Suresh Patel', village_name: 'Kishanganj', notified_area_sqm: 3400, possession_status: 'Pending' },
  { id: 3, owner_name: 'Anita Devi', village_name: 'Devnagar', notified_area_sqm: 2100, possession_status: 'Completed' },
  { id: 4, owner_name: 'Vikram Singh', village_name: 'Baghpat', notified_area_sqm: 4800, possession_status: 'Acquired' },
  { id: 5, owner_name: 'Mahesh Sharma', village_name: 'Rampur', notified_area_sqm: 1750, possession_status: 'Pending' },
  { id: 6, owner_name: 'Sunita Verma', village_name: 'Kishanganj', notified_area_sqm: 2900, possession_status: 'Possessed' },
]

export default function Page() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [projectData, setProjectData] = useState<any>(null)

  useEffect(() => {
    const browserClient = createBrowserClient()
    browserClient.auth.getUser().then((res: any) => {
      const data = res?.data
      if (data?.user) {
        setUserEmail(data.user.email ?? null)
        browserClient
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()
          .then((profRes: any) => {
            const prof = profRes?.data
            if (prof?.role) {
              setUserRole(prof.role)
            }
          })
      }
    })
  }, [])

  const handleSignOut = async () => {
    const browserClient = createBrowserClient()
    await browserClient.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const [parcels, setParcels] = useState<any[]>([])
  const [filteredParcels, setFilteredParcels] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [possessionFilter, setPossessionFilter] = useState<string>('All')
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null)
  const [hubParcelId, setHubParcelId] = useState<string | null>(null)
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false)
  const [gisData, setGisData] = useState<any>(null)
  const [isCalculating, setIsCalculating] = useState<boolean>(false)
  const [spatialStatus, setSpatialStatus] = useState<'idle' | 'calculating' | 'success' | 'failed' | 'unavailable'>('idle')
  const [spatialErrorMessage, setSpatialErrorMessage] = useState<string>('')
  // GIS Conflict Detection State
  const [conflictLocation, setConflictLocation] = useState<{ latitude: number; longitude: number; title?: string } | null>(null)
  const [alertsRefreshKey, setAlertsRefreshKey] = useState<number>(0)
  // Dynamic Dashboard KPIs State
  const [kpiData, setKpiData] = useState<DashboardKpis | null>(null)
  const [kpiLoading, setKpiLoading] = useState<boolean>(true)
  const [kpiError, setKpiError] = useState<string | null>(null)

  // Dynamic Alert Summary State
  const [alertCounts, setAlertCounts] = useState<AlertSummaryCounts>({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  })

  // Dynamic Recent Project Status State
  const [projectStatusList, setProjectStatusList] = useState<ProjectWithStage[]>([])
  const [projectStatusTotal, setProjectStatusTotal] = useState<number>(0)
  const [projectStatusLoading, setProjectStatusLoading] = useState<boolean>(true)
  const [projectStatusError, setProjectStatusError] = useState<string | null>(null)
  // Selected Acquisition Project State
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('ALL')
  const [projectsList, setProjectsList] = useState<any[]>([])

  const loadKpis = useCallback(async (projectCode?: string) => {
    setKpiLoading(true)
    setKpiError(null)
    const browserClient = createBrowserClient()
    const targetCode = projectCode !== undefined ? projectCode : selectedProjectCode
    const { kpis, error } = await fetchDashboardKpis(browserClient, targetCode)
    if (error) {
      setKpiError(error)
    } else {
      setKpiData(kpis)
    }
    setKpiLoading(false)
  }, [selectedProjectCode])

  const loadProjectStatuses = useCallback(async () => {
    setProjectStatusLoading(true)
    setProjectStatusError(null)
    const browserClient = createBrowserClient()
    const { projects, totalProjects, error } = await fetchRecentProjectStatuses(5, browserClient)
    if (error) {
      setProjectStatusError(error)
    } else {
      setProjectStatusList(projects)
      setProjectStatusTotal(totalProjects)
    }
    setProjectStatusLoading(false)
  }, [])

  useEffect(() => {
    loadKpis(selectedProjectCode)
  }, [selectedProjectCode, loadKpis])

  async function runSpatialAnalysis() {
    setIsCalculating(true)
    setSpatialStatus('calculating')
    setSpatialErrorMessage('')

    try {
      const res = await fetch('/api/spatial')
      const data = await res.json()

      if (res.status === 503 || data.status === 'unavailable') {
        setSpatialStatus('unavailable')
        setSpatialErrorMessage(
          data.error || 'Spatial analysis engine is unavailable. Please ensure the GIS service is running.'
        )
        return
      }

      if (!res.ok || data.status === 'failed' || data.status === 'error') {
        setSpatialStatus('failed')
        setSpatialErrorMessage(data.error || data.message || 'Spatial overlap calculation failed.')
        return
      }

      setGisData(data)
      setSpatialStatus('success')

      if (data && data.affected_area_sqm !== undefined) {
        const hectares = (data.affected_area_sqm / 10000).toFixed(2)

        const client = createBrowserClient()
        const { error } = await client
          .from('projects')
          .update({ total_area_required_ha: hectares })
          .eq('project_code', 'NHAI-DEL-BOM-01')

        if (error) {
          console.error('Supabase update error:', error)
        } else {
          console.log('Database synced successfully')
        }

        const { error: wfError } = await client.from('statutory_workflows').insert([
          {
            project_code: 'NHAI-DEL-BOM-01',
            workflow_type: 'Section 3A - Intent to Acquire',
            status: 'Pending Approval',
            assigned_to: 'MoRTH Nodal Officer',
            remarks: `System generated after GIS spatial analysis detected ${hectares} Ha of intersecting land.`,
          },
        ])

        if (wfError) {
          // Fallback schema mapping if DB columns are stage_name and submitted_by
          await client.from('statutory_workflows').insert([
            {
              project_code: 'NHAI-DEL-BOM-01',
              stage_name: 'Section 3A - Intent to Acquire',
              status: 'Pending Approval',
              submitted_by: 'MoRTH Nodal Officer',
            },
          ])
        }

        console.log('Statutory workflows generated.')

        // Refresh dynamic KPIs & project status list so cards & project metrics update live
        await loadKpis()
        await loadProjectStatuses()

        // Visually update dashboard UI state so Total Area Notified KPI card shows newly calculated value
        setProjectData((prev: any) => ({
          ...(prev || {}),
          total_area_required_ha: hectares,
        }))
      }
    } catch (err: any) {
      console.error('Spatial analysis error:', err)
      setSpatialStatus('failed')
      setSpatialErrorMessage(err?.message || 'Spatial analysis request failed.')
    } finally {
      setIsCalculating(false)
    }
  }

  useEffect(() => {
    loadKpis(selectedProjectCode)
    loadProjectStatuses()
    async function fetchData() {
      try {
        const client = createBrowserClient()

        // Fetch all projects for the Project Selector dropdown
        const { data: pList } = await client
          .from('projects')
          .select('id, project_code, project_name, state, district, status, total_area_required_ha, gis_file_url')
          .order('created_at', { ascending: false })

        if (pList && pList.length > 0) {
          setProjectsList(pList)
        }

        let { data: project } = await client
          .from('projects')
          .select('*')
          .eq('project_code', 'NHAI-DEL-BOM-01')
          .maybeSingle()

        if (!project) {
          const { data: altProject } = await client
            .from('projects')
            .select('*')
            .eq('project_code', 'NHAI-NSK-SURCHE')
            .maybeSingle()
          project = altProject
        }

        if (project) {
          setProjectData(project)
        }

        // Fetch all parcels for national/project filtering
        const { data: allParcels } = await client
          .from('land_parcels')
          .select('*')

        if (allParcels && allParcels.length > 0) {
          setParcels(allParcels)
          setFilteredParcels(allParcels)
          return
        }

        setParcels(DEFAULT_FALLBACK_PARCELS)
        setFilteredParcels(DEFAULT_FALLBACK_PARCELS)
      } catch (err) {
        console.error('Error fetching Supabase data:', err)
        setParcels(DEFAULT_FALLBACK_PARCELS)
        setFilteredParcels(DEFAULT_FALLBACK_PARCELS)
      }
    }

    fetchData()
  }, [])

  const selectedProjectObj = projectsList.find((p) => p.project_code === selectedProjectCode)

  useEffect(() => {
    let result = parcels

    if (selectedProjectCode && selectedProjectCode !== 'ALL') {
      result = result.filter(
        (p) =>
          p.project_code === selectedProjectCode ||
          (selectedProjectObj?.id && p.project_id === selectedProjectObj.id)
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          (p.owner_name && p.owner_name.toLowerCase().includes(q)) ||
          (p.village_name && p.village_name.toLowerCase().includes(q))
      )
    }

    if (possessionFilter && possessionFilter !== 'All') {
      result = result.filter((p) => p.possession_status === possessionFilter)
    }

    setFilteredParcels(result)
  }, [parcels, selectedProjectCode, selectedProjectObj, searchQuery, possessionFilter])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedParcel(null)
      }
    }
    if (selectedParcel) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedParcel])

  const projectParcels =
    selectedProjectCode !== 'ALL'
      ? parcels.filter(
          (p) =>
            p.project_code === selectedProjectCode ||
            (selectedProjectObj?.id && p.project_id === selectedProjectObj.id)
        )
      : parcels

  const possessionStatuses = Array.from(
    new Set(projectParcels.map((p) => p.possession_status).filter(Boolean))
  )

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        status={projectData?.status}
        userEmail={userEmail}
        userRole={userRole}
        onSignOut={handleSignOut}
      />

      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground text-balance">
              Executive Overview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              National land acquisition status · All figures provisional
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Compact Project Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="project-selector" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Acquisition Project:
              </label>
              <select
                id="project-selector"
                value={selectedProjectCode}
                onChange={(e) => setSelectedProjectCode(e.target.value)}
                className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer"
              >
                <option value="ALL">All Projects (National View)</option>
                {projectsList.map((p) => (
                  <option key={p.project_code || p.id} value={p.project_code}>
                    {p.project_code} — {p.project_name} {p.gis_file_url ? '🗺️' : ''}
                  </option>
                ))}
              </select>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="size-1.5 rounded-full bg-green-india" />
              {selectedProjectObj?.status || projectData?.status || 'Active'}
            </span>
          </div>
        </div>

        {/* ── Role-Specific Dashboard Section ── */}
        {userRole && (
          <RoleDashboardSection
            userRole={userRole}
            kpiData={kpiData}
            kpiLoading={kpiLoading}
            selectedProjectCode={selectedProjectCode}
            selectedProjectName={selectedProjectObj?.project_name}
          />
        )}

        {/* ── My Tasks (Field Officer only) ── */}
        {userRole === 'Field Officer' && (
          <div className="mb-6">
            <MyTasksPanel
              userRole={userRole}
              selectedProjectCode={selectedProjectCode}
              onOpenParcel={(parcelId) => {
                setHubParcelId(parcelId)
                setIsHubOpen(true)
              }}
            />
          </div>
        )}

        {/* Spatial Intersection Engine UI Block */}

        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  Spatial Intersection Engine
                </h3>
                {spatialStatus === 'calculating' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    <RefreshCw className="size-3 animate-spin text-blue-600" />
                    Calculating...
                  </span>
                )}
                {spatialStatus === 'success' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    <CheckCircle className="size-3 text-emerald-600" />
                    Calculation successful
                  </span>
                )}
                {spatialStatus === 'failed' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    <AlertCircle className="size-3 text-amber-600" />
                    Calculation failed
                  </span>
                )}
                {spatialStatus === 'unavailable' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    <AlertCircle className="size-3 text-red-600" />
                    Spatial engine unavailable
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                Python GIS FastAPI engine integration for spatial overlap calculations
              </p>
            </div>
            <button
              type="button"
              onClick={runSpatialAnalysis}
              disabled={isCalculating || userRole === 'Viewer'}
              title={userRole === 'Viewer' ? 'Spatial analysis requires Field Officer or higher permissions' : undefined}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isCalculating ? 'Calculating...' : 'Run Spatial Analysis'}
            </button>
          </div>

          {spatialStatus === 'unavailable' && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Spatial engine unavailable</p>
                <p className="mt-0.5 text-red-700">
                  {spatialErrorMessage || 'Spatial analysis engine is unavailable. Please ensure the GIS service is running on http://127.0.0.1:8000.'}
                </p>
              </div>
            </div>
          )}

          {spatialStatus === 'failed' && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Calculation failed</p>
                <p className="mt-0.5 text-amber-700">{spatialErrorMessage}</p>
              </div>
            </div>
          )}

          {spatialStatus === 'success' && gisData !== null && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Total Affected Area
                </p>
                <p className="mt-1 font-serif text-2xl font-semibold text-slate-900">
                  {(gisData.affected_area_sqm / 10000).toFixed(2)} Ha
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Intersecting Zones
                </p>
                <p className="mt-1 font-serif text-2xl font-semibold text-slate-900">
                  {gisData.intersecting_zones_count}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live Interactive Map */}
        <div key="dashboard-map-wrapper" className="mb-6">
          <Map
            conflictLocation={conflictLocation}
            projectGisUrl={selectedProjectCode !== 'ALL' ? selectedProjectObj?.gis_file_url : null}
            projectName={selectedProjectCode !== 'ALL' ? selectedProjectObj?.project_name : null}
            projectCode={selectedProjectCode !== 'ALL' ? selectedProjectObj?.project_code : null}
          />
        </div>

        <KpiCards
          projectData={projectData}
          kpiData={kpiData}
          loading={kpiLoading}
          error={kpiError}
        />

        {/* National Geographic & Project Hierarchy Drill-Down */}
        <div className="mt-6">
          <HierarchyPanel
            onSelectParcel={(parcelId: string) => {
              setHubParcelId(parcelId)
              setIsHubOpen(true)
            }}
          />
        </div>

        {/* Multi-Project GIS Conflict Detection Module */}
        <div className="mt-6">
          <ConflictDetectionPanel
            userRole={userRole}
            onConflictDetected={(loc) => setConflictLocation(loc)}
            onAlertsEvaluated={() => setAlertsRefreshKey((prev) => prev + 1)}
          />
        </div>

        {/* Early Warning Alert Summary */}
        <div className="mt-6">
          <AlertSummary counts={alertCounts} />
        </div>

        {/* Early Warning & Intelligent Alerts Panel */}
        <div className="mt-6">
          <AlertsPanel key={alertsRefreshKey} userRole={userRole} onCountsUpdated={setAlertCounts} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
          <ProgressChart parcels={projectParcels} />
          <RouteMap />
        </div>

        <div className="mt-6">
          <ProjectStatus
            projects={projectStatusList}
            totalProjects={projectStatusTotal}
            loading={projectStatusLoading}
            error={projectStatusError}
          />
        </div>

        <div className="mt-6">
          <LandRecordsTable
            parcels={filteredParcels}
            totalCount={projectParcels.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            possessionFilter={possessionFilter}
            setPossessionFilter={setPossessionFilter}
            possessionStatuses={possessionStatuses}
            isProjectView={selectedProjectCode !== 'ALL'}
            onSelectParcel={(parcel) => {
              setSelectedParcel(parcel)
              setHubParcelId(parcel.id)
              setIsHubOpen(true)
            }}
          />
        </div>
      </main>

      {/* Selected Parcel Details Modal Overlay */}
      {selectedParcel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedParcel(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tricolor top border rule */}
            <div className="flex h-1.5 w-full">
              <div className="flex-1 bg-saffron" />
              <div className="flex-1 bg-card" />
              <div className="flex-1 bg-green-india" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 id="modal-title" className="font-serif text-lg font-semibold text-foreground">
                  Survey Parcel Details
                </h3>
                <p className="text-xs text-muted-foreground">
                  Parcel ID: {selectedParcel.id || selectedParcel.parcel_id || 'N/A'} · Survey Record
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border border-border bg-muted/20 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Owner Name
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedParcel.owner_name || 'N/A'}
                  </p>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Village Name
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedParcel.village_name || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border border-border bg-muted/20 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Notified Area
                  </p>
                  <p className="mt-1 font-mono font-semibold text-foreground">
                    {selectedParcel.notified_area_sqm
                      ? `${Number(selectedParcel.notified_area_sqm).toLocaleString()} sqm`
                      : 'N/A'}
                  </p>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Possession Status
                  </p>
                  <span
                    className={cn(
                      'mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      selectedParcel.possession_status === 'Possessed' ||
                        selectedParcel.possession_status === 'Completed' ||
                        selectedParcel.possession_status === 'Acquired'
                        ? 'bg-green-india/10 text-green-india'
                        : 'bg-saffron/15 text-saffron-foreground',
                    )}
                  >
                    {selectedParcel.possession_status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Additional Details */}
              <div className="rounded-md border border-border bg-muted/10 p-4 space-y-2 text-xs">
                {selectedParcel.survey_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Survey Number:</span>
                    <span className="font-mono font-medium text-foreground">{selectedParcel.survey_number}</span>
                  </div>
                )}
                {selectedParcel.project_code && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project Code:</span>
                    <span className="font-mono font-medium text-foreground">{selectedParcel.project_code}</span>
                  </div>
                )}
                {selectedParcel.compensation_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compensation Amount:</span>
                    <span className="font-medium text-foreground">₹ {selectedParcel.compensation_amount}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">Record Status:</span>
                  <span className="font-medium text-green-india flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-green-india" /> Verified & Active
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-3.5">
              <button
                type="button"
                onClick={() => {
                  const pId = selectedParcel.id || selectedParcel.parcel_id
                  if (pId) {
                    setHubParcelId(pId)
                    setIsHubOpen(true)
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <LandPlot className="size-3.5" />
                <span>Open 360° Parcel Hub</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 360° Parcel Context Hub Drawer */}
      <ParcelContextHub
        parcelId={hubParcelId}
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        userRole={userRole}
      />

      <footer className="mx-auto max-w-[1600px] px-4 pb-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row">
          <p>
            © 2026 Government of India · National Land Acquisition Management
            System (NLAMS)
          </p>
          <p>Classified: Official Use · v3.2.1</p>
        </div>
      </footer>
    </div>
  )
}
