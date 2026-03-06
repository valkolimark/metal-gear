import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find users with active listings or premium subscriptions
  const { data: eligibleUsers } = await admin
    .from('profiles')
    .select('id, subscription_tier')
    .or('subscription_tier.eq.premium,subscription_tier.eq.boost')

  // Also include users with active listings
  const { data: sellers } = await admin
    .from('listings')
    .select('seller_id')
    .eq('status', 'active')

  const userIds = new Set<string>()
  for (const u of eligibleUsers || []) userIds.add(u.id)
  for (const s of sellers || []) userIds.add(s.seller_id)

  let generated = 0

  for (const userId of userIds) {
    // Check if insights are still valid
    const { data: existing } = await admin
      .from('seller_demand_insights')
      .select('valid_until')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing && new Date(existing.valid_until) > new Date()) {
      continue // Still valid
    }

    // Get user's equipment interests
    const { data: interests } = await admin
      .from('user_equipment_interests')
      .select('tier2')
      .eq('user_id', userId)

    const categories = (interests || []).map((i: { tier2: string }) => i.tier2)
    if (categories.length === 0) continue

    // Fetch demand data for up to 3 categories
    const insights: Record<string, unknown>[] = []
    for (const cat of categories.slice(0, 3)) {
      try {
        const res = await fetch(new URL('/api/sos/ai', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'predict_demand',
            subcategory: cat,
          }),
        })
        const data = await res.json()
        if (data.prediction) {
          insights.push({ subcategory: cat, ...data.prediction })
        }
      } catch {
        // Skip failures
      }
    }

    if (insights.length > 0) {
      await admin.from('seller_demand_insights').insert({
        user_id: userId,
        insights: insights as unknown as Json,
      })
      generated++
    }
  }

  return NextResponse.json({
    success: true,
    usersProcessed: userIds.size,
    insightsGenerated: generated,
  })
}
