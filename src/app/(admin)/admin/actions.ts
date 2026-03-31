'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, type AdminRole } from '@/lib/admin/permissions'
import type { Json } from '@/types/database'

// ─── Audit Logging ──────────────────────────────────────────────────

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  const admin = createAdminClient()
  await admin.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType ?? '',
    target_id: targetId ?? '',
    metadata: metadata ? (metadata as Json) : {},
  })
}

// ─── Control Tower Data ─────────────────────────────────────────────

export async function getControlTowerStats() {
  await requireAdmin()
  const admin = createAdminClient()

  const [
    { count: totalUsers },
    { count: totalListings },
    { count: activeListings },
    { count: activeSos },
    { count: pendingReports },
    { count: fraudFlagged },
    { count: todaySignups },
    { count: todayListings },
    { count: todaySos },
    { count: weekSignups },
    { count: monthSignups },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('listings').select('*', { count: 'exact', head: true }),
    admin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('sos_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('listings').select('*', { count: 'exact', head: true }).eq('ai_fraud_flagged', true),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    admin.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    admin.from('sos_requests').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  // MRR calculation
  const { data: subs } = await admin
    .from('subscriptions')
    .select('tier')
    .eq('status', 'active')

  const mrr = (subs || []).reduce((acc, s) => {
    if (s.tier === 'premium') return acc + 2999
    if (s.tier === 'boost') return acc + 7999
    return acc
  }, 0)

  return {
    totalUsers: totalUsers ?? 0,
    totalListings: totalListings ?? 0,
    activeListings: activeListings ?? 0,
    activeSos: activeSos ?? 0,
    pendingReports: pendingReports ?? 0,
    fraudFlagged: fraudFlagged ?? 0,
    mrrCents: mrr,
    todaySignups: todaySignups ?? 0,
    todayListings: todayListings ?? 0,
    todaySos: todaySos ?? 0,
    weekSignups: weekSignups ?? 0,
    monthSignups: monthSignups ?? 0,
  }
}

export async function getAlertQueue() {
  await requireAdmin()
  const admin = createAdminClient()

  const [
    { data: fraudListings },
    { data: pendingReports },
    { data: staleSos },
  ] = await Promise.all([
    admin
      .from('listings')
      .select('id, title, ai_fraud_reason, created_at')
      .eq('ai_fraud_flagged', true)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('reports')
      .select('id, target_type, target_id, reason, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('sos_requests')
      .select('id, equipment_subcategory, brand, urgency, created_at')
      .eq('status', 'active')
      .lte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(10),
  ])

  return {
    fraudListings: fraudListings ?? [],
    pendingReports: pendingReports ?? [],
    staleSos: staleSos ?? [],
  }
}

export async function getActivityFeed() {
  await requireAdmin()
  const admin = createAdminClient()

  // Get recent activity from various sources
  const [
    { data: recentUsers },
    { data: recentListings },
    { data: recentSos },
    { data: recentAudit },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('listings')
      .select('id, title, created_at, seller_id')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('sos_requests')
      .select('id, equipment_subcategory, created_at, requester_id')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('admin_audit_log')
      .select('id, action, target_type, admin_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  type FeedItem = {
    id: string
    type: 'user' | 'listing' | 'sos' | 'admin'
    text: string
    created_at: string | null
  }

  const feed: FeedItem[] = [
    ...(recentUsers ?? []).map((u) => ({
      id: `user-${u.id}`,
      type: 'user' as const,
      text: `${u.full_name || 'New user'} registered`,
      created_at: u.created_at,
    })),
    ...(recentListings ?? []).map((l) => ({
      id: `listing-${l.id}`,
      type: 'listing' as const,
      text: `New listing: ${l.title}`,
      created_at: l.created_at,
    })),
    ...(recentSos ?? []).map((s) => ({
      id: `sos-${s.id}`,
      type: 'sos' as const,
      text: `SOS broadcast: ${s.equipment_subcategory?.replace(/_/g, ' ')}`,
      created_at: s.created_at,
    })),
    ...(recentAudit ?? []).map((a) => ({
      id: `audit-${a.id}`,
      type: 'admin' as const,
      text: `Admin action: ${a.action} on ${a.target_type}`,
      created_at: a.created_at,
    })),
  ]

  return feed.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()).slice(0, 30)
}

export async function getChartData() {
  await requireAdmin()
  const admin = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: signups }, { data: listings }] = await Promise.all([
    admin.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo),
    admin.from('listings').select('created_at').gte('created_at', thirtyDaysAgo),
  ])

  // Group by date
  function groupByDate(items: { created_at: string }[] | null) {
    const map: Record<string, number> = {}
    for (const item of items ?? []) {
      const date = item.created_at.slice(0, 10)
      map[date] = (map[date] || 0) + 1
    }
    return map
  }

  return {
    signupsByDate: groupByDate(signups),
    listingsByDate: groupByDate(listings),
  }
}

