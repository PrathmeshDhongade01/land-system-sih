'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  Building2,
  CheckCircle,
  Upload,
  FileCheck,
  User,
  LogOut,
  ArrowLeft,
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

export type NavItem = {
  name: string
  href?: string
  icon: React.ElementType
  action?: 'profile' | 'signout'
}
export type NavGroup = { label: string; items: NavItem[] }

function getNavGroups(role: string | null, pathname: string): NavGroup[] {
  if (!role) return []

  const isAdmin = role === 'Admin'
  const isMoRTH = role === 'MoRTH Nodal Officer'
  const isCALA = role === 'CALA'
  const isSLAO = role === 'SLAO'
  const isFieldOfficer = role === 'Field Officer'
  const isViewer = role === 'Viewer'

  // 1. Central Officer: MoRTH Nodal Officer
  if (isMoRTH) {
    return [
      {
        label: 'CENTRAL OFFICER PORTAL',
        items: [
          { name: 'Dashboard', href: '/central', icon: LayoutDashboard },
          { name: 'Projects', href: '/central#progress', icon: Building2 },
          { name: 'GIS & Map', href: '/central#gis', icon: MapIcon },
          { name: 'Alerts', href: '/central#alerts', icon: AlertTriangle },
          { name: 'Objections', href: '/central#objections', icon: ShieldCheck },
          { name: 'Reports', href: '/central#states', icon: BarChart3 },
          { name: 'Profile', action: 'profile', icon: User },
          { name: 'Sign Out', action: 'signout', icon: LogOut },
        ],
      },
    ]
  }

  // 2. State Officer: SLAO & CALA
  if (isSLAO || isCALA) {
    return [
      {
        label: 'STATE OFFICER PORTAL',
        items: [
          { name: 'Dashboard', href: '/state', icon: LayoutDashboard },
          { name: 'Projects', href: '/state#projects', icon: Building2 },
          { name: 'Parcels', href: '/state#hierarchy', icon: LandPlot },
          { name: 'Field Verification', href: '/field-verification', icon: CheckCircle },
          { name: 'Assignments', href: '/assignments', icon: UserCheck },
          { name: 'Workflows', href: '/workflows', icon: FileText },
          { name: 'Compensation & R&R', href: '/state#compensation', icon: Wallet },
          { name: 'Objections', href: '/state#objections', icon: ShieldCheck },
          { name: 'Alerts', href: '/state#alerts', icon: AlertTriangle },
          { name: 'Profile', action: 'profile', icon: User },
          { name: 'Sign Out', action: 'signout', icon: LogOut },
        ],
      },
    ]
  }

  // 3. Field Officer: Field visits, assignments, camera, evidence
  if (isFieldOfficer) {
    return [
      {
        label: 'FIELD OFFICER PORTAL',
        items: [
          { name: 'My Assignments', href: '/field#tasks', icon: UserCheck },
          { name: 'Field Verification', href: '/field#verification', icon: LandPlot },
          { name: 'Evidence Upload', href: '/field#evidence', icon: Upload },
          { name: 'My Reports', href: '/field#reports', icon: FileCheck },
          { name: 'Profile', action: 'profile', icon: User },
          { name: 'Sign Out', action: 'signout', icon: LogOut },
        ],
      },
    ]
  }

  // 4. Viewer / Parcel Owner: Strictly own parcel records
  if (isViewer) {
    return [
      {
        label: 'PARCEL OWNER PORTAL',
        items: [
          { name: 'My Parcel', href: '/viewer', icon: LandPlot },
          { name: 'My Objections', href: '/viewer#objections', icon: AlertTriangle },
          { name: 'Documents & Notices', href: '/viewer#documents', icon: FileText },
          { name: 'Profile', action: 'profile', icon: User },
          { name: 'Sign Out', action: 'signout', icon: LogOut },
        ],
      },
    ]
  }

  // 5. Admin: Context-Aware Navigation across all 4 portals
  if (isAdmin) {
    // When Admin is visiting /central
    if (pathname.startsWith('/central')) {
      return [
        {
          label: 'ADMIN CONTEXT',
          items: [{ name: '← Master Console', href: '/', icon: LayoutDashboard }],
        },
        {
          label: 'CENTRAL OFFICER PORTAL',
          items: [
            { name: 'Dashboard', href: '/central', icon: LayoutDashboard },
            { name: 'Projects', href: '/central#progress', icon: Building2 },
            { name: 'GIS & Map', href: '/central#gis', icon: MapIcon },
            { name: 'Alerts', href: '/central#alerts', icon: AlertTriangle },
            { name: 'Objections', href: '/central#objections', icon: ShieldCheck },
            { name: 'Reports', href: '/central#states', icon: BarChart3 },
            { name: 'Profile', action: 'profile', icon: User },
            { name: 'Sign Out', action: 'signout', icon: LogOut },
          ],
        },
      ]
    }

    // When Admin is visiting /state
    if (pathname.startsWith('/state')) {
      return [
        {
          label: 'ADMIN CONTEXT',
          items: [{ name: '← Master Console', href: '/', icon: LayoutDashboard }],
        },
        {
          label: 'STATE OFFICER PORTAL',
          items: [
            { name: 'Dashboard', href: '/state', icon: LayoutDashboard },
            { name: 'Projects', href: '/state#projects', icon: Building2 },
            { name: 'Parcels', href: '/state#hierarchy', icon: LandPlot },
            { name: 'Field Verification', href: '/field-verification', icon: CheckCircle },
            { name: 'Assignments', href: '/assignments', icon: UserCheck },
            { name: 'Workflows', href: '/workflows', icon: FileText },
            { name: 'Compensation & R&R', href: '/state#compensation', icon: Wallet },
            { name: 'Objections', href: '/state#objections', icon: ShieldCheck },
            { name: 'Alerts', href: '/state#alerts', icon: AlertTriangle },
            { name: 'Profile', action: 'profile', icon: User },
            { name: 'Sign Out', action: 'signout', icon: LogOut },
          ],
        },
      ]
    }

    // When Admin is visiting /field (and not /field-verification)
    if (pathname.startsWith('/field') && !pathname.startsWith('/field-verification')) {
      return [
        {
          label: 'ADMIN CONTEXT',
          items: [{ name: '← Master Console', href: '/', icon: LayoutDashboard }],
        },
        {
          label: 'FIELD OFFICER PORTAL',
          items: [
            { name: 'My Assignments', href: '/field#tasks', icon: UserCheck },
            { name: 'Field Verification', href: '/field#verification', icon: LandPlot },
            { name: 'Evidence Upload', href: '/field#evidence', icon: Upload },
            { name: 'My Reports', href: '/field#reports', icon: FileCheck },
            { name: 'Profile', action: 'profile', icon: User },
            { name: 'Sign Out', action: 'signout', icon: LogOut },
          ],
        },
      ]
    }

    // When Admin is visiting /viewer
    if (pathname.startsWith('/viewer')) {
      return [
        {
          label: 'ADMIN CONTEXT',
          items: [{ name: '← Master Console', href: '/', icon: LayoutDashboard }],
        },
        {
          label: 'PARCEL OWNER PORTAL',
          items: [
            { name: 'My Parcel', href: '/viewer', icon: LandPlot },
            { name: 'My Objections', href: '/viewer#objections', icon: AlertTriangle },
            { name: 'Documents & Notices', href: '/viewer#documents', icon: FileText },
            { name: 'Profile', action: 'profile', icon: User },
            { name: 'Sign Out', action: 'signout', icon: LogOut },
          ],
        },
      ]
    }

    // Default Master Console Navigation
    return [
      {
        label: 'MASTER CONSOLE',
        items: [
          { name: 'Overview', href: '/', icon: LayoutDashboard },
          { name: 'Central Portal', href: '/central', icon: BarChart3 },
          { name: 'State Portal', href: '/state', icon: Building2 },
          { name: 'Field Portal', href: '/field', icon: LandPlot },
          { name: 'Viewer Portal', href: '/viewer', icon: Eye },
        ],
      },
      {
        label: 'OPERATIONS',
        items: [
          { name: 'Projects & Map', href: '/projects/new', icon: MapIcon },
          { name: 'Field Verification', href: '/field-verification', icon: CheckCircle },
          { name: 'Assignments', href: '/assignments', icon: UserCheck },
          { name: 'Workflows', href: '/workflows', icon: FileText },
          { name: 'Profile', action: 'profile', icon: User },
          { name: 'Sign Out', action: 'signout', icon: LogOut },
        ],
      },
    ]
  }

  return []
}

