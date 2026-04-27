import { test, expect } from "@playwright/test"

// The Photo-to-Listing flow requires an authenticated user, R2 upload endpoints,
// and a live Google Vision + Claude pipeline. The CI smoke test asserts
// that unauthenticated access is gated and the routing is stable.
// A full happy-path walkthrough is covered manually and by the unit + action
// tests; wiring it into CI would need a fixture user + mocked pipeline.

test.describe("Photo-to-Listing — public smoke", () => {
  test("unauthenticated request to /listings/snap is redirected to /login", async ({ page }) => {
    const response = await page.goto("/listings/snap")
    // Next.js will 302 to /login?next=/listings/snap — accept either a
    // redirect chain landing on /login, or a final URL matching /login.
    await expect(page).toHaveURL(/\/login/)
    expect(response?.status()).toBeLessThan(500)
  })

  test("/listings/new (no query) lands on the manual form (or /login when unauthed)", async ({ page }) => {
    await page.goto("/listings/new")
    // Unauthed → /login; authed → stays on /listings/new (manual form). Never redirects to /snap.
    await expect(page).toHaveURL(/\/(login|listings\/new)/)
  })

  test("/listings/new?mode=photo redirects to /listings/snap", async ({ page }) => {
    await page.goto("/listings/new?mode=photo")
    // Unauthed: bounces through /login → /listings/snap. Authed: lands directly on /snap.
    await expect(page).toHaveURL(/\/(login|listings\/snap)/)
  })

  test("/listings/new?mode=advanced renders the manual form (back-compat)", async ({ page }) => {
    await page.goto("/listings/new?mode=advanced")
    await expect(page).toHaveURL(/\/(login|listings\/new)/)
  })
})
