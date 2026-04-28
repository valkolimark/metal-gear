/**
 * Architecture invariant test (Cycle 61b).
 *
 * The vision-analysis layer (`src/lib/vision-analysis/`) MUST NOT import from
 * `@/lib/registry/*` or `@/app/actions/*`. The registry-aware nameplate
 * disambiguation is wired via the `registryLookup` callback parameter on
 * `EquipmentAnalysisOptions`; the only place that joins the two layers is
 * `src/lib/registry/nameplate-callback.ts`.
 *
 * If this test fails, do NOT add the import — refactor so the dependency
 * crosses the boundary as a callback or pure-data parameter instead.
 */
import { execSync } from "child_process"
import { describe, it, expect } from "vitest"

describe("vision-analysis domain isolation", () => {
  it("never imports from @/lib/registry", () => {
    const out = execSync(
      'grep -rnE "from [\\"\']\\@?/lib/registry" src/lib/vision-analysis/ || true',
      { encoding: "utf-8" },
    ).trim()
    expect(out).toBe("")
  })

  it("never imports from @/app/actions", () => {
    const out = execSync(
      'grep -rnE "from [\\"\']\\@?/app/actions" src/lib/vision-analysis/ || true',
      { encoding: "utf-8" },
    ).trim()
    expect(out).toBe("")
  })

  it("never imports from @/lib/snap-list", () => {
    const out = execSync(
      'grep -rnE "from [\\"\']\\@?/lib/snap-list" src/lib/vision-analysis/ || true',
      { encoding: "utf-8" },
    ).trim()
    expect(out).toBe("")
  })

  it("never imports from @/lib/telemetry (Cycle 62)", () => {
    const out = execSync(
      'grep -rnE "from [\\"\']\\@?/lib/telemetry" src/lib/vision-analysis/ || true',
      { encoding: "utf-8" },
    ).trim()
    expect(out).toBe("")
  })
})
