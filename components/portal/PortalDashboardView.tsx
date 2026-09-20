'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  fetchDashboardKpis,
  fetchRecentProjectStatuses,
  type DashboardKpis,
  type ProjectWithStage,
} from '@/lib/supabase'
import ProgressChart from '@/components/ProgressChart'
import RouteMap from '@/components/RouteMap'
import ParcelContextHub from '@/components/ParcelContextHub'
import RoleDashboardSection from '@/components/RoleDashboardSections'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/notifications/NotificationBell'
import AlertSummary, { type AlertSummaryCounts } from '@/components/alerts/AlertSummary'
import AlertsPanel from '@/components/alerts/AlertsPanel'
import HierarchyPanel from '@/components/HierarchyPanel'
import ConflictDetectionPanel from '@/components/conflicts/ConflictDetectionPanel'
import ObjectionReviewPanel from '@/components/objections/ObjectionReviewPanel'
import {
  AlertCircle,
  Banknote,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  LandPlot,
  LogOut,
  Maximize2,
  Menu,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

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

interface DashboardHeaderProps {
  portalTitle: string
  portalSubtitle: string
  status?: string
  userEmail?: string | null
  userRole?: string | null
  onSignOut?: () => void
  searchValue?: string
  onSearch?: (q: string) => void
}

function DashboardHeader({
  portalTitle,
  portalSubtitle,
  status,
  userEmail,
  userRole,
  onSignOut,
  searchValue,
  onSearch,
}: DashboardHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <header className="border-b border-border bg-card sticky top-0 z-30">
      <div className="flex h-1 w-full">
        <div className="flex-1 bg-amber-500" />
        <div className="flex-1 bg-card" />
        <div className="flex-1 bg-emerald-600" />
      </div>
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0 mr-auto">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary ring-1 ring-primary/15">
            <ChakraEmblem className="size-6" />
          </div>
          <div className="min-w-0 leading-tight hidden sm:block">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground truncate">
              {portalSubtitle}
            </p>
            <h1 className="font-serif text-sm font-semibold text-foreground truncate">
              {portalTitle}
            </h1>
          </div>
          <div className="min-w-0 leading-tight sm:hidden">
            <h1 className="font-serif text-xs font-bold text-foreground">{portalTitle}</h1>
          </div>
        </div>
        <div className="hidden lg:flex items-center flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="Search projects, parcels, locations..."
              className="w-full rounded-md border border-input bg-muted/40 py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring transition-colors"
            />
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 border border-emerald-200">
            <ShieldCheck className="size-3" />
            {status || 'Secure'}
          </span>
          <NotificationBell userRole={userRole} />
          <div className="flex items-center gap-2 border-l border-border pl-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            <div className="leading-tight">
              <p className="text-xs font-medium text-foreground truncate max-w-[140px]">
                {userEmail || 'User'}
              </p>
              <p className="text-[10px] text-muted-foreground">{userRole || 'Official'}</p>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                title="Sign Out"
                className="ml-1 flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent lg:hidden"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-3 sm:px-6 lg:hidden">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="Search projects, parcels..."
              className="w-full rounded-md border border-input bg-muted/40 py-2 pl-8 pr-3 text-xs focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-xs font-medium">{userEmail || 'User'}</p>
                <p className="text-[10px] text-muted-foreground">{userRole || 'Official'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell userRole={userRole} />
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                >
                  <LogOut className="size-3.5" />
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

interface PrimaryKpiCardsProps {
  kpiData?: DashboardKpis | null
  loading?: boolean
  parcels: any[]
  alertCount: number
}

function PrimaryKpiCards({ kpiData, loading, parcels, alertCount }: PrimaryKpiCardsProps) {
  const totalProjects = loading ? null : (kpiData?.totalProjects ?? 0)
  const totalParcels = parcels.length
  const verifiedParcels = parcels.filter((p) => p.field_verification_status === 'Verified').length
  const rate = totalParcels > 0 ? Math.round((verifiedParcels / totalParcels) * 100) : 0
  const hasAlerts = alertCount > 0
  const cards = [
    {
      label: 'Total Projects',
      value: loading ? '---' : (totalProjects ?? 0).toLocaleString('en-IN'),
      sub: 'Active acquisition projects',
      icon: Briefcase,
      iconCls: 'bg-blue-50 text-blue-600',
      valCls: 'text-blue-700',
      bdr: 'border-blue-100',
    },
    {
      label: 'Total Parcels',
      value: totalParcels.toLocaleString('en-IN'),
      sub: 'Land parcels tracked',
      icon: LandPlot,
      iconCls: 'bg-primary/10 text-primary',
      valCls: 'text-foreground',
      bdr: 'border-primary/10',
    },
    {
      label: 'Verified Parcels',
      value: verifiedParcels.toLocaleString('en-IN'),
      sub: `${rate}% verification rate`,
      icon: CheckCircle,
      iconCls: 'bg-emerald-50 text-emerald-600',
      valCls: 'text-emerald-700',
      bdr: 'border-emerald-100',
    },
    {
      label: 'Needs Attention',
      value: alertCount.toLocaleString('en-IN'),
      sub: hasAlerts ? 'Active system alerts' : 'All systems normal',
      icon: AlertCircle,
      iconCls: hasAlerts ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
      valCls: hasAlerts ? 'text-red-700' : 'text-emerald-700',
      bdr: hasAlerts ? 'border-red-100' : 'border-emerald-100',
    },
  ]
  return (
    <section aria-label="Primary KPIs" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <article key={card.label} className={cn('rounded-xl border bg-card p-5 shadow-sm', card.bdr)}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', card.iconCls)}>
                <Icon className="size-4.5" />
              </div>
            </div>
            <p className={cn('font-serif text-3xl font-bold tabular-nums', card.valCls)}>{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
          </article>
        )
      })}
    </section>
  )
}

