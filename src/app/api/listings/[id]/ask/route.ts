import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    )
  }

  try {
    const { question, history } = await request.json()
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const [{ data: listing }, { data: seller }] = await Promise.all([
      admin.from('listings').select('*').eq('id', id).single(),
      admin
        .from('listings')
        .select('seller_id')
        .eq('id', id)
        .single()
        .then(async ({ data }) => {
          if (!data) return { data: null }
          return admin
            .from('profiles')
            .select('company_name, trust_score, location_city, location_state')
            .eq('id', data.seller_id)
            .single()
        }),
    ])

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const price = listing.contact_for_price
      ? 'Contact for Price'
      : listing.price_cents
        ? `$${(listing.price_cents / 100).toLocaleString()}`
        : 'Free'

    const systemPrompt = `You are Ask Metal Gear, an AI assistant embedded on an industrial equipment listing page. You help buyers — primarily engineers and operations managers — evaluate this specific piece of equipment.

LISTING CONTEXT:
Title: ${listing.title}
Price: ${price}
Condition: ${listing.condition}
Category: ${listing.category}${listing.industry ? ` > ${listing.industry}` : ''}
Description: ${listing.description || 'No description provided'}
Specs: ${listing.specifications ? JSON.stringify(listing.specifications) : 'None listed'}
Location: ${listing.location_city}, ${listing.location_state}
Condition: ${listing.condition}
Seller: ${seller?.company_name || 'Unknown'}, Trust Score ${seller?.trust_score ?? 'N/A'}/100, ${seller?.location_city || ''} ${seller?.location_state || ''}

INSTRUCTIONS:
- Answer questions about this specific listing only
- Be direct and precise — no marketing language
- Never invent specs not listed above
- If asked about compatibility, give honest caveats — you don't know the buyer's exact setup
- If asked about pricing, note the platform has market data and the seller set this price
- If you can't answer from listing data, say so and suggest contacting the seller
- Keep responses to 2–4 sentences unless technical depth is genuinely needed
- Tone: knowledgeable industrial advisor, not a salesperson`

    const messages = [
      ...(Array.isArray(history)
        ? history.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        : []),
      { role: 'user' as const, content: question },
    ]

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text))
            }
          }
          controller.close()
        } catch {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    )
  }
}
