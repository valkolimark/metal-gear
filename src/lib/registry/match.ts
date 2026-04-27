/**
 * Pure-function registry matchers — no DB, no I/O.
 *
 * These run both server-side (inside server actions and the seed script)
 * and inside `disambiguateNameplateCandidates`, which the vision-analysis
 * caller invokes via the `registryLookup` callback (Cycle 61b). Keeping
 * them pure means the vision-analysis layer never imports from this module.
 */

import { COMPONENT_CATEGORIES, type Manufacturer } from "./index"

const SUFFIX_PATTERNS: ReadonlyArray<RegExp> = [
  /\s+inc\.?$/i,
  /\s+incorporated$/i,
  /\s+llc\.?$/i,
  /\s+l\.?l\.?c\.?$/i,
  /\s+ltd\.?$/i,
  /\s+limited$/i,
  /\s+gmbh$/i,
  /\s+ag$/i,
  /\s+s\.?a\.?$/i,
  /\s+co\.?$/i,
  /\s+company$/i,
  /\s+corp\.?$/i,
  /\s+corporation$/i,
  /\s+plc$/i,
  /\s+nv$/i,
  /\s+bv$/i,
  /\s+sas$/i,
  /\s+srl$/i,
  /\s+spa$/i,
  /\s+pty\.?$/i,
  /\s+kg$/i,
]

/**
 * Normalize a free-text manufacturer name for comparison. Strips legal
 * suffixes (Inc, LLC, GmbH, …), collapses whitespace, lowercases.
 */
export function normalizeManufacturerString(input: string): string {
  if (!input) return ""
  let out = input.trim()
  // Strip parenthetical content (location/country labels).
  out = out.replace(/\([^)]*\)/g, " ")
  // Strip punctuation except internal hyphens / ampersands.
  out = out.replace(/[.,;:!?]/g, " ")
  // Collapse whitespace once before suffix stripping so the trailing-anchor
  // regexes don't get tripped up by stray spaces.
  out = out.replace(/\s+/g, " ").trim()
  // Drop legal-entity suffixes (run repeatedly to catch "X Inc Co" → "X").
  let prev = ""
  while (prev !== out) {
    prev = out
    for (const re of SUFFIX_PATTERNS) {
      out = out.replace(re, "")
    }
    out = out.trim() // strip whitespace exposed by suffix removal
  }
  out = out.toLowerCase().replace(/\s+/g, " ").trim()
  return out
}

/** Trigram set of a normalized string. Mirrors Postgres pg_trgm semantics. */
function trigramSet(s: string): Set<string> {
  const padded = `  ${s}  `
  const grams = new Set<string>()
  if (s.length === 0) return grams
  for (let i = 0; i < padded.length - 2; i++) {
    grams.add(padded.slice(i, i + 3))
  }
  return grams
}

function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0
  const ga = trigramSet(a)
  const gb = trigramSet(b)
  let intersection = 0
  for (const g of ga) if (gb.has(g)) intersection++
  const union = ga.size + gb.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Score a single registry candidate against a free-text input.
 *
 *   exact     1.00
 *   alias     0.95
 *   substring 0.85   (input fully contained in candidate or vice versa)
 *   trigram   0..0.85 (Jaccard on trigram sets, capped at 0.85)
 *
 * Pure function. No I/O.
 */
export function scoreCandidate(input: string, candidate: Manufacturer): number {
  const ni = normalizeManufacturerString(input)
  if (!ni) return 0
  const nc = normalizeManufacturerString(candidate.name)
  if (ni === nc) return 1
  for (const alias of candidate.aliases) {
    if (normalizeManufacturerString(alias) === ni) return 0.95
  }
  if (nc.includes(ni) || ni.includes(nc)) return 0.85
  const trig = trigramSimilarity(ni, nc)
  // Also try aliases via trigram (helps OCR errors on sub-brand names).
  let bestAlias = 0
  for (const alias of candidate.aliases) {
    const t = trigramSimilarity(ni, normalizeManufacturerString(alias))
    if (t > bestAlias) bestAlias = t
  }
  return Math.min(0.85, Math.max(trig, bestAlias))
}

export interface ScoredManufacturer {
  manufacturer: Manufacturer
  /** Final adjusted score after equipment-type boosting/demotion. */
  score: number
  /** Raw score before disambiguation adjustments. */
  rawScore: number
  /** True if the manufacturer's categories overlap the visually-identified equipment type. */
  matchedEquipmentType: boolean
  /** True if the manufacturer is *exclusively* a component vendor (motor/gearbox/seal/…). */
  isComponentOnly: boolean
}

export interface DisambiguationResult {
  primary: Manufacturer | null
  secondary: Manufacturer[]
  confidence: number
  scored: ScoredManufacturer[]
}

/**
 * The "Baldor fix": given multiple OCR-extracted brand strings and registry
 * hits, choose the best primary manufacturer. Equipment-category overlap
 * with the visually-identified equipment type breaks ties in favor of the
 * equipment OEM (e.g., Sharples on a centrifuge) over component vendors
 * (e.g., Baldor motor mounted on the centrifuge).
 *
 * Algorithm:
 *   1. Score each registry hit against the best-matching OCR candidate.
 *   2. Boost +0.15 if the hit's equipment_categories overlap equipmentType.
 *   3. Demote -0.20 if the hit is *exclusively* a component vendor AND
 *      another non-component hit exists.
 *   4. Highest-scoring hit becomes primary; rest are secondary, sorted desc.
 *
 * Pure function. Returns `{ primary: null, secondary: [], confidence: 0, scored: [] }`
 * for empty input — never throws.
 */
export function disambiguateNameplateCandidates(
  ocrCandidates: string[],
  registryHits: Manufacturer[],
  equipmentType: string | null = null,
): DisambiguationResult {
  if (ocrCandidates.length === 0 || registryHits.length === 0) {
    return { primary: null, secondary: [], confidence: 0, scored: [] }
  }

  const normEq = equipmentType ? equipmentType.toLowerCase().trim() : null

  // Step 1 — raw scores.
  const baseScored = registryHits.map(hit => {
    let best = 0
    for (const cand of ocrCandidates) {
      const s = scoreCandidate(cand, hit)
      if (s > best) best = s
    }
    const cats = hit.equipmentCategories.map(c => c.toLowerCase())
    const matchedEquipmentType =
      normEq !== null && cats.some(c => c === normEq || normEq.includes(c) || c.includes(normEq))
    const isComponentOnly =
      cats.length > 0 && cats.every(c => COMPONENT_CATEGORIES.has(c))
    return {
      manufacturer: hit,
      rawScore: best,
      score: best,
      matchedEquipmentType,
      isComponentOnly,
    }
  })

  const hasNonComponent = baseScored.some(s => !s.isComponentOnly)

  // Step 2 + 3 — boost / demote.
  const scored: ScoredManufacturer[] = baseScored.map(s => {
    let adjusted = s.rawScore
    if (s.matchedEquipmentType) adjusted += 0.15
    if (s.isComponentOnly && hasNonComponent) adjusted -= 0.2
    return { ...s, score: Math.max(0, Math.min(1.15, adjusted)) }
  })

  // Step 4 — sort desc by score; primary = top.
  scored.sort((a, b) => b.score - a.score)
  const primary = scored[0]?.manufacturer ?? null
  const secondary = scored.slice(1).map(s => s.manufacturer)
  const confidence = scored[0]?.score ?? 0

  return { primary, secondary, confidence, scored }
}
