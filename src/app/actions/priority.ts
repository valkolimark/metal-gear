'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/app/(admin)/admin/actions'
import { type BoostType } from '@/lib/constants'

// ─── Company Priority Tiers ────────────────────────────────────────

export async function getCompanyTiers(params: {
  page?: number
  search?: string
  tier?: string
}) {
  await requireAdmin('set_priority')
  const admin = createAdminClient()
  const page = params.page ?? 1
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = admin
    .from('profiles')
    .select(
      'id, full_name, company_name, avatar_url, priority_tier, priority_score, priority_set_by, priority_set_at',
      { count: 'exact' }
    )

  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,company_name.ilike.%${params.search}%`)
  }
  if (params.tier && params.tier !== 'all') {
    query = query.eq('priority_tier', params.tier as 'standard' | 'preferred' | 'featured' | 'platinum')
  }

  const { data, count } = await query
    .order('priority_score', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Get listing counts
  const userIds = (data ?? []).map((u) => u.id)
  const listingCountMap: Record<string, number> = {}

  if (userIds.length > 0) {
    const { data: listings } = await admin
      .from('listings')
      .select('seller_id')
      .in('seller_id', userIds)
      .eq('status', 'active')

    for (const l of listings ?? []) {
      listingCountMap[l.seller_id] = (listingCountMap[l.seller_id] || 0) + 1
    }
  }

  // Get setter names
  const setterIds = [...new Set((data ?? []).filter((u) => u.priority_set_by).map((u) => u.priority_set_by!))]
  const setterMap: Record<string, string> = {}
  if (setterIds.length > 0) {
    const { data: setters } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', setterIds)
    for (const s of setters ?? []) {
      setterMap[s.id] = s.full_name ?? 'Unknown'
    }
  }

  return {
    companies: (data ?? []).map((u) => ({
      ...u,
      listing_count: listingCountMap[u.id] || 0,
      set_by_name: u.priority_set_by ? (setterMap[u.priority_set_by] || 'Unknown') : null,
    })),
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

export async function updateCompanyTier(
  userId: string,
  tier: 'standard' | 'preferred' | 'featured' | 'platinum',
  score: number
) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({
      priority_tier: tier,
      priority_score: Math.min(1000, Math.max(0, score)),
      priority_set_by: profile.id,
      priority_set_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'update_priority_tier', 'user', userId, { tier, score })
  return { success: true }
}

// ─── Active Boosts Overview ────────────────────────────────────────

export async function getAllActiveBoosts(params: {
  page?: number
  boostType?: string
  search?: string
}) {
  await requireAdmin('set_priority')
  const admin = createAdminClient()
  const page = params.page ?? 1
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = admin
    .from('boost_purchases')
    .select('*', { count: 'exact' })
    .eq('status', 'active')

  if (params.boostType && params.boostType !== 'all') {
    query = query.eq('boost_type', params.boostType)
  }

  const { data, count } = await query
    .order('expires_at', { ascending: true })
    .range(offset, offset + perPage - 1)

  // Get user/listing names
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

  return {
    boosts: (data ?? []).map((b) => ({
      ...b,
      user_name: userMap[b.user_id] || 'Unknown',
      listing_title: b.listing_id ? (listingMap[b.listing_id] || 'Unknown') : null,
    })),
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

export async function adminCancelBoost(boostId: string, refund: boolean) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  await admin
    .from('boost_purchases')
    .update({ status: refund ? 'refunded' : 'cancelled' })
    .eq('id', boostId)

  await logAdminAction(profile.id, 'cancel_boost', 'boost', boostId, { refund })
  return { success: true }
}

export async function adminExtendBoost(boostId: string, extraDays: number) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  const { data: boost } = await admin
    .from('boost_purchases')
    .select('expires_at')
    .eq('id', boostId)
    .single()

  if (!boost) throw new Error('Boost not found')

  const newExpiry = new Date(boost.expires_at)
  newExpiry.setDate(newExpiry.getDate() + extraDays)

  await admin
    .from('boost_purchases')
    .update({
      expires_at: newExpiry.toISOString(),
      duration_days: extraDays,
    })
    .eq('id', boostId)

  await logAdminAction(profile.id, 'extend_boost', 'boost', boostId, { extraDays })
  return { success: true }
}

export async function adminGrantFreeBoost(
  userId: string,
  boostType: BoostType,
  durationDays: number,
  listingId?: string
) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + durationDays)

  const { error } = await admin.from('boost_purchases').insert({
    user_id: userId,
    listing_id: listingId || null,
    boost_type: boostType,
    amount_cents: 0,
    duration_days: durationDays,
    expires_at: expiresAt.toISOString(),
    status: 'active',
    admin_override: true,
  })

  if (error) throw new Error(error.message)

  // Apply boost effects
  if (listingId && (boostType === 'listing_featured' || boostType === 'category_pin')) {
    const updates: Record<string, unknown> = {}
    if (boostType === 'listing_featured') {
      updates.is_featured = true
      updates.featured_until = expiresAt.toISOString()
    }
    await admin.from('listings').update(updates).eq('id', listingId)
  }

  await logAdminAction(profile.id, 'grant_free_boost', 'user', userId, { boostType, durationDays, listingId })
  return { success: true }
}

// ─── Homepage Featured Slots ───────────────────────────────────────

export async function getHomepageFeaturedSlots() {
  await requireAdmin('set_priority')
  const admin = createAdminClient()

  const { data } = await admin
    .from('homepage_featured_slots')
    .select('*')
    .eq('active', true)
    .order('position', { ascending: true })

  // Resolve target names
  const slots = data ?? []
  const listingIds = slots.filter((s) => s.slot_type === 'listing').map((s) => s.target_id)
  const profileIds = slots.filter((s) => s.slot_type === 'company').map((s) => s.target_id)

  const nameMap: Record<string, string> = {}

  if (listingIds.length > 0) {
    const { data: listings } = await admin.from('listings').select('id, title').in('id', listingIds)
    for (const l of listings ?? []) nameMap[l.id] = l.title
  }
  if (profileIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, full_name, company_name').in('id', profileIds)
    for (const p of profiles ?? []) nameMap[p.id] = p.company_name || p.full_name || 'Unknown'
  }

  return {
    slots: slots.map((s) => ({
      ...s,
      target_name: nameMap[s.target_id] || s.target_id,
    })),
  }
}

export async function addHomepageSlot(
  slotType: 'listing' | 'company' | 'category_banner',
  targetId: string,
  label?: string,
  endsAt?: string
) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  // Get next position
  const { data: existing } = await admin
    .from('homepage_featured_slots')
    .select('position')
    .eq('active', true)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 1

  const { error } = await admin.from('homepage_featured_slots').insert({
    slot_type: slotType,
    target_id: targetId,
    position: nextPosition,
    label: label || null,
    ends_at: endsAt || null,
    created_by: profile.id,
  })

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'add_homepage_slot', 'homepage_slot', targetId, { slotType, label })
  return { success: true }
}

export async function removeHomepageSlot(slotId: string) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  await admin
    .from('homepage_featured_slots')
    .update({ active: false })
    .eq('id', slotId)

  await logAdminAction(profile.id, 'remove_homepage_slot', 'homepage_slot', slotId, {})
  return { success: true }
}

export async function reorderHomepageSlots(slotIds: string[]) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  // Update positions based on array order
  await Promise.all(
    slotIds.map((id, index) =>
      admin
        .from('homepage_featured_slots')
        .update({ position: index + 1 })
        .eq('id', id)
    )
  )

  await logAdminAction(profile.id, 'reorder_homepage_slots', 'homepage_slot', '', { order: slotIds })
  return { success: true }
}

// ─── Category Pins ─────────────────────────────────────────────────

export async function getCategoryPins() {
  await requireAdmin('set_priority')
  const admin = createAdminClient()

  const { data } = await admin
    .from('listings')
    .select('id, title, category, pinned_position, pinned_category, featured_until')
    .not('pinned_position', 'is', null)
    .order('pinned_category', { ascending: true })
    .order('pinned_position', { ascending: true })

  return { pins: data ?? [] }
}

export async function setCategoryPin(
  listingId: string,
  category: string,
  position: number,
  endDate?: string
) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  const { error } = await admin
    .from('listings')
    .update({
      pinned_position: position,
      pinned_category: category,
      featured_until: endDate || null,
    })
    .eq('id', listingId)

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'set_category_pin', 'listing', listingId, { category, position })
  return { success: true }
}

export async function removeCategoryPin(listingId: string) {
  const { profile } = await requireAdmin('set_priority')
  const admin = createAdminClient()

  await admin
    .from('listings')
    .update({
      pinned_position: null,
      pinned_category: null,
    })
    .eq('id', listingId)

  await logAdminAction(profile.id, 'remove_category_pin', 'listing', listingId, {})
  return { success: true }
}
