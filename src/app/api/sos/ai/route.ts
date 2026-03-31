import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'
import { SOSAISchema } from '@/lib/security/validate'
import { escapePostgrestValue } from '@/lib/security/sanitize'

export const maxDuration = 30

interface SOSAIRequest {
  action: 'categorize' | 'rank_responses' | 'predict_demand'

  description?: string

  sosRequestId?: string
  responses?: Array<{
    id: string
    sellerId: string
    sellerTrustScore: number
    responseTime: number
    priceEstimate?: number
    leadTimeDays?: number
    condition?: string
    description: string
    sellerEquipmentMatch: boolean
  }>
  sosDetails?: {
    subcategory: string
    urgency: string
    requiredSpecs?: Record<string, string>
    maxBudget?: number
  }

  subcategory?: string
  region?: string
  lookbackDays?: number
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

const CATEGORIZE_PROMPT = `You are an industrial equipment classification specialist for a Houston, TX B2B marketplace. Given a free-text description of what equipment someone needs urgently, extract structured information.

Equipment categories include: Valves & Actuators, Pumps & Compressors, Heat Exchangers, Process Equipment, Instrumentation & Controls, Electrical Equipment, Rotating Equipment, Material Handling, Piping & Fittings, Safety & Environmental, Tanks & Vessels, Filtration & Separation, Power Generation, CNC & Machine Tools, Welding Equipment.

Detect urgency from keywords like: "down", "urgent", "ASAP", "emergency", "offline", "production stopped", "shutdown", "critical", "immediately" = critical. Otherwise = normal.

Return ONLY valid JSON with these keys:
- "tier1" (string — broad category like "Process Equipment")
- "tier2" (string — equipment group ID like "centrifuges" or "control_valves")
- "subcategory" (string — specific type like "decanter_centrifuge")
- "confidence" ("high", "medium", or "low")
- "extractedSpecs" (object of key-value pairs extracted from description)
- "extractedUrgency" ("critical", "urgent", or "normal")
- "extractedBrand" (string or null)
- "suggestedTitle" (string, concise title for the SOS)
- "clarifyingQuestion" (string or null — if confidence is low, ask a question)

No markdown fences.`

const RANK_PROMPT = `You are an industrial equipment matchmaker. Given an SOS request and multiple seller responses, rank the responses by quality.

Scoring weights:
- Spec match (40 points): Does the offered equipment meet the SOS requirements?
- Seller trust score (25 points): Based on 0-100 trust score
- Response speed (15 points): Faster responses within first 4 hours get more points
- Price vs market (10 points): Within expected range for the equipment
- Condition match (10 points): Meets or exceeds requested condition

Return ONLY valid JSON with these keys:
- "rankedResponses" (array of objects with: responseId, rank, score (0-100), reasoning, flags (array of strings))
- "rankingSummary" (string, 1-2 sentence summary)

No markdown fences.`

const DEMAND_PROMPT = `You are an industrial equipment market analyst. Given historical SOS request data for a subcategory, analyze demand patterns and predict future trends.

Return ONLY valid JSON with these keys:
- "nextPeakMonth" (string, e.g. "March")
- "historicalPattern" (string, e.g. "Demand spikes in Q1 and Q3")
- "recommendedAction" (string, e.g. "Stock 2-3 units by February")
- "demandTrend" ("rising", "stable", or "declining")
- "topRequestingIndustries" (array of strings)
- "avgResponseRate" (number, percentage)
- "insight" (string, 1-2 sentence actionable insight)

No markdown fences.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = SOSAISchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const { action } = parsed.data
    // Re-alias for usage below
    const validatedBody = parsed.data

    if (action === 'categorize') {
      const { description } = validatedBody
      if (!description?.trim()) {
        return NextResponse.json({ error: 'Description is required' }, { status: 400 })
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: CATEGORIZE_PROMPT,
        messages: [{
          role: 'user',
          content: `Classify this equipment request:\n\n"${description}"`,
        }],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const cleaned = cleanJsonResponse(rawText)

      try {
        const parsed = JSON.parse(cleaned)
        return NextResponse.json({ categorization: parsed })
      } catch {
        console.error('SOS AI parse failure:', rawText.slice(0, 200))
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }
    }

    if (action === 'rank_responses') {
      const { sosRequestId, responses, sosDetails } = validatedBody

      // If sosRequestId provided, load from DB
      let actualResponses = responses
      let actualDetails = sosDetails

      if (sosRequestId && (!responses || responses.length === 0)) {
        const admin = createAdminClient()

        const { data: sos } = await admin
          .from('sos_requests')
          .select('*')
          .eq('id', sosRequestId)
          .single()

        if (!sos) {
          return NextResponse.json({ error: 'SOS not found' }, { status: 404 })
        }

        actualDetails = {
          subcategory: sos.equipment_subcategory || sos.equipment_category,
          urgency: sos.urgency || 'normal',
        }

        const { data: dbResponses } = await admin
          .from('sos_responses')
          .select('*, responder:profiles!sos_responses_responder_id_fkey(id, full_name)')
          .eq('sos_request_id', sosRequestId)
          .order('created_at', { ascending: true })

        if (!dbResponses || dbResponses.length === 0) {
          return NextResponse.json({ rankedResponses: [], rankingSummary: 'No responses to rank.' })
        }

        actualResponses = dbResponses.map((r, idx) => ({
          id: r.id,
          sellerId: r.responder_id,
          sellerTrustScore: 50,
          responseTime: idx * 30 + 10,
          priceEstimate: r.price_estimate ? parseFloat(r.price_estimate.replace(/[^0-9.]/g, '')) : undefined,
          leadTimeDays: r.lead_time ? parseInt(r.lead_time) || undefined : undefined,
          condition: r.condition || undefined,
          description: r.message,
          sellerEquipmentMatch: true,
        }))
      }

      if (!actualResponses || actualResponses.length === 0) {
        return NextResponse.json({ rankedResponses: [], rankingSummary: 'No responses to rank.' })
      }

      const context = [
        `SOS Details:`,
        actualDetails ? `  Equipment: ${actualDetails.subcategory}` : '',
        actualDetails ? `  Urgency: ${actualDetails.urgency}` : '',
        actualDetails?.maxBudget ? `  Max budget: $${actualDetails.maxBudget.toLocaleString()}` : '',
        '',
        `Responses (${actualResponses.length}):`,
        ...actualResponses.map((r, i) => [
          `  Response ${i + 1} (ID: ${r.id}):`,
          `    Description: ${r.description}`,
          `    Trust Score: ${r.sellerTrustScore}/100`,
          `    Response Time: ${r.responseTime} minutes`,
          r.priceEstimate ? `    Price: $${r.priceEstimate.toLocaleString()}` : '',
          r.condition ? `    Condition: ${r.condition}` : '',
          r.leadTimeDays ? `    Lead Time: ${r.leadTimeDays} days` : '',
          `    Equipment Match: ${r.sellerEquipmentMatch ? 'Yes' : 'No'}`,
        ].filter(Boolean).join('\n')),
      ].filter(Boolean).join('\n')

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: RANK_PROMPT,
        messages: [{
          role: 'user',
          content: `Rank these SOS responses:\n\n${context}`,
        }],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const cleaned = cleanJsonResponse(rawText)

      try {
        const parsed = JSON.parse(cleaned)

        // Store ranking in DB if we have a request ID
        if (sosRequestId) {
          const admin = createAdminClient()
          const rankedIds = (parsed.rankedResponses || []).map((r: { responseId: string }) => r.responseId)
          await admin
            .from('sos_requests')
            .update({ ranked_response_ids: rankedIds })
            .eq('id', sosRequestId)
        }

        return NextResponse.json(parsed)
      } catch {
        console.error('SOS AI parse failure:', rawText.slice(0, 200))
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }
    }

    if (action === 'predict_demand') {
      const { subcategory, region, lookbackDays = 365 } = validatedBody
      if (!subcategory) {
        return NextResponse.json({ error: 'Subcategory is required' }, { status: 400 })
      }

      const admin = createAdminClient()
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

      // Get historical SOS data for this subcategory
      const { data: sosHistory } = await admin
        .from('sos_requests')
        .select('id, created_at, urgency, status, location_state')
        .or(`equipment_category.eq.${escapePostgrestValue(subcategory)},equipment_subcategory.eq.${escapePostgrestValue(subcategory)}`)
        .gte('created_at', since)
        .order('created_at', { ascending: true })

      // Get response counts
      const sosIds = (sosHistory || []).map((s) => s.id)
      let responseStats = { total: 0, responded: 0 }
      if (sosIds.length > 0) {
        const { data: responseCounts } = await admin
          .from('sos_responses')
          .select('sos_request_id')
          .in('sos_request_id', sosIds)

        const respondedIds = new Set((responseCounts || []).map((r) => r.sos_request_id))
        responseStats = {
          total: sosIds.length,
          responded: respondedIds.size,
        }
      }

      // Group by month
      const monthlyData: Record<string, number> = {}
      for (const sos of sosHistory || []) {
        const month = (sos.created_at || '').slice(0, 7) // YYYY-MM
        monthlyData[month] = (monthlyData[month] || 0) + 1
      }

      const context = [
        `Equipment subcategory: ${subcategory.replace(/_/g, ' ')}`,
        region ? `Region: ${region}` : '',
        `Lookback period: ${lookbackDays} days`,
        `Total SOS requests: ${sosHistory?.length || 0}`,
        `Response rate: ${responseStats.total > 0 ? Math.round((responseStats.responded / responseStats.total) * 100) : 0}%`,
        '',
        'Monthly breakdown:',
        ...Object.entries(monthlyData).map(([month, count]) => `  ${month}: ${count} requests`),
        '',
        `Urgency breakdown:`,
        `  Critical: ${(sosHistory || []).filter((s) => s.urgency === 'critical').length}`,
        `  Normal: ${(sosHistory || []).filter((s) => s.urgency === 'normal').length}`,
        '',
        `Fulfillment:`,
        `  Fulfilled: ${(sosHistory || []).filter((s) => s.status === 'fulfilled').length}`,
        `  Expired/Cancelled: ${(sosHistory || []).filter((s) => ['expired', 'cancelled'].includes(s.status || '')).length}`,
      ].filter(Boolean).join('\n')

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: DEMAND_PROMPT,
        messages: [{
          role: 'user',
          content: `Analyze demand patterns for this equipment:\n\n${context}`,
        }],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const cleaned = cleanJsonResponse(rawText)

      try {
        const parsed = JSON.parse(cleaned)
        return NextResponse.json({ prediction: parsed })
      } catch {
        console.error('SOS AI parse failure:', rawText.slice(0, 200))
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('SOS AI error:', error)
    return NextResponse.json({ error: 'SOS AI processing failed' }, { status: 500 })
  }
}
