'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { createNotification } from './notifications'
import { advanceReferralStatus } from './referrals'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'

export async function initiateTransaction(offerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get the accepted offer
  const { data: offer } = await admin
    .from('offers')
    .select('*, listings!offers_listing_id_fkey(seller_id, title)')
    .eq('id', offerId)
    .eq('status', 'accepted')
    .single()

  if (!offer) return { error: 'Accepted offer not found' }

  const listing = offer.listings as { seller_id: string; title: string }

  // Only buyer can initiate
  if (offer.buyer_id !== user.id) return { error: 'Only the buyer can initiate a transaction' }

  // Check for existing transaction
  const { data: existing } = await admin
    .from('transactions')
    .select('id')
    .eq('offer_id', offerId)
    .limit(1)

  if (existing && existing.length > 0) return { error: 'Transaction already exists for this offer' }

  const { data: transaction, error } = await admin
    .from('transactions')
    .insert({
      buyer_id: offer.buyer_id,
      seller_id: listing.seller_id,
      listing_id: offer.listing_id,
      offer_id: offerId,
      amount_cents: offer.amount_cents,
      status: 'initiated',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Notify seller
  await createNotification(
    listing.seller_id,
    'transaction_initiated',
    'Transaction Initiated',
    `A buyer has initiated a transaction for "${listing.title}".`,
    { transactionId: transaction.id, listingId: offer.listing_id }
  )

  return { transaction }
}

export async function getTransactions(statusFilter?: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { transactions: [] }

  const admin = createAdminClient()

  let query = admin
    .from('transactions')
    .select('*, listings!transactions_listing_id_fkey(title, category), buyer:profiles!transactions_buyer_id_fkey(full_name, display_name, avatar_url), seller:profiles!transactions_seller_id_fkey(full_name, display_name, avatar_url)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data } = await query.limit(50)
  return { transactions: data || [], userId: user.id }
}

export async function getTransaction(transactionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: transaction } = await admin
    .from('transactions')
    .select('*, listings!transactions_listing_id_fkey(title, category, price_cents, listing_images(url, position)), buyer:profiles!transactions_buyer_id_fkey(full_name, display_name, avatar_url, email_notifications), seller:profiles!transactions_seller_id_fkey(full_name, display_name, avatar_url, email_notifications)')
    .eq('id', transactionId)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .single()

  if (!transaction) return { error: 'Transaction not found' }
  return { transaction, userId: user.id }
}

export async function updateTransactionStatus(
  transactionId: string,
  newStatus: string,
  data?: { tracking_number?: string; carrier?: string; notes?: string }
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: transaction } = await admin
    .from('transactions')
    .select('*, listings!transactions_listing_id_fkey(title)')
    .eq('id', transactionId)
    .single()

  if (!transaction) return { error: 'Transaction not found' }

  // Validate transitions
  const isBuyer = transaction.buyer_id === user.id
  const isSeller = transaction.seller_id === user.id
  if (!isBuyer && !isSeller) return { error: 'Not authorized' }

  const validTransitions: Record<string, { next: string[]; role: 'buyer' | 'seller' }> = {
    initiated: { next: ['payment_pending'], role: 'buyer' },
    payment_pending: { next: ['paid'], role: 'buyer' },
    paid: { next: ['shipped'], role: 'seller' },
    shipped: { next: ['delivered', 'disputed'], role: 'buyer' },
    delivered: { next: ['completed', 'disputed'], role: 'buyer' },
  }

  const allowed = validTransitions[transaction.status]
  if (!allowed || !allowed.next.includes(newStatus)) {
    return { error: 'Invalid status transition' }
  }
  if ((allowed.role === 'buyer' && !isBuyer) || (allowed.role === 'seller' && !isSeller)) {
    return { error: 'Not authorized for this action' }
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }
  if (data?.tracking_number) updateData.tracking_number = data.tracking_number
  if (data?.carrier) updateData.carrier = data.carrier
  if (data?.notes) updateData.notes = data.notes

  const { error } = await admin
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId)

  if (error) return { error: error.message }

  // Send notifications
  const listing = transaction.listings as { title: string }
  const recipientId = isBuyer ? transaction.seller_id : transaction.buyer_id

  const statusMessages: Record<string, string> = {
    payment_pending: 'Payment is pending',
    paid: 'Payment has been received',
    shipped: `Item has been shipped${data?.tracking_number ? ` (Tracking: ${data.tracking_number})` : ''}`,
    delivered: 'Delivery has been confirmed',
    completed: 'Transaction has been completed',
  }

  await createNotification(
    recipientId,
    'transaction_update',
    `Transaction Update: ${listing.title}`,
    statusMessages[newStatus] || `Status changed to ${newStatus}`,
    { transactionId, listingId: transaction.listing_id }
  )

  // Send email notification
  const { data: recipientAuth } = await admin.auth.admin.getUserById(recipientId)
  if (recipientAuth?.user?.email) {
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', recipientId)
      .single()

    const name = recipientProfile?.display_name || recipientProfile?.full_name?.split(' ')[0] || 'there'

    await sendEmail({
      to: recipientAuth.user.email,
      subject: `Transaction Update: ${listing.title}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#0A0A0F;color:#ccc;">
        <h2 style="color:#1877F2;">Metal Gear</h2>
        <p>Hi ${name},</p>
        <p>${statusMessages[newStatus] || `Transaction status: ${newStatus}`}</p>
        <p>Listing: <strong style="color:#fff;">${listing.title}</strong></p>
        <a href="${APP_URL}/transactions/${transactionId}" style="display:inline-block;background:#1877F2;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;margin-top:12px;">View Transaction</a>
      </div>`,
    })
  }

  // If completed, decrement quantity and mark as sold when qty hits 0
  if (newStatus === 'completed') {
    const { data: listingRow } = await admin
      .from('listings')
      .select('quantity')
      .eq('id', transaction.listing_id)
      .single()

    const currentQty = listingRow?.quantity ?? 1
    const newQty = Math.max(0, currentQty - 1)

    if (newQty === 0) {
      await admin
        .from('listings')
        .update({ quantity: 0, status: 'sold' })
        .eq('id', transaction.listing_id)
    } else {
      await admin
        .from('listings')
        .update({ quantity: newQty })
        .eq('id', transaction.listing_id)

      // Low stock alert when quantity drops to 1
      if (newQty === 1) {
        await createNotification(
          transaction.seller_id,
          'transaction_update',
          `Low Stock: ${listing.title}`,
          'Only 1 unit remaining. Consider restocking or marking as final.',
          { listingId: transaction.listing_id }
        )
      }
    }

    // Advance referral status for buyer
    await advanceReferralStatus(transaction.buyer_id, 'first_transaction').catch(console.error)
  }

  return { success: true }
}
