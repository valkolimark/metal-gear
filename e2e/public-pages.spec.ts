import { test, expect } from '@playwright/test'

test.describe('Public pages', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/metal gear/i)).toBeVisible()
  })

  test('pricing page loads with tiers', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText(/free/i)).toBeVisible()
    await expect(page.getByText(/premium/i)).toBeVisible()
    await expect(page.getByText(/boost/i)).toBeVisible()
  })

  test('about page loads', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading')).toBeVisible()
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading')).toBeVisible()
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading')).toBeVisible()
  })

  test('PWA manifest is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json')
    expect(response?.status()).toBe(200)

    const manifest = await response?.json()
    expect(manifest.name).toContain('Metal Gear')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons).toHaveLength(2)
  })
})
