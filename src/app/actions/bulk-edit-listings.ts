'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTier } from '@/app/actions/tier'
import { revalidatePath } from 'next/cache'

export type BulkEditField =
  | { field: 'status'; value: 'active' | 'draft' | 'archived' }
  | { field: 'price'; mode: 'fixed'; value: number }
  | { field: 'price'; mode: 'percent'; value: number }
  | { field: 'condition'; value: string }
  | { field: 'category'; value: string }
  | { field: 'location'; city: string; state: string }

export interface BulkEditResult {
  success: boolean
  updatedCount: number
  skippedCount?: number
  error?: string
}

const PRO_TIERS = ['pro', 'business', 'enterprise', 'premium', 'boost']

export async function bulkEditListings(
  ids: string[],
  fields: BulkEditField[]
): Promise<BulkEditResult> {
  if (ids.length === 0) return { success: false, updatedCount: 0, error: 'No listings selected' }
  if (ids.length > 1000) return { success: false, updatedCount: 0, error: 'Cannot edit more than 1000 listings at once' }
  if (fields.length === 0) return { success: false, updatedCount: 0, error: 'No fields to update' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, updatedCount: 0, error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get active company from profile
  const { data: profile } = await admin
    .from('profiles')
    .select('active_company_id')
    .eq('id', user.id)
    .single()

  const tier = await getActiveTier(user.id, profile?.active_company_id)
  const isPro = PRO_TIERS.includes(tier)

  // Strip Pro-only fields for free tier
  const allowedFields = isPro
    ? fields
    : fields.filter((f) => f.field === 'status')

  if (allowedFields.length === 0) {
    return {
      success: false,
      updatedCount: 0,
      error: 'Upgrade to Pro to bulk edit price, condition, category, and location.',
    }
  }

  // Verify ownership — listings must belong to the current user
  const { data: owned } = await admin
    .from('listings')
    .select('id, price_cents')
    .eq('seller_id', user.id)
    .neq('status', 'removed')
    .in('id', ids)

  const ownedListings = owned ?? []
  if (ownedListings.length === 0) {
    return { success: false, updatedCount: 0, error: 'No authorized listings found' }
  }

  const verifiedIds = ownedListings.map((l) => l.id)
  let skippedCount = 0

  // Separate percent-price from other fields
  const percentPriceField = allowedFields.find(
    (f): f is Extract<BulkEditField, { field: 'price'; mode: 'percent' }> =>
      f.field === 'price' && 'mode' in f && f.mode === 'percent'
  )

  // Build flat update object for non-percent fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateObj: Record<string, any> = { updated_at: new Date().toISOString() }

  for (const f of allowedFields) {
    if (f.field === 'price' && 'mode' in f && f.mode === 'percent') continue // handled separately

    switch (f.field) {
      case 'status':
        updateObj.status = f.value
        break
      case 'price':
        if ('mode' in f && f.mode === 'fixed') {
          updateObj.price_cents = Math.max(100, Math.round(f.value * 100))
          updateObj.contact_for_price = false
        }
        break
      case 'condition':
        updateObj.condition = f.value
        break
      case 'category':
        updateObj.category = f.value
        break
      case 'location':
        updateObj.location_city = f.city
        updateObj.location_state = f.state
        break
    }
  }

  // Apply flat update (has at least updated_at)
  const hasNonPercentFields = Object.keys(updateObj).length > 1
  if (hasNonPercentFields) {
    const { error } = await admin
      .from('listings')
      .update(updateObj)
      .in('id', verifiedIds)

    if (error) return { success: false, updatedCount: 0, error: error.message }
  }

  // Apply percent price change
  if (percentPriceField) {
    const pct = percentPriceField.value
    if (pct < -99 || pct > 99) {
      return { success: false, updatedCount: 0, error: 'Percent change must be between -99 and 99' }
    }

    const multiplier = 1 + pct / 100
    const listingsWithPrice = ownedListings.filter((l) => l.price_cents && l.price_cents > 0)
    const nullPriceCount = verifiedIds.length - listingsWithPrice.length
    skippedCount += nullPriceCount

    if (listingsWithPrice.length > 0) {
      // Update each listing's price individually
      const updates = listingsWithPrice.map((l) => {
        const newPrice = Math.max(100, Math.round(l.price_cents! * multiplier))
        return admin
          .from('listings')
          .update({ price_cents: newPrice, contact_for_price: false, updated_at: new Date().toISOString() })
          .eq('id', l.id)
      })
      await Promise.all(updates)
    }
  }

  revalidatePath('/listings')
  return {
    success: true,
    updatedCount: verifiedIds.length,
    skippedCount: skippedCount > 0 ? skippedCount : undefined,
  }
}
