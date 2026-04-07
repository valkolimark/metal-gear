'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type RadarItemType = 'listing' | 'feed_post' | 'video'

export interface RadarVideoData {
  videoRefId: string
  videoSourceType: 'listing_video' | 'feed_post_video'
  videoThumbnailUrl: string
  videoTitle: string
  videoListingId?: string
  videoPostId?: string
}

/**
 * Get or create the user's default radar list.
 */
async function getOrCreateDefaultRadar(userId: string): Promise<string> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('collections')
    .insert({ user_id: userId, name: 'Saved', is_public: false, is_default: true })
    .select('id')
    .single()

  if (error || !created) throw new Error('Failed to create default radar list')
  return created.id
}

/**
 * Toggle a listing in/out of the user's default radar.
 */
export async function toggleRadarListing(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const collectionId = await getOrCreateDefaultRadar(user.id)

  const { data: existing } = await admin
    .from('collection_items')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('listing_id', listingId)
    .eq('item_type', 'listing')
    .maybeSingle()

  if (existing) {
    await admin.from('collection_items').delete().eq('id', existing.id)
    revalidatePath('/radar')
    return { saved: false }
  }

  await admin.from('collection_items').insert({
    collection_id: collectionId,
    listing_id: listingId,
    item_type: 'listing',
  })
  revalidatePath('/radar')
  return { saved: true }
}

/**
 * Toggle a feed post in/out of the user's default radar.
 */
export async function toggleRadarPost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const collectionId = await getOrCreateDefaultRadar(user.id)

  const { data: existing } = await admin
    .from('collection_items')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('feed_post_id', postId)
    .eq('item_type', 'feed_post')
    .maybeSingle()

  if (existing) {
    await admin.from('collection_items').delete().eq('id', existing.id)
    revalidatePath('/radar')
    return { saved: false }
  }

  await admin.from('collection_items').insert({
    collection_id: collectionId,
    feed_post_id: postId,
    item_type: 'feed_post',
  })
  revalidatePath('/radar')
  return { saved: true }
}

/**
 * Toggle a video in/out of the user's default radar.
 */
export async function toggleRadarVideo(videoData: RadarVideoData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const collectionId = await getOrCreateDefaultRadar(user.id)

  const { data: existing } = await admin
    .from('collection_items')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('video_ref_id', videoData.videoRefId)
    .eq('item_type', 'video')
    .maybeSingle()

  if (existing) {
    await admin.from('collection_items').delete().eq('id', existing.id)
    revalidatePath('/radar')
    return { saved: false }
  }

  await admin.from('collection_items').insert({
    collection_id: collectionId,
    item_type: 'video',
    video_ref_id: videoData.videoRefId,
    video_source_type: videoData.videoSourceType,
    video_thumbnail_url: videoData.videoThumbnailUrl,
    video_title: videoData.videoTitle,
    video_listing_id: videoData.videoListingId ?? null,
    video_post_id: videoData.videoPostId ?? null,
  })
  revalidatePath('/radar')
  return { saved: true }
}

/**
 * Check saved state for multiple listings at once.
 */
export async function getRadarListingIds(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('collection_items')
    .select('listing_id, collections!inner(user_id)')
    .eq('collections.user_id', userId)
    .eq('item_type', 'listing')
    .not('listing_id', 'is', null)

  return (data ?? []).map((r) => r.listing_id as string)
}

/**
 * Check saved state for multiple posts at once.
 */
export async function getRadarPostIds(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('collection_items')
    .select('feed_post_id, collections!inner(user_id)')
    .eq('collections.user_id', userId)
    .eq('item_type', 'feed_post')
    .not('feed_post_id', 'is', null)

  return (data ?? []).map((r) => r.feed_post_id as string)
}

/**
 * Check if a specific listing is in the user's radar.
 */
export async function isListingInRadar(userId: string, listingId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('collection_items')
    .select('id, collections!inner(user_id)')
    .eq('collections.user_id', userId)
    .eq('listing_id', listingId)
    .eq('item_type', 'listing')
    .maybeSingle()
  return !!data
}

/**
 * Get all saved listings for the Radar Equipment tab.
 */
