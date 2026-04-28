'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Not authorized')

  return { userId: user.id, admin }
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return false

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    return profile?.is_admin === true
  } catch {
    return false
  }
}

export async function getAdminStats() {
  const { admin } = await requireAdmin()

  const [usersRes, listingsRes, activeRes, subsRes, paymentsRes] =
    await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('listings').select('id', { count: 'exact', head: true }),
      admin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      admin
        .from('payments')
        .select('amount_cents')
        .eq('status', 'succeeded'),
    ])

  const totalRevenue = (paymentsRes.data ?? []).reduce(
    (sum, p) => sum + p.amount_cents,
    0
  )

  return {
    totalUsers: usersRes.count ?? 0,
    totalListings: listingsRes.count ?? 0,
    activeListings: activeRes.count ?? 0,
    activeSubscriptions: subsRes.count ?? 0,
    totalRevenue,
  }
}

export async function getAdminListings(
  page = 1,
  status?: string
) {
  const { admin } = await requireAdmin()
  const perPage = 20
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = admin
    .from('listings')
    .select(
      '*, profiles!listings_seller_id_fkey(full_name, display_name, email_notifications)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  return { listings: data ?? [], total: count ?? 0, page, perPage }
}

export async function getAdminUsers(page = 1) {
  const { admin } = await requireAdmin()
  const perPage = 20
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count, error } = await admin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

  return { users: data ?? [], total: count ?? 0, page, perPage }
}

export async function adminUpdateListingStatus(
  listingId: string,
  status: string
) {
  const { userId, admin } = await requireAdmin()

  const { error } = await admin
    .from('listings')
    .update({ status })
    .eq('id', listingId)

  if (error) throw new Error(error.message)

  await logAuditEvent(admin, userId, 'update_listing_status', 'listing', listingId, { status })

  return { success: true }
}

export async function adminToggleUserBan(targetUserId: string, ban: boolean) {
  const { userId: adminUserId, admin } = await requireAdmin()

  if (ban) {
    await admin
      .from('listings')
      .update({ status: 'removed' })
      .eq('seller_id', targetUserId)
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('bio')
    .eq('id', targetUserId)
    .single()

  if (ban) {
    await admin
      .from('profiles')
      .update({ bio: `[BANNED] ${profile?.bio ?? ''}` })
      .eq('id', targetUserId)
  } else {
    await admin
      .from('profiles')
      .update({
        bio: (profile?.bio ?? '').replace(/^\[BANNED\]\s*/, ''),
      })
      .eq('id', targetUserId)
  }

  await logAuditEvent(admin, adminUserId, ban ? 'ban_user' : 'unban_user', 'user', targetUserId, {})

  return { success: true }
}

export async function getSignupsByMonth() {
  const { admin } = await requireAdmin()

  // Get profiles from last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data } = await admin
    .from('profiles')
    .select('created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true })

  // Group by month
  const months: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = (months[key] ?? 0) + 1
  }

  return Object.entries(months).map(([month, count]) => ({ month, count }))
}

export async function getListingsByMonth() {
  const { admin } = await requireAdmin()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data } = await admin
    .from('listings')
    .select('created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true })

  const months: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = (months[key] ?? 0) + 1
  }

  return Object.entries(months).map(([month, count]) => ({ month, count }))
}

// --- Audit Log ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAuditEvent(admin: any, adminId: string, action: string, targetType: string, targetId: string, details: Record<string, string | number | boolean | null>) {
  await admin.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details as Json,
  })
}

export async function getAuditLog(page = 1) {
  const { admin } = await requireAdmin()
  const perPage = 20
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count, error } = await admin
    .from('admin_audit_log')
    .select('*, profiles!admin_audit_log_admin_id_fkey(full_name, display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { logs: data ?? [], total: count ?? 0, page, perPage }
}

// --- Reports / Moderation Queue ---

