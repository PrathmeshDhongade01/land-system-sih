'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  enableAdminDemoClientCookie,
  isAdminDemoBypassEnabled,
} from '@/lib/demo/adminDemoBypass'
import {
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  LogIn,
  UserPlus,
  Shield,
  Crown,
  Globe,
  Building2,
  Footprints,
  User,
  ArrowRight,
} from 'lucide-react'

function getSafeNextPath(rawNext: string | null | undefined): string {
  if (!rawNext) return '/'
  const trimmed = rawNext.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    try {
      const parsed = new URL(trimmed, 'http://localhost')
      if (parsed.origin === 'http://localhost') {
        return parsed.pathname + parsed.search + parsed.hash
      }
    } catch {
      return '/'
    }
  }
  return '/'
}

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

type LoginRoleOption = {
  id: 'Admin' | 'MoRTH Nodal Officer' | 'SLAO' | 'Field Officer' | 'Viewer'
  label: string
  sublabel: string
  defaultEmail: string
  icon: React.ElementType
}

const ROLE_OPTIONS: LoginRoleOption[] = [
  {
    id: 'Admin',
    label: 'Admin',
    sublabel: 'Master System Console',
    defaultEmail: 'admin@morth.gov.in',
    icon: Crown,
  },
  {
    id: 'MoRTH Nodal Officer',
    label: 'Central Officer',
    sublabel: 'MoRTH Nodal Officer',
    defaultEmail: 'a.sharma@morth.gov.in',
    icon: Globe,
  },
  {
    id: 'SLAO',
    label: 'State Officer',
    sublabel: 'SLAO / CALA',
    defaultEmail: 'slao@morth.gov.in',
    icon: Building2,
  },
  {
    id: 'Field Officer',
    label: 'Field Officer',
    sublabel: 'Ground Verification',
    defaultEmail: 'field.officer@morth.gov.in',
    icon: Footprints,
  },
  {
    id: 'Viewer',
    label: 'Parcel Owner',
    sublabel: 'Citizen Viewer',
    defaultEmail: 'viewer.test@morth.gov.in',
    icon: User,
  },
]

