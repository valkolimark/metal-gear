import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'
import { AIChatSchema } from '@/lib/security/validate'

// Daily rate limiter per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const FREE_DAILY_LIMIT = 10
const PRO_DAILY_LIMIT = 100
const DAY_MS = 24 * 60 * 60 * 1000

function getRateCount(ip: string): number {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + DAY_MS })
    return 1
  }
  entry.count++
  return entry.count
}

// Professor mode: detect compatibility/suitability questions
const PROFESSOR_TRIGGERS = [
  /will this work/i,
  /is this compatible/i,
  /can this handle/i,
  /is this right for/i,
  /would this be suitable/i,
  /i need something for/i,
  /is this compatible with/i,
  /will this fit/i,
  /is this the right/i,
  /can i use this for/i,
  /would this work for/i,
  /is this good for/i,
  /suitable for my/i,
  /compatible with my/i,
  /right equipment for/i,
  /help me evaluate/i,
]

function isProfessorQuestion(text: string): boolean {
  return PROFESSOR_TRIGGERS.some((re) => re.test(text))
}

function countAssistantMessages(
  history: { role: string; content: string }[]
): number {
  return history.filter((m) => m.role === 'assistant').length
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // Determine tier from auth header (best-effort)
  let isPro = false
  try {
    const admin = createAdminClient()
    const authHeader = request.headers.get('x-user-id')
    if (authHeader) {
      const { data: sub } = await admin
        .from('subscriptions')
        .select('tier')
        .eq('user_id', authHeader)
        .eq('status', 'active')
        .maybeSingle()
      if (
        sub &&
        ['pro', 'business', 'enterprise', 'premium', 'boost'].includes(
          sub.tier
        )
      )
        isPro = true
    }
  } catch {
    // Proceed with free limits
  }

  const count = getRateCount(ip)
  const limit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT
  if (count > limit) {
    return NextResponse.json(
      {
        error: isPro
          ? 'Daily limit reached (100/day). Try again tomorrow.'
          : 'Daily limit reached (10/day). Upgrade to Pro for more.',
      },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const parsed = AIChatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid question' },
        { status: 400 }
      )
    }
    const { question, history } = parsed.data

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
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    const price = listing.contact_for_price
      ? 'Contact for Price'
      : listing.price_cents
        ? `$${(listing.price_cents / 100).toLocaleString()}`
        : 'Free'

    const parsedHistory = Array.isArray(history) ? history : []
    const assistantCount = countAssistantMessages(parsedHistory)
    const isTrigger = isProfessorQuestion(question)
    const inProfessorMode = isTrigger && assistantCount < 2

    const systemPrompt = `You are Metal Gear's equipment expert — a senior process engineer and industrial equipment specialist with 20+ years of experience across oil & gas, petrochemical, mining, and manufacturing.

EQUIPMENT CONTEXT:
Title: ${listing.title}
Price: ${price}
Condition: ${listing.condition}
Category: ${listing.category}${listing.industry ? ` > ${listing.industry}` : ''}
Description: ${listing.description || 'No description provided'}
Specs: ${listing.specifications ? JSON.stringify(listing.specifications) : 'None listed'}
Location: ${listing.location_city}, ${listing.location_state}
Seller: ${seller?.company_name || 'Unknown'}, Trust Score ${seller?.trust_score ?? 'N/A'}/100, ${seller?.location_city || ''} ${seller?.location_state || ''}

YOUR ROLE:
- Help buyers determine if this specific equipment meets their process requirements
- Ask targeted follow-up questions to understand their application before giving an opinion
- Give direct, honest recommendations — including recommending against a purchase if the equipment is wrong for their process
- Suggest alternative equipment types when appropriate
- Drive every conversation toward a concrete, actionable answer

RULES:
- Never give a compatibility opinion without first understanding the user's process requirements
- For compatibility/suitability questions: ask 2–4 targeted follow-up questions before rendering a verdict
- When you have enough information, be direct: "Yes, this will work because..." or "No, this won't work because... You need X instead"
- Never be evasive or hedge excessively — industrial buyers make expensive decisions and need clear guidance
- If the user's question is NOT about compatibility (e.g., "What's the lead time?", pricing, specs), answer it directly without follow-up questions
- Keep responses concise — this is a mobile-first interface
- Never invent specs not listed above; if specs are missing, say so
- If you can't answer from listing data, say so and suggest contacting the seller
- Tone: knowledgeable senior process engineer, not a salesperson

${inProfessorMode ? `PROFESSOR MODE ACTIVE:
The user is asking a compatibility/suitability question. Do NOT answer it directly yet. Instead, ask 2–3 targeted follow-up questions to understand their specific process requirements. Base your questions on the equipment category:

For centrifuges/separators: ask about what they're separating, feed flow rate, particle characteristics, target dryness/clarity, operating temp/pressure, continuous vs batch
For pumps: ask about fluid properties, flow rate and head pressure, duty cycle, hazardous area requirements
For mixers/agitators: ask about components being mixed, batch size, blend time/shear, entry type preference
For heat exchangers: ask about hot/cold side fluids, heat duty, inlet/outlet temps, fouling tendency
For compressors: ask about gas being compressed, flow and discharge pressure, oil-free requirement, duty cycle
For general equipment: ask about industry/application, problem being solved, current equipment being replaced, timeline/budget

Ask the most relevant 2–3 questions in a single message. Be conversational but efficient.` : ''}

ALTERNATIVE SUGGESTIONS:
When you determine the listed equipment is NOT the right fit for the user's needs, you MUST:
1. Say so honestly with clear reasoning
2. Name specific alternative equipment types
3. Include a search suggestion in this exact format on its own line:
[SEARCH_SUGGESTION:{"query":"the search query here","label":"Search for alternative equipment"}]
This will render as a clickable search button for the user.`

    const messages = [
      ...parsedHistory.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: question },
    ]

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 768,
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
