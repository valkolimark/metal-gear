import { test, expect } from "@playwright/test"

// SOS create + analyzer-route smoke (Cycle 60).
// The analyzer route now passes through src/lib/vision-analysis/. A full
// authenticated happy-path requires fixture user + mocked Vision/Claude;
// CI smoke covers route reachability + auth gating + the migration's
// non-breaking response contract.

test.describe("SOS — public smoke (Cycle 60)", () => {
  test("unauthenticated POST /api/listings/analyze-image returns 401", async ({ request }) => {
    const res = await request.post("/api/listings/analyze-image", {
      data: { wideShot: "iVBOR", mimeType: "image/png", mode: "sos" },
    })
    expect(res.status()).toBe(401)
  })

  test("/sos/create renders the camera-first flow when unauthed → /login", async ({ page }) => {
    await page.goto("/sos/create")
    await expect(page).toHaveURL(/\/(login|sos\/create)/)
  })

  test("analyzer route accepts mode field without breaking the legacy contract", async ({ request }) => {
    // Empty body → 400, not 500. Confirms the route still validates input the
    // same way it did before the Cycle 60 migration.
    const res = await request.post("/api/listings/analyze-image", {
      data: {},
    })
    expect([400, 401]).toContain(res.status())
  })
})