export async function getRadarEquipment(userId: string, limit = 50, offset = 0) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('collection_items')
    .select(`
      id,
      created_at:added_at,
      listing_id,
      listings!collection_items_listing_id_fkey (
        id, title, price_cents, condition, location_city, location_state, status,
        has_media, contact_for_price, category,
        listing_images (url, position)
      ),
      collections!inner (user_id)
    `)
    .eq('collections.user_id', userId)
    .eq('item_type', 'listing')
    .not('listing_id', 'is', null)
    .order('added_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return data ?? []
}

/**
 * Get all saved feed posts for the Radar Posts tab.
 * Uses a two-step query to avoid FK join issues.
 */
export async function getRadarPosts(userId: string, limit = 50, offset = 0) {
  const admin = createAdminClient()

  // Step 1: Get collection items
  const { data: items } = await admin
    .from('collection_items')
    .select('id, added_at, feed_post_id, collections!inner(user_id)')
    .eq('collections.user_id', userId)
    .eq('item_type', 'feed_post')
    .not('feed_post_id', 'is', null)
    .order('added_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!items || items.length === 0) return []

  const postIds = items.map((i) => i.feed_post_id).filter(Boolean) as string[]

  // Step 2: Fetch feed posts with author + company + media
  const { data: posts } = await admin
    .from('feed_posts')
    .select(`
      id, content, created_at, reactions_count, comments_count,
      is_deleted, hashtags, author_id, company_id,
      feed_post_media (id, url:media_url, media_type, thumbnail_url, sort_order),
      profiles!feed_posts_author_id_fkey (id, display_name, avatar_url, last_login_at),
      company_profiles (id, name, slug, logo_url)
    `)
    .in('id', postIds)

  const postMap = new Map((posts ?? []).map((p) => [p.id, p]))

  // Merge and return in saved-order, excluding soft-deleted
  return items
    .map((item) => {
      const post = postMap.get(item.feed_post_id!)
      if (!post || post.is_deleted) return null
      return {
        id: item.id,
        created_at: item.added_at,
        feed_post_id: item.feed_post_id,
        feed_posts: {
          ...post,
          feed_post_media: (post.feed_post_media ?? []).sort(
            (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
          ),
          author: post.profiles,
          company: post.company_profiles,
        },
      }
    })
    .filter(Boolean)
}

/**
 * Get all saved videos for the Radar Videos tab.
 */
export async function getRadarVideos(userId: string, limit = 50, offset = 0) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('collection_items')
    .select(`
      id,
      created_at:added_at,
      video_ref_id,
      video_source_type,
      video_thumbnail_url,
      video_title,
      video_listing_id,
      video_post_id,
      collections!inner (user_id)
    `)
    .eq('collections.user_id', userId)
    .eq('item_type', 'video')
    .not('video_ref_id', 'is', null)
    .order('added_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return data ?? []
}

/**
 * Get tab counts for the Radar page header.
 */
export async function getRadarCounts(userId: string) {
  const admin = createAdminClient()

  const [equipment, posts, videos] = await Promise.all([
    admin
      .from('collection_items')
      .select('id, collections!inner(user_id)', { count: 'exact', head: true })
      .eq('collections.user_id', userId)
      .eq('item_type', 'listing')
      .not('listing_id', 'is', null),
    admin
      .from('collection_items')
      .select('id, collections!inner(user_id)', { count: 'exact', head: true })
      .eq('collections.user_id', userId)
      .eq('item_type', 'feed_post')
      .not('feed_post_id', 'is', null),
    admin
      .from('collection_items')
      .select('id, collections!inner(user_id)', { count: 'exact', head: true })
      .eq('collections.user_id', userId)
      .eq('item_type', 'video')
      .not('video_ref_id', 'is', null),
  ])

  return {
    equipment: equipment.count ?? 0,
    posts: posts.count ?? 0,
    videos: videos.count ?? 0,
  }
}

/**
 * Get user's named radar lists (non-default) for the Lists tab.
 */
export async function getRadarLists(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('collections')
    .select('id, name, description, is_public, created_at, collection_items(count)')
    .eq('user_id', userId)
    .eq('is_default', false)
    .order('created_at', { ascending: false })

  return data ?? []
}
