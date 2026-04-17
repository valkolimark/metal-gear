import { describe, it, expect } from "vitest"
import {
  computeFieldConfidence,
  hasLowConfidenceCriticals,
} from "@/lib/vision-analysis/confidence"
import {
  extractFieldsFromOCR,
  mergeOCRWithVisual,
} from "@/lib/vision-analysis/merge"
import {
  buildEquipmentIdentificationPrompt,
  buildTaxonomyReference,
} from "@/lib/vision-analysis/prompts"
import type { TaxonomyTree } from "@/lib/vision-analysis/types"

const fakeTaxonomy: TaxonomyTree = [
  {
    id: "machines_equipment",
    label: "Machines & Equipment",
    groups: [
      {
        id: "heavy_equipment_construction",
        label: "Heavy Equipment & Construction",
        subcategories: [{ id: "excavators", label: "Excavators" }],
      },
    ],
  },
]

describe("computeFieldConfidence", () => {
  it("maps OCR sources into 0.85–1.0 range", () => {
    expect(computeFieldConfidence({ source: "ocr", rawConfidence: 0 })).toBe(0.85)
    expect(computeFieldConfidence({ source: "ocr", rawConfidence: 1 })).toBeCloseTo(1.0, 5)
  })
  it("maps Claude+OCR grounded into 0.75–0.95 range", () => {
    expect(computeFieldConfidence({ source: "claude_with_ocr", rawConfidence: 0 })).toBe(0.75)
    expect(computeFieldConfidence({ source: "claude_with_ocr", rawConfidence: 1 })).toBeCloseTo(0.95, 5)
  })
  it("maps Claude visual-only into 0.4–0.8 range", () => {
    expect(computeFieldConfidence({ source: "claude_visual_only", rawConfidence: 0 })).toBe(0.4)
    expect(computeFieldConfidence({ source: "claude_visual_only", rawConfidence: 1 })).toBeCloseTo(0.8, 5)
  })
  it("handles merged (OCR + Claude agree) with a floor of 0.9", () => {
    expect(computeFieldConfidence({ source: "merged", rawConfidence: 0 })).toBe(0.9)
    expect(computeFieldConfidence({ source: "merged", rawConfidence: 1 })).toBeCloseTo(1.0, 5)
  })
})

describe("hasLowConfidenceCriticals", () => {
  it("flags fields below threshold", () => {
    const result = hasLowConfidenceCriticals({
      manufacturer: 0.4,
      model: 0.9,
      equipment_type: 0.3,
      taxonomy: 0.8,
      condition_estimate: 0.6,
    })
    expect(result).toContain("manufacturer")
    expect(result).toContain("equipment_type")
    expect(result).not.toContain("model")
  })
})

describe("extractFieldsFromOCR", () => {
  it("pulls year from standalone 4-digit tokens", () => {
    const out = extractFieldsFromOCR([], "MADE IN 2018 CATERPILLAR")
    expect(out.year?.value).toBe(2018)
  })
  it("pulls serial with SERIAL prefix", () => {
    const out = extractFieldsFromOCR([], "SERIAL: ABC-123XYZ")
    expect(out.serialNumber?.value).toBe("ABC-123XYZ")
  })
  it("pulls model with MODEL NO prefix", () => {
    const out = extractFieldsFromOCR([], "MODEL NO 336-GC")
    expect(out.model?.value).toBe("336-GC")
  })
  it("returns empty when no signal is present", () => {
    const out = extractFieldsFromOCR([], "RANDOM TEXT WITHOUT MARKERS")
    expect(out.year).toBeUndefined()
    expect(out.serialNumber).toBeUndefined()
  })
})

