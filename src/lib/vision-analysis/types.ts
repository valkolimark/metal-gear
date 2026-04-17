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
  /** Per-stage timings in ms. Keys may include: `ocr`, `web_detection`, `claude`, `merge`. */
  stageTimings: Record<string, number>
  /** Tag passed by the caller for observability (e.g. "snap_list", "sos"). */
  callerTag?: string
  /** Non-fatal errors accumulated during analysis. Presence here means partial result. */
  errors: string[]
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

export interface EquipmentAnalysisOptions {
  /** Domain-specific taxonomy passed in by the caller — keeps this lib pure. */
  taxonomyContext: TaxonomyTree
  /** Tag for observability; logged/stored alongside the result. */
  callerTag?: string
  /** Override the Anthropic API key (defaults to env ANTHROPIC_API_KEY). */
  anthropicApiKey?: string
  /** Fires when each internal stage completes — used by orchestrators for streaming UX. */
  onStageComplete?: (stage: string, durationMs: number) => void
}

export { OCRBlock }
