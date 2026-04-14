'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache, updateTag } from 'next/cache'
import { createNotification } from '@/app/actions/notifications'

// ─── Types ──────────────────────────────────────────────────

export interface FeedComment {
  id: string
  post_id: string
  author_id: string
  parent_comment_id: string | null
  content: string
  created_at: string
  author: { id: string; display_name: string; avatar_url: string | null }
  company: { id: string; name: string; slug: string; logo_url: string | null } | null
}

export interface CommentWithReplyCount extends FeedComment {
  reply_count: number
}

// ─── Helpers ────────────────────────────────────────────────

type CommentRow = {
  id: string
  post_id: string
  author_id: string
  company_id: string | null
  parent_comment_id: string | null
  content: string
  created_at: string
}

async function hydrateComments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rows: CommentRow[]
): Promise<FeedComment[]> {
  if (rows.length === 0) return []

  const authorIds = [...new Set(rows.map((c) => c.author_id))]
  const companyIds = [...new Set(rows.map((c) => c.company_id).filter(Boolean))] as string[]

  const [authorsResult, companiesResult] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url').in('id', authorIds),
    companyIds.length > 0
      ? supabase.from('company_profiles').select('id, name, slug, logo_url').in('id', companyIds)
      : Promise.resolve({ data: [] }),
  ])

  const authorMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((authorsResult.data ?? []) as any[]).map((a) => [a.id, a])
  )
  const companyMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((companiesResult.data ?? []) as any[]).map((c) => [c.id, c])
  )

  return rows.map((c) => {
    const author = authorMap.get(c.author_id) ?? { id: c.author_id, display_name: 'Unknown', avatar_url: null }
    const company = c.company_id ? companyMap.get(c.company_id) ?? null : null
    return {
      id: c.id,
      post_id: c.post_id,
      author_id: c.author_id,
      parent_comment_id: c.parent_comment_id,
      content: c.content,
      created_at: c.created_at,
      author: {
        id: author.id,
        display_name: author.display_name ?? 'Unknown',
        avatar_url: author.avatar_url,
      },
      company: company
        ? { id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url }
        : null,
    }
  })
}

// ─── Read: top-level comments with reply counts ─────────────

async function fetchPostComments(postId: string): Promise<CommentWithReplyCount[]> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topRows, error } = await (supabase as any)
    .from('feed_post_comments')
    .select('id, post_id, author_id, company_id, parent_comment_id, content, created_at')
    .eq('post_id', postId)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) throw new Error(error.message)
  const rows = (topRows ?? []) as CommentRow[]
  if (rows.length === 0) return []

  // Fetch reply counts in a single query grouped by parent_comment_id
  const topIds = rows.map((r) => r.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: replyRows } = await (supabase as any)
    .from('feed_post_comments')
    .select('parent_comment_id')
    .in('parent_comment_id', topIds)

  const replyCountMap = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (replyRows ?? []) as any[]) {
    const pid = r.parent_comment_id as string
    replyCountMap.set(pid, (replyCountMap.get(pid) ?? 0) + 1)
  }

  const hydrated = await hydrateComments(supabase, rows)
  return hydrated.map((c) => ({ ...c, reply_count: replyCountMap.get(c.id) ?? 0 }))
}

export const getPostComments = unstable_cache(
  fetchPostComments,
  ['post-comments-v2'],
  { revalidate: 15, tags: ['post-comments'] }
)

// ─── Read: replies for one parent comment ──────────────────

export async function getReplies(parentCommentId: string): Promise<FeedComment[]> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('feed_post_comments')
    .select('id, post_id, author_id, company_id, parent_comment_id, content, created_at')
    .eq('parent_comment_id', parentCommentId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) throw new Error(error.message)
  return hydrateComments(supabase, (data ?? []) as CommentRow[])
}

// ─── Create: top-level comment ─────────────────────────────

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

  const { data: post, error: postError } = await supabase
    .from('feed_posts')
    .select('id, author_id')
    .eq('id', params.postId)
    .eq('is_deleted', false)
    .single()

  if (postError || !post) throw new Error('Post not found')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase as any)
    .from('feed_post_comments')
    .insert({
      post_id: params.postId,
      author_id: params.authorId,
      company_id: params.companyId,
      content: trimmed,
      parent_comment_id: null,
    })
    .select('id, post_id, author_id, company_id, parent_comment_id, content, created_at')
    .single()

  if (insertError || !inserted) throw new Error(insertError?.message ?? 'Insert failed')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('increment_post_comments', { p_post_id: params.postId })

  updateTag(`post-comments-${params.postId}`)
  updateTag('post-comments')

  const [hydrated] = await hydrateComments(supabase, [inserted as CommentRow])

  if (post.author_id !== params.authorId) {
    const commenterName = hydrated.author.display_name ?? 'Someone'
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

  return hydrated
}

