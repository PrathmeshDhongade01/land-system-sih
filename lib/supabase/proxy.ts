import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const defaultUrl = 'https://udpruwshnzrqlhrslbsf.supabase.co'
const defaultKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcHJ1d3NobnpycWxocnNsYnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjYyOTYsImV4cCI6MjEwNDAwMjI5Nn0.ORuBuT5dsSEKMHfOakevG2LU24v5Aesjny75i_WTW2U'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl).trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultKey).trim()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isProtectedRoute =
    pathname === '/' ||
    pathname.startsWith('/workflows') ||
    pathname.startsWith('/assignments') ||
    pathname.startsWith('/field-verification')
  const isLoginPage = pathname === '/login'

  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