interface ActionCenterPanelProps {
  alerts: any[]
  alertCounts: AlertSummaryCounts
  loading?: boolean
  onViewAll?: () => void
}

function ActionCenterPanel({ alerts, alertCounts, loading, onViewAll }: ActionCenterPanelProps) {
  const getSev = (s: string) => {
    if (s === 'CRITICAL')
      return { dot: 'bg-red-500', badge: 'bg-red-100 text-red-800 border-red-200', bar: 'border-l-red-500' }
    if (s === 'HIGH')
      return { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'border-l-amber-400' }
    if (s === 'MEDIUM')
      return { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 border-blue-200', bar: 'border-l-blue-400' }
    return { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200', bar: 'border-l-slate-300' }
  }
  const top5 = alerts.slice(0, 5)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-foreground">Action Center</h2>
          {alertCounts.total > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 border border-red-200">
              {alertCounts.total} Active
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Alerts requiring immediate attention</p>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border border-b border-border text-center">
        {[
          { l: 'Critical', c: alertCounts.critical, cls: 'text-red-700 bg-red-50' },
          { l: 'High', c: alertCounts.high, cls: 'text-amber-700 bg-amber-50' },
          { l: 'Medium', c: alertCounts.medium, cls: 'text-blue-700 bg-blue-50' },
          { l: 'Low', c: alertCounts.low, cls: 'text-slate-600 bg-slate-50' },
        ].map(({ l, c, cls }) => (
          <div key={l} className={cn('py-2.5', cls)}>
            <p className="font-mono text-lg font-bold leading-none">{c}</p>
            <p className="text-[9px] font-medium mt-0.5">{l}</p>
          </div>
        ))}
      </div>
      <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
            <RefreshCw className="size-4 animate-spin text-primary" />
            <span>Loading alerts...</span>
          </div>
        ) : top5.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="size-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-medium text-foreground">No Active Alerts</p>
            <p className="text-xs text-muted-foreground mt-0.5">All systems operating normally</p>
          </div>
        ) : (
          top5.map((alert: any) => {
            const sev = getSev(alert.severity)
            return (
              <button
                key={alert.id}
                type="button"
                onClick={onViewAll}
                className={cn('w-full p-3.5 text-left hover:bg-accent/50 transition-colors border-l-4', sev.bar)}
              >
                <div className="flex items-start gap-2.5">
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', sev.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground line-clamp-1">{alert.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{alert.explanation}</p>
                    <span className={cn('mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border', sev.badge)}>
                      {alert.severity}
                    </span>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
                </div>
              </button>
            )
          })
        )}
      </div>
      {alerts.length > 0 && (
        <div className="border-t border-border px-5 py-2.5">
          <button
            type="button"
            onClick={onViewAll}
            className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
          >
            View all {alerts.length} alerts
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function QuickActionsGrid({
  userRole,
  isViewer,
}: {
  userRole?: string | null
  isViewer?: boolean
}) {
  const isFO = userRole === 'Field Officer'
  const actions = [
    { label: 'View Conflicts', href: '/', icon: AlertCircle, cls: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100', show: true },
    { label: 'Assign Officer', href: '/assignments', icon: Users, cls: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100', show: !isViewer && !isFO },
    { label: 'Field Verification', href: '/field-verification', icon: LandPlot, cls: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100', show: !isViewer },
    { label: 'View Reports', href: '/workflows', icon: Download, cls: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100', show: true },
  ].filter((a) => a.show)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="font-serif text-base font-semibold text-foreground">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              href={action.href}
              className={cn('flex flex-col items-center gap-2 rounded-lg border px-2 py-4 text-center text-xs font-medium transition-colors', action.cls)}
            >
              <Icon className="size-5" />
              <span className="leading-tight">{action.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

type Kpi = {
  label: string
  value?: string
  unit?: string
  sub: string
  trend: string
  icon: LucideIcon
  accent: 'primary' | 'saffron' | 'green'
  progress: number
}

const accentMap = {
  primary: { icon: 'bg-primary/10 text-primary', bar: 'bg-primary' },
  saffron: { icon: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
  green: { icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-600' },
}

interface SecondaryKpiCardsProps {
  projectData?: any
  kpiData?: DashboardKpis | null
  loading?: boolean
  error?: string | null
}

function SecondaryKpiCards({ projectData, kpiData, loading, error }: SecondaryKpiCardsProps) {
  if (error && !kpiData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center gap-3">
        <AlertCircle className="size-5 text-red-600 shrink-0" />
        <div>
          <p className="font-semibold text-sm">Database KPI Fetch Error</p>
          <p className="mt-0.5">{error}</p>
        </div>
      </div>
    )
  }
  const kpis: Kpi[] = [
    {
      label: 'Total Area Notified',
      value: loading ? 'Loading...' : kpiData ? kpiData.totalNotifiedAreaHa.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : projectData?.total_area_required_ha || 'Loading...',
      unit: 'hectares',
      sub: kpiData ? `Across ${kpiData.totalProjects} active projects` : 'Across notified corridors',
      trend: kpiData ? `${kpiData.totalProjects} Projects Synced` : 'Database Synced',
      icon: Ruler,
      accent: 'primary',
      progress: 100,
    },
    {
      label: 'Area Acquired',
      value: loading ? 'Loading...' : kpiData ? kpiData.areaAcquiredHa.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 'Loading...',
      unit: 'hectares',
      sub: kpiData ? `${kpiData.acquiredPercentage}% of notified area` : 'Possession in progress',
      trend: kpiData ? `${kpiData.acquiredPercentage}% Acquired` : 'Possession in progress',
      icon: LandPlot,
      accent: 'green',
      progress: kpiData ? kpiData.acquiredPercentage : 0,
    },
    {
      label: 'Compensation Disbursed',
      value: loading ? 'Loading...' : kpiData ? `\u20B9 ${kpiData.compensationDisbursedCrores.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : 'Loading...',
      unit: 'crore',
      sub: kpiData ? `To ${kpiData.affectedFamiliesCount} beneficiaries` : 'Direct Benefit Transfer',
      trend: kpiData ? `\u20B9 ${kpiData.compensationDisbursedCrores.toFixed(2)} Cr Disbursed` : 'PFMS DBT',
      icon: Banknote,
      accent: 'saffron',
      progress: kpiData ? kpiData.acquiredPercentage : 0,
    },
    {
      label: 'Affected Families',
      value: loading ? 'Loading...' : kpiData ? kpiData.affectedFamiliesCount.toLocaleString('en-IN') : 'Loading...',
      unit: 'families',
      sub: kpiData ? `${kpiData.rehabilitatedFamiliesCount} rehabilitated` : 'Resettlement status',
      trend: kpiData ? `${kpiData.rehabilitatedPercentage}% resettled` : 'Rehabilitation active',
      icon: Users,
      accent: 'primary',
      progress: kpiData ? kpiData.rehabilitatedPercentage : 0,
    },
  ]
  return (
    <section aria-label="Detailed national metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const accent = accentMap[kpi.accent]
        const Icon = kpi.icon
        return (
          <article key={kpi.label} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', accent.icon)}>
                <Icon className="size-4.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-semibold tabular-nums tracking-tight text-foreground">{kpi.value}</span>
                {kpi.unit && kpi.value !== 'Loading...' && <span className="text-sm font-medium text-muted-foreground">{kpi.unit}</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
            <div className="mt-auto space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full transition-all duration-500', accent.bar)} style={{ width: `${kpi.progress}%` }} />
              </div>
              <p className="text-xs font-medium text-emerald-700">{kpi.trend}</p>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function getStageStyle(stage: string) {
  const s = stage.toLowerCase()
  if (s.includes('11') || s.includes('notification')) return { badge: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500', label: 'Notification' }
  if (s.includes('19') || s.includes('3d') || s.includes('declaration')) return { badge: 'bg-primary/10 text-primary ring-primary/20', dot: 'bg-primary', label: 'Declaration' }
  if (s.includes('23') || s.includes('award')) return { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-600', label: 'Award Passed' }
  if (s.includes('3a') || s.includes('intent')) return { badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500', label: 'Intent Notice' }
  if (s.includes('not initiated') || s.includes('not started')) return { badge: 'bg-muted text-muted-foreground ring-border', dot: 'bg-muted-foreground', label: 'Not Started' }
  return { badge: 'bg-primary/10 text-primary ring-primary/20', dot: 'bg-primary', label: stage.length > 22 ? `${stage.substring(0, 20)}...` : stage }
}

function getStatusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'active' || s === 'on track') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'under review' || s === 'attention') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (s === 'on hold' || s === 'delayed') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

interface ProjectProgressProps {
  projects?: ProjectWithStage[]
  totalProjects?: number
  loading?: boolean
  error?: string | null
}

function ProjectProgress({ projects = [], totalProjects, loading, error }: ProjectProgressProps) {
  return (
    <section aria-label="Project progress" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="font-serif text-base font-semibold text-foreground">Project Progress</h2>
          <p className="text-xs text-muted-foreground">RFCTLARR Act, 2013 &middot; Acquisition stages</p>
        </div>
        <Link href="/projects/new" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View All<ChevronRight className="size-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
            <RefreshCw className="size-4 animate-spin text-primary" />
            <span>Loading projects...</span>
          </div>
        ) : error ? (
          <div className="p-5 text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>Error: {error}</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No projects found.</div>
        ) : (
          <table className="w-full text-left text-sm min-w-[560px]">
            <thead className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3">Project</th>
                <th scope="col" className="px-4 py-3 hidden sm:table-cell">District</th>
                <th scope="col" className="px-4 py-3">Stage</th>
                <th scope="col" className="px-4 py-3 hidden md:table-cell">Status</th>
                <th scope="col" className="px-4 py-3 hidden lg:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((p) => {
                const ss = getStageStyle(p.stage)
                return (
                  <tr key={p.project_code || p.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
                          {p.project_code}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                          {p.project_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground hidden sm:table-cell">{p.district}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', ss.badge)}>
                        <span className={cn('size-1.5 rounded-full', ss.dot)} />
                        {ss.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-xs font-medium', getStatusBadge(p.status))}>
                        {p.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground hidden lg:table-cell">{p.updated}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

function exportToCSV(data: any[], filename = 'land_acquisition_records.csv') {
  if (!data || data.length === 0) return
  const headers = ['ID', 'Owner Name', 'Village Name', 'Notified Area (sqm)', 'Possession Status']
  const keys = ['id', 'owner_name', 'village_name', 'notified_area_sqm', 'possession_status']
  const csvRows = [headers.join(','), ...data.map((row) => keys.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','))]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

interface LandRecordsTableProps {
  parcels: any[]
  totalCount: number
  searchQuery: string
  setSearchQuery: (v: string) => void
  possessionFilter: string
  setPossessionFilter: (v: string) => void
  possessionStatuses: string[]
  onSelectParcel: (p: any) => void
  isProjectView?: boolean
}

function LandRecordsTable({
  parcels,
  searchQuery,
  setSearchQuery,
  possessionFilter,
  setPossessionFilter,
  possessionStatuses,
  onSelectParcel,
  isProjectView,
}: LandRecordsTableProps) {
  const uniqueOwners = new Set(parcels.map((p) => (p.owner_name || '').trim()).filter(Boolean)).size
  const totalHa = (parcels.reduce((s, p) => s + parseFloat(String(p.affected_area_sqm || p.notified_area_sqm || 0)), 0) / 10000).toFixed(2)
  return (
    <section aria-label="Land Records" className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-base font-semibold text-foreground">
            {isProjectView ? 'Affected Parcels' : 'Land Records & Affected Persons'}
          </h2>
          <p className="text-xs text-muted-foreground">Click a row for 360&deg; parcel details</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200">Parcels: {parcels.length}</span>
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 border border-purple-200">Owners: {uniqueOwners}</span>
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">Area: {totalHa} Ha</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by owner name or village..."
            className="w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative min-w-[160px]">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <select
              value={possessionFilter}
              onChange={(e) => setPossessionFilter(e.target.value)}
              className="w-full appearance-none rounded-md border border-input bg-background pl-8 pr-8 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {possessionStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>
          <button
            type="button"
            onClick={() => exportToCSV(parcels)}
            disabled={!parcels || parcels.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium shadow-xs hover:bg-accent disabled:opacity-50"
          >
            <Download className="size-3.5 text-primary" />
            Export
          </button>
          {(searchQuery || possessionFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setPossessionFilter('All')
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              <X className="size-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 sm:px-5">Parcel ID</th>
              <th scope="col" className="px-4 py-3 sm:px-5">Owner</th>
              <th scope="col" className="hidden md:table-cell px-4 py-3 sm:px-5">Village</th>
              <th scope="col" className="hidden sm:table-cell px-4 py-3 sm:px-5">Area (Ha)</th>
              <th scope="col" className="px-4 py-3 sm:px-5">Status</th>
              <th scope="col" className="hidden md:table-cell px-4 py-3 sm:px-5">Verification</th>
              <th scope="col" className="hidden xl:table-cell px-4 py-3 sm:px-5">Compensation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parcels && parcels.length > 0 ? (
              parcels.map((parcel, idx) => {
                const pid = parcel.parcel_number || parcel.parcel_no || `LP-${String(parcel.id || idx).slice(0, 6).toUpperCase()}`
                const ha = (parseFloat(String(parcel.notified_area_sqm || 0)) / 10000).toFixed(2)
                const comp = parcel.compensation_paid || parcel.compensation_amount || 0
                const ver = parcel.field_verification_status || 'Pending'
                const acq = ['Possessed', 'Possession Taken', 'Acquired', 'Completed'].includes(parcel.possession_status)
                return (
                  <tr key={parcel.id || idx} onClick={() => onSelectParcel(parcel)} className="cursor-pointer hover:bg-accent/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary sm:px-5">{pid}</td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground sm:px-5 sm:text-sm">{parcel.owner_name}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-muted-foreground sm:px-5">{parcel.village_name}</td>
                    <td className="hidden sm:table-cell px-4 py-3 font-mono text-xs text-muted-foreground sm:px-5">{ha}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', acq ? 'bg-emerald-50 text-emerald-700' : parcel.possession_status === 'In Progress' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}>
                        {parcel.possession_status || 'Pending'}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 sm:px-5">
                      <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', ver === 'Verified' ? 'bg-emerald-100 text-emerald-800' : ver === 'Needs Review' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')}>
                        {ver}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell px-4 py-3 font-mono text-xs text-foreground sm:px-5">
                      {comp > 0 ? `\u20B9 ${Number(comp).toLocaleString('en-IN')}` : 'Not Assessed'}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
                  <p className="font-medium text-foreground">No matching land records found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filter.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const DEFAULT_FALLBACK_PARCELS = [
  { id: 1, owner_name: 'Rajesh Kumar', village_name: 'Rampur', notified_area_sqm: 1250, possession_status: 'Possessed' },
  { id: 2, owner_name: 'Suresh Patel', village_name: 'Kishanganj', notified_area_sqm: 3400, possession_status: 'Pending' },
  { id: 3, owner_name: 'Anita Devi', village_name: 'Devnagar', notified_area_sqm: 2100, possession_status: 'Completed' },
  { id: 4, owner_name: 'Vikram Singh', village_name: 'Baghpat', notified_area_sqm: 4800, possession_status: 'Acquired' },
  { id: 5, owner_name: 'Mahesh Sharma', village_name: 'Rampur', notified_area_sqm: 1750, possession_status: 'Pending' },
  { id: 6, owner_name: 'Sunita Verma', village_name: 'Kishanganj', notified_area_sqm: 2900, possession_status: 'Possessed' },
]

export interface PortalDashboardViewProps {
  portalType: 'central' | 'state' | 'viewer' | 'admin'
  userEmail?: string | null
  userRole?: string | null
}

export default function PortalDashboardView({
  portalType,
  userEmail,
  userRole,
}: PortalDashboardViewProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const browserClient = createBrowserClient()
    await browserClient.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const [projectData, setProjectData] = useState<any>(null)
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
  const [conflictLocation, setConflictLocation] = useState<{ latitude: number; longitude: number; title?: string } | null>(null)
  const [alertsRefreshKey, setAlertsRefreshKey] = useState<number>(0)
  const [kpiData, setKpiData] = useState<DashboardKpis | null>(null)
  const [kpiLoading, setKpiLoading] = useState<boolean>(true)
  const [kpiError, setKpiError] = useState<string | null>(null)
  const [alertCounts, setAlertCounts] = useState<AlertSummaryCounts>({ critical: 0, high: 0, medium: 0, low: 0, total: 0 })
  const [projectStatusList, setProjectStatusList] = useState<ProjectWithStage[]>([])
  const [projectStatusTotal, setProjectStatusTotal] = useState<number>(0)
  const [projectStatusLoading, setProjectStatusLoading] = useState<boolean>(true)
  const [projectStatusError, setProjectStatusError] = useState<string | null>(null)
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('ALL')
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [topAlerts, setTopAlerts] = useState<any[]>([])
  const [topAlertsLoading, setTopAlertsLoading] = useState<boolean>(false)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)

  const loadKpis = useCallback(async (projectCode?: string) => {
    setKpiLoading(true)
    setKpiError(null)
    const browserClient = createBrowserClient()
    const targetCode = projectCode !== undefined ? projectCode : selectedProjectCode
    const { kpis, error } = await fetchDashboardKpis(browserClient, targetCode)
    if (error) setKpiError(error)
    else setKpiData(kpis)
    setKpiLoading(false)
  }, [selectedProjectCode])

  const loadProjectStatuses = useCallback(async () => {
    setProjectStatusLoading(true)
    setProjectStatusError(null)
    const browserClient = createBrowserClient()
    const { projects, totalProjects, error } = await fetchRecentProjectStatuses(8, browserClient)
    if (error) setProjectStatusError(error)
    else {
      setProjectStatusList(projects)
      setProjectStatusTotal(totalProjects)
    }
    setProjectStatusLoading(false)
  }, [])

  useEffect(() => {
    loadKpis(selectedProjectCode)
  }, [selectedProjectCode, loadKpis])

  async function runSpatialAnalysis() {
    if (portalType === 'viewer' || userRole === 'Viewer') return
    setIsCalculating(true)
    setSpatialStatus('calculating')
    setSpatialErrorMessage('')
    try {
      const res = await fetch('/api/spatial')
      const data = await res.json()
      if (res.status === 503 || data.status === 'unavailable') {
        setSpatialStatus('unavailable')
        setSpatialErrorMessage(data.error || 'Spatial analysis engine unavailable.')
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
        await client.from('projects').update({ total_area_required_ha: hectares }).eq('project_code', 'NHAI-DEL-BOM-01')
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
          await client.from('statutory_workflows').insert([
            {
              project_code: 'NHAI-DEL-BOM-01',
              stage_name: 'Section 3A - Intent to Acquire',
              status: 'Pending Approval',
              submitted_by: 'MoRTH Nodal Officer',
            },
          ])
        }
        await loadKpis()
        await loadProjectStatuses()
        setProjectData((prev: any) => ({ ...(prev || {}), total_area_required_ha: hectares }))
      }
    } catch (err: any) {
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
        const { data: pList } = await client
          .from('projects')
          .select('id, project_code, project_name, state, district, status, total_area_required_ha, gis_file_url')
          .order('created_at', { ascending: false })
        if (pList && pList.length > 0) setProjectsList(pList)
        let { data: project } = await client
          .from('projects')
          .select('*')
          .eq('project_code', 'NHAI-DEL-BOM-01')
          .maybeSingle()
        if (!project) {
          const { data: alt } = await client
            .from('projects')
            .select('*')
            .eq('project_code', 'NHAI-NSK-SURCHE')
            .maybeSingle()
          project = alt
        }
        if (project) setProjectData(project)
        const { data: allParcels } = await client.from('land_parcels').select('*')
        if (allParcels && allParcels.length > 0) {
          setParcels(allParcels)
          setFilteredParcels(allParcels)
          return
        }
        setParcels(DEFAULT_FALLBACK_PARCELS)
        setFilteredParcels(DEFAULT_FALLBACK_PARCELS)
      } catch {
        setParcels(DEFAULT_FALLBACK_PARCELS)
        setFilteredParcels(DEFAULT_FALLBACK_PARCELS)
      }
    }
    fetchData()
    async function fetchTopAlerts() {
      setTopAlertsLoading(true)
      try {
        const res = await fetch('/api/alerts?status=ACTIVE')
        const json = await res.json().catch(() => ({}))
        if (json.success) setTopAlerts(json.data || [])
      } catch {}
      setTopAlertsLoading(false)
    }
    fetchTopAlerts()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProjectObj = projectsList.find((p) => p.project_code === selectedProjectCode)

  useEffect(() => {
    let result = parcels
    if (selectedProjectCode && selectedProjectCode !== 'ALL') {
      result = result.filter(
        (p) => p.project_code === selectedProjectCode || (selectedProjectObj?.id && p.project_id === selectedProjectObj.id)
      )
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) => (p.owner_name && p.owner_name.toLowerCase().includes(q)) || (p.village_name && p.village_name.toLowerCase().includes(q))
      )
    }
    if (possessionFilter && possessionFilter !== 'All') {
      result = result.filter((p) => p.possession_status === possessionFilter)
    }
    setFilteredParcels(result)
  }, [parcels, selectedProjectCode, selectedProjectObj, searchQuery, possessionFilter])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedParcel(null)
    }
    if (selectedParcel) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedParcel])

  const projectParcels =
    selectedProjectCode !== 'ALL'
      ? parcels.filter(
          (p) => p.project_code === selectedProjectCode || (selectedProjectObj?.id && p.project_id === selectedProjectObj.id)
        )
      : parcels
  const possessionStatuses = Array.from(new Set(projectParcels.map((p) => p.possession_status).filter(Boolean)))

  // Determine portal metadata & role section
  let portalTitle = 'National Land Acquisition Management System'
  let portalSubtitle = 'Government of India \u00B7 Ministry of Rural Development'
  let effectiveRole = userRole || 'Official'

  if (portalType === 'central') {
    portalTitle = 'Central Officer Portal'
    portalSubtitle = 'MoRTH Nodal Office \u00B7 National Land Acquisition Monitoring'
    effectiveRole = userRole === 'Admin' ? 'Admin' : 'MoRTH Nodal Officer'
  } else if (portalType === 'state') {
    portalTitle = 'State Officer Portal'
    portalSubtitle = 'State Acquisition Authority \u00B7 SLAO & CALA Operational Gateway'
    effectiveRole = userRole === 'CALA' ? 'CALA' : userRole === 'Admin' ? 'Admin' : 'SLAO'
  } else if (portalType === 'viewer') {
    portalTitle = 'Viewer Portal'
    portalSubtitle = 'Public & Stakeholder Transparency \u00B7 Read-Only Monitoring View'
    effectiveRole = 'Viewer'
  }

  const isViewerMode = portalType === 'viewer' || userRole === 'Viewer'

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        portalTitle={portalTitle}
        portalSubtitle={portalSubtitle}
        status={projectData?.status}
        userEmail={userEmail}
        userRole={userRole}
        onSignOut={handleSignOut}
        searchValue={searchQuery}
        onSearch={setSearchQuery}
      />
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <RoleDashboardSection
          userRole={effectiveRole}
          kpiData={kpiData}
          kpiLoading={kpiLoading}
          selectedProjectCode={selectedProjectCode}
          selectedProjectName={selectedProjectObj?.project_name}
        />

        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
              {portalType === 'central'
                ? 'Central Executive Overview'
                : portalType === 'state'
                ? 'State Acquisition Overview'
                : portalType === 'viewer'
                ? 'Public Acquisition Overview'
                : 'Executive Overview'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              National land acquisition status &middot; All figures provisional
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="project-selector" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Project:
            </label>
            <select
              id="project-selector"
              value={selectedProjectCode}
              onChange={(e) => setSelectedProjectCode(e.target.value)}
              className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="ALL">All Projects (National View)</option>
              {projectsList.map((p) => (
                <option key={p.project_code || p.id} value={p.project_code}>
                  {p.project_code} &mdash; {p.project_name} {p.gis_file_url ? '\uD83D\uDDFA\uFE0F' : ''}
                </option>
              ))}
            </select>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-emerald-600" />
              {selectedProjectObj?.status || projectData?.status || 'Active'}
            </span>
          </div>
        </div>

        <PrimaryKpiCards kpiData={kpiData} loading={kpiLoading} parcels={parcels} alertCount={alertCounts.total} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm flex flex-col flex-1">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div>
                  <h2 className="font-serif text-base font-semibold text-foreground">Acquisition Map</h2>
                  <p className="text-xs text-muted-foreground">GIS corridor view &middot; Land parcel overlay</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-primary" />Corridor</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-emerald-600" />Acquired</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-amber-500" />Pending</span>
                    {conflictLocation && (
                      <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-red-500" />Conflict</span>
                    )}
                  </div>
                  {!isViewerMode && (
                    <Link
                      href="/field-verification"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      <Maximize2 className="size-3.5" />
                      View Full Map
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-[400px]">
                <Map
                  conflictLocation={conflictLocation}
                  projectGisUrl={selectedProjectCode !== 'ALL' ? selectedProjectObj?.gis_file_url : null}
                  projectName={selectedProjectCode !== 'ALL' ? selectedProjectObj?.project_name : null}
                  projectCode={selectedProjectCode !== 'ALL' ? selectedProjectObj?.project_code : null}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <ActionCenterPanel
              alerts={topAlerts}
              alertCounts={alertCounts}
              loading={topAlertsLoading}
              onViewAll={() => {
                setShowAdvanced(true)
                setTimeout(() => document.getElementById('advanced-panels')?.scrollIntoView({ behavior: 'smooth' }), 150)
              }}
            />
            <QuickActionsGrid userRole={userRole} isViewer={isViewerMode} />
          </div>
        </div>

        <div className="mt-6">
          <ProjectProgress
            projects={projectStatusList}
            totalProjects={projectStatusTotal}
            loading={projectStatusLoading}
            error={projectStatusError}
          />
        </div>

        <div className="mt-8">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Detailed Acquisition Metrics
          </p>
          <SecondaryKpiCards projectData={projectData} kpiData={kpiData} loading={kpiLoading} error={kpiError} />
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

        {!isViewerMode && userRole !== 'Field Officer' && (
          <div className="mt-8" id="objections-section">
            <ObjectionReviewPanel userRole={userRole} currentProjectCode={selectedProjectCode} />
          </div>
        )}

        <div className="mt-8" id="advanced-panels">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-muted/30 px-5 py-3.5 text-sm font-medium text-muted-foreground hover:bg-accent/40 transition-colors"
          >
            <span>Advanced Panels &mdash; GIS Analysis &middot; Hierarchy Drill-Down &middot; Full Alert Log &middot; Progress Charts</span>
            <ChevronDown className={cn('size-4 shrink-0 transition-transform duration-200', showAdvanced && 'rotate-180')} />
          </button>
          {showAdvanced && (
            <div className="mt-4 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg font-semibold text-slate-900">Spatial Intersection Engine</h3>
                      {spatialStatus === 'calculating' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          <RefreshCw className="size-3 animate-spin" />Calculating...
                        </span>
                      )}
                      {spatialStatus === 'success' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          <CheckCircle className="size-3" />Complete
                        </span>
                      )}
                      {(spatialStatus === 'failed' || spatialStatus === 'unavailable') && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          <AlertCircle className="size-3" />{spatialStatus === 'unavailable' ? 'Unavailable' : 'Failed'}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">Python GIS FastAPI engine integration for spatial overlap calculations</p>
                  </div>
                  <button
                    type="button"
                    onClick={runSpatialAnalysis}
                    disabled={isCalculating || isViewerMode}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 shrink-0"
                  >
                    {isCalculating ? 'Calculating...' : 'Run Spatial Analysis'}
                  </button>
                </div>
                {(spatialStatus === 'unavailable' || spatialStatus === 'failed') && spatialErrorMessage && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
                    <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                    <p>{spatialErrorMessage}</p>
                  </div>
                )}
                {spatialStatus === 'success' && gisData && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-md border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Affected Area</p>
                      <p className="mt-1 font-serif text-2xl font-semibold">{(gisData.affected_area_sqm / 10000).toFixed(2)} Ha</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Intersecting Zones</p>
                      <p className="mt-1 font-serif text-2xl font-semibold">{gisData.intersecting_zones_count}</p>
                    </div>
                  </div>
                )}
              </div>
              <HierarchyPanel
                onSelectParcel={(parcelId: string) => {
                  setHubParcelId(parcelId)
                  setIsHubOpen(true)
                }}
              />
              <ConflictDetectionPanel
                userRole={userRole}
                onConflictDetected={(loc) => setConflictLocation(loc)}
                onAlertsEvaluated={() => setAlertsRefreshKey((prev) => prev + 1)}
              />
              <AlertSummary counts={alertCounts} />
              <AlertsPanel key={alertsRefreshKey} userRole={userRole} onCountsUpdated={setAlertCounts} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
                <ProgressChart parcels={projectParcels} />
                <RouteMap />
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedParcel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setSelectedParcel(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-1.5 w-full">
              <div className="flex-1 bg-amber-500" />
              <div className="flex-1 bg-card" />
              <div className="flex-1 bg-emerald-600" />
            </div>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 id="modal-title" className="font-serif text-lg font-semibold text-foreground">
                  Survey Parcel Details
                </h3>
                <p className="text-xs text-muted-foreground">ID: {selectedParcel.id || 'N/A'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border border-border bg-muted/20 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Owner Name</p>
                  <p className="mt-1 font-semibold text-foreground">{selectedParcel.owner_name || 'N/A'}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Village Name</p>
                  <p className="mt-1 font-semibold text-foreground">{selectedParcel.village_name || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border border-border bg-muted/20 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notified Area</p>
                  <p className="mt-1 font-mono font-semibold text-foreground">
                    {selectedParcel.notified_area_sqm ? `${Number(selectedParcel.notified_area_sqm).toLocaleString()} sqm` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Possession Status</p>
                  <span
                    className={cn(
                      'mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      ['Possessed', 'Completed', 'Acquired'].includes(selectedParcel.possession_status)
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    )}
                  >
                    {selectedParcel.possession_status || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/10 p-4 space-y-2 text-xs">
                {selectedParcel.survey_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Survey Number:</span>
                    <span className="font-mono font-medium">{selectedParcel.survey_number}</span>
                  </div>
                )}
                {selectedParcel.project_code && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project Code:</span>
                    <span className="font-mono font-medium">{selectedParcel.project_code}</span>
                  </div>
                )}
                {selectedParcel.compensation_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compensation:</span>
                    <span className="font-medium">{'\u20B9'} {selectedParcel.compensation_amount}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">Record Status:</span>
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                    Verified &amp; Active
                  </span>
                </div>
              </div>
            </div>
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
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                <LandPlot className="size-3.5" />
                Open 360&deg; Parcel Hub
              </button>
              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ParcelContextHub parcelId={hubParcelId} isOpen={isHubOpen} onClose={() => setIsHubOpen(false)} userRole={userRole} />

      <footer className="mx-auto max-w-[1600px] px-4 pb-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; 2026 Government of India &middot; National Land Acquisition Management System (NLAMS)</p>
          <p>Classified: Official Use &middot; v3.2.1</p>
        </div>
      </footer>
    </div>
  )
}
