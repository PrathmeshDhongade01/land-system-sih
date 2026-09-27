import { createBrowserClient } from '@supabase/ssr'
import {
  clearAdminDemoClientCookie,
  getDemoAdminProfile,
  getDemoAdminUser,
  isAdminDemoClientActive,
} from '@/lib/demo/adminDemoBypass'

const defaultUrl = 'https://udpruwshnzrqlhrslbsf.supabase.co'
const defaultKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcHJ1d3NobnpycWxocnNsYnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjYyOTYsImV4cCI6MjEwNDAwMjI5Nn0.ORuBuT5dsSEKMHfOakevG2LU24v5Aesjny75i_WTW2U'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

function attachAdminDemoBypass(client: ReturnType<typeof createBrowserClient>) {
  const rawGetUser = client.auth.getUser.bind(client.auth)
  const rawSignOut = client.auth.signOut.bind(client.auth)
  const rawSignInWithPassword = client.auth.signInWithPassword.bind(client.auth)
  const rawFrom = client.from.bind(client)

  client.auth.getUser = async (...args: Parameters<typeof rawGetUser>) => {
    const res = await rawGetUser(...args)
    if ((!res?.data?.user || res?.error) && isAdminDemoClientActive()) {
      return {
        data: { user: getDemoAdminUser() as any },
        error: null,
      }
    }
    return res
  }

  client.auth.signOut = async (...args: Parameters<typeof rawSignOut>) => {
    clearAdminDemoClientCookie()
    if (typeof window !== 'undefined') {
      fetch('/api/auth/admin-demo', { method: 'DELETE' }).catch(() => {})
    }
    return rawSignOut(...args)
  }

  client.auth.signInWithPassword = async (
    ...args: Parameters<typeof rawSignInWithPassword>
  ) => {
    clearAdminDemoClientCookie()
    return rawSignInWithPassword(...args)
  }

  client.from = ((table: string) => {
    const builder = rawFrom(table)
    if (table === 'profiles') {
      const rawSelect = builder.select.bind(builder)
      builder.select = ((...selectArgs: any[]) => {
        const selectBuilder = (rawSelect as any)(...selectArgs)
        const rawEq = selectBuilder.eq?.bind(selectBuilder)
        if (rawEq) {
          selectBuilder.eq = (col: string, val: any) => {
            const eqBuilder = rawEq(col, val)
            const demoProfile = getDemoAdminProfile()
            if (col === 'id' && val === demoProfile.id && eqBuilder?.maybeSingle) {
              const rawMaybeSingle = eqBuilder.maybeSingle.bind(eqBuilder)
              eqBuilder.maybeSingle = async () => {
                const res = await rawMaybeSingle()
                if ((!res?.data || res?.error) && isAdminDemoClientActive()) {
                  return { data: demoProfile, error: null }
                }
                return res
              }
            }
            return eqBuilder
          }
        }
        return selectBuilder
      }) as any
    }
    return builder
  }) as any

  return client
}

export function createClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl).trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultKey).trim()

  if (typeof window === 'undefined') {
    return createBrowserClient(url, key)
  }

  if (!browserClient) {
    browserClient = attachAdminDemoBypass(createBrowserClient(url, key))
  }

  return browserClient
}
