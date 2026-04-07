'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { LISTING_CONDITIONS, EQUIPMENT_CATEGORIES } from '@/lib/constants'

const ALLOWED_FIELDS = [
  'title',
  'price_cents',
  'status',
  'condition',
  'category',
  'location_city',
  'location_state',
  'quantity',
  'sku',
  'description',
] as const

type AllowedField = (typeof ALLOWED_FIELDS)[number]

const VALID_STATUSES = ['active', 'draft', 'archived']
const VALID_CONDITIONS: string[] = LISTING_CONDITIONS.map((c) => c.value)

export async function saveListingCell(params: {
  listingId: string
  field: string
  value: string | number | null
}): Promise<{ success: boolean; error?: string }> {
  const { listingId, field, value } = params

  // Field allowlist
  if (!ALLOWED_FIELDS.includes(field as AllowedField)) {
    return { success: false, error: 'Invalid field' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const admin = createAdminClient()

  // Ownership check
  const { data: listing } = await admin
    .from('listings')
    .select('id, seller_id')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .neq('status', 'removed')
    .maybeSingle()

  if (!listing) return { success: false, error: 'Not found' }

  // Per-field validation
  switch (field) {
    case 'title': {
      if (typeof value !== 'string' || !value.trim()) return { success: false, error: 'Title is required' }
      if (value.length > 200) return { success: false, error: 'Title max 200 chars' }
      break
    }
    case 'price_cents': {
      if (value === null || value === '') {
        // Allow clearing price
        break
      }
      const num = typeof value === 'string' ? parseInt(value, 10) : value
      if (typeof num !== 'number' || isNaN(num) || num < 0) {
        return { success: false, error: 'Price must be 0 or more' }
      }
      break
    }
    case 'status': {
      if (!VALID_STATUSES.includes(value as string)) {
        return { success: false, error: 'Invalid status' }
      }
      break
    }
    case 'condition': {
      if (!VALID_CONDITIONS.includes(value as string)) {
        return { success: false, error: 'Invalid condition' }
      }
      break
    }
    case 'category': {
      if (!(EQUIPMENT_CATEGORIES as readonly string[]).includes(value as string)) {
        return { success: false, error: 'Invalid category' }
      }
      break
    }
    case 'location_city':
    case 'location_state':
    case 'sku': {
      if (value !== null && typeof value === 'string' && value.length > 100) {
        return { success: false, error: `${field} max 100 chars` }
      }
      break
    }
    case 'quantity': {
      if (value === null || value === '') break
      const qty = typeof value === 'string' ? parseInt(value, 10) : value
      if (typeof qty !== 'number' || isNaN(qty) || qty < 0) {
        return { success: false, error: 'Quantity must be 0 or more' }
      }
      break
    }
    case 'description': {
      if (typeof value === 'string' && value.length > 5000) {
        return { success: false, error: 'Description max 5000 chars' }
      }
      break
    }
  }

  // Coerce values
  let coerced: string | number | null = value
  if (field === 'price_cents') {
    coerced = value === null || value === '' ? null : typeof value === 'string' ? parseInt(value, 10) : value
  } else if (field === 'quantity') {
    coerced = value === null || value === '' ? null : typeof value === 'string' ? parseInt(value, 10) : value
  } else if ((field === 'sku' || field === 'location_city' || field === 'location_state') && value === '') {
    coerced = null
  }

  const { error } = await admin
    .from('listings')
    .update({ [field]: coerced, updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/listings')
  return { success: true }
}
