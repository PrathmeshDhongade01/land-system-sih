'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Map as MapIcon,
  ShieldCheck,
  LandPlot,
  UserCheck,
  Menu,
  X,
  FileText,
  Wallet,
  AlertTriangle,
  BarChart3,
  Settings,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

function ChakraEmblem({ className }: { className?: string }) {
  const spokes = Array.from({ length: 24 })
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Ashoka Chakra emblem">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
      {spokes.map((_, i) => {
        const angle = (i * 360) / spokes.length
        return (
          <line key={i} x1="50" y1="50" x2="50" y2="8"
            stroke="currentColor" strokeWidth="1.5"
            transform={`rotate(${angle} 50 50)`} />
        )
      })}
    </svg>
  )
}

type NavItem = { name: string; href: string; icon: React.ElementType }
type NavGroup = { label: string; items: NavItem[] }

function getNavGroups(role: string | null): NavGroup[] {
  if (!role) return []

  const isAdmin = role === 'Admin'
  const isMoRTH = role === 'MoRTH Nodal Officer'
  const isCALA = role === 'CALA'
  const isFieldOfficer = role === 'Field Officer'
  const isViewer = role === 'Viewer'

  if (isFieldOfficer) {
    return [
      { label: 'DASHBOARD', items: [{ name: 'My Dashboard', href: '/', icon: LayoutDashboard }] },
      {
        label: 'MY WORK',
        items: [
          { name: 'My Field Verification', href: '/field-verification', icon: LandPlot },
          { name: 'My Assignments', href: '/assignments', icon: UserCheck },
        ],
      },
      { label: 'ACTIONS', items: [{ name: 'Alerts', href: '/', icon: AlertTriangle }] },
    ]
  }

  if (isViewer) {
    return [
      { label: 'DASHBOARD', items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }] },
      { label: 'OVERVIEW', items: [{ name: 'Projects & Map', href: '/', icon: MapIcon }] },
      { label: 'INSIGHTS', items: [{ name: 'Reports / Overview', href: '/workflows', icon: BarChart3 }] },
    ]
  }

  const groups: NavGroup[] = [
    { label: 'DASHBOARD', items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }] },
  ]

  const coreItems: NavItem[] = [
    { name: 'Projects & Map', href: '/projects/new', icon: MapIcon },
    { name: 'Field Verification', href: '/field-verification', icon: LandPlot },
  ]
  if (!isMoRTH) coreItems.push({ name: 'Assignments', href: '/assignments', icon: UserCheck })
  groups.push({ label: 'CORE', items: coreItems })

  const mgmtItems: NavItem[] = [
    { name: 'Acquisition Workflow', href: '/workflows', icon: FileText },
  ]
  if (!isMoRTH) mgmtItems.push({ name: 'Compensation & R&R', href: '/workflows', icon: Wallet })
  mgmtItems.push({ name: 'Alerts & Actions', href: '/', icon: AlertTriangle })
  groups.push({ label: 'MANAGEMENT', items: mgmtItems })

  if (!isCALA) {
    groups.push({ label: 'INSIGHTS', items: [{ name: 'Reports & Analytics', href: '/workflows', icon: BarChart3 }] })
  }

  if (isAdmin) {
    groups.push({ label: 'ADMINISTRATION', items: [{ name: 'Administration', href: '/projects/new', icon: Settings }] })
  }

  return groups
}

function getRoleDisplayLabel(role: string | null): string {
  if (!role) return ''
  if (role === 'MoRTH Nodal Officer') return 'MoRD Nodal Officer'
  return role
}

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const client = createClient()
    client.auth.getUser().then((res: any) => {
      const data = res?.data
      if (data?.user) {
        client
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()
          .then((profRes: any) => {
            const prof = profRes?.data
            if (prof?.role) setUserRole(prof.role)
          })
      }
    })
  }, [])

  const navGroups = getNavGroups(userRole)
  const isViewer = userRole === 'Viewer'

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-full md:w-64 shrink-0 bg-slate-900 text-white flex flex-col md:min-h-screen border-b md:border-b-0 md:border-r border-slate-800 shadow-xl relative z-50">
      {/* Tricolor top border */}
      <div className="flex h-1 w-full shrink-0">
        <div className="flex-1 bg-amber-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      {/* Sidebar Header */}
      <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-amber-400 ring-1 ring-slate-700">
            <ChakraEmblem className="size-7" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-amber-400">Govt of India</p>
            <h2 className="truncate font-serif text-sm font-bold text-slate-100">NLAMS Portal</h2>
            <p className="truncate text-[10px] text-slate-400 hidden md:block">Land Acquisition Management</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white rounded-md"
          aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div className={cn('flex-col flex-1 overflow-y-auto bg-slate-900', isOpen ? 'flex' : 'hidden md:flex')}>
        {/* Role badge */}
        {userRole && (
          <div className="px-4 pt-3 pb-0">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
              isViewer ? 'bg-slate-700 text-slate-300' : 'bg-blue-900/60 text-blue-300',
            )}>
              {isViewer && <Eye className="size-3" />}
              {getRoleDisplayLabel(userRole)}
            </span>
          </div>
        )}

        {/* Navigation groups */}
        <nav className="flex-1 p-3 pt-4 space-y-5 overflow-y-auto" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 select-none">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={`${group.label}|${item.name}`}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className={cn('size-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
          {isViewer && (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-md p-2">
              <Eye className="size-4 shrink-0" />
              <span className="truncate text-[11px] font-medium">Read-Only Access</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-md p-2">
            <ShieldCheck className="size-4 shrink-0" />
            <span className="truncate text-[11px] font-medium">Official Session Active</span>
          </div>
          <p className="text-[10px] text-slate-500 text-center">NLAMS v3.2.1 · Classified</p>
        </div>
      </div>
    </aside>
  )
}
