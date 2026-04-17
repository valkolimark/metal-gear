/**
 * Merge OCR-derived values with Claude-derived values.
 *
 * Resolution rule: when they disagree on a nameplate field (manufacturer,
 * model, serial number, year), OCR wins if its confidence is >0.85. Otherwise
 * Claude's value is preferred (Claude sees the whole image, not just a cropped
 * text region).
 *
 * Pure functions — no I/O, no DB.
 */

import type { OCRBlock } from "@/lib/google-vision"
import type {
  EquipmentIdentification,
  FieldConfidenceMap,
} from "./types"
import { computeFieldConfidence } from "./confidence"

export interface ClaudeIdentificationOutput {
  equipment_type?: { value: string | null; confidence: number }
  manufacturer?: { value: string | null; confidence: number }
  model?: { value: string | null; confidence: number }
  serial_number?: { value: string | null; confidence: number }
  year?: { value: number | null; confidence: number }
  condition_estimate?: {
    value: "excellent" | "good" | "fair" | "poor" | null
    confidence: number
  }
  key_specs?: { value: Record<string, string | number>; confidence: number }
  taxonomy?: {
    tier1: string | null
    tier2: string | null
    subcategory: string | null
    confidence: number
  }
  suggested_title?: { value: string | null; confidence: number }
  suggested_description?: string
  clarifying_questions?: Array<{
    field: string
    question: string
    options: Array<{ value: string; label: string }>
  }>
  fraud_flags?: {
    is_suspicious: boolean
    reasons: string[]
    confidence: number
  }
}

export interface OCRExtractedFields {
  manufacturer?: { value: string; confidence: number }
  model?: { value: string; confidence: number }
  serialNumber?: { value: string; confidence: number }
  year?: { value: number; confidence: number }
}

/**
 * Walks OCR blocks and pulls likely values for manufacturer / model / serial /
 * year using light heuristics. This is intentionally conservative — we prefer
 * returning nothing over returning wrong data.
 */
