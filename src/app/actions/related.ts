'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get related listings based on weighted similarity scoring:
 * - Same category (40%)
 * - Same industry (20%)
 * - Similar price ±30% (20%)
 * - Shared keywords in title (20%)
 */
export async function getRelatedListings(listingId: string, limit = 6) {
  const admin = createAdminClient()

  // Fetch the source listing
  const { data: source } = await admin
    .from('listings')
    .select('id, category, industry, price_cents, title')
    .eq('id', listingId)
    .single()

  if (!source) return { listings: [] }

  // Fetch candidate listings (same category or industry, active only)
  const { data: candidates } = await admin
    .from('listings')
    .select('id, title, category, industry, price_cents, condition, location_city, location_state, views_count, favorites_count, contact_for_price, seller_id, created_at')
    .eq('status', 'active')
    .neq('id', listingId)
    .limit(100)

  if (!candidates || candidates.length === 0) return { listings: [] }

  // Extract keywords from source title (words with 3+ chars)
  const sourceKeywords = source.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w: string) => w.length >= 3)

  // Score and rank candidates
  const scored = candidates.map((c) => {
    let score = 0

    // Category match (40%)
    if (c.category === source.category) score += 40

    // Industry match (20%)
    if (source.industry && c.industry === source.industry) score += 20

    // Price similarity (20%) — within ±30% of source price
    if (source.price_cents && c.price_cents) {
      const ratio = c.price_cents / source.price_cents
      if (ratio >= 0.7 && ratio <= 1.3) {
        // Closer = higher score
        const closeness = 1 - Math.abs(1 - ratio) / 0.3
        score += Math.round(20 * closeness)
      }
    }

    // Keyword overlap (20%)
    if (sourceKeywords.length > 0) {
      const candidateWords = c.title.toLowerCase().split(/\s+/)
      const matches = sourceKeywords.filter((kw: string) =>
        candidateWords.some((cw: string) => cw.includes(kw) || kw.includes(cw))
      )
      const overlap = matches.length / sourceKeywords.length
      score += Math.round(20 * overlap)
    }

    return { ...c, score }
  })

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score)
  const topListings = scored.filter((s) => s.score > 0).slice(0, limit)

  // Fetch images for top listings
  if (topListings.length > 0) {
    const ids = topListings.map((l) => l.id)
    const { data: images } = await admin
      .from('listing_images')
      .select('listing_id, url, position')
      .in('listing_id', ids)

    const imageMap = new Map<string, { url: string; position: number }[]>()
    for (const img of images || []) {
      if (!imageMap.has(img.listing_id)) imageMap.set(img.listing_id, [])
      imageMap.get(img.listing_id)!.push(img)
    }

    return {
      listings: topListings.map((l) => ({
        ...l,
        listing_images: imageMap.get(l.id) || [],
      })),
    }
  }

  return { listings: topListings }
}

/**
 * Get more listings from the same seller
 */
export async function getMoreFromSeller(sellerId: string, excludeListingId: string, limit = 6) {
  const admin = createAdminClient()

  const { data: listings } = await admin
    .from('listings')
    .select('id, title, category, price_cents, condition, contact_for_price, views_count, created_at')
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .neq('id', excludeListingId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!listings || listings.length === 0) return { listings: [] }

  // Fetch images
  const ids = listings.map((l) => l.id)
  const { data: images } = await admin
    .from('listing_images')
    .select('listing_id, url, position')
    .in('listing_id', ids)

  const imageMap = new Map<string, { url: string; position: number }[]>()
  for (const img of images || []) {
    if (!imageMap.has(img.listing_id)) imageMap.set(img.listing_id, [])
    imageMap.get(img.listing_id)!.push(img)
  }

  return {
    listings: listings.map((l) => ({
      ...l,
      listing_images: imageMap.get(l.id) || [],
    })),
  }
}

/**
 * Record a view session for co-view analysis
 */
export async function recordViewSession(listingId: string, sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  await admin.from('view_sessions').insert({
    session_id: sessionId,
    user_id: user?.id || null,
    listing_id: listingId,
  })
}

/**
 * Get "Buyers Also Viewed" listings based on co-view sessions
 */
export async function getBuyersAlsoViewed(listingId: string, limit = 4) {
  const admin = createAdminClient()

  // Find sessions that viewed this listing
  const { data: sessions } = await admin
    .from('view_sessions')
    .select('session_id')
    .eq('listing_id', listingId)
    .order('viewed_at', { ascending: false })
    .limit(50)

  if (!sessions || sessions.length === 0) return { listings: [] }

  const sessionIds = [...new Set(sessions.map((s) => s.session_id))]

  // Find other listings viewed in those sessions
  const { data: coViews } = await admin
    .from('view_sessions')
    .select('listing_id')
    .in('session_id', sessionIds)
    .neq('listing_id', listingId)

  if (!coViews || coViews.length === 0) return { listings: [] }

  // Count co-views per listing
  const counts = new Map<string, number>()
  for (const cv of coViews) {
    counts.set(cv.listing_id, (counts.get(cv.listing_id) || 0) + 1)
  }

  // Sort by frequency and take top N
  const topIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  if (topIds.length === 0) return { listings: [] }

  // Fetch listing details
  const { data: listings } = await admin
    .from('listings')
    .select('id, title, category, price_cents, condition, contact_for_price, views_count, created_at')
    .in('id', topIds)
    .eq('status', 'active')

  if (!listings || listings.length === 0) return { listings: [] }

  // Fetch images
  const { data: images } = await admin
    .from('listing_images')
    .select('listing_id, url, position')
    .in('listing_id', topIds)

  const imageMap = new Map<string, { url: string; position: number }[]>()
  for (const img of images || []) {
    if (!imageMap.has(img.listing_id)) imageMap.set(img.listing_id, [])
    imageMap.get(img.listing_id)!.push(img)
  }

  return {
    listings: listings.map((l) => ({
      ...l,
      listing_images: imageMap.get(l.id) || [],
    })),
  }
}