// ─── User Management ────────────────────────────────────────────────

export async function getAdminUsers(params: {
  page?: number
  search?: string
  tier?: string
  status?: string
  role?: string
}) {
  await requireAdmin()
  const admin = createAdminClient()
  const page = params.page ?? 1
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = admin
    .from('profiles')
    .select('id, full_name, avatar_url, subscription_tier, is_admin, admin_role, created_at, is_suspended, is_banned', { count: 'exact' })

  if (params.search) {
    query = query.ilike('full_name', `%${params.search}%`)
  }
  if (params.tier && params.tier !== 'all') {
    query = query.eq('subscription_tier', params.tier)
  }
  if (params.role && params.role !== 'all') {
    if (params.role === 'non-admin') {
      query = query.is('admin_role', null)
    } else {
      query = query.eq('admin_role', params.role as AdminRole)
    }
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Get listing counts per user
  const userIds = (data ?? []).map((u) => u.id)
  const { data: listingCounts } = await admin
    .from('listings')
    .select('seller_id')
    .in('seller_id', userIds)

  const countMap: Record<string, number> = {}
  for (const l of listingCounts ?? []) {
    countMap[l.seller_id] = (countMap[l.seller_id] || 0) + 1
  }

  return {
    users: (data ?? []).map((u) => ({
      ...u,
      listing_count: countMap[u.id] || 0,
    })),
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

export async function getAdminUserDetail(userId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const [
    { data: profile },
    { data: listings },
    { data: sosRequests },
    { data: reviews },
    { data: reports },
    { data: auditLog },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).single(),
    admin.from('listings').select('id, title, status, price_cents, created_at, category, condition').eq('seller_id', userId).order('created_at', { ascending: false }).limit(20),
    admin.from('sos_requests').select('id, equipment_subcategory, urgency, status, created_at').eq('requester_id', userId).order('created_at', { ascending: false }).limit(20),
    admin.from('reviews').select('id, rating, comment, created_at').eq('seller_id', userId).order('created_at', { ascending: false }).limit(10),
    admin.from('reports').select('id, reason, status, created_at').eq('target_id', userId).eq('target_type', 'user').order('created_at', { ascending: false }),
    admin.from('admin_audit_log').select('id, action, metadata, created_at').eq('target_id', userId).eq('target_type', 'user').order('created_at', { ascending: false }).limit(20),
  ])

  return {
    profile,
    listings: listings ?? [],
    sosRequests: sosRequests ?? [],
    reviews: reviews ?? [],
    reports: reports ?? [],
    auditLog: auditLog ?? [],
  }
}

export async function adminUpdateUser(
  userId: string,
  updates: {
    admin_role?: AdminRole | null
    is_admin?: boolean
    is_suspended?: boolean
    is_banned?: boolean
    admin_notes?: string
    subscription_tier?: string
  }
) {
  const { user, profile } = await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await logAdminAction(
    profile.id,
    'update_user',
    'user',
    userId,
    { updates, performed_by: user.id }
  )

  return { success: true }
}

export async function adminSuspendUser(
  userId: string,
  duration: '24h' | '7d' | '30d' | 'permanent'
) {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_suspended: true })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await logAdminAction(
    profile.id,
    'suspend_user',
    'user',
    userId,
    { duration }
  )

  return { success: true }
}

export async function adminBanUser(userId: string) {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_banned: true, is_suspended: true })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'ban_user', 'user', userId, {})
  return { success: true }
}

export async function adminDeleteUser(userId: string) {
  const { profile } = await requireAdmin('grant_roles')
  const admin = createAdminClient()

  // Soft delete — just mark as banned + suspended
  const { error } = await admin
    .from('profiles')
    .update({ is_banned: true, is_suspended: true, admin_notes: 'Account deleted by admin' })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'delete_user', 'user', userId, {})
  return { success: true }
}

