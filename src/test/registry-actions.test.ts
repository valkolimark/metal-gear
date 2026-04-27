import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
const mockAdminFrom = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => mockAdminFrom(table),
  })),
}))

const {
  searchManufacturers,
  getManufacturerById,
  searchModels,
  recordRegistryFeedback,
} = await import("@/app/actions/registry")

const SAMPLE_ROW = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  slug: "sharples",
  name: "Sharples",
  aliases: ["Pennwalt Sharples"],
  country: null,
  tier: 1,
  equipment_categories: ["centrifuge", "decanter"],
  parent_manufacturer_id: null,
  source_file: "industrial-centrifuge-manufacturers.md",
  notes: null,
}

const SAMPLE_MODEL_ROW = {
  id: "7c5e1a98-3a52-49b5-8d27-9f8b3c4e7a11",
  manufacturer_id: SAMPLE_ROW.id,
  slug: "p-3000",
  name: "P-3000",
  series: null,
  equipment_type: "decanter",
  notes: null,
  source_file: "industrial-centrifuge-manufacturers.md",
}

describe("registry server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("searchManufacturers", () => {
    it("returns [] for unauthenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const out = await searchManufacturers({ query: "Sharples" })
      expect(out).toEqual([])
    })

    it("rejects empty query (Zod min:1)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      const out = await searchManufacturers({ query: "" })
      expect(out).toEqual([])
    })

    it("rejects oversized query (Zod max:200)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      const out = await searchManufacturers({ query: "x".repeat(201) })
      expect(out).toEqual([])
    })

    it("returns mapped manufacturers on hit", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      mockAdminFrom.mockReturnValue(chainableBuilder([SAMPLE_ROW]))
      const out = await searchManufacturers({ query: "Sharples" })
      expect(out).toHaveLength(1)
      expect(out[0].name).toBe("Sharples")
      expect(out[0].slug).toBe("sharples")
      expect(out[0].tier).toBe(1)
      expect(out[0].equipmentCategories).toEqual(["centrifuge", "decanter"])
      expect(out[0].aliases).toEqual(["Pennwalt Sharples"])
    })

    it("equipmentType boost: matching category sorts first", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      const a = { ...SAMPLE_ROW, id: "a", slug: "alfa-laval", name: "Alfa Laval", equipment_categories: ["centrifuge"] }
      const b = { ...SAMPLE_ROW, id: "b", slug: "abb", name: "ABB", equipment_categories: ["motor"] }
      mockAdminFrom.mockReturnValue(chainableBuilder([b, a])) // b returned first by DB
      const out = await searchManufacturers({ query: "ab", equipmentType: "centrifuge" })
      expect(out[0].name).toBe("Alfa Laval") // boosted ahead despite DB ordering
    })
  })

  describe("getManufacturerById", () => {
    it("returns null for unauthenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const out = await getManufacturerById("550e8400-e29b-41d4-a716-446655440000")
      expect(out).toBeNull()
    })

    it("returns null for non-uuid", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      const out = await getManufacturerById("not-a-uuid")
      expect(out).toBeNull()
    })

    it("returns mapped row for valid id", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      mockAdminFrom.mockReturnValue(chainableBuilder(SAMPLE_ROW))
      const out = await getManufacturerById(SAMPLE_ROW.id)
      expect(out?.name).toBe("Sharples")
    })
  })

  describe("searchModels", () => {
    it("returns [] for unauthenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const out = await searchModels({ manufacturerId: SAMPLE_ROW.id })
      expect(out).toEqual([])
    })

    it("rejects bad uuid", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      const out = await searchModels({ manufacturerId: "not-a-uuid" })
      expect(out).toEqual([])
    })

    it("returns mapped models on hit", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      mockAdminFrom.mockReturnValue(chainableBuilder([SAMPLE_MODEL_ROW]))
      const out = await searchModels({ manufacturerId: SAMPLE_ROW.id, query: "P-3" })
      expect(out).toHaveLength(1)
      expect(out[0].name).toBe("P-3000")
    })
  })

  describe("recordRegistryFeedback", () => {
    it("rejects unauthenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const out = await recordRegistryFeedback({
        sourceTable: "listings",
        sourceRowId: "550e8400-e29b-41d4-a716-446655440000",
        userAction: "accepted",
      })
      expect(out.success).toBe(false)
      expect(out.error).toMatch(/auth/i)
    })

    it("rejects invalid input shape", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      const out = await recordRegistryFeedback({
        sourceTable: "listings",
        sourceRowId: "not-a-uuid", // intentionally not a UUID — Zod must reject
        userAction: "accepted",
      })
      expect(out.success).toBe(false)
    })

    it("rejects when ownership check fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      // First call: ownership check returns wrong user.
      mockAdminFrom.mockReturnValue(chainableBuilder({ seller_id: "different-user" }))
      const out = await recordRegistryFeedback({
        sourceTable: "listings",
        sourceRowId: "550e8400-e29b-41d4-a716-446655440000",
        userAction: "accepted",
      })
      expect(out.success).toBe(false)
      expect(out.error).toMatch(/authorized/i)
    })

    it("succeeds for owner", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      let callCount = 0
      mockAdminFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) return chainableBuilder({ seller_id: "u1" })
        // Second call: insert success.
        const builder = chainableBuilder()
        builder.insert = vi.fn().mockResolvedValue({ error: null })
        return builder
      })
      const out = await recordRegistryFeedback({
        sourceTable: "listings",
        sourceRowId: "550e8400-e29b-41d4-a716-446655440000",
        userAction: "accepted",
        suggestedManufacturerId: "8a4f9201-6e3b-4c9a-9e16-2b7c5d8e9f01",
      })
      expect(out.success).toBe(true)
    })

    it("rejects ownership for SOS request not owned by user", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
      mockAdminFrom.mockReturnValue(chainableBuilder({ requester_id: "other-user" }))
      const out = await recordRegistryFeedback({
        sourceTable: "sos_requests",
        sourceRowId: "550e8400-e29b-41d4-a716-446655440000",
        userAction: "rejected",
      })
      expect(out.success).toBe(false)
      expect(out.error).toMatch(/authorized/i)
    })
  })
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainableBuilder(data: unknown = null, error: unknown = null): any {
  const obj: Record<string, unknown> = {}
  const chainMethods = ["select", "insert", "update", "delete", "eq", "in", "or", "gte", "lte", "order", "limit", "ilike", "is", "not"]
  for (const m of chainMethods) {
    obj[m] = vi.fn().mockReturnValue(obj)
  }
  obj.single = vi.fn().mockResolvedValue({ data, error })
  obj.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  const result = { data: Array.isArray(data) ? data : [], error }
  obj.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return obj
}
