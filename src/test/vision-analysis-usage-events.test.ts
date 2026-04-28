/**
 * Cycle 62 — verify the `onUsageEvent` callback contract on
 * `analyzeEquipmentImages`. Mocks the same network deps as the registry
 * integration test and asserts:
 *
 *   1. Anthropic call emits exactly one `vendor: 'anthropic'` event with
 *      `inputTokens` + `outputTokens` from `response.usage`.
 *   2. OCR per-photo emits one `google_vision` event with
 *      `visionFeature: 'document_text_detection'` and `visionUnits: 1`.
 *   3. Web detection emits exactly one `web_detection` event.
 *   4. A throwing callback does not break analysis — analyzer returns normally.
 *   5. Anthropic failure path emits a `success: false` event.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Google Vision (success path) ────────────────────────────────────
vi.mock("@/lib/google-vision", () => ({
  detectNameplateText: vi.fn().mockResolvedValue({
    fullText: "BALDOR 5HP MOTOR",
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
const anthropicCreate = vi.fn().mockImplementation(async () => ({
  content: [
    {
      type: "text",
      text: JSON.stringify({
        equipment_type: { value: "Motor", confidence: 0.9 },
        manufacturer: { value: "BALDOR", confidence: 0.85 },
        model: { value: "L1408T", confidence: 0.8 },
        serial_number: { value: null, confidence: 0 },
        year: { value: null, confidence: 0 },
        condition_estimate: { value: "good", confidence: 0.8 },
        key_specs: { value: {}, confidence: 0.7 },
        taxonomy: {
          tier1: "process_equipment",
          tier2: "motors",
          subcategory: null,
          confidence: 0.9,
        },
        suggested_title: { value: "5HP Motor", confidence: 0.85 },
        suggested_description: "Motor",
        clarifying_questions: [],
        fraud_flags: { is_suspicious: false, reasons: [], confidence: 0.95 },
      }),
    },
  ],
  usage: { input_tokens: 1234, output_tokens: 567 },
}))

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: anthropicCreate }
    constructor(_opts?: unknown) {}
  }
  return {
    default: MockAnthropic,
    Anthropic: MockAnthropic,
  }
})

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key"
  anthropicCreate.mockClear()
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
    headers: { get: () => "image/jpeg" },
  }) as unknown as typeof fetch
})

import { analyzeEquipmentImages } from "@/lib/vision-analysis"
import type { VisionUsageEvent } from "@/lib/vision-analysis"

const FAKE_TAXONOMY = [
  {
    id: "process_equipment",
    label: "Process Equipment",
    groups: [{ id: "motors", label: "Motors", subcategories: [] }],
  },
]

describe("analyzeEquipmentImages — onUsageEvent callback", () => {
  it("emits one anthropic event with token counts and one OCR + one web-detection event", async () => {
    const events: VisionUsageEvent[] = []
    await analyzeEquipmentImages(["https://media.metalgear.com/test.jpg"], {
      taxonomyContext: FAKE_TAXONOMY,
      onUsageEvent: (e) => events.push(e),
    })

    const anthropicEvents = events.filter((e) => e.vendor === "anthropic")
    const ocrEvents = events.filter(
      (e) => e.vendor === "google_vision" && e.visionFeature === "document_text_detection",
    )
    const webEvents = events.filter(
      (e) => e.vendor === "google_vision" && e.visionFeature === "web_detection",
    )

    expect(anthropicEvents).toHaveLength(1)
    expect(anthropicEvents[0].inputTokens).toBe(1234)
    expect(anthropicEvents[0].outputTokens).toBe(567)
    expect(anthropicEvents[0].success).toBe(true)
    expect(anthropicEvents[0].latencyMs).toBeGreaterThanOrEqual(0)

    expect(ocrEvents).toHaveLength(1)
    expect(ocrEvents[0].visionUnits).toBe(1)
    expect(ocrEvents[0].success).toBe(true)

    expect(webEvents).toHaveLength(1)
    expect(webEvents[0].visionUnits).toBe(1)
    expect(webEvents[0].success).toBe(true)
  })

  it("emits one OCR event per photo", async () => {
    const events: VisionUsageEvent[] = []
    await analyzeEquipmentImages(
      [
        "https://media.metalgear.com/a.jpg",
        "https://media.metalgear.com/b.jpg",
        "https://media.metalgear.com/c.jpg",
      ],
      {
        taxonomyContext: FAKE_TAXONOMY,
        onUsageEvent: (e) => events.push(e),
      },
    )
    const ocrEvents = events.filter(
      (e) => e.vendor === "google_vision" && e.visionFeature === "document_text_detection",
    )
    expect(ocrEvents).toHaveLength(3)
  })

  it("a throwing callback does not break analysis", async () => {
    const result = await analyzeEquipmentImages(
      ["https://media.metalgear.com/test.jpg"],
      {
        taxonomyContext: FAKE_TAXONOMY,
        onUsageEvent: () => {
          throw new Error("logger blew up")
        },
      },
    )
    expect(result.identification.manufacturer).toBe("BALDOR")
    expect(result.errors).not.toContain("registry_lookup_failed")
  })

  it("emits a success:false event when Anthropic call fails", async () => {
    anthropicCreate.mockRejectedValueOnce(new Error("rate limited"))
    const events: VisionUsageEvent[] = []
    await analyzeEquipmentImages(
      ["https://media.metalgear.com/test.jpg"],
      {
        taxonomyContext: FAKE_TAXONOMY,
        onUsageEvent: (e) => events.push(e),
      },
    )
    const anthropicEvents = events.filter((e) => e.vendor === "anthropic")
    expect(anthropicEvents).toHaveLength(1)
    expect(anthropicEvents[0].success).toBe(false)
    expect(anthropicEvents[0].errorClass).toBe("Error")
  })

  it("undefined onUsageEvent is a no-op (preserves Cycle 61 behavior)", async () => {
    // Just assert no throw and the result still populates.
    const result = await analyzeEquipmentImages(
      ["https://media.metalgear.com/test.jpg"],
      { taxonomyContext: FAKE_TAXONOMY },
    )
    expect(result.identification.manufacturer).toBe("BALDOR")
  })
})
