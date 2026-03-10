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

  // Public listing detail pages — allow anonymous access (QR codes, shared links)
  if (pathname.match(/^\/listings\/[^/]+$/) && !pathname.endsWith('/edit')) {
    return supabaseResponse
  }

  // Public seller storefront pages — allow anonymous read-only access
  if (pathname.match(/^\/sellers\/[^/]+$/)) {
    return supabaseResponse
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
      const { data: bizProfile, error: bizError } = await supabase
        .from('user_business_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle()

      // Fail-open: if the query errors (table missing, RLS issue), let the user through
      if (bizError) {
        // Skip guard — don't block users if onboarding table is unavailable
      } else if (!bizProfile || !bizProfile.onboarding_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    } catch {
      // If query throws (e.g. network issue), skip the guard
    }
  }

  // Company guard: redirect to /companies/new if user has no company membership
  // Only runs when active_company_id cookie is absent (fast path: cookie present = skip)
  const companyGuardExempt = [
    '/companies/new',
    '/onboarding',
    '/api/',
    '/login',
    '/signup',
    '/pricing',
    '/about',
    '/terms',
    '/privacy',
    '/callback',
    '/forgot-password',
    '/reset-password',
  ]
  const isCompanyExempt = companyGuardExempt.some(p => pathname.startsWith(p))

  if (user && !isCompanyExempt && isProtectedRoute) {
    const activeCompanyCookie = request.cookies.get('active_company_id')?.value
    if (!activeCompanyCookie) {
      try {
        // Use service role to check company membership (bypasses RLS)
        const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceUrl && serviceKey) {
          const adminClient = createServerClient<Database>(serviceUrl, serviceKey, {
            cookies: { getAll: () => [], setAll: () => {} },
          })
          const { count } = await adminClient
            .from('company_memberships')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true)

          if ((count ?? 0) === 0) {
            const url = request.nextUrl.clone()
            url.pathname = '/companies/new'
            return NextResponse.redirect(url)
          }
        }
      } catch {
        // Fail-open: don't block users if company check fails
      }
    }
  }

  return supabaseResponse
}
