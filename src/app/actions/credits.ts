'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { getActiveTier } from '@/app/actions/tier'
import {
  CONTACT_CREDIT_ALLOWANCES,
  CREDIT_PACKS,
  APP_URL,
} from '@/lib/constants'
import type { SubscriptionTier } from '@/lib/constants'

// ─── Types ──────────────────────────────────────────────────────────

export interface CreditBalance {
  creditsRemaining: number
  creditsUsedThisMonth: number
  monthlyAllowance: number
  periodStart: string
  tier: string
}

export interface RevealResult {
  phone: string | null
  email: string | null
  error?: string
  creditsRemaining?: number
}

export interface CreditConfig {
  allowances: Record<string, number>
  extraCost: Record<string, number>
  packs: Array<{ id: string; credits: number; priceCents: number; label: string }>
}

// ─── Config (DB-backed, admin-editable) ─────────────────────────────

export async function getCreditConfig(): Promise<CreditConfig> {
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('system_config')
    .select('key, value')
    .in('key', ['credit_allowances', 'credit_extra_cost', 'credit_packs'])

  const config: Record<string, unknown> = {}
  for (const row of rows ?? []) {
    try {
      config[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
    } catch {
      // Ignore parse errors, fall through to defaults
    }
  }

  const allowances = (config.credit_allowances ?? { free: 0, pro: 25, business: 75, enterprise: -1 }) as Record<string, number>
  const extraCost = (config.credit_extra_cost ?? { free: 500, pro: 300, business: 200, enterprise: 0 }) as Record<string, number>
  const packs = (config.credit_packs ?? CREDIT_PACKS) as CreditConfig['packs']

  return { allowances, extraCost, packs }
}

function resolveAllowance(allowances: Record<string, number>, tier: string): number {
  const val = allowances[tier]
  if (val === undefined) {
    // Fall back to hardcoded constant
    return CONTACT_CREDIT_ALLOWANCES[tier] ?? 0
  }
  return val === -1 ? Infinity : val
}

// ─── Helpers ────────────────────────────────────────────────────────

function getCurrentPeriodStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function getCurrentPeriodMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function ensureCreditRow(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  tier: SubscriptionTier,
  allowances?: Record<string, number>
) {
  const periodStart = getCurrentPeriodStart()
  const rawAllowance = allowances
    ? resolveAllowance(allowances, tier)
    : (CONTACT_CREDIT_ALLOWANCES[tier] ?? 0)

  const dbAllowance = rawAllowance === Infinity ? 999999 : rawAllowance

  const { data: existing } = await admin
    .from('contact_credits')
    .select('id, credits_remaining, credits_used_this_month, period_start')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .maybeSingle()

  if (existing) return existing

  const { data: newRow } = await admin
    .from('contact_credits')
    .upsert(
      {
        user_id: userId,
        credits_remaining: dbAllowance,
        credits_used_this_month: 0,
        period_start: periodStart,
      },
      { onConflict: 'user_id,period_start' }
    )
    .select('id, credits_remaining, credits_used_this_month, period_start')
    .single()

  return newRow
}

// ─── Get Credit Balance ─────────────────────────────────────────────

export async function getCreditBalance(userId?: string): Promise<CreditBalance | null> {
  const admin = createAdminClient()

  let uid = userId
  if (!uid) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    uid = user.id
  }

  const tier = await getActiveTier(uid)
  const config = await getCreditConfig()
  const allowance = resolveAllowance(config.allowances, tier)
  const row = await ensureCreditRow(admin, uid, tier, config.allowances)

  return {
    creditsRemaining: row?.credits_remaining ?? 0,
    creditsUsedThisMonth: row?.credits_used_this_month ?? 0,
    monthlyAllowance: allowance === Infinity ? -1 : allowance,
    periodStart: row?.period_start ?? getCurrentPeriodStart(),
    tier,
  }
}

// ─── Reveal Contact Info ────────────────────────────────────────────

