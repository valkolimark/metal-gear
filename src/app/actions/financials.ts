'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/permissions'
import { TIER_PRICES } from '@/lib/constants'

// ─── KPI Metrics ────────────────────────────────────────────────────

export async function getFinancialKPIs() {
  await requireAdmin('view_financials')
  const admin = createAdminClient()

  // Get active subscriptions for MRR
  const { data: subs } = await admin
    .from('subscriptions')
    .select('tier, status, user_id')
    .eq('status', 'active')

  const activeSubs = subs ?? []
  const mrrCents = activeSubs.reduce((acc, s) => {
    return acc + (TIER_PRICES[s.tier as keyof typeof TIER_PRICES] || 0)
  }, 0)

  // Total users for ARPU
  const { count: totalUsers } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  // Boost revenue (all time and this month)
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const { data: allBoosts } = await admin
    .from('boost_purchases')
    .select('amount_cents, created_at')
    .neq('status', 'refunded')

  const boostRevenueTotal = (allBoosts ?? []).reduce((acc, b) => acc + b.amount_cents, 0)
  const boostRevenueMonth = (allBoosts ?? []).filter(
    (b) => new Date(b.created_at || '') >= firstOfMonth
  ).reduce((acc, b) => acc + b.amount_cents, 0)

  // Churn: cancelled in last 30 days / total at start
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: cancelledCount } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'canceled')
    .gte('canceled_at', thirtyDaysAgo)

  const totalPaid = activeSubs.length + (cancelledCount ?? 0)
  const churnRate = totalPaid > 0 ? ((cancelledCount ?? 0) / totalPaid) * 100 : 0
  const retentionRate = 100 - churnRate

  // ARPU
  const arpu = (totalUsers ?? 0) > 0 ? mrrCents / (totalUsers ?? 1) : 0

  return {
    mrrCents,
    arrCents: mrrCents * 12,
    boostRevenueCents: boostRevenueMonth,
    boostRevenueTotalCents: boostRevenueTotal,
    retentionRate: Math.round(retentionRate * 10) / 10,
    churnRate: Math.round(churnRate * 10) / 10,
    arpuCents: Math.round(arpu),
    totalPaidSubs: activeSubs.length,
    premiumCount: activeSubs.filter((s) => s.tier === 'premium').length,
    boostCount: activeSubs.filter((s) => s.tier === 'boost').length,
    freeCount: (totalUsers ?? 0) - activeSubs.length,
    totalUsers: totalUsers ?? 0,
  }
}

// ─── Revenue by Month ───────────────────────────────────────────────

export async function getRevenueByMonth() {
  await requireAdmin('view_financials')
  const admin = createAdminClient()

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const { data: payments } = await admin
    .from('payments')
    .select('amount_cents, created_at, description')
    .eq('status', 'succeeded')
    .gte('created_at', twelveMonthsAgo.toISOString())

  const { data: boosts } = await admin
    .from('boost_purchases')
    .select('amount_cents, created_at')
    .neq('status', 'refunded')
    .gte('created_at', twelveMonthsAgo.toISOString())

  // Group by month
  const months: Record<string, { subscriptions: number; boosts: number }> = {}
  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = { subscriptions: 0, boosts: 0 }
  }

  for (const p of payments ?? []) {
    const key = p.created_at.slice(0, 7)
    if (months[key]) months[key].subscriptions += p.amount_cents
  }

  for (const b of boosts ?? []) {
    const key = (b.created_at || '').slice(0, 7)
    if (months[key]) months[key].boosts += b.amount_cents
  }

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      subscriptions: data.subscriptions / 100,
      boosts: data.boosts / 100,
      total: (data.subscriptions + data.boosts) / 100,
    }))
}

// ─── Subscriptions Table ────────────────────────────────────────────

