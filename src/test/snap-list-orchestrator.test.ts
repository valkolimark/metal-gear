import { describe, it, expect } from "vitest"
import {
  computePriceSuggestion,
  projectAnalysisToDraftFields,
  quickQualityScore,
  topCoachingSuggestions,
} from "@/lib/snap-list/orchestrator"
import type { EquipmentAnalysisResult } from "@/lib/vision-analysis"

function comp(cents: number, condition: string | null = "good") {
  return {
    id: String(Math.random()),
    title: "Unit",
    priceCents: cents,
    condition,
    locationCity: null,
    locationState: null,
    createdAt: new Date().toISOString(),
  }
}

describe("computePriceSuggestion", () => {
  it("returns hasEnoughData=false under 5 comps", () => {
    const out = computePriceSuggestion([comp(1000), comp(2000), comp(3000)], "good")
    expect(out.hasEnoughData).toBe(false)
    expect(out.comparableCount).toBe(3)
    expect(out.median).toBeNull()
  })

  it("returns zero comparableCount when all prices null", () => {
    const out = computePriceSuggestion(
      [
        { ...comp(0), priceCents: null },
        { ...comp(0), priceCents: null },
      ],
      "good",
    )
    expect(out.comparableCount).toBe(0)
    expect(out.hasEnoughData).toBe(false)
  })

  it("computes median + IQR range with ≥5 comps", () => {
    const prices = [1000, 2000, 3000, 4000, 5000, 6000, 7000].map((p) => comp(p))
    const out = computePriceSuggestion(prices, "good")
    expect(out.hasEnoughData).toBe(true)
    expect(out.median).toBe(4000)
    expect(out.comparableCount).toBe(7)
    expect(out.rangeLow).toBeLessThan(out.rangeHigh!)
  })

  it("applies condition multiplier", () => {
    const prices = Array.from({ length: 10 }, (_, i) => comp((i + 1) * 1000))
    const good = computePriceSuggestion(prices, "good")
    const excellent = computePriceSuggestion(prices, "excellent")
    const poor = computePriceSuggestion(prices, "poor")
    expect(excellent.median!).toBeGreaterThan(good.median!)
    expect(poor.median!).toBeLessThan(good.median!)
    expect(excellent.conditionAdjusted).toBe(true)
  })

  it("handles unknown condition by treating as ×1.0", () => {
    const prices = Array.from({ length: 10 }, (_, i) => comp((i + 1) * 1000))
    const out = computePriceSuggestion(prices, "mystery")
    expect(out.conditionAdjusted).toBe(false)
  })
})

describe("projectAnalysisToDraftFields", () => {
  it("maps identification to draft fields", () => {
    const analysis: EquipmentAnalysisResult = {
      identification: {
        manufacturer: "CAT",
        model: "336",
        serialNumber: "XYZ",
        year: 2019,
        equipmentType: "excavator",
        taxonomy: {
          tier1: "machines_equipment",
          tier2: "heavy_equipment_construction",
          subcategory: "excavators",
        },
        suggestedTitle: "2019 Caterpillar 336",
        suggestedDescription: "Well-maintained excavator",
      },
      specs: { horsepower: 310 },
      condition: { tier: "good", notes: null },
      ocr: { fullText: "", blocks: [], hasText: false, sourcePhotoIndex: null },
      fraud: { stockPhotoMatches: [], webPages: [], isSuspicious: false, reasons: [] },
      confidence: {},
      clarifyingQuestions: [],
      stageTimings: {},
      errors: [],
    }
    const fields = projectAnalysisToDraftFields(analysis)
    expect(fields.title).toBe("2019 Caterpillar 336")
    expect(fields.manufacturer).toBe("CAT")
    expect(fields.subcategory).toBe("excavators")
    expect(fields.specs.horsepower).toBe(310)
    expect(fields.priceSuggestion).toBeNull()
  })
})

describe("quickQualityScore", () => {
  it("scales with photo count", () => {
    expect(quickQualityScore(1, false, false)).toBeLessThan(
      quickQualityScore(6, false, false),
    )
  })
  it("caps at 100", () => {
    expect(quickQualityScore(20, true, true)).toBeLessThanOrEqual(100)
  })
})

describe("topCoachingSuggestions", () => {
  it("sorts by priority and limits length", () => {
    const out = topCoachingSuggestions(
      {
        currentQualityScore: 60,
        projectedWithAllSuggestions: 90,
        suggestions: [
          { id: "a", title: "A", description: "", priority: "low", projectedQualityLift: 5 },
          { id: "b", title: "B", description: "", priority: "high", projectedQualityLift: 15 },
          { id: "c", title: "C", description: "", priority: "medium", projectedQualityLift: 10 },
          { id: "d", title: "D", description: "", priority: "high", projectedQualityLift: 10 },
        ],
      },
      3,
    )
    expect(out!.suggestions).toHaveLength(3)
    expect(out!.suggestions[0].priority).toBe("high")
    expect(out!.suggestions[1].priority).toBe("high")
    expect(out!.suggestions[2].priority).toBe("medium")
  })
})
