import { test, expect } from '@playwright/test'

test.describe('Route smoke tests', () => {
  test('homepage returns 200 and contains brand name', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)

    // The SVG alt text or heading on the home page contains "Sweep" or "Weep"
    const bodyText = await page.locator('body').innerText()
    const hasName = /sweep|weep/i.test(bodyText)
    expect(hasName, 'Homepage should contain "Sweep" or "Weep"').toBe(true)
  })

  test('homepage has no console errors', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/')
    // Allow React hydration to settle
    await page.waitForLoadState('networkidle')

    expect(pageErrors, `Unexpected console errors on homepage: ${pageErrors.join('\n')}`).toHaveLength(0)
  })

  test('GET /join returns 200', async ({ page }) => {
    const response = await page.goto('/join')
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toContainText(/join/i)
  })

  test('GET /auth/login returns 200', async ({ page }) => {
    const response = await page.goto('/auth/login')
    expect(response?.status()).toBe(200)
  })

  test('GET /auth/signup returns 200', async ({ page }) => {
    const response = await page.goto('/auth/signup')
    expect(response?.status()).toBe(200)
  })

  test('GET /j/nonexistent-slug returns a page, not a 500 error', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const response = await page.goto('/j/nonexistent-slug-that-does-not-exist')

    // Must not be a 5xx server error
    expect(
      response?.status() ?? 0,
      'Unknown slug should not produce a 500 error',
    ).toBeLessThan(500)

    expect(pageErrors, `Unexpected errors on not-found slug page: ${pageErrors.join(', ')}`).toHaveLength(0)
  })
})
