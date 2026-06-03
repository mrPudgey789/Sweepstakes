import { test, expect } from '@playwright/test'

test.describe('Auth flows', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/auth/login')

    await expect(page.locator('h1')).toContainText('Welcome back')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
  })

  test('login page has a link to sign up', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible()
  })

  test('signup page renders with the expected fields', async ({ page }) => {
    await page.goto('/auth/signup')

    await expect(page.locator('h1')).toContainText('Create an account')
    await expect(page.locator('#displayName')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
  })

  test('signup page has a link back to login', async ({ page }) => {
    await page.goto('/auth/signup')
    // The main content (not navbar) should have a login link
    await expect(page.getByRole('main').getByRole('link', { name: /log in/i })).toBeVisible({ timeout: 15000 })
  })

  test('unauthenticated visit to /dashboard redirects to login', async ({ page }) => {
    // Ensure no session cookies are present
    await page.context().clearCookies()

    await page.goto('/dashboard')

    // The dashboard client-side code pushes to /auth/login when no user is found.
    // Allow a moment for the JS redirect to occur.
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/auth/login')
  })
})