export async function adminGrantRole(userId: string, role: AdminRole | null) {
  const { profile } = await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({
      admin_role: role,
      is_admin: role !== null,
      admin_granted_at: role ? new Date().toISOString() : null,
      admin_granted_by: role ? profile.id : null,
    })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, role ? 'grant_role' : 'revoke_role', 'user', userId, { role })
  return { success: true }
}

// ─── Subscription Tier Override ──────────────────────────────────────

export async function setUserSubscriptionTier(
  userId: string,
  tier: 'free' | 'pro' | 'business' | 'enterprise'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile: adminProfile } = await requireAdmin('manage_subscriptions')
    const admin = createAdminClient()

    // Update the profile's subscription_tier (used as fallback in getActiveTier)
    const { error: profileError } = await admin
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', userId)

    if (profileError) return { success: false, error: profileError.message }

    // Upsert admin-override subscription record
    // Check for existing active subscription
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSub) {
      // Update existing subscription tier (keep Stripe ID if present)
      const { error: updateErr } = await admin
        .from('subscriptions')
        .update({ tier })
        .eq('id', existingSub.id)
      if (updateErr) return { success: false, error: updateErr.message }
    } else if (tier !== 'free') {
      // Create new admin-override subscription (placeholder Stripe IDs for admin overrides)
      const { error: insertErr } = await admin
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier,
          status: 'active',
          stripe_price_id: 'admin_override',
          stripe_subscription_id: `admin_override_${Date.now()}`,
        })
      if (insertErr) return { success: false, error: insertErr.message }
    }

    // If setting to free and had an existing sub, deactivate it
    if (tier === 'free' && existingSub) {
      await admin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', existingSub.id)
    }

    await logAdminAction(
      adminProfile.id,
      'set_subscription_tier',
      'user',
      userId,
      { tier, admin_override: true }
    )

    return { success: true }
  } catch (err) {
    // Re-throw redirect errors (from requireAdmin) so Next.js handles them
    if (err && typeof err === 'object' && 'digest' in err) throw err
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Current Admin Role ─────────────────────────────────────────────

export async function getCurrentAdminRole(): Promise<string | null> {
  const { profile } = await requireAdmin()
  return profile.admin_role
}

// ─── Listing Management ─────────────────────────────────────────────

export async function getAdminListings(params: {
  page?: number
  search?: string
  status?: string
  ai_fraud_flagged?: boolean
}) {
  await requireAdmin()
  const admin = createAdminClient()
  const page = params.page ?? 1
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = admin
    .from('listings')
    .select(
      'id, title, status, price_cents, condition, category, created_at, seller_id, ai_fraud_flagged, ai_fraud_reason, admin_reviewed_at, is_featured, admin_boost, specifications',
      { count: 'exact' }
    )

  if (params.search) {
    query = query.ilike('title', `%${params.search}%`)
  }
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  if (params.ai_fraud_flagged !== undefined) {
    query = query.eq('ai_fraud_flagged', params.ai_fraud_flagged)
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Get seller names via second query
  const sellerIds = [...new Set((data ?? []).map((l) => l.seller_id))]
  const sellerMap: Record<string, string> = {}

  if (sellerIds.length > 0) {
    const { data: sellers } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', sellerIds)

    for (const s of sellers ?? []) {
      sellerMap[s.id] = s.full_name ?? 'Unknown'
    }
  }

  return {
    listings: (data ?? []).map((l) => ({
      ...l,
      seller_name: sellerMap[l.seller_id] || 'Unknown',
    })),
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

export async function getAdminListingDetail(listingId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const [
    { data: listing },
    { data: images },
    { data: videos },
    { count: viewCount },
    { data: auditLog },
  ] = await Promise.all([
    admin.from('listings').select('*').eq('id', listingId).single(),
    admin.from('listing_images').select('*').eq('listing_id', listingId).order('position', { ascending: true }),
    admin.from('listing_videos').select('*').eq('listing_id', listingId),
    admin.from('listing_views').select('*', { count: 'exact', head: true }).eq('listing_id', listingId),
    admin
      .from('admin_audit_log')
      .select('*')
      .eq('target_type', 'listing')
      .eq('target_id', listingId)
      .order('created_at', { ascending: false }),
  ])

  // Get seller profile
  let seller = null
  if (listing?.seller_id) {
    const { data: sellerData } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, subscription_tier')
      .eq('id', listing.seller_id)
      .single()
    seller = sellerData
  }

  return {
    listing,
    images: images ?? [],
    videos: videos ?? [],
    seller,
    viewCount: viewCount ?? 0,
    auditLog: auditLog ?? [],
  }
}

export async function adminUpdateListing(
  listingId: string,
  updates: {
    status?: string
    title?: string
    description?: string
    price_cents?: number
    condition?: string
    is_featured?: boolean
    admin_boost?: number
    pinned_position?: number | null
    pinned_category?: string | null
    admin_flag_reason?: string | null
  }
) {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { admin_boost, ...rest } = updates
  const dbUpdates = {
    ...rest,
    ...(admin_boost !== undefined ? { admin_boost: !!admin_boost } : {}),
  }

  const { error } = await admin
    .from('listings')
    .update(dbUpdates)
    .eq('id', listingId)

  if (error) throw new Error(error.message)

  await logAdminAction(
    profile.id,
    'update_listing',
    'listing',
    listingId,
    { updates }
  )

  return { success: true }
}

export async function adminBulkUpdateListings(
  listingIds: string[],
  updates: {
    status?: string
    is_featured?: boolean
    admin_boost?: number
  }
) {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { admin_boost: bulkBoost, ...bulkRest } = updates
  const bulkDbUpdates = {
    ...bulkRest,
    ...(bulkBoost !== undefined ? { admin_boost: !!bulkBoost } : {}),
  }

  const { error } = await admin
    .from('listings')
    .update(bulkDbUpdates)
    .in('id', listingIds)

  if (error) throw new Error(error.message)

  // Log each action individually for audit trail
  await Promise.all(
    listingIds.map((id) =>
      logAdminAction(
        profile.id,
        'bulk_update_listing',
        'listing',
        id,
        { updates }
      )
    )
  )

  return { success: true }
}

export async function adminDeleteListing(listingId: string) {
  const { profile } = await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const { error } = await admin
    .from('listings')
    .delete()
    .eq('id', listingId)

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'delete_listing', 'listing', listingId, {})

  return { success: true }
}

export async function adminClearFraudFlag(listingId: string) {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { error } = await admin
    .from('listings')
    .update({
      ai_fraud_flagged: false,
      admin_reviewed_by: profile.id,
      admin_reviewed_at: new Date().toISOString(),
    })
    .eq('id', listingId)

  if (error) throw new Error(error.message)

  await logAdminAction(
    profile.id,
    'clear_fraud_flag',
    'listing',
    listingId,
    {}
  )

  return { success: true }
}

export async function adminFlagListing(listingId: string, reason: string) {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { error } = await admin
    .from('listings')
    .update({
      status: 'flagged',
      admin_flag_reason: reason,
    })
    .eq('id', listingId)

  if (error) throw new Error(error.message)

  await logAdminAction(
    profile.id,
    'flag_listing',
    'listing',
    listingId,
    { reason }
  )

  return { success: true }
}

// ─── SOS Monitor ────────────────────────────────────────────────────

export async function getAdminSOS(params: {
  page?: number
  status?: string
  urgency?: string
}) {
  await requireAdmin()
  const admin = createAdminClient()
  const page = params.page ?? 1
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = admin
    .from('sos_requests')
    .select(
      'id, title, equipment_category, equipment_subcategory, brand, model, urgency, status, created_at, expires_at, requester_id',
      { count: 'exact' }
    )

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status as 'expired' | 'active' | 'fulfilled' | 'cancelled')
  }
  if (params.urgency && params.urgency !== 'all') {
    query = query.eq('urgency', params.urgency as 'critical' | 'normal')
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Get requester names via second query
  const requesterIds = [...new Set((data ?? []).map((s) => s.requester_id))]
  const requesterMap: Record<string, string> = {}

  if (requesterIds.length > 0) {
    const { data: requesters } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', requesterIds)

    for (const r of requesters ?? []) {
      requesterMap[r.id] = r.full_name ?? 'Unknown'
    }
  }

  // Get response counts per SOS
  const sosIds = (data ?? []).map((s) => s.id)
  const responseCountMap: Record<string, number> = {}

  if (sosIds.length > 0) {
    const { data: responses } = await admin
      .from('sos_responses')
      .select('sos_request_id')
      .in('sos_request_id', sosIds)

    for (const r of responses ?? []) {
      responseCountMap[r.sos_request_id] = (responseCountMap[r.sos_request_id] || 0) + 1
    }
  }

  return {
    requests: (data ?? []).map((s) => ({
      ...s,
      requester_name: requesterMap[s.requester_id] || 'Unknown',
      response_count: responseCountMap[s.id] || 0,
    })),
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

export async function getAdminSOSDetail(sosId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: sos } = await admin
    .from('sos_requests')
    .select('*')
    .eq('id', sosId)
    .single()

  if (!sos) throw new Error('SOS request not found')

  // Get requester profile
  const { data: requester } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, subscription_tier, location_city, location_state')
    .eq('id', sos.requester_id)
    .single()

  // Get all responses with responder profiles
  const { data: responses } = await admin
    .from('sos_responses')
    .select('*')
    .eq('sos_request_id', sosId)
    .order('created_at', { ascending: false })

  // Get responder profiles
  const responderIds = [...new Set((responses ?? []).map((r) => r.responder_id))]
  const responderMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {}

  if (responderIds.length > 0) {
    const { data: responders } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', responderIds)

    for (const r of responders ?? []) {
      responderMap[r.id] = r
    }
  }

  return {
    sos,
    requester,
    responses: (responses ?? []).map((r) => ({
      ...r,
      responder: responderMap[r.responder_id] || null,
    })),
  }
}

export async function getSOSStats() {
  await requireAdmin()
  const admin = createAdminClient()

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: openCount },
    { count: fulfilledCount },
    { data: recentSos },
  ] = await Promise.all([
    admin.from('sos_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('sos_requests').select('*', { count: 'exact', head: true }).eq('status', 'fulfilled'),
    admin
      .from('sos_requests')
      .select('id')
      .eq('status', 'active')
      .gte('created_at', oneWeekAgo),
  ])

  // Count SOSs this week with 0 responses
  let noMatchWeek = 0
  if (recentSos && recentSos.length > 0) {
    const recentIds = recentSos.map((s) => s.id)
    const { data: responsesThisWeek } = await admin
      .from('sos_responses')
      .select('sos_request_id')
      .in('sos_request_id', recentIds)

    const respondedIds = new Set((responsesThisWeek ?? []).map((r) => r.sos_request_id))
    noMatchWeek = recentIds.filter((id) => !respondedIds.has(id)).length
  }

  return {
    openCount: openCount ?? 0,
    fulfilledCount: fulfilledCount ?? 0,
    noMatchWeek,
  }
}

export async function adminUpdateSOS(
  sosId: string,
  updates: {
    status?: string
    expires_at?: string
  }
) {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { error } = await admin
    .from('sos_requests')
    .update(updates as { status?: 'expired' | 'active' | 'fulfilled' | 'cancelled'; expires_at?: string })
    .eq('id', sosId)

  if (error) throw new Error(error.message)

  await logAdminAction(
    profile.id,
    'update_sos',
    'sos',
    sosId,
    { updates }
  )

  return { success: true }
}

// ─── Moderation ─────────────────────────────────────────────────────

export async function getReportsQueue() {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: reports } = await admin
    .from('reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Get reporter names via second query
  const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id))]
  const reporterMap: Record<string, string> = {}

  if (reporterIds.length > 0) {
    const { data: reporters } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', reporterIds)

    for (const r of reporters ?? []) {
      reporterMap[r.id] = r.full_name ?? 'Unknown'
    }
  }

  return (reports ?? []).map((r) => ({
    ...r,
    reporter_name: reporterMap[r.reporter_id] || 'Unknown',
  }))
}

