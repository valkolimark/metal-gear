import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, subscriptionConfirmEmail } from '@/lib/email'
import { TIER_LABELS } from '@/lib/constants'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(admin, session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(admin, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(admin, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(admin, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(admin, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─── Handlers ─────────────────────────────────────────────────

async function handleCheckoutCompleted(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id
  if (!userId) {
    console.error('No user_id in checkout session metadata')
    return
  }

  const subscriptionId = session.subscription as string
  if (!subscriptionId) return

  // Fetch the full subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const item = subscription.items.data[0]
  const priceId = item?.price.id
  const tier = getTierFromPriceId(priceId)

  // Store Stripe customer ID on profile
  await admin
    .from('profiles')
    .update({ stripe_customer_id: session.customer as string })
    .eq('id', userId)

  // Create subscription record
  await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      tier,
      status: subscription.status,
      current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
      current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    { onConflict: 'stripe_subscription_id' }
  )

  // Update profile tier
  const { data: updatedProfile } = await admin
    .from('profiles')
    .update({ subscription_tier: tier })
    .eq('id', userId)
    .select('full_name, email_notifications')
    .single()

  // Send subscription confirmation email
  if (updatedProfile && session.customer_email) {
    const prefs = updatedProfile.email_notifications as Record<string, boolean> | null
    if (prefs?.subscription !== false) {
      const email = subscriptionConfirmEmail(
        updatedProfile.full_name || 'there',
        TIER_LABELS[tier as keyof typeof TIER_LABELS]
      )
      await sendEmail({ to: session.customer_email, ...email })
    }
  }
}

async function handleSubscriptionUpdated(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const item = subscription.items.data[0]
  const priceId = item?.price.id
  const tier = getTierFromPriceId(priceId)

  // Update subscription record
  const { data: subRecord } = await admin
    .from('subscriptions')
    .update({
      stripe_price_id: priceId,
      tier,
      status: subscription.status,
      current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
      current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', subscription.id)
    .select('user_id')
    .single()

  if (subRecord) {
    // Update profile tier based on subscription status
    const profileTier = subscription.status === 'active' ? tier : 'free'
    await admin
      .from('profiles')
      .update({ subscription_tier: profileTier })
      .eq('id', subRecord.user_id)
  }
}

async function handleSubscriptionDeleted(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  // Update subscription record
  const { data: subRecord } = await admin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .select('user_id')
    .single()

  if (subRecord) {
    // Downgrade to free
    await admin
      .from('profiles')
      .update({ subscription_tier: 'free' })
      .eq('id', subRecord.user_id)
  }
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subDetails = invoice.parent?.subscription_details
  if (!subDetails) return null
  return typeof subDetails.subscription === 'string'
    ? subDetails.subscription
    : subDetails.subscription?.id ?? null
}

async function handleInvoicePaymentSucceeded(
  admin: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const stripeSubId = getSubscriptionIdFromInvoice(invoice)
  if (!stripeSubId) return

  // Find the subscription record to get user_id
  const { data: subRecord } = await admin
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', stripeSubId)
    .single()

  if (!subRecord) return

  // Record the payment
  await admin.from('payments').upsert(
    {
      user_id: subRecord.user_id,
      subscription_id: subRecord.id,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: null,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      description: `${invoice.lines.data[0]?.description || 'Subscription payment'}`,
    },
    { onConflict: 'stripe_invoice_id' }
  )
}

async function handleInvoicePaymentFailed(
  admin: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const stripeSubId = getSubscriptionIdFromInvoice(invoice)
  if (!stripeSubId) return

  const { data: subRecord } = await admin
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', stripeSubId)
    .single()

  if (!subRecord) return

  await admin.from('payments').upsert(
    {
      user_id: subRecord.user_id,
      subscription_id: subRecord.id,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: null,
      amount_cents: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      description: 'Payment failed',
    },
    { onConflict: 'stripe_invoice_id' }
  )

  // Update subscription status
  await admin
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', stripeSubId)

  // Downgrade profile
  await admin
    .from('profiles')
    .update({ subscription_tier: 'free' })
    .eq('id', subRecord.user_id)
}

// ─── Helpers ──────────────────────────────────────────────────

function getTierFromPriceId(priceId: string): 'premium' | 'boost' {
  // Map Stripe price IDs to tiers
  // These will be set after creating products in Task 2
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID
  const boostPriceId = process.env.STRIPE_BOOST_PRICE_ID

  if (priceId === boostPriceId) return 'boost'
  return 'premium' // default to premium for any paid tier
}
