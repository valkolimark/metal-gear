'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function markFreshnessSuggestionActedOn(listingId: string) {
  const supabase = createAdminClient()

  await Promise.all([
    supabase
      .from('listing_freshness_suggestions')
      .update({
        acted_on: true,
        acted_on_at: new Date().toISOString(),
      })
      .eq('listing_id', listingId)
      .eq('acted_on', false),
    supabase
      .from('listings')
      .update({ refreshed_at: new Date().toISOString() })
      .eq('id', listingId),
  ])
}
