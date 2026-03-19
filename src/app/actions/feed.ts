'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getFeedForYouListings(userId: string) {
  const supabase = createAdminClient()

  const { data: interests } = await supabase
    .from('user_equipment_interests')
    .select('tier2')
    .eq('user_id', userId)

  if (!interests?.length) return { listings: [], hasInterests: false }

  const tier2Groups = interests.map((i) => i.tier2)

  // Get listing IDs user already viewed
  const { data: viewed } = await supabase
    .from('listing_views')
    .select('listing_id')
    .eq('viewer_id', userId)

  const viewedIds = viewed?.map((v) => v.listing_id) ?? []

  // Fetch matching listings not yet viewed, active only
  let query = supabase
    .from('listings')
    .select(
      `id, title, price_cents, contact_for_price, condition, category,
       location_city, location_state, created_at, listing_quality_score,
       is_featured, views_count, favorites_count, negotiable,
       listing_images(url, position),
       company_profiles(name, logo_url)`
    )
    .eq('status', 'active')
    .in('category', tier2Groups)
    .order('created_at', { ascending: false })
    .limit(24)

  if (viewedIds.length > 0 && viewedIds.length < 1000) {
    query = query.not('id', 'in', `(${viewedIds.join(',')})`)
  }

  const { data: listings } = await query
  return { listings: listings ?? [], hasInterests: true }
}

export async function getFeedActiveSOS(userId: string) {
  const supabase = createAdminClient()

  const { data: interests } = await supabase
    .from('user_equipment_interests')
    .select('tier2')
    .eq('user_id', userId)

  if (!interests?.length) return []
  const tier2Groups = interests.map((i) => i.tier2)

  const { data } = await supabase
    .from('sos_requests')
    .select('id, title, equipment_category, urgency, created_at, requester_id')
    .eq('status', 'active')
    .in('equipment_category', tier2Groups)
    .order('created_at', { ascending: false })
    .limit(5)

  return data ?? []
}

export async function getFeedPriceDrops(userId: string) {
  const supabase = createAdminClient()

  const { data: interests } = await supabase
    .from('user_equipment_interests')
    .select('tier2')
    .eq('user_id', userId)

  if (!interests?.length) return []
  const tier2Groups = interests.map((i) => i.tier2)

  // Get active listings in user's categories that have price history entries in last 14 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)

  const { data: listings } = await supabase
    .from('listings')
    .select(
      `id, title, price_cents, contact_for_price, condition, category,
       location_city, location_state, created_at,
       listing_images(url, position),
       price_history(price_cents, changed_at)`
    )
    .eq('status', 'active')
    .in('category', tier2Groups)
    .limit(50)

  if (!listings?.length) return []

  // Filter to listings where the most recent price_history entry > current price (price dropped)
  return listings
    .filter((listing) => {
      const history = listing.price_history as Array<{ price_cents: number; changed_at: string }> | null
      if (!history?.length || !listing.price_cents) return false

      // Find the most recent historical price within cutoff
      const recentHistory = history
        .filter((h) => new Date(h.changed_at) >= cutoff)
        .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())

      if (!recentHistory.length) return false

      const oldPrice = recentHistory[0].price_cents
      const drop = (oldPrice - listing.price_cents) / oldPrice
      return drop >= 0.05
    })
    .slice(0, 8)
    .map((listing) => {
      const history = listing.price_history as Array<{ price_cents: number; changed_at: string }>
      const sortedHistory = history
        .filter((h) => new Date(h.changed_at) >= cutoff)
        .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
      return {
        ...listing,
        oldPriceCents: sortedHistory[0]?.price_cents ?? listing.price_cents,
      }
    })
}

export async function getFeedSavedSearchMatches(userId: string) {
  const supabase = createAdminClient()

  const { data: savedSearches } = await supabase
    .from('saved_searches')
    .select('id, name, filters, ai_filters, is_ai_search')
    .eq('user_id', userId)
    .limit(5)

  if (!savedSearches?.length) return { listings: [], savedSearches: [] }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  // Get recent active listings
  const { data: listings } = await supabase
    .from('listings')
    .select(
      `id, title, price_cents, contact_for_price, category, condition,
       created_at, listing_images(url, position)`
    )
    .eq('status', 'active')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(6)

  return { listings: listings ?? [], savedSearches }
}

export async function getGeneralFeedListings() {
  const supabase = createAdminClient()

  const { data: listings } = await supabase
    .from('listings')
    .select(
      `id, title, price_cents, contact_for_price, condition, category,
       location_city, location_state, created_at, listing_quality_score,
       is_featured, views_count, favorites_count, negotiable,
       listing_images(url, position),
       company_profiles(name, logo_url)`
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(24)

  return listings ?? []
}

export async function getGeneralFeedSOS() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('sos_requests')
    .select('id, title, equipment_category, urgency, created_at, requester_id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5)

  return data ?? []
}

export async function getGeneralFeedRecentListings() {
  const supabase = createAdminClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  const { data: listings } = await supabase
    .from('listings')
    .select(
      `id, title, price_cents, contact_for_price, category, condition,
       created_at, listing_images(url, position)`
    )
    .eq('status', 'active')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(6)

  return listings ?? []
}

export async function getFeedDemandSignals(userId: string) {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('seller_demand_insights')
    .select('insights, valid_until, generated_at')
    .eq('user_id', userId)
    .gte('valid_until', new Date().toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}
