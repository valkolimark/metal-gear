'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { updateTag } from 'next/cache'
import { deleteFeedPostMedia } from '@/lib/media'
import { createNotification } from '@/app/actions/notifications'

// ─── Types ──────────────────────────────────────────────────

export interface FeedComment {
  id: string
  content: string
  created_at: string
  author: { id: string; display_name: string; avatar_url: string | null }
  company: { id: string; name: string; slug: string; logo_url: string | null } | null
}

export interface FeedPostWithDetails {
  id: string
  content: string
  hashtags: string[]
  tagged_user_ids: string[]
  reactions_count: number
  comments_count: number
  edited_at: string | null
  created_at: string
  author: { id: string; display_name: string; avatar_url: string | null; last_active_at: string | null }
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
      .select('id, display_name, avatar_url, last_login_at')
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
    const author = authorMap.get(p.author_id) ?? { id: p.author_id, display_name: 'Unknown', avatar_url: null, last_login_at: null }
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
      author: { id: author.id, display_name: author.display_name ?? 'Unknown', avatar_url: author.avatar_url, last_active_at: author.last_login_at ?? null },
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
  updateTag('trending-hashtags')

  // Fetch the full post with details for client-side prepend
  const { data: mediaRows } = await supabase
    .from('feed_post_media')
    .select('id, post_id, media_url, media_type, stream_video_id, thumbnail_url, sort_order')
    .eq('post_id', post.id)
    .order('sort_order', { ascending: true })

  const { data: author } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, last_login_at')
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

  // Fire-and-forget mention notifications
  if (params.taggedUserIds.length > 0) {
    const authorName = author?.display_name ?? 'Someone'
    Promise.resolve().then(async () => {
      try {
        await Promise.allSettled(
          params.taggedUserIds
            .filter((uid) => uid !== params.authorId)
            .map((uid) =>
              createNotification(
                uid,
                'post_mention' as never,
                `${authorName} mentioned you in a post`,
                trimmedContent.slice(0, 100),
                { post_id: post.id, actor_id: params.authorId }
              )
            )
        )
      } catch (e) {
        console.error('Failed to send mention notifications:', e)
      }
    })
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
        last_active_at: author?.last_login_at ?? null,
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
  updateTag('trending-hashtags')
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

// ─── Comments ──────────────────────────────────────────────

async function fetchPostComments(postId: string): Promise<FeedComment[]> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('feed_post_comments')
    .select('id, content, created_at, author_id, company_id')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []

  const authorIds = [...new Set(rows.map((c) => c.author_id))]
  const companyIds = [...new Set(rows.map((c) => c.company_id).filter(Boolean))] as string[]

  const [authorsResult, companiesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, last_login_at')
      .in('id', authorIds),
    companyIds.length > 0
      ? supabase
          .from('company_profiles')
          .select('id, name, slug, logo_url')
          .in('id', companyIds)
      : Promise.resolve({ data: [] }),
  ])

  const authorMap = new Map((authorsResult.data ?? []).map((a) => [a.id, a]))
  const companyMap = new Map((companiesResult.data ?? []).map((c) => [c.id, c]))

  return rows.map((c) => {
    const author = authorMap.get(c.author_id) ?? { id: c.author_id, display_name: 'Unknown', avatar_url: null }
    const company = c.company_id ? companyMap.get(c.company_id) ?? null : null
    return {
      id: c.id,
      content: c.content as string,
      created_at: c.created_at as string,
      author: { id: author.id, display_name: author.display_name ?? 'Unknown', avatar_url: author.avatar_url },
      company: company ? { id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url } : null,
    }
  })
}

export const getPostComments = unstable_cache(
  fetchPostComments,
  ['post-comments'],
  { revalidate: 15, tags: ['post-comments'] }
)

