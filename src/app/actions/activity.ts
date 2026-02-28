'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

export async function trackActivity(
  action: 'view' | 'search' | 'favorite',
  listingId?: string,
  metadata?: Record<string, Json>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const admin = createAdminClient()
  await admin.from('user_activity').insert({
    user_id: user.id,
    action,
    listing_id: listingId || null,
    metadata: (metadata || {}) as Json,
  })
}

export async function getRecommendedListings() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { listings: [] }

  const admin = createAdminClient()

  // Get user's recent activity (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: activities } = await admin
    .from('user_activity')
    .select('action, listing_id, metadata, created_at')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(200)

  if (!activities || activities.length === 0) {
    // No activity — return trending listings instead
    return getTrendingListings(user.id)
  }

  // Collect listing IDs the user has interacted with
  const viewedListingIds = new Set<string>()
  const categoryAffinity = new Map<string, number>()
  const priceSignals: number[] = []

  // Get listing details for viewed/favorited items
  const listingIds = activities
    .filter((a) => a.listing_id)
    .map((a) => a.listing_id as string)

  const uniqueListingIds = [...new Set(listingIds)]

  if (uniqueListingIds.length > 0) {
    const { data: viewedListings } = await admin
      .from('listings')
      .select('id, category, price_cents')
      .in('id', uniqueListingIds.slice(0, 50))

    for (const listing of viewedListings || []) {
      viewedListingIds.add(listing.id)

      // Category affinity: favorites count 3x, views count 1x
      const viewCount = activities.filter(
        (a) => a.listing_id === listing.id && a.action === 'view'
      ).length
      const favCount = activities.filter(
        (a) => a.listing_id === listing.id && a.action === 'favorite'
      ).length
      const score = viewCount + favCount * 3
      categoryAffinity.set(
        listing.category,
        (categoryAffinity.get(listing.category) || 0) + score
      )

      if (listing.price_cents) {
        priceSignals.push(listing.price_cents)
      }
    }
  }

  // Extract search category signals
  for (const activity of activities) {
    if (activity.action === 'search' && activity.metadata) {
      const meta = activity.metadata as Record<string, unknown>
      if (meta.category && typeof meta.category === 'string') {
        categoryAffinity.set(
          meta.category,
          (categoryAffinity.get(meta.category) || 0) + 2
        )
      }
    }
  }

  // Sort categories by affinity score
  const topCategories = [...categoryAffinity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat)

  if (topCategories.length === 0) {
    return getTrendingListings(user.id)
  }

  // Calculate price range (25th to 75th percentile)
  let priceMin: number | undefined
  let priceMax: number | undefined
  if (priceSignals.length >= 3) {
    priceSignals.sort((a, b) => a - b)
    const p25 = priceSignals[Math.floor(priceSignals.length * 0.25)]
    const p75 = priceSignals[Math.floor(priceSignals.length * 0.75)]
    priceMin = Math.floor(p25 * 0.5)
    priceMax = Math.ceil(p75 * 2)
  }

  // Fetch recommended listings: same categories, exclude already viewed, active only
  let query = admin
    .from('listings')
    .select('*, listing_images(url, position)')
    .eq('status', 'active')
    .neq('seller_id', user.id)
    .in('category', topCategories)
    .order('created_at', { ascending: false })
    .limit(12)

  if (priceMin !== undefined && priceMax !== undefined) {
    query = query.gte('price_cents', priceMin).lte('price_cents', priceMax)
  }

  const { data: recommended } = await query

  // Filter out already-viewed and sort by relevance
  const filtered = (recommended || [])
    .filter((l) => !viewedListingIds.has(l.id))
    .slice(0, 6)

  // If not enough recs, backfill with trending
  if (filtered.length < 3) {
    const trending = await getTrendingListings(user.id)
    const existingIds = new Set(filtered.map((l) => l.id))
    const backfill = trending.listings
      .filter((l) => !existingIds.has(l.id))
      .slice(0, 6 - filtered.length)
    return { listings: [...filtered, ...backfill] }
  }

  return { listings: filtered }
}

async function getTrendingListings(userId: string) {
  const admin = createAdminClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data } = await admin
    .from('listings')
    .select('*, listing_images(url, position)')
    .eq('status', 'active')
    .neq('seller_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('views_count', { ascending: false })
    .limit(6)

  return { listings: data || [] }
}
