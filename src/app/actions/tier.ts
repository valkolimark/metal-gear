'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TIER_LIMITS } from '@/lib/constants'
import type { SubscriptionTier } from '@/lib/constants'

/**
 * Get the active subscription tier for a company (primary) or user (fallback).
 * Company-first: checks subscriptions.company_id, falls back to subscriptions.user_id.
 */
export async function getActiveTier(
  userId: string,
  companyId?: string | null
): Promise<SubscriptionTier> {
  const admin = createAdminClient()

  // Try company subscription first
  if (companyId) {
    const { data } = await admin
      .from('subscriptions')
      .select('tier, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle()
    if (data) return data.tier as SubscriptionTier
  }

  // Fallback to user subscription (backward compat during migration)
  const { data } = await admin
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (data) return data.tier as SubscriptionTier

  // Check profile subscription_tier as final fallback
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  return (profile?.subscription_tier ?? 'free') as SubscriptionTier
}

export async function checkListingLimit() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { allowed: false, error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.subscription_tier ?? 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  const { count } = await admin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', user.id)
    .in('status', ['active', 'draft'])

  const current = count ?? 0
  const allowed = current < limits.listings

  return {
    allowed,
    current,
    limit: limits.listings,
    tier,
    error: allowed ? null : `You've reached the ${limits.listings} listing limit on the ${tier} plan. Upgrade to create more listings.`,
  }
}

export async function checkConversationLimit() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { allowed: false, error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.subscription_tier ?? 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  if (limits.conversations === Infinity) {
    return { allowed: true, current: 0, limit: Infinity, tier, error: null }
  }

  const { count } = await admin
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

  const current = count ?? 0
  const allowed = current < limits.conversations

  return {
    allowed,
    current,
    limit: limits.conversations,
    tier,
    error: allowed ? null : `You've reached the ${limits.conversations} conversation limit on the ${tier} plan. Upgrade for unlimited conversations.`,
  }
}

export async function checkPhotoLimit(existingCount: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { allowed: false, error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.subscription_tier ?? 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  const allowed = existingCount < limits.photos

  return {
    allowed,
    current: existingCount,
    limit: limits.photos,
    tier,
    error: allowed ? null : `You've reached the ${limits.photos} photo limit on the ${tier} plan. Upgrade for more photos.`,
  }
}
