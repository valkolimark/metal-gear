'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { APP_URL, BOOST_PRODUCTS, type BoostType } from '@/lib/constants'

export async function getUserActiveBoosts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { boosts: [] }

  const admin = createAdminClient()
  const { data } = await admin
    .from('boost_purchases')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('expires_at', { ascending: true })

  return { boosts: data ?? [] }
}

export async function getUserListingsForBoost() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { listings: [] }

  const admin = createAdminClient()
  const { data } = await admin
    .from('listings')
    .select('id, title, status, is_featured, pinned_position, pinned_category')
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return { listings: data ?? [] }
}

export async function createBoostCheckout(
  boostType: BoostType,
  durationDays: number,
  listingId?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const product = BOOST_PRODUCTS[boostType]
  if (!product) return { error: 'Invalid boost type' }

  const option = product.options.find((o) => o.days === durationDays)
  if (!option) return { error: 'Invalid duration' }

  if (product.needsListing && !listingId) {
    return { error: 'Please select a listing' }
  }

  const admin = createAdminClient()

  // Get or create Stripe customer
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id
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

  // Create Stripe Checkout for one-time payment
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${product.label} — ${durationDays} days`,
            description: product.description,
          },
          unit_amount: option.cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${APP_URL}/boost?success=true`,
    cancel_url: `${APP_URL}/boost`,
    metadata: {
      user_id: user.id,
      boost_type: boostType,
      duration_days: String(durationDays),
      listing_id: listingId || '',
      type: 'boost_purchase',
    },
  })

  return { url: session.url }
}

export async function cancelBoost(boostId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify ownership
  const { data: boost } = await admin
    .from('boost_purchases')
    .select('id, user_id')
    .eq('id', boostId)
    .eq('user_id', user.id)
    .single()

  if (!boost) return { error: 'Boost not found' }

  await admin
    .from('boost_purchases')
    .update({ status: 'cancelled' })
    .eq('id', boostId)

  return { success: true }
}