export async function revealContactInfo(
  sellerId: string,
  listingId?: string
): Promise<RevealResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { phone: null, email: null, error: 'Not authenticated' }

  const admin = createAdminClient()
  const viewerId = user.id

  const { data: seller } = await admin
    .from('profiles')
    .select('id, phone, contact_email, contact_visibility')
    .eq('id', sellerId)
    .single()

  if (!seller) return { phone: null, email: null, error: 'Seller not found' }

  const visibility = (seller as { contact_visibility?: string }).contact_visibility ?? 'pro_plus'
  const contactPhone = seller.phone || null
  const contactEmail = (seller as { contact_email?: string | null }).contact_email || null
  const periodMonth = getCurrentPeriodMonth()

  if (visibility === 'hidden') return { phone: null, email: null }

  // Self-viewing = free
  if (viewerId === sellerId) {
    return { phone: contactPhone, email: contactEmail }
  }

  // Public visibility = free
  if (visibility === 'public') {
    await admin.from('contact_reveals').upsert(
      {
        viewer_id: viewerId,
        seller_id: sellerId,
        credits_spent: 0,
        listing_id: listingId || null,
        period_month: periodMonth,
      },
      { onConflict: 'viewer_id,seller_id,period_month', ignoreDuplicates: true }
    )
    return { phone: contactPhone, email: contactEmail }
  }

  // pro_plus — check existing reveal this month
  const periodStart = getCurrentPeriodStart()
  const { data: existingReveal } = await admin
    .from('contact_reveals')
    .select('id')
    .eq('viewer_id', viewerId)
    .eq('seller_id', sellerId)
    .gte('revealed_at', periodStart)
    .maybeSingle()

  if (existingReveal) {
    return { phone: contactPhone, email: contactEmail }
  }

  // Enterprise = unlimited
  const tier = await getActiveTier(viewerId)
  if (tier === 'enterprise') {
    await admin.from('contact_reveals').insert({
      viewer_id: viewerId,
      seller_id: sellerId,
      credits_spent: 0,
      listing_id: listingId || null,
      period_month: periodMonth,
    })
    return { phone: contactPhone, email: contactEmail }
  }

  // Check credit balance
  const config = await getCreditConfig()
  const creditRow = await ensureCreditRow(admin, viewerId, tier, config.allowances)
  if (!creditRow || creditRow.credits_remaining < 1) {
    return {
      phone: null,
      email: null,
      error: 'insufficient_credits',
      creditsRemaining: creditRow?.credits_remaining ?? 0,
    }
  }

  // Deduct credit with optimistic lock
  const { error: updateError } = await admin
    .from('contact_credits')
    .update({
      credits_remaining: creditRow.credits_remaining - 1,
      credits_used_this_month: creditRow.credits_used_this_month + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', creditRow.id)
    .eq('credits_remaining', creditRow.credits_remaining)

  if (updateError) {
    return { phone: null, email: null, error: 'Failed to deduct credit' }
  }

  await admin.from('contact_reveals').insert({
    viewer_id: viewerId,
    seller_id: sellerId,
    credits_spent: 1,
    listing_id: listingId || null,
    period_month: periodMonth,
  })
  return {
    phone: contactPhone,
    email: contactEmail,
    creditsRemaining: creditRow.credits_remaining - 1,
  }
}

// ─── Get Revealed Contacts ──────────────────────────────────────────

export async function getRevealedContacts(userId?: string): Promise<string[]> {
  const admin = createAdminClient()

  let uid = userId
  if (!uid) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    uid = user.id
  }

  const periodStart = getCurrentPeriodStart()
  const { data } = await admin
    .from('contact_reveals')
    .select('seller_id')
    .eq('viewer_id', uid)
    .gte('revealed_at', periodStart)

  return (data ?? []).map((r) => r.seller_id)
}

// ─── Purchase Credits (Stripe Checkout) ─────────────────────────────

export async function createCreditCheckoutSession(packId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const config = await getCreditConfig()
  const pack = config.packs.find((p) => p.id === packId)
  if (!pack) return { error: 'Invalid pack' }

  const admin = createAdminClient()

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

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: pack.priceCents,
          product_data: {
            name: `${pack.label} Credit Pack — ${pack.credits} Credits`,
            description: `${pack.credits} contact reveal credits for Metal Gear`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${APP_URL}/credits?purchased=true`,
    cancel_url: `${APP_URL}/credits`,
    metadata: {
      type: 'credit_purchase',
      user_id: user.id,
      credits: String(pack.credits),
      pack_id: pack.id,
    },
  })

  return { url: session.url }
}

// ─── Get Credit History ─────────────────────────────────────────────

export async function getCreditHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { reveals: [], purchases: [] }

  const admin = createAdminClient()
  const periodStart = getCurrentPeriodStart()

  const [{ data: reveals }, { data: purchases }] = await Promise.all([
    admin
      .from('contact_reveals')
      .select('id, seller_id, credits_spent, revealed_at, listing_id')
      .eq('viewer_id', user.id)
      .gte('revealed_at', periodStart)
      .order('revealed_at', { ascending: false }),
    admin
      .from('credit_purchases')
      .select('id, credits_purchased, amount_paid, purchased_at')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false })
      .limit(20),
  ])

  const sellerIds = [...new Set((reveals ?? []).map((r) => r.seller_id))]
  const sellerNames: Record<string, string> = {}

  if (sellerIds.length > 0) {
    const { data: sellers } = await admin
      .from('profiles')
      .select('id, full_name, display_name, company_name')
      .in('id', sellerIds)

    for (const s of sellers ?? []) {
      sellerNames[s.id] = s.company_name || s.display_name || s.full_name || 'Unknown Seller'
    }
  }

  return {
    reveals: (reveals ?? []).map((r) => ({
      ...r,
      seller_name: sellerNames[r.seller_id] || 'Unknown Seller',
    })),
    purchases: purchases ?? [],
  }
}
