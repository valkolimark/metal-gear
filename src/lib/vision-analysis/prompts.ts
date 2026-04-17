/**
 * Prompt builders for the vision-analysis layer.
 *
 * Pure functions. No DB access, no env access. Taxonomy is passed in so the
 * same builder can serve any caller (Snap & List, SOS, admin moderation).
 */

import type { TaxonomyTree } from "./types"

export const EQUIPMENT_VISION_SYSTEM_PROMPT = `You are an expert industrial equipment analyst with 25+ years of experience identifying heavy machinery used in oil & gas, petrochemical, mining, and manufacturing industries.

Your task is to analyze equipment photographs and any provided OCR text, then extract structured data.

CRITICAL RULES:
1. Return ONLY valid JSON. No markdown fences. No preamble. No explanation outside the JSON.
2. Never invent data. If you cannot read or infer a value, use null and set confidence low.
3. Every field that has a "confidence" slot must include a number from 0.0 (no confidence) to 1.0 (certain).
4. OCR text is ground truth for FIELD VALUES (serial, model, year). But OCR CANNOT distinguish which nameplate is the equipment's — that is a visual/semantic judgment you must make.
5. **Sub-component nameplates vs. equipment nameplates.** Industrial equipment routinely carries multiple nameplates: one for the main equipment, and separate ones for its sub-components (motor, drive, pump end, controller, flow meter). The dealer wants the EQUIPMENT manufacturer, never the sub-component brand.
   Common motor / sub-component brands (these are NOT the equipment manufacturer unless the equipment itself is a motor or drive):
   **Motors:** BALDOR, ABB, WEG, SIEMENS, TOSHIBA, MARATHON, US MOTORS, LEESON, TECO, NIDEC, LAFERT
   **VFDs / drives:** ABB, Siemens, Allen-Bradley, Yaskawa, Mitsubishi, Danfoss, Rockwell, Hitachi
   **Bearings:** SKF, FAG, Timken, NSK, NTN
   **Seals:** John Crane, EagleBurgmann, Chesterton, Flowserve, AESSEAL
   Equipment manufacturer examples by category — **centrifuges:** Alfa Laval, Westfalia, GEA, AMETEK, Ferrum, Heinkel, Rousselet, Pennwalt, Tolhurst, OLHU. **Pumps:** Sulzer, Flowserve, Goulds, ITT, Grundfos, KSB. **Turbines:** GE, Siemens, Mitsubishi, Solar. **Excavators:** Caterpillar, Komatsu, Volvo, Hitachi, John Deere. If the loudest OCR text is a motor brand but the equipment class is clearly something else (centrifuge, pump, turbine), IGNORE the motor brand for manufacturer and look harder at the other photos / visible badges on the main body.
6. Map tier1 / tier2 / subcategory by BRACKET ID from the TAXONOMY reference (e.g. "excavators", not "Excavators"). If nothing fits, use null.
7. Fraud flags: mark is_suspicious=true if the image appears to be a stock catalog photo, AI-generated, or shows different equipment than the OCR text suggests.

RESPONSE JSON SCHEMA:
{
  "equipment_type": { "value": "string or null", "confidence": 0.0 },
  "manufacturer": { "value": "string or null", "confidence": 0.0 },
  "model": { "value": "string or null", "confidence": 0.0 },
  "serial_number": { "value": "string or null", "confidence": 0.0 },
  "year": { "value": "number or null", "confidence": 0.0 },
  "condition_estimate": { "value": "excellent|good|fair|poor or null", "confidence": 0.0 },
  "key_specs": { "value": { "key": "value" }, "confidence": 0.0 },
  "taxonomy": {
    "tier1": "string or null",
    "tier2": "string or null",
    "subcategory": "string or null",
    "confidence": 0.0
  },
  "suggested_title": { "value": "string or null", "confidence": 0.0 },
  "suggested_description": "string",
  "clarifying_questions": [
    { "field": "string", "question": "string", "options": [{ "value": "string", "label": "string" }] }
  ],
  "fraud_flags": {
    "is_suspicious": false,
    "reasons": [],
    "confidence": 0.0
  }
}`

/**
 * Builds a compact bracket-ID taxonomy reference for the model. The bracket
 * IDs are the canonical identifiers the model must return.
 */
