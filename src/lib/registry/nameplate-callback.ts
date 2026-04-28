/**
 * Shared registry-lookup callback factory (Cycle 61b).
 *
 * Used by all three vision-analysis consumers (Photo-to-Listing, SOS
 * camera-first, manual-form Photo Helper) to wire the registry into the
 * `analyzeEquipmentImages()` pipeline.
 *
 * This module is the **only** place that joins the registry layer
 * (`@/lib/registry`, `@/app/actions/registry`) with the vision-analysis
 * layer's callback contract. The vision-analysis layer itself never imports
 * from `@/lib/registry/*` (architecture invariant — see CI test
 * `src/test/vision-analysis-isolation.test.ts`).
 *
 * Pure-server module — uses server actions under the hood.
 */

import {
  disambiguateNameplateCandidates,
  type Manufacturer,
  type ManufacturerModel,
} from "@/lib/registry"
import {
  searchManufacturers as defaultSearchManufacturers,
  searchModels as defaultSearchModels,
} from "@/app/actions/registry"
import type {
  RegistryLookupMethod,
  RegistryLookupResult,
} from "@/lib/vision-analysis"

/**
 * Threshold above which the orchestrator treats the manufacturer match as
 * confident enough to attempt a model lookup. Mirrors the analyzer's
 * REGISTRY_OVERRIDE_THRESHOLD so model FKs only get attached when the parent
 * manufacturer FK is also confident.
 */
const MODEL_LOOKUP_MANUFACTURER_THRESHOLD = 0.9

/**
 * Threshold for accepting a model match. Higher than the manufacturer
 * threshold because OCR model strings are noisier (longer alphanumeric
 * tokens) and false positives propagate to the listing detail page.
 */
const MODEL_ACCEPT_THRESHOLD = 0.9

/**
 * How many of the top OCR candidates to fan out searchManufacturers across.
 * 3 covers the realistic case (equipment OEM + motor + maybe controller)
 * without exploding the per-analysis Supabase query count.
 */
const MAX_CANDIDATE_SEARCHES = 3

export interface NameplateRegistryCallbackDeps {
  searchManufacturers: typeof defaultSearchManufacturers
  searchModels: typeof defaultSearchModels
}

/**
 * Build a callback suitable for `EquipmentAnalysisOptions.registryLookup`.
 *
 * The returned function:
 *  1. Searches the registry for each top OCR brand candidate, unioning hits.
 *  2. Runs `disambiguateNameplateCandidates` (the "Baldor fix") to pick the
 *     equipment OEM over component vendors when both appear on a nameplate.
 *  3. Optionally resolves a model FK against the chosen manufacturer.
 *
 * Never throws — wraps all DB I/O in try/catch and returns null on failure
 * so the vision pipeline degrades gracefully.
 */
export function buildNameplateRegistryCallback(
  deps?: Partial<NameplateRegistryCallbackDeps>,
): (input: {
  candidates: string[]
  equipmentType: string | null
  model: string | null
}) => Promise<RegistryLookupResult | null> {
  const searchManufacturers =
    deps?.searchManufacturers ?? defaultSearchManufacturers
  const searchModels = deps?.searchModels ?? defaultSearchModels

  return async function nameplateRegistryCallback(input) {
    const { candidates, equipmentType, model } = input
    if (!candidates || candidates.length === 0) return null

    // Step 1 — search per candidate, union hits by id.
    const hitMap = new Map<string, Manufacturer>()
    for (const cand of candidates.slice(0, MAX_CANDIDATE_SEARCHES)) {
      try {
        const hits = await searchManufacturers({
          query: cand,
          equipmentType: equipmentType ?? undefined,
          limit: 8,
        })
        for (const h of hits) {
          if (!hitMap.has(h.id)) hitMap.set(h.id, h)
        }
      } catch (err) {
        console.error(
          "[nameplate-callback] searchManufacturers error",
          { candidate: cand, err },
        )
      }
    }

    if (hitMap.size === 0) return null

    // Step 2 — disambiguate (Baldor fix).
    const disambiguation = disambiguateNameplateCandidates(
      candidates,
      Array.from(hitMap.values()),
      equipmentType,
    )

    if (!disambiguation.primary || disambiguation.confidence === 0) return null

    const primary = disambiguation.primary
    const top = disambiguation.scored[0]
    const rawScore = top?.rawScore ?? disambiguation.confidence
    const method = scoreToMethod(rawScore)

    // Step 3 — optional model lookup. Only at high manufacturer confidence
    // AND a non-empty Claude-extracted model string.
    let manufacturerModelId: string | null = null
    let manufacturerModelName: string | null = null
    if (
      disambiguation.confidence >= MODEL_LOOKUP_MANUFACTURER_THRESHOLD &&
      model &&
      model.trim().length > 0
    ) {
      try {
        const modelHits = await searchModels({
          manufacturerId: primary.id,
          query: model,
          limit: 5,
        })
        const best = pickBestModel(modelHits, model)
        if (best && best.score >= MODEL_ACCEPT_THRESHOLD) {
          manufacturerModelId = best.model.id
          manufacturerModelName = best.model.name
        }
      } catch (err) {
        console.error(
          "[nameplate-callback] searchModels error",
          { manufacturerId: primary.id, model, err },
        )
      }
    }

    return {
      manufacturerId: primary.id,
      manufacturerName: primary.name,
      manufacturerModelId,
      manufacturerModelName,
      confidence: disambiguation.confidence,
      method,
    }
  }
}

/**
 * Map a raw similarity score back to the discrete method label. Mirrors
 * `scoreCandidate` in `match.ts`:
 *   1.0   exact
 *   0.95  alias
 *   0.85+ substring or trigram
 *   0     none
 */
function scoreToMethod(rawScore: number): RegistryLookupMethod {
  if (rawScore >= 1) return "exact"
  if (rawScore >= 0.95) return "alias"
  if (rawScore > 0) return "fuzzy"
  return "none"
}

/**
 * Score model candidates against the OCR/Claude-extracted model string.
 *
 * Exact (case-insensitive) match: 1.0
 * Substring (either way): 0.92 (above MODEL_ACCEPT_THRESHOLD by a hair)
 * Otherwise: 0
 *
 * Conservative on purpose. Model strings tend to be alphanumeric SKUs where
 * fuzzy matches generate noise.
 */
function pickBestModel(
  models: ManufacturerModel[],
  query: string,
): { model: ManufacturerModel; score: number } | null {
  const q = query.trim().toLowerCase()
  if (!q || models.length === 0) return null

  let best: { model: ManufacturerModel; score: number } | null = null
  for (const m of models) {
    const name = m.name.trim().toLowerCase()
    let score = 0
    if (name === q) score = 1
    else if (name.includes(q) || q.includes(name)) score = 0.92
    if (score > 0 && (!best || score > best.score)) {
      best = { model: m, score }
    }
  }
  return best
}
