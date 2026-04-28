'use server'

/**
 * Aggregate query for the AI Suggestion Feedback breakdown (Cycle 63).
 *
 * Reads from BOTH `ai_suggestion_feedback` (non-registry fields) and
 * `registry_match_feedback` (manufacturer/model). Latest-row-per-user-per-field
 * wins via DISTINCT ON. Last 30 days only.
 *
 * Service-role read — admin RBAC enforced by the page.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface FeedbackRow {
  field: string
  accepted: number
  rejected: number
  overridden: number
  unsure: number
  total: number
}

export interface FeedbackBreakdownResult {
  rows: FeedbackRow[]
  totals: {
    accepted: number
    rejected: number
    overridden: number
    unsure: number
    total: number
  }
  windowDays: number
}

export async function getFeedbackBreakdown(
  windowDays = 30,
): Promise<FeedbackBreakdownResult> {
  const admin = createAdminClient()
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  ).toISOString()

  // DISTINCT ON for latest-per-(user, source_table, source_row_id, field).
  // The non-registry feedback table covers most fields.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nonRegistry, error: errA } = await (admin as any).rpc(
    'get_latest_suggestion_feedback',
    { since_ts: since },
  )

  // Fall back to a plain SELECT when the RPC doesn't exist (it's optional —
  // the caller can run the migration in a future cycle to add it). We do the
  // dedup client-side.
  let rowsA: Array<{
    field_name: string
    user_action: string
  }> = []
  if (errA || !nonRegistry) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from('ai_suggestion_feedback')
      .select('user_id, source_table, source_row_id, field_name, user_action, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    rowsA = dedupLatest(data ?? [])
  } else {
    rowsA = nonRegistry as Array<{ field_name: string; user_action: string }>
  }

  // Registry feedback table — just manufacturer/model, mapped to the chip's
  // user_action enum so they slot into the same breakdown.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: regRows } = await (admin as any)
    .from('registry_match_feedback')
    .select('user_id, source_table, source_row_id, suggested_manufacturer_id, suggested_model_id, user_action, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  const rowsB: Array<{ field_name: string; user_action: string }> = []
   
  const seen = new Set<string>()
  for (const row of (regRows ?? []) as Array<{
    user_id: string
    source_table: string
    source_row_id: string
    suggested_manufacturer_id: string | null
    suggested_model_id: string | null
    user_action: string
  }>) {
    const fieldName = row.suggested_model_id ? 'model' : 'manufacturer'
    const dedupKey = `${row.user_id}|${row.source_table}|${row.source_row_id}|${fieldName}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)
    rowsB.push({
      field_name: fieldName,
      user_action: mapRegistryAction(row.user_action),
    })
  }

  return summarize([...rowsA, ...rowsB], windowDays)
}

function mapRegistryAction(action: string): string {
  switch (action) {
    case 'accepted':
      return 'accepted'
    case 'rejected':
      return 'rejected'
    case 'overridden_with_text':
      return 'overridden'
    case 'ignored':
      return 'unsure'
    default:
      return action
  }
}

function dedupLatest(
  rows: Array<{
    user_id: string | null
    source_table: string
    source_row_id: string
    field_name: string
    user_action: string
    created_at: string
  }>,
): Array<{ field_name: string; user_action: string }> {
  const seen = new Set<string>()
  const out: Array<{ field_name: string; user_action: string }> = []
  // rows are pre-sorted DESC by created_at — first occurrence wins.
  for (const row of rows) {
    const key = `${row.user_id ?? 'anon'}|${row.source_table}|${row.source_row_id}|${row.field_name}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ field_name: row.field_name, user_action: row.user_action })
  }
  return out
}

function summarize(
  rows: Array<{ field_name: string; user_action: string }>,
  windowDays: number,
): FeedbackBreakdownResult {
  const byField = new Map<string, FeedbackRow>()
  let total = 0
  let accepted = 0
  let rejected = 0
  let overridden = 0
  let unsure = 0

  for (const row of rows) {
    let bucket = byField.get(row.field_name)
    if (!bucket) {
      bucket = {
        field: row.field_name,
        accepted: 0,
        rejected: 0,
        overridden: 0,
        unsure: 0,
        total: 0,
      }
      byField.set(row.field_name, bucket)
    }
    if (row.user_action === 'accepted') {
      bucket.accepted++
      accepted++
    } else if (row.user_action === 'rejected') {
      bucket.rejected++
      rejected++
    } else if (row.user_action === 'overridden') {
      bucket.overridden++
      overridden++
    } else if (row.user_action === 'unsure') {
      bucket.unsure++
      unsure++
    }
    bucket.total++
    total++
  }

  return {
    rows: Array.from(byField.values()).sort((a, b) => b.total - a.total),
    totals: { accepted, rejected, overridden, unsure, total },
    windowDays,
  }
}
