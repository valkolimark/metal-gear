'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/permissions'

// ─── Admin Analytics ────────────────────────────────────────────────

export async function getUserGrowthData() {
  await requireAdmin()
  const admin = createAdminClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: signups } = await admin.from('profiles').select('created_at').gte('created_at', ninetyDaysAgo)
  const { count: totalUsers } = await admin.from('profiles').select('id', { count: 'exact', head: true })
  const { data: activeUsers } = await admin.from('profiles').select('last_login_at').not('last_login_at', 'is', null).gte('last_login_at', ninetyDaysAgo)

  const signupsByDate: Record<string, number> = {}
  const dauByDate: Record<string, number> = {}
  for (const u of signups ?? []) { const d = u.created_at.slice(0, 10); signupsByDate[d] = (signupsByDate[d] || 0) + 1 }
  for (const u of activeUsers ?? []) { if (!u.last_login_at) continue; const d = u.last_login_at.slice(0, 10); dauByDate[d] = (dauByDate[d] || 0) + 1 }

  const baseCount = (totalUsers ?? 0) - (signups ?? []).length
  let cumulative = baseCount
  const series = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    cumulative += signupsByDate[key] || 0
    series.push({ date: key, signups: signupsByDate[key] || 0, dau: dauByDate[key] || 0, cumulative })
  }
  return series
}

export async function getListingHealth() {
  await requireAdmin()
  const admin = createAdminClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentListings } = await admin.from('listings').select('created_at, category').gte('created_at', ninetyDaysAgo)
  const { data: allActive } = await admin.from('listings').select('category').eq('status', 'active')

  const listingsByDate: Record<string, number> = {}
  for (const l of recentListings ?? []) { const d = l.created_at.slice(0, 10); listingsByDate[d] = (listingsByDate[d] || 0) + 1 }

  const activeCategoryCount: Record<string, number> = {}
  for (const l of allActive ?? []) activeCategoryCount[l.category] = (activeCategoryCount[l.category] || 0) + 1

  const categoryDistribution = Object.entries(activeCategoryCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const listingSeries = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    listingSeries.push({ date: key, count: listingsByDate[key] || 0 })
  }

  return { listingSeries, categoryDistribution }
}

export async function getSOSPerformance() {
  await requireAdmin()
  const admin = createAdminClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentSOS } = await admin.from('sos_requests').select('id, status, equipment_subcategory, created_at').gte('created_at', ninetyDaysAgo)

  const sosByDate: Record<string, number> = {}
  const subcategoryCount: Record<string, number> = {}
  let fulfilledCount = 0

  for (const s of recentSOS ?? []) {
    const d = s.created_at.slice(0, 10)
    sosByDate[d] = (sosByDate[d] || 0) + 1
    const sub = s.equipment_subcategory?.replace(/_/g, ' ') || 'Unknown'
    subcategoryCount[sub] = (subcategoryCount[sub] || 0) + 1
    if (s.status === 'fulfilled') fulfilledCount++
  }

  const totalSOS = (recentSOS ?? []).length
  const fulfillmentRate = totalSOS > 0 ? Math.round((fulfilledCount / totalSOS) * 100) : 0

  const sosIds = (recentSOS ?? []).map((s) => s.id)
  let noMatchCount = 0
  if (sosIds.length > 0) {
    const { data: responses } = await admin.from('sos_responses').select('sos_request_id').in('sos_request_id', sosIds)
    const respondedIds = new Set((responses ?? []).map((r) => r.sos_request_id))
    noMatchCount = sosIds.filter((id) => !respondedIds.has(id)).length
  }

  const noMatchRate = totalSOS > 0 ? Math.round((noMatchCount / totalSOS) * 100) : 0
  const topRequested = Object.entries(subcategoryCount).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, count]) => ({ name, count }))

  const sosSeries = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    sosSeries.push({ date: key, count: sosByDate[key] || 0 })
  }

  return { sosSeries, topRequested, fulfillmentRate, noMatchRate, totalSOS }
}

export async function getSearchAnalytics() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: savedSearches } = await admin.from('saved_searches').select('filters').order('created_at', { ascending: false }).limit(500)

  const termCount: Record<string, number> = {}
  for (const s of savedSearches ?? []) {
    const filters = s.filters as Record<string, string> | null
    if (filters?.q) termCount[filters.q] = (termCount[filters.q] || 0) + 1
  }

  return {
    topSearchTerms: Object.entries(termCount).sort(([, a], [, b]) => b - a).slice(0, 20).map(([term, count]) => ({ term, count })),
  }
}

export async function getGeographicData() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: users } = await admin.from('profiles').select('location_city, location_state, location_lat, location_lng').not('location_lat', 'is', null).not('location_lng', 'is', null)

  const cityCount: Record<string, { count: number; lat: number; lng: number }> = {}
  for (const u of users ?? []) {
    const key = `${u.location_city}, ${u.location_state}`
    if (!cityCount[key]) cityCount[key] = { count: 0, lat: u.location_lat!, lng: u.location_lng! }
    cityCount[key].count++
  }

  return {
    topCities: Object.entries(cityCount).sort(([, a], [, b]) => b.count - a.count).slice(0, 10).map(([city, data]) => ({ city, ...data })),
    mapPoints: (users ?? []).filter((u) => u.location_lat && u.location_lng).map((u) => ({ lat: u.location_lat!, lng: u.location_lng! })),
  }
}

