'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns count of active listings belonging to the company
 * that have no media attached.
 */
export async function getHiddenListingCount(companyId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active')
    .eq('has_media', false)
  return count ?? 0
}

/**
 * Returns whether a specific listing is hidden due to missing media.
 * Used by the listing detail page to show the seller warning.
 */
export async function isListingHiddenFromPublic(listingId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('listings')
    .select('has_media, status')
    .eq('id', listingId)
    .single()
  return data?.status === 'active' && data?.has_media === false
}