export async function adminResolveReport(
  reportId: string,
  resolution: 'dismissed' | 'warned' | 'removed' | 'banned'
) {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { error } = await admin
    .from('reports')
    .update({
      status: 'resolved',
      admin_notes: `Resolution: ${resolution}`,
    })
    .eq('id', reportId)

  if (error) throw new Error(error.message)

  await logAdminAction(
    profile.id,
    'resolve_report',
    'report',
    reportId,
    { resolution }
  )

  return { success: true }
}

export async function getDisputedReviews() {
  await requireAdmin()
  const admin = createAdminClient()

  // Get reports where target_type is 'review'
  const { data: reviewReports } = await admin
    .from('reports')
    .select('target_id')
    .eq('target_type', 'review')

  if (!reviewReports || reviewReports.length === 0) return []

  const reviewIds = [...new Set(reviewReports.map((r) => r.target_id))]

  const { data: reviews } = await admin
    .from('reviews')
    .select('*')
    .in('id', reviewIds)

  return reviews ?? []
}

// ─── SOS Demand Gap Analysis ─────────────────────────────────────────

export async function getSOSDemandGap() {
  await requireAdmin()
  const admin = createAdminClient()

  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Get all SOS requests from last 3 months
  const { data: allSos } = await admin
    .from('sos_requests')
    .select('id, equipment_category, equipment_subcategory, status, ai_categorized')
    .gte('created_at', threeMonthsAgo)

  if (!allSos || allSos.length === 0) {
    return { demandGaps: [], aiStats: { totalSos: 0, aiCategorized: 0 } }
  }

  // Get response counts
  const sosIds = allSos.map((s) => s.id)
  const { data: allResponses } = await admin
    .from('sos_responses')
    .select('sos_request_id')
    .in('sos_request_id', sosIds)

  const responseCounts = new Map<string, number>()
  for (const r of allResponses || []) {
    responseCounts.set(r.sos_request_id, (responseCounts.get(r.sos_request_id) || 0) + 1)
  }

  // Group by category
  const catStats = new Map<string, { total: number; responded: number; category: string }>()
  for (const sos of allSos) {
    const cat = sos.equipment_subcategory || sos.equipment_category
    const entry = catStats.get(cat) || { total: 0, responded: 0, category: cat }
    entry.total++
    if ((responseCounts.get(sos.id) || 0) > 0) entry.responded++
    catStats.set(cat, entry)
  }

  // Find demand gaps: high volume, low response rate
  const demandGaps = Array.from(catStats.values())
    .map((stat) => ({
      category: stat.category,
      totalSos: stat.total,
      responseRate: stat.total > 0 ? Math.round((stat.responded / stat.total) * 100) : 0,
    }))
    .filter((g) => g.totalSos >= 2)
    .sort((a, b) => a.responseRate - b.responseRate)
    .slice(0, 15)

  return {
    demandGaps,
    aiStats: {
      totalSos: allSos.length,
      aiCategorized: allSos.filter((s) => s.ai_categorized).length,
    },
  }
}

