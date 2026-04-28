'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { LISTING_CONDITIONS } from '@/lib/constants'
import { getTier2ById } from '@/lib/constants/equipment-taxonomy'
import {
  INDUSTRY_OPTIONS,
  OTHER_INDUSTRY_PREFIX,
} from '@/lib/constants/onboarding'

const ALLOWED_FIELDS = [
  'title',
  'price_cents',
  'status',
  'condition',
  'category',
  'industries',
  'location_city',
  'location_state',
  'quantity',
  'sku',
  'description',
] as const

type AllowedField = (typeof ALLOWED_FIELDS)[number]

const VALID_STATUSES = ['active', 'draft', 'archived']
const VALID_CONDITIONS: string[] = LISTING_CONDITIONS.map((c) => c.value)
const INDUSTRY_SET: Set<string> = new Set(INDUSTRY_OPTIONS as readonly string[])

export async function saveListingCell(params: {
  listingId: string
  field: string
  value: string | number | string[] | null
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
      // Cycle 64: accept tier-2 taxonomy ids OR legacy free-text labels
      // (legacy rows still hold strings like "CNC Machines"). Reject empty.
      if (typeof value !== 'string' || value.trim().length === 0) {
        return { success: false, error: 'Category required' }
      }
      // Tier-2 ids resolve via getTier2ById; legacy labels are accepted as-is
      // up to a sane length. The form layer steers users toward tier-2 ids.
      if (!getTier2ById(value) && value.length > 80) {
        return { success: false, error: 'Category too long' }
      }
      break
    }
    case 'industries': {
      if (!Array.isArray(value)) {
        return { success: false, error: 'industries must be an array' }
      }
      if (value.length > 5) {
        return { success: false, error: 'Max 5 industries' }
      }
      for (const v of value) {
        if (typeof v !== 'string' || v.length === 0 || v.length > 80) {
          return { success: false, error: 'Invalid industry value' }
        }
        if (v.startsWith(OTHER_INDUSTRY_PREFIX)) continue
        if (!INDUSTRY_SET.has(v)) {
          return { success: false, error: `Unknown industry: ${v}` }
        }
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
  let coerced: string | number | string[] | null = value as string | number | string[] | null
  if (field === 'price_cents') {
    coerced = value === null || value === '' ? null : typeof value === 'string' ? parseInt(value, 10) : (value as number)
  } else if (field === 'quantity') {
    coerced = value === null || value === '' ? null : typeof value === 'string' ? parseInt(value, 10) : (value as number)
  } else if ((field === 'sku' || field === 'location_city' || field === 'location_state') && value === '') {
    coerced = null
  }

  // Cycle 64: keep legacy `industry` in sync with `industries[0]` until the
  // column is dropped in Cycle 65. Single update preserves atomicity.
  const updatePayload: Record<string, unknown> = {
    [field]: coerced,
    updated_at: new Date().toISOString(),
  }
  if (field === 'industries' && Array.isArray(coerced)) {
    updatePayload.industry = coerced[0] ?? null
  }

  const { error } = await admin
    .from('listings')
    .update(updatePayload)
    .eq('id', listingId)
    .eq('seller_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/listings')
  return { success: true }
}
