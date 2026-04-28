import { describe, it, expect, vi, beforeEach } from "vitest"

const mockInsert = vi.fn()
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (...args: unknown[]) => mockInsert(...args),
    }),
  }),
}))

beforeEach(() => {
  mockInsert.mockReset()
})

describe("recordAiUsage — never throws", () => {
  it("resolves silently when the DB insert returns an error", async () => {
    mockInsert.mockResolvedValue({ error: { message: "some pg error" } })
    const { recordAiUsage } = await import("@/lib/telemetry/ai-usage")
    await expect(
      recordAiUsage({
        userId: "user-1",
        surface: "ask_metal_gear",
        vendor: "anthropic",
        model: "claude-sonnet-4-20250514",
        inputTokens: 100,
        outputTokens: 50,
      }),
    ).resolves.toBeUndefined()
  })

  it("resolves silently when the DB call throws synchronously", async () => {
    mockInsert.mockImplementation(() => {
      throw new Error("client blew up")
    })
    const { recordAiUsage } = await import("@/lib/telemetry/ai-usage")
    await expect(
      recordAiUsage({
        userId: null,
        surface: "photo_to_listing_analysis",
        vendor: "google_vision",
        visionUnits: 2,
        visionFeature: "document_text_detection",
      }),
    ).resolves.toBeUndefined()
  })

  it("resolves silently when the DB call rejects", async () => {
    mockInsert.mockRejectedValue(new Error("connection reset"))
    const { recordAiUsage } = await import("@/lib/telemetry/ai-usage")
    await expect(
      recordAiUsage({
        userId: "user-2",
        surface: "weekly_brief_cron",
        vendor: "anthropic",
        model: "claude-sonnet-4-20250514",
        inputTokens: 1500,
        outputTokens: 800,
      }),
    ).resolves.toBeUndefined()
  })

  it("derives cost_cents from token counts when costCents is omitted", async () => {
    mockInsert.mockResolvedValue({ error: null })
    const { recordAiUsage } = await import("@/lib/telemetry/ai-usage")
    await recordAiUsage({
      userId: "user-3",
      surface: "ask_metal_gear",
      vendor: "anthropic",
      model: "claude-sonnet-4-20250514",
      inputTokens: 1_000_000,
      outputTokens: 0,
    })
    // 1M input tokens × $3/1M = $3.00 = 300 cents
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0].cost_cents).toBe(300)
  })

  it("uses provided costCents when supplied", async () => {
    mockInsert.mockResolvedValue({ error: null })
    const { recordAiUsage } = await import("@/lib/telemetry/ai-usage")
    await recordAiUsage({
      userId: "user-4",
      surface: "other",
      vendor: "other",
      costCents: 12.5,
    })
    expect(mockInsert.mock.calls[0][0].cost_cents).toBe(12.5)
  })

  it("zero-costs failed calls regardless of vendor", async () => {
    mockInsert.mockResolvedValue({ error: null })
    const { recordAiUsage } = await import("@/lib/telemetry/ai-usage")
    await recordAiUsage({
      userId: "user-5",
      surface: "ask_metal_gear",
      vendor: "anthropic",
      model: "claude-sonnet-4-20250514",
      inputTokens: 100_000,
      outputTokens: 100_000,
      success: false,
      errorClass: "RateLimitError",
    })
    expect(mockInsert.mock.calls[0][0].cost_cents).toBe(0)
    expect(mockInsert.mock.calls[0][0].success).toBe(false)
    expect(mockInsert.mock.calls[0][0].error_class).toBe("RateLimitError")
  })
})

describe("withAiUsageTracking", () => {
  it("captures successful result and re-returns it", async () => {
    mockInsert.mockResolvedValue({ error: null })
    const { withAiUsageTracking } = await import("@/lib/telemetry/ai-usage")
    const result = await withAiUsageTracking(
      {
        userId: "user-1",
        surface: "ask_metal_gear",
        vendor: "anthropic",
        model: "claude-sonnet-4-20250514",
      },
      async () => ({ usage: { input_tokens: 200, output_tokens: 100 }, value: "ok" }),
      (r) => ({
        inputTokens: r.usage.input_tokens,
        outputTokens: r.usage.output_tokens,
      }),
    )
    expect(result.value).toBe("ok")
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0].success).toBe(true)
    expect(mockInsert.mock.calls[0][0].input_tokens).toBe(200)
    expect(mockInsert.mock.calls[0][0].output_tokens).toBe(100)
  })

  it("re-throws the wrapped function's error", async () => {
    mockInsert.mockResolvedValue({ error: null })
    const { withAiUsageTracking } = await import("@/lib/telemetry/ai-usage")
    await expect(
      withAiUsageTracking(
        {
          userId: null,
          surface: "ai_search",
          vendor: "anthropic",
          model: "claude-sonnet-4-20250514",
        },
        async () => {
          throw new Error("boom")
        },
      ),
    ).rejects.toThrow("boom")
    // still logs as a failed call
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0].success).toBe(false)
    expect(mockInsert.mock.calls[0][0].error_class).toBe("Error")
  })

  it("survives a logger crash without affecting the wrapped call", async () => {
    mockInsert.mockImplementation(() => {
      throw new Error("logger ledger down")
    })
    const { withAiUsageTracking } = await import("@/lib/telemetry/ai-usage")
    const result = await withAiUsageTracking(
      {
        userId: "user-1",
        surface: "ask_metal_gear",
        vendor: "anthropic",
      },
      async () => "kept-going",
    )
    expect(result).toBe("kept-going")
  })

  it("survives an extractor that throws", async () => {
    mockInsert.mockResolvedValue({ error: null })
    const { withAiUsageTracking } = await import("@/lib/telemetry/ai-usage")
    const result = await withAiUsageTracking(
      {
        userId: "user-1",
        surface: "ask_metal_gear",
        vendor: "anthropic",
      },
      async () => ({ value: "fine" }),
      () => {
        throw new Error("extractor blew up")
      },
    )
    expect(result.value).toBe("fine")
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0].success).toBe(true)
    // tokens absent because the extractor never returned
    expect(mockInsert.mock.calls[0][0].input_tokens).toBe(null)
  })
})
