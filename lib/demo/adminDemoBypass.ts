/**
 * ============================================================================
 * ISOLATED PROTOTYPE / DEMO MODE BYPASS — ADMIN PASSWORDLESS LOGIN
 * ============================================================================
 *
 * PURPOSE:
 * Allows one-click passwordless entry into the existing Admin Dashboard (`/`)
 * ONLY when the user selects/clicks "Admin" on the `/login` page during demos.
 *
 * PRODUCTION DISABLING INSTRUCTIONS:
 * Set `NEXT_PUBLIC_ENABLE_ADMIN_DEMO_BYPASS=false` in `.env` (or set
 * `ADMIN_DEMO_BYPASS_CONFIG.enabled = false` below) to completely disable
 * this bypass across the Login UI, Middleware, Server Auth, and Browser Client.
 *
 * All other roles (Field Officer, SLAO, CALA, MoRTH Nodal Officer, Viewer)
 * continue to require full Supabase email + password authentication and RBAC.
 * ============================================================================
 */

export const ADMIN_DEMO_COOKIE_NAME = 'nlams_admin_demo_bypass'

export const ADMIN_DEMO_BYPASS_CONFIG = {
  /**
   * Master switch for the Admin demo login bypass.
   * Defaults to true for SIH prototype evaluation unless explicitly disabled via env.
   */
  enabled:
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_ENABLE_ADMIN_DEMO_BYPASS !== undefined
      ? process.env.NEXT_PUBLIC_ENABLE_ADMIN_DEMO_BYPASS !== 'false'
      : true,

  /**
   * Canonical Admin account in public.profiles / auth.users
   */
  adminProfile: {
    id: '756ac6df-8996-4b4d-a932-7d6306529195',
    email: 'admin@morth.gov.in',
    full_name: 'NLAMS System Administrator',
    role: 'Admin' as const,
    department: 'Ministry of Road Transport & Highways (MoRTH)',
    designation: 'System Administrator (Demo Mode)',
    is_active: true,
  },
}

export function isAdminDemoBypassEnabled(): boolean {
  return ADMIN_DEMO_BYPASS_CONFIG.enabled
}

/**
 * Synthetic Supabase User object matching the canonical Admin account,
 * used as a seamless fallback whenever the demo cookie is active.
 */
export function getDemoAdminUser() {
  const { adminProfile } = ADMIN_DEMO_BYPASS_CONFIG
  return {
    id: adminProfile.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: adminProfile.email,
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    user_metadata: {
      full_name: adminProfile.full_name,
      role: adminProfile.role,
      demo_mode: true,
    },
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

export function getDemoAdminProfile() {
  return { ...ADMIN_DEMO_BYPASS_CONFIG.adminProfile }
}

/**
 * Browser-side helpers to read/enable/clear the isolated Admin Demo cookie.
 */
export function isAdminDemoClientActive(): boolean {
  if (!isAdminDemoBypassEnabled()) return false
  if (typeof document === 'undefined') return false
  return document.cookie
    .split(';')
    .some((c) => c.trim() === `${ADMIN_DEMO_COOKIE_NAME}=true`)
}

export function enableAdminDemoClientCookie(): void {
  if (!isAdminDemoBypassEnabled()) return
  if (typeof document === 'undefined') return
  document.cookie = `${ADMIN_DEMO_COOKIE_NAME}=true; path=/; max-age=86400; SameSite=Lax`
}

export function clearAdminDemoClientCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${ADMIN_DEMO_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}
