'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/app/actions/notifications'

export async function makeOffer(
  listingId: string,
  amountCents: number,
  message?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (amountCents <= 0) return { error: 'Amount must be greater than $0' }

  const admin = createAdminClient()

  // Get listing to verify
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id, title, status')
    .eq('id', listingId)
    .single()

  if (!listing) return { error: 'Listing not found' }
  if (listing.status !== 'active') return { error: 'Listing is not available' }
  if (listing.seller_id === user.id) return { error: 'Cannot make an offer on your own listing' }

  // Check for existing pending offer
  const { data: existing } = await admin
    .from('offers')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('listing_id', listingId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: 'You already have a pending offer on this listing' }

  const { data: offer, error } = await admin
    .from('offers')
    .insert({
      buyer_id: user.id,
      listing_id: listingId,
      amount_cents: amountCents,
      message: message?.trim() || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Notify seller
  notifyOfferReceived(admin, listing.seller_id, user.id, listing.title, amountCents, listingId)

  return { offer }
}

export async function respondToOffer(
  offerId: string,
  action: 'accept' | 'reject' | 'counter',
  counterAmountCents?: number,
  counterMessage?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get the offer with listing info
  const { data: offer } = await admin
    .from('offers')
    .select('*, listing:listings(seller_id, title)')
    .eq('id', offerId)
    .single()

  if (!offer) return { error: 'Offer not found' }

  const listing = offer.listing as { seller_id: string; title: string } | null
  if (!listing) return { error: 'Listing not found' }

  // Verify the current user is the seller
  if (listing.seller_id !== user.id) return { error: 'Not authorized' }
  if (offer.status !== 'pending') return { error: 'Offer is no longer pending' }

  // Check expiration
  if (new Date(offer.expires_at) < new Date()) {
    await admin
      .from('offers')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', offerId)
    return { error: 'Offer has expired' }
  }

  if (action === 'accept') {
    const { error } = await admin
      .from('offers')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', offerId)
    if (error) return { error: error.message }

    notifyOfferStatus(admin, offer.buyer_id, 'offer_accepted', listing.title, offer.amount_cents, offer.listing_id)
  } else if (action === 'reject') {
    const { error } = await admin
      .from('offers')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', offerId)
    if (error) return { error: error.message }

    notifyOfferStatus(admin, offer.buyer_id, 'offer_rejected', listing.title, offer.amount_cents, offer.listing_id)
  } else if (action === 'counter') {
    if (!counterAmountCents || counterAmountCents <= 0) {
      return { error: 'Counter amount must be greater than $0' }
    }

    const { error } = await admin
      .from('offers')
      .update({
        status: 'countered',
        counter_amount_cents: counterAmountCents,
        counter_message: counterMessage?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)
    if (error) return { error: error.message }

    notifyOfferCounter(admin, offer.buyer_id, user.id, listing.title, counterAmountCents, offer.listing_id)
  }

  return { success: true }
}

export async function respondToCounter(
  offerId: string,
  action: 'accept' | 'reject'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: offer } = await admin
    .from('offers')
    .select('*, listing:listings(seller_id, title)')
    .eq('id', offerId)
    .single()

  if (!offer) return { error: 'Offer not found' }
  if (offer.buyer_id !== user.id) return { error: 'Not authorized' }
  if (offer.status !== 'countered') return { error: 'Offer is not in counter state' }

  const listing = offer.listing as { seller_id: string; title: string } | null
  if (!listing) return { error: 'Listing not found' }

  const newStatus = action === 'accept' ? 'accepted' : 'rejected'
  const { error } = await admin
    .from('offers')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', offerId)
  if (error) return { error: error.message }

  const notifType = action === 'accept' ? 'offer_accepted' : 'offer_rejected'
  const finalAmount = offer.counter_amount_cents || offer.amount_cents
  notifyOfferStatus(admin, listing.seller_id, notifType, listing.title, finalAmount, offer.listing_id)

  return { success: true }
}

export async function withdrawOffer(offerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('offers')
    .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('id', offerId)
    .eq('buyer_id', user.id)
    .in('status', ['pending', 'countered'])

  if (error) return { error: error.message }
  return { success: true }
}

export async function getListingOffers(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get listing to check ownership
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .single()

  if (!listing) return { error: 'Listing not found' }

  // Sellers see all offers, buyers see only their own
  let q = admin
    .from('offers')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })

  if (listing.seller_id !== user.id) {
    q = q.eq('buyer_id', user.id)
  }

  const { data, error } = await q
  if (error) return { error: error.message }

  // Get buyer profiles
  const buyerIds = [...new Set((data || []).map((o) => o.buyer_id))]
  const { data: buyers } = await admin
    .from('profiles')
    .select('id, full_name, display_name, avatar_url')
    .in('id', buyerIds.length > 0 ? buyerIds : ['none'])

  const buyerMap = new Map((buyers || []).map((b) => [b.id, b]))

  const enriched = (data || []).map((o) => ({
    ...o,
    buyer: buyerMap.get(o.buyer_id) || null,
  }))

  return { offers: enriched, isSeller: listing.seller_id === user.id }
}

export async function getMyOffers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('offers')
    .select('*, listing:listings(id, title, price_cents, seller_id)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return { error: error.message }
  return { offers: data || [] }
}

// Helper functions for notifications
async function notifyOfferReceived(
  admin: ReturnType<typeof createAdminClient>,
  sellerId: string,
  buyerId: string,
  listingTitle: string,
  amountCents: number,
  listingId: string
) {
  try {
    const { data: buyer } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', buyerId)
      .single()

    const buyerName = buyer?.display_name || buyer?.full_name || 'Someone'
    const price = `$${(amountCents / 100).toLocaleString()}`

    await createNotification(
      sellerId,
      'offer_received',
      `${buyerName} made a ${price} offer`,
      `Offer on "${listingTitle}"`,
      { listing_id: listingId, amount_cents: amountCents }
    )
  } catch (err) {
    console.error('Failed to send offer notification:', err)
  }
}

async function notifyOfferStatus(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  type: 'offer_accepted' | 'offer_rejected',
  listingTitle: string,
  amountCents: number,
  listingId: string
) {
  try {
    const price = `$${(amountCents / 100).toLocaleString()}`
    const actionLabel = type === 'offer_accepted' ? 'accepted' : 'declined'

    await createNotification(
      userId,
      type,
      `Your ${price} offer was ${actionLabel}`,
      `Offer on "${listingTitle}" has been ${actionLabel}`,
      { listing_id: listingId, amount_cents: amountCents }
    )
  } catch (err) {
    console.error('Failed to send offer status notification:', err)
  }
}

async function notifyOfferCounter(
  admin: ReturnType<typeof createAdminClient>,
  buyerId: string,
  sellerId: string,
  listingTitle: string,
  counterAmountCents: number,
  listingId: string
) {
  try {
    const { data: seller } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', sellerId)
      .single()

    const sellerName = seller?.display_name || seller?.full_name || 'The seller'
    const price = `$${(counterAmountCents / 100).toLocaleString()}`

    await createNotification(
      buyerId,
      'offer_countered',
      `${sellerName} countered with ${price}`,
      `Counter-offer on "${listingTitle}"`,
      { listing_id: listingId, amount_cents: counterAmountCents }
    )
  } catch (err) {
    console.error('Failed to send counter notification:', err)
  }
}
