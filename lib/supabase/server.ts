import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const defaultUrl = 'https://udpruwshnzrqlhrslbsf.supabase.co'
const defaultKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcHJ1d3NobnpycWxocnNsYnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjYyOTYsImV4cCI6MjEwNDAwMjI5Nn0.ORuBuT5dsSEKMHfOakevG2LU24v5Aesjny75i_WTW2U'

export async function createClient() {
  const cookieStore = await cookies()
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl).trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultKey).trim()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if proxy/middleware is refreshing user sessions.
        }
      },
    },
  })
}

export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, supabase, error }
  }

  return { user, supabase, error: null }
}

export interface AuthenticatedUserProfile {
  id: string
  email: string | null
  full_name: string | null
  role: string
  department: string | null
  designation: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface AuthWithProfileResult {
  user: any | null
  profile: AuthenticatedUserProfile | null
  supabase: any
  error: string | null
  status: 401 | 403 | 200
}

export function createClientForToken(token: string) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl).trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultKey).trim()
  return createServerClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
  })
}

export async function getAuthenticatedUserWithProfile(
  request?: Request
): Promise<AuthWithProfileResult> {
  let user: any = null
  let authError: any = null
  let supabase: any = null

  // 1. Check for Bearer token in Authorization header
  const authHeader = request?.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token) {
      supabase = createClientForToken(token)
      const { data, error } = await supabase.auth.getUser(token)
      if (data?.user) {
        user = data.user
      } else {
        authError = error
      }
    }
  }

  // 2. Fallback to SSR cookies if no user resolved via Bearer token
  if (!user) {
    supabase = await createClient()
    const {
      data: { user: cookieUser },
      error: cookieAuthError,
    } = await supabase.auth.getUser()
    user = cookieUser
    authError = cookieAuthError
  }

  if (authError || !user) {
    return {
      user: null,
      profile: null,
      supabase: supabase || (await createClient()),
      error: 'Authentication required',
      status: 401,
    }
  }

  const dbClient = createServiceRoleClient() || supabase
  const { data: profile, error: profileError } = await dbClient
    .from('profiles')
    .select('id, email, full_name, role, department, designation, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return {
      user,
      profile: null,
      supabase,
      error: 'Insufficient permissions',
      status: 403,
    }
  }

  if (profile.is_active === false) {
    return {
      user,
      profile,
      supabase,
      error: 'User account is inactive',
      status: 403,
    }
  }

  return {
    user,
    profile,
    supabase,
    error: null,
    status: 200,
  }
}

export function createServiceRoleClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl).trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!key) {
    return null
  }
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
  })
}