export function buildTaxonomyReference(taxonomy: TaxonomyTree): string {
  const lines: string[] = []
  for (const bucket of taxonomy) {
    lines.push(`[${bucket.id}] ${bucket.label}`)
    for (const group of bucket.groups) {
      lines.push(`  [${group.id}] ${group.label}`)
      for (const sub of group.subcategories) {
        lines.push(`    [${sub.id}] ${sub.label}`)
      }
    }
  }
  return lines.join("\n")
}

export interface PhotoOcrEntry {
  /** 0-indexed position in the photo array. */
  photoIndex: number
  /** Full OCR text for that photo. Empty string when no text detected. */
  text: string
}

export interface PromptInput {
  photoCount: number
  /** Per-photo OCR so Claude can disambiguate which nameplate belongs to the equipment vs. a sub-component. */
  perPhotoOcr: PhotoOcrEntry[]
  /** Heuristic pick: photo with most OCR text. Just a hint; Claude should override when sub-component brands are present. */
  nameplateHintPhotoIndex: number | null
  taxonomy: TaxonomyTree
}

/**
 * Main Claude prompt. Images are attached as content blocks separately —
 * this returns only the text portion of the user message.
 */
export function buildEquipmentIdentificationPrompt(input: PromptInput): string {
  const { photoCount, perPhotoOcr, nameplateHintPhotoIndex, taxonomy } = input
  const lines: string[] = []

  if (photoCount === 1) {
    lines.push("Analyze this equipment photograph.")
  } else {
    lines.push(
      `Analyze these ${photoCount} equipment photographs together — they are all of the same unit.`,
    )
  }

  const photosWithText = perPhotoOcr.filter((p) => p.text && p.text.trim().length > 0)

  if (photosWithText.length > 0) {
    lines.push("")
    lines.push("PER-PHOTO OCR (extracted by Google Cloud Vision). Each block below is one photo's extracted text. Use this to pick the EQUIPMENT nameplate over sub-component nameplates:")
    lines.push("")
    for (const entry of photosWithText) {
      lines.push(`--- Photo ${entry.photoIndex + 1} ---`)
      lines.push(entry.text.trim())
      lines.push("")
    }
    if (photosWithText.length > 1) {
      lines.push(
        "⚠ MULTIPLE nameplates detected. Walk through them: identify the equipment class visually first (centrifuge? pump? turbine? excavator?). Then pick the manufacturer from the nameplate whose brand MATCHES that class. Ignore nameplates whose brand is in the motor / drive / seal list (Baldor, ABB, WEG, Siemens, SKF, …) — those belong to sub-components. Record sub-component brands in `key_specs` (e.g. `{ \"motor_brand\": \"BALDOR\", \"motor_model\": \"...\" }`) rather than in `manufacturer`.",
      )
    } else if (nameplateHintPhotoIndex !== null) {
      lines.push(
        `Only photo ${nameplateHintPhotoIndex + 1} had readable OCR. Confirm the brand you see matches the equipment class before using it as the manufacturer.`,
      )
    }
  } else {
    lines.push("")
    lines.push(
      "No OCR text was detected on any photo. Identify the equipment from visual features alone. State upfront in the description that exact model/manufacturer requires nameplate confirmation.",
    )
  }

  lines.push("")
  lines.push(
    "Return the analysis as JSON following the required schema. Use bracket IDs from the TAXONOMY reference below for tier1/tier2/subcategory.",
  )
  lines.push("")
  lines.push("If 1–2 critical fields are genuinely ambiguous (materials, condition tier), include them in `clarifying_questions` with 2–3 options each. Otherwise leave that array empty.")
  lines.push("")
  lines.push("TAXONOMY:")
  lines.push(buildTaxonomyReference(taxonomy))

  return lines.join("\n")
}

/**
 * Secondary prompt used when the first analysis had low confidence on specific
 * fields. Targets just those fields for a focused re-inspection.
 */
export function buildClarificationPrompt(lowConfidenceFields: string[]): string {
  const fieldNames = lowConfidenceFields.join(", ")
  return `Your previous analysis had low confidence on: ${fieldNames}. Please look more carefully at the images. Focus specifically on any text, labels, markings, or visual details that could help identify these fields. Return ONLY a JSON object with the updated fields in the same schema format. Only include the fields you are re-analyzing.`
}