export async function getAIAssistMetrics() {
  await requireAdmin()
  const admin = createAdminClient()

  const [{ count: totalListings }, { count: aiAssisted }, { count: fraudFlagged }, { count: fraudCleared }] = await Promise.all([
    admin.from('listings').select('id', { count: 'exact', head: true }),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('ai_analyzed', true),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('ai_fraud_flagged', true),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('ai_fraud_flagged', false).not('admin_reviewed_by', 'is', null),
  ])

  return {
    totalListings: totalListings ?? 0,
    aiAssisted: aiAssisted ?? 0,
    aiAssistRate: (totalListings ?? 0) > 0 ? Math.round(((aiAssisted ?? 0) / (totalListings ?? 1)) * 100) : 0,
    fraudFlagged: fraudFlagged ?? 0,
    fraudCleared: fraudCleared ?? 0,
  }
}

export async function getListingQualityMetrics() {
  await requireAdmin()
  const admin = createAdminClient()

  // Get all active listings with quality scores
  const { data: scored } = await admin
    .from('listings')
    .select('listing_quality_score, ai_analyzed')
    .eq('status', 'active')
    .not('listing_quality_score', 'is', null)

  const { count: totalActive } = await admin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const scores = (scored ?? []).map((l) => l.listing_quality_score as number)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  // Grade distribution
  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  for (const s of scores) {
    if (s >= 80) gradeDistribution.A++
    else if (s >= 65) gradeDistribution.B++
    else if (s >= 50) gradeDistribution.C++
    else if (s >= 35) gradeDistribution.D++
    else gradeDistribution.F++
  }

  // AI-assisted vs manual average (ai_analyzed = true means AI was used)
  const aiScores = (scored ?? []).filter((l) => l.ai_analyzed).map((l) => l.listing_quality_score as number)
  const manualScores = (scored ?? []).filter((l) => !l.ai_analyzed).map((l) => l.listing_quality_score as number)

  const avgAI = aiScores.length > 0 ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length) : 0
  const avgManual = manualScores.length > 0 ? Math.round(manualScores.reduce((a, b) => a + b, 0) / manualScores.length) : 0

  return {
    totalActive: totalActive ?? 0,
    scoredCount: scores.length,
    avgScore,
    gradeDistribution,
    avgAI,
    avgManual,
    aiScoredCount: aiScores.length,
    manualScoredCount: manualScores.length,
  }
}

// ─── Seller Analytics (existing) ────────────────────────────────────

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

// ─── Pricing Intelligence Metrics ───────────────────────────────────

export async function getPricingIntelligenceMetrics() {
  await requireAdmin()
  const admin = createAdminClient()

  // Get all listings with AI pricing data
  const { data: aiPricedListings } = await admin
    .from('listings')
    .select('id, price_cents, ai_price_suggested, ai_price_accepted, status, created_at, updated_at')
    .not('ai_price_suggested', 'is', null)

  // Get all listings without AI pricing for comparison
  const { data: manualListings } = await admin
    .from('listings')
    .select('id, price_cents, status, created_at, updated_at')
    .is('ai_price_suggested', null)
    .not('price_cents', 'is', null)

  // Get coaching log count
  const { count: coachingCount } = await admin
    .from('offer_coaching_log')
    .select('id', { count: 'exact', head: true })

  // Get accepted offers on AI-priced vs manually-priced listings
  const { data: allOffers } = await admin
    .from('offers')
    .select('listing_id, status')
    .in('status', ['accepted', 'rejected', 'pending', 'countered'])

  const aiPricedIds = new Set((aiPricedListings || []).map((l) => l.id))
  const aiOffers = (allOffers || []).filter((o) => aiPricedIds.has(o.listing_id))
  const manualOffers = (allOffers || []).filter((o) => !aiPricedIds.has(o.listing_id))

  const aiAcceptRate = aiOffers.length > 0
    ? Math.round((aiOffers.filter((o) => o.status === 'accepted').length / aiOffers.length) * 100)
    : 0
  const manualAcceptRate = manualOffers.length > 0
    ? Math.round((manualOffers.filter((o) => o.status === 'accepted').length / manualOffers.length) * 100)
    : 0

  // Price accuracy: final price vs suggested price
  const accepted = (aiPricedListings || []).filter((l) => l.ai_price_accepted && l.price_cents && l.ai_price_suggested)
  let avgAccuracy = 0
  if (accepted.length > 0) {
    const accuracies = accepted.map((l) => {
      const finalPrice = (l.price_cents || 0) / 100
      const suggestedPrice = Number(l.ai_price_suggested) || 0
      return suggestedPrice > 0 ? Math.round((finalPrice / suggestedPrice) * 100) : 100
    })
    avgAccuracy = Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
  }

  // Days on market comparison
  function avgDOM(listings: Array<{ status: string; created_at: string; updated_at: string }> | null) {
    const sold = (listings || []).filter((l) => l.status === 'sold')
    if (sold.length === 0) return null
    const totalDays = sold.reduce((sum, l) => {
      const days = Math.floor((new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24))
      return sum + days
    }, 0)
    return Math.round(totalDays / sold.length)
  }

  return {
    totalAIPriced: (aiPricedListings || []).length,
    totalAccepted: accepted.length,
    avgAccuracy,
    aiAvgDOM: avgDOM(aiPricedListings),
    manualAvgDOM: avgDOM(manualListings),
    aiOfferAcceptRate: aiAcceptRate,
    manualOfferAcceptRate: manualAcceptRate,
    coachingSessions: coachingCount || 0,
  }
}
