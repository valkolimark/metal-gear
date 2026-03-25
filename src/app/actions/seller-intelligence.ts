'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface SellerPerformanceData {
  // Always available (free)
  listingCount: number
  avgQualityScore: number | null
  qualityGrade: string
  totalViews30d: number

  // Pro+ only (still computed server-side; gating is in the UI)
  platformAvgQualityScore: number
  platformAvgViews30d: number
  offerAcceptanceRate: number | null
  platformAvgAcceptanceRate: number
  topListing: { id: string; title: string; views: number } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  demandInsights: any

  // Derived
  qualityImprovementGeneric: string | null
  qualityImprovementSpecific: string | null
}

export async function getSellerPerformance(
  userId: string,
  companyId: string | null
): Promise<SellerPerformanceData> {
  const supabase = createAdminClient()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Seller's active listings
  const listingQuery = supabase
    .from('listings')
    .select('id, title, listing_quality_score, status')
    .eq('status', 'active')

  if (companyId) {
    listingQuery.eq('company_id', companyId)
  } else {
    listingQuery.eq('seller_id', userId)
  }

  const { data: listings } = await listingQuery
  const listingIds = (listings ?? []).map(l => l.id)
  const listingCount = listingIds.length

  // Quality scores
  const qualityScores = (listings ?? [])
    .map(l => l.listing_quality_score)
    .filter((s): s is number => s !== null)
  const avgQualityScore = qualityScores.length
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : null

  // Platform avg quality score
  const { data: platformQuality } = await supabase
    .from('listings')
    .select('listing_quality_score')
    .eq('status', 'active')
    .not('listing_quality_score', 'is', null)
  const platformQualityScores = (platformQuality ?? []).map(l => l.listing_quality_score as number)
  const platformAvgQualityScore = platformQualityScores.length
    ? Math.round(platformQualityScores.reduce((a, b) => a + b, 0) / platformQualityScores.length)
    : 65

  // Views in last 30 days
  let totalViews30d = 0
  let topListing: SellerPerformanceData['topListing'] = null

  if (listingIds.length > 0) {
    const { data: views } = await supabase
      .from('listing_views')
      .select('listing_id')
      .in('listing_id', listingIds)
      .gte('viewed_at', thirtyDaysAgo.toISOString())

    totalViews30d = views?.length ?? 0

    // Top performing listing
    const viewCounts: Record<string, number> = {}
    views?.forEach(v => {
      viewCounts[v.listing_id] = (viewCounts[v.listing_id] ?? 0) + 1
    })
    const topId = Object.entries(viewCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
    if (topId) {
      const topListingData = listings?.find(l => l.id === topId)
      if (topListingData) {
        topListing = { id: topId, title: topListingData.title, views: viewCounts[topId] }
      }
    }
  }

  // Platform avg views per seller
  const { count: totalPlatformViews } = await supabase
    .from('listing_views')
    .select('id', { count: 'exact', head: true })
    .gte('viewed_at', thirtyDaysAgo.toISOString())
  const { count: sellerCount } = await supabase
    .from('listings')
    .select('seller_id', { count: 'exact', head: true })
    .eq('status', 'active')
  const platformAvgViews30d = sellerCount
    ? Math.floor((totalPlatformViews ?? 0) / sellerCount)
    : 0

  // Offer acceptance rate
  let offerAcceptanceRate: number | null = null
  if (listingIds.length > 0) {
    const { data: offers } = await supabase
      .from('offers')
      .select('status')
      .in('listing_id', listingIds)
      .in('status', ['accepted', 'rejected', 'expired'])
    if (offers?.length) {
      const accepted = offers.filter(o => o.status === 'accepted').length
      offerAcceptanceRate = Math.round((accepted / offers.length) * 100)
    }
  }

  // Platform avg offer acceptance
  const { data: allOffers } = await supabase
    .from('offers')
    .select('status')
    .in('status', ['accepted', 'rejected', 'expired'])
    .limit(500)
  const platformAccepted = allOffers?.filter(o => o.status === 'accepted').length ?? 0
  const platformAvgAcceptanceRate = allOffers?.length
    ? Math.round((platformAccepted / allOffers.length) * 100)
    : 0

  // Demand insights (already Pro+ gated via cron — only generated for paid sellers)
  const { data: demandInsights } = await supabase
    .from('seller_demand_insights')
    .select('insights, valid_until')
    .eq('seller_id', userId)
    .gte('valid_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Quality grade
  const qualityGrade = avgQualityScore === null ? '—'
    : avgQualityScore >= 90 ? 'A'
    : avgQualityScore >= 80 ? 'B'
    : avgQualityScore >= 70 ? 'C'
    : avgQualityScore >= 60 ? 'D' : 'F'

  // Generic tip — shown to free tier (directional, not specific)
  const qualityImprovementGeneric = (avgQualityScore !== null && avgQualityScore < 75)
    ? 'Your listing quality score has room to improve. Better photos and more detailed descriptions attract more buyers.'
    : null

  // Specific tip — shown to Pro+ (concrete, benchmark-relative)
  const qualityImprovementSpecific = (
    avgQualityScore !== null && avgQualityScore < platformAvgQualityScore
  )
    ? `Your listings score ${platformAvgQualityScore - avgQualityScore} points below the platform average of ${platformAvgQualityScore}. Adding more photos and filling in all spec fields would close that gap.`
    : null

  return {
    listingCount,
    avgQualityScore,
    qualityGrade,
    totalViews30d,
    platformAvgQualityScore,
    platformAvgViews30d,
    offerAcceptanceRate,
    platformAvgAcceptanceRate,
    topListing,
    demandInsights: demandInsights?.insights ?? null,
    qualityImprovementGeneric,
    qualityImprovementSpecific,
  }
}
