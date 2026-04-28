/**
 * Extraction prompt for the Equipment Registry seed pipeline.
 *
 * Exported as a separate module so the prompt structure can be unit-tested
 * (see src/test/seed-extraction.test.ts) without invoking the LLM.
 */

import type Anthropic from "@anthropic-ai/sdk"

export const EXTRACTION_SYSTEM_PROMPT = `You extract structured manufacturer data from industrial equipment reference markdown.

Your only output is a single JSON object matching this schema EXACTLY:

{
  "manufacturers": [
    {
      "name": string,                       // canonical company name (e.g. "Sharples", "SPX FLOW – Lightnin")
      "country": string | null,             // ISO country name if stated; else null
      "tier": 1 | 2 | 3,                    // 1 = global leader, 2 = specialty/regional, 3 = legacy/regional small
      "equipment_categories": string[],     // single-word category tags from this file's primary category
      "aliases": string[],                  // alternate names, sub-brand names, prior company names
      "parent_name": string | null,         // canonical name of the parent company if mentioned (e.g. "NOV" for "Chemineer")
      "models": [
        {
          "name": string,                   // model designation (e.g. "Series 70", "DPM-100", "HT")
          "series": string | null,          // family name when distinct (e.g. "Lightnin Top-Entry")
          "equipment_type": string | null,  // type within the category (e.g. "top-entry agitator")
          "notes": string | null            // ≤120-char descriptor; null if no useful note
        }
      ],
      "notes": string | null                // ≤200-char description; null if none
    }
  ]
}

Rules:
- Output JSON ONLY. No prose, no commentary, no code fences.
- If no manufacturers appear in the chunk, return {"manufacturers": []}.
- Every manufacturer mentioned with a model list, headquarters, or descriptor MUST appear in the array.
- Tier inference: tier MUST be exactly 1, 2, or 3 — never higher. A manufacturer found under "## Tier 1 — …" → tier 1; "## Tier 2 — …" → tier 2; "## Tier 3 — …" → tier 3. If you see "Tier 4", "Tier 5", "Tier 6" as section headers (some files — e.g. extruder — use these as CATEGORY BINS like "Tier 4 — Food & Feed Extruders" rather than market-position rankings), treat the manufacturers in those sections as tier 3 (legacy/specialty) and use the section's domain as an additional equipment_categories tag. If no Tier header is visible at all, infer from prominence: well-known global brand = 1, specialty/regional = 2, legacy/regional small = 3.
- Aliases capture sub-brand and prior-name relationships explicitly: e.g. for "Chemineer / NOV Process", aliases include "NOV Process" and "NOV"; for the parent NOV, aliases include the sub-brands listed under it ("Prochem", "Greerco", "Kenics"). For "SPX FLOW – Lightnin + Philadelphia Mixing Solutions + Plenty", "Lightnin", "Philadelphia Mixing Solutions", "Plenty" are aliases of SPX FLOW. When a sub-brand has its OWN entry in the chunk it stays a separate manufacturer with parent_name set; aliases on the parent only enumerate the sub-brand names for OCR matching.
- parent_name is the canonical parent company name (e.g. "NOV" not "National Oilwell Varco" — but ONLY if the canonical short form appears in the chunk; otherwise use the form given).
- Models must come from the chunk text, not your training data. If a manufacturer is mentioned with no models, return models: [].
- Do not invent model numbers. Return only what the markdown explicitly states.
- Strip parenthetical location data from the manufacturer name field (e.g. "SPX FLOW – Lightnin (Rochester, NY)" → name="SPX FLOW – Lightnin", country derived from "Rochester, NY" if you can infer USA).
- equipment_categories: use single-word singular tags drawn from the file's primary category (caller will pass this in via the user message). Always include the primary category tag as the first element.`

export interface BuildExtractionPromptInput {
  /** Raw markdown chunk to extract from. */
  chunk: string
  /**
   * Source filename, e.g. "industrial-mixer-manufacturers.md". Used for
   * provenance in the prompt and for source_file attribution at insert time.
   */
  sourceFile: string
  /**
   * Primary equipment category derived from sourceFile (e.g. "mixer",
   * "centrifuge", "pump"). Caller computes this; prompt module just
   * surfaces it to the LLM.
   */
  primaryCategory: string
}

export interface ExtractionPromptOutput {
  system: string
  messages: Anthropic.Messages.MessageParam[]
}

/** Build the Anthropic Messages payload for one chunk. */
export function buildExtractionPrompt(input: BuildExtractionPromptInput): ExtractionPromptOutput {
  const userText = [
    `Source file: ${input.sourceFile}`,
    `Primary equipment category (always include in equipment_categories): "${input.primaryCategory}"`,
    "",
    "Extract all manufacturers and models from the markdown below. Output JSON only.",
    "",
    "----- BEGIN MARKDOWN -----",
    input.chunk,
    "----- END MARKDOWN -----",
  ].join("\n")

  return {
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userText }],
      },
    ],
  }
}

/** Filename → primary equipment category tag. Drops "industrial-" prefix and "-manufacturers" suffix. */
export function primaryCategoryFromFilename(filename: string): string {
  const base = filename.replace(/^.*\//, "").replace(/\.md$/i, "")
  let core = base.replace(/^industrial-/, "").replace(/-manufacturers$/, "")
  // "tank-and-pressure-vessel" → "tank" (use first segment as the canonical tag).
  // "conveyor-and-material-handling" → "conveyor".
  // "crusher-and-mill" → "crusher".
  // "heat-exchanger" stays "heat-exchanger" (no "-and-" split).
  if (core.includes("-and-")) {
    core = core.split("-and-")[0]
  }
  return core
}
