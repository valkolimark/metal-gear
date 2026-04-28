/**
 * Cycle 61b — verify the registryLookup callback contract end-to-end through
 * `analyzeEquipmentImages`. Mocks the network deps (Google Vision + Anthropic
 * SDK + the analyzer's image fetcher) so the assertions focus on:
 *
 *   1. When `options.registryLookup` is undefined, behavior is unchanged from
 *      Cycle 60 — no override, `result.registryMatch` is null/undefined.
 *   2. When the callback returns a high-confidence match, the analyzer
 *      overrides `identification.manufacturer` with the canonical name and
 *      attaches `result.registryMatch` with the FK pair.
 *   3. When the callback returns null, `identification.manufacturer` is left
 *      as Claude returned it and `result.registryMatch` is null.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Google Vision ──────────────────────────────────────────────────
vi.mock("@/lib/google-vision", () => ({
  detectNameplateText: vi.fn().mockResolvedValue({
    fullText: "BALDOR 5HP MOTOR L1408T 1750 RPM",
    blocks: [],
    hasText: true,
  }),
  detectWebMatches: vi.fn().mockResolvedValue({
    fullMatchingImages: [],
    partialMatchingImages: [],
    pagesWithMatchingImages: [],
  }),
}))

// ─── Mock Anthropic SDK ──────────────────────────────────────────────────
const claudeReply = {
  equipment_type: { value: "Centrifuge", confidence: 0.92 },
  manufacturer: { value: "BALDOR", confidence: 0.6 },
  model: { value: "L1408T", confidence: 0.7 },
  serial_number: { value: null, confidence: 0 },
  year: { value: null, confidence: 0 },
  condition_estimate: { value: "good", confidence: 0.8 },
  key_specs: { value: { hp: 5 }, confidence: 0.9 },
  taxonomy: { tier1: "process_equipment", tier2: "centrifuges", subcategory: null, confidence: 0.9 },
  suggested_title: { value: "5HP Centrifuge", confidence: 0.85 },
  suggested_description: "5 HP unit",
  clarifying_questions: [],
  fraud_flags: { is_suspicious: false, reasons: [], confidence: 0.95 },
}

vi.mock("@anthropic-ai/sdk", () => {
  const create = vi.fn().mockImplementation(async () => ({
    content: [{ type: "text", text: JSON.stringify(claudeReply) }],
  }))
  class MockAnthropic {
    messages = { create }
    constructor(_opts?: unknown) {}
  }
  return {
    default: MockAnthropic,
    Anthropic: MockAnthropic,
  }
})

// Stub the in-module image fetcher by intercepting global fetch.
beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
    headers: { get: () => "image/jpeg" },
  }) as unknown as typeof fetch
})

import { analyzeEquipmentImages } from "@/lib/vision-analysis"

const FAKE_TAXONOMY = [
  {
    id: "process_equipment",
    label: "Process Equipment",
    groups: [
      { id: "centrifuges", label: "Centrifuges", subcategories: [] },
    ],
  },
]

describe("analyzeEquipmentImages — registryLookup callback contract", () => {
  it("default (no callback) — registryMatch is falsy, manufacturer unchanged", async () => {
    const result = await analyzeEquipmentImages(["https://example.com/photo.jpg"], {
      taxonomyContext: FAKE_TAXONOMY,
      anthropicApiKey: "test-key",
    })
    expect(result.registryMatch ?? null).toBeNull()
    expect(result.identification.manufacturer).toBe("BALDOR")
  })

  it("high-confidence callback — overrides manufacturer with canonical name and attaches FK", async () => {
    const result = await analyzeEquipmentImages(["https://example.com/photo.jpg"], {
      taxonomyContext: FAKE_TAXONOMY,
      anthropicApiKey: "test-key",
      registryLookup: async () => ({
        manufacturerId: "uuid-sharples",
        manufacturerName: "Sharples",
        manufacturerModelId: "uuid-p3000",
        manufacturerModelName: "P3000",
        confidence: 0.95,
        method: "exact",
      }),
    })
    expect(result.identification.manufacturer).toBe("Sharples")
    expect(result.identification.model).toBe("P3000")
    expect(result.registryMatch).toEqual({
      manufacturerId: "uuid-sharples",
      manufacturerModelId: "uuid-p3000",
      confidence: 0.95,
      method: "exact",
    })
  })

  it("low-confidence callback — keeps Claude manufacturer but still attaches summary", async () => {
    const result = await analyzeEquipmentImages(["https://example.com/photo.jpg"], {
      taxonomyContext: FAKE_TAXONOMY,
      anthropicApiKey: "test-key",
      registryLookup: async () => ({
        manufacturerId: "uuid-maybe",
        manufacturerName: "Maybe Co",
        manufacturerModelId: null,
        manufacturerModelName: null,
        confidence: 0.72,
        method: "fuzzy",
      }),
    })
    // Below the 0.90 override threshold — original manufacturer preserved.
    expect(result.identification.manufacturer).toBe("BALDOR")
    expect(result.registryMatch?.manufacturerId).toBe("uuid-maybe")
    expect(result.registryMatch?.confidence).toBeCloseTo(0.72)
  })

  it("null callback result — registryMatch is null, manufacturer unchanged", async () => {
    const result = await analyzeEquipmentImages(["https://example.com/photo.jpg"], {
      taxonomyContext: FAKE_TAXONOMY,
      anthropicApiKey: "test-key",
      registryLookup: async () => null,
    })
    expect(result.registryMatch).toBeNull()
    expect(result.identification.manufacturer).toBe("BALDOR")
  })

  it("callback throwing — analyzer survives, errors[] records the failure", async () => {
    const result = await analyzeEquipmentImages(["https://example.com/photo.jpg"], {
      taxonomyContext: FAKE_TAXONOMY,
      anthropicApiKey: "test-key",
      registryLookup: async () => {
        throw new Error("registry boom")
      },
    })
    expect(result.identification.manufacturer).toBe("BALDOR")
    expect(result.errors).toContain("registry_lookup_failed")
  })

  it("callback receives the equipment type and Claude model from the analysis", async () => {
    const spy = vi.fn().mockResolvedValue(null)
    await analyzeEquipmentImages(["https://example.com/photo.jpg"], {
      taxonomyContext: FAKE_TAXONOMY,
      anthropicApiKey: "test-key",
      registryLookup: spy,
    })
    expect(spy).toHaveBeenCalledTimes(1)
    const arg = spy.mock.calls[0][0]
    expect(arg.equipmentType).toBe("Centrifuge")
    expect(arg.model).toBe("L1408T")
    expect(Array.isArray(arg.candidates)).toBe(true)
    expect(arg.candidates.length).toBeGreaterThan(0)
  })
})