function getRoleDisplayLabel(role: string | null): string {
  if (!role) return ''
  if (role === 'MoRTH Nodal Officer') return 'MoRTH Central Officer'
  if (role === 'Viewer') return 'Parcel Owner'
  return role
}

function getJurisdictionScope(role: string | null): string {
  switch (role) {
    case 'MoRTH Nodal Officer':
      return 'National Highway Corridors & Statutory Stage Clearances'
    case 'SLAO':
      return 'State Revenue Division & Statutory Land Acquisition Jurisdiction'
    case 'CALA':
      return 'Competent Authority Jurisdiction & Award Determinations'
    case 'Field Officer':
      return 'Assigned Ground-Truth Cadastral Parcels & Verification Tasks'
    case 'Viewer':
      return 'Authenticated Landowner Linked Parcel Registry'
    case 'Admin':
      return 'Global System Administration & Multi-Portal Access'
    default:
      return 'Official NLAMS Session'
  }
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ email?: string; full_name?: string } | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  useEffect(() => {
    const client = createClient()
    client.auth.getUser().then((res: any) => {
      const data = res?.data
      if (data?.user) {
        client
          .from('profiles')
          .select('id, role, full_name, email')
          .eq('id', data.user.id)
          .maybeSingle()
          .then((profRes: any) => {
            const prof = profRes?.data
            if (prof?.role) setUserRole(prof.role)
            if (prof) setUserProfile(prof)
          })
      }
    })
  }, [])

  const navGroups = getNavGroups(userRole, pathname)
  const isViewer = userRole === 'Viewer'

  function isActive(href?: string): boolean {
    if (!href) return false
    if (href === '/') return pathname === '/'
    if (href.includes('#')) {
      if (typeof window !== 'undefined') {
        return window.location.pathname + window.location.hash === href
      }
      return false
    }
    return pathname === href
  }

  const handleSignOut = async () => {
    const client = createClient()
    await client.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
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
              <p className="truncate text-[10px] text-slate-400 hidden md:block">Land Acquisition System</p>
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
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                  isViewer ? 'bg-slate-700 text-slate-300' : 'bg-blue-900/60 text-blue-300'
                )}
              >
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

                    // Action items: Profile and Sign Out
                    if (item.action === 'profile') {
                      return (
                        <button
                          key={`${group.label}|${item.name}`}
                          type="button"
                          onClick={() => {
                            setIsOpen(false)
                            setIsProfileOpen(true)
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all duration-150 text-left"
                        >
                          <Icon className="size-4 shrink-0 text-slate-400" />
                          <span className="truncate">{item.name}</span>
                        </button>
                      )
                    }

                    if (item.action === 'signout') {
                      return (
                        <button
                          key={`${group.label}|${item.name}`}
                          type="button"
                          onClick={() => {
                            setIsOpen(false)
                            handleSignOut()
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all duration-150 text-left"
                        >
                          <Icon className="size-4 shrink-0 text-red-400" />
                          <span className="truncate">{item.name}</span>
                        </button>
                      )
                    }

                    // Standard link items
                    return (
                      <Link
                        key={`${group.label}|${item.name}`}
                        href={item.href!}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                          active
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
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
                <span className="truncate text-[11px] font-medium">Landowner Verified Account</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-md p-2">
              <ShieldCheck className="size-4 shrink-0" />
              <span className="truncate text-[11px] font-medium">Official Session Active</span>
            </div>
            <p className="text-[10px] text-slate-500 text-center">NLAMS v3.3.0 &middot; NIC Secured</p>
          </div>
        </div>
      </aside>

      {/* User Profile Modal */}
      {isProfileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
                  <User className="size-5" />
                </div>
                <div>
                  <h3 id="profile-modal-title" className="font-serif text-base font-bold text-slate-100">
                    User Profile
                  </h3>
                  <p className="text-[11px] text-slate-400">Authenticated NLAMS Credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                aria-label="Close profile"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3.5 text-xs">
              <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Official Name</span>
                <p className="text-sm font-semibold text-slate-100">
                  {userProfile?.full_name || getRoleDisplayLabel(userRole) || 'Authenticated User'}
                </p>
              </div>

              <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</span>
                <p className="font-mono text-xs text-blue-300 truncate">
                  {userProfile?.email || 'officer.session@morth.gov.in'}
                </p>
              </div>

              <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned Role</span>
                <p className="text-xs font-semibold text-emerald-400">
                  {userRole || 'Viewer'}
                </p>
              </div>

              <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jurisdiction &amp; Scope</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {getJurisdictionScope(userRole)}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <ShieldCheck className="size-3.5" />
                <span>Official Session Active</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
