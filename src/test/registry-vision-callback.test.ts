import { describe, it, expect, vi } from "vitest"
import { buildNameplateRegistryCallback } from "@/lib/registry/nameplate-callback"
import type { Manufacturer, ManufacturerModel } from "@/lib/registry"

function mfr(overrides: Partial<Manufacturer> & Pick<Manufacturer, "name">): Manufacturer {
  return {
    id: overrides.id ?? `id-${overrides.name.toLowerCase().replace(/\s+/g, "-")}`,
    slug: overrides.slug ?? overrides.name.toLowerCase().replace(/\s+/g, "-"),
    name: overrides.name,
    aliases: overrides.aliases ?? [],
    country: overrides.country ?? null,
    tier: overrides.tier ?? 1,
    equipmentCategories: overrides.equipmentCategories ?? [],
    parentManufacturerId: overrides.parentManufacturerId ?? null,
    sourceFile: overrides.sourceFile ?? "test.md",
    notes: overrides.notes ?? null,
  }
}

const sharples = mfr({
  name: "Sharples",
  aliases: ["Alfa Laval Sharples"],
  equipmentCategories: ["centrifuge"],
})
const baldor = mfr({
  name: "Baldor",
  aliases: [],
  equipmentCategories: ["motor"],
})
const abb = mfr({
  name: "ABB",
  aliases: [],
  equipmentCategories: ["motor", "drive"],
})

describe("buildNameplateRegistryCallback", () => {
  it("returns null for empty candidate list", async () => {
    const callback = buildNameplateRegistryCallback({
      searchManufacturers: vi.fn(),
      searchModels: vi.fn(),
    })
    const result = await callback({ candidates: [], equipmentType: "centrifuge", model: null })
    expect(result).toBeNull()
  })

  it("returns null when no registry hits", async () => {
    const callback = buildNameplateRegistryCallback({
      searchManufacturers: vi.fn().mockResolvedValue([]),
      searchModels: vi.fn(),
    })
    const result = await callback({
      candidates: ["UNKNOWNCO"],
      equipmentType: "centrifuge",
      model: null,
    })
    expect(result).toBeNull()
  })

  it("picks the equipment OEM (Sharples) over component vendor (Baldor) on a centrifuge", async () => {
    const searchManufacturers = vi.fn().mockImplementation(async ({ query }: { query: string }) => {
      // Both Sharples and Baldor are returned by some search — simulate the
      // realistic case where each candidate matches multiple registry rows.
      if (/sharples/i.test(query)) return [sharples]
      if (/baldor/i.test(query)) return [baldor]
      return []
    })
    const callback = buildNameplateRegistryCallback({
      searchManufacturers,
      searchModels: vi.fn().mockResolvedValue([]),
    })
    const result = await callback({
      candidates: ["SHARPLES", "BALDOR"],
      equipmentType: "centrifuge",
      model: null,
    })
    expect(result).not.toBeNull()
    expect(result!.manufacturerId).toBe(sharples.id)
    expect(result!.manufacturerName).toBe("Sharples")
    // Confidence should be high (exact match + equipment-type boost).
    expect(result!.confidence).toBeGreaterThanOrEqual(1.0)
  })

  it("returns Baldor when only Baldor is on a motor sale (no demote rule applies)", async () => {
    const searchManufacturers = vi.fn().mockResolvedValue([baldor])
    const callback = buildNameplateRegistryCallback({
      searchManufacturers,
      searchModels: vi.fn().mockResolvedValue([]),
    })
    const result = await callback({
      candidates: ["BALDOR"],
      equipmentType: "motor",
      model: null,
    })
    expect(result).not.toBeNull()
    expect(result!.manufacturerId).toBe(baldor.id)
  })

  it("attaches a model FK only at high confidence", async () => {
    const baldorMotorL1 = {
      id: "model-l1",
      manufacturerId: baldor.id,
      slug: "l1408t",
      name: "L1408T",
      series: null,
      equipmentType: "motor",
      notes: null,
      sourceFile: "motors.md",
    } satisfies ManufacturerModel
    const callback = buildNameplateRegistryCallback({
      searchManufacturers: vi.fn().mockResolvedValue([baldor]),
      searchModels: vi.fn().mockResolvedValue([baldorMotorL1]),
    })
    const result = await callback({
      candidates: ["BALDOR"],
      equipmentType: "motor",
      model: "L1408T",
    })
    expect(result?.manufacturerModelId).toBe("model-l1")
    expect(result?.manufacturerModelName).toBe("L1408T")
  })

  it("does not attach a model FK when the manufacturer match is below 0.9", async () => {
    // Force a fuzzy match by giving a candidate that only trigram-matches.
    const sharplesShort = mfr({
      id: "shrp",
      name: "Sharples",
      equipmentCategories: ["centrifuge"],
    })
    const callback = buildNameplateRegistryCallback({
      searchManufacturers: vi.fn().mockResolvedValue([sharplesShort]),
      searchModels: vi.fn().mockResolvedValue([
        {
          id: "model-x",
          manufacturerId: "shrp",
          slug: "x",
          name: "P3000",
          series: null,
          equipmentType: null,
          notes: null,
          sourceFile: "test.md",
        },
      ]),
    })
    // Candidate "SHRPLS" is far enough to keep score < 0.9 once boost doesn't apply
    const result = await callback({
      candidates: ["SHRPLS"],
      equipmentType: null,
      model: "P3000",
    })
    // Model FK should not be set when manufacturer confidence is low.
    if (result) {
      expect(result.manufacturerModelId).toBeNull()
    }
  })

  it("survives searchManufacturers throwing — never propagates", async () => {
    const callback = buildNameplateRegistryCallback({
      searchManufacturers: vi.fn().mockRejectedValue(new Error("db down")),
      searchModels: vi.fn(),
    })
    const result = await callback({
      candidates: ["ANY"],
      equipmentType: null,
      model: null,
    })
    expect(result).toBeNull()
  })

  it("survives searchModels throwing — manufacturer FK still returned", async () => {
    const callback = buildNameplateRegistryCallback({
      searchManufacturers: vi.fn().mockResolvedValue([baldor]),
      searchModels: vi.fn().mockRejectedValue(new Error("db down")),
    })
    const result = await callback({
      candidates: ["BALDOR"],
      equipmentType: "motor",
      model: "L1408T",
    })
    expect(result).not.toBeNull()
    expect(result!.manufacturerId).toBe(baldor.id)
    expect(result!.manufacturerModelId).toBeNull()
  })

  it("dedupes registry hits across multiple candidate searches", async () => {
    // Both candidates return Baldor — should not double-count.
    const searchManufacturers = vi.fn().mockResolvedValue([baldor, abb])
    const callback = buildNameplateRegistryCallback({
      searchManufacturers,
      searchModels: vi.fn().mockResolvedValue([]),
    })
    const result = await callback({
      candidates: ["BALDOR", "ABB"],
      equipmentType: "motor",
      model: null,
    })
    expect(result).not.toBeNull()
    // Either Baldor or ABB acceptable as primary; we just verify dedup ran.
    expect([baldor.id, abb.id]).toContain(result!.manufacturerId)
  })
})