describe("mergeOCRWithVisual", () => {
  it("OCR wins on nameplate fields when OCR confidence > 0.85", () => {
    const merged = mergeOCRWithVisual(
      {
        manufacturer: { value: "WRONGCO", confidence: 0.7 },
      },
      {
        manufacturer: { value: "CATERPILLAR", confidence: 0.9 },
      },
      true,
    )
    expect(merged.identification.manufacturer).toBe("CATERPILLAR")
    expect(merged.confidence.manufacturer).toBeGreaterThan(0.85)
  })

  it("Claude wins when OCR confidence is low", () => {
    const merged = mergeOCRWithVisual(
      {
        manufacturer: { value: "CATERPILLAR", confidence: 0.9 },
      },
      {
        manufacturer: { value: "SCRATCHED", confidence: 0.4 },
      },
      true,
    )
    expect(merged.identification.manufacturer).toBe("CATERPILLAR")
  })

  it("treats Claude-only output as visual-only when OCR is unavailable", () => {
    const merged = mergeOCRWithVisual(
      {
        manufacturer: { value: "JOHN DEERE", confidence: 1.0 },
      },
      {},
      false,
    )
    expect(merged.identification.manufacturer).toBe("JOHN DEERE")
    // Visual-only confidence caps at 0.8
    expect(merged.confidence.manufacturer).toBeLessThanOrEqual(0.8)
  })

  it("falls back to null when neither source provides a value", () => {
    const merged = mergeOCRWithVisual({}, {}, false)
    expect(merged.identification.manufacturer).toBeNull()
    expect(merged.confidence.manufacturer).toBe(0)
  })

  it("passes clarifying questions through unchanged", () => {
    const merged = mergeOCRWithVisual(
      {
        clarifying_questions: [
          { field: "materials", question: "What material?", options: [{ value: "cs", label: "Carbon steel" }] },
        ],
      },
      {},
      false,
    )
    expect(merged.clarifyingQuestions).toHaveLength(1)
    expect(merged.clarifyingQuestions[0].field).toBe("materials")
  })
})

describe("buildEquipmentIdentificationPrompt", () => {
  it("includes per-photo OCR blocks and labels each photo", () => {
    const out = buildEquipmentIdentificationPrompt({
      photoCount: 2,
      perPhotoOcr: [
        { photoIndex: 0, text: "" },
        { photoIndex: 1, text: "CATERPILLAR MODEL 336" },
      ],
      nameplateHintPhotoIndex: 1,
      taxonomy: fakeTaxonomy,
    })
    expect(out).toContain("PER-PHOTO OCR")
    expect(out).toContain("--- Photo 2 ---")
    expect(out).toContain("CATERPILLAR MODEL 336")
  })

  it("warns about multi-nameplate disambiguation when more than one photo has OCR text", () => {
    const out = buildEquipmentIdentificationPrompt({
      photoCount: 3,
      perPhotoOcr: [
        { photoIndex: 0, text: "AMETEK CENTRIFUGE SPEED 1530 RPM" },
        { photoIndex: 1, text: "BALDOR MOTOR 10 HP 1760 RPM CLASS I" },
        { photoIndex: 2, text: "" },
      ],
      nameplateHintPhotoIndex: 1,
      taxonomy: fakeTaxonomy,
    })
    expect(out).toMatch(/MULTIPLE nameplates/i)
    expect(out).toContain("BALDOR")
    expect(out).toContain("AMETEK")
  })

  it("notes when OCR is empty across all photos", () => {
    const out = buildEquipmentIdentificationPrompt({
      photoCount: 1,
      perPhotoOcr: [{ photoIndex: 0, text: "" }],
      nameplateHintPhotoIndex: null,
      taxonomy: fakeTaxonomy,
    })
    expect(out).toContain("No OCR text was detected")
  })

  it("always includes taxonomy bracket IDs", () => {
    const out = buildEquipmentIdentificationPrompt({
      photoCount: 1,
      perPhotoOcr: [],
      nameplateHintPhotoIndex: null,
      taxonomy: fakeTaxonomy,
    })
    expect(out).toContain("[machines_equipment]")
    expect(out).toContain("[excavators]")
  })
})

describe("buildTaxonomyReference", () => {
  it("renders bracketed IDs", () => {
    const out = buildTaxonomyReference(fakeTaxonomy)
    expect(out).toContain("[machines_equipment]")
    expect(out).toContain("[heavy_equipment_construction]")
    expect(out).toContain("[excavators]")
  })
})
