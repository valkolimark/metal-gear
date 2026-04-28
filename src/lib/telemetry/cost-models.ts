/**
 * Cost-model pricing tables (Cycle 62).
 *
 * Pure functions; no I/O. Estimates only — authoritative cost comes from each
 * vendor's billing console. The dashboard footer makes this disclaimer
 * explicit. Update on price changes; document the as-of date.
 *
 * Sources (as of 2026-04-25):
 *   - Anthropic API pricing: https://www.anthropic.com/pricing
 *   - Google Cloud Vision pricing: https://cloud.google.com/vision/pricing
 */

export type AnthropicModelKey =
  | "claude-sonnet-4"
  | "claude-opus-4"
  | "claude-haiku-4-5"
  | "unknown"

export type GoogleVisionFeature =
  | "document_text_detection"
  | "web_detection"
  | "unknown"

const ANTHROPIC_RATES: Record<
  AnthropicModelKey,
  { inputPer1M: number; outputPer1M: number }
> = {
  // Sonnet 4: $3 / 1M input, $15 / 1M output (USD)
  "claude-sonnet-4": { inputPer1M: 3.0, outputPer1M: 15.0 },
  // Opus 4: $15 / 1M input, $75 / 1M output
  "claude-opus-4": { inputPer1M: 15.0, outputPer1M: 75.0 },
  // Haiku 4.5: $1 / 1M input, $5 / 1M output
  "claude-haiku-4-5": { inputPer1M: 1.0, outputPer1M: 5.0 },
  // Unknown — treated as zero-cost so we don't over-estimate. Logger still
  // captures token counts so the bill is reconstructable from raw rows.
  unknown: { inputPer1M: 0, outputPer1M: 0 },
}

const GOOGLE_VISION_RATES: Record<GoogleVisionFeature, number> = {
  // $1.50 per 1000 units (above the free 1000/month tier — we don't subtract
  // free tier in the estimate; the dashboard discloses this).
  document_text_detection: 1.5,
  // $3.50 per 1000 units (WEB_DETECTION).
  web_detection: 3.5,
  unknown: 0,
}

/**
 * Map a free-text Anthropic model identifier to one of our pricing buckets.
 * Tolerant of dated suffixes ("claude-sonnet-4-20250514") and short forms
 * ("sonnet-4"). Falls back to `"unknown"` when nothing matches.
 */
export function classifyAnthropicModel(model: string | null | undefined): AnthropicModelKey {
  if (!model) return "unknown"
  const m = model.toLowerCase()
  if (m.includes("opus")) return "claude-opus-4"
  if (m.includes("haiku")) return "claude-haiku-4-5"
  if (m.includes("sonnet")) return "claude-sonnet-4"
  return "unknown"
}

/**
 * Estimate Anthropic cost in USD cents for a given input/output token count.
 * Returns 0 for unknown models or when token counts are missing.
 */
export function estimateAnthropicCostCents(
  model: string | null | undefined,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number {
  const key = classifyAnthropicModel(model)
  const rates = ANTHROPIC_RATES[key]
  const inTok = inputTokens ?? 0
  const outTok = outputTokens ?? 0
  // tokens × ($/1M tokens) × (100 cents / $1) = cents
  const dollars = (inTok / 1_000_000) * rates.inputPer1M + (outTok / 1_000_000) * rates.outputPer1M
  return roundCents(dollars * 100)
}

/**
 * Estimate Google Cloud Vision cost in USD cents. `units` is the count of
 * billable units (one per image+feature combination). Free tier ignored —
 * estimate is gross.
 */
export function estimateGoogleVisionCostCents(
  feature: GoogleVisionFeature,
  units: number | null | undefined,
): number {
  const u = units ?? 0
  const ratePer1000 = GOOGLE_VISION_RATES[feature] ?? 0
  const dollars = (u / 1000) * ratePer1000
  return roundCents(dollars * 100)
}

function roundCents(c: number): number {
  // ledger column is NUMERIC(12,4) — round to 4 decimal places to keep the
  // long tail of sub-cent calls accurate.
  if (!Number.isFinite(c) || c < 0) return 0
  return Math.round(c * 10000) / 10000
}
