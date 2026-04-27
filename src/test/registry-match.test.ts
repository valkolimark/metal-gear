import { describe, it, expect } from "vitest"
import {
  normalizeManufacturerString,
  scoreCandidate,
  disambiguateNameplateCandidates,
  type Manufacturer,
} from "@/lib/registry"

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

describe("normalizeManufacturerString", () => {
  it("lowercases and trims", () => {
    expect(normalizeManufacturerString("  SHARPLES  ")).toBe("sharples")
  })

  it("strips legal-entity suffixes", () => {
    expect(normalizeManufacturerString("Sharples Inc.")).toBe("sharples")
    expect(normalizeManufacturerString("Charles Ross & Son Co.")).toBe("charles ross & son")
    expect(normalizeManufacturerString("Acme LLC")).toBe("acme")
    expect(normalizeManufacturerString("EKATO GmbH")).toBe("ekato")
    expect(normalizeManufacturerString("Sulzer AG")).toBe("sulzer")
  })

  it("strips parenthetical location/country labels", () => {
    expect(normalizeManufacturerString("SPX FLOW – Lightnin (Rochester, NY)")).toBe(
      "spx flow – lightnin",
    )
  })

  it("collapses internal whitespace", () => {
    expect(normalizeManufacturerString("Hayward    Gordon")).toBe("hayward gordon")
  })

  it("handles empty/falsy input", () => {
    expect(normalizeManufacturerString("")).toBe("")
  })

  it("strips repeated suffixes (Inc Co)", () => {
    expect(normalizeManufacturerString("Foo Inc Co.")).toBe("foo")
  })
})

describe("scoreCandidate ordering: exact > alias > substring > fuzzy", () => {
  const sharples = mfr({
    name: "Sharples",
    aliases: ["Alfa Laval Sharples", "Pennwalt Sharples"],
    equipmentCategories: ["centrifuge"],
  })

  it("exact name → 1.0", () => {
    expect(scoreCandidate("Sharples", sharples)).toBe(1)
  })

  it("exact name with legal suffix → 1.0 (normalized)", () => {
    expect(scoreCandidate("Sharples Inc.", sharples)).toBe(1)
  })

  it("alias match → 0.95", () => {
    expect(scoreCandidate("Pennwalt Sharples", sharples)).toBe(0.95)
  })

  it("substring → 0.85", () => {
    expect(scoreCandidate("Sharples Centrifuge", sharples)).toBe(0.85)
  })

  it("fuzzy (typo) → in (0, 0.85)", () => {
    const score = scoreCandidate("Sharpels", sharples) // transposed
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(0.85)
  })

  it("unrelated → low score", () => {
    expect(scoreCandidate("Mitsubishi", sharples)).toBeLessThan(0.3)
  })

  it("empty input → 0", () => {
    expect(scoreCandidate("", sharples)).toBe(0)
  })

  it("ordering invariant: exact > alias > substring > fuzzy", () => {
    const exact = scoreCandidate("Sharples", sharples)
    const alias = scoreCandidate("Pennwalt Sharples", sharples)
    const substring = scoreCandidate("Sharples Decanter", sharples)
    const fuzzy = scoreCandidate("Sharpels", sharples)
    expect(exact).toBeGreaterThan(alias)
    expect(alias).toBeGreaterThan(substring)
    expect(substring).toBeGreaterThan(fuzzy)
  })
})

describe("disambiguateNameplateCandidates — the Baldor fix", () => {
  const sharples = mfr({
    name: "Sharples",
    equipmentCategories: ["centrifuge"],
  })
  const baldor = mfr({
    name: "Baldor",
    equipmentCategories: ["motor"],
  })
  const abCompumotor = mfr({
    name: "AB Compumotor",
    equipmentCategories: ["motor", "drive"],
  })
  const generalElectric = mfr({
    name: "General Electric",
    aliases: ["GE"],
    equipmentCategories: ["motor"],
  })

  it("centrifuge with Sharples + Baldor nameplate → Sharples is primary", () => {
    const result = disambiguateNameplateCandidates(
      ["Sharples", "Baldor"],
      [sharples, baldor],
      "centrifuge",
    )
    expect(result.primary?.name).toBe("Sharples")
    expect(result.secondary.map(m => m.name)).toContain("Baldor")
    expect(result.confidence).toBeGreaterThan(0.9)
  })

  it("motor sale with Baldor only → Baldor is primary", () => {
    const result = disambiguateNameplateCandidates(["Baldor"], [baldor], "motor")
    expect(result.primary?.name).toBe("Baldor")
    expect(result.confidence).toBeGreaterThan(0.9) // exact + category boost
  })

  it("two motor candidates, equipment is motor → highest scorer wins", () => {
    const result = disambiguateNameplateCandidates(
      ["Baldor", "AB Compumotor"],
      [baldor, abCompumotor],
      "motor",
    )
    // Both match exact and both get the equipment-type boost; neither is
    // demoted because they're both component-only AND no non-component hit
    // exists (so the demote rule doesn't fire). Either could win; assert
    // we got a primary back and the other landed in secondary.
    expect(result.primary).not.toBeNull()
    expect(result.secondary).toHaveLength(1)
    expect([result.primary?.name, result.secondary[0].name].sort()).toEqual([
      "AB Compumotor",
      "Baldor",
    ])
  })

  it("empty OCR candidates → null primary, no throw", () => {
    const result = disambiguateNameplateCandidates([], [sharples, baldor], "centrifuge")
    expect(result.primary).toBeNull()
    expect(result.secondary).toEqual([])
    expect(result.confidence).toBe(0)
  })

  it("empty registry hits → null primary, no throw", () => {
    const result = disambiguateNameplateCandidates(["Sharples"], [], "centrifuge")
    expect(result.primary).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it("no equipment type given → falls back to raw score ordering", () => {
    const result = disambiguateNameplateCandidates(
      ["Sharples", "Baldor"],
      [sharples, baldor],
      null,
    )
    // Both match exactly → both rawScore=1, and Baldor (component-only) is
    // demoted by 0.2 because Sharples (non-component) exists.
    expect(result.primary?.name).toBe("Sharples")
  })

  it("alias-driven disambiguation: GE motor on a centrifuge doesn't beat Sharples", () => {
    const result = disambiguateNameplateCandidates(
      ["GE", "Sharples"],
      [generalElectric, sharples],
      "centrifuge",
    )
    expect(result.primary?.name).toBe("Sharples")
  })

  it("returns scored array sorted desc by adjusted score", () => {
    const result = disambiguateNameplateCandidates(
      ["Sharples", "Baldor"],
      [sharples, baldor],
      "centrifuge",
    )
    expect(result.scored).toHaveLength(2)
    expect(result.scored[0].score).toBeGreaterThanOrEqual(result.scored[1].score)
  })
})
