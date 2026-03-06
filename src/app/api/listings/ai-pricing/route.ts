import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 30

interface PricingRequest {
  action: 'suggest_price' | 'coach_negotiation'

  listing?: {
    category: string
    condition?: string
    manufacturer?: string
    model?: string
    year?: number
    specs?: Record<string, string>
    location?: string
  }

  negotiation?: {
    side: 'buyer' | 'seller'
    listingId: string
    askPrice: number
    offerPrice: number
    offerCount: number
    daysOnMarket: number
    condition: string
    subcategory: string
    comparableStats?: {
      medianPrice: number
      minPrice: number
      maxPrice: number
      avgDaysOnMarket: number
      sampleSize: number
    }
  }
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

async function getComparables(category: string, condition?: string, manufacturer?: string) {
  const admin = createAdminClient()

  const { data } = await admin
    .from('listings')
    .select('id, title, category, condition, price_cents, specifications, location_city, location_state, status, created_at, updated_at')
    .eq('category', category)
    .in('status', ['active', 'sold'])
    .not('price_cents', 'is', null)
    .gt('price_cents', 0)
    .order('updated_at', { ascending: false })
    .limit(20)

  if (!data || data.length === 0) return []

  // Enrich with extracted fields and score by relevance
  return data
    .map((item) => {
      const specs = (item.specifications || {}) as Record<string, string>
      const itemManufacturer = specs.manufacturer || null
      const itemModel = specs.model || null
      const itemYear = specs.year || null
      const daysOnMarket = Math.floor(
        (new Date(item.updated_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      let relevance = 1
      if (condition && item.condition === condition) relevance += 2
      if (manufacturer && itemManufacturer &&
          itemManufacturer.toLowerCase() === manufacturer.toLowerCase()) relevance += 3

      return {
        ...item,
        manufacturer: itemManufacturer,
        model: itemModel,
        year: itemYear,
        days_on_market: daysOnMarket,
        region: (item.location_state === 'TX' || item.location_state === 'LA' || item.location_state === 'MS') ? 'Gulf Coast' : 'Other US',
        relevance,
      }
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10)
}

async function getComparableStatsForListing(listingId: string) {
  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('category, condition, price_cents, created_at')
    .eq('id', listingId)
    .single()

  if (!listing) return null

  const comparables = await getComparables(listing.category, listing.condition)
  if (comparables.length === 0) return null

  const prices = comparables
    .map((c: Record<string, unknown>) => Number(c.price_cents))
    .filter((p: number) => p > 0)
    .sort((a: number, b: number) => a - b)

  if (prices.length === 0) return null

  const daysOnMarket = comparables
    .map((c: Record<string, unknown>) => Number(c.days_on_market) || 0)
    .filter((d: number) => d > 0)

  return {
    medianPrice: prices[Math.floor(prices.length / 2)] / 100,
    minPrice: prices[0] / 100,
    maxPrice: prices[prices.length - 1] / 100,
    avgDaysOnMarket: daysOnMarket.length > 0
      ? Math.round(daysOnMarket.reduce((a: number, b: number) => a + b, 0) / daysOnMarket.length)
      : 30,
    sampleSize: prices.length,
  }
}

const PRICING_PROMPT = `You are a pricing analyst for industrial equipment in the Houston, TX B2B marketplace. Given comparable sales data and equipment details, provide a data-driven price recommendation.

Analyze the comparables and the target equipment to suggest:
1. A price range (min/max) based on condition, age, and market activity
2. A target price (sweet spot for fastest sale at fair value)
3. Confidence level based on sample size and relevance
4. 2-3 actionable pricing tips

Return ONLY valid JSON with these keys:
- "suggestedMin" (number, in dollars)
- "suggestedMax" (number, in dollars)
- "suggestedTarget" (number, in dollars)
- "confidence" ("high" if 5+ close comparables, "medium" if 3-4, "low" if 1-2)
- "reasoning" (string, 1-2 sentences about how you arrived at this)
- "comparables" (array of objects with: title, price, condition, daysOnMarket, soldOrActive)
- "marketInsight" (string, 1 sentence about current market for this equipment)
- "pricingTips" (array of 2-3 strings)

No markdown fences.`

const COACHING_PROMPT = (side: string) => `You are a confidential negotiation advisor for industrial equipment transactions.
You help the ${side} make smart decisions based on market data, without being visible to the other party. Be direct and give a specific recommended action.

Never suggest accepting a deal that's clearly below market unless the equipment has serious issues. Never suggest overpricing that will kill the deal.
This advice is private — only the ${side} sees it.

Return ONLY valid JSON with these keys:
- "assessment" (string, 1-2 sentences about this offer relative to market)
- "recommendedAction" (string, e.g. "Counter at $21,500" or "Accept this offer")
- "recommendedPrice" (number or null if recommending accept/reject)
- "rationale" (string, why this recommendation makes sense)
- "acceptanceProbability" ("high", "medium", or "low")
- "redFlags" (array of strings, things to watch out for — can be empty)
- "talkingPoints" (array of 2-3 strings, what to say in response)

No markdown fences.`

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PricingRequest
    const { action } = body

    if (action === 'suggest_price') {
      const { listing } = body
      if (!listing?.category) {
        return NextResponse.json({ error: 'Category is required' }, { status: 400 })
      }

      const comparables = await getComparables(
        listing.category,
        listing.condition,
        listing.manufacturer
      )

      if (comparables.length === 0) {
        return NextResponse.json({
          pricing: null,
          message: 'No recent comparable sales found. Consider researching Machinio or EquipNet for pricing reference.',
        })
      }

      const comparablesSummary = comparables.map((c: Record<string, unknown>) => ({
        title: c.title,
        price: `$${(Number(c.price_cents) / 100).toLocaleString()}`,
        condition: c.condition,
        daysOnMarket: c.days_on_market,
        status: c.status,
        manufacturer: c.manufacturer,
        model: c.model,
        year: c.year,
        region: c.region,
      }))

      const targetDetails = [
        `Category: ${listing.category}`,
        listing.condition && `Condition: ${listing.condition}`,
        listing.manufacturer && `Manufacturer: ${listing.manufacturer}`,
        listing.model && `Model: ${listing.model}`,
        listing.year && `Year: ${listing.year}`,
        listing.location && `Location: ${listing.location}`,
        listing.specs && Object.keys(listing.specs).length > 0 &&
          `Specs: ${Object.entries(listing.specs).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
      ].filter(Boolean).join('\n')

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: PRICING_PROMPT,
        messages: [{
          role: 'user',
          content: `Target equipment:\n${targetDetails}\n\nComparable listings (${comparables.length} found):\n${JSON.stringify(comparablesSummary, null, 2)}`,
        }],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const cleaned = cleanJsonResponse(rawText)

      try {
        const parsed = JSON.parse(cleaned)
        return NextResponse.json({ pricing: parsed })
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 })
      }
    }

    if (action === 'coach_negotiation') {
      const { negotiation } = body
      if (!negotiation) {
        return NextResponse.json({ error: 'Negotiation details required' }, { status: 400 })
      }

      // Get comparable stats if not provided
      let stats = negotiation.comparableStats
      if (!stats) {
        stats = await getComparableStatsForListing(negotiation.listingId) || undefined
      }

      const context = [
        `Side: ${negotiation.side}`,
        `Ask price: $${negotiation.askPrice.toLocaleString()}`,
        `Offer price: $${negotiation.offerPrice.toLocaleString()}`,
        `Offer is ${Math.round((1 - negotiation.offerPrice / negotiation.askPrice) * 100)}% below ask`,
        `Offer round: ${negotiation.offerCount}`,
        `Days on market: ${negotiation.daysOnMarket}`,
        `Condition: ${negotiation.condition}`,
        `Equipment category: ${negotiation.subcategory}`,
        stats ? `\nMarket data (${stats.sampleSize} comparables):` : '',
        stats ? `  Median price: $${stats.medianPrice.toLocaleString()}` : '',
        stats ? `  Price range: $${stats.minPrice.toLocaleString()} - $${stats.maxPrice.toLocaleString()}` : '',
        stats ? `  Avg days on market: ${stats.avgDaysOnMarket}` : '',
      ].filter(Boolean).join('\n')

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: COACHING_PROMPT(negotiation.side),
        messages: [{
          role: 'user',
          content: `Analyze this deal and give me your recommendation:\n\n${context}`,
        }],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const cleaned = cleanJsonResponse(rawText)

      try {
        const parsed = JSON.parse(cleaned)

        // Log coaching interaction
        const admin = createAdminClient()
        await admin.from('offer_coaching_log').insert({
          offer_id: null, // We don't always have the offer ID from this endpoint
          user_id: null,  // Would need auth context
          side: negotiation.side,
          recommended_price: parsed.recommendedPrice,
          reasoning: parsed.assessment,
        })

        return NextResponse.json({ coaching: parsed })
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('AI pricing error:', error)
    return NextResponse.json({ error: 'AI pricing failed' }, { status: 500 })
  }
}
