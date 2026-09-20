import Link from 'next/link'
import {
  Globe,
  Building2,
  Footprints,
  User,
  Shield,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
  Compass,
  FileCheck,
  Scale,
} from 'lucide-react'

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

export const metadata = {
  title: 'NLAMS — Public Jury Demo Mode',
  description: 'Explore all four role portals of the National Land Acquisition Management System without login.',
}

export default function DemoLandingPage() {
  const portals = [
    {
      title: '1. Central Officer Portal',
      role: 'MoRTH Central Nodal Officer',
      description: 'National monitoring, GIS, conflicts, alerts and executive intelligence',
      href: '/demo/central',
      icon: Globe,
      color: 'blue',
      features: [
        'Consolidated national acquisition KPIs',
        'Corridor selector (SM-NASHIK-DEMO-01 default)',
        'Interactive satellite GIS alignment map',
        'Automated spatial conflict detection engine',
        'Deterministic compliance alerts & review queue',
        'State-wise cross-comparison analytics',
      ],
      badge: 'National Jurisdiction',
    },
    {
      title: '2. State Officer Portal',
      role: 'SLAO / CALA Divisional Authority',
      description: 'Projects, parcels, field verification, workflows and compensation',
      href: '/demo/state',
      icon: Building2,
      color: 'emerald',
      features: [
        'Divisional land acquisition ledger (Maharashtra / Nashik)',
        '24 cadastral parcels with status filtering',
        'Interactive Parcel 360 Context Hub',
        'Gazetted Section 3A & 3D statutory clearances',
        'Field officer duty assignments & progress',
        'PFMS Direct Benefit Transfer disbursal tracker',
      ],
      badge: 'State Authority',
    },
    {
      title: '3. Field Officer Portal',
      role: 'Ground Survey & Demarcation Officer',
      description: 'Assignments, GPS verification, camera evidence and field visits',
      href: '/demo/field',
      icon: Footprints,
      color: 'amber',
      features: [
        'Assigned ground survey quota & parcel queue',
        'Real-time GPS coordinate acquisition simulation',
        'Camera EXIF geo-tagging demonstration',
        'Physical inspection checklist sign-off',
        'Logged cadastral survey maps & valuation PDFs',
        'Read-only safety guardrails (no DB mutations)',
      ],
      badge: 'Ground Verification',
    },
    {
      title: '4. Parcel Owner Portal',
      role: 'Citizen Landowner Gateway',
      description: 'Own parcel status, compensation/R&R, documents and objections',
      href: '/demo/viewer',
      icon: User,
      color: 'purple',
      features: [
        'Citizen parcel dashboard (Eknath Shinde DEMO-101)',
        'Transparent RFCTLARR 2013 compensation breakdown',
        'PFMS DBT electronic payment UTR receipt',
        'Statutory acquisition timeline (Sec 3A to Possession)',
        'Downloadable gazette notices & survey records',
        'Interactive Section 3C dispute filing simulation',
      ],
      badge: 'Citizen Portal',
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Tricolor rule */}
      <div className="flex h-2 w-full">
        <div className="flex-1 bg-amber-500" />
        <div className="flex-1 bg-card" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-10 space-y-10 flex-1">
        {/* Header Branding */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex size-16 sm:size-20 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20 shadow-md">
            <ChakraEmblem className="size-12 sm:size-14" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Government of India &middot; Ministry of Road Transport &amp; Highways
            </p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              NLAMS Prototype &mdash; Jury Demo Mode
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
                <Shield className="size-3.5" />
                Hackathon Jury Evaluation Mode
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-3.5 py-1 text-xs font-semibold">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Demo data only &mdash; no login required
              </span>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Explore all four specialized role portals with realistic synthetic data from the Mumbai–Nagpur Samruddhi Expressway corridor (SM-NASHIK-DEMO-01). Seamlessly test workflows, GIS mapping, spatial conflict detection, and PFMS DBT payments.
            </p>
          </div>
        </div>

        {/* 4 Large Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.href}
                className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 text-primary font-mono text-[10px] font-bold px-2.5 py-0.5 border border-primary/20">
                      {p.badge}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">{p.role}</span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                      <Icon className="size-6" />
                    </div>
                    <div>
                      <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                        {p.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-foreground/80 font-medium mt-1 leading-snug">
                        &ldquo;{p.description}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/70 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                      Included Demonstrations:
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {p.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                          <span className="line-clamp-1">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={p.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 text-xs sm:text-sm transition-colors shadow-2xs group-hover:shadow"
                  >
                    <span>Open {p.title.split(' ')[1]} Portal Demo</span>
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Security & Architecture Note */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Lock className="size-4 text-primary" />
            <span>Security Architecture &amp; Production Isolation</span>
          </div>
          <p className="leading-relaxed">
            Production routes (<code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[11px]">/central</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[11px]">/state</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[11px]">/field</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[11px]">/viewer</code>) remain fully locked behind strict Supabase authentication, JWT sessions, and database Row Level Security (RLS). The Public Demo routes utilize isolated synthetic demo records, ensuring zero data mutation and complete public safety for hackathon jurors.
          </p>
          <div className="pt-2 flex items-center justify-between border-t border-border/50 text-[11px]">
            <span>Corridor Demo Asset: <code className="font-mono text-primary">SM-NASHIK-DEMO-01</code></span>
            <Link href="/login" className="font-medium text-primary hover:underline flex items-center gap-1">
              <span>Production Nodal Login &rarr;</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card p-4 text-center text-xs text-muted-foreground">
        &copy; 2026 Government of India &middot; National Land Acquisition Management System (NLAMS) &middot; Jury Demo Mode
      </footer>
    </div>
  )
}
