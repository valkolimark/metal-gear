import { test, expect } from '@playwright/test'

test.describe('Authentication flow', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /create.*account/i })).toBeVisible()
  })

  test('login form has email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show an error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
  })

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: /forgot|reset/i })).toBeVisible()
  })

  test('login has link to signup', async ({ page }) => {
    await page.goto('/login')
    const signupLink = page.getByRole('link', { name: /sign up|create.*account/i })
    await expect(signupLink).toBeVisible()
  })

  test('unauthenticated user is redirected from protected routes', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to login
    await page.waitForURL(/\/(login|signup)/, { timeout: 10000 })
  })
})