export function extractFieldsFromOCR(
  blocks: OCRBlock[],
  fullText: string,
): OCRExtractedFields {
  const text = fullText.toUpperCase()
  const out: OCRExtractedFields = {}

  // Year — look for a standalone 4-digit year in a reasonable range.
  const yearMatch = text.match(/\b(19[7-9]\d|20[0-3]\d)\b/)
  if (yearMatch) {
    out.year = { value: parseInt(yearMatch[1], 10), confidence: 0.9 }
  }

  // Serial number — look for common prefixes or long alphanumeric tokens
  // adjacent to the word SERIAL / S/N / SN.
  const serialMatch =
    text.match(/\b(?:SERIAL|S\/N|SN)[:\s#]*([A-Z0-9-]{4,})/) ?? null
  if (serialMatch) {
    out.serialNumber = { value: serialMatch[1], confidence: 0.85 }
  }

  // Model — MODEL: ... or MODEL NO ...
  const modelMatch = text.match(/\bMODEL(?:\s*(?:NO|NUMBER|#))?[:\s]+([A-Z0-9\-\/]+)/)
  if (modelMatch) {
    out.model = { value: modelMatch[1], confidence: 0.8 }
  }

  // Manufacturer is NOT extracted heuristically — the largest OCR block was
  // grabbing motor-brand logos (BALDOR, ABB, WEG) off sub-component
  // nameplates and promoting them to the equipment manufacturer. Claude
  // disambiguates this from the full per-photo OCR plus the images.
  void blocks

  return out
}

export interface MergeOutput {
  identification: EquipmentIdentification
  specs: Record<string, string | number>
  condition: { tier: "excellent" | "good" | "fair" | "poor" | null; notes: string | null }
  confidence: FieldConfidenceMap
  clarifyingQuestions: Array<{
    field: string
    question: string
    options: Array<{ value: string; label: string }>
  }>
  fraud: {
    isSuspicious: boolean
    reasons: string[]
  }
}

/**
 * Resolves conflicts between Claude's structured output and OCR-extracted
 * nameplate fields. OCR wins on nameplate fields when OCR confidence > 0.85.
 */
export function mergeOCRWithVisual(
  claude: ClaudeIdentificationOutput,
  ocr: OCRExtractedFields,
  ocrAvailable: boolean,
): MergeOutput {
  const confidence: FieldConfidenceMap = {}
  const claudeSource = ocrAvailable ? "claude_with_ocr" : "claude_visual_only"

  const resolve = <T>(
    fieldName: string,
    ocrValue: { value: T; confidence: number } | undefined,
    claudeField: { value: T | null; confidence: number } | undefined,
  ): T | null => {
    const ocrHasValue = ocrValue !== undefined && ocrValue.value !== null && ocrValue.value !== undefined
    const claudeHasValue =
      claudeField !== undefined &&
      claudeField.value !== null &&
      claudeField.value !== undefined

    // Both present and agree → high confidence merged.
    if (ocrHasValue && claudeHasValue) {
      const ocrStr = String(ocrValue!.value).toUpperCase()
      const claudeStr = String(claudeField!.value).toUpperCase()
      if (ocrStr === claudeStr || ocrStr.includes(claudeStr) || claudeStr.includes(ocrStr)) {
        confidence[fieldName] = computeFieldConfidence({
          source: "merged",
          rawConfidence: Math.max(ocrValue!.confidence, claudeField!.confidence),
        })
        return ocrValue!.value
      }
      // Disagree — OCR wins if confident enough.
      if (ocrValue!.confidence > 0.85) {
        confidence[fieldName] = computeFieldConfidence({
          source: "ocr",
          rawConfidence: ocrValue!.confidence,
        })
        return ocrValue!.value
      }
      confidence[fieldName] = computeFieldConfidence({
        source: claudeSource,
        rawConfidence: claudeField!.confidence,
      })
      return claudeField!.value
    }

    if (ocrHasValue) {
      confidence[fieldName] = computeFieldConfidence({
        source: "ocr",
        rawConfidence: ocrValue!.confidence,
      })
      return ocrValue!.value
    }

    if (claudeHasValue) {
      confidence[fieldName] = computeFieldConfidence({
        source: claudeSource,
        rawConfidence: claudeField!.confidence,
      })
      return claudeField!.value
    }

    confidence[fieldName] = 0
    return null
  }

  const manufacturer = resolve<string>("manufacturer", ocr.manufacturer, claude.manufacturer)
  const model = resolve<string>("model", ocr.model, claude.model)
  const serialNumber = resolve<string>("serial_number", ocr.serialNumber, claude.serial_number)
  const year = resolve<number>("year", ocr.year, claude.year)

  const equipmentType = claude.equipment_type?.value ?? null
  confidence.equipment_type = computeFieldConfidence({
    source: claudeSource,
    rawConfidence: claude.equipment_type?.confidence ?? 0,
  })

  const conditionTier = claude.condition_estimate?.value ?? null
  confidence.condition_estimate = computeFieldConfidence({
    source: claudeSource,
    rawConfidence: claude.condition_estimate?.confidence ?? 0,
  })

  const taxonomyOut = {
    tier1: claude.taxonomy?.tier1 ?? null,
    tier2: claude.taxonomy?.tier2 ?? null,
    subcategory: claude.taxonomy?.subcategory ?? null,
  }
  confidence.taxonomy = computeFieldConfidence({
    source: claudeSource,
    rawConfidence: claude.taxonomy?.confidence ?? 0,
  })

  const suggestedTitle = claude.suggested_title?.value ?? null
  confidence.suggested_title = computeFieldConfidence({
    source: claudeSource,
    rawConfidence: claude.suggested_title?.confidence ?? 0,
  })

  const suggestedDescription = claude.suggested_description ?? null

  const specs = claude.key_specs?.value ?? {}
  confidence.key_specs = computeFieldConfidence({
    source: claudeSource,
    rawConfidence: claude.key_specs?.confidence ?? 0,
  })

  return {
    identification: {
      manufacturer,
      model,
      serialNumber,
      year,
      equipmentType,
      taxonomy: taxonomyOut,
      suggestedTitle,
      suggestedDescription,
    },
    specs,
    condition: {
      tier: conditionTier,
      notes: null,
    },
    confidence,
    clarifyingQuestions: claude.clarifying_questions ?? [],
    fraud: {
      isSuspicious: claude.fraud_flags?.is_suspicious ?? false,
      reasons: claude.fraud_flags?.reasons ?? [],
    },
  }
}
