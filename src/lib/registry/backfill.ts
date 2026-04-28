/**
 * Pure-function helpers for the registry backfill script (Cycle 61b).
 *
 * Extracted from `scripts/backfill-registry-matches.ts` so the row-scoring
 * logic can be unit-tested without spinning up a Supabase admin client.
 *
 * The script's flow:
 *   1. Load all manufacturers into memory (one DB call).
 *   2. For each candidate row: extract free-text manufacturer + equipment
 *      category, run `scoreRowAgainstRegistry`, classify into one of three
 *      tiers: auto-confirm (>= 0.90), review (0.70..0.90), unmatched (< 0.70).
 *   3. Write back the FK pair / confidence / method.
 *
 * Pure — no DB, no I/O.
 */

import {
  disambiguateNameplateCandidates,
  type Manufacturer,
} from "./index"

export const AUTO_CONFIRM_THRESHOLD = 0.9
export const REVIEW_BAND_THRESHOLD = 0.7

export type RegistryMatchTier = "auto" | "review" | "none"

export interface BackfillRowInput {
  /** Free-text manufacturer string from the row (e.g. listing.specifications.manufacturer or sos.brand). */
  manufacturer: string
  /** Equipment-type / category hint to bias the disambiguator. May be null. */
  equipmentType: string | null
}

export interface BackfillScoreResult {
  tier: RegistryMatchTier
  manufacturerId: string | null
  manufacturerName: string | null
  confidence: number
  method: "exact" | "alias" | "fuzzy" | "none"
}

/**
 * Score a single row's free-text manufacturer against the registry. Returns
 * a tier classification + the FK / confidence / method.
 *
 * `manufacturers` should be the full registry (cached once at script start).
 */
export function scoreRowAgainstRegistry(
  row: BackfillRowInput,
  manufacturers: Manufacturer[],
): BackfillScoreResult {
  const cleaned = row.manufacturer?.trim() ?? ""
  if (!cleaned) {
    return {
      tier: "none",
      manufacturerId: null,
      manufacturerName: null,
      confidence: 0,
      method: "none",
    }
  }

  const result = disambiguateNameplateCandidates(
    [cleaned],
    manufacturers,
    row.equipmentType,
  )

  const top = result.scored[0]
  if (!top || top.score === 0) {
    return {
      tier: "none",
      manufacturerId: null,
      manufacturerName: null,
      confidence: 0,
      method: "none",
    }
  }

  const rawScore = top.rawScore
  const adjusted = top.score
  const method = scoreToMethod(rawScore)

  if (adjusted >= AUTO_CONFIRM_THRESHOLD) {
    return {
      tier: "auto",
      manufacturerId: top.manufacturer.id,
      manufacturerName: top.manufacturer.name,
      confidence: adjusted,
      method,
    }
  }

  if (adjusted >= REVIEW_BAND_THRESHOLD) {
    return {
      tier: "review",
      manufacturerId: null,
      manufacturerName: top.manufacturer.name,
      confidence: adjusted,
      method,
    }
  }

  return {
    tier: "none",
    manufacturerId: null,
    manufacturerName: null,
    confidence: adjusted,
    method: "none",
  }
}

function scoreToMethod(rawScore: number): "exact" | "alias" | "fuzzy" | "none" {
  if (rawScore >= 1) return "exact"
  if (rawScore >= 0.95) return "alias"
  if (rawScore > 0) return "fuzzy"
  return "none"
}

/**
 * Extract the free-text manufacturer from a listing row. Listings store the
 * manufacturer inside `specifications` JSONB (preferred) or `specs` JSONB
 * (legacy fallback) — there is no top-level `manufacturer` column.
 */
export function extractListingManufacturer(
  specifications: Record<string, unknown> | null | undefined,
  specs: Record<string, unknown> | null | undefined,
): string | null {
  const fromSpecifications =
    typeof specifications?.manufacturer === "string"
      ? (specifications.manufacturer as string)
      : null
  if (fromSpecifications && fromSpecifications.trim().length > 0) {
    return fromSpecifications.trim()
  }
  const fromSpecs =
    typeof specs?.manufacturer === "string" ? (specs.manufacturer as string) : null
  if (fromSpecs && fromSpecs.trim().length > 0) return fromSpecs.trim()
  return null
}
