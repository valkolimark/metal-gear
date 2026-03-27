'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type TeamMemberActivity = {
  userId: string
  displayName: string
  avatarUrl: string | null
  role: string
  lastActiveAt: string | null
  recentlyViewed: {
    listingId: string
    listingTitle: string
    listingImageUrl: string | null
    viewedAt: string
  }[]
}

export type SnipeListing = {
  id: string
  title: string
  price: number | null
  contactForPrice: boolean
  condition: string
  city: string | null
  state: string | null
  createdAt: string
  imageUrl: string | null
  companyName: string | null
  companySlug: string | null
}

export async function getTeamActivity(
  companyId: string
): Promise<TeamMemberActivity[]> {
  const supabase = createAdminClient()

  const { data: members, error } = await supabase
    .from('company_memberships')
    .select(`
      user_id,
      role,
      profiles (
        id,
        display_name,
        avatar_url,
        last_login_at
      )
    `)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })

  if (error || !members) return []

  const memberIds = members.map((m) => m.user_id)

  // Batch-fetch last 3 views per member
  const { data: views } = await supabase
    .from('listing_views')
    .select(`
      viewer_id,
      listing_id,
      viewed_at,
      listings (
        id,
        title,
        listing_images (url, position)
      )
    `)
    .in('viewer_id', memberIds)
    .order('viewed_at', { ascending: false })
    .limit(memberIds.length * 5) // fetch extra to ensure 3 per member after dedup

  // Group views by member, max 3 each
  const viewsByMember: Record<string, NonNullable<typeof views>> = {}
  views?.forEach((v) => {
    const vid = v.viewer_id
    if (!vid) return
    if (!viewsByMember[vid]) viewsByMember[vid] = []
    if (viewsByMember[vid].length < 3) {
      viewsByMember[vid].push(v)
    }
  })

  return members.map((m) => {
    const profile = m.profiles as unknown as {
      id: string
      display_name: string | null
      avatar_url: string | null
      last_login_at: string | null
    } | null
    const memberViews = viewsByMember[m.user_id] ?? []
    return {
      userId: m.user_id,
      displayName: profile?.display_name ?? 'Team Member',
      avatarUrl: profile?.avatar_url ?? null,
      role: m.role,
      lastActiveAt: profile?.last_login_at ?? null,
      recentlyViewed: memberViews.map((v) => {
        const listing = v.listings as unknown as {
          id: string
          title: string
          listing_images: { url: string; position: number }[]
        } | null
        const images = listing?.listing_images ?? []
        const sorted = [...images].sort((a, b) => a.position - b.position)
        return {
          listingId: v.listing_id,
          listingTitle: listing?.title ?? 'Untitled',
          listingImageUrl: sorted[0]?.url ?? null,
          viewedAt: v.viewed_at,
        }
      }),
    }
  })
}

export async function getSnipeListings(
  userId: string,
  limit = 8
): Promise<SnipeListing[]> {
  const supabase = createAdminClient()

  // Get user's equipment interests
  const { data: interests } = await supabase
    .from('user_equipment_interests')
    .select('tier2')
    .eq('user_id', userId)

  if (!interests?.length) return []

  const tier2Values = interests.map((i) => i.tier2).filter(Boolean)
  if (tier2Values.length === 0) return []

  // Listings created in last 72 hours matching interests
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  const { data: listings } = await supabase
    .from('listings')
    .select(`
      id,
      title,
      price_cents,
      contact_for_price,
      condition,
      location_city,
      location_state,
      created_at,
      listing_images (url, position),
      company_profiles (name, slug)
    `)
    .eq('status', 'active')
    .in('category', tier2Values)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (
    listings?.map((l) => {
      const images = (l.listing_images as unknown as { url: string; position: number }[]) ?? []
      const sorted = [...images].sort((a, b) => a.position - b.position)
      const company = l.company_profiles as unknown as {
        name: string
        slug: string
      } | null
      return {
        id: l.id,
        title: l.title,
        price: l.price_cents,
        contactForPrice: l.contact_for_price,
        condition: l.condition,
        city: l.location_city,
        state: l.location_state,
        createdAt: l.created_at,
        imageUrl: sorted[0]?.url ?? null,
        companyName: company?.name ?? null,
        companySlug: company?.slug ?? null,
      }
    }) ?? []
  )
}

export async function hasEquipmentInterests(userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('user_equipment_interests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return (count ?? 0) > 0
}
