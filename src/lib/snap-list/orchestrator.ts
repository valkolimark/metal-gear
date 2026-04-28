/**
 * Snap & List orchestration helpers.
 *
 * Pure functions only — no I/O. This module is the single point of coupling
 * between the reusable `vision-analysis` layer and the Snap & List domain
 * (drafts, pricing, coaching). Keep persistence in server actions, keep the
 * merge/coach/price math here.
 */

import type { EquipmentAnalysisResult } from "@/lib/vision-analysis"
import type {
  ComparableListing,
  PhotoCoachOutput,
  PriceSuggestion,
  SnapListDraftFields,
} from "./types"

export type { ComparableListing }

/**
 * Project a vision-analysis result into the serialized `fields` blob we store
 * on the draft. Price suggestion, photo coach, and location get layered on
 * separately by the server action.
 */
export function projectAnalysisToDraftFields(
  analysis: EquipmentAnalysisResult,
): SnapListDraftFields {
  const reg = analysis.registryMatch
  // Only persist the FK when the analyzer actually overrode the manufacturer
  // (confidence >= 0.90 in analyze.ts). Below that threshold the FK is logged
  // but not surfaced as a verified match — the listing detail page would
  // otherwise render a "Verified manufacturer" tooltip on a low-confidence guess.
  const manufacturerId =
    reg && reg.confidence >= 0.9 ? reg.manufacturerId : null
  const manufacturerModelId =
    reg && reg.confidence >= 0.9 ? reg.manufacturerModelId : null

  return {
    title: analysis.identification.suggestedTitle,
    description: analysis.identification.suggestedDescription,
    category: analysis.identification.taxonomy.subcategory,
    tier1: analysis.identification.taxonomy.tier1,
    tier2: analysis.identification.taxonomy.tier2,
    subcategory: analysis.identification.taxonomy.subcategory,
    manufacturer: analysis.identification.manufacturer,
    model: analysis.identification.model,
    serialNumber: analysis.identification.serialNumber,
    year: analysis.identification.year,
    condition: analysis.condition.tier,
    specs: analysis.specs,
    priceSuggestion: null,
    askingPrice: null,
    locationCity: null,
    locationState: null,
    manufacturerId,
    manufacturerModelId,
  }
}

/**
 * Compute a price suggestion from an array of comparable listings. Median-based
 * with an IQR range. Condition-adjusted by a simple multiplier when provided.
 *
 *   excellent ×1.15
 *   good      ×1.00
 *   fair      ×0.80
 *   poor      ×0.65
 */
const CONDITION_MULTIPLIERS: Record<string, number> = {
  excellent: 1.15,
  good: 1.0,
  fair: 0.8,
  poor: 0.65,
}

export function computePriceSuggestion(
  comparables: ComparableListing[],
  targetCondition: string | null,
  regionLabel?: string,
): PriceSuggestion {
  const priced = comparables
    .map((c) => c.priceCents)
    .filter((p): p is number => typeof p === "number" && p > 0)
    .sort((a, b) => a - b)

  if (priced.length < 5) {
    return {
      hasEnoughData: false,
      median: null,
      rangeLow: null,
      rangeHigh: null,
      comparableCount: priced.length,
      currency: "USD",
      context:
        priced.length === 0
          ? "No comparable listings found yet — use your knowledge of the equipment to set a price."
          : `Only ${priced.length} comparable${priced.length === 1 ? "" : "s"} found — not enough for a confident range.`,
      conditionAdjusted: false,
    }
  }

  const median = medianOf(priced)
  const q1 = medianOf(priced.slice(0, Math.floor(priced.length / 2)))
  const q3 = medianOf(priced.slice(Math.ceil(priced.length / 2)))

  const multiplier: number = targetCondition
    ? CONDITION_MULTIPLIERS[targetCondition] ?? 1.0
    : 1.0

  return {
    hasEnoughData: true,
    median: Math.round(median * multiplier),
    rangeLow: Math.round(q1 * multiplier),
    rangeHigh: Math.round(q3 * multiplier),
    comparableCount: priced.length,
    currency: "USD",
    context: regionLabel
      ? `based on ${priced.length} comparables in ${regionLabel}`
      : `based on ${priced.length} comparables`,
    conditionAdjusted: multiplier !== 1.0,
  }
}

function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Quick client-side-safe heuristic quality score based on number of photos
 * and known equipment type. Real scoring happens server-side via Claude.
 */
export function quickQualityScore(
  photoCount: number,
  hasNameplate: boolean,
  hasSpecs: boolean,
): number {
  let score = 30
  score += Math.min(photoCount, 6) * 8
  if (hasNameplate) score += 15
  if (hasSpecs) score += 10
  return Math.min(100, score)
}

/**
 * Trim a coaching result down to the top N priority suggestions. Used by the
 * UI when it can only render 3 tiles.
 */
export function topCoachingSuggestions(
  coach: PhotoCoachOutput | null,
  limit = 3,
): PhotoCoachOutput | null {
  if (!coach) return null
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const sorted = [...coach.suggestions].sort(
    (a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99),
  )
  return {
    ...coach,
    suggestions: sorted.slice(0, limit),
  }
}
