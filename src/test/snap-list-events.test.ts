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

describe("logSnapListEvent — never throws", () => {
  it("resolves silently when the DB insert returns an error", async () => {
    mockInsert.mockResolvedValue({ error: { message: "some pg error" } })
    const { logSnapListEvent } = await import("@/lib/snap-list/events")
    await expect(
      logSnapListEvent({
        type: "draft_created",
        draftId: "00000000-0000-0000-0000-000000000000",
        ownerId: "owner-1",
      }),
    ).resolves.toBeUndefined()
  })

  it("resolves silently when the DB call throws synchronously", async () => {
    mockInsert.mockImplementation(() => {
      throw new Error("client blew up")
    })
    const { logSnapListEvent } = await import("@/lib/snap-list/events")
    await expect(
      logSnapListEvent({
        type: "analysis_failed",
        draftId: null,
        ownerId: "owner-1",
        payload: { stage: "ocr" },
      }),
    ).resolves.toBeUndefined()
  })

  it("resolves silently when the DB call rejects", async () => {
    mockInsert.mockRejectedValue(new Error("connection reset"))
    const { logSnapListEvent } = await import("@/lib/snap-list/events")
    await expect(
      logSnapListEvent({
        type: "field_edited",
        draftId: "00000000-0000-0000-0000-000000000000",
        ownerId: "owner-1",
        payload: { field_name: "manufacturer" },
      }),
    ).resolves.toBeUndefined()
  })
})

describe("logStageCompleted", () => {
  it("delegates to logSnapListEvent and does not throw on failure", async () => {
    mockInsert.mockRejectedValue(new Error("nope"))
    const { logStageCompleted } = await import("@/lib/snap-list/events")
    await expect(
      logStageCompleted("d1", "owner-1", "ocr", 123),
    ).resolves.toBeUndefined()
  })
})
