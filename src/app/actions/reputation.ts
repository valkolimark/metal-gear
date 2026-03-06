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

  // Recalculate trust score
  await recalculateTrustScore(admin, sellerId)

  // Invalidate reputation summary cache so it regenerates on next view
  await admin
    .from('profiles')
    .update({ reputation_summary_updated_at: null })
    .eq('id', sellerId)

  // Create in-app notification for the seller (fire and forget)
  notifyReviewReceived(admin, user.id, sellerId, rating, comment, conversationId, undefined)

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

export async function submitTransactionReview(
  transactionId: string,
  targetId: string,
  reviewType: 'seller' | 'buyer',
  rating: number,
  comment: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }
  if (user.id === targetId) return { error: 'Cannot review yourself' }
  if (rating < 1 || rating > 5) return { error: 'Rating must be 1-5' }

  const admin = createAdminClient()

  // Verify transaction and user's role
  const { data: transaction } = await admin
    .from('transactions')
    .select('buyer_id, seller_id, listing_id, status')
    .eq('id', transactionId)
    .single()

  if (!transaction) return { error: 'Transaction not found' }
  if (transaction.status !== 'completed') return { error: 'Transaction must be completed to leave a review' }

  const isBuyer = transaction.buyer_id === user.id
  const isSeller = transaction.seller_id === user.id
  if (!isBuyer && !isSeller) return { error: 'Not authorized' }

  // Buyer reviews seller, seller reviews buyer
  if (reviewType === 'seller' && !isBuyer) return { error: 'Only buyers can review sellers' }
  if (reviewType === 'buyer' && !isSeller) return { error: 'Only sellers can review buyers' }

  const { error } = await admin.from('reviews').insert({
    reviewer_id: user.id,
    seller_id: targetId,
    transaction_id: transactionId,
    listing_id: transaction.listing_id,
    review_type: reviewType,
    rating,
    comment: comment.trim() || null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'You already reviewed this transaction' }
    return { error: error.message }
  }

  // Recalculate trust score for the reviewed user
  await recalculateTrustScore(admin, targetId)

  // Invalidate reputation summary cache
  await admin
    .from('profiles')
    .update({ reputation_summary_updated_at: null })
    .eq('id', targetId)

  // Notify the reviewed user
  notifyReviewReceived(admin, user.id, targetId, rating, comment, undefined, transactionId)

  return { success: true }
}

export async function getTransactionReviews(transactionId: string) {
  const admin = createAdminClient()

  const { data: reviews } = await admin
    .from('reviews')
    .select('id, reviewer_id, seller_id, review_type, rating, comment, created_at')
    .eq('transaction_id', transactionId)

  if (!reviews || reviews.length === 0) return { reviews: [] }

  const userIds = [...new Set([...reviews.map((r) => r.reviewer_id), ...reviews.map((r) => r.seller_id)])]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

  return {
    reviews: reviews.map((r) => ({
      ...r,
      reviewer: profileMap.get(r.reviewer_id) || null,
      target: profileMap.get(r.seller_id) || null,
    })),
  }
}

export async function getBuyerReviews(buyerId: string) {
  const admin = createAdminClient()

  const { data: reviews } = await admin
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id')
    .eq('seller_id', buyerId)
    .eq('review_type', 'buyer')
    .order('created_at', { ascending: false })
    .limit(20)

  if (!reviews || reviews.length === 0) {
    return { reviews: [], averageRating: 0, totalReviews: 0 }
  }

  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))]
  const { data: reviewers } = await admin
    .from('profiles')
    .select('id, full_name, display_name, avatar_url')
    .in('id', reviewerIds)

  const reviewerMap = new Map((reviewers || []).map((r) => [r.id, r]))

  const enriched = reviews.map((r) => ({
    ...r,
    reviewer: reviewerMap.get(r.reviewer_id) || null,
  }))

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return {
    reviews: enriched,
    averageRating: Math.round(avgRating * 10) / 10,
    totalReviews: reviews.length,
  }
}

async function recalculateTrustScore(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  try {
    // Get all reviews for this user (both as seller and buyer)
    const { data: reviews } = await admin
      .from('reviews')
      .select('rating')
      .eq('seller_id', userId)

    if (!reviews || reviews.length === 0) return

    const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    // Trust score: avg rating * 20 (so 5 stars = 100), capped at 100
    const trustScore = Math.min(100, Math.round(avgRating * 20))

    await admin
      .from('profiles')
      .update({ trust_score: trustScore })
      .eq('id', userId)
  } catch (err) {
    console.error('Failed to recalculate trust score:', err)
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
  targetId: string,
  rating: number,
  comment: string,
  conversationId?: string,
  transactionId?: string
) {
  try {
    const { data: reviewer } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', reviewerId)
      .single()

    const reviewerName = reviewer?.display_name || reviewer?.full_name || 'Someone'
    await createNotification(
      targetId,
      'review_received',
      `${reviewerName} left you a ${rating}-star review`,
      comment?.trim() || 'No comment provided',
      { reviewer_id: reviewerId, rating, ...(conversationId ? { conversation_id: conversationId } : {}), ...(transactionId ? { transaction_id: transactionId } : {}) }
    )
  } catch (err) {
    console.error('Failed to send review notification:', err)
  }
}
