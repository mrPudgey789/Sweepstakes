import { test, expect } from '@playwright/test'

test.describe('Closed / drawn sweepstake share link', () => {
  test('drawn sweepstake shows a closed message, not a 404 or 500', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const res = await page.request.get('/api/debug/test-slug')
    const { drawn_slug: slug } = await res.json()

    if (!slug) {
      test.skip()
      return
    }

    const response = await page.goto(`/j/${slug}`)

    expect(
      response?.status() ?? 0,
      'Drawn sweepstake share link must not produce a 5xx error',
    ).toBeLessThan(500)

    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0)

    await expect(page.locator('h1')).toContainText(/closed/i)

    await expect(
      page.getByText(/draw has already happened|no longer accepting/i),
    ).toBeVisible()
  })
})