// ─── Churn Risk ─────────────────────────────────────────────────────

export async function getChurnRiskMap(): Promise<Record<string, { risk_score: number; risk_level: string }>> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data } = await admin
    .from('churn_risk')
    .select('user_id, risk_score, risk_level')
    .in('risk_level', ['at_risk', 'high_risk'])

  const map: Record<string, { risk_score: number; risk_level: string }> = {}
  for (const row of data || []) {
    if (row.user_id) map[row.user_id] = { risk_score: row.risk_score, risk_level: row.risk_level }
  }
  return map
}

export async function getChurnRiskDetail(userId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data } = await admin
    .from('churn_risk')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return data
}

// ─── Market Gap Reports ─────────────────────────────────────────────

export async function getMarketGapReports(limit = 5) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data } = await admin
    .from('market_gap_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

// ─── Weekly Briefs Archive ──────────────────────────────────────────

export async function getWeeklyBriefs(limit = 10) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data } = await admin
    .from('weekly_briefs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

// ─── Contact Credits (Admin) ────────────────────────────────────────

export async function getAdminUserCreditBalance(userId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const now = new Date()
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data } = await admin
    .from('contact_credits')
    .select('credits_remaining, credits_used_this_month, period_start')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .maybeSingle()

  // Get tier for monthly allowance info
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  return {
    creditsRemaining: data?.credits_remaining ?? 0,
    creditsUsed: data?.credits_used_this_month ?? 0,
    tier: profile?.subscription_tier || 'free',
    hasCreditRow: !!data,
  }
}

