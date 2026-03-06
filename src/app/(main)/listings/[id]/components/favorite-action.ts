'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function toggleFavoriteAction(listingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) {
    await admin
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
    return { favorited: false }
  } else {
    await admin
      .from('favorites')
      .insert({ user_id: user.id, listing_id: listingId })
    return { favorited: true }
  }
}
