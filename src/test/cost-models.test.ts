import { describe, it, expect } from "vitest"
import {
  classifyAnthropicModel,
  estimateAnthropicCostCents,
  estimateGoogleVisionCostCents,
} from "@/lib/telemetry/cost-models"

describe("classifyAnthropicModel", () => {
  it("maps dated Sonnet 4 model strings", () => {
    expect(classifyAnthropicModel("claude-sonnet-4-20250514")).toBe(
      "claude-sonnet-4",
    )
  })
  it("maps short Sonnet form", () => {
    expect(classifyAnthropicModel("sonnet-4")).toBe("claude-sonnet-4")
  })
  it("maps Opus", () => {
    expect(classifyAnthropicModel("claude-opus-4-7-20251015")).toBe(
      "claude-opus-4",
    )
  })
  it("maps Haiku", () => {
    expect(classifyAnthropicModel("claude-haiku-4-5-20251001")).toBe(
      "claude-haiku-4-5",
    )
  })
  it("falls back to unknown on null/empty", () => {
    expect(classifyAnthropicModel(null)).toBe("unknown")
    expect(classifyAnthropicModel("")).toBe("unknown")
    expect(classifyAnthropicModel("gpt-4")).toBe("unknown")
  })
})

describe("estimateAnthropicCostCents", () => {
  it("Sonnet 4: 1M input tokens = 300 cents (= $3)", () => {
    expect(
      estimateAnthropicCostCents("claude-sonnet-4-20250514", 1_000_000, 0),
    ).toBe(300)
  })
  it("Sonnet 4: 1M output tokens = 1500 cents (= $15)", () => {
    expect(
      estimateAnthropicCostCents("claude-sonnet-4-20250514", 0, 1_000_000),
    ).toBe(1500)
  })
  it("Sonnet 4: 200 in + 100 out = 0.21 cents (rounded to 0.21)", () => {
    // (200/1M)*$3 + (100/1M)*$15 = $0.0006 + $0.0015 = $0.0021 = 0.21¢
    expect(
      estimateAnthropicCostCents("claude-sonnet-4-20250514", 200, 100),
    ).toBeCloseTo(0.21, 4)
  })
  it("Opus 4: 1M input = 1500 cents (= $15)", () => {
    expect(estimateAnthropicCostCents("claude-opus-4", 1_000_000, 0)).toBe(1500)
  })
  it("Haiku: 1M input = 100 cents (= $1)", () => {
    expect(estimateAnthropicCostCents("claude-haiku-4-5", 1_000_000, 0)).toBe(
      100,
    )
  })
  it("Unknown model returns 0 cents (no over-estimate)", () => {
    expect(estimateAnthropicCostCents("gpt-4", 1_000_000, 1_000_000)).toBe(0)
  })
  it("Null token counts return 0", () => {
    expect(
      estimateAnthropicCostCents("claude-sonnet-4-20250514", null, null),
    ).toBe(0)
  })
})

describe("estimateGoogleVisionCostCents", () => {
  it("DOCUMENT_TEXT_DETECTION: 1000 units = 150 cents (= $1.50)", () => {
    expect(estimateGoogleVisionCostCents("document_text_detection", 1000)).toBe(
      150,
    )
  })
  it("DOCUMENT_TEXT_DETECTION: 1 unit = 0.15 cents", () => {
    expect(estimateGoogleVisionCostCents("document_text_detection", 1)).toBeCloseTo(
      0.15,
      4,
    )
  })
  it("WEB_DETECTION: 1000 units = 350 cents", () => {
    expect(estimateGoogleVisionCostCents("web_detection", 1000)).toBe(350)
  })
  it("WEB_DETECTION: 1 unit = 0.35 cents", () => {
    expect(estimateGoogleVisionCostCents("web_detection", 1)).toBeCloseTo(0.35, 4)
  })
  it("Unknown feature returns 0", () => {
    expect(estimateGoogleVisionCostCents("unknown", 100)).toBe(0)
  })
  it("Null units returns 0", () => {
    expect(estimateGoogleVisionCostCents("document_text_detection", null)).toBe(0)
  })
})
