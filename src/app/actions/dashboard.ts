'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Determine user roles
  const [listingsRes, buyerTxRes] = await Promise.all([
    admin.from('listings').select('id', { count: 'exact' }).eq('seller_id', user.id).limit(0),
    admin.from('transactions').select('id', { count: 'exact' }).eq('buyer_id', user.id).limit(0),
  ])

  const isSeller = (listingsRes.count ?? 0) > 0
  const isBuyer = (buyerTxRes.count ?? 0) > 0

  // === Shared data ===
  const [unreadMsgRes, activityRes] = await Promise.all([
    admin
      .from('messages')
      .select('id', { count: 'exact' })
      .neq('sender_id', user.id)
      .is('read_at', null),
    admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const unreadMessages = unreadMsgRes.count ?? 0
  const recentActivity = activityRes.data ?? []

  // === Seller data ===
  let sellerData = null
  if (isSeller) {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // First: get active listings (needed for subsequent queries)
    const activeListingsRes = await admin
      .from('listings')
      .select('id, views_count, favorites_count, expires_at')
      .eq('seller_id', user.id)
      .eq('status', 'active')

    const activeListingIds = (activeListingsRes.data ?? []).map(l => l.id)

    const [
      thisMonthRevRes,
      lastMonthRevRes,
      pendingShipmentsRes,
      expiringRes,
      recentOffersRes,
      weekViewsRes,
      weekInquiriesRes,
    ] = await Promise.all([
      // This month's revenue
      admin.from('transactions').select('amount_cents').eq('seller_id', user.id).eq('status', 'completed').gte('updated_at', thisMonthStart),
      // Last month's revenue
      admin.from('transactions').select('amount_cents').eq('seller_id', user.id).eq('status', 'completed').gte('updated_at', lastMonthStart).lte('updated_at', lastMonthEnd),
      // Pending shipments (paid but not shipped)
      admin.from('transactions').select('id', { count: 'exact' }).eq('seller_id', user.id).eq('status', 'paid').limit(0),
      // Expiring listings (within 7 days)
      admin.from('listings').select('id, title, expires_at').eq('seller_id', user.id).eq('status', 'active').lte('expires_at', sevenDaysFromNow).gte('expires_at', now.toISOString()),
      // Recent offers received (last 30 days)
      admin.from('offers').select('id, amount_cents, status, created_at, listing_id, listings!inner(title)').eq('listings.seller_id', user.id).order('created_at', { ascending: false }).limit(5),
      // Views this week
      activeListingIds.length > 0
        ? admin.from('listing_views').select('id', { count: 'exact' }).in('listing_id', activeListingIds).gte('viewed_at', weekAgo).limit(0)
        : Promise.resolve({ count: 0, data: null, error: null }),
      // Inquiries this week (conversations initiated)
      admin.from('conversations').select('id', { count: 'exact' }).eq('seller_id', user.id).gte('created_at', weekAgo).limit(0),
    ])

    const activeListings = activeListingsRes?.data ?? []
    const totalViews = activeListings.reduce((sum, l) => sum + (l.views_count || 0), 0)
    const totalFavorites = activeListings.reduce((sum, l) => sum + (l.favorites_count || 0), 0)

    const thisMonthRevenue = (thisMonthRevRes.data ?? []).reduce((sum, t) => sum + (t.amount_cents || 0), 0)
    const lastMonthRevenue = (lastMonthRevRes.data ?? []).reduce((sum, t) => sum + (t.amount_cents || 0), 0)
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : thisMonthRevenue > 0 ? 100 : 0

    sellerData = {
      activeListingsCount: activeListings.length,
      totalViews,
      totalFavorites,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueChange,
      pendingShipments: pendingShipmentsRes.count ?? 0,
      expiringListings: (expiringRes.data ?? []).map(l => ({
        id: l.id,
        title: l.title,
        expiresAt: l.expires_at,
      })),
      recentOffers: (recentOffersRes.data ?? []).map(o => ({
        id: o.id,
        amountCents: o.amount_cents,
        status: o.status,
        createdAt: o.created_at,
        listingTitle: (o.listings as unknown as { title: string })?.title ?? '',
      })),
      weeklyViews: weekViewsRes.count ?? 0,
      weeklyInquiries: weekInquiriesRes.count ?? 0,
    }
  }

  // === Buyer data ===
  let buyerData = null
  if (isBuyer || !isSeller) {
    const [
      activeTxRes,
      priceDropsRes,
      upcomingViewingsRes,
    ] = await Promise.all([
      // Active transactions (not completed/cancelled)
      admin.from('transactions').select('id, status, amount_cents, listings!inner(title)').eq('buyer_id', user.id).not('status', 'in', '("completed","cancelled")'),
      // Recent price drops from watched listings
      admin.from('price_watches').select('listing_id, original_price_cents, target_price_cents, listings!inner(title, price_cents)').eq('user_id', user.id),
      // Upcoming viewings
      admin.from('viewing_requests').select('id, proposed_datetime, status, listings!inner(title)').eq('buyer_id', user.id).in('status', ['pending', 'accepted']).gte('proposed_datetime', new Date().toISOString()).order('proposed_datetime', { ascending: true }).limit(5),
    ])

    const watches = (priceDropsRes.data ?? []).map(w => {
      const listing = w.listings as unknown as { title: string; price_cents: number }
      return {
        listingId: w.listing_id,
        title: listing?.title ?? '',
        originalPrice: w.original_price_cents,
        currentPrice: listing?.price_cents ?? 0,
        targetPrice: w.target_price_cents,
        dropped: listing?.price_cents < w.original_price_cents,
      }
    })

    buyerData = {
      activeTransactions: (activeTxRes.data ?? []).map(t => ({
        id: t.id,
        status: t.status,
        amountCents: t.amount_cents,
        listingTitle: (t.listings as unknown as { title: string })?.title ?? '',
      })),
      priceWatches: watches,
      priceDropCount: watches.filter(w => w.dropped).length,
      upcomingViewings: (upcomingViewingsRes.data ?? []).map(v => ({
        id: v.id,
        datetime: v.proposed_datetime,
        status: v.status,
        listingTitle: (v.listings as unknown as { title: string })?.title ?? '',
      })),
    }
  }

  return {
    isSeller,
    isBuyer,
    unreadMessages,
    recentActivity,
    sellerData,
    buyerData,
  }
}
