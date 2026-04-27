/**
 * SOS vision orchestrator (Cycle 60).
 *
 * Pure functions that project `EquipmentAnalysisResult` (from
 * `src/lib/vision-analysis/`) into SOS-shaped suggestions and clarifying
 * questions. No DB access, no domain imports — orchestrator stays portable.
 *
 * INTENTIONALLY HAS NO IMPORTS FROM:
 *   - @/lib/sos/* (would create a cycle)
 *   - @/app/actions/* (orchestrator must not invoke server actions)
 *   - sos_requests / listings / listing_drafts (domain tables stay in actions)
 *
 * Persistence to `sos_requests` happens in `src/app/actions/sos.ts` (or, in
 * Cycle 60, the analyzer route response that the SOS confirm step consumes).
 * This module only suggests.
 */

import type {
  EquipmentAnalysisResult,
  ConditionTier,
} from "@/lib/vision-analysis"

export interface SosFieldSuggestions {
  equipmentType: string | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  condition: ConditionTier | null
  keySpecs: Record<string, string | number>
  /** Mapped tier1/tier2/subcategory bracket IDs from the shared taxonomy. */
  taxonomy: {
    tier1: string | null
    tier2: string | null
    subcategory: string | null
  }
  /** Convenience title — caller may use this to pre-fill the SOS title field. */
  suggestedTitle: string | null
  /** Heuristic suggestion: the detail field on the SOS form. */
  suggestedDescription: string | null
}

/**
 * Project a vision-analysis result into SOS field suggestions.
 *
 * Empty / failed results return all-null suggestions rather than throwing —
 * the SOS confirm step still renders, the user just gets no pre-fill.
 */
export function projectAnalysisToSosFields(
  result: EquipmentAnalysisResult,
): SosFieldSuggestions {
  const id = result?.identification ?? null
  return {
    equipmentType: id?.equipmentType ?? null,
    manufacturer: id?.manufacturer ?? null,
    model: id?.model ?? null,
    serialNumber: id?.serialNumber ?? null,
    condition: result?.condition?.tier ?? null,
    keySpecs: result?.specs ?? {},
    taxonomy: {
      tier1: id?.taxonomy?.tier1 ?? null,
      tier2: id?.taxonomy?.tier2 ?? null,
      subcategory: id?.taxonomy?.subcategory ?? null,
    },
    suggestedTitle: id?.suggestedTitle ?? null,
    suggestedDescription: id?.suggestedDescription ?? null,
  }
}

/**
 * Domain-specific clarifying questions for SOS. Returns 0–3 strings.
 *
 * The vision pipeline already returns generic clarifying questions in
 * `result.clarifyingQuestions` (e.g., "What material?"). SOS layers domain
 * questions on top — buyers asking for parts care about replacement scope,
 * failure mode, and quantity in a way listing creators don't.
 */
export function buildSosClarifyingQuestions(
  result: EquipmentAnalysisResult | null | undefined,
): string[] {
  if (!result || !result.identification) return []

  const id = result.identification
  const hasAnyIdentification =
    !!(id.equipmentType || id.manufacturer || id.model || id.serialNumber)

  // Nothing useful identified — no point asking domain questions.
  if (!hasAnyIdentification) return []

  const questions: string[] = []

  // If we have an equipment-type but no model, ask scope (part vs. whole machine).
  if (id.equipmentType && !id.model) {
    questions.push(
      "Are you looking for a replacement part or the whole machine?",
    )
  }

  // Always-on for SOS — failure mode is the most common gap suppliers ask about.
  questions.push("What's the failure mode or reason you need this?")

  // Quantity — useful when buyers want spares.
  questions.push("How many do you need?")

  return questions.slice(0, 3)
}
