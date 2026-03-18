import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONTACT_CREDIT_ALLOWANCES } from '@/lib/constants'
import type { Json } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Read admin-configured allowances from system_config
  const { data: configRow } = await admin
    .from('system_config')
    .select('value')
    .eq('key', 'credit_allowances')
    .maybeSingle()

  let allowances: Record<string, number> = {}
  try {
    allowances = configRow?.value
      ? (typeof configRow.value === 'string' ? JSON.parse(configRow.value) : configRow.value) as Record<string, number>
      : {}
  } catch {
    // Fall back to constants
  }

  function getAllowance(tier: string): number {
    const val = allowances[tier]
    if (val !== undefined) return val === -1 ? 999999 : val
    const constVal = CONTACT_CREDIT_ALLOWANCES[tier] ?? 0
    return constVal === Infinity ? 999999 : constVal
  }

  // Get all users with their tiers
  const now = new Date()
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Get all profiles with subscription tiers
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, subscription_tier')

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ processed: 0, reason: 'no profiles' })
  }

  // Batch upsert credit rows for the new period
  let processed = 0
  const BATCH_SIZE = 100

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE)
    const rows = batch.map((p) => ({
      user_id: p.id,
      credits_remaining: getAllowance(p.subscription_tier || 'free'),
      credits_used_this_month: 0,
      period_start: periodStart,
    }))

    const { error } = await admin
      .from('contact_credits')
      .upsert(rows, { onConflict: 'user_id,period_start' })

    if (!error) {
      processed += batch.length
    }
  }

  // Log the reset
  await admin.from('admin_audit_log').insert({
    admin_id: '00000000-0000-0000-0000-000000000000',
    action: 'credit_reset',
    target_type: 'system',
    target_id: periodStart,
    metadata: { processed, period: periodStart } as unknown as Json,
  })

  return NextResponse.json({
    processed,
    period: periodStart,
    timestamp: new Date().toISOString(),
  })
}
