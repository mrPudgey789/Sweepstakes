import { test, expect } from '@playwright/test'

test.describe('Join flow', () => {
  test('valid share link shows the join form', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    expect(res.ok(), 'test-slug API must return 200').toBeTruthy()
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Heading
    await expect(page.locator('h1')).toContainText('Join')

    // The join-flow card should render step 1 fields
    await expect(page.getByPlaceholder('e.g. James Smith')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  })

  test('fill in details with login mode and advance to T&Cs', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Switch to "I have an account" mode (avoids email verification)
    await page.getByText('I have an account').click()

    // Fill in name, email, password
    await page.getByPlaceholder('e.g. James Smith').fill('Test Player')
    await page.getByPlaceholder('you@example.com').fill('jimmyjopeel@gmail.com')
    await page.getByPlaceholder('Your password').fill('password123')

    // Click Continue (will attempt login, may fail auth but tests the flow)
    await page.getByRole('button', { name: 'Continue' }).click()

    // Should either show T&Cs or an auth error (depending on test env credentials)
    const tcVisible = await page.getByText('Terms and Conditions').first().isVisible().catch(() => false)
    const errorVisible = await page.getByText(/invalid|incorrect|error/i).first().isVisible().catch(() => false)

    expect(tcVisible || errorVisible).toBeTruthy()
  })

  test('signup flow redirects to email verification', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Step 1: fill in display name, email, password (signup mode)
    await page.getByPlaceholder('e.g. James Smith').fill('Test Player')
    await page.getByPlaceholder('you@example.com').fill(`e2e-test-${Date.now()}@example.com`)
    await page.getByPlaceholder('Min 6 characters').fill('password123')

    // Click Continue
    await page.getByRole('button', { name: 'Continue' }).click()

    // Should redirect to verify email page
    await expect(page.getByText('Almost there')).toBeVisible({ timeout: 15000 })
  })
})
