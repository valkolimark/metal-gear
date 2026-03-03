import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip Supabase auth if credentials aren't configured yet
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder')
  ) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl

  // If an auth code lands on root, redirect to /callback to exchange it
  if (pathname === '/' && searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/callback'
    return NextResponse.redirect(url)
  }

  // Protected routes — redirect to login if no session
  const protectedPrefixes = ['/dashboard', '/messages', '/profile', '/search', '/listings', '/favorites', '/checkout', '/admin', '/sos', '/onboarding']
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Auth routes — redirect to dashboard if already logged in
  const authRoutes = ['/login', '/signup', '/forgot-password']
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Onboarding guard: redirect to /onboarding if not completed
  // Skip for the onboarding page itself, API routes, auth routes, marketing routes, and static assets
  if (
    user &&
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/callback') &&
    !isAuthRoute &&
    isProtectedRoute
  ) {
    try {
      const { data: bizProfile } = await supabase
        .from('user_business_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle()

      // If no profile exists or onboarding not completed, redirect to onboarding
      if (!bizProfile || !bizProfile.onboarding_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    } catch {
      // If query fails (e.g. table doesn't exist yet), skip the guard
    }
  }

  return supabaseResponse
}
