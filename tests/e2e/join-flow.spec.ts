import { test, expect } from '@playwright/test'

test.describe('Join flow', () => {
  test('valid share link shows the join form with the expected fields', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    expect(res.ok(), 'test-slug API must return 200').toBeTruthy()
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Heading
    await expect(page.locator('h1')).toContainText('Join')

    // The join-flow card should render step 1 fields
    await expect(page.getByPlaceholder('e.g. James')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('Min 6 characters')).toBeVisible()
  })

  test('fill in details and advance to the T&Cs step', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Step 1: fill in display name, email, password
    await page.getByPlaceholder('e.g. James').fill('Test Player')
    await page.getByPlaceholder('you@example.com').fill(`pw-test-${Date.now()}@example.com`)
    await page.getByPlaceholder('Min 6 characters').fill('password123')

    // Click Continue
    await page.getByRole('button', { name: 'Continue' }).click()

    // Should now be on the T&Cs step
    await expect(page.getByText('Terms and Conditions').first()).toBeVisible({ timeout: 10000 })
  })

  test('accept T&Cs and advance toward the payment step', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Step 1
    await page.getByPlaceholder('e.g. James').fill('Test Player')
    await page.getByPlaceholder('you@example.com').fill(`pw-test-${Date.now()}@example.com`)
    await page.getByPlaceholder('Min 6 characters').fill('password123')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 2: T&Cs — wait for the heading to be visible
    await expect(page.getByText('Terms and Conditions').first()).toBeVisible({ timeout: 10000 })

    // Tick the acceptance checkbox (uses sr-only input, click the label instead)
    await page.getByText('I accept the Terms and Conditions').click()

    // The continue/join button should now be enabled
    const continueBtn = page.getByRole('button', { name: /join|choose your team/i })
    await expect(continueBtn).toBeEnabled({ timeout: 5000 })
  })
})
