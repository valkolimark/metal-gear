import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'

export const runtime = 'nodejs'

interface ReputationSummary {
  summary: string
  strengths: string[]
  watchouts: string[]
  responseTime: string
  verifiedClaims: string[]
  buyerRecommendation: string
  confidenceLevel: 'high' | 'medium' | 'low'
  reviewCount: number
  avgRating: number
  lastUpdated: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  // Check cache first
  const { data: profile } = await admin
    .from('profiles')
    .select('reputation_summary, reputation_summary_updated_at')
    .eq('id', id)
    .single()

  if (profile?.reputation_summary) {
    // Return cached if less than 24 hours old
    const updatedAt = profile.reputation_summary_updated_at
      ? new Date(profile.reputation_summary_updated_at)
      : null
    const isStale = !updatedAt || Date.now() - updatedAt.getTime() > 24 * 60 * 60 * 1000

    if (!isStale) {
      return NextResponse.json(profile.reputation_summary as unknown as ReputationSummary)
    }
  }

  // Generate fresh summary
  const summary = await generateReputationSummary(admin, id)
  if (!summary) {
    return NextResponse.json({ error: 'Not enough data to generate summary' }, { status: 404 })
  }

  // Cache it
  await admin
    .from('profiles')
    .update({
      reputation_summary: JSON.parse(JSON.stringify(summary)),
      reputation_summary_updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json(summary)
}

async function generateReputationSummary(
  admin: ReturnType<typeof createAdminClient>,
  sellerId: string
): Promise<ReputationSummary | null> {
  // Fetch all reviews for this seller
  const { data: reviews } = await admin
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id, review_type')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!reviews || reviews.length === 0) return null

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  // Get response time data
  const { data: convs } = await admin
    .from('conversations')
    .select('id, created_at')
    .eq('seller_id', sellerId)
    .limit(30)

  let avgResponseHours: number | null = null
  if (convs && convs.length > 0) {
    const times: number[] = []
    for (const conv of convs.slice(0, 20)) {
      const { data: firstReply } = await admin
        .from('messages')
        .select('created_at')
        .eq('conversation_id', conv.id)
        .eq('sender_id', sellerId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstReply) {
        const diff = (new Date(firstReply.created_at).getTime() - new Date(conv.created_at).getTime()) / (1000 * 60 * 60)
        if (diff > 0 && diff < 168) times.push(diff)
      }
    }
    if (times.length > 0) {
      avgResponseHours = times.reduce((s, t) => s + t, 0) / times.length
    }
  }

  const responseTimeLabel = avgResponseHours === null
    ? 'Response time data not available'
    : avgResponseHours < 1
      ? 'Typically responds within an hour'
      : avgResponseHours < 4
        ? 'Typically responds within a few hours'
        : avgResponseHours < 24
          ? 'Typically responds within a day'
          : `Typically responds within ${Math.round(avgResponseHours / 24)} days`

  // Get transaction count
  const { count: salesCount } = await admin
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .eq('status', 'completed')

  // Prepare review text for Claude
  const reviewTexts = reviews
    .filter((r) => r.comment)
    .map((r) => `Rating: ${r.rating}/5 — "${r.comment}"`)
    .join('\n')

  const reviewStats = `Total reviews: ${reviews.length}, Average rating: ${Math.round(avgRating * 10) / 10}/5, Completed sales: ${salesCount || 0}, Response time: ${responseTimeLabel}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are an industrial marketplace trust analyst. Summarize this seller's reputation based on their reviews. Be honest — if there are recurring complaints, mention them constructively. Buyers are making large B2B purchases ($10K–$500K+) and need accurate information to make decisions.

Format strengths as evidence-backed claims: not "Great seller" but "Ships equipment as described (noted in X of Y reviews)."

Never make up claims not supported by the reviews. If the seller has fewer than 5 reviews, note that confidence is low due to limited data.

Return ONLY valid JSON matching this schema:
{
  "summary": "2-3 sentence plain English summary",
  "strengths": ["top 3 verified strengths with evidence"],
  "watchouts": ["recurring concerns if any — honest, not harsh"],
  "verifiedClaims": ["evidence-backed claims like 'Ships as described (mentioned in X of Y reviews)'"],
  "buyerRecommendation": "X% of buyers rated 4+ stars",
  "confidenceLevel": "high|medium|low"
}`,
      messages: [
        {
          role: 'user',
          content: `Seller stats: ${reviewStats}\n\nReviews:\n${reviewTexts || 'No review comments available — only ratings.'}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const aiResult = JSON.parse(jsonMatch[0])

    // Calculate buyer recommendation from actual data
    const positiveReviews = reviews.filter((r) => r.rating >= 4).length
    const recommendPct = Math.round((positiveReviews / reviews.length) * 100)

    return {
      summary: aiResult.summary,
      strengths: aiResult.strengths || [],
      watchouts: aiResult.watchouts || [],
      responseTime: responseTimeLabel,
      verifiedClaims: aiResult.verifiedClaims || [],
      buyerRecommendation: `${recommendPct}% of buyers would purchase again`,
      confidenceLevel: reviews.length >= 10 ? 'high' : reviews.length >= 5 ? 'medium' : 'low',
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
      lastUpdated: new Date().toISOString(),
    }
  } catch (err) {
    console.error('Reputation summary AI generation failed:', err)
    return null
  }
}
