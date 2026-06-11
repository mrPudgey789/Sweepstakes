import { test, expect } from '@playwright/test'

test.describe('Join flow', () => {
  test('valid share link shows the join form', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    expect(res.ok(), 'test-slug API must return 200').toBeTruthy()
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    await expect(page.locator('h1')).toContainText('Join')
    await expect(page.getByPlaceholder('e.g. James Smith')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  })

  test('login mode shows password field and continue button', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Switch to login mode
    await page.getByText('I have an account').click()

    // Should show login-specific fields
    await expect(page.getByPlaceholder('Your password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
    await expect(page.getByText('Forgot password?')).toBeVisible()
  })

  test('signup flow advances to T&Cs without email verification', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Fill in signup details
    await page.getByPlaceholder('e.g. James Smith').fill('Test Player')
    await page.getByPlaceholder('you@example.com').fill(`e2e-test-${Date.now()}@example.com`)
    await page.getByPlaceholder('Min 6 characters').fill('password123')

    // Click Continue - should go straight to T&Cs (no verification)
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('Terms and Conditions')).toBeVisible({ timeout: 10000 })
  })
})
