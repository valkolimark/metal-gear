import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { AICopySchema } from '@/lib/security/validate'

export const maxDuration = 30

interface ListingInput {
  title?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  year?: number
  condition?: string
  tier1?: string
  tier2?: string
  subcategory?: string
  specs?: Record<string, string>
  description?: string
  photoCount?: number
  hasVideo?: boolean
  price?: number
  location?: string
}

interface AICopyRequest {
  action: 'generate_description' | 'optimize_title' | 'score_quality'
  listing: ListingInput
  regenerate?: boolean
}

const DESCRIPTION_PROMPT = `You are an industrial equipment listing copywriter specializing in the Houston, TX B2B marketplace. Write professional, accurate listing descriptions for heavy machinery.

Given the equipment details, write:
1. A 150-300 word description covering: what it is, key specs, condition, common applications in oil & gas / petrochemical / manufacturing, and a call to action
2. 4-6 bullet points of the most important selling points

Tone: direct, technical, professional — buyers are engineers and operations managers.
Never make up specs not provided. Never use superlatives like "amazing" or "best."
Return ONLY valid JSON with keys "description" (string) and "descriptionBullets" (array of strings). No markdown fences.`

const TITLE_PROMPT = `You are an industrial equipment SEO specialist. Optimize listing titles for discoverability in a B2B marketplace.

A great title format: [Manufacturer] [Model] [Equipment Type] — [Key Spec], [Year], [Condition]
Example: "Alfa Laval LYNX 300 Decanter Centrifuge — 75HP, 2019, Excellent"

Rules:
- Max 80 characters
- Lead with manufacturer if well-known
- Include the most searched spec (HP, capacity, size, etc.)
- Include year and condition if known
- Never truncate model numbers
- Return ONLY valid JSON with keys "optimizedTitle" (string, max 80 chars), "titleAlternatives" (array of 2 strings), and "titleIssues" (array of strings describing problems with original). No markdown fences.`

const QUALITY_PROMPT = `You are a marketplace quality analyst. Score this industrial equipment listing from 0-100 based on how likely it is to attract serious buyers.

Scoring weights:
- Photos: 30 points (0 photos = 0, 1-2 = 10, 3-4 = 20, 5+ = 30)
- Description: 25 points (missing = 0, generic/under 50 words = 10, 50-150 words = 20, detailed 150+ words with specs = 25)
- Specs/technical details: 20 points (0 specs = 0, 1-2 = 8, 3-5 = 15, 6+ = 20)
- Title quality: 15 points (vague = 5, has type = 8, has manufacturer+type = 12, has manufacturer+model+type+spec = 15)
- Pricing (present and reasonable): 10 points (missing = 0, contact for price = 5, explicit price = 10)

Grades: A = 80-100, B = 65-79, C = 50-64, D = 35-49, F = 0-34

Return ONLY valid JSON with keys:
- "score" (number 0-100)
- "grade" (string: A/B/C/D/F)
- "breakdown" (object with keys: photos, description, specs, title, pricing — each has score, max, feedback)
- "topImprovements" (array of strings, ordered by impact, max 4)
- "estimatedReachMultiplier" (number, e.g. 2.4)
No markdown fences.`

function buildListingContext(listing: ListingInput): string {
  const parts: string[] = []
  if (listing.title) parts.push(`Title: ${listing.title}`)
  if (listing.manufacturer) parts.push(`Manufacturer: ${listing.manufacturer}`)
  if (listing.model) parts.push(`Model: ${listing.model}`)
  if (listing.serialNumber) parts.push(`Serial Number: ${listing.serialNumber}`)
  if (listing.year) parts.push(`Year: ${listing.year}`)
  if (listing.condition) parts.push(`Condition: ${listing.condition.replace(/_/g, ' ')}`)
  if (listing.tier2) parts.push(`Category: ${listing.tier2.replace(/_/g, ' ')}`)
  if (listing.subcategory) parts.push(`Subcategory: ${listing.subcategory.replace(/_/g, ' ')}`)
  if (listing.specs && Object.keys(listing.specs).length > 0) {
    parts.push(`Specifications: ${Object.entries(listing.specs).map(([k, v]) => `${k}: ${v}`).join(', ')}`)
  }
  if (listing.description) parts.push(`Current Description: ${listing.description}`)
  if (listing.photoCount !== undefined) parts.push(`Photos: ${listing.photoCount}`)
  if (listing.hasVideo) parts.push(`Has Video: yes`)
  if (listing.price) parts.push(`Price: $${listing.price.toLocaleString()}`)
  if (listing.location) parts.push(`Location: ${listing.location}`)
  return parts.join('\n')
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = AICopySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const { action, listing, regenerate } = parsed.data

    const context = buildListingContext(listing as ListingInput)

    // For description generation, use streaming
    if (action === 'generate_description') {
      const systemPrompt = DESCRIPTION_PROMPT
      const userMessage = `Generate a professional listing description for this equipment:\n\n${context}`

      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: regenerate ? 0.8 : 0.5,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      return new Response(
        new ReadableStream({
          async start(controller) {
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                controller.enqueue(new TextEncoder().encode(chunk.delta.text))
              }
            }
            controller.close()
          },
        }),
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      )
    }

    // Title optimization and quality scoring use standard responses
    let systemPrompt: string
    let userMessage: string

    if (action === 'optimize_title') {
      systemPrompt = TITLE_PROMPT
      userMessage = `Optimize the title for this listing:\n\n${context}`
    } else if (action === 'score_quality') {
      systemPrompt = QUALITY_PROMPT
      userMessage = `Score this listing's quality:\n\n${context}`
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = cleanJsonResponse(rawText)

    try {
      const result = JSON.parse(cleaned)
      return NextResponse.json(result)
    } catch {
      console.error('AI copy parse failure:', rawText.slice(0, 200))
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }
  } catch (error) {
    console.error('AI copy error:', error)
    return NextResponse.json({ error: 'AI copy generation failed' }, { status: 500 })
  }
}
