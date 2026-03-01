'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function getSellerAvailability(userId: string) {
  const admin = createAdminClient()

  const { data: slots } = await admin
    .from('seller_availability')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week')

  return { slots: slots || [] }
}

export async function saveAvailability(
  slots: { day_of_week: number; start_time: string; end_time: string }[]
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Delete existing slots
  await admin.from('seller_availability').delete().eq('user_id', user.id)

  if (slots.length === 0) return { success: true }

  // Insert new slots
  const { error } = await admin.from('seller_availability').insert(
    slots.map((s) => ({
      user_id: user.id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      timezone: 'America/Chicago',
    }))
  )

  if (error) return { error: error.message }
  return { success: true }
}

export async function requestViewing(
  listingId: string,
  proposedDatetime: string,
  message?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get listing seller
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id, title')
    .eq('id', listingId)
    .single()

  if (!listing) return { error: 'Listing not found' }
  if (listing.seller_id === user.id) return { error: 'Cannot request viewing of your own listing' }

  // Check for existing pending request
  const { data: existing } = await admin
    .from('viewing_requests')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: 'You already have a pending viewing request for this listing' }

  const { data: request, error } = await admin
    .from('viewing_requests')
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      proposed_datetime: proposedDatetime,
      message: message || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Email seller about viewing request
  const { data: sellerAuth } = await admin.auth.admin.getUserById(listing.seller_id)

  const { data: buyer } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (sellerAuth?.user?.email) {
    const dt = new Date(proposedDatetime)
    await sendEmail({
      to: sellerAuth.user.email,
      subject: `Viewing Request for "${listing.title}"`,
      html: `
        <h2>New Viewing Request</h2>
        <p><strong>${buyer?.full_name || 'A buyer'}</strong> has requested to view your listing <strong>"${listing.title}"</strong>.</p>
        <p><strong>Proposed time:</strong> ${dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })} CT</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/schedule">View & respond to this request</a></p>
      `,
    }).catch(console.error)
  }

  return { request }
}

export async function respondToViewing(requestId: string, action: 'accepted' | 'declined') {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: request } = await admin
    .from('viewing_requests')
    .select('*, listings(title)')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found' }
  if (request.seller_id !== user.id) return { error: 'Not authorized' }
  if (request.status !== 'pending') return { error: 'Request already handled' }

  const { error } = await admin
    .from('viewing_requests')
    .update({ status: action })
    .eq('id', requestId)

  if (error) return { error: error.message }

  // Email buyer
  const { data: buyerAuth } = await admin.auth.admin.getUserById(request.buyer_id)

  const { data: seller } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (buyerAuth?.user?.email) {
    const dt = new Date(request.proposed_datetime)
    const listingTitle = (request.listings as { title: string })?.title || 'your requested listing'
    await sendEmail({
      to: buyerAuth.user.email,
      subject: `Viewing ${action === 'accepted' ? 'Confirmed' : 'Declined'}: "${listingTitle}"`,
      html: `
        <h2>Viewing ${action === 'accepted' ? 'Confirmed' : 'Declined'}</h2>
        <p>${seller?.full_name || 'The seller'} has <strong>${action}</strong> your viewing request for <strong>"${listingTitle}"</strong>.</p>
        ${action === 'accepted' ? `<p><strong>Scheduled for:</strong> ${dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })} CT</p>` : ''}
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/schedule">View your schedule</a></p>
      `,
    }).catch(console.error)
  }

  return { success: true }
}

export async function cancelViewing(requestId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: request } = await admin
    .from('viewing_requests')
    .select('buyer_id, seller_id')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found' }
  if (request.buyer_id !== user.id && request.seller_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await admin
    .from('viewing_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getMyViewingRequests() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get requests where user is buyer or seller
  const { data: asBuyer } = await admin
    .from('viewing_requests')
    .select('*, listings(id, title), seller:profiles!viewing_requests_seller_id_fkey(full_name, display_name)')
    .eq('buyer_id', user.id)
    .in('status', ['pending', 'accepted'])
    .order('proposed_datetime')

  const { data: asSeller } = await admin
    .from('viewing_requests')
    .select('*, listings(id, title), buyer:profiles!viewing_requests_buyer_id_fkey(full_name, display_name)')
    .eq('seller_id', user.id)
    .in('status', ['pending', 'accepted'])
    .order('proposed_datetime')

  return {
    asBuyer: asBuyer || [],
    asSeller: asSeller || [],
    userId: user.id,
  }
}

export { DAY_NAMES }
