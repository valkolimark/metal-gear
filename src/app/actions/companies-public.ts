'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getPublicCompanyBySlug(slug: string) {
  const supabase = createAdminClient()

  const { data: company, error } = await supabase
    .from('company_profiles')
    .select(
      `id, name, slug, logo_url, banner_url, industry, company_size,
       website, city, state, created_at,
       company_memberships(
         user_id,
         role,
         profiles(full_name, avatar_url)
       )`
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error || !company) return null
  return company
}

export async function getCompanyActiveListings(companyId: string) {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('listings')
    .select(
      `id, title, price_cents, contact_for_price, condition, category,
       location_city, location_state, created_at,
       listing_quality_score, is_featured, views_count, favorites_count, negotiable,
       listing_images(url, position)`
    )
    .eq('company_id', companyId)
    .eq('status', 'active')
    .eq('has_media', true)
    .order('created_at', { ascending: false })
    .limit(12)

  return data ?? []
}

export async function getCompanyReputationStats(companyId: string) {
  const supabase = createAdminClient()

  // Get all member user IDs for this company
  const { data: members } = await supabase
    .from('company_memberships')
    .select('user_id')
    .eq('company_id', companyId)

  if (!members?.length) return null
  const memberIds = members.map((m) => m.user_id)

  // Get reviews for all company members as sellers
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, created_at, comment, profiles!reviews_reviewer_id_fkey(full_name)')
    .in('seller_id', memberIds)
    .order('created_at', { ascending: false })

  if (!reviews?.length) return null

  const totalReviews = reviews.length
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.forEach((r) => {
    distribution[r.rating]++
  })

  return {
    totalReviews,
    avgRating,
    distribution,
    recentReviews: reviews.slice(0, 5),
  }
}

export async function getCompanyListingCount(companyId: string) {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active')
    .eq('has_media', true)
  return count ?? 0
}
