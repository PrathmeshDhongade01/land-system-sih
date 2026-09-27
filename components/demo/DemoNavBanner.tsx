'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Globe,
  Building2,
  Footprints,
  User,
  ArrowLeft,
  Shield,
  Layers,
  Sparkles,
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

const PORTAL_LINKS = [
  { href: '/demo/central', label: 'Central Officer', role: 'MoRTH Central', icon: Globe },
  { href: '/demo/state', label: 'State Officer', role: 'SLAO / CALA', icon: Building2 },
  { href: '/demo/field', label: 'Field Officer', role: 'Survey Inspection', icon: Footprints },
  { href: '/demo/viewer', label: 'Parcel Owner', role: 'Citizen Landowner', icon: User },
]

export default function DemoNavBanner({ currentPortal }: { currentPortal?: string }) {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40 shadow-xs">
      {/* Top Tricolor rule */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-amber-500" />
        <div className="flex-1 bg-card" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Branding & Demo Home link */}
          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-2xs shrink-0"
            >
              <ArrowLeft className="size-3.5" />
              <span>← Demo Home</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                <ChakraEmblem className="size-5" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif text-xs sm:text-sm font-bold text-foreground truncate">
                    NLAMS Prototype
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    <Shield className="size-3" />
                    JURY DEMO MODE
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                    Demo data only — no login required
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                  Corridor: SM-NASHIK-DEMO-01 &middot; Mumbai–Nagpur Samruddhi Expressway (Nashik Demo)
                </p>
              </div>
            </div>
          </div>

          {/* Right: Portal quick switcher */}
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1 hidden lg:inline">
              Switch Portal:
            </span>
            {PORTAL_LINKS.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || currentPortal === link.label
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                      : 'border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{link.label}</span>
                  <span className="sm:hidden">{link.label.split(' ')[0]}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
