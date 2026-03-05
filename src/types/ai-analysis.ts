// AI Image Analysis Types — Cycle 10

export interface AnalyzeImageRequest {
  wideShot?: string; // base64 image, equipment wide shot
  nameplateShot?: string; // base64 image, nameplate close-up
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
}

export interface TaxonomyResult {
  tier1?: string;
  tier2?: string;
  subcategory?: string;
  confidence: "high" | "medium" | "low";
  alternatives?: Array<{ tier1: string; tier2: string; subcategory: string }>;
}

export interface ListingResult {
  title?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  year?: number;
  condition?: "excellent" | "good" | "fair" | "poor";
  specs: Record<string, string>;
  suggestedDescription?: string;
}

export interface FraudResult {
  flagged: boolean;
  reason?: string;
}

export interface AIAnalysisResult {
  taxonomy: TaxonomyResult;
  listing: ListingResult;
  fraud: FraudResult;
  rawAnalysis: string;
}

export interface AIAnalysisErrorResponse {
  error: string;
}
