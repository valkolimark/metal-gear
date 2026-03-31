import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { EQUIPMENT_TAXONOMY } from '@/lib/constants/equipment-taxonomy'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { AISearchSchema } from '@/lib/security/validate'
import { escapePostgrestValue } from '@/lib/security/sanitize'

export const maxDuration = 30

interface AISearchRequest {
  query: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  locationContext?: { lat: number; lng: number; city: string }
  intent_hint?: 'problem'
}

interface AISearchFilters {
  tier1?: string
  tier2?: string
  subcategories?: string[]
  manufacturer?: string
  minPrice?: number
  maxPrice?: number
  condition?: string[]
  radiusMiles?: number
  keywords?: string
}

interface AISearchResponse {
  intent: 'search' | 'clarify' | 'recommend' | 'no_results_suggestion'
  filters: AISearchFilters
  clarifyingQuestion?: string
  explanation: string
  suggestions?: string[]
  rawResponse: string
}

const taxonomyJson = JSON.stringify(
  EQUIPMENT_TAXONOMY.map((t1) => ({
    id: t1.id,
    label: t1.label,
    groups: t1.groups.map((g) => ({
      id: g.id,
      label: g.label,
      subcategories: g.subcategories.map((s) => ({ id: s.id, label: s.label })),
    })),
  })),
  null,
  2
)

const SEARCH_SYSTEM_PROMPT = `You are an industrial equipment search specialist for Metal Gear, a marketplace serving oil & gas, petrochemical, mining, manufacturing, and CNC machining industries in the Houston, TX area and beyond.

Your job: translate a buyer's natural language query into structured search filters that map to our equipment taxonomy and database schema.

Equipment taxonomy:
${taxonomyJson}

Valid condition values: "new", "like_new", "good", "fair", "poor", "for_parts"

Rules:
- Always try to extract filters even from vague queries
- If the query is too vague to generate useful filters (e.g., "something for my plant"), ask ONE targeted clarifying question
- If the buyer describes a problem (e.g., "my gearbox overheats"), infer the equipment type they need and explain your reasoning
- Never ask more than one clarifying question per turn
- Return ONLY valid JSON matching the response schema — no markdown fences, no preamble

Return intent = 'clarify' only if you cannot extract at least one useful filter.
Return intent = 'no_results_suggestion' if the query is very niche and you predict zero matches — suggest related subcategories instead.

Response JSON schema:
{
  "intent": "search" | "clarify" | "recommend" | "no_results_suggestion",
  "filters": {
    "tier1": "string (tier1 bucket id, optional)",
    "tier2": "string (tier2 group id, optional)",
    "subcategories": ["array of subcategory ids, optional"],
    "manufacturer": "string (optional)",
    "minPrice": "number in dollars (optional)",
    "maxPrice": "number in dollars (optional)",
    "condition": ["array of condition values, optional"],
    "radiusMiles": "number (optional)",
    "keywords": "string (residual search terms for full-text search, optional)"
  },
  "clarifyingQuestion": "string (only when intent = 'clarify')",
  "explanation": "string (human-readable summary, e.g. 'Searching for decanter centrifuges under $40,000...')",
  "suggestions": ["array of strings (only when intent = 'no_results_suggestion')"]
}`

const PROBLEM_SYSTEM_PROMPT = `You are an industrial equipment diagnostic specialist for Metal Gear, a marketplace serving oil & gas, petrochemical, mining, manufacturing, and CNC machining industries.

When a buyer describes an equipment problem, your job is to:
1. Identify the likely equipment type they need (replacement, repair parts, or alternative)
2. Explain your diagnostic reasoning briefly
3. Translate this into structured search filters

Equipment taxonomy:
${taxonomyJson}

Valid condition values: "new", "like_new", "good", "fair", "poor", "for_parts"

Rules:
- First identify what equipment/parts the buyer likely needs based on their problem description
- Explain your reasoning in the explanation field (e.g., "Based on your vibration issue, you likely need a replacement centrifuge bowl or bearing assembly...")
- Extract search filters for the relevant equipment
- If the problem is too vague, ask ONE clarifying question
- Return ONLY valid JSON matching the response schema — no markdown fences, no preamble

Response JSON schema:
{
  "intent": "search" | "clarify" | "recommend" | "no_results_suggestion",
  "filters": {
    "tier1": "string (optional)",
    "tier2": "string (optional)",
    "subcategories": ["array of subcategory ids, optional"],
    "manufacturer": "string (optional)",
    "minPrice": "number in dollars (optional)",
    "maxPrice": "number in dollars (optional)",
    "condition": ["array of condition values, optional"],
    "radiusMiles": "number (optional)",
    "keywords": "string (residual terms for FTS, optional)"
  },
  "clarifyingQuestion": "string (only when intent = 'clarify')",
  "explanation": "string (diagnostic reasoning + what you're searching for)",
  "suggestions": ["array of strings (only when intent = 'no_results_suggestion')"]
}`

