'use client'

/**
 * RoleDashboardSections.tsx
 * Role-specific dashboard hero banners and attention queues.
 * Conditionally rendered inside app/page.tsx based on userRole.
 * Does NOT replace any existing section — mounts ABOVE the main content.
 */

import Link from 'next/link'
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileText,
  Footprints,
  Inbox,
  LandPlot,
  MapPin,
  ShieldAlert,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardKpis } from '@/lib/supabase'

/* -------------------------------------------------------------------------- */
/* Shared types                                                                */
/* -------------------------------------------------------------------------- */

export interface RoleSectionProps {
  userRole: string
  kpiData?: DashboardKpis | null
  kpiLoading?: boolean
  selectedProjectCode?: string | null
  selectedProjectName?: string | null
}

/* -------------------------------------------------------------------------- */
/* Shared quick-stat mini card                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
}) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'bg-blue-100 text-blue-600'   },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'bg-green-100 text-green-600'  },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'bg-amber-100 text-amber-600'  },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'bg-red-100 text-red-600'    },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600' },
    slate:  { bg: 'bg-slate-50',  text: 'text-slate-700',  icon: 'bg-slate-100 text-slate-500'  },
  }
  const c = colorMap[color]
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-border p-4', c.bg)}>
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', c.icon)}>
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className={cn('font-mono text-xl font-bold leading-tight', c.text)}>{value}</p>
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Quick action button                                                         */
/* -------------------------------------------------------------------------- */