export async function getReports(page = 1, status?: string) {
  const { admin } = await requireAdmin()
  const perPage = 20
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = admin
    .from('reports')
    .select('*, profiles!reports_reporter_id_fkey(full_name, display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { reports: data ?? [], total: count ?? 0, page, perPage }
}

export async function resolveReport(reportId: string, action: 'resolved' | 'dismissed', adminNotes?: string) {
  const { userId, admin } = await requireAdmin()

  const { error } = await admin
    .from('reports')
    .update({ status: action, admin_notes: adminNotes ?? null })
    .eq('id', reportId)

  if (error) throw new Error(error.message)

  await logAuditEvent(admin, userId, `report_${action}`, 'report', reportId, { admin_notes: adminNotes ?? '' })

  return { success: true }
}

// --- Bulk Actions ---

export async function bulkUpdateListingStatus(listingIds: string[], status: string) {
  const { userId, admin } = await requireAdmin()

  const { error } = await admin
    .from('listings')
    .update({ status })
    .in('id', listingIds)

  if (error) throw new Error(error.message)

  await logAuditEvent(admin, userId, 'bulk_update_listings', 'listing', listingIds.join(','), { status, count: listingIds.length })

  return { success: true }
}

export async function bulkBanUsers(userIds: string[], ban: boolean) {
  const { userId: adminUserId, admin } = await requireAdmin()

  for (const targetId of userIds) {
    if (ban) {
      await admin.from('listings').update({ status: 'removed' }).eq('seller_id', targetId)
    }
    const { data: profile } = await admin.from('profiles').select('bio').eq('id', targetId).single()
    if (ban) {
      await admin.from('profiles').update({ bio: `[BANNED] ${profile?.bio ?? ''}` }).eq('id', targetId)
    } else {
      await admin.from('profiles').update({ bio: (profile?.bio ?? '').replace(/^\[BANNED\]\s*/, '') }).eq('id', targetId)
    }
  }

  await logAuditEvent(admin, adminUserId, ban ? 'bulk_ban_users' : 'bulk_unban_users', 'user', userIds.join(','), { count: userIds.length })

  return { success: true }
}

// --- Revenue by Month ---

export async function getRevenueByMonth() {
  const { admin } = await requireAdmin()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data } = await admin
    .from('payments')
    .select('amount_cents, created_at')
    .eq('status', 'succeeded')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true })

  const months: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = (months[key] ?? 0) + row.amount_cents
  }

  return Object.entries(months).map(([month, amount]) => ({ month, amount }))
}

// --- Top Categories ---

export async function getTopCategories() {
  const { admin } = await requireAdmin()

  const { data } = await admin
    .from('listings')
    .select('category')
    .eq('status', 'active')

  const categories: Record<string, number> = {}
  for (const row of data ?? []) {
    categories[row.category] = (categories[row.category] ?? 0) + 1
  }

  return Object.entries(categories)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

// --- CSV Export ---

export async function exportListingsCSV() {
  const { admin } = await requireAdmin()

  const { data } = await admin
    .from('listings')
    .select('id, title, category, industries, condition, price_cents, status, location_city, location_state, views_count, favorites_count, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (!data || data.length === 0) return { csv: '' }

  const headers = ['ID', 'Title', 'Category', 'Industries', 'Condition', 'Price', 'Status', 'City', 'State', 'Views', 'Favorites', 'Created']
  const rows = data.map((l) => [
    l.id,
    `"${(l.title ?? '').replace(/"/g, '""')}"`,
    l.category,
    Array.isArray(l.industries) ? l.industries.join('; ') : '',
    l.condition,
    l.price_cents ? (l.price_cents / 100).toFixed(2) : '0',
    l.status,
    l.location_city ?? '',
    l.location_state ?? '',
    l.views_count,
    l.favorites_count,
    l.created_at,
  ].join(','))

  return { csv: [headers.join(','), ...rows].join('\n') }
}

export async function exportUsersCSV() {
  const { admin } = await requireAdmin()

  const { data } = await admin
    .from('profiles')
    .select('id, full_name, display_name, company_name, location_city, location_state, subscription_tier, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (!data || data.length === 0) return { csv: '' }

  const headers = ['ID', 'Name', 'Display Name', 'Company', 'City', 'State', 'Tier', 'Joined']
  const rows = data.map((u) => [
    u.id,
    `"${(u.full_name ?? '').replace(/"/g, '""')}"`,
    `"${(u.display_name ?? '').replace(/"/g, '""')}"`,
    `"${(u.company_name ?? '').replace(/"/g, '""')}"`,
    u.location_city ?? '',
    u.location_state ?? '',
    u.subscription_tier ?? 'free',
    u.created_at,
  ].join(','))

  return { csv: [headers.join(','), ...rows].join('\n') }
}

// --- Content Flagging ---

const FLAGGED_WORDS = [
  'scam', 'fraud', 'fake', 'stolen', 'counterfeit', 'illegal',
  'replica', 'knockoff', 'phishing', 'money laundering',
]

export async function checkContentFlags(title: string, description: string): Promise<string[]> {
  const text = `${title} ${description}`.toLowerCase()
  return FLAGGED_WORDS.filter((word) => text.includes(word))
}

export async function getFlaggedListings() {
  const { admin } = await requireAdmin()

  const { data } = await admin
    .from('listings')
    .select('id, title, description, category, status, created_at, profiles!listings_seller_id_fkey(full_name, display_name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!data) return { flagged: [] }

  const flagged = data.filter((l) => {
    const text = `${l.title} ${l.description ?? ''}`.toLowerCase()
    return FLAGGED_WORDS.some((word) => text.includes(word))
  }).map((l) => {
    const text = `${l.title} ${l.description ?? ''}`.toLowerCase()
    const matchedWords = FLAGGED_WORDS.filter((word) => text.includes(word))
    return { ...l, flaggedWords: matchedWords }
  })

  return { flagged }
}
