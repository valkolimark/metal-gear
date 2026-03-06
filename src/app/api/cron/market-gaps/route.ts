import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Get SOS requests from last 90 days with response counts
  const { data: sosRequests } = await admin
    .from('sos_requests')
    .select('id, equipment_category, equipment_subcategory')
    .gte('created_at', ninetyDaysAgo.toISOString())

  if (!sosRequests || sosRequests.length === 0) {
    return NextResponse.json({ processed: 0, reason: 'no SOS data' })
  }

  // Get response counts for each SOS
  const sosIds = sosRequests.map((s) => s.id)
  const { data: responses } = await admin
    .from('sos_responses')
    .select('sos_request_id')
    .in('sos_request_id', sosIds)

  const responseCountMap = new Map<string, number>()
  for (const r of responses || []) {
    responseCountMap.set(r.sos_request_id, (responseCountMap.get(r.sos_request_id) || 0) + 1)
  }

  // Group by category
  const categoryStats = new Map<string, { sosCount: number; unmatchedCount: number; totalResponses: number }>()

  for (const sos of sosRequests) {
    const cat = sos.equipment_subcategory || sos.equipment_category || 'Unknown'
    const respCount = responseCountMap.get(sos.id) || 0
    const stats = categoryStats.get(cat) || { sosCount: 0, unmatchedCount: 0, totalResponses: 0 }
    stats.sosCount++
    if (respCount === 0) stats.unmatchedCount++
    stats.totalResponses += respCount
    categoryStats.set(cat, stats)
  }

  // Filter to categories with 3+ SOS and calculate gap percentage
  const gaps = [...categoryStats.entries()]
    .filter(([, stats]) => stats.sosCount >= 3)
    .map(([category, stats]) => ({
      category,
      sosCount: stats.sosCount,
      unmatchedCount: stats.unmatchedCount,
      avgResponses: Math.round((stats.totalResponses / stats.sosCount) * 10) / 10,
      gapPct: Math.round((stats.unmatchedCount / stats.sosCount) * 100),
    }))
    .sort((a, b) => b.gapPct - a.gapPct)
    .slice(0, 15)

  if (gaps.length === 0) {
    return NextResponse.json({ processed: 0, reason: 'no significant gaps found' })
  }

  // AI analysis
  let aiAnalysis = null
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are a business development analyst for a B2B industrial equipment marketplace based in Houston, TX (oil & gas, petrochemical, manufacturing).

Given this list of equipment subcategories with high demand but few suppliers, identify the top 5 recruitment opportunities and explain why each matters.

For each gap, provide:
- subcategory: the equipment category name
- whyGapExists: Why this gap exists (seasonal? niche? geography?)
- sellerTypeToRecruit: What type of seller to recruit (rebuilder, dealer, OEM distributor?)
- estimatedRevenuePotential: Estimated monthly revenue potential if gap is filled
- suggestedOutreach: Suggested outreach approach in 1-2 sentences
- priority: "critical" | "high" | "medium"

Return ONLY a valid JSON array of objects.`,
      messages: [
        {
          role: 'user',
          content: `Market gap data (last 90 days):\n\n${JSON.stringify(gaps, null, 2)}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      aiAnalysis = JSON.parse(jsonMatch[0])
    }
  } catch (err) {
    console.error('Market gap AI analysis failed:', err)
  }

  // Store report
  const periodEnd = new Date()
  await admin.from('market_gap_reports').insert({
    period_start: ninetyDaysAgo.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
    gaps: JSON.parse(JSON.stringify(gaps)),
    ai_analysis: aiAnalysis ? JSON.parse(JSON.stringify(aiAnalysis)) : JSON.parse(JSON.stringify({ error: 'AI analysis failed' })),
  })

  return NextResponse.json({
    gapsFound: gaps.length,
    aiRecommendations: aiAnalysis ? aiAnalysis.length : 0,
  })
}
