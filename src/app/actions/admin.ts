'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    await requireAdmin()
    return true
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
  const { admin } = await requireAdmin()

  const { error } = await admin
    .from('listings')
    .update({ status })
    .eq('id', listingId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function adminToggleUserBan(userId: string, ban: boolean) {
  const { admin } = await requireAdmin()

  // Set subscription_tier to 'free' and mark as banned via a convention
  // We use a soft ban: set status of all their listings to 'removed'
  if (ban) {
    await admin
      .from('listings')
      .update({ status: 'removed' })
      .eq('seller_id', userId)
  }

  // Update a flag — we'll use the bio field with a prefix for now
  // A proper solution would add a banned_at column, but keeping it simple
  const { data: profile } = await admin
    .from('profiles')
    .select('bio')
    .eq('id', userId)
    .single()

  if (ban) {
    await admin
      .from('profiles')
      .update({ bio: `[BANNED] ${profile?.bio ?? ''}` })
      .eq('id', userId)
  } else {
    await admin
      .from('profiles')
      .update({
        bio: (profile?.bio ?? '').replace(/^\[BANNED\]\s*/, ''),
      })
      .eq('id', userId)
  }

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
