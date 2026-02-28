'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Market-level analytics ──

export async function getAveragePriceByCategory() {
  const admin = createAdminClient()

  const { data: listings } = await admin
    .from('listings')
    .select('category, price_cents')
    .eq('status', 'active')
    .not('price_cents', 'is', null)
    .gt('price_cents', 0)

  if (!listings || listings.length === 0) return { categories: [] }

  const catMap = new Map<string, { total: number; count: number }>()
  for (const l of listings) {
    const entry = catMap.get(l.category) || { total: 0, count: 0 }
    entry.total += l.price_cents!
    entry.count += 1
    catMap.set(l.category, entry)
  }

  const categories = Array.from(catMap.entries())
    .map(([category, { total, count }]) => ({
      category,
      avgPriceCents: Math.round(total / count),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return { categories }
}

export async function getListingVolumeTrends() {
  const admin = createAdminClient()

  // Get listings created in the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: listings } = await admin
    .from('listings')
    .select('category, created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true })

  if (!listings || listings.length === 0) return { months: [], categories: [] }

  // Build month buckets
  const monthMap = new Map<string, Map<string, number>>()
  const allCategories = new Set<string>()

  for (const l of listings) {
    const month = l.created_at.slice(0, 7) // YYYY-MM
    allCategories.add(l.category)
    if (!monthMap.has(month)) monthMap.set(month, new Map())
    const catMap = monthMap.get(month)!
    catMap.set(l.category, (catMap.get(l.category) || 0) + 1)
  }

  // Fill months
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const categories = Array.from(allCategories)
  const trends = months.map((month) => {
    const catMap = monthMap.get(month) || new Map()
    const data: Record<string, number> = {}
    for (const cat of categories) {
      data[cat] = catMap.get(cat) || 0
    }
    return { month, ...data }
  })

  return { months, categories, trends }
}

export async function getDemandHeatmap() {
  const admin = createAdminClient()

  // Get search activity counts by category (from user_activity)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: searches } = await admin
    .from('user_activity')
    .select('metadata')
    .eq('action', 'search')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Count search queries by category from metadata
  const searchCounts = new Map<string, number>()
  for (const s of searches || []) {
    const meta = s.metadata as Record<string, unknown> | null
    const category = (meta?.category as string) || 'Other'
    searchCounts.set(category, (searchCounts.get(category) || 0) + 1)
  }

  // Get supply counts (active listings by category)
  const { data: listings } = await admin
    .from('listings')
    .select('category')
    .eq('status', 'active')

  const supplyCounts = new Map<string, number>()
  for (const l of listings || []) {
    supplyCounts.set(l.category, (supplyCounts.get(l.category) || 0) + 1)
  }

  // Combine
  const allCategories = new Set([...searchCounts.keys(), ...supplyCounts.keys()])
  const heatmap = Array.from(allCategories).map((category) => ({
    category,
    demand: searchCounts.get(category) || 0,
    supply: supplyCounts.get(category) || 0,
  }))

  return { heatmap: heatmap.sort((a, b) => b.demand - a.demand) }
}

export async function getPriceComparison(listingId: string) {
  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('category, price_cents')
    .eq('id', listingId)
    .single()

  if (!listing || !listing.price_cents) return { error: 'Listing not found or no price' }

  // Get all prices in the same category
  const { data: categoryListings } = await admin
    .from('listings')
    .select('price_cents')
    .eq('category', listing.category)
    .eq('status', 'active')
    .not('price_cents', 'is', null)
    .gt('price_cents', 0)
    .order('price_cents', { ascending: true })

  if (!categoryListings || categoryListings.length === 0) {
    return { error: 'No comparable listings found' }
  }

  const prices = categoryListings.map((l) => l.price_cents!)
  const sum = prices.reduce((a, b) => a + b, 0)
  const avg = Math.round(sum / prices.length)
  const median = prices[Math.floor(prices.length / 2)]
  const min = prices[0]
  const max = prices[prices.length - 1]

  // Find percentile of this listing
  const below = prices.filter((p) => p < listing.price_cents!).length
  const percentile = Math.round((below / prices.length) * 100)

  return {
    comparison: {
      listingPrice: listing.price_cents,
      category: listing.category,
      avg,
      median,
      min,
      max,
      percentile,
      totalListings: prices.length,
    },
  }
}

export async function getSellerPerformance() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get seller's listings
  const { data: listings } = await admin
    .from('listings')
    .select('id, status, views_count, favorites_count, price_cents')
    .eq('seller_id', user.id)

  if (!listings) return { error: 'No listings found' }

  const listingIds = listings.map((l) => l.id)
  const activeListings = listings.filter((l) => l.status === 'active')
  const soldListings = listings.filter((l) => l.status === 'sold')

  // Total views
  const totalViews = listings.reduce((s, l) => s + (l.views_count || 0), 0)
  const totalFavorites = listings.reduce((s, l) => s + (l.favorites_count || 0), 0)

  // Inquiries (conversations)
  const { count: inquiryCount } = await admin
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', user.id)

  // Offers received
  const { count: offerCount } = await admin
    .from('offers')
    .select('id', { count: 'exact', head: true })
    .in('listing_id', listingIds.length > 0 ? listingIds : ['none'])

  // Completed transactions (revenue)
  const { data: completedTx } = await admin
    .from('transactions')
    .select('amount_cents')
    .eq('seller_id', user.id)
    .eq('status', 'completed')

  const totalRevenue = (completedTx || []).reduce((s, t) => s + t.amount_cents, 0)

  // Conversion funnel
  const funnel = {
    views: totalViews,
    inquiries: inquiryCount || 0,
    offers: offerCount || 0,
    sales: soldListings.length,
  }

  // Monthly revenue (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: recentTx } = await admin
    .from('transactions')
    .select('amount_cents, created_at')
    .eq('seller_id', user.id)
    .eq('status', 'completed')
    .gte('created_at', sixMonthsAgo.toISOString())

  const revenueByMonth: { month: string; revenue: number }[] = []
  const monthRevMap = new Map<string, number>()
  for (const tx of recentTx || []) {
    const month = tx.created_at.slice(0, 7)
    monthRevMap.set(month, (monthRevMap.get(month) || 0) + tx.amount_cents)
  }
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    revenueByMonth.push({ month: key, revenue: monthRevMap.get(key) || 0 })
  }

  return {
    performance: {
      activeListings: activeListings.length,
      soldListings: soldListings.length,
      totalListings: listings.length,
      totalViews,
      totalFavorites,
      totalRevenue,
      funnel,
      revenueByMonth,
    },
  }
}

export async function exportAnalyticsCSV() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: listings } = await admin
    .from('listings')
    .select('id, title, category, status, views_count, favorites_count, price_cents, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  if (!listings || listings.length === 0) return { csv: 'No data to export' }

  const listingIds = listings.map((l) => l.id)

  // Get inquiry counts
  const { data: convs } = await admin
    .from('conversations')
    .select('listing_id')
    .eq('seller_id', user.id)

  const inquiryMap = new Map<string, number>()
  for (const c of convs || []) {
    inquiryMap.set(c.listing_id, (inquiryMap.get(c.listing_id) || 0) + 1)
  }

  // Get offer counts
  const { data: offers } = await admin
    .from('offers')
    .select('listing_id')
    .in('listing_id', listingIds)

  const offerMap = new Map<string, number>()
  for (const o of offers || []) {
    offerMap.set(o.listing_id, (offerMap.get(o.listing_id) || 0) + 1)
  }

  const header = 'Title,Category,Status,Price,Views,Favorites,Inquiries,Offers,Created'
  const rows = listings.map((l) => {
    const price = l.price_cents ? `$${(l.price_cents / 100).toFixed(2)}` : 'Contact'
    const title = `"${l.title.replace(/"/g, '""')}"`
    return `${title},${l.category},${l.status},${price},${l.views_count},${l.favorites_count},${inquiryMap.get(l.id) || 0},${offerMap.get(l.id) || 0},${l.created_at.split('T')[0]}`
  })

  return { csv: [header, ...rows].join('\n') }
}
