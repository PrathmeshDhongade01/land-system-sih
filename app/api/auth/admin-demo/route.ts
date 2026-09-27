import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
  ADMIN_DEMO_BYPASS_CONFIG,
  ADMIN_DEMO_COOKIE_NAME,
  isAdminDemoBypassEnabled,
} from '@/lib/demo/adminDemoBypass'

/**
 * POST /api/auth/admin-demo
 *
 * Isolated Prototype / Demo Mode endpoint that activates the Admin session
 * without requiring email, password, or OTP credentials.
 *
 * 1. Verifies that the Admin Demo Bypass is enabled.
 * 2. If SUPABASE_SERVICE_ROLE_KEY is available, generates a one-time magiclink
 *    token hash for `admin@morth.gov.in` and verifies it on the SSR client so
 *    that a real Supabase Auth JWT cookie (`role: 'Admin'`) is established for
 *    all RLS-protected queries.
 * 3. Sets the isolated `nlams_admin_demo_bypass=true` cookie as a fallback.
 */
export async function POST() {
  if (!isAdminDemoBypassEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Admin Demo Mode bypass is disabled in production configuration.',
      },
      { status: 403 }
    )
  }

  let sessionEstablished = false

  try {
    const adminClient = createServiceRoleClient()
    if (adminClient) {
      const adminEmail = ADMIN_DEMO_BYPASS_CONFIG.adminProfile.email
      const { data: linkData, error: linkError } =
        await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: adminEmail,
        })

      const tokenHash = linkData?.properties?.hashed_token
      if (!linkError && tokenHash) {
        const ssrSupabase = await createClient()
        const { data: verifyData, error: verifyError } =
          await ssrSupabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          })

        if (!verifyError && verifyData?.session) {
          sessionEstablished = true
        }
      }
    }
  } catch (err) {
    console.warn('[AdminDemoBypass] Service role session minting skipped:', err)
  }

  const response = NextResponse.json({
    success: true,
    demoMode: true,
    sessionEstablished,
    role: 'Admin',
    redirectTo: '/',
  })

  response.cookies.set(ADMIN_DEMO_COOKIE_NAME, 'true', {
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
  })

  return response
}

/**
 * DELETE /api/auth/admin-demo
 * Clears the Admin Demo bypass cookie and signs out any active Supabase session.
 */
export async function DELETE() {
  try {
    const ssrSupabase = await createClient()
    await ssrSupabase.auth.signOut()
  } catch {
    // Ignore errors during sign-out cleanup
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_DEMO_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  })

  return response
}
