'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { APP_URL } from '@/lib/constants'

export async function createCheckoutSession(priceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()

  // Check if user already has a Stripe customer ID
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, email:id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  // Create Stripe customer if needed
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id

    await admin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // Determine billing period from price ID
  const proAnnualPriceId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  const businessAnnualPriceId = process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID
  const isAnnual = priceId === proAnnualPriceId || priceId === businessAnnualPriceId
  const billingPeriod = isAnnual ? 'annual' : 'monthly'

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/pricing`,
    metadata: { user_id: user.id, billingPeriod },
    subscription_data: {
      metadata: { user_id: user.id, billingPeriod },
    },
  })

  return { url: session.url }
}

export async function createBillingPortalSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return { error: 'No billing account found' }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${APP_URL}/profile`,
  })

  return { url: session.url }
}

export async function getSubscription() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { subscription: data }
}
