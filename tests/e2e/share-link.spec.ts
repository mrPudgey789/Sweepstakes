import { test, expect } from '@playwright/test'

test.describe('Share link (/j/:slug)', () => {
  test('valid slug renders the join page, not a 404', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    expect(res.ok(), 'test-slug API must return 200').toBeTruthy()
    const { open_slug: slug } = await res.json()
    expect(slug, 'test-slug API must return a slug').toBeTruthy()

    await page.goto(`/j/${slug}`)

    // Should not be the Next.js 404 page
    await expect(page).not.toHaveTitle(/404|not found/i)

    // The page heading should contain "Join"
    await expect(page.locator('h1')).toContainText('Join')
  })

  test('join page does not expose any organiser email address', async ({ page }) => {
    const res = await page.request.get('/api/debug/test-slug')
    const { open_slug: slug } = await res.json()

    await page.goto(`/j/${slug}`)

    // Grab all visible text and assert no email pattern is present
    const bodyText = await page.locator('body').innerText()
    const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
    expect(
      emailPattern.test(bodyText),
      `Organiser email should not be visible on the join page but found: ${bodyText.match(emailPattern)?.[0]}`,
    ).toBe(false)
  })

  test('invalid slug shows a not-found state, not an unhandled error', async ({ page }) => {
    // Collect any unhandled page errors
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const response = await page.goto('/j/nonexistent-slug-that-does-not-exist')

    // Next.js notFound() renders a 404, not a 500
    expect(response?.status(), 'Invalid slug should produce a 404, not a 5xx').not.toBeGreaterThanOrEqual(500)

    // No unhandled JS errors
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0)

    // Page should communicate the sweepstake was not found (Next.js default or custom)
    const title = await page.title()
    const bodyText = await page.locator('body').innerText()
    const indicatesNotFound =
      /not found|404|sweepstake not found/i.test(title) ||
      /not found|doesn't exist|no sweepstake/i.test(bodyText)
    expect(indicatesNotFound, 'Page should show a not-found message for invalid slugs').toBe(true)
  })
})
