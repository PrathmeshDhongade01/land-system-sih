'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, AlertCircle, RefreshCw, LogIn, UserPlus } from 'lucide-react'

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

function LoginForm() {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const targetPath = getSafeNextPath(nextParam)

  const [email, setEmail] = useState<string>('a.sharma@morth.gov.in')
  const [password, setPassword] = useState<string>('NLAMS2026Secure!')
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
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
                disabled={loading}
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

