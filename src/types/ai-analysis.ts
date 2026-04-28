// AI Image Analysis Types — Cycle 10, updated Cycle 27c

export interface AnalyzeImageRequest {
  wideShot?: string // base64 image, equipment wide shot
  nameplateShot?: string // base64 image, nameplate close-up
  nameplateImageBase64?: string // alias for nameplateShot (multi-image mode)
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
  nameplateMimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface ConfidenceField<T> {
  value: T
  confidence: number
}

export interface TaxonomyResult {
  tier1?: string
  tier2?: string
  subcategory?: string
  confidence: 'high' | 'medium' | 'low'
  numericConfidence?: number
  alternatives?: Array<{ tier1: string; tier2: string; subcategory: string }>
}

export interface ListingResult {
  title?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  year?: number
  condition?: 'excellent' | 'good' | 'fair' | 'poor'
  specs: Record<string, string>
  suggestedDescription?: string
}

export interface FraudResult {
  flagged: boolean
  reason?: string
  confidence?: number
}

export interface FieldConfidenceScores {
  equipment_type: number
  manufacturer: number
  model: number
  serial_number: number
  year: number
  condition: number
  taxonomy: number
  title: number
  fraud: number
}

/**
 * Equipment Registry match summary (Cycle 61b). Surfaced when the analyzer
 * was wired with a `registryLookup` callback. Null when no callback ran or
 * no usable hit was returned.
 */
export interface RegistryMatchInfo {
  manufacturerId: string | null
  manufacturerModelId: string | null
  confidence: number
  method: 'exact' | 'alias' | 'fuzzy' | 'none'
}

export interface AIAnalysisResult {
  taxonomy: TaxonomyResult
  listing: ListingResult
  fraud: FraudResult
  rawAnalysis: string
  // Cycle 27c additions
  confidenceScores?: FieldConfidenceScores
  overallConfidence?: number
  lowConfidenceFields?: string[]
  analysisMode?: 'single_image' | 'multi_image'
  wasReprompted?: boolean
  // Cycle 61b
  registryMatch?: RegistryMatchInfo | null
}

export interface AIAnalysisErrorResponse {
  error: string
}
