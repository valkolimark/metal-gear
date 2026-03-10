'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { sendEmail } from '@/lib/email'
import { createNotification } from './notifications'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'
const PLATFORM_FEE_PERCENT = 5

export async function createPaymentIntent(transactionId: string) {
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
  if (transaction.buyer_id !== user.id) return { error: 'Only the buyer can pay' }
  if (transaction.status !== 'initiated') return { error: 'Transaction is not in the correct state for payment' }

  // If there's already a PaymentIntent, return its client secret
  if (transaction.stripe_payment_intent_id) {
    try {
      const existing = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id)
      if (existing.status !== 'canceled') {
        return { clientSecret: existing.client_secret }
      }
    } catch {
      // PaymentIntent not found, create new one
    }
  }

  const platformFeeCents = Math.round(transaction.amount_cents * PLATFORM_FEE_PERCENT / 100)
  const listing = transaction.listings as { title: string }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: transaction.amount_cents,
      currency: 'usd',
      capture_method: 'manual', // Authorize only — capture later on completion
      metadata: {
        transaction_id: transactionId,
        listing_title: listing.title,
        buyer_id: user.id,
        seller_id: transaction.seller_id,
        platform_fee_cents: platformFeeCents.toString(),
      },
      description: `Metal Gear: ${listing.title}`,
    })

    // Update transaction with PaymentIntent details
    await admin
      .from('transactions')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_intent_status: paymentIntent.status,
        platform_fee_cents: platformFeeCents,
        status: 'payment_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    // Notify seller
    await createNotification(
      transaction.seller_id,
      'transaction_update',
      'Payment Initiated',
      `Buyer is proceeding with payment for "${listing.title}".`,
      { transactionId, listingId: transaction.listing_id }
    )

    return { clientSecret: paymentIntent.client_secret }
  } catch (err) {
    console.error('Error creating PaymentIntent:', err)
    return { error: 'Failed to create payment. Please try again.' }
  }
}

export async function capturePayment(transactionId: string) {
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
  if (transaction.buyer_id !== user.id) return { error: 'Only the buyer can complete the transaction' }
  if (transaction.status !== 'delivered') return { error: 'Transaction must be delivered before completing' }
  if (!transaction.stripe_payment_intent_id) return { error: 'No payment to capture' }

  try {
    const paymentIntent = await stripe.paymentIntents.capture(transaction.stripe_payment_intent_id)

    const listing = transaction.listings as { title: string }

    await admin
      .from('transactions')
      .update({
        status: 'completed',
        stripe_payment_intent_status: paymentIntent.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    // Mark listing as sold
    await admin
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', transaction.listing_id)

    // Notify seller
    await createNotification(
      transaction.seller_id,
      'transaction_update',
      'Payment Released',
      `Payment for "${listing.title}" has been released. Funds will appear in your account shortly.`,
      { transactionId, listingId: transaction.listing_id }
    )

    // Send email to seller
    const { data: sellerAuth } = await admin.auth.admin.getUserById(transaction.seller_id)
    if (sellerAuth?.user?.email) {
      const { data: sellerProfile } = await admin
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', transaction.seller_id)
        .single()

      const name = sellerProfile?.display_name || sellerProfile?.full_name?.split(' ')[0] || 'there'
      const netAmount = ((transaction.amount_cents - transaction.platform_fee_cents) / 100).toLocaleString()

      await sendEmail({
        to: sellerAuth.user.email,
        subject: `Payment Released: ${listing.title}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#0A0A0F;color:#ccc;">
          <h2 style="color:#1877F2;">Metal Gear</h2>
          <p>Hi ${name},</p>
          <p>The buyer has confirmed delivery and payment has been released for <strong style="color:#fff;">${listing.title}</strong>.</p>
          <p>Amount: <strong style="color:#22c55e;">$${netAmount}</strong> (after 5% platform fee)</p>
          <a href="${APP_URL}/transactions/${transactionId}" style="display:inline-block;background:#1877F2;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;margin-top:12px;">View Transaction</a>
        </div>`,
      })
    }

    return { success: true }
  } catch (err) {
    console.error('Error capturing PaymentIntent:', err)
    return { error: 'Failed to capture payment. Please try again.' }
  }
}

export async function cancelPayment(transactionId: string) {
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

  // Either buyer or seller can cancel (or admin via dispute)
  if (transaction.buyer_id !== user.id && transaction.seller_id !== user.id) {
    return { error: 'Not authorized' }
  }

  if (!transaction.stripe_payment_intent_id) {
    return { error: 'No payment to cancel' }
  }

  try {
    await stripe.paymentIntents.cancel(transaction.stripe_payment_intent_id)

    await admin
      .from('transactions')
      .update({
        status: 'cancelled',
        stripe_payment_intent_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    const listing = transaction.listings as { title: string }
    const recipientId = transaction.buyer_id === user.id ? transaction.seller_id : transaction.buyer_id

    await createNotification(
      recipientId,
      'transaction_update',
      'Transaction Cancelled',
      `Transaction for "${listing.title}" has been cancelled and payment has been voided.`,
      { transactionId, listingId: transaction.listing_id }
    )

    return { success: true }
  } catch (err) {
    console.error('Error cancelling PaymentIntent:', err)
    return { error: 'Failed to cancel payment.' }
  }
}

export async function getPaymentStatus(transactionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: transaction } = await admin
    .from('transactions')
    .select('stripe_payment_intent_id, stripe_payment_intent_status, buyer_id, seller_id')
    .eq('id', transactionId)
    .single()

  if (!transaction) return { error: 'Transaction not found' }
  if (transaction.buyer_id !== user.id && transaction.seller_id !== user.id) {
    return { error: 'Not authorized' }
  }

  if (!transaction.stripe_payment_intent_id) {
    return { status: 'none' }
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id)
    return { status: pi.status }
  } catch {
    return { status: transaction.stripe_payment_intent_status }
  }
}
