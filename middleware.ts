import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'
import {
  checkRateLimit,
  getRequestIdentifier,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import type { RateLimitKey } from '@/lib/security/rate-limit'

const AI_RATE_LIMIT_ROUTES: Record<string, RateLimitKey> = {
  '/api/search/ai': 'aiSearch',
  '/api/listings/ai-copy': 'aiCopy',
  '/api/listings/analyze-image': 'aiImageAnalysis',
  '/api/sos/ai': 'aiSOS',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit AI routes
  const rateLimitKey = AI_RATE_LIMIT_ROUTES[pathname]
  if (rateLimitKey) {
    const identifier = getRequestIdentifier(request)
    const result = checkRateLimit(identifier, rateLimitKey)
    if (!result.allowed) {
      return rateLimitResponse(result)
    }
  }

  // Rate limit contact credit/reveal endpoints
  if (pathname.includes('/api/credits') || pathname.includes('reveal')) {
    const identifier = getRequestIdentifier(request)
    const result = checkRateLimit(identifier, 'contactReveal')
    if (!result.allowed) {
      return rateLimitResponse(result)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, images)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
