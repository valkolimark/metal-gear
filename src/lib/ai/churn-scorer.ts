import { createAdminClient } from '@/lib/supabase/admin'

export interface ChurnSignals {
  noLoginLast14Days: boolean
  listingViewsDropped50Percent: boolean
  messagesSentThisMonth: number
  listingExpiredNotRenewed: boolean
  sosPostedThisMonth: boolean
  offerReceivedThisMonth: boolean
  subscriptionAge30DaysOrLess: boolean
  priceChangedDownRecently: boolean
  noListingsActive: boolean
}

const SIGNAL_WEIGHTS = {
  noLoginLast14Days: 30,
  listingViewsDropped50Percent: 20,
  messagesSentThisMonth: -15,
  listingExpiredNotRenewed: 25,
  sosPostedThisMonth: -20,
  offerReceivedThisMonth: -25,
  subscriptionAge30DaysOrLess: 15,
  priceChangedDownRecently: 10,
  noListingsActive: 20,
}

export function calculateChurnScore(signals: ChurnSignals): {
  score: number
  level: 'low' | 'at_risk' | 'high_risk'
  firedSignals: Record<string, number>
} {
  let score = 0
  const firedSignals: Record<string, number> = {}

  if (signals.noLoginLast14Days) {
    score += SIGNAL_WEIGHTS.noLoginLast14Days
    firedSignals.noLoginLast14Days = SIGNAL_WEIGHTS.noLoginLast14Days
  }
  if (signals.listingViewsDropped50Percent) {
    score += SIGNAL_WEIGHTS.listingViewsDropped50Percent
    firedSignals.listingViewsDropped50Percent = SIGNAL_WEIGHTS.listingViewsDropped50Percent
  }
  if (signals.messagesSentThisMonth > 0) {
    score += SIGNAL_WEIGHTS.messagesSentThisMonth
    firedSignals.messagesSentThisMonth = SIGNAL_WEIGHTS.messagesSentThisMonth
  }
  if (signals.listingExpiredNotRenewed) {
    score += SIGNAL_WEIGHTS.listingExpiredNotRenewed
    firedSignals.listingExpiredNotRenewed = SIGNAL_WEIGHTS.listingExpiredNotRenewed
  }
  if (signals.sosPostedThisMonth) {
    score += SIGNAL_WEIGHTS.sosPostedThisMonth
    firedSignals.sosPostedThisMonth = SIGNAL_WEIGHTS.sosPostedThisMonth
  }
  if (signals.offerReceivedThisMonth) {
    score += SIGNAL_WEIGHTS.offerReceivedThisMonth
    firedSignals.offerReceivedThisMonth = SIGNAL_WEIGHTS.offerReceivedThisMonth
  }
  if (signals.subscriptionAge30DaysOrLess) {
    score += SIGNAL_WEIGHTS.subscriptionAge30DaysOrLess
    firedSignals.subscriptionAge30DaysOrLess = SIGNAL_WEIGHTS.subscriptionAge30DaysOrLess
  }
  if (signals.priceChangedDownRecently) {
    score += SIGNAL_WEIGHTS.priceChangedDownRecently
    firedSignals.priceChangedDownRecently = SIGNAL_WEIGHTS.priceChangedDownRecently
  }
  if (signals.noListingsActive) {
    score += SIGNAL_WEIGHTS.noListingsActive
    firedSignals.noListingsActive = SIGNAL_WEIGHTS.noListingsActive
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  const level = score >= 75 ? 'high_risk' : score >= 50 ? 'at_risk' : 'low'

  return { score, level, firedSignals }
}

export async function gatherChurnSignals(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<ChurnSignals> {
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Gather all signals in parallel
  const [
    profileRes,
    activeListingsRes,
    messagesRes,
    expiredListingsRes,
    sosRes,
    // We approximate offer received by checking conversations started by others
    incomingConvsRes,
    priceHistoryRes,
  ] = await Promise.all([
    admin.from('profiles').select('last_login_at, created_at').eq('id', userId).single(),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('status', 'active'),
    admin.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('status', 'expired').gte('updated_at', thirtyDaysAgo.toISOString()),
    admin.from('sos_requests').select('id', { count: 'exact', head: true }).eq('requester_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    admin.from('conversations').select('id', { count: 'exact', head: true }).eq('seller_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    admin.from('price_history').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const lastLogin = profileRes.data?.last_login_at ? new Date(profileRes.data.last_login_at) : null
  const createdAt = profileRes.data?.created_at ? new Date(profileRes.data.created_at) : null

  return {
    noLoginLast14Days: !lastLogin || lastLogin < fourteenDaysAgo,
    listingViewsDropped50Percent: false, // Complex to compute, skip for now
    messagesSentThisMonth: messagesRes.count || 0,
    listingExpiredNotRenewed: (expiredListingsRes.count || 0) > 0,
    sosPostedThisMonth: (sosRes.count || 0) > 0,
    offerReceivedThisMonth: (incomingConvsRes.count || 0) > 0,
    subscriptionAge30DaysOrLess: createdAt ? (now.getTime() - createdAt.getTime()) < 30 * 24 * 60 * 60 * 1000 : false,
    priceChangedDownRecently: (priceHistoryRes.count || 0) > 0,
    noListingsActive: (activeListingsRes.count || 0) === 0,
  }
}