function QuickAction({
  href,
  icon: Icon,
  label,
  variant = 'default',
}: {
  href: string
  icon: React.ElementType
  label: string
  variant?: 'default' | 'primary' | 'danger'
}) {
  const variantClass = {
    default: 'border-border bg-background text-foreground hover:bg-accent',
    primary: 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
    danger: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  }[variant]

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
        variantClass,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Role banner wrapper                                                         */
/* -------------------------------------------------------------------------- */

function RoleBanner({
  accent,
  icon: Icon,
  title,
  subtitle,
  selectedProjectCode,
  selectedProjectName,
  children,
}: {
  accent: string
  icon: React.ElementType
  title: string
  subtitle: string
  selectedProjectCode?: string | null
  selectedProjectName?: string | null
  children?: React.ReactNode
}) {
  const isProjectView = Boolean(selectedProjectCode && selectedProjectCode !== 'ALL')

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden mb-6">
      {/* Accent stripe */}
      <div className={cn('h-1 w-full', isProjectView ? 'bg-emerald-600' : accent)} />
      <div className="px-5 py-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {/* Scope Indicator Badge */}
          <div>
            {isProjectView ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                PROJECT VIEW: <strong className="font-mono">{selectedProjectCode}</strong> {selectedProjectName ? `— ${selectedProjectName}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <span className="size-2 rounded-full bg-blue-600" />
                NATIONAL OVERVIEW (All Projects)
              </span>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ============================================================================
   ADMIN SECTION
   ============================================================================ */

export function AdminSection({ kpiData, kpiLoading, selectedProjectCode, selectedProjectName }: RoleSectionProps) {
  const loading = kpiLoading
  const fmt = (n?: number) => (loading ? '—' : (n ?? 0).toLocaleString('en-IN'))

  return (
    <RoleBanner
      accent="bg-slate-800"
      icon={ShieldAlert}
      title="System Administration Overview"
      subtitle="Full system access · User management · National monitoring"
      selectedProjectCode={selectedProjectCode}
      selectedProjectName={selectedProjectName}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <StatCard label="Total Projects"    value={fmt(kpiData?.totalProjects)}           icon={Briefcase}    color="blue"   />
        <StatCard label="Total Area (Ha)"   value={fmt(kpiData?.totalNotifiedAreaHa)}      icon={LandPlot}     color="green"  />
        <StatCard label="Compensation (₹Cr)"value={`₹${fmt(kpiData?.compensationDisbursedCrores)}`} icon={Wallet} color="amber"  />
        <StatCard label="Affected Families" value={fmt(kpiData?.affectedFamiliesCount)}    icon={Users}        color="purple" />
      </div>
      <div className="flex flex-wrap gap-2">
        <QuickAction href="/assignments"       icon={ClipboardList} label="Manage Assignments" variant="primary" />
        <QuickAction href="/workflows"         icon={FileText}      label="Review Workflows" />
        <QuickAction href="/field-verification" icon={MapPin}       label="Field Verification" />
        <QuickAction href="/projects/new"      icon={Zap}           label="Create Project"   variant="primary" />
      </div>
    </RoleBanner>
  )
}

/* ============================================================================
   MoRD NODAL OFFICER SECTION
   ============================================================================ */

export function NodalOfficerSection({ kpiData, kpiLoading, selectedProjectCode, selectedProjectName }: RoleSectionProps) {
  const loading = kpiLoading
  const fmt = (n?: number) => (loading ? '—' : (n ?? 0).toLocaleString('en-IN'))
  const pct = (n?: number) => (loading ? '—' : `${n ?? 0}%`)

  return (
    <RoleBanner
      accent="bg-green-700"
      icon={BarChart3}
      title="National Acquisition Monitoring"
      subtitle="Ministry of Rural Development · Project-level oversight · Policy compliance"
      selectedProjectCode={selectedProjectCode}
      selectedProjectName={selectedProjectName}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <StatCard label="Active Projects"   value={fmt(kpiData?.totalProjects)}               icon={Briefcase}   color="blue"   />
        <StatCard label="Land Acquired"     value={`${fmt(kpiData?.areaAcquiredHa)} Ha`}      sub={`${pct(kpiData?.acquiredPercentage)} of notified`} icon={LandPlot} color="green" />
        <StatCard label="Compensation Out"  value={`₹${fmt(kpiData?.compensationDisbursedCrores)}Cr`} icon={Wallet}  color="amber"  />
        <StatCard label="Families Affected" value={fmt(kpiData?.affectedFamiliesCount)}        sub={`${pct(kpiData?.rehabilitatedPercentage)} resettled`} icon={Users} color="purple" />
      </div>
      <div className="flex flex-wrap gap-2">
        <QuickAction href="/workflows"          icon={FileText}      label="Approve Workflows"  variant="primary" />
        <QuickAction href="/projects/new"       icon={Zap}           label="Create Project"     variant="primary" />
        <QuickAction href="/field-verification" icon={MapPin}        label="Verification Status" />
      </div>
    </RoleBanner>
  )
}

/* ============================================================================
   SLAO SECTION
   ============================================================================ */

export function SlaoSection({ kpiData, kpiLoading, selectedProjectCode, selectedProjectName }: RoleSectionProps) {
  const loading = kpiLoading
  const fmt = (n?: number) => (loading ? '—' : (n ?? 0).toLocaleString('en-IN'))

  return (
    <RoleBanner
      accent="bg-blue-700"
      icon={Building2}
      title="State Land Acquisition Officer — Workload"
      subtitle="District authority · Statutory compliance · Field verification oversight"
      selectedProjectCode={selectedProjectCode}
      selectedProjectName={selectedProjectName}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <StatCard label="Active Projects"    value={fmt(kpiData?.totalProjects)}                  icon={Briefcase}    color="blue"   />
        <StatCard label="Compensation (₹Cr)" value={`₹${fmt(kpiData?.compensationDisbursedCrores)}`} icon={Wallet}   color="green"  />
        <StatCard label="Families Affected"  value={fmt(kpiData?.affectedFamiliesCount)}           icon={Users}       color="amber"  />
        <StatCard label="Rehabilitated"      value={`${kpiData?.rehabilitatedPercentage ?? 0}%`}   sub="of affected"  icon={CheckCircle2} color="purple" />
      </div>

      {/* Attention queue hint */}
      <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-600" />
        <span>Review pending field verifications and workflow approvals before statutory deadlines.</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <QuickAction href="/field-verification" icon={MapPin}       label="Pending Verifications" variant="primary" />
        <QuickAction href="/workflows"          icon={FileText}     label="Workflow Queue"         variant="primary" />
        <QuickAction href="/assignments"        icon={ClipboardList} label="Assign Field Officers" />
        <QuickAction href="/projects/new"       icon={Zap}          label="New Project"            />
      </div>
    </RoleBanner>
  )
}

/* ============================================================================
   CALA SECTION
   ============================================================================ */

export function CalaSection({ kpiData, kpiLoading, selectedProjectCode, selectedProjectName }: RoleSectionProps) {
  const loading = kpiLoading
  const fmt = (n?: number) => (loading ? '—' : (n ?? 0).toLocaleString('en-IN'))

  return (
    <RoleBanner
      accent="bg-purple-700"
      icon={ClipboardCheck}
      title="Competent Authority — Case Management"
      subtitle="Award determination · Compensation assessment · Rehabilitation oversight"
      selectedProjectCode={selectedProjectCode}
      selectedProjectName={selectedProjectName}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
        <StatCard label="Parcels Notified"   value={fmt(kpiData?.totalProjects)}                  sub="across projects"   icon={LandPlot}    color="blue"   />
        <StatCard label="Compensation (₹Cr)" value={`₹${fmt(kpiData?.compensationDisbursedCrores)}`} sub="disbursed" icon={Wallet}        color="green"  />
        <StatCard label="Pending Rehab"      value={`${100 - (kpiData?.rehabilitatedPercentage ?? 0)}%`} sub="of families" icon={Users}   color="amber"  />
      </div>
      <div className="flex flex-wrap gap-2">
        <QuickAction href="/workflows"          icon={FileText}  label="Pending Awards"         variant="primary" />
        <QuickAction href="/field-verification" icon={MapPin}    label="Verification Cases"      />
        <QuickAction href="/assignments"        icon={ClipboardList} label="My Cases"            />
      </div>
    </RoleBanner>
  )
}

/* ============================================================================
   FIELD OFFICER SECTION  (My Tasks hero — MyTasksPanel mounts separately)
   ============================================================================ */

export function FieldOfficerSection({ kpiData, kpiLoading, selectedProjectCode, selectedProjectName }: RoleSectionProps) {
  return (
    <RoleBanner
      accent="bg-blue-600"
      icon={Footprints}
      title="Field Officer — My Tasks"
      subtitle="Assigned parcels · Field visits · Evidence collection · Verification"
      selectedProjectCode={selectedProjectCode}
      selectedProjectName={selectedProjectName}
    >
      <div className="mb-4 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs text-blue-800">
        <Inbox className="size-3.5 shrink-0 mt-0.5 text-blue-600" />
        <span>Your active parcel assignments are listed below. Complete field visits and upload evidence to advance acquisitions.</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <QuickAction href="/field-verification" icon={Footprints}   label="Start Field Visit"    variant="primary" />
        <QuickAction href="/field-verification" icon={ClipboardCheck} label="Verify Parcel"       variant="primary" />
        <QuickAction href="/assignments"        icon={Eye}           label="All My Assignments"  />
      </div>
    </RoleBanner>
  )
}

/* ============================================================================
   VIEWER SECTION
   ============================================================================ */

export function ViewerSection({ kpiData, kpiLoading, selectedProjectCode, selectedProjectName }: RoleSectionProps) {
  const loading = kpiLoading
  const fmt = (n?: number) => (loading ? '—' : (n ?? 0).toLocaleString('en-IN'))
  const pct = (n?: number) => (loading ? '—' : `${n ?? 0}%`)

  return (
    <RoleBanner
      accent="bg-slate-500"
      icon={Eye}
      title="Read-Only Monitoring View"
      subtitle="National Land Acquisition Management System · Ministry of Rural Development · View-only access"
      selectedProjectCode={selectedProjectCode}
      selectedProjectName={selectedProjectName}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <StatCard label="Active Projects"   value={fmt(kpiData?.totalProjects)}                  icon={Briefcase}   color="slate"  />
        <StatCard label="Land Acquired"     value={`${fmt(kpiData?.areaAcquiredHa)} Ha`}         sub={pct(kpiData?.acquiredPercentage)} icon={LandPlot} color="slate" />
        <StatCard label="Compensation (₹Cr)"value={`₹${fmt(kpiData?.compensationDisbursedCrores)}`} icon={Wallet}  color="slate"  />
        <StatCard label="Families Affected" value={fmt(kpiData?.affectedFamiliesCount)}           icon={Users}       color="slate"  />
      </div>
      <p className="text-xs text-muted-foreground italic">
        You have read-only access. Contact your administrator to request elevated permissions.
      </p>
    </RoleBanner>
  )
}

/* ============================================================================
   Main dispatcher — renders the right section for the given role
   ============================================================================ */

export default function RoleDashboardSection({ userRole, kpiData, kpiLoading, selectedProjectCode, selectedProjectName }: RoleSectionProps) {
  if (!userRole) return null

  switch (userRole) {
    case 'Admin':
      return <AdminSection userRole={userRole} kpiData={kpiData} kpiLoading={kpiLoading} selectedProjectCode={selectedProjectCode} selectedProjectName={selectedProjectName} />
    case 'MoRTH Nodal Officer':
      return <NodalOfficerSection userRole={userRole} kpiData={kpiData} kpiLoading={kpiLoading} selectedProjectCode={selectedProjectCode} selectedProjectName={selectedProjectName} />
    case 'SLAO':
      return <SlaoSection userRole={userRole} kpiData={kpiData} kpiLoading={kpiLoading} selectedProjectCode={selectedProjectCode} selectedProjectName={selectedProjectName} />
    case 'CALA':
      return <CalaSection userRole={userRole} kpiData={kpiData} kpiLoading={kpiLoading} selectedProjectCode={selectedProjectCode} selectedProjectName={selectedProjectName} />
    case 'Field Officer':
      return <FieldOfficerSection userRole={userRole} kpiData={kpiData} kpiLoading={kpiLoading} selectedProjectCode={selectedProjectCode} selectedProjectName={selectedProjectName} />
    case 'Viewer':
      return <ViewerSection userRole={userRole} kpiData={kpiData} kpiLoading={kpiLoading} selectedProjectCode={selectedProjectCode} selectedProjectName={selectedProjectName} />
    default:
      return null
  }
}
