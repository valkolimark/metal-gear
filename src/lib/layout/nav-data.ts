import 'server-only'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserCompanies } from '@/app/actions/company'
import type { CompanyWithRole, CompanyRole } from '@/types/company'

export interface NavBadgeCounts {
  unreadMessages: number
  activeSosInCategories: number
  creditsBalance: number
}

export interface NavUserContext {
  userId: string
  displayName: string
  avatarUrl: string | null
  initials: string
  isAdmin: boolean
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise' | 'premium' | 'boost'
}

export interface NavCompanyMembership {
  companyId: string
  companySlug: string
  companyName: string
  initials: string
  role: CompanyRole
  logoUrl: string | null
}

export interface NavContext {
  user: NavUserContext
  badges: NavBadgeCounts
  companies: NavCompanyMembership[]
  activeCompanyId: string | null
}

function computeInitials(name: string | null | undefined, fallback = 'MG'): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function navLogError(label: string, error: unknown) {
  if (process.env.NODE_ENV === 'test') return
  // Next.js does a static-render probe at build time. Cookies/auth trigger
  // an expected "Dynamic server usage" throw that we already handle via the
  // fail-open path — silence it so build logs stay clean.
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  console.warn(`[nav-data] ${label} failed (badge defaulted to 0):`, error)
}

/**
 * Single batched fetch for everything the nav shells need.
 * Returns null when there is no authenticated user.
 *
 * Per-query fail-open: if any badge query fails the badge defaults to 0,
 * the error is logged, and the nav still renders. Navigation is too
 * high-stakes to ever block on a count.
 */
export async function getNavContext(): Promise<NavContext | null> {
  let userId: string | null = null
  let userEmail: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    userId = user.id
    userEmail = user.email ?? null
  } catch (e) {
    navLogError('auth.getUser', e)
    return null
  }

  const admin = createAdminClient()
  const cookieStore = await cookies()
  const activeCompanyIdCookie = cookieStore.get('active_company_id')?.value ?? null

  // First derive conversation IDs for unread-message count and tier-2 interests for SOS count.
  const [convRowsResult, interestsResult] = await Promise.all([
    admin
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .then((r) => r, (e) => {
        navLogError('conversations.select', e)
        return { data: null }
      }),
    admin
      .from('user_equipment_interests')
      .select('tier2')
      .eq('user_id', userId)
      .then((r) => r, (e) => {
        navLogError('user_equipment_interests.select', e)
        return { data: null }
      }),
  ])

  const convIds: string[] = (convRowsResult.data ?? []).map((r: { id: string }) => r.id)
  const tier2Groups: string[] = (interestsResult.data ?? [])
    .map((r: { tier2: string | null }) => r.tier2)
    .filter((t: string | null): t is string => typeof t === 'string' && t.length > 0)

  const [
    profileResult,
    unreadResult,
    activeSosResult,
    creditsResult,
    companies,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, subscription_tier, is_admin')
      .eq('id', userId)
      .maybeSingle()
      .then((r) => r, (e) => {
        navLogError('profiles.select', e)
        return { data: null }
      }),
    convIds.length > 0
      ? admin
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .neq('sender_id', userId)
          .is('read_at', null)
          .then((r) => r, (e) => {
            navLogError('messages.count', e)
            return { count: 0 }
          })
      : Promise.resolve({ count: 0 }),
    tier2Groups.length > 0
      ? admin
          .from('sos_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .in('equipment_category', tier2Groups)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .then((r) => r, (e) => {
            navLogError('sos_requests.count', e)
            return { count: 0 }
          })
      : Promise.resolve({ count: 0 }),
    admin
      .from('contact_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .maybeSingle()
      .then((r) => r, (e) => {
        navLogError('contact_credits.select', e)
        return { data: null }
      }),
    getUserCompanies(userId).catch((e) => {
      navLogError('getUserCompanies', e)
      return [] as CompanyWithRole[]
    }),
  ])

  const profileRow = profileResult.data
  const displayName =
    (profileRow?.display_name as string | null | undefined) ??
    (profileRow?.full_name as string | null | undefined) ??
    (userEmail ? userEmail.split('@')[0]! : 'User')

  const rawTier = (profileRow?.subscription_tier ?? 'free') as NavUserContext['subscriptionTier']

  const user: NavUserContext = {
    userId: userId!,
    displayName,
    avatarUrl: (profileRow?.avatar_url as string | null | undefined) ?? null,
    initials: computeInitials(displayName),
    isAdmin: Boolean(profileRow?.is_admin),
    subscriptionTier: rawTier,
  }

  const badges: NavBadgeCounts = {
    unreadMessages: unreadResult.count ?? 0,
    activeSosInCategories: activeSosResult.count ?? 0,
    creditsBalance: creditsResult.data?.credits_remaining ?? 0,
  }

  const mappedCompanies: NavCompanyMembership[] = companies.map((c) => ({
    companyId: c.id,
    companySlug: c.slug,
    companyName: c.name,
    initials: computeInitials(c.name, c.slug?.slice(0, 2).toUpperCase() ?? 'CO'),
    role: c.role,
    logoUrl: c.logo_url ?? null,
  }))

  return {
    user,
    badges,
    companies: mappedCompanies,
    activeCompanyId: activeCompanyIdCookie,
  }
}
