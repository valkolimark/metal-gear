import { describe, it, expect } from "vitest"
import {
  projectAnalysisToSosFields,
  buildSosClarifyingQuestions,
} from "@/lib/sos/vision-orchestrator"
import type { EquipmentAnalysisResult } from "@/lib/vision-analysis"

function makeResult(
  overrides: Partial<EquipmentAnalysisResult> = {},
): EquipmentAnalysisResult {
  return {
    identification: {
      manufacturer: null,
      model: null,
      serialNumber: null,
      year: null,
      equipmentType: null,
      taxonomy: { tier1: null, tier2: null, subcategory: null },
      suggestedTitle: null,
      suggestedDescription: null,
    },
    specs: {},
    condition: { tier: null, notes: null },
    ocr: { fullText: "", blocks: [], hasText: false, sourcePhotoIndex: null },
    fraud: { stockPhotoMatches: [], webPages: [], isSuspicious: false, reasons: [] },
    confidence: {},
    clarifyingQuestions: [],
    stageTimings: {},
    errors: [],
    ...overrides,
  }
}

describe("projectAnalysisToSosFields", () => {
  it("maps a full result into SOS field suggestions", () => {
    const result = makeResult({
      identification: {
        manufacturer: "CATERPILLAR",
        model: "336-GC",
        serialNumber: "ABC123",
        year: 2018,
        equipmentType: "Excavator",
        taxonomy: {
          tier1: "machines_equipment",
          tier2: "heavy_equipment_construction",
          subcategory: "excavators",
        },
        suggestedTitle: "2018 Caterpillar 336-GC Excavator",
        suggestedDescription: "Hydraulic excavator in working condition.",
      },
      specs: { weight_lbs: 80000, hours: 4200 },
      condition: { tier: "good", notes: null },
    })

    const out = projectAnalysisToSosFields(result)

    expect(out.equipmentType).toBe("Excavator")
    expect(out.manufacturer).toBe("CATERPILLAR")
    expect(out.model).toBe("336-GC")
    expect(out.serialNumber).toBe("ABC123")
    expect(out.condition).toBe("good")
    expect(out.keySpecs).toEqual({ weight_lbs: 80000, hours: 4200 })
    expect(out.taxonomy.tier1).toBe("machines_equipment")
    expect(out.taxonomy.subcategory).toBe("excavators")
    expect(out.suggestedTitle).toBe("2018 Caterpillar 336-GC Excavator")
    expect(out.suggestedDescription).toContain("Hydraulic")
  })

  it("returns null fields for a partial / low-confidence result", () => {
    const result = makeResult({
      identification: {
        manufacturer: "CATERPILLAR",
        model: null,
        serialNumber: null,
        year: null,
        equipmentType: "Excavator",
        taxonomy: { tier1: null, tier2: null, subcategory: null },
        suggestedTitle: null,
        suggestedDescription: null,
      },
    })

    const out = projectAnalysisToSosFields(result)

    expect(out.manufacturer).toBe("CATERPILLAR")
    expect(out.equipmentType).toBe("Excavator")
    expect(out.model).toBeNull()
    expect(out.serialNumber).toBeNull()
    expect(out.condition).toBeNull()
    expect(out.taxonomy.tier1).toBeNull()
    expect(out.suggestedTitle).toBeNull()
  })

  it("handles an empty result without throwing", () => {
    const out = projectAnalysisToSosFields(makeResult())

    expect(out.equipmentType).toBeNull()
    expect(out.manufacturer).toBeNull()
    expect(out.condition).toBeNull()
    expect(out.keySpecs).toEqual({})
    expect(out.taxonomy.tier1).toBeNull()
  })
})

describe("buildSosClarifyingQuestions", () => {
  it("returns 0–3 questions for a full result", () => {
    const result = makeResult({
      identification: {
        manufacturer: "CATERPILLAR",
        model: "336-GC",
        serialNumber: "ABC123",
        year: 2018,
        equipmentType: "Excavator",
        taxonomy: { tier1: null, tier2: null, subcategory: null },
        suggestedTitle: null,
        suggestedDescription: null,
      },
    })

    const questions = buildSosClarifyingQuestions(result)
    expect(questions.length).toBeGreaterThanOrEqual(0)
    expect(questions.length).toBeLessThanOrEqual(3)
  })

  it("adds the part-vs-whole question when equipmentType is known but model is missing", () => {
    const result = makeResult({
      identification: {
        manufacturer: null,
        model: null,
        serialNumber: null,
        year: null,
        equipmentType: "Centrifuge",
        taxonomy: { tier1: null, tier2: null, subcategory: null },
        suggestedTitle: null,
        suggestedDescription: null,
      },
    })

    const questions = buildSosClarifyingQuestions(result)
    expect(questions.some((q) => /replacement part|whole machine/i.test(q))).toBe(true)
  })

  it("never throws on null or empty input", () => {
    expect(() => buildSosClarifyingQuestions(null)).not.toThrow()
    expect(() => buildSosClarifyingQuestions(undefined)).not.toThrow()
    expect(buildSosClarifyingQuestions(null)).toEqual([])
    expect(buildSosClarifyingQuestions(makeResult())).toEqual([])
  })
})
