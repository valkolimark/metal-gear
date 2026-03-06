import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gatherChurnSignals, calculateChurnScore } from '@/lib/ai/churn-scorer'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Get all paid subscribers
  const { data: subscribers } = await admin
    .from('profiles')
    .select('id, subscription_tier')
    .in('subscription_tier', ['premium', 'boost'])

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0
  let atRisk = 0
  let highRisk = 0

  for (const subscriber of subscribers) {
    try {
      const signals = await gatherChurnSignals(admin, subscriber.id)
      const { score, level, firedSignals } = calculateChurnScore(signals)

      // Upsert churn risk
      await admin.from('churn_risk').upsert(
        {
          user_id: subscriber.id,
          risk_score: score,
          risk_level: level,
          signals: JSON.parse(JSON.stringify(firedSignals)),
          last_calculated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      processed++
      if (level === 'at_risk') atRisk++
      if (level === 'high_risk') highRisk++
    } catch (err) {
      console.error(`Churn scoring failed for user ${subscriber.id}:`, err)
    }
  }

  return NextResponse.json({
    processed,
    totalSubscribers: subscribers.length,
    atRisk,
    highRisk,
  })
}