export async function adminGrantCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile: adminProfile } = await requireAdmin('manage_subscriptions')
    const admin = createAdminClient()

    const now = new Date()
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    // Get or create credit row
    const { data: existing } = await admin
      .from('contact_credits')
      .select('id, credits_remaining')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .maybeSingle()

    if (existing) {
      await admin
        .from('contact_credits')
        .update({
          credits_remaining: existing.credits_remaining + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await admin.from('contact_credits').insert({
        user_id: userId,
        credits_remaining: amount,
        credits_used_this_month: 0,
        period_start: periodStart,
      })
    }

    await logAdminAction(
      adminProfile.id,
      'grant_credits',
      'user',
      userId,
      { amount, admin_override: true }
    )

    return { success: true }
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getCreditSystemConfig() {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('system_config')
    .select('key, value')
    .in('key', ['credit_allowances', 'credit_extra_cost', 'credit_packs'])

  const config: Record<string, unknown> = {}
  for (const row of rows ?? []) {
    try {
      config[row.key] = typeof row.value === 'string' ? JSON.parse(row.value as string) : row.value
    } catch {
      // ignore
    }
  }

  return {
    allowances: (config.credit_allowances ?? { free: 0, pro: 25, business: 75, enterprise: -1 }) as Record<string, number>,
    extraCost: (config.credit_extra_cost ?? { free: 500, pro: 300, business: 200, enterprise: 0 }) as Record<string, number>,
    packs: (config.credit_packs ?? []) as Array<{ id: string; credits: number; priceCents: number; label: string }>,
  }
}

export async function updateCreditSystemConfig(
  key: 'credit_allowances' | 'credit_extra_cost' | 'credit_packs',
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile: adminProfile } = await requireAdmin('manage_subscriptions')
    const admin = createAdminClient()

    const jsonValue = JSON.stringify(value)

    const { error } = await admin
      .from('system_config')
      .upsert({ key, value: jsonValue }, { onConflict: 'key' })

    if (error) return { success: false, error: error.message }

    await logAdminAction(
      adminProfile.id,
      'update_credit_config',
      'system',
      key,
      { value }
    )

    return { success: true }
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Feed Post Moderation ───────────────────────────────────

export interface FeedPostReport {
  reportId: string
  postId: string
  postPreview: string
  postAuthor: string
  postCompany: string | null
  reportedBy: string
  reason: string
  reportedAt: string
}

export async function getFeedPostReports(params: {
  page: number
  limit: number
}): Promise<{ reports: FeedPostReport[]; total: number }> {
  await requireAdmin()
  const admin = createAdminClient()

  const { count } = await admin
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', 'feed_post')
    .eq('status', 'pending')

  const offset = (params.page - 1) * params.limit

  const { data: reports } = await admin
    .from('reports')
    .select('*')
    .eq('target_type', 'feed_post')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(offset, offset + params.limit - 1)

  if (!reports?.length) return { reports: [], total: count ?? 0 }

  const postIds = [...new Set(reports.map((r) => r.target_id))]
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))]

  const [{ data: posts }, { data: reporters }] = await Promise.all([
    admin
      .from('feed_posts')
      .select('id, content, author_id, company_id')
      .in('id', postIds),
    admin
      .from('profiles')
      .select('id, full_name')
      .in('id', reporterIds),
  ])

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id))]
  const companyIds = [...new Set((posts ?? []).map((p) => p.company_id).filter(Boolean))] as string[]

  const [{ data: authors }, companiesResult] = await Promise.all([
    admin.from('profiles').select('id, full_name').in('id', authorIds),
    companyIds.length > 0
      ? admin.from('company_profiles').select('id, name').in('id', companyIds)
      : Promise.resolve({ data: [] }),
  ])

  const postMap = new Map((posts ?? []).map((p) => [p.id, p]))
  const reporterMap = new Map((reporters ?? []).map((r) => [r.id, r.full_name ?? 'Unknown']))
  const authorMap = new Map((authors ?? []).map((a) => [a.id, a.full_name ?? 'Unknown']))
  const companyMap = new Map((companiesResult.data ?? []).map((c) => [c.id, c.name]))

  return {
    reports: reports.map((r) => {
      const post = postMap.get(r.target_id)
      return {
        reportId: r.id,
        postId: r.target_id,
        postPreview: post ? (post.content ?? '').slice(0, 80) : '[deleted]',
        postAuthor: post ? authorMap.get(post.author_id) ?? 'Unknown' : 'Unknown',
        postCompany: post?.company_id ? companyMap.get(post.company_id) ?? null : null,
        reportedBy: reporterMap.get(r.reporter_id) ?? 'Unknown',
        reason: r.reason,
        reportedAt: r.created_at,
      }
    }),
    total: count ?? 0,
  }
}

export async function adminSoftDeleteFeedPost(postId: string, adminId: string): Promise<void> {
  await requireAdmin('moderate')
  const admin = createAdminClient()

  const { error } = await admin
    .from('feed_posts')
    .update({ is_deleted: true })
    .eq('id', postId)

  if (error) throw new Error(error.message)

  await logAdminAction(adminId, 'feed_post_deleted', 'feed_post', postId)

  const { updateTag } = await import('next/cache')
  updateTag('feed-posts')
}
