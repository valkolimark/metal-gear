import { describe, it, expect } from "vitest"
import {
  scoreRowAgainstRegistry,
  extractListingManufacturer,
  AUTO_CONFIRM_THRESHOLD,
  REVIEW_BAND_THRESHOLD,
} from "@/lib/registry/backfill"
import type { Manufacturer } from "@/lib/registry"

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

const sharples = mfr({ name: "Sharples", equipmentCategories: ["centrifuge"] })
const baldor = mfr({ name: "Baldor", equipmentCategories: ["motor"] })
const abb = mfr({
  name: "ABB",
  aliases: ["ABB Motors"],
  equipmentCategories: ["motor", "drive"],
})

describe("scoreRowAgainstRegistry", () => {
  it("returns tier=none for empty manufacturer string", () => {
    const r = scoreRowAgainstRegistry(
      { manufacturer: "", equipmentType: "centrifuge" },
      [sharples],
    )
    expect(r.tier).toBe("none")
    expect(r.manufacturerId).toBeNull()
  })

  it("returns tier=none when no registry hits", () => {
    const r = scoreRowAgainstRegistry(
      { manufacturer: "asdfqwerty", equipmentType: null },
      [sharples, baldor],
    )
    expect(r.tier).toBe("none")
  })

  it("auto-confirms exact match (>= 0.90)", () => {
    const r = scoreRowAgainstRegistry(
      { manufacturer: "Sharples", equipmentType: "centrifuge" },
      [sharples, baldor],
    )
    expect(r.tier).toBe("auto")
    expect(r.manufacturerId).toBe(sharples.id)
    expect(r.confidence).toBeGreaterThanOrEqual(AUTO_CONFIRM_THRESHOLD)
    expect(r.method).toBe("exact")
  })

  it("auto-confirms alias match", () => {
    const r = scoreRowAgainstRegistry(
      { manufacturer: "ABB Motors", equipmentType: "motor" },
      [abb, baldor],
    )
    expect(r.tier).toBe("auto")
    expect(r.manufacturerId).toBe(abb.id)
    expect(r.method).toBe("alias")
  })

  it("returns review tier (0.70..0.90) for fuzzy substring matches", () => {
    // Use a slightly off but still recognizable string. Trigram + partial
    // substring should land in the review band.
    const acmeOriginal = mfr({
      name: "Big Industrial Pumps",
      equipmentCategories: ["pump"],
    })
    const r = scoreRowAgainstRegistry(
      { manufacturer: "Industrial Pumps", equipmentType: null },
      [acmeOriginal],
    )
    // Substring score is 0.85 — review band.
    expect(r.confidence).toBeGreaterThanOrEqual(REVIEW_BAND_THRESHOLD)
    expect(r.confidence).toBeLessThan(AUTO_CONFIRM_THRESHOLD)
    expect(r.tier).toBe("review")
    expect(r.manufacturerId).toBeNull()
    expect(r.manufacturerName).toBe("Big Industrial Pumps")
  })

  it("respects equipment-type boost (Sharples beats Baldor on centrifuge text)", () => {
    // Both manufacturers might fuzzy-match a generic OCR string, but the
    // centrifuge boost on Sharples wins.
    const r = scoreRowAgainstRegistry(
      { manufacturer: "Sharples", equipmentType: "centrifuge" },
      [sharples, baldor],
    )
    expect(r.manufacturerId).toBe(sharples.id)
  })

  it("clamps low-quality matches to tier=none", () => {
    const r = scoreRowAgainstRegistry(
      { manufacturer: "z", equipmentType: null },
      [sharples],
    )
    expect(r.tier).toBe("none")
    expect(r.confidence).toBeLessThan(REVIEW_BAND_THRESHOLD)
  })
})

describe("extractListingManufacturer", () => {
  it("prefers specifications over specs", () => {
    expect(
      extractListingManufacturer(
        { manufacturer: "Sharples" },
        { manufacturer: "Baldor" },
      ),
    ).toBe("Sharples")
  })

  it("falls back to specs when specifications is empty", () => {
    expect(extractListingManufacturer({}, { manufacturer: "Baldor" })).toBe(
      "Baldor",
    )
    expect(extractListingManufacturer(null, { manufacturer: "Baldor" })).toBe(
      "Baldor",
    )
  })

  it("returns null for missing/empty values", () => {
    expect(extractListingManufacturer(null, null)).toBeNull()
    expect(extractListingManufacturer({}, {})).toBeNull()
    expect(
      extractListingManufacturer({ manufacturer: "   " }, { manufacturer: "" }),
    ).toBeNull()
  })

  it("ignores non-string manufacturer values", () => {
    expect(
      extractListingManufacturer({ manufacturer: 42 as unknown as string }, null),
    ).toBeNull()
  })

  it("trims whitespace", () => {
    expect(extractListingManufacturer({ manufacturer: "  Baldor  " }, null)).toBe(
      "Baldor",
    )
  })
})
