import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
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

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    )
  }

  try {
    const { message, history, context } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const systemPrompt = `You are the Metal Gear Help Assistant — a knowledgeable guide for the Metal Gear industrial equipment marketplace.

CURRENT PAGE: ${context?.pathname || 'Unknown'}

ABOUT METAL GEAR:
Metal Gear is a B2B industrial equipment marketplace for oil & gas, petrochemical, mining, manufacturing, and CNC machining industries, based in Houston, TX.

KEY FEATURES:
- Buy and sell heavy industrial equipment with verified sellers
- SOS Broadcast: post urgent equipment needs, get responses from sellers within hours
- AI-powered search: describe your equipment in plain language
- Stripe escrow payments with buyer protection
- Equipment condition reports (grades A–F with mechanical/cosmetic/electrical scores)
- Subscription tiers: Free (3 listings), Pro ($179/mo), Business ($349/mo), Enterprise ($599/mo)
- Verified seller program with trust scores
- Offer & negotiation system with 72-hour auto-expiration
- AI pricing suggestions based on comparable sales
- Dispute resolution with AI mediation summaries

INSTRUCTIONS:
- Answer questions about the platform directly and helpfully
- If asked about a specific listing or seller, explain you don't have access to that data here — the Ask Metal Gear feature on the listing page can help
- Keep responses concise — 2–3 sentences for simple questions, more detail only when needed
- If the user seems to be having a technical issue, suggest they email support or use the contact form
- Tone: helpful, direct, industrial-professional — not overly cheerful
- Never make up features or pricing that isn't listed above`

    const messages = [
      ...(Array.isArray(history)
        ? history.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        : []),
      { role: 'user' as const, content: message },
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
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