function LoginForm() {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const targetPath = getSafeNextPath(nextParam)

  const [selectedRole, setSelectedRole] = useState<LoginRoleOption['id']>('MoRTH Nodal Officer')
  const [email, setEmail] = useState<string>('a.sharma@morth.gov.in')
  const [password, setPassword] = useState<string>('NLAMS2026Secure!')
  const [loading, setLoading] = useState<boolean>(false)
  const [adminDemoLoading, setAdminDemoLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  const adminBypassEnabled = isAdminDemoBypassEnabled()

  /**
   * Isolated Demo Mode Bypass handler for Admin:
   * Clicking "Admin" directly opens the existing Admin Dashboard (`/`)
   * without asking for email, password, OTP, or any other credential.
   */
  async function handleAdminDemoDirectLogin() {
    if (!adminBypassEnabled) {
      setSelectedRole('Admin')
      setEmail('admin@morth.gov.in')
      setPassword('')
      return
    }

    setSelectedRole('Admin')
    setErrorMsg(null)
    setAdminDemoLoading(true)

    try {
      enableAdminDemoClientCookie()
      await fetch('/api/auth/admin-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      // Cookie is already set client-side as fallback
    }

    window.location.href = targetPath || '/'
  }

  function handleRoleSelect(roleOption: LoginRoleOption) {
    setErrorMsg(null)
    if (roleOption.id === 'Admin' && adminBypassEnabled) {
      void handleAdminDemoDirectLogin()
      return
    }
    setSelectedRole(roleOption.id)
    setEmail(roleOption.defaultEmail)
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()

    // If Admin role is selected in demo mode, bypass credential prompt directly
    if (selectedRole === 'Admin' && adminBypassEnabled) {
      await handleAdminDemoDirectLogin()
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const supabase = createClient()

    if (mode === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        // If account doesn't exist yet in Supabase Auth, offer easy registration
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMsg('Invalid credentials. If this is your first time logging in, click "Register Nodal Account" below.')
        } else {
          setErrorMsg(error.message)
        }
        setLoading(false)
        return
      }

      if (data.session) {
        window.location.href = targetPath
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      if (data.session) {
        window.location.href = targetPath
      } else {
        setErrorMsg('Account created! Please sign in with your email and password.')
        setMode('signin')
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Top Tricolor rule */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-saffron" />
        <div className="flex-1 bg-card" />
        <div className="flex-1 bg-green-india" />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Header Branding */}
          <div className="text-center space-y-3">
            <div className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <ChakraEmblem className="size-12" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Government of India · Ministry of Road Transport &amp; Highways
              </p>
              <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                National Land Acquisition Portal
              </h1>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Official Nodal Officer Authentication &amp; Land Portal Gateway
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-base font-semibold text-foreground">
                {mode === 'signin' ? 'Nodal Officer Sign In' : 'Register Nodal Account'}
              </h2>
              <span className="inline-flex items-center gap-1 rounded bg-green-india/10 px-2 py-0.5 text-[11px] font-medium text-green-india">
                <ShieldCheck className="size-3" />
                SSL Encrypted
              </span>
            </div>

            {/* Role Selection / Instant Admin Demo Access */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Portal Role
                </span>
                {adminBypassEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                    Admin: Instant Demo Access
                  </span>
                )}
              </div>

              {/* Dedicated One-Click Admin Button (No Password / Email / OTP Required) */}
              {adminBypassEnabled && (
                <button
                  type="button"
                  onClick={handleAdminDemoDirectLogin}
                  disabled={adminDemoLoading || loading}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 px-3.5 py-2.5 text-left transition-all cursor-pointer group disabled:opacity-60"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-2xs">
                      {adminDemoLoading ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        <Crown className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">Admin</span>
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Demo Mode · No Password
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {adminDemoLoading
                          ? 'Opening Admin Dashboard...'
                          : 'Click to directly open the Admin Dashboard'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-primary group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Role Switcher Pills (Field Officer & other roles still require full authentication) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                {ROLE_OPTIONS.filter((r) => !adminBypassEnabled || r.id !== 'Admin').map(
                  (roleOpt) => {
                    const Icon = roleOpt.icon
                    const isSelected = selectedRole === roleOpt.id
                    return (
                      <button
                        key={roleOpt.id}
                        type="button"
                        onClick={() => handleRoleSelect(roleOpt)}
                        disabled={adminDemoLoading || loading}
                        className={`flex flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-center transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="text-[10px] leading-tight truncate w-full">
                          {roleOpt.label}
                        </span>
                      </button>
                    )
                  }
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Authentication Error</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. a.sharma@morth.gov.in"
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>

              <button
                type="submit"
                disabled={loading || adminDemoLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Authenticating Session...</span>
                  </>
                ) : mode === 'signin' ? (
                  <>
                    <LogIn className="size-4" />
                    <span>Sign In to NLAMS Portal</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    <span>Create Nodal Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null)
                  setMode(mode === 'signin' ? 'signup' : 'signin')
                }}
                className="text-primary hover:underline font-medium"
              >
                {mode === 'signin' ? 'First time? Register account' : 'Already registered? Sign In'}
              </button>
              <span>v3.2.1 Official</span>
            </div>
          </div>

          {/* Jury Demo Mode Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-2 shadow-2xs">
            <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-amber-800 dark:text-amber-300">
              <Shield className="size-4 text-amber-600" />
              <span>Hackathon Jury Demo Mode</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Evaluating NLAMS without login credentials? Explore all 4 role portals directly with synthetic demo data.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
            >
              <span>Launch Public Jury Demo &rarr;</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card p-4 text-center text-xs text-muted-foreground">
        © 2026 Government of India · National Land Acquisition Management System (NLAMS)
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <RefreshCw className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

