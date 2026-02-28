'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function recordListingView(listingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // Record timestamped view event
  await admin.from('listing_views').insert({
    listing_id: listingId,
    viewer_id: user?.id || null,
  })

  // Track user activity for recommendations
  if (user) {
    await admin.from('user_activity').insert({
      user_id: user.id,
      action: 'view',
      listing_id: listingId,
    })
  }

  // Also increment the legacy views_count counter
  const { data: listing } = await admin
    .from('listings')
    .select('views_count')
    .eq('id', listingId)
    .single()

  if (listing) {
    await admin
      .from('listings')
      .update({ views_count: (listing.views_count || 0) + 1 })
      .eq('id', listingId)
  }
}

export async function getSellerAnalytics() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()

  // Get all seller's listings
  const { data: listings } = await admin
    .from('listings')
    .select('id, title, status, views_count, favorites_count, created_at')
    .eq('seller_id', user.id)
    .order('views_count', { ascending: false })

  if (!listings || listings.length === 0) {
    return {
      listings: [],
      totalViews: 0,
      totalFavorites: 0,
      totalInquiries: 0,
      viewsByDay: [],
      topListings: [],
    }
  }

  const listingIds = listings.map((l) => l.id)

  // Get views over last 30 days grouped by day
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: viewEvents } = await admin
    .from('listing_views')
    .select('listing_id, viewed_at')
    .in('listing_id', listingIds)
    .gte('viewed_at', thirtyDaysAgo.toISOString())
    .order('viewed_at', { ascending: true })

  // Group views by day
  const viewsByDay: { date: string; views: number }[] = []
  const dayMap = new Map<string, number>()
  for (const event of viewEvents || []) {
    const day = event.viewed_at.split('T')[0]
    dayMap.set(day, (dayMap.get(day) || 0) + 1)
  }
  // Fill in missing days
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    viewsByDay.push({ date: key, views: dayMap.get(key) || 0 })
  }

  // Get inquiry count (conversations started about seller's listings)
  const { count: inquiryCount } = await admin
    .from('conversations')
    .select('id', { count: 'exact' })
    .eq('seller_id', user.id)

  // Per-listing view counts from last 30 days
  const listingViewCounts = new Map<string, number>()
  for (const event of viewEvents || []) {
    listingViewCounts.set(
      event.listing_id,
      (listingViewCounts.get(event.listing_id) || 0) + 1
    )
  }

  // Per-listing inquiry counts
  const { data: convCounts } = await admin
    .from('conversations')
    .select('listing_id')
    .eq('seller_id', user.id)

  const listingInquiryCounts = new Map<string, number>()
  for (const conv of convCounts || []) {
    listingInquiryCounts.set(
      conv.listing_id,
      (listingInquiryCounts.get(conv.listing_id) || 0) + 1
    )
  }

  const totalViews = listings.reduce((s, l) => s + (l.views_count || 0), 0)
  const totalFavorites = listings.reduce(
    (s, l) => s + (l.favorites_count || 0),
    0
  )

  // Top 5 performing listings by views
  const topListings = listings
    .filter((l) => l.status === 'active')
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      title: l.title,
      views: l.views_count || 0,
      recentViews: listingViewCounts.get(l.id) || 0,
      favorites: l.favorites_count || 0,
      inquiries: listingInquiryCounts.get(l.id) || 0,
      conversionRate:
        l.views_count > 0
          ? ((listingInquiryCounts.get(l.id) || 0) / l.views_count) * 100
          : 0,
    }))

  return {
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      status: l.status,
      views: l.views_count || 0,
      favorites: l.favorites_count || 0,
      inquiries: listingInquiryCounts.get(l.id) || 0,
    })),
    totalViews,
    totalFavorites,
    totalInquiries: inquiryCount || 0,
    viewsByDay,
    topListings,
  }
}
