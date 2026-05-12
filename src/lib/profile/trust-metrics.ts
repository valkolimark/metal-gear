import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TrustMetrics } from '@/components/profile-shared/types'

interface GetTrustMetricsOptions {
  /** Profile id. For "company" trust metrics, aggregates across all members. */
  profileId?: string | null
  /** Company id. Triggers membership-based aggregation. */
  companyId?: string | null
}

/**
 * Canonical 5-stat trust metrics used by the trust strip on /sellers/[id] and
 * /profile. NULL-safe — brand-new sellers return null/0 across the board so
 * the UI can render em-dashes (don't render "0 reviews" for a first-week
 * storefront).
 *
 * For company trust metrics, reviews/transactions/sos_responses/conversations
 * are aggregated across all company_memberships members, mirroring the
 * existing pattern in `getCompanyReputationStats`.
 */
export async function getSellerTrustMetrics({
  profileId,
  companyId,
}: GetTrustMetricsOptions): Promise<TrustMetrics> {
  const admin = createAdminClient()

  // Resolve the set of profile ids whose data backs this trust strip.
  let memberIds: string[] = []
  let onPlatformIso: string | null = null
  if (companyId) {
    const [{ data: members }, { data: company }] = await Promise.all([
      admin
        .from('company_memberships')
        .select('user_id')
        .eq('company_id', companyId),
      admin
        .from('company_profiles')
        .select('created_at')
        .eq('id', companyId)
        .maybeSingle(),
    ])
    memberIds = (members ?? []).map((m) => m.user_id)
    onPlatformIso = company?.created_at ?? null
  } else if (profileId) {
    memberIds = [profileId]
    const { data: profile } = await admin
      .from('profiles')
      .select('created_at')
      .eq('id', profileId)
      .maybeSingle()
    onPlatformIso = profile?.created_at ?? null
  }

  if (memberIds.length === 0) {
    return emptyMetrics(onPlatformIso, 0)
  }

  // Five parallel buckets. Each bucket is a discrete query so that one slow
  // call (e.g., messages) doesn't block the others.
  const [
    reviewsRes,
    transactionsRes,
    sosResponsesRes,
    conversationsRes,
    followersRes,
  ] = await Promise.all([
    admin.from('reviews').select('rating').in('seller_id', memberIds),
    admin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .in('seller_id', memberIds)
      .eq('status', 'completed'),
    admin
      .from('sos_responses')
      .select('id', { count: 'exact', head: true })
      .in('responder_id', memberIds),
    admin
      .from('conversations')
      .select('id, created_at, messages(created_at, sender_id)')
      .in('seller_id', memberIds)
      .order('created_at', { ascending: false })
      .limit(60),
    companyId
      ? admin
          .from('seller_followers')
          .select('id', { count: 'exact', head: true })
          .eq('seller_company_id', companyId)
      : admin
          .from('seller_followers')
          .select('id', { count: 'exact', head: true })
          .eq('seller_profile_id', profileId as string),
  ])

  const reviews = reviewsRes.data ?? []
  const ratingCount = reviews.length
  const ratingAvg =
    ratingCount > 0
      ? Number(
          (reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / ratingCount).toFixed(
            1,
          ),
        )
      : null

  const transactionsCount = transactionsRes.count ?? 0
  const sosResponsesCount = sosResponsesRes.count ?? 0
  const followerCount = followersRes.count ?? 0

  const { avgMinutes, ratePct } = computeResponseStats(
    conversationsRes.data ?? [],
    new Set(memberIds),
  )

  const onPlatform = computeOnPlatform(onPlatformIso)

  return {
    rating: { avg: ratingAvg, count: ratingCount },
    transactions: { count: transactionsCount },
    sosResponses: { count: sosResponsesCount },
    responseTime: { avgMinutes, ratePct },
    onPlatform,
    followers: { count: followerCount },
  }
}

function computeOnPlatform(iso: string | null): TrustMetrics['onPlatform'] {
  if (!iso) return { sinceYear: null, years: null }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { sinceYear: null, years: null }
  const sinceYear = d.getUTCFullYear()
  const yearsRaw = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return { sinceYear, years: Math.max(0, Math.floor(yearsRaw)) }
}

interface ConversationRow {
  id: string
  messages: { created_at: string; sender_id: string | null }[] | null
}

function computeResponseStats(
  conversations: ConversationRow[],
  sellerIds: Set<string>,
): { avgMinutes: number | null; ratePct: number | null } {
  if (conversations.length === 0) return { avgMinutes: null, ratePct: null }
  let totalEligible = 0
  let totalReplied = 0
  let sumMinutes = 0
  for (const conv of conversations) {
    const msgs = conv.messages ?? []
    if (msgs.length < 1) continue
    const sorted = [...msgs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    const firstFromBuyer = sorted.find(
      (m) => m.sender_id !== null && !sellerIds.has(m.sender_id),
    )
    if (!firstFromBuyer) continue
    totalEligible++
    const firstSellerReply = sorted.find(
      (m) =>
        m.sender_id !== null &&
        sellerIds.has(m.sender_id) &&
        new Date(m.created_at).getTime() >
          new Date(firstFromBuyer.created_at).getTime(),
    )
    if (!firstSellerReply) continue
    const diffMin =
      (new Date(firstSellerReply.created_at).getTime() -
        new Date(firstFromBuyer.created_at).getTime()) /
      60_000
    if (diffMin > 0 && diffMin < 10_080) {
      totalReplied++
      sumMinutes += diffMin
    }
  }
  if (totalEligible === 0) return { avgMinutes: null, ratePct: null }
  return {
    avgMinutes:
      totalReplied > 0 ? Math.round(sumMinutes / totalReplied) : null,
    ratePct: Math.round((totalReplied / totalEligible) * 100),
  }
}

function emptyMetrics(
  onPlatformIso: string | null,
  followerCount: number,
): TrustMetrics {
  return {
    rating: { avg: null, count: 0 },
    transactions: { count: 0 },
    sosResponses: { count: 0 },
    responseTime: { avgMinutes: null, ratePct: null },
    onPlatform: computeOnPlatform(onPlatformIso),
    followers: { count: followerCount },
  }
}
