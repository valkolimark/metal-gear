/**
 * Fire-and-forget AI usage logger (Cycle 62).
 *
 * Writes to `ai_usage_events` via the service-role client. MUST NEVER throw —
 * a telemetry failure cannot break a user-facing AI call. Same invariant as
 * `logSnapListEvent` in src/lib/snap-list/events.ts; codified by
 * `src/test/ai-usage-logger.test.ts`.
 *
 * Architecture invariant: this module is the canonical place that writes the
 * ledger. Vision-analysis (`src/lib/vision-analysis/`) does not import from
 * here — it accepts an `onUsageEvent` callback and lets orchestrators wire
 * the call.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import {
  estimateAnthropicCostCents,
  estimateGoogleVisionCostCents,
  type GoogleVisionFeature,
} from "./cost-models"

export type AiSurface =
  | "photo_to_listing_analysis"
  | "sos_analysis"
  | "listing_analyzer_helper"
  | "listing_freshness_cron"
  | "weekly_brief_cron"
  | "demand_insights_cron"
  | "ask_metal_gear"
  | "ai_search"
  | "dispute_mediation"
  | "churn_scoring_cron"
  | "registry_seeding"
  | "registry_disambiguation"
  | "other"

export type AiVendor = "anthropic" | "google_vision" | "other"

export interface AiUsageRecord {
  userId: string | null
  companyId?: string | null
  surface: AiSurface
  vendor: AiVendor
  model?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  visionUnits?: number | null
  /** If omitted, derived from cost-models.ts using vendor + model + token counts. */
  costCents?: number
  latencyMs?: number | null
  success?: boolean
  errorClass?: string | null
  traceId?: string | null
  /**
   * Optional Google Vision feature when vendor is `google_vision`. Drives
   * cost-model rate lookup.
   */
  visionFeature?: GoogleVisionFeature
}

/**
 * Insert one row into ai_usage_events. Fire-and-forget — callers do not need
 * to await. Wraps the DB call in try/catch and never throws.
 */
export async function recordAiUsage(record: AiUsageRecord): Promise<void> {
  try {
    const costCents =
      record.costCents !== undefined
        ? record.costCents
        : deriveCostCents(record)

    const admin = createAdminClient()
    // ai_usage_events is not yet in the generated Supabase types — same
    // approach as src/app/actions/registry.ts for the manufacturers table.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from("ai_usage_events").insert({
      user_id: record.userId,
      company_id: record.companyId ?? null,
      surface: record.surface,
      vendor: record.vendor,
      model: record.model ?? null,
      input_tokens: record.inputTokens ?? null,
      output_tokens: record.outputTokens ?? null,
      vision_units: record.visionUnits ?? null,
      cost_cents: costCents,
      latency_ms: record.latencyMs ?? null,
      success: record.success ?? true,
      error_class: record.errorClass ?? null,
      trace_id: record.traceId ?? null,
    })
    if (error) {
      console.error("[ai-usage] insert failed:", error.message)
    }
  } catch (err) {
    console.error("[ai-usage] logger exception:", err)
  }
}

function deriveCostCents(record: AiUsageRecord): number {
  if (record.success === false) return 0
  if (record.vendor === "anthropic") {
    return estimateAnthropicCostCents(
      record.model ?? null,
      record.inputTokens ?? null,
      record.outputTokens ?? null,
    )
  }
  if (record.vendor === "google_vision") {
    return estimateGoogleVisionCostCents(
      record.visionFeature ?? "unknown",
      record.visionUnits ?? null,
    )
  }
  return 0
}

export interface AiUsageMeta {
  userId: string | null
  companyId?: string | null
  surface: AiSurface
  vendor: AiVendor
  model?: string | null
  traceId?: string | null
  visionFeature?: GoogleVisionFeature
}

/**
 * Result extractor — pulls token counts (or vision units) out of the wrapped
 * function's return value. Lets callers wire `messages.create` or
 * `messages.stream` results without each surface owning its own logger.
 */
export type UsageExtractor<T> = (result: T) => {
  inputTokens?: number | null
  outputTokens?: number | null
  visionUnits?: number | null
}

/**
 * Wrap an async AI call to capture latency, success/failure, and usage.
 *
 *   const res = await withAiUsageTracking(
 *     { userId, surface: 'ask_metal_gear', vendor: 'anthropic', model: 'claude-sonnet-4-...' },
 *     () => anthropic.messages.create({...}),
 *     (r) => ({ inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens }),
 *   )
 *
 * Invariants:
 *   - The wrapped function's errors are re-thrown unchanged.
 *   - `recordAiUsage` is invoked exactly once, fire-and-forget.
 *   - Telemetry failures are silently swallowed.
 */
export async function withAiUsageTracking<T>(
  meta: AiUsageMeta,
  fn: () => Promise<T>,
  extractUsage?: UsageExtractor<T>,
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const usage = extractUsage ? safeExtract(result, extractUsage) : {}
    void recordAiUsage({
      ...meta,
      ...usage,
      latencyMs: Date.now() - start,
      success: true,
    })
    return result
  } catch (err) {
    void recordAiUsage({
      ...meta,
      latencyMs: Date.now() - start,
      success: false,
      errorClass: classifyError(err),
    })
    throw err
  }
}

function safeExtract<T>(
  result: T,
  extract: UsageExtractor<T>,
): { inputTokens?: number | null; outputTokens?: number | null; visionUnits?: number | null } {
  try {
    return extract(result) ?? {}
  } catch {
    return {}
  }
}

function classifyError(err: unknown): string {
  if (err instanceof Error) {
    // Strip stack/long messages — we only want a short class label.
    return err.name || err.constructor?.name || "Error"
  }
  return "unknown"
}
