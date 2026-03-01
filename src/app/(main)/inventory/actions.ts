'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getInventory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('listings')
    .select('id, title, category, status, price_cents, quantity, sku, warehouse_location, views_count, favorites_count, created_at, contact_for_price')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { items: data ?? [] }
}

export async function bulkUpdateInventory(
  ids: string[],
  action: string,
  value: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (ids.length === 0) return { error: 'No items selected' }

  const admin = createAdminClient()

  // Verify ownership
  const { data: listings } = await admin
    .from('listings')
    .select('id')
    .eq('seller_id', user.id)
    .in('id', ids)

  const ownedIds = (listings ?? []).map(l => l.id)
  if (ownedIds.length === 0) return { error: 'No authorized listings' }

  let updateData: Record<string, unknown> = {}

  switch (action) {
    case 'status_active':
      updateData = { status: 'active' }
      break
    case 'status_draft':
      updateData = { status: 'draft' }
      break
    case 'adjust_price': {
      const priceCents = Math.round(parseFloat(value) * 100)
      if (isNaN(priceCents) || priceCents < 0) return { error: 'Invalid price' }
      updateData = { price_cents: priceCents }
      break
    }
    case 'adjust_quantity': {
      const qty = parseInt(value)
      if (isNaN(qty) || qty < 0) return { error: 'Invalid quantity' }
      updateData = { quantity: qty }
      break
    }
    default:
      return { error: 'Unknown action' }
  }

  const { error } = await admin
    .from('listings')
    .update(updateData)
    .in('id', ownedIds)

  if (error) return { error: error.message }
  return { success: true, updated: ownedIds.length }
}
