import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActivityEntry } from '@/components/profile-shared/types'

interface GetActivityFeedOptions {
  profileId?: string | null
  companyId?: string | null
  limit?: number
}

/**
 * Synthesizes a recent-activity timeline from listings + reviews +
 * transactions + SOS responses. We do NOT read the `user_activity` table —
 * those events are page-view granularity and noisy. Instead we surface
 * meaningful events from the underlying tables, sorted by occurrence time.
 */
export async function getActivityFeed({
  profileId,
  companyId,
  limit = 5,
}: GetActivityFeedOptions): Promise<ActivityEntry[]> {
  if (!profileId && !companyId) return []
  const admin = createAdminClient()

  // Resolve seller-profile-id set. Companies aggregate across members.
  let memberIds: string[] = []
  if (companyId) {
    const { data: members } = await admin
      .from('company_memberships')
      .select('user_id')
      .eq('company_id', companyId)
    memberIds = (members ?? []).map((m) => m.user_id)
  } else if (profileId) {
    memberIds = [profileId]
  }
  if (memberIds.length === 0) return []

  const [listingsRes, reviewsRes, transactionsRes, sosRes] = await Promise.all([
    admin
      .from('listings')
      .select('id, title, status, created_at, updated_at')
      .in('seller_id', memberIds)
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('reviews')
      .select('id, rating, comment, created_at')
      .in('seller_id', memberIds)
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('transactions')
      .select('id, status, updated_at, amount_cents')
      .in('seller_id', memberIds)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(limit),
    admin
      .from('sos_responses')
      .select('id, sos_request_id, created_at')
      .in('responder_id', memberIds)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const entries: ActivityEntry[] = []

  for (const l of listingsRes.data ?? []) {
    const occurred = l.status === 'sold' ? l.updated_at : l.created_at
    if (!occurred) continue
    entries.push({
      id: `listing-${l.id}`,
      type: l.status === 'sold' ? 'listing_sold' : 'listing_created',
      title: l.status === 'sold' ? `Sold listing` : 'Posted a new listing',
      subtitle: l.title,
      occurredAt: occurred,
    })
  }

  for (const r of reviewsRes.data ?? []) {
    if (!r.created_at) continue
    entries.push({
      id: `review-${r.id}`,
      type: 'review_received',
      title: `Received a ${r.rating}★ review`,
      subtitle: r.comment ? r.comment.slice(0, 80) : 'View on profile',
      occurredAt: r.created_at,
    })
  }

  for (const t of transactionsRes.data ?? []) {
    if (!t.updated_at) continue
    const dollars =
      t.amount_cents !== null
        ? `$${(t.amount_cents / 100).toLocaleString()}`
        : ''
    entries.push({
      id: `tx-${t.id}`,
      type: 'transaction_completed',
      title: 'Completed a transaction',
      subtitle: dollars ? `${dollars} settled` : 'Sale settled',
      occurredAt: t.updated_at,
    })
  }

  for (const r of sosRes.data ?? []) {
    if (!r.created_at) continue
    entries.push({
      id: `sos-${r.id}`,
      type: 'sos_responded',
      title: 'Responded to an SOS',
      subtitle: 'View thread',
      occurredAt: r.created_at,
    })
  }

  entries.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
  return entries.slice(0, limit)
}
