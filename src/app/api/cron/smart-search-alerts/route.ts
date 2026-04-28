import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { sendEmail } from '@/lib/email'
import { withAiUsageTracking } from '@/lib/telemetry/ai-usage'

export const runtime = 'nodejs'
export const maxDuration = 120

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'
const BRAND_COLOR = '#1877F2'
const BG_COLOR = '#0A0A0F'

interface RelevanceResult {
  listingId: string
  savedSearchId: string
  score: number
  explanation: string
  shouldNotify: boolean
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Get all saved searches with email alerts enabled
  const { data: alertSearches, error: searchError } = await admin
    .from('saved_searches')
    .select('*, profiles!saved_searches_user_id_fkey(full_name, display_name, email_notifications)')
    .eq('notify_email', true)

  if (searchError || !alertSearches || alertSearches.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  // Get new listings from the last 24 hours
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  const { data: recentListings } = await admin
    .from('listings')
    .select('id, title, category, condition, price_cents, contact_for_price, description, location_city, location_state, specifications, industries, created_at')
    .eq('status', 'active')
    .eq('has_media', true)
    .gte('created_at', oneDayAgo.toISOString())

  if (!recentListings || recentListings.length === 0) {
    return NextResponse.json({ processed: 0, reason: 'no new listings' })
  }

  // Get user emails
  const userIds = [...new Set(alertSearches.map((s) => s.user_id))]
  const userEmails = new Map<string, string>()
  for (const userId of userIds) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    if (authUser?.user?.email) {
      userEmails.set(userId, authUser.user.email)
    }
  }

  // Build listing-search pairs for AI evaluation
  type Pair = {
    listing: typeof recentListings[number]
    search: typeof alertSearches[number]
  }

  const pairs: Pair[] = []
  for (const search of alertSearches) {
    const filters = (search.filters || {}) as Record<string, string>
    for (const listing of recentListings) {
      // Pre-filter: category overlap check to reduce pairs
      if (filters.category && listing.category !== filters.category) continue
      pairs.push({ listing, search })
    }
  }

  if (pairs.length === 0) {
    return NextResponse.json({ processed: alertSearches.length, matched: 0 })
  }

