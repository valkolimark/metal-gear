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
    admin.from('sos_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
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
      .eq('status', 'open')
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
    created_at: string
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

  return feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 30)
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
