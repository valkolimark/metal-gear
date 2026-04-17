/**
 * Snap & List–specific types.
 *
 * These wrap `EquipmentAnalysisResult` from the reusable vision-analysis
 * layer with draft + pricing + coaching metadata. Domain-specific on purpose —
 * the vision-analysis layer stays generic.
 */

import type {
  ClarifyingQuestion,
  EquipmentAnalysisResult,
  FieldConfidenceMap,
} from "@/lib/vision-analysis"

export type SnapListDraftStatus =
  | "analyzing"
  | "ready"
  | "publishing"
  | "published"
  | "discarded"
  | "failed"

export type SnapListAnalysisStage =
  | "uploading"
  | "ocr"
  | "identifying"
  | "categorizing"
  | "pricing"
  | "writing"
  | "coaching"
  | "complete"

export interface PhotoCoachSuggestion {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  projectedQualityLift: number
}

export interface PhotoCoachOutput {
  currentQualityScore: number
  suggestions: PhotoCoachSuggestion[]
  projectedWithAllSuggestions: number
}

export interface PriceSuggestion {
  hasEnoughData: boolean
  median: number | null
  rangeLow: number | null
  rangeHigh: number | null
  comparableCount: number
  currency: "USD"
  /** Human-readable context for the UI (e.g. "14 comparables in Houston region"). */
  context: string | null
  conditionAdjusted: boolean
}

export interface ComparableListing {
  id: string
  title: string
  priceCents: number | null
  condition: string | null
  locationCity: string | null
  locationState: string | null
  createdAt: string
}

/**
 * The JSONB `fields` blob on `listing_drafts` row. Serialized as JSON, not
 * typed at the DB — this interface is the application contract.
 */
export interface SnapListDraftFields {
  title: string | null
  description: string | null
  category: string | null // taxonomy subcategory id
  tier1: string | null
  tier2: string | null
  subcategory: string | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  year: number | null
  condition: "excellent" | "good" | "fair" | "poor" | null
  specs: Record<string, string | number>
  priceSuggestion: PriceSuggestion | null
  /** Dealer-set asking price in whole dollars (not cents). Null until they set one. */
  askingPrice: number | null
  locationCity: string | null
  locationState: string | null
}

/** Shape of a draft row loaded from the DB and hydrated for the UI. */
export interface SnapListDraft {
  id: string
  ownerId: string
  companyId: string | null
  photoUrls: string[]
  nameplatePhotoIndex: number | null
  fields: SnapListDraftFields
  confidenceScores: FieldConfidenceMap
  clarifyingQuestions: ClarifyingQuestion[]
  photoCoach: PhotoCoachOutput | null
  stockPhotoMatches: string[]
  status: SnapListDraftStatus
  analysisStage: SnapListAnalysisStage | null
  errorMessage: string | null
  publishedListingId: string | null
  createdAt: string
  updatedAt: string
  expiresAt: string
}

/** Minimum data an editable review field needs. */
export interface SnapListFieldDescriptor {
  name: keyof SnapListDraftFields | string
  label: string
  variant: "text" | "textarea" | "number" | "select"
  options?: Array<{ value: string; label: string }>
}

/** Helper union re-export so callers don't need both import paths. */
export type { EquipmentAnalysisResult, FieldConfidenceMap, ClarifyingQuestion }
