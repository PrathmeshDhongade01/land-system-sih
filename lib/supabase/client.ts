import { createBrowserClient } from '@supabase/ssr'

const defaultUrl = 'https://udpruwshnzrqlhrslbsf.supabase.co'
const defaultKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcHJ1d3NobnpycWxocnNsYnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjYyOTYsImV4cCI6MjEwNDAwMjI5Nn0.ORuBuT5dsSEKMHfOakevG2LU24v5Aesjny75i_WTW2U'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl).trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultKey).trim()

  if (typeof window === 'undefined') {
    return createBrowserClient(url, key)
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, key)
  }

  return browserClient
}
