import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStorefront, getSellerStats } from '@/app/actions/storefront'
import { getSellerReviews } from '@/app/actions/reputation'
import { getCoverPhotosForSeller } from '@/lib/profile/cover-photos'
import { getSellerTrustMetrics } from '@/lib/profile/trust-metrics'
import { getActivityFeed } from '@/lib/profile/activity'
import { isFollowing } from '@/app/actions/follow-seller'
import type {
  ActivityEntry,
  TrustMetrics,
} from '@/components/profile-shared/types'
import type { ListingsGridModuleListing } from '@/components/profile-shared/ListingsGridModule'

export interface SellerPageReview {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: {
    full_name: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

export interface SellerPageData {
  profile: {
    id: string
    full_name: string | null
    display_name: string | null
    company_name: string | null
    bio: string | null
    avatar_url: string | null
    industry: string | null
    location_city: string | null
    location_state: string | null
    is_verified_dealer: boolean | null
    created_at: string
  }
  storefront: {
    banner_url: string | null
    tagline: string | null
    featured_listing_ids: string[]
  } | null
  industries: string[]
  coverPhotos: string[]
  trustMetrics: TrustMetrics
  listings: ListingsGridModuleListing[]
  featuredListings: ListingsGridModuleListing[]
  moreListings: ListingsGridModuleListing[]
  totalListingsCount: number
  reviewsRecent: SellerPageReview[]
  reviewsTotal: number
  reviewsAverage: number
  ratingDistribution: Record<number, number>
  activity: ActivityEntry[]
  legacyStats: Awaited<ReturnType<typeof getSellerStats>>
  viewerIsOwner: boolean
  viewerIsFollowing: boolean
}

export async function getSellerPageData(
  sellerId: string,
  viewerId: string | null,
): Promise<SellerPageData | null> {
  const admin = createAdminClient()

  // 1: profile + storefront + listings + reviews + bizProfile + activity + cover photos +
  //    trust metrics + viewer follow state in a single batched call.
  const [
    profileRes,
    storefrontRes,
    listingsRes,
    reviewsData,
    bizProfileRes,
    coverPhotos,
    trustMetrics,
    activity,
    legacyStats,
    isViewerFollowing,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, full_name, display_name, company_name, bio, avatar_url, industry, location_city, location_state, is_verified_dealer, created_at',
      )
      .eq('id', sellerId)
      .maybeSingle(),
    getStorefront(sellerId),
    admin
      .from('listings')
      .select(
        'id, title, category, condition, price_cents, contact_for_price, views_count, favorites_count, is_featured, created_at, listing_images(url, position)',
      )
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .eq('has_media', true)
      .order('created_at', { ascending: false })
      .limit(20),
    getSellerReviews(sellerId),
    admin
      .from('user_business_profiles')
      .select('industries')
      .eq('user_id', sellerId)
      .maybeSingle(),
    getCoverPhotosForSeller({ profileId: sellerId }),
    getSellerTrustMetrics({ profileId: sellerId }),
    getActivityFeed({ profileId: sellerId, limit: 5 }),
    getSellerStats(sellerId),
    viewerId && viewerId !== sellerId
      ? isFollowing({ sellerProfileId: sellerId })
      : Promise.resolve(false),
  ])

  if (!profileRes.data) return null
  const profile = profileRes.data

  const industries: string[] = (() => {
    const arr = bizProfileRes.data?.industries
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter(
        (s): s is string => typeof s === 'string' && s.trim().length > 0,
      )
    }
    return profile.industry ? [profile.industry] : []
  })()

  const storefront = storefrontRes.storefront
    ? {
        banner_url: storefrontRes.storefront.banner_url ?? null,
        tagline: storefrontRes.storefront.tagline ?? null,
        featured_listing_ids:
          storefrontRes.storefront.featured_listing_ids ?? [],
      }
    : null

  const listings: ListingsGridModuleListing[] = (listingsRes.data ?? []).map(
    (l) => ({
      id: l.id,
      title: l.title,
      category: l.category,
      condition: l.condition,
      price_cents: l.price_cents,
      contact_for_price: l.contact_for_price,
      views_count: l.views_count,
      favorites_count: l.favorites_count,
      is_featured: l.is_featured,
      listing_images: l.listing_images ?? [],
    }),
  )

  const featuredIds = new Set(storefront?.featured_listing_ids ?? [])
  const featuredListings = listings.filter((l) => featuredIds.has(l.id))
  const moreListings = listings.filter((l) => !featuredIds.has(l.id))

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of reviewsData.reviews) distribution[r.rating]++

  const reviewsRecent: SellerPageReview[] = reviewsData.reviews
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: r.reviewer
        ? {
            full_name: r.reviewer.full_name ?? null,
            display_name: r.reviewer.display_name ?? null,
            avatar_url: r.reviewer.avatar_url ?? null,
          }
        : null,
    }))

  return {
    profile,
    storefront,
    industries,
    coverPhotos,
    trustMetrics,
    listings,
    featuredListings,
    moreListings,
    totalListingsCount: listings.length,
    reviewsRecent,
    reviewsTotal: reviewsData.totalReviews,
    reviewsAverage: reviewsData.averageRating,
    ratingDistribution: distribution,
    activity,
    legacyStats,
    viewerIsOwner: viewerId === sellerId,
    viewerIsFollowing: isViewerFollowing,
  }
}
