import { describe, it, expect } from "vitest"
import {
  buildExtractionPrompt,
  primaryCategoryFromFilename,
  EXTRACTION_SYSTEM_PROMPT,
} from "../../scripts/seed-equipment-registry.prompt"

describe("primaryCategoryFromFilename", () => {
  it("strips industrial- prefix and -manufacturers suffix", () => {
    expect(primaryCategoryFromFilename("industrial-mixer-manufacturers.md")).toBe("mixer")
    expect(primaryCategoryFromFilename("industrial-pump-manufacturers.md")).toBe("pump")
    expect(primaryCategoryFromFilename("industrial-centrifuge-manufacturers.md")).toBe("centrifuge")
  })

  it("uses first segment of -and- compound names", () => {
    expect(
      primaryCategoryFromFilename("industrial-tank-and-pressure-vessel-manufacturers.md"),
    ).toBe("tank")
    expect(
      primaryCategoryFromFilename("industrial-conveyor-and-material-handling-manufacturers.md"),
    ).toBe("conveyor")
    expect(primaryCategoryFromFilename("industrial-crusher-and-mill-manufacturers.md")).toBe(
      "crusher",
    )
  })

  it("preserves multi-word names without -and-", () => {
    expect(primaryCategoryFromFilename("industrial-heat-exchanger-manufacturers.md")).toBe(
      "heat-exchanger",
    )
    expect(primaryCategoryFromFilename("industrial-filter-press-manufacturers.md")).toBe(
      "filter-press",
    )
  })

  it("handles a path prefix", () => {
    expect(
      primaryCategoryFromFilename("data/manufacturers/industrial-mixer-manufacturers.md"),
    ).toBe("mixer")
  })
})

describe("buildExtractionPrompt", () => {
  const fixtureChunk = `## Tier 1 — Global Leaders by Type Family

### Charles Ross & Son Company (Hauppauge, NY)
The category pioneer — introduced the Double Planetary in the early 1940s.

**Double Planetary (DPM Series)**
- DPM-1, DPM-2, DPM-4, DPM-10
`

  it("returns system + messages structure", () => {
    const out = buildExtractionPrompt({
      chunk: fixtureChunk,
      sourceFile: "industrial-mixer-manufacturers.md",
      primaryCategory: "mixer",
    })
    expect(out.system).toBe(EXTRACTION_SYSTEM_PROMPT)
    expect(out.messages).toHaveLength(1)
    expect(out.messages[0].role).toBe("user")
  })

  it("includes the source file and primary category in the user message", () => {
    const out = buildExtractionPrompt({
      chunk: fixtureChunk,
      sourceFile: "industrial-mixer-manufacturers.md",
      primaryCategory: "mixer",
    })
    const content = out.messages[0].content
    const text = Array.isArray(content)
      ? content.map(c => (c.type === "text" ? c.text : "")).join("")
      : String(content)
    expect(text).toContain("industrial-mixer-manufacturers.md")
    expect(text).toContain('"mixer"')
    expect(text).toContain("BEGIN MARKDOWN")
    expect(text).toContain("Charles Ross & Son Company")
    expect(text).toContain("END MARKDOWN")
  })

  it("system prompt requires JSON-only output", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("JSON ONLY")
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("manufacturers")
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("aliases")
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("equipment_categories")
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("tier")
  })

  it("system prompt forbids hallucinated models", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("Do not invent")
  })
})
