/**
 * Public surface of the vision-analysis library.
 *
 * Future callers (SOS, admin moderation, existing listing analyzer migration
 * in Cycle 59) should import ONLY from this path — never reach into the
 * internal modules directly.
 */

export { analyzeEquipmentImages } from "./analyze"
export {
  buildEquipmentIdentificationPrompt,
  buildClarificationPrompt,
  buildTaxonomyReference,
  EQUIPMENT_VISION_SYSTEM_PROMPT,
} from "./prompts"
export {
  mergeOCRWithVisual,
  extractFieldsFromOCR,
  type ClaudeIdentificationOutput,
  type OCRExtractedFields,
  type MergeOutput,
} from "./merge"
export {
  computeFieldConfidence,
  hasLowConfidenceCriticals,
  CRITICAL_FIELDS,
  type ConfidenceSource,
  type FieldEvidence,
} from "./confidence"
export type {
  AnalysisMode,
  EquipmentAnalysisResult,
  EquipmentAnalysisOptions,
  EquipmentIdentification,
  OCRExtraction,
  FraudSignals,
  FieldConfidenceMap,
  ClarifyingQuestion,
  ConditionTier,
  TaxonomyTree,
  TaxonomyTier1Bucket,
  TaxonomyTier2Group,
  TaxonomySubcategory,
  RegistryLookupResult,
  RegistryLookupMethod,
  RegistryMatchSummary,
} from "./types"
