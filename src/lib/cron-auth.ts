/**
 * Verify cron requests.
 *
 * Vercel Cron automatically sends an Authorization header with the value
 * of the CRON_SECRET env var. For local dev, you can pass it manually:
 *   curl -H "Authorization: Bearer <secret>" http://localhost:3000/api/cron/...
 *
 * If CRON_SECRET is not set, all requests are allowed (dev convenience).
 */
export function verifyCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // no secret configured, allow all (dev mode)

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}
