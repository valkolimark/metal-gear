'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { withAiUsageTracking } from '@/lib/telemetry/ai-usage'

interface DisputeSummary {
  summary: string
  buyerClaim: string
  sellerPosition: string
  keyFactsAgreedOn: string[]
  keyDisagreements: string[]
  evidenceAssessment: string
  possibleOutcomes: Array<{
    outcome: string
    reasoning: string
    precedent: string
  }>
  recommendedAction?: string
  confidenceInRecommendation: 'high' | 'medium' | 'low'
  flaggedIssues?: string[]
}

export async function generateDisputeSummary(disputeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check admin
  const { data: profile } = await admin
    .from('profiles')
    .select('admin_role')
    .eq('id', user.id)
    .single()

  if (!profile?.admin_role) return { error: 'Not authorized — admin only' }

  // Fetch dispute with all related data
  const { data: dispute } = await admin
    .from('disputes')
    .select('*, transactions!disputes_transaction_id_fkey(*, listings!transactions_listing_id_fkey(title, description, condition, price_cents, category, industry))')
    .eq('id', disputeId)
    .single()

  if (!dispute) return { error: 'Dispute not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transaction = dispute.transactions as any
  const listing = transaction?.listings

  // Get buyer and seller profiles
  const [{ data: buyer }, { data: seller }] = await Promise.all([
    admin.from('profiles').select('full_name, display_name').eq('id', transaction.buyer_id).single(),
    admin.from('profiles').select('full_name, display_name').eq('id', transaction.seller_id).single(),
  ])

  const buyerName = buyer?.display_name || buyer?.full_name || 'Buyer'
  const sellerName = seller?.display_name || seller?.full_name || 'Seller'

  // Build context for Claude
  const context = {
    listing: {
      title: listing?.title,
      description: listing?.description?.slice(0, 500),
      condition: listing?.condition,
      price: listing?.price_cents ? `$${(listing.price_cents / 100).toLocaleString()}` : 'Unknown',
      category: listing?.category,
      industry: listing?.industry,
    },
    transaction: {
      amount: transaction.amount_cents ? `$${(transaction.amount_cents / 100).toLocaleString()}` : 'Unknown',
      status: transaction.status,
      createdAt: transaction.created_at,
    },
    dispute: {
      reason: dispute.reason,
      buyerStatement: dispute.description,
      sellerResponse: dispute.seller_response || 'No response yet',
      buyerEvidenceCount: (dispute.evidence_urls as string[])?.length || 0,
      sellerEvidenceCount: (dispute.seller_evidence_urls as string[])?.length || 0,
      status: dispute.status,
      openedAt: dispute.created_at,
    },
    buyerName,
    sellerName,
  }

  try {
    const response = await withAiUsageTracking(
      {
        userId: user.id,
        surface: 'dispute_mediation',
        vendor: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        traceId: disputeId,
      },
      () => anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are a neutral dispute mediation analyst for Metal Gear, a B2B industrial equipment marketplace. Your job is to help admin reviewers understand disputes quickly and fairly.

Read all dispute evidence and generate a neutral case summary. You are NOT making the decision — you are providing analysis to help the human admin decide.

Be fair to both parties. Note evidence gaps. Flag anything suspicious but don't make accusations.

Return ONLY valid JSON matching this schema:
{
  "summary": "2-3 paragraph neutral case summary",
  "buyerClaim": "distilled buyer claim in 1-2 sentences",
  "sellerPosition": "distilled seller position in 1-2 sentences",
  "keyFactsAgreedOn": ["facts both parties agree on"],
  "keyDisagreements": ["points of contention"],
  "evidenceAssessment": "what the evidence shows",
  "possibleOutcomes": [
    { "outcome": "e.g. Full refund", "reasoning": "why", "precedent": "when this applies" }
  ],
  "recommendedAction": "neutral suggestion",
  "confidenceInRecommendation": "high|medium|low",
  "flaggedIssues": ["anything suspicious or noteworthy"]
}`,
      messages: [
        {
          role: 'user',
          content: `Analyze this dispute:\n\n${JSON.stringify(context, null, 2)}`,
        },
      ],
      }),
      (r) => ({
        inputTokens: r.usage?.input_tokens,
        outputTokens: r.usage?.output_tokens,
      }),
    )

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { error: 'Failed to parse AI response' }

    const aiSummary: DisputeSummary = JSON.parse(jsonMatch[0])

    // Store in disputes table
    await admin
      .from('disputes')
      .update({ ai_summary: JSON.parse(JSON.stringify(aiSummary)) })
      .eq('id', disputeId)

    return { summary: aiSummary }
  } catch (err) {
    console.error('Dispute mediation AI failed:', err)
    return { error: 'Failed to generate AI summary' }
  }
}

export async function getDisputeSummary(disputeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: dispute } = await admin
    .from('disputes')
    .select('ai_summary')
    .eq('id', disputeId)
    .single()

  if (!dispute) return { error: 'Dispute not found' }

  return { summary: dispute.ai_summary as DisputeSummary | null }
}