  // Process in batches of 20 pairs per Claude call
  const BATCH_SIZE = 20
  const allResults: RelevanceResult[] = []

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE)
    const batchResults = await evaluateBatch(batch)
    allResults.push(...batchResults)
  }

  // Group results by user+search for email sending
  const alertsByUser = new Map<string, { search: typeof alertSearches[number]; matches: RelevanceResult[] }>()

  for (const result of allResults) {
    // Log all decisions
    await admin.from('saved_search_alert_log').insert({
      saved_search_id: result.savedSearchId,
      listing_id: result.listingId,
      ai_relevance_score: result.score,
      ai_explanation: result.explanation,
      alert_sent: result.shouldNotify,
      skip_reason: result.shouldNotify ? null : `Score ${result.score} below threshold`,
    })

    if (!result.shouldNotify) continue

    const search = alertSearches.find((s) => s.id === result.savedSearchId)
    if (!search) continue

    const key = `${search.user_id}:${search.id}`
    if (!alertsByUser.has(key)) {
      alertsByUser.set(key, { search, matches: [] })
    }
    alertsByUser.get(key)!.matches.push(result)
  }

  // Send emails
  let emailsSent = 0
  for (const [, { search, matches }] of alertsByUser) {
    const email = userEmails.get(search.user_id)
    const profile = search.profiles as { full_name: string; display_name: string | null } | null
    if (!email || !profile) continue

    const recipientName = profile.display_name || profile.full_name?.split(' ')[0] || 'there'

    // Get listing details for the matches
    const matchListings = matches.map((m) => {
      const listing = recentListings.find((l) => l.id === m.listingId)!
      return { listing, explanation: m.explanation, score: m.score }
    }).filter((m) => m.listing)

    if (matchListings.length === 0) continue

    const topMatch = matchListings[0]
    const subject = `Match found: ${topMatch.listing.title} matches your "${search.name}" search`

    const matchItems = matchListings.slice(0, 5).map((m) => {
      const price = m.listing.contact_for_price
        ? 'Contact for Price'
        : m.listing.price_cents
          ? `$${(m.listing.price_cents / 100).toLocaleString()}`
          : 'Price Not Set'

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #2a2a3a;">
            <a href="${APP_URL}/listings/${m.listing.id}" style="color:#fff;text-decoration:none;font-size:14px;font-weight:500;">
              ${m.listing.title}
            </a>
            <br/>
            <span style="color:${BRAND_COLOR};font-size:13px;font-weight:600;">${price}</span>
            <br/>
            <span style="color:#888;font-size:12px;font-style:italic;">Why this matches: ${m.explanation}</span>
          </td>
        </tr>`
    }).join('')

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:${BRAND_COLOR};font-size:24px;margin:0;">Metal Gear</h1>
      <p style="color:#888;font-size:12px;margin:4px 0 0;">Industrial Equipment Marketplace</p>
    </div>
    <div style="background:#15151F;border-radius:12px;padding:32px;border:1px solid #2a2a3a;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">New Match${matchListings.length > 1 ? 'es' : ''} Found</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 8px;">
        Hi ${recipientName},
      </p>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
        We found <strong style="color:#fff;">${matchListings.length} high-quality match${matchListings.length > 1 ? 'es' : ''}</strong> for your saved search
        <strong style="color:${BRAND_COLOR};">"${search.name}"</strong>:
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        ${matchItems}
      </table>
      <div style="text-align:center;">
        <a href="${APP_URL}/search"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View All Matches
        </a>
      </div>
      <div style="text-align:center;margin-top:16px;padding-top:16px;border-top:1px solid #2a2a3a;">
        <a href="${APP_URL}/api/unsubscribe?uid=${search.user_id}" style="color:#666;font-size:11px;text-decoration:underline;">
          Manage email preferences
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#666;font-size:11px;margin:0;">
        Metal Gear — Houston, TX<br/>
        <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">metal-gear-five.vercel.app</a>
      </p>
    </div>
  </div>
</body>
</html>`

    const result = await sendEmail({ to: email, subject, html })
    if (result.success) {
      emailsSent++
      await admin
        .from('saved_searches')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', search.id)
    }
  }

  return NextResponse.json({
    processed: alertSearches.length,
    pairsEvaluated: pairs.length,
    alertsSent: emailsSent,
    matchesFound: allResults.filter((r) => r.shouldNotify).length,
    skipped: allResults.filter((r) => !r.shouldNotify).length,
    newListings: recentListings.length,
  })
}

async function evaluateBatch(pairs: { listing: Record<string, unknown>; search: Record<string, unknown> }[]): Promise<RelevanceResult[]> {
  const items = pairs.map((p, idx) => {
    const listing = p.listing as Record<string, unknown>
    const search = p.search as Record<string, unknown>
    const filters = (search.filters || {}) as Record<string, string>

    return {
      index: idx,
      listing: {
        title: listing.title,
        category: listing.category,
        condition: listing.condition,
        price: listing.price_cents ? `$${(Number(listing.price_cents) / 100).toLocaleString()}` : 'Contact for Price',
        description: typeof listing.description === 'string' ? listing.description.slice(0, 200) : undefined,
        location: [listing.location_city, listing.location_state].filter(Boolean).join(', '),
      },
      savedSearch: {
        name: search.name,
        aiQuery: search.ai_query || undefined,
        filters: {
          category: filters.category,
          maxPrice: filters.maxPrice,
          condition: filters.condition,
          keywords: filters.query,
        },
      },
    }
  })

  try {
    const response = await withAiUsageTracking(
      {
        userId: null,
        surface: 'other',
        vendor: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      },
      () => anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are evaluating whether new industrial equipment listings are relevant enough to notify buyers who have saved specific searches.

Score relevance 0-100 for each pair. Only score 75+ if the listing is genuinely a good match for what the buyer is looking for. Be conservative — we'd rather miss a marginal match than annoy the buyer with irrelevant notifications.

Return ONLY a valid JSON array of objects, one per input item:
[{ "index": number, "score": number, "explanation": string, "shouldNotify": boolean }]

The explanation should be 1 sentence max explaining WHY this listing matches (for the notification email). Set shouldNotify to true only if score >= 75.`,
      messages: [
        {
          role: 'user',
          content: `Evaluate these ${items.length} listing-search pairs:\n\n${JSON.stringify(items, null, 2)}`,
        },
      ],
      }),
      (r) => ({
        inputTokens: r.usage?.input_tokens,
        outputTokens: r.usage?.output_tokens,
      }),
    )

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return pairs.map((p, idx) => fallbackResult(p, idx))

    const results = JSON.parse(jsonMatch[0]) as Array<{
      index: number
      score: number
      explanation: string
      shouldNotify: boolean
    }>

    return results.map((r) => {
      const pair = pairs[r.index]
      const listing = pair.listing as Record<string, unknown>
      const search = pair.search as Record<string, unknown>
      return {
        listingId: listing.id as string,
        savedSearchId: search.id as string,
        score: r.score,
        explanation: r.explanation,
        shouldNotify: r.shouldNotify && r.score >= 75,
      }
    })
  } catch (err) {
    console.error('Smart alert AI evaluation failed:', err)
    return pairs.map((p, idx) => fallbackResult(p, idx))
  }
}

function fallbackResult(pair: { listing: Record<string, unknown>; search: Record<string, unknown> }, _idx: number): RelevanceResult {
  const listing = pair.listing as Record<string, unknown>
  const search = pair.search as Record<string, unknown>
  // Fallback: send alert for any pre-filtered match (same as old behavior)
  return {
    listingId: listing.id as string,
    savedSearchId: search.id as string,
    score: 80,
    explanation: 'Matches your search filters',
    shouldNotify: true,
  }
}
