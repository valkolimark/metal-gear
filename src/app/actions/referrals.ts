'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from './notifications'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'

export async function getReferralData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get or generate referral code
  const { data: profile } = await admin
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single()

  let referralCode = profile?.referral_code

  if (!referralCode) {
    // Generate unique code
    referralCode = user.id.slice(0, 8).toLowerCase()
    await admin
      .from('profiles')
      .update({ referral_code: referralCode })
      .eq('id', user.id)
  }

  // Get referrals
  const { data: referrals } = await admin
    .from('referrals')
    .select('id, status, reward_cents, created_at, referred_id')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  // Get referred user names
  const referredIds = (referrals || [])
    .map(r => r.referred_id)
    .filter((id): id is string => id !== null)

  let referredProfiles: Record<string, string> = {}
  if (referredIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, full_name')
      .in('id', referredIds)

    if (profiles) {
      referredProfiles = Object.fromEntries(
        profiles.map(p => [p.id, p.display_name || p.full_name || 'User'])
      )
    }
  }

  const totalEarnings = (referrals || []).reduce((sum, r) => sum + (r.reward_cents || 0), 0)
  const referralLink = `${APP_URL}/ref/${referralCode}`

  return {
    referralCode,
    referralLink,
    referrals: (referrals || []).map(r => ({
      ...r,
      referredName: r.referred_id ? referredProfiles[r.referred_id] || 'User' : 'Pending',
    })),
    totalEarnings,
    totalReferrals: (referrals || []).length,
    completedReferrals: (referrals || []).filter(r => r.status === 'first_transaction').length,
  }
}

export async function trackReferralSignup(referralCode: string, newUserId: string) {
  const admin = createAdminClient()

  // Find the referrer
  const { data: referrer } = await admin
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .single()

  if (!referrer || referrer.id === newUserId) return { error: 'Invalid referral' }

  // Check for existing referral
  const { data: existing } = await admin
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', newUserId)
    .limit(1)

  if (existing && existing.length > 0) return { error: 'Already referred' }

  // Create referral record
  await admin
    .from('referrals')
    .insert({
      referrer_id: referrer.id,
      referred_id: newUserId,
      status: 'signed_up',
    })

  // Notify referrer
  await createNotification(
    referrer.id,
    'transaction_update',
    'New Referral Signup!',
    'Someone you referred has created an account on Metal Gear.',
    { type: 'referral' }
  )

  return { success: true }
}

export async function advanceReferralStatus(userId: string, milestone: 'first_listing' | 'first_transaction') {
  const admin = createAdminClient()

  // Find referral where this user was referred
  const { data: referral } = await admin
    .from('referrals')
    .select('id, referrer_id, status')
    .eq('referred_id', userId)
    .single()

  if (!referral) return // No referral relationship

  // Only advance, never go backwards
  const statusOrder = ['pending', 'signed_up', 'first_listing', 'first_transaction']
  const currentIndex = statusOrder.indexOf(referral.status)
  const newIndex = statusOrder.indexOf(milestone)

  if (newIndex <= currentIndex) return // Already at or past this milestone

  const updateData: Record<string, unknown> = { status: milestone }

  // Award $10 credit on first transaction
  if (milestone === 'first_transaction') {
    updateData.reward_cents = 1000

    await createNotification(
      referral.referrer_id,
      'transaction_update',
      'Referral Reward Earned!',
      'Your referral completed their first transaction. You earned a $10 credit!',
      { type: 'referral_reward' }
    )
  } else {
    await createNotification(
      referral.referrer_id,
      'transaction_update',
      'Referral Milestone',
      `Your referral just created their first listing on Metal Gear.`,
      { type: 'referral_milestone' }
    )
  }

  await admin
    .from('referrals')
    .update(updateData)
    .eq('id', referral.id)
}
