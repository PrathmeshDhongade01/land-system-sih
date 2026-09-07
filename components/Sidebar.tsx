'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Map,
  Layers,
  ShieldCheck,
  LandPlot,
  UserCheck,
  Menu,
  X,
  Inbox,
  FolderPlus,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

function ChakraEmblem({ className }: { className?: string }) {
  const spokes = Array.from({ length: 24 })
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Ashoka Chakra emblem"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
      {spokes.map((_, i) => {
        const angle = (i * 360) / spokes.length
        return (
          <line
            key={i}
            x1="50" y1="50" x2="50" y2="8"
            stroke="currentColor" strokeWidth="1.5"
            transform={`rotate(${angle} 50 50)`}
          />
        )
      })}
    </svg>
  )
}

/* Role display name helper (keeps DB value 'MoRTH Nodal Officer' unchanged) */
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

  /* ── Navigation items — always visible ── */
  const coreNavItems = [
    { name: 'Dashboard',           href: '/',                  icon: LayoutDashboard },
    { name: 'Statutory Workflows', href: '/workflows',         icon: FileText },
    { name: 'Field Verification',  href: '/field-verification', icon: LandPlot },
    { name: 'Parcel Assignments',  href: '/assignments',       icon: UserCheck },
  ]

  /* ── My Tasks — only for Field Officer ── */
  const fieldOfficerItems =
    userRole === 'Field Officer'
      ? [{ name: 'My Tasks', href: '/#my-tasks', icon: Inbox }]
      : []

  /* ── Create Project — Admin / SLAO / MoRD Nodal Officer ── */
  const projectCreatorItems =
    userRole && ['Admin', 'SLAO', 'MoRTH Nodal Officer'].includes(userRole)
      ? [{ name: 'Create Project', href: '/projects/new', icon: FolderPlus }]
      : []

  const allNavItems = [...fieldOfficerItems, ...coreNavItems, ...projectCreatorItems]

  /* Viewer gets a read-only indicator */
  const isViewer = userRole === 'Viewer'

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
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              Govt of India
            </p>
            <h2 className="truncate font-serif text-sm font-bold text-slate-100">
              NLAMS Portal
            </h2>
            <p className="truncate text-[10px] text-slate-400 hidden md:block">MoRD Acquisition</p>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white"
        >
          {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <div className={cn('flex-col flex-1 bg-slate-900', isOpen ? 'flex' : 'hidden md:flex')}>
        {/* Role badge */}
        {userRole && (
          <div className="px-4 pt-3 pb-1">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
              isViewer
                ? 'bg-slate-700 text-slate-300'
                : 'bg-blue-900/60 text-blue-300',
            )}>
              {isViewer && <Eye className="size-3" />}
              {getRoleDisplayLabel(userRole)}
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Navigation Menu
          </p>
          {allNavItems.map((item) => {
            const Icon = item.icon
            /* My Tasks points to homepage anchor, treat as active when on '/' */
            const isActive =
              item.href === '/#my-tasks' ? pathname === '/' : pathname === item.href

            /* My Tasks gets a special blue highlight */
            const isMyTasks = item.href === '/#my-tasks'

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? isMyTasks
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : isMyTasks
                    ? 'text-blue-300 bg-blue-900/30 hover:bg-blue-800/50 hover:text-white'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                )}
              >
                <Icon className={cn('size-4.5', isActive ? 'text-white' : isMyTasks ? 'text-blue-400' : 'text-slate-400')} />
                <span>{item.name}</span>
                {isMyTasks && (
                  <span className="ml-auto rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-tight">
                    NEW
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
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
          <p className="text-[10px] text-slate-400 text-center">
            NLAMS v3.2.1 · Classified
          </p>
        </div>
      </div>
    </aside>
  )
}
