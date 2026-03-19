'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { updateTag } from 'next/cache'
import { deleteFeedPostMedia } from '@/lib/media'

// ─── Types ──────────────────────────────────────────────────

export interface FeedPostWithDetails {
  id: string
  content: string
  hashtags: string[]
  tagged_user_ids: string[]
  reactions_count: number
  comments_count: number
  edited_at: string | null
  created_at: string
  author: { id: string; display_name: string; avatar_url: string | null }
  company: { id: string; name: string; slug: string; logo_url: string | null } | null
  media: Array<{
    id: string
    media_url: string
    media_type: 'image' | 'video'
    stream_video_id: string | null
    thumbnail_url: string | null
    sort_order: number
  }>
  viewer_has_reacted: boolean
}

export interface GetFeedPostsOptions {
  filter: 'all' | 'for-you'
  cursor?: string
  limit?: number
}

// ─── Read ───────────────────────────────────────────────────

async function fetchFeedPosts(
  userId: string,
  options: GetFeedPostsOptions
): Promise<{ posts: FeedPostWithDetails[]; nextCursor: string | null }> {
  const limit = options.limit ?? 10
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let postRows: any[] | undefined

  if (options.filter === 'for-you') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcParams: any = {
      p_user_id: userId,
      p_cursor: options.cursor ?? null,
      p_limit: limit + 1,
    }
    const { data, error } = await supabase.rpc('get_for_you_feed', rpcParams)
    if (error) {
      console.warn('For You feed failed, falling back to all:', error.message)
    } else if (data && data.length > 0) {
      postRows = data
    } else {
      // Empty For You result — fall through to all
      console.warn('For You: no viewer interests or no matching posts, falling back to all')
    }
  }

  if (!postRows) {
    const query = supabase
      .from('feed_posts')
      .select(`
        id, content, hashtags, tagged_user_ids, reactions_count, comments_count,
        edited_at, created_at, author_id, company_id
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (options.cursor) {
      query.lt('created_at', options.cursor)
    }

    const { data, error } = await query
    if (error) throw error
    postRows = data ?? []
  }

  const hasMore = postRows.length > limit
  const sliced = hasMore ? postRows.slice(0, limit) : postRows
  const nextCursor = hasMore ? sliced[sliced.length - 1].created_at : null

  if (sliced.length === 0) {
    return { posts: [], nextCursor: null }
  }

  const postIds = sliced.map((p: { id: string }) => p.id)
  const authorIds = [...new Set(sliced.map((p: { author_id: string }) => p.author_id))]
  const companyIds = [...new Set(sliced.map((p: { company_id: string | null }) => p.company_id).filter(Boolean))] as string[]

  // Batch fetch authors, companies, media, reactions in parallel
  const [authorsResult, companiesResult, mediaResult, reactionsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds),
    companyIds.length > 0
      ? supabase
          .from('company_profiles')
          .select('id, name, slug, logo_url')
          .in('id', companyIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('feed_post_media')
      .select('id, post_id, media_url, media_type, stream_video_id, thumbnail_url, sort_order')
      .in('post_id', postIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('feed_post_reactions')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds),
  ])

  const authorMap = new Map((authorsResult.data ?? []).map((a) => [a.id, a]))
  const companyMap = new Map((companiesResult.data ?? []).map((c) => [c.id, c]))
  const reactedPostIds = new Set((reactionsResult.data ?? []).map((r: { post_id: string }) => r.post_id))
  const mediaByPost = new Map<string, typeof mediaResult.data>()
  for (const m of mediaResult.data ?? []) {
    if (!mediaByPost.has(m.post_id)) mediaByPost.set(m.post_id, [])
    mediaByPost.get(m.post_id)!.push(m)
  }

  const posts: FeedPostWithDetails[] = sliced.map((p: {
    id: string; content: string; hashtags: string[]; tagged_user_ids: string[];
    reactions_count: number; comments_count: number; edited_at: string | null;
    created_at: string; author_id: string; company_id: string | null
  }) => {
    const author = authorMap.get(p.author_id) ?? { id: p.author_id, display_name: 'Unknown', avatar_url: null }
    const company = p.company_id ? companyMap.get(p.company_id) ?? null : null
    return {
      id: p.id,
      content: p.content,
      hashtags: p.hashtags,
      tagged_user_ids: p.tagged_user_ids,
      reactions_count: p.reactions_count,
      comments_count: p.comments_count,
      edited_at: p.edited_at,
      created_at: p.created_at,
      author: { id: author.id, display_name: author.display_name ?? 'Unknown', avatar_url: author.avatar_url },
      company: company ? { id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url } : null,
      media: (mediaByPost.get(p.id) ?? []) as FeedPostWithDetails['media'],
      viewer_has_reacted: reactedPostIds.has(p.id),
    }
  })

  return { posts, nextCursor }
}

export const getFeedPosts = unstable_cache(
  fetchFeedPosts,
  ['feed-posts'],
  { revalidate: 30, tags: ['feed-posts'] }
)

// ─── Create ─────────────────────────────────────────────────

export async function createFeedPost(params: {
  authorId: string
  companyId: string | null
  content: string
  hashtags: string[]
  taggedUserIds: string[]
  media: Array<{
    mediaUrl: string
    mediaType: 'image' | 'video'
    streamVideoId?: string
    thumbnailUrl?: string
    sortOrder: number
  }>
}): Promise<{ post: FeedPostWithDetails }> {
  const trimmedContent = params.content.trim()
  if (!trimmedContent && params.media.length === 0) {
    throw new Error('Post cannot be empty')
  }
  if (params.taggedUserIds.length > 10) {
    throw new Error('Maximum 10 mentions per post')
  }

  const normalizedHashtags = params.hashtags.map((t) => t.toLowerCase())
  const supabase = createAdminClient()

  // Insert post
  const { data: post, error: postError } = await supabase
    .from('feed_posts')
    .insert({
      author_id: params.authorId,
      company_id: params.companyId,
      content: trimmedContent,
      hashtags: normalizedHashtags,
      tagged_user_ids: params.taggedUserIds,
    })
    .select('id, content, hashtags, tagged_user_ids, reactions_count, comments_count, edited_at, created_at, author_id, company_id')
    .single()

  if (postError) throw new Error(postError.message)

  // Batch insert media
  if (params.media.length > 0) {
    const { error: mediaError } = await supabase
      .from('feed_post_media')
      .insert(
        params.media.map((m) => ({
          post_id: post.id,
          media_url: m.mediaUrl,
          media_type: m.mediaType,
          stream_video_id: m.streamVideoId ?? null,
          thumbnail_url: m.thumbnailUrl ?? null,
          sort_order: m.sortOrder,
        }))
      )

    if (mediaError) {
      // Clean up: soft-delete the post if media insert fails
      await supabase
        .from('feed_posts')
        .update({ is_deleted: true })
        .eq('id', post.id)
      throw new Error('Failed to attach media to post')
    }
  }

  // Upsert hashtags
  if (normalizedHashtags.length > 0) {
    await supabase.rpc('upsert_feed_hashtags', { tags: normalizedHashtags })
  }

  updateTag('feed-posts')

  // Fetch the full post with details for client-side prepend
  const { data: mediaRows } = await supabase
    .from('feed_post_media')
    .select('id, post_id, media_url, media_type, stream_video_id, thumbnail_url, sort_order')
    .eq('post_id', post.id)
    .order('sort_order', { ascending: true })

  const { data: author } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', params.authorId)
    .single()

  let company = null
  if (params.companyId) {
    const { data: co } = await supabase
      .from('company_profiles')
      .select('id, name, slug, logo_url')
      .eq('id', params.companyId)
      .single()
    company = co
  }

  return {
    post: {
      id: post.id,
      content: post.content ?? '',
      hashtags: post.hashtags,
      tagged_user_ids: post.tagged_user_ids,
      reactions_count: 0,
      comments_count: 0,
      edited_at: post.edited_at,
      created_at: post.created_at,
      author: {
        id: author?.id ?? params.authorId,
        display_name: author?.display_name ?? 'Unknown',
        avatar_url: author?.avatar_url ?? null,
      },
      company: company ? { id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url } : null,
      media: (mediaRows ?? []) as FeedPostWithDetails['media'],
      viewer_has_reacted: false,
    },
  }
}

// ─── Edit ───────────────────────────────────────────────────

export async function editFeedPost(params: {
  postId: string
  authorId: string
  content: string
  hashtags: string[]
  taggedUserIds: string[]
}): Promise<void> {
  if (params.taggedUserIds.length > 10) {
    throw new Error('Maximum 10 mentions per post')
  }

  const supabase = createAdminClient()

  // Fetch created_at for edit window check
  const { data: existing, error: fetchError } = await supabase
    .from('feed_posts')
    .select('created_at, author_id')
    .eq('id', params.postId)
    .single()

  if (fetchError || !existing) throw new Error('Post not found')
  if (existing.author_id !== params.authorId) throw new Error('Unauthorized')

  const createdAt = new Date(existing.created_at).getTime()
  if (Date.now() - createdAt > 15 * 60 * 1000) {
    throw new Error('Edit window expired')
  }

  const normalizedHashtags = params.hashtags.map((t) => t.toLowerCase())

  const { error } = await supabase
    .from('feed_posts')
    .update({
      content: params.content.trim(),
      hashtags: normalizedHashtags,
      tagged_user_ids: params.taggedUserIds,
      edited_at: new Date().toISOString(),
    })
    .eq('id', params.postId)
    .eq('author_id', params.authorId)

  if (error) throw new Error(error.message)

  updateTag('feed-posts')
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteFeedPost(postId: string, authorId: string): Promise<void> {
  const supabase = createAdminClient()

  // Fetch media + hashtags for cleanup
  const [{ data: media }, { data: postData }] = await Promise.all([
    supabase
      .from('feed_post_media')
      .select('media_url, stream_video_id')
      .eq('post_id', postId),
    supabase
      .from('feed_posts')
      .select('hashtags, author_id')
      .eq('id', postId)
      .single(),
  ])

  if (!postData) throw new Error('Post not found')
  if (postData.author_id !== authorId) throw new Error('Unauthorized')

  // Soft-delete
  const { error } = await supabase
    .from('feed_posts')
    .update({ is_deleted: true })
    .eq('id', postId)
    .eq('author_id', authorId)

  if (error) throw new Error(error.message)

  // Fire-and-forget media cleanup
  if (media && media.length > 0) {
    Promise.allSettled(
      media.map((m) => deleteFeedPostMedia(m.media_url, m.stream_video_id ?? undefined))
    ).catch(() => {})
  }

  // Decrement hashtag counts
  if (postData.hashtags && postData.hashtags.length > 0) {
    await supabase.rpc('decrement_feed_hashtags', { tags: postData.hashtags })
  }

  updateTag('feed-posts')
}

// ─── Reactions ──────────────────────────────────────────────

export async function toggleFeedPostReaction(
  postId: string,
  userId: string
): Promise<{ reacted: boolean; newCount: number }> {
  const supabase = createAdminClient()

  // Try insert
  const { error: insertError } = await supabase
    .from('feed_post_reactions')
    .insert({ post_id: postId, user_id: userId })

  if (insertError && insertError.code === '23505') {
    // Already reacted — remove
    await supabase
      .from('feed_post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)

    const { data } = await supabase.rpc('decrement_post_reactions', { p_post_id: postId })
    return { reacted: false, newCount: data ?? 0 }
  }

  if (insertError) throw new Error(insertError.message)

  const { data } = await supabase.rpc('increment_post_reactions', { p_post_id: postId })
  return { reacted: true, newCount: data ?? 0 }
}

// ─── Report ─────────────────────────────────────────────────

export async function reportFeedPost(
  postId: string,
  reporterId: string,
  reason: string
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('reports')
    .insert({
      target_type: 'feed_post',
      target_id: postId,
      reporter_id: reporterId,
      reason,
      status: 'pending',
    })

  if (error) throw new Error(error.message)
}
