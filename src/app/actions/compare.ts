'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/app/actions/notifications'

export async function getListingsForCompare(ids: string[]) {
  if (ids.length === 0 || ids.length > 3) return { error: 'Select 2-3 listings to compare' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('listings')
    .select('*')
    .in('id', ids)

  if (error) return { error: error.message }
  return { listings: data || [] }
}

export async function togglePriceWatch(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check if already watching
  const { data: existing } = await admin
    .from('price_watches')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) {
    await admin.from('price_watches').delete().eq('id', existing.id)
    return { watching: false }
  }

  // Get current price
  const { data: listing } = await admin
    .from('listings')
    .select('price_cents')
    .eq('id', listingId)
    .single()

  if (!listing || !listing.price_cents) return { error: 'Listing has no price to watch' }

  const { error } = await admin.from('price_watches').insert({
    user_id: user.id,
    listing_id: listingId,
    original_price_cents: listing.price_cents,
  })

  if (error) return { error: error.message }
  return { watching: true }
}

export async function getPriceWatch(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { watching: false }

  const admin = createAdminClient()
  const { data } = await admin
    .from('price_watches')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle()

  return { watching: !!data }
}

export async function getPriceHistory(listingId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('price_history')
    .select('*')
    .eq('listing_id', listingId)
    .order('changed_at', { ascending: true })
    .limit(20)

  if (error) return { error: error.message }
  return { history: data || [] }
}

export async function recordPriceChange(listingId: string, newPriceCents: number) {
  const admin = createAdminClient()

  // Record the price change
  await admin.from('price_history').insert({
    listing_id: listingId,
    price_cents: newPriceCents,
  })

  // Check watchers and notify if price dropped
  const { data: watchers } = await admin
    .from('price_watches')
    .select('user_id, original_price_cents')
    .eq('listing_id', listingId)

  if (!watchers) return

  const { data: listing } = await admin
    .from('listings')
    .select('title')
    .eq('id', listingId)
    .single()

  for (const watcher of watchers) {
    if (newPriceCents < watcher.original_price_cents) {
      const oldPrice = `$${(watcher.original_price_cents / 100).toLocaleString()}`
      const newPrice = `$${(newPriceCents / 100).toLocaleString()}`

      await createNotification(
        watcher.user_id,
        'price_drop_alert',
        `Price dropped from ${oldPrice} to ${newPrice}`,
        `"${listing?.title}" price has decreased`,
        { listing_id: listingId, old_price: watcher.original_price_cents, new_price: newPriceCents }
      )
    }
  }
}
