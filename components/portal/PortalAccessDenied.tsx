'use client'

import Link from 'next/link'
import { ShieldAlert, LogOut, ArrowRight, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

export interface PortalAccessDeniedProps {
  requestedPortal: string
  requiredRoles: string[]
  currentRole?: string | null
  userEmail?: string | null
}

function getAuthorizedPortal(role?: string | null): { name: string; href: string } {
  switch (role) {
    case 'MoRTH Nodal Officer':
      return { name: 'Central Officer Portal', href: '/central' }
    case 'SLAO':
    case 'CALA':
      return { name: 'State Officer Portal', href: '/state' }
    case 'Field Officer':
      return { name: 'Field Officer Portal', href: '/field' }
    case 'Viewer':
      return { name: 'Viewer Portal', href: '/viewer' }
    case 'Admin':
      return { name: 'Master System Console', href: '/' }
    default:
      return { name: 'Portal Gateway', href: '/' }
  }
}

export default function PortalAccessDenied({
  requestedPortal,
  requiredRoles,
  currentRole,
  userEmail,
}: PortalAccessDeniedProps) {
  const router = useRouter()
  const authorized = getAuthorizedPortal(currentRole)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-[75vh] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-lg space-y-6 pt-8">
        {/* Emblem & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            <ChakraEmblem className="size-10" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Government of India &middot; National Land Acquisition Management System
          </p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-xl border border-red-200 bg-card shadow-lg">
          {/* Top Tricolor rule */}
          <div className="flex h-1.5 w-full">
            <div className="flex-1 bg-amber-500" />
            <div className="flex-1 bg-card" />
            <div className="flex-1 bg-emerald-600" />
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Header Badge & Title */}
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 border border-red-200">
                <ShieldAlert className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800 uppercase tracking-wider border border-red-200">
                  Access Restricted
                </span>
                <h1 className="mt-1 font-serif text-lg sm:text-xl font-bold text-foreground">
                  {requestedPortal}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Role-based authorization gate (RFCTLARR Act Compliance)
                </p>
              </div>
            </div>

            {/* Role comparison detail box */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-muted-foreground font-medium">Logged-in Official:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]" title={userEmail || undefined}>
                  {userEmail || 'Active Session'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Your Current Role:</span>
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {currentRole || 'Unassigned Role'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Required Role(s):</span>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 px-2 py-0.5 text-xs font-bold border border-emerald-200">
                  <UserCheck className="size-3 text-emerald-600" />
                  {requiredRoles.join(' or ')}
                </span>
              </div>
            </div>

            {/* Explanation Note */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your profile is not authorized to access the <strong>{requestedPortal}</strong>.
              Direct portal routes require specific statutory delegations. Please proceed to your designated operational portal or switch accounts.
            </p>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Link
                href={authorized.href}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <span>Go to {authorized.name}</span>
                <ArrowRight className="size-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 px-4 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
              >
                <LogOut className="size-3.5" />
                <span>Sign in with a Different Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