export async function getSubscriptionsTable(params: {
  page?: number
  plan?: string
  status?: string
}) {
  await requireAdmin('view_financials')
  const admin = createAdminClient()
  const page = params.page ?? 1
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = admin
    .from('subscriptions')
    .select('*', { count: 'exact' })

  if (params.plan && params.plan !== 'all') {
    query = query.eq('tier', params.plan)
  }
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Get user names
  const userIds = [...new Set((data ?? []).map((s) => s.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await admin.from('profiles').select('id, full_name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.full_name ?? 'Unknown'
  }

  return {
    subscriptions: (data ?? []).map((s) => ({
      ...s,
      user_name: userMap[s.user_id] || 'Unknown',
    })),
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

// ─── Boost Revenue Table ────────────────────────────────────────────

export async function getBoostRevenueTable(params: { page?: number }) {
  await requireAdmin('view_financials')
  const admin = createAdminClient()
  const page = params.page ?? 1
  const perPage = 50
  const offset = (page - 1) * perPage

  const { data, count } = await admin
    .from('boost_purchases')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  const userIds = [...new Set((data ?? []).map((b) => b.user_id))]
  const listingIds = [...new Set((data ?? []).filter((b) => b.listing_id).map((b) => b.listing_id!))]
  const userMap: Record<string, string> = {}
  const listingMap: Record<string, string> = {}

  if (userIds.length > 0) {
    const { data: users } = await admin.from('profiles').select('id, full_name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.full_name ?? 'Unknown'
  }
  if (listingIds.length > 0) {
    const { data: listings } = await admin.from('listings').select('id, title').in('id', listingIds)
    for (const l of listings ?? []) listingMap[l.id] = l.title
  }

  // Get totals
  const { data: allBoosts } = await admin
    .from('boost_purchases')
    .select('amount_cents, status')

  const totalRevenue = (allBoosts ?? [])
    .filter((b) => b.status !== 'refunded')
    .reduce((acc, b) => acc + b.amount_cents, 0)

  return {
    boosts: (data ?? []).map((b) => ({
      ...b,
      user_name: userMap[b.user_id] || 'Unknown',
      listing_title: b.listing_id ? (listingMap[b.listing_id] || 'Unknown') : null,
    })),
    total: count ?? 0,
    totalRevenueCents: totalRevenue,
    page,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

// ─── Failed Payments ────────────────────────────────────────────────

export async function getFailedPayments() {
  await requireAdmin('view_financials')
  const admin = createAdminClient()

  const { data } = await admin
    .from('payments')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50)

  const userIds = [...new Set((data ?? []).map((p) => p.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await admin.from('profiles').select('id, full_name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.full_name ?? 'Unknown'
  }

  return (data ?? []).map((p) => ({
    ...p,
    user_name: userMap[p.user_id] || 'Unknown',
  }))
}

// ─── CSV Export ─────────────────────────────────────────────────────

export async function exportSubscriptionsCSV() {
  await requireAdmin('export_data')
  const admin = createAdminClient()

  const { data } = await admin
    .from('subscriptions')
    .select('user_id, tier, status, stripe_subscription_id, current_period_start, current_period_end, created_at')
    .order('created_at', { ascending: false })

  const userIds = [...new Set((data ?? []).map((s) => s.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await admin.from('profiles').select('id, full_name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.full_name ?? 'Unknown'
  }

  const header = 'User,Plan,Status,Stripe ID,Period Start,Period End,Created'
  const rows = (data ?? []).map((s) =>
    [userMap[s.user_id] || 'Unknown', s.tier, s.status, s.stripe_subscription_id, s.current_period_start, s.current_period_end, s.created_at].join(',')
  )

  return header + '\n' + rows.join('\n')
}

export async function exportBoostsCSV() {
  await requireAdmin('export_data')
  const admin = createAdminClient()

  const { data } = await admin
    .from('boost_purchases')
    .select('user_id, boost_type, listing_id, amount_cents, duration_days, starts_at, expires_at, status, admin_override, created_at')
    .order('created_at', { ascending: false })

  const userIds = [...new Set((data ?? []).map((b) => b.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await admin.from('profiles').select('id, full_name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.full_name ?? 'Unknown'
  }

  const header = 'User,Boost Type,Listing ID,Amount,Duration Days,Starts,Expires,Status,Admin Override,Created'
  const rows = (data ?? []).map((b) =>
    [userMap[b.user_id] || 'Unknown', b.boost_type, b.listing_id || '', (b.amount_cents / 100).toFixed(2), b.duration_days, b.starts_at, b.expires_at, b.status, b.admin_override, b.created_at].join(',')
  )

  return header + '\n' + rows.join('\n')
}