async function callClaude(
  query: string,
  systemPrompt: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AISearchResponse> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  if (conversationHistory?.length) {
    messages.push(...conversationHistory)
  }
  messages.push({ role: 'user', content: query })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const rawText =
    response.content[0].type === 'text' ? response.content[0].text : ''

  // Strip markdown fences if present
  const cleaned = rawText
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as AISearchResponse
    parsed.rawResponse = rawText
    return parsed
  } catch {
    // If parsing fails, return a fallback search with the raw query as keywords
    return {
      intent: 'search',
      filters: { keywords: query },
      explanation: `Searching for "${query}"...`,
      rawResponse: rawText,
    }
  }
}

// Cache identical queries for 1 hour
const getCachedAIResponse = unstable_cache(
  async (query: string, intentHint: string) => {
    const systemPrompt =
      intentHint === 'problem' ? PROBLEM_SYSTEM_PROMPT : SEARCH_SYSTEM_PROMPT
    return callClaude(query, systemPrompt)
  },
  ['ai-search'],
  { revalidate: 3600 }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = AISearchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search query' },
        { status: 400 }
      )
    }

    const { query, conversationHistory, intent_hint } = parsed.data

    // Use cache only for single-turn queries (no conversation history)
    let aiResponse: AISearchResponse
    if (!conversationHistory?.length) {
      aiResponse = await getCachedAIResponse(query.trim(), intent_hint || '')
    } else {
      const systemPrompt =
        intent_hint === 'problem'
          ? PROBLEM_SYSTEM_PROMPT
          : SEARCH_SYSTEM_PROMPT
      aiResponse = await callClaude(query.trim(), systemPrompt, conversationHistory)
    }

    // If intent is clarify, return without running DB query
    if (aiResponse.intent === 'clarify') {
      return NextResponse.json({
        ai: aiResponse,
        listings: [],
        totalCount: 0,
      })
    }

    // Run Supabase query using extracted filters
    const admin = createAdminClient()
    let dbQuery = admin
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .eq('has_media', true)

    const { filters } = aiResponse

    // Full-text search on residual keywords
    if (filters.keywords) {
      dbQuery = dbQuery.textSearch('fts', filters.keywords, {
        type: 'websearch',
      })
    }

    // Category filter — use tier2 mapped to the old category system, or keywords
    if (filters.tier2) {
      const safeTier2 = escapePostgrestValue(filters.tier2.replace(/_/g, ' '))
      if (safeTier2) {
        dbQuery = dbQuery.ilike('category', `%${safeTier2}%`)
      }
    }

    // Price filters
    if (filters.minPrice) {
      dbQuery = dbQuery.gte('price_cents', filters.minPrice * 100)
    }
    if (filters.maxPrice) {
      dbQuery = dbQuery.lte('price_cents', filters.maxPrice * 100)
    }

    // Condition filter
    if (filters.condition?.length) {
      dbQuery = dbQuery.in('condition', filters.condition)
    }

    // Manufacturer search — escape to prevent filter injection
    if (filters.manufacturer) {
      const safeMfr = escapePostgrestValue(filters.manufacturer)
      if (safeMfr) {
        dbQuery = dbQuery.or(
          `title.ilike.%${safeMfr}%,description.ilike.%${safeMfr}%`
        )
      }
    }

    // Order by featured first, then newest
    dbQuery = dbQuery
      .order('is_featured', { ascending: false })
      .order('admin_boost', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(24)

    const { data: listings, count, error } = await dbQuery

    if (error) {
      console.error('AI search DB error:', error)
      return NextResponse.json({
        ai: aiResponse,
        listings: [],
        totalCount: 0,
      })
    }

    return NextResponse.json({
      ai: aiResponse,
      listings: listings ?? [],
      totalCount: count ?? 0,
    })
  } catch (error) {
    console.error('AI search error:', error)
    return NextResponse.json(
      { error: 'AI search failed' },
      { status: 500 }
    )
  }
}
