'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { sendEmail } from '@/lib/email'
import { createNotification } from './notifications'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'

const DISPUTE_REASONS: Record<string, string> = {
  item_not_received: 'Item Not Received',
  item_not_as_described: 'Item Not as Described',
  damaged_in_shipping: 'Damaged in Shipping',
  wrong_item: 'Wrong Item',
  other: 'Other',
}

export async function openDispute(
  transactionId: string,
  reason: string,
  description: string,
  evidenceUrls: string[]
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
  if (transaction.buyer_id !== user.id) return { error: 'Only the buyer can open a dispute' }
  if (!['shipped', 'delivered'].includes(transaction.status)) {
    return { error: 'Disputes can only be opened for shipped or delivered items' }
  }

  // Check for existing open dispute
  const { data: existing } = await admin
    .from('disputes')
    .select('id')
    .eq('transaction_id', transactionId)
    .in('status', ['open', 'under_review', 'escalated'])
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: 'An active dispute already exists for this transaction' }
  }

  const { data: dispute, error } = await admin
    .from('disputes')
    .insert({
      transaction_id: transactionId,
      opened_by: user.id,
      reason,
      description,
      evidence_urls: evidenceUrls,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Update transaction status to disputed
  await admin
    .from('transactions')
    .update({
      status: 'disputed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)

  const listing = transaction.listings as { title: string }

  // Notify seller
  await createNotification(
    transaction.seller_id,
    'dispute_opened',
    'Dispute Opened',
    `A dispute has been opened for "${listing.title}": ${DISPUTE_REASONS[reason] || reason}`,
    { transactionId, disputeId: dispute.id }
  )

  // Email seller
  const { data: sellerAuth } = await admin.auth.admin.getUserById(transaction.seller_id)
  if (sellerAuth?.user?.email) {
    const { data: sellerProfile } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', transaction.seller_id)
      .single()

    const name = sellerProfile?.display_name || sellerProfile?.full_name?.split(' ')[0] || 'there'

    await sendEmail({
      to: sellerAuth.user.email,
      subject: `Dispute Opened: ${listing.title}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#0A0A0F;color:#ccc;">
        <h2 style="color:#1877F2;">Metal Gear</h2>
        <p>Hi ${name},</p>
        <p>A dispute has been opened for <strong style="color:#fff;">${listing.title}</strong>.</p>
        <p><strong>Reason:</strong> ${DISPUTE_REASONS[reason] || reason}</p>
        <p><strong>Details:</strong> ${description}</p>
        <p>Please respond with your side of the story and any supporting evidence.</p>
        <a href="${APP_URL}/transactions/${transactionId}" style="display:inline-block;background:#1877F2;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;margin-top:12px;">View & Respond</a>
      </div>`,
    })
  }

  return { dispute }
}

export async function respondToDispute(
  disputeId: string,
  response: string,
  evidenceUrls: string[]
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: dispute } = await admin
    .from('disputes')
    .select('*, transactions!disputes_transaction_id_fkey(seller_id, buyer_id, listing_id, listings!transactions_listing_id_fkey(title))')
    .eq('id', disputeId)
    .single()

  if (!dispute) return { error: 'Dispute not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transaction = dispute.transactions as any
  if (transaction.seller_id !== user.id) return { error: 'Only the seller can respond' }
  if (!['open', 'under_review'].includes(dispute.status)) {
    return { error: 'This dispute is no longer open for responses' }
  }

  const { error } = await admin
    .from('disputes')
    .update({
      seller_response: response,
      seller_evidence_urls: evidenceUrls,
      status: 'under_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', disputeId)

  if (error) return { error: error.message }

  const listing = transaction.listings as { title: string }

  // Notify buyer
  await createNotification(
    transaction.buyer_id,
    'dispute_response',
    'Seller Responded to Dispute',
    `The seller has responded to the dispute for "${listing.title}".`,
    { transactionId: dispute.transaction_id, disputeId }
  )

  // Email buyer
  const { data: buyerAuth } = await admin.auth.admin.getUserById(transaction.buyer_id)
  if (buyerAuth?.user?.email) {
    const { data: buyerProfile } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', transaction.buyer_id)
      .single()

    const name = buyerProfile?.display_name || buyerProfile?.full_name?.split(' ')[0] || 'there'

    await sendEmail({
      to: buyerAuth.user.email,
      subject: `Seller Response: ${listing.title} Dispute`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#0A0A0F;color:#ccc;">
        <h2 style="color:#1877F2;">Metal Gear</h2>
        <p>Hi ${name},</p>
        <p>The seller has responded to your dispute for <strong style="color:#fff;">${listing.title}</strong>.</p>
        <a href="${APP_URL}/transactions/${dispute.transaction_id}" style="display:inline-block;background:#1877F2;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;margin-top:12px;">View Response</a>
      </div>`,
    })
  }

  return { success: true }
}

export async function resolveDispute(
  disputeId: string,
  resolution: 'resolved_buyer' | 'resolved_seller',
  notes: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check admin
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'Only admins can resolve disputes' }

  const { data: dispute } = await admin
    .from('disputes')
    .select('*, transactions!disputes_transaction_id_fkey(*, listings!transactions_listing_id_fkey(title))')
    .eq('id', disputeId)
    .single()

  if (!dispute) return { error: 'Dispute not found' }
  if (['resolved_buyer', 'resolved_seller'].includes(dispute.status)) {
    return { error: 'Dispute is already resolved' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transaction = dispute.transactions as any
  const listing = transaction.listings as { title: string }

  // Update dispute
  const { error } = await admin
    .from('disputes')
    .update({
      status: resolution,
      resolution_notes: notes,
      resolved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', disputeId)

  if (error) return { error: error.message }

  // Handle payment based on resolution
  if (transaction.stripe_payment_intent_id) {
    try {
      if (resolution === 'resolved_buyer') {
        // Cancel/refund the payment
        await stripe.paymentIntents.cancel(transaction.stripe_payment_intent_id)
        await admin
          .from('transactions')
          .update({
            status: 'cancelled',
            stripe_payment_intent_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id)
      } else {
        // Release funds to seller
        const pi = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id)
        if (pi.status === 'requires_capture') {
          await stripe.paymentIntents.capture(transaction.stripe_payment_intent_id)
        }
        await admin
          .from('transactions')
          .update({
            status: 'completed',
            stripe_payment_intent_status: 'succeeded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id)

        // Mark listing as sold
        await admin
          .from('listings')
          .update({ status: 'sold' })
          .eq('id', transaction.listing_id)
      }
    } catch (err) {
      console.error('Error handling payment for dispute resolution:', err)
    }
  }

  // Notify both parties
  const resolutionMsg = resolution === 'resolved_buyer'
    ? 'resolved in favor of the buyer. Payment has been refunded.'
    : 'resolved in favor of the seller. Funds have been released.'

  for (const partyId of [transaction.buyer_id, transaction.seller_id]) {
    await createNotification(
      partyId,
      'dispute_resolved',
      'Dispute Resolved',
      `The dispute for "${listing.title}" has been ${resolutionMsg}`,
      { transactionId: transaction.id, disputeId }
    )

    const { data: partyAuth } = await admin.auth.admin.getUserById(partyId)
    if (partyAuth?.user?.email) {
      const { data: partyProfile } = await admin
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', partyId)
        .single()

      const name = partyProfile?.display_name || partyProfile?.full_name?.split(' ')[0] || 'there'

      await sendEmail({
        to: partyAuth.user.email,
        subject: `Dispute Resolved: ${listing.title}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#0A0A0F;color:#ccc;">
          <h2 style="color:#1877F2;">Metal Gear</h2>
          <p>Hi ${name},</p>
          <p>The dispute for <strong style="color:#fff;">${listing.title}</strong> has been ${resolutionMsg}</p>
          ${notes ? `<p><strong>Resolution Notes:</strong> ${notes}</p>` : ''}
          <a href="${APP_URL}/transactions/${transaction.id}" style="display:inline-block;background:#1877F2;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;margin-top:12px;">View Transaction</a>
        </div>`,
      })
    }
  }

  return { success: true }
}

export async function getDispute(transactionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: disputes } = await admin
    .from('disputes')
    .select('*, opener:profiles!disputes_opened_by_fkey(full_name, display_name, avatar_url)')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })

  return { disputes: disputes || [] }
}

export async function getAdminDisputes() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'Not authorized' }

  const { data: disputes } = await admin
    .from('disputes')
    .select('*, opener:profiles!disputes_opened_by_fkey(full_name, display_name), transactions!disputes_transaction_id_fkey(*, listings!transactions_listing_id_fkey(title), buyer:profiles!transactions_buyer_id_fkey(full_name, display_name), seller:profiles!transactions_seller_id_fkey(full_name, display_name))')
    .order('created_at', { ascending: false })
    .limit(50)

  return { disputes: disputes || [] }
}

export async function uploadDisputeEvidence(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const { uploadDisputeEvidence } = await import('@/lib/media')
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const url = await uploadDisputeEvidence(buffer, user.id, file.type)
    return { url }
  } catch (err) {
    return { error: `Upload failed: ${err instanceof Error ? err.message : 'R2 error'}` }
  }
}
