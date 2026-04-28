import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from '@/lib/email'
import { withAiUsageTracking } from '@/lib/telemetry/ai-usage'

const anthropic = new Anthropic()
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  if (request.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff45 = new Date()
  cutoff45.setDate(cutoff45.getDate() - 45)
  const cutoff30 = new Date()
  cutoff30.setDate(cutoff30.getDate() - 30)

  // Find stale listings: active, older than 45 days
  const { data: staleListings } = await supabase
    .from('listings')
    .select(`
      id, title, description, price_cents, condition, category,
      listing_quality_score, seller_id
    `)
    .eq('status', 'active')
    .lt('created_at', cutoff45.toISOString())
    .order('created_at', { ascending: true })
    .limit(50)

  if (!staleListings?.length) {
    return NextResponse.json({ message: 'No stale listings found', count: 0 })
  }

  const listingIds = staleListings.map(l => l.id)

  // Filter out: listings with recent offers OR already have an unacted suggestion
  const { data: recentOffers } = await supabase
    .from('offers')
    .select('listing_id')
    .in('listing_id', listingIds)
    .gte('created_at', cutoff30.toISOString())

  const { data: existingSuggestions } = await supabase
    .from('listing_freshness_suggestions')
    .select('listing_id')
    .in('listing_id', listingIds)
    .eq('acted_on', false)

  const hasRecentOffer = new Set(recentOffers?.map(o => o.listing_id) ?? [])
  const hasSuggestion = new Set(existingSuggestions?.map(s => s.listing_id) ?? [])

  const eligible = staleListings.filter(l =>
    !hasRecentOffer.has(l.id) && !hasSuggestion.has(l.id)
  )

  if (!eligible.length) {
    return NextResponse.json({ message: 'No eligible stale listings', count: 0 })
  }

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://metal-gear-five.vercel.app'
  let processed = 0

  // Max 10 AI calls per cron run to control cost
  for (const listing of eligible.slice(0, 10)) {
    try {
      const priceDollars = listing.price_cents
        ? (listing.price_cents / 100).toLocaleString()
        : 'not listed'

      const prompt = `You are an industrial equipment marketplace expert. Review this listing and provide specific refresh suggestions to help it sell faster.

Listing: ${listing.title}
Category: ${listing.category ?? 'industrial equipment'}
Price: $${priceDollars}
Condition: ${listing.condition ?? 'not specified'}
Current quality score: ${listing.listing_quality_score ?? 'not scored'} / 100
Days on market: 45+
Description snippet: ${listing.description?.slice(0, 300) ?? 'No description provided'}

Respond ONLY with a valid JSON object. No markdown, no preamble, no explanation outside the JSON.

{
  "title_suggestion": "Optimized title in format: [Manufacturer] [Model] [Equipment Type] — [Key Spec], [Year], [Condition]. Max 80 characters.",
  "price_suggestion": null or a number (suggest 5-10% reduction if listing is stale and price seems high; null if price seems reasonable or you lack comparable data),
  "price_reasoning": "One sentence explaining the price suggestion, or null if no price suggestion.",
  "description_tip": "One specific, actionable improvement for the description. Max 120 characters."
}`

      const response = await withAiUsageTracking(
        {
          userId: listing.seller_id,
          surface: 'listing_freshness_cron',
          vendor: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          traceId: listing.id,
        },
        () => anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
        (r) => ({
          inputTokens: r.usage?.input_tokens,
          outputTokens: r.usage?.output_tokens,
        }),
      )

      const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
      let suggestion: {
        title_suggestion: string
        price_suggestion: number | null
        price_reasoning: string | null
        description_tip: string
      }
      try {
        suggestion = JSON.parse(text.replace(/```json|```/g, '').trim())
      } catch {
        console.error(`Freshness: malformed JSON for listing ${listing.id}:`, text.slice(0, 200))
        continue
      }

      // Get seller info (email from contact_email or auth)
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, contact_email')
        .eq('id', listing.seller_id)
        .maybeSingle()

      let sellerEmail = sellerProfile?.contact_email
      if (!sellerEmail) {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(listing.seller_id)
        sellerEmail = authUser?.email ?? null
      }
      const seller = sellerProfile ? { ...sellerProfile, email: sellerEmail } : null

      // Save suggestion to DB (wrap in try/catch for unique constraint)
      try {
        await supabase
          .from('listing_freshness_suggestions')
          .insert({
            listing_id: listing.id,
            seller_id: listing.seller_id,
            ai_title_suggestion: suggestion.title_suggestion,
            ai_price_suggestion: suggestion.price_suggestion ?? null,
            ai_price_reasoning: suggestion.price_reasoning ?? null,
            ai_description_tip: suggestion.description_tip,
            email_sent_at: seller?.email ? new Date().toISOString() : null,
          })
      } catch {
        // Unique constraint violation — another run already created a suggestion
        console.log(`Freshness: duplicate suggestion for listing ${listing.id}, skipping`)
        continue
      }

      if (!seller?.email) continue

      // Send email — no tier gate
      const editUrl = `${BASE}/listings/${listing.id}/edit`
      const listingUrl = `${BASE}/listings/${listing.id}`
      const sellerName = seller.full_name ?? 'there'

      await sendEmail({
        to: seller.email,
        subject: `Your listing "${listing.title.slice(0, 50)}" — time for a refresh`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: Manrope, sans-serif; background: #18191A; color: #E4E6EB; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 40px auto; padding: 32px; background: #242526; border-radius: 16px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 24px; font-weight: 800; color: #1877F2; font-family: monospace;">
        METAL GEAR
      </span>
    </div>

    <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">
      Your listing has been live 45+ days
    </h1>
    <p style="color: #B0B3B8; margin: 0 0 24px 0; line-height: 1.6;">
      Hi ${sellerName}, a quick refresh often gets listings back in front of active buyers.
      Here&rsquo;s what we&rsquo;d suggest for <strong style="color: #E4E6EB;">${listing.title}</strong>:
    </p>

    <div style="background: #18191A; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <p style="font-size: 11px; font-weight: 700; color: #1877F2; letter-spacing: 1px; margin: 0 0 8px 0;">
        SUGGESTED TITLE
      </p>
      <p style="font-size: 15px; font-weight: 600; margin: 0; color: #E4E6EB;">
        &ldquo;${suggestion.title_suggestion}&rdquo;
      </p>
    </div>

    ${suggestion.price_suggestion ? `
    <div style="background: #18191A; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <p style="font-size: 11px; font-weight: 700; color: #FF6B2B; letter-spacing: 1px; margin: 0 0 8px 0;">
        PRICE SUGGESTION
      </p>
      <p style="font-size: 22px; font-weight: 700; margin: 0 0 4px 0; color: #E4E6EB;">
        $${Number(suggestion.price_suggestion).toLocaleString()}
      </p>
      ${suggestion.price_reasoning ? `
      <p style="font-size: 13px; color: #B0B3B8; margin: 0;">${suggestion.price_reasoning}</p>
      ` : ''}
    </div>
    ` : ''}

    <div style="background: #18191A; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
      <p style="font-size: 11px; font-weight: 700; color: #B0B3B8; letter-spacing: 1px; margin: 0 0 8px 0;">
        DESCRIPTION TIP
      </p>
      <p style="font-size: 14px; margin: 0; color: #E4E6EB; line-height: 1.5;">
        ${suggestion.description_tip}
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${editUrl}"
         style="display: inline-block; background: #1877F2; color: white;
                padding: 14px 32px; border-radius: 8px; text-decoration: none;
                font-weight: 700; font-size: 15px;">
        Update My Listing
      </a>
    </div>

    <p style="text-align: center; margin-top: 16px;">
      <a href="${listingUrl}" style="color: #B0B3B8; font-size: 13px; text-decoration: none;">
        View listing →
      </a>
    </p>
  </div>
</body>
</html>
        `,
      })

      processed++
    } catch (err) {
      console.error(`Freshness suggestion failed for listing ${listing.id}:`, err)
    }
  }

  return NextResponse.json({
    message: `Processed ${processed} stale listings`,
    count: processed,
  })
}
