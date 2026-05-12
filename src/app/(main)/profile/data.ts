import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getStorefront } from '@/app/actions/storefront'
import { getCoverPhotosForSeller } from '@/lib/profile/cover-photos'
import { getSellerTrustMetrics } from '@/lib/profile/trust-metrics'
import { getActivityFeed } from '@/lib/profile/activity'
import type {
  ActivityEntry,
  TrustMetrics,
} from '@/components/profile-shared/types'
import type { ListingsGridModuleListing } from '@/components/profile-shared/ListingsGridModule'

export interface ProfilePageReviewRow {
  id: string
  rating: number
  comment: string | null
  created_at: string | null
}

export interface ProfilePageData {
  userId: string
  profile: {
    full_name: string | null
    display_name: string | null
    avatar_url: string | null
    created_at: string
    location_city: string | null
    location_state: string | null
    industry: string | null
    company_name: string | null
    is_verified_dealer: boolean | null
  }
  industries: string[]
  storefront: { banner_url: string | null; tagline: string | null } | null
  coverPhotos: string[]
  trustMetrics: TrustMetrics
  listings: ListingsGridModuleListing[]
  totalListingsCount: number
  reviews: ProfilePageReviewRow[]
  reviewsTotal: number
  reviewsAverage: number
  ratingDistribution: Record<number, number>
  sosResponsesCount: number
  activity: ActivityEntry[]
}

export async function getViewerProfilePageData(): Promise<ProfilePageData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const [
    profileRes,
    bizProfileRes,
    storefrontRes,
    listingsRes,
    listingsCountRes,
    reviewsRes,
    sosCountRes,
    coverPhotos,
    trustMetrics,
    activity,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'full_name, display_name, avatar_url, created_at, location_city, location_state, industry, company_name, is_verified_dealer',
      )
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('user_business_profiles')
      .select('industries')
      .eq('user_id', user.id)
      .maybeSingle(),
    getStorefront(user.id),
    admin
      .from('listings')
      .select(
        'id, title, category, condition, price_cents, contact_for_price, views_count, favorites_count, is_featured, listing_images(url, position)',
      )
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12),
    admin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'active'),
    admin
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('sos_responses')
      .select('id', { count: 'exact', head: true })
      .eq('responder_id', user.id),
    getCoverPhotosForSeller({ profileId: user.id }),
    getSellerTrustMetrics({ profileId: user.id }),
    getActivityFeed({ profileId: user.id, limit: 6 }),
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

  const reviewRows: ProfilePageReviewRow[] = (reviewsRes.data ?? []).map(
    (r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? null,
      created_at: r.created_at ?? null,
    }),
  )

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of reviewRows) distribution[r.rating]++
  const reviewsAverage =
    reviewRows.length > 0
      ? Number(
          (
            reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length
          ).toFixed(1),
        )
      : 0

  return {
    userId: user.id,
    profile: {
      full_name: profile.full_name ?? null,
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      created_at: profile.created_at ?? new Date().toISOString(),
      location_city: profile.location_city ?? null,
      location_state: profile.location_state ?? null,
      industry: profile.industry ?? null,
      company_name: profile.company_name ?? null,
      is_verified_dealer: profile.is_verified_dealer ?? null,
    },
    industries,
    storefront,
    coverPhotos,
    trustMetrics,
    listings,
    totalListingsCount: listingsCountRes.count ?? 0,
    reviews: reviewRows,
    reviewsTotal: reviewRows.length,
    reviewsAverage,
    ratingDistribution: distribution,
    sosResponsesCount: sosCountRes.count ?? 0,
    activity,
  }
}
