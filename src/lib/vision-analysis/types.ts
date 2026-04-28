/**
 * Vision-analysis types — the reusable contract between the vision pipeline
 * and its callers. These types are stable; Cycle 59 will migrate SOS,
 * admin moderation, and the existing listing analyzer onto this same shape,
 * so DO NOT add domain-specific fields (draft ids, listing ids, SOS ids).
 */

import type { OCRBlock } from "@/lib/google-vision"

export type ConditionTier = "excellent" | "good" | "fair" | "poor"

export interface EquipmentIdentification {
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  year: number | null
  equipmentType: string | null
  taxonomy: {
    tier1: string | null
    tier2: string | null
    subcategory: string | null
  }
  suggestedTitle: string | null
  suggestedDescription: string | null
}

export interface OCRExtraction {
  fullText: string
  blocks: OCRBlock[]
  hasText: boolean
  /** Index into the input photoUrls array that had the most readable text, or null if no text was detected anywhere. */
  sourcePhotoIndex: number | null
}

export interface FraudSignals {
  stockPhotoMatches: string[]
  webPages: string[]
  isSuspicious: boolean
  reasons: string[]
}

export type FieldConfidenceMap = Record<string, number>

export interface ClarifyingQuestion {
  field: string
  question: string
  options: Array<{ value: string; label: string }>
}

export type RegistryLookupMethod = "exact" | "alias" | "fuzzy" | "none"

/**
 * Result of a registry lookup callback. The vision-analysis layer treats this
 * as opaque data — domain isolation invariant: this lib does NOT import from
 * `@/lib/registry/*` or `@/app/actions/*`.
 */
export interface RegistryLookupResult {
  manufacturerId: string | null
  manufacturerName: string | null
  manufacturerModelId: string | null
  manufacturerModelName: string | null
  confidence: number
  method: RegistryLookupMethod
}

/**
 * Subset of RegistryLookupResult attached to EquipmentAnalysisResult. Carries
 * the FK pair for orchestrators to persist alongside free-text values.
 */
export interface RegistryMatchSummary {
  manufacturerId: string | null
  manufacturerModelId: string | null
  confidence: number
  method: RegistryLookupMethod
}

export interface EquipmentAnalysisResult {
  identification: EquipmentIdentification
  specs: Record<string, string | number>
  condition: {
    tier: ConditionTier | null
    notes: string | null
  }
  ocr: OCRExtraction
  fraud: FraudSignals
  confidence: FieldConfidenceMap
  clarifyingQuestions: ClarifyingQuestion[]
  /** Per-stage timings in ms. Keys may include: `ocr`, `web_detection`, `claude`, `merge`, `registry_lookup`. */
  stageTimings: Record<string, number>
  /** Tag passed by the caller for observability (e.g. "snap_list", "sos"). */
  callerTag?: string
  /** Non-fatal errors accumulated during analysis. Presence here means partial result. */
  errors: string[]
  /**
   * Result of the optional registry lookup callback. `null` when no callback
   * was passed OR the callback returned no usable hit. When confidence is
   * >= 0.90 the analyzer also overrides `identification.manufacturer` with
   * the canonical registry name; below that threshold the FK pair is still
   * exposed (so the orchestrator can log it) but the manufacturer string is
   * left as Claude/OCR returned it.
   */
  registryMatch?: RegistryMatchSummary | null
  rawClaudeOutput?: string
  rawWebDetection?: unknown
  rawOCR?: unknown
}

// ─── Taxonomy ────────────────────────────────────────────────────────
// Structural copy of the shape in src/lib/constants/equipment-taxonomy.ts.
// Duplicated intentionally so this layer stays domain-agnostic: the caller
// passes the taxonomy tree in, the library doesn't import from DB/constants.

export interface TaxonomySubcategory {
  id: string
  label: string
}
export interface TaxonomyTier2Group {
  id: string
  label: string
  subcategories: TaxonomySubcategory[]
}
export interface TaxonomyTier1Bucket {
  id: string
  label: string
  groups: TaxonomyTier2Group[]
}
export type TaxonomyTree = TaxonomyTier1Bucket[]

export type AnalysisMode = "snap-list" | "sos" | "listing-helper"

export interface EquipmentAnalysisOptions {
  /** Domain-specific taxonomy passed in by the caller — keeps this lib pure. */
  taxonomyContext: TaxonomyTree
  /** Tag for observability; logged/stored alongside the result. */
  callerTag?: string
  /** Override the Anthropic API key (defaults to env ANTHROPIC_API_KEY). */
  anthropicApiKey?: string
  /** Fires when each internal stage completes — used by orchestrators for streaming UX. */
  onStageComplete?: (stage: string, durationMs: number) => void
  /**
   * Domain-specific framing for the Claude prompt. Only changes the framing
   * sentence; the JSON response schema is identical across modes. Default
   * `'snap-list'` preserves Cycle 58 behavior.
   */
  mode?: AnalysisMode
  /**
   * Optional registry lookup callback (Cycle 61b). When provided, the analyzer
   * invokes it AFTER OCR + Claude identification with the deduplicated brand
   * candidates plus the visually-identified equipment type. The callback runs
   * registry search + nameplate disambiguation and returns a RegistryLookupResult.
   *
   * Domain isolation invariant: the vision-analysis layer NEVER imports from
   * `@/lib/registry/*` or `@/app/actions/*`. The callback shape is the only
   * coupling point — the caller wires the implementation.
   */
  registryLookup?: (input: {
    candidates: string[]
    equipmentType: string | null
    /** Claude-extracted model string, if any. Lets the callback try to resolve a model FK after picking the manufacturer. */
    model: string | null
  }) => Promise<RegistryLookupResult | null>
}

export { OCRBlock }
