/**
 * Confidence scoring.
 *
 * Produces a 0.0–1.0 value per field based on the source of evidence:
 *   - OCR-sourced:                    0.85–1.00
 *   - Claude-sourced w/ OCR grounding: 0.75–0.95
 *   - Claude-sourced visual-only:     0.40–0.80
 *
 * Pure functions — no I/O.
 */

export type ConfidenceSource =
  | "ocr"
  | "claude_with_ocr"
  | "claude_visual_only"
  | "merged"
  | "unknown"

export interface FieldEvidence {
  /** Where the final value came from. */
  source: ConfidenceSource
  /** Raw confidence emitted by the source (Claude JSON or Google OCR block). */
  rawConfidence?: number
}

/** Clamp n into [min, max]. */
function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}

/**
 * Compute the final 0.0–1.0 confidence for one field given its source and
 * the raw confidence reported by that source.
 */
export function computeFieldConfidence(evidence: FieldEvidence): number {
  const raw = typeof evidence.rawConfidence === "number" ? evidence.rawConfidence : 0.5

  switch (evidence.source) {
    case "ocr":
      // Google Vision block confidence is usually 0.7–1.0 when text is clean.
      // Trust it: map [0, 1] → [0.85, 1.0].
      return clamp(0.85 + raw * 0.15, 0.85, 1.0)

    case "claude_with_ocr":
      // Claude had OCR text to ground on. Map [0, 1] → [0.75, 0.95].
      return clamp(0.75 + raw * 0.2, 0.75, 0.95)

    case "claude_visual_only":
      // No OCR — Claude guessed from pixels. Map [0, 1] → [0.4, 0.8].
      return clamp(0.4 + raw * 0.4, 0.4, 0.8)

    case "merged":
      // OCR + Claude both agree — strongest possible signal.
      return clamp(0.9 + raw * 0.1, 0.9, 1.0)

    case "unknown":
    default:
      return clamp(raw, 0.0, 1.0)
  }
}

/** Fields we consider "critical" for the listing quality gate. */
export const CRITICAL_FIELDS = [
  "manufacturer",
  "model",
  "equipment_type",
  "taxonomy",
  "condition_estimate",
] as const

export function hasLowConfidenceCriticals(
  confidence: Record<string, number>,
  threshold = 0.55,
): string[] {
  return CRITICAL_FIELDS.filter((f) => (confidence[f] ?? 0) < threshold)
}
