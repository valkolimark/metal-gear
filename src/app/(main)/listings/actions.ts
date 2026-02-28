'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/app/actions/notifications'

export async function updateListingStatus(
  listingId: string,
  status: 'active' | 'sold' | 'expired' | 'draft' | 'removed'
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify ownership
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .single()

  if (!listing || listing.seller_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { data: listingDetails } = await admin
    .from('listings')
    .select('title')
    .eq('id', listingId)
    .single()

  const { error } = await admin
    .from('listings')
    .update({ status })
    .eq('id', listingId)

  if (error) return { error: error.message }

  // If marked as sold, notify buyers who had conversations about it
  if (status === 'sold' && listingDetails) {
    notifyListingSold(admin, listingId, listingDetails.title)
  }

  return { success: true }
}

export async function duplicateListing(listingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Fetch original listing
  const { data: original } = await admin
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .single()

  if (!original) return { error: 'Listing not found' }

  // Create a copy as draft
  const { data: newListing, error } = await admin
    .from('listings')
    .insert({
      seller_id: user.id,
      title: `${original.title} (Copy)`,
      description: original.description,
      category: original.category,
      industry: original.industry,
      condition: original.condition,
      price_cents: original.price_cents,
      negotiable: original.negotiable,
      contact_for_price: original.contact_for_price,
      location_city: original.location_city,
      location_state: original.location_state,
      location_lat: original.location_lat,
      location_lng: original.location_lng,
      specifications: original.specifications,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { listing: newListing }
}

async function notifyListingSold(
  admin: ReturnType<typeof createAdminClient>,
  listingId: string,
  title: string
) {
  try {
    const { data: convs } = await admin
      .from('conversations')
      .select('buyer_id')
      .eq('listing_id', listingId)

    if (convs) {
      const uniqueBuyers = [...new Set(convs.map((c) => c.buyer_id))]
      for (const buyerId of uniqueBuyers) {
        await createNotification(
          buyerId,
          'listing_sold',
          'A listing you viewed has sold',
          `"${title}" has been marked as sold`,
          { listing_id: listingId }
        )
      }
    }
  } catch (err) {
    console.error('Failed to send sold notifications:', err)
  }
}