export async function addComment(params: {
  postId: string
  authorId: string
  companyId: string | null
  content: string
}): Promise<FeedComment> {
  const trimmed = params.content.trim()
  if (!trimmed || trimmed.length > 500) {
    throw new Error('Comment must be 1-500 characters')
  }

  const supabase = createAdminClient()

  // Verify post exists and is not deleted
  const { data: post, error: postError } = await supabase
    .from('feed_posts')
    .select('id, author_id')
    .eq('id', params.postId)
    .eq('is_deleted', false)
    .single()

  if (postError || !post) throw new Error('Post not found')

  // Insert comment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: comment, error: insertError } = await (supabase as any)
    .from('feed_post_comments')
    .insert({
      post_id: params.postId,
      author_id: params.authorId,
      company_id: params.companyId,
      content: trimmed,
    })
    .select('id, content, created_at, author_id, company_id')
    .single()

  if (insertError || !comment) throw new Error(insertError?.message ?? 'Insert failed')

  // Atomic count increment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('increment_post_comments', { p_post_id: params.postId })

  // Invalidate comment cache for this post
  updateTag(`post-comments-${params.postId}`)

  // Fetch author details for the response
  const [{ data: author }, { data: company }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', params.authorId)
      .single(),
    params.companyId
      ? supabase
          .from('company_profiles')
          .select('id, name, slug, logo_url')
          .eq('id', params.companyId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  // Fire-and-forget comment notification
  if (post.author_id !== params.authorId) {
    const commenterName = author?.display_name ?? 'Someone'
    Promise.resolve().then(async () => {
      try {
        await createNotification(
          post.author_id,
          'post_comment' as never,
          `${commenterName} commented on your post`,
          trimmed.slice(0, 100),
          { post_id: params.postId, actor_id: params.authorId }
        )
      } catch (e) {
        console.error('Failed to send comment notification:', e)
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = comment as any
  return {
    id: c.id as string,
    content: c.content as string,
    created_at: c.created_at as string,
    author: {
      id: author?.id ?? params.authorId,
      display_name: author?.display_name ?? 'Unknown',
      avatar_url: author?.avatar_url ?? null,
    },
    company: company ? { id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url } : null,
  }
}

export async function deleteComment(commentId: string, authorId: string): Promise<void> {
  const supabase = createAdminClient()

  // Fetch comment to get post_id before deleting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commentRow, error: fetchError } = await (supabase as any)
    .from('feed_post_comments')
    .select('post_id, author_id')
    .eq('id', commentId)
    .single()

  if (fetchError || !commentRow) throw new Error('Comment not found')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comment = commentRow as any
  if (comment.author_id !== authorId) throw new Error('Unauthorized')

  // Soft-delete
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('feed_post_comments')
    .update({ is_deleted: true })
    .eq('id', commentId)
    .eq('author_id', authorId)

  if (error) throw new Error(error.message)

  // Atomic decrement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('decrement_post_comments', { p_post_id: comment.post_id })

  updateTag(`post-comments-${comment.post_id}`)
}

// ─── Trending Hashtags ─────────────────────────────────────

export const getTrendingHashtags = unstable_cache(
  async (limit = 10): Promise<Array<{ tag: string; post_count: number }>> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('feed_hashtags')
      .select('tag, post_count')
      .gt('last_used_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('post_count', { ascending: false })
      .limit(limit)
    return data ?? []
  },
  ['trending-hashtags'],
  { revalidate: 3600, tags: ['trending-hashtags'] }
)

// ─── Hashtag Posts ──────────────────────────────────────────

export async function getHashtagPosts(params: {
  tag: string
  cursor?: string
  limit?: number
}): Promise<{ posts: FeedPostWithDetails[]; nextCursor: string | null; totalCount: number }> {
  const tag = params.tag.toLowerCase()
  const limit = params.limit ?? 10
  const supabase = createAdminClient()

  // Get totalCount from feed_hashtags (O(1))
  const { data: tagRow } = await supabase
    .from('feed_hashtags')
    .select('post_count')
    .eq('tag', tag)
    .single()
  const totalCount = tagRow?.post_count ?? 0

  // Get posts
  const query = supabase
    .from('feed_posts')
    .select(`
      id, content, hashtags, tagged_user_ids, reactions_count, comments_count,
      edited_at, created_at, author_id, company_id
    `)
    .eq('is_deleted', false)
    .contains('hashtags', [tag])
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (params.cursor) {
    query.lt('created_at', params.cursor)
  }

  const { data: postRows, error } = await query
  if (error) throw new Error(error.message)

  if (!postRows || postRows.length === 0) {
    return { posts: [], nextCursor: null, totalCount }
  }

  const hasMore = postRows.length > limit
  const sliced = hasMore ? postRows.slice(0, limit) : postRows
  const nextCursor = hasMore ? sliced[sliced.length - 1].created_at : null

  const postIds = sliced.map((p) => p.id)
  const authorIds = [...new Set(sliced.map((p) => p.author_id))]
  const companyIds = [...new Set(sliced.map((p) => p.company_id).filter(Boolean))] as string[]

  const [authorsResult, companiesResult, mediaResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, last_login_at')
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
  ])

  const authorMap = new Map((authorsResult.data ?? []).map((a) => [a.id, a]))
  const companyMap = new Map((companiesResult.data ?? []).map((c) => [c.id, c]))
  const mediaByPost = new Map<string, typeof mediaResult.data>()
  for (const m of mediaResult.data ?? []) {
    if (!mediaByPost.has(m.post_id)) mediaByPost.set(m.post_id, [])
    mediaByPost.get(m.post_id)!.push(m)
  }

  const posts: FeedPostWithDetails[] = sliced.map((p) => {
    const author = authorMap.get(p.author_id) ?? { id: p.author_id, display_name: 'Unknown', avatar_url: null, last_login_at: null }
    const company = p.company_id ? companyMap.get(p.company_id) ?? null : null
    return {
      id: p.id,
      content: p.content ?? '',
      hashtags: p.hashtags,
      tagged_user_ids: p.tagged_user_ids,
      reactions_count: p.reactions_count,
      comments_count: p.comments_count,
      edited_at: p.edited_at,
      created_at: p.created_at,
      author: { id: author.id, display_name: author.display_name ?? 'Unknown', avatar_url: author.avatar_url, last_active_at: author.last_login_at ?? null },
      company: company ? { id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url } : null,
      media: (mediaByPost.get(p.id) ?? []) as FeedPostWithDetails['media'],
      viewer_has_reacted: false,
    }
  })

  return { posts, nextCursor, totalCount }
}

// ─── Mention Resolution ────────────────────────────────────

export const resolveMentionedUsers = unstable_cache(
  async (
    userIds: string[]
  ): Promise<Array<{
    id: string
    display_name: string
    slug?: string
    type: 'user' | 'company'
  }>> => {
    if (userIds.length === 0) return []
    const supabase = createAdminClient()

    const [{ data: users }, { data: companies }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds),
      supabase
        .from('company_profiles')
        .select('id, name, slug')
        .in('id', userIds),
    ])

    const results: Array<{ id: string; display_name: string; slug?: string; type: 'user' | 'company' }> = []
    for (const u of users ?? []) results.push({ id: u.id, display_name: u.display_name ?? 'Unknown', type: 'user' })
    for (const c of companies ?? []) results.push({ id: c.id, display_name: c.name, slug: c.slug, type: 'company' })
    return results
  },
  ['resolve-mentions'],
  { revalidate: 300, tags: ['resolve-mentions'] }
)