// ─── Create: reply to a comment ─────────────────────────────

export async function addReply(params: {
  parentCommentId: string
  authorId: string
  companyId: string | null
  content: string
}): Promise<FeedComment> {
  const trimmed = params.content.trim()
  if (!trimmed || trimmed.length > 500) {
    throw new Error('Reply must be 1-500 characters')
  }

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: parent, error: parentError } = await (supabase as any)
    .from('feed_post_comments')
    .select('id, post_id, author_id, parent_comment_id')
    .eq('id', params.parentCommentId)
    .single()

  if (parentError || !parent) throw new Error('Parent comment not found')
  if (parent.parent_comment_id !== null) {
    throw new Error('Replies to replies are not allowed')
  }

  // Verify post exists and is not deleted
  const { data: post, error: postError } = await supabase
    .from('feed_posts')
    .select('id, author_id')
    .eq('id', parent.post_id)
    .eq('is_deleted', false)
    .single()

  if (postError || !post) throw new Error('Post not found')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase as any)
    .from('feed_post_comments')
    .insert({
      post_id: parent.post_id,
      author_id: params.authorId,
      company_id: params.companyId,
      content: trimmed,
      parent_comment_id: params.parentCommentId,
    })
    .select('id, post_id, author_id, company_id, parent_comment_id, content, created_at')
    .single()

  if (insertError || !inserted) throw new Error(insertError?.message ?? 'Insert failed')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('increment_post_comments', { p_post_id: parent.post_id })

  updateTag(`post-comments-${parent.post_id}`)
  updateTag('post-comments')

  const [hydrated] = await hydrateComments(supabase, [inserted as CommentRow])

  // Notify parent comment author (if not replying to self)
  if (parent.author_id !== params.authorId) {
    const replierName = hydrated.author.display_name ?? 'Someone'
    Promise.resolve().then(async () => {
      try {
        await createNotification(
          parent.author_id,
          'post_comment' as never,
          `${replierName} replied to your comment`,
          trimmed.slice(0, 100),
          { post_id: parent.post_id, actor_id: params.authorId }
        )
      } catch (e) {
        console.error('Failed to send reply notification:', e)
      }
    })
  }

  return hydrated
}

// ─── Delete: hard delete (comment author, post owner, or admin) ──

export async function deleteComment(
  commentId: string,
  requestingUserId: string
): Promise<{ success: true }> {
  if (!requestingUserId) throw new Error('Unauthorized')

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commentRow, error: fetchError } = await (supabase as any)
    .from('feed_post_comments')
    .select('id, post_id, author_id, parent_comment_id')
    .eq('id', commentId)
    .single()

  if (fetchError || !commentRow) throw new Error('Comment not found')

  // Permission check: comment author, post owner, or admin
  let allowed = commentRow.author_id === requestingUserId
  let postAuthorId: string | null = null

  if (!allowed) {
    const { data: post } = await supabase
      .from('feed_posts')
      .select('author_id')
      .eq('id', commentRow.post_id)
      .single()
    postAuthorId = post?.author_id ?? null
    if (postAuthorId === requestingUserId) allowed = true
  }

  if (!allowed) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', requestingUserId)
      .single()
    if (profile?.admin_role === 'superadmin' || profile?.admin_role === 'moderator') {
      allowed = true
    }
  }

  if (!allowed) throw new Error('Unauthorized')

  let decrementBy = 1

  if (commentRow.parent_comment_id === null) {
    // Top-level: count replies first (cascade will remove them)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('feed_post_comments')
      .select('id', { count: 'exact', head: true })
      .eq('parent_comment_id', commentId)
    decrementBy = 1 + (count ?? 0)
  }

  // Hard delete
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from('feed_post_comments')
    .delete()
    .eq('id', commentId)

  if (deleteError) throw new Error(deleteError.message)

  // Decrement comments_count by 1 + reply_count (clamped at 0)
  if (decrementBy > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: postRow } = await (supabase as any)
      .from('feed_posts')
      .select('comments_count')
      .eq('id', commentRow.post_id)
      .single()
    const current = (postRow?.comments_count as number | undefined) ?? 0
    const next = Math.max(0, current - decrementBy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('feed_posts')
      .update({ comments_count: next })
      .eq('id', commentRow.post_id)
  }

  updateTag(`post-comments-${commentRow.post_id}`)
  updateTag('post-comments')

  return { success: true }
}
