'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/app/actions/notifications'

export async function submitReview(
  conversationId: string,
  sellerId: string,
  rating: number,
  comment: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }
  if (user.id === sellerId) return { error: 'Cannot review yourself' }
  if (rating < 1 || rating > 5) return { error: 'Rating must be 1-5' }

  const admin = createAdminClient()

  // Verify user was buyer in this conversation
  const { data: conv } = await admin
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', conversationId)
    .single()

  if (!conv || conv.buyer_id !== user.id) {
    return { error: 'Can only review sellers you have conversed with' }
  }

  const { error } = await admin.from('reviews').insert({
    reviewer_id: user.id,
    seller_id: sellerId,
    conversation_id: conversationId,
    rating,
    comment: comment.trim() || null,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'You already reviewed this transaction' }
    }
    return { error: error.message }
  }

  // Create in-app notification for the seller (fire and forget)
  notifyReviewReceived(admin, user.id, sellerId, rating, comment, conversationId)

  return { success: true }
}

export async function getSellerReviews(sellerId: string) {
  const admin = createAdminClient()

  const { data: reviews } = await admin
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!reviews || reviews.length === 0) {
    return { reviews: [], averageRating: 0, totalReviews: 0 }
  }

  // Get reviewer names
  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))]
  const { data: reviewers } = await admin
    .from('profiles')
    .select('id, full_name, display_name, avatar_url')
    .in('id', reviewerIds)

  const reviewerMap = new Map(
    (reviewers || []).map((r) => [r.id, r])
  )

  const enriched = reviews.map((r) => ({
    ...r,
    reviewer: reviewerMap.get(r.reviewer_id) || null,
  }))

  const avgRating =
    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return {
    reviews: enriched,
    averageRating: Math.round(avgRating * 10) / 10,
    totalReviews: reviews.length,
  }
}

export async function getSellerResponseTime(sellerId: string) {
  const admin = createAdminClient()

  // Get conversations where this user is the seller
  const { data: convs } = await admin
    .from('conversations')
    .select('id, created_at')
    .eq('seller_id', sellerId)
    .limit(50)

  if (!convs || convs.length === 0) return { responseTime: null }

  // For each conversation, find the seller's first reply
  const responseTimes: number[] = []

  for (const conv of convs) {
    const { data: firstReply } = await admin
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conv.id)
      .eq('sender_id', sellerId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstReply) {
      const convStart = new Date(conv.created_at).getTime()
      const replyTime = new Date(firstReply.created_at).getTime()
      const diffHours = (replyTime - convStart) / (1000 * 60 * 60)
      if (diffHours > 0 && diffHours < 168) {
        // Cap at 1 week
        responseTimes.push(diffHours)
      }
    }
  }

  if (responseTimes.length === 0) return { responseTime: null }

  const avgHours =
    responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length

  let label: string
  if (avgHours < 1) label = 'within an hour'
  else if (avgHours < 4) label = 'within a few hours'
  else if (avgHours < 24) label = 'within a day'
  else if (avgHours < 48) label = 'within 2 days'
  else label = `within ${Math.round(avgHours / 24)} days`

  return { responseTime: label }
}

export async function submitReport(
  targetType: 'listing' | 'user',
  targetId: string,
  reason: string,
  details: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }
  if (!reason.trim()) return { error: 'Reason is required' }

  const admin = createAdminClient()

  const { error } = await admin.from('reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim(),
    details: details.trim() || null,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function getProfileCompletionPercentage(userId: string) {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) return { percentage: 0 }

  const fields = [
    { key: 'full_name', weight: 15 },
    { key: 'display_name', weight: 10 },
    { key: 'company_name', weight: 10 },
    { key: 'bio', weight: 15 },
    { key: 'phone', weight: 10 },
    { key: 'industry', weight: 10 },
    { key: 'location_city', weight: 10 },
    { key: 'avatar_url', weight: 20 },
  ]

  let score = 0
  for (const field of fields) {
    const value = profile[field.key as keyof typeof profile]
    if (value && String(value).trim()) {
      score += field.weight
    }
  }

  return { percentage: score }
}

async function notifyReviewReceived(
  admin: ReturnType<typeof createAdminClient>,
  reviewerId: string,
  sellerId: string,
  rating: number,
  comment: string,
  conversationId: string
) {
  try {
    const { data: reviewer } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', reviewerId)
      .single()

    const reviewerName = reviewer?.display_name || reviewer?.full_name || 'Someone'
    await createNotification(
      sellerId,
      'review_received',
      `${reviewerName} left you a ${rating}-star review`,
      comment?.trim() || 'No comment provided',
      { reviewer_id: reviewerId, rating, conversation_id: conversationId }
    )
  } catch (err) {
    console.error('Failed to send review notification:', err)
  }
}
