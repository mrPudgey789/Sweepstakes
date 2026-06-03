# Claude Code prompt: end-to-end test every flow and fix the bugs it finds

The live app (sweeporweep.com) has edge-case bugs. Build an automated test suite that exercises every user flow, catches broken pages, 404s, and console errors, then fix everything it finds. Use British English. Do not use em dashes.

## Known bug, already hotfixed, now needs tightening (and a regression test)
A share link `/j/<slug>` returned 404 for logged-out visitors. Root cause: the join page at `src/app/j/[slug]/page.tsx` selects `organisers!inner(display_name, email)`, but the `organisers` table RLS only allowed `auth.uid() = auth_id`, so an anonymous visitor could not read the organiser row, the inner join returned nothing, and `notFound()` fired.

It was hotfixed by adding `CREATE POLICY ... ON organisers FOR SELECT USING (true)`. That fixes the 404 but OVER-EXPOSES data: anonymous users can now read every column of every organiser row (including email, and paypal_link / auth_id if stored on that table) via the auto-generated API. This is a data leak. Tighten it:
- Remove the blanket `USING (true)` SELECT policy on `organisers`.
- Add a Postgres view or security-definer function that returns ONLY `id` and `display_name` (for organisers that own a non-draft sweepstake), and have the join page read that instead of `organisers!inner(display_name, email)`. Drop `email` from the public select entirely.
- Verify with an anonymous API call that `organisers` rows are no longer directly readable and that only `id` + `display_name` are reachable through the view.
- Audit every other public/anonymous page for the same pattern (an `!inner` join or select against a table anon cannot read under RLS). The join page also counts `entries`, which anon cannot read; make sure full/closed detection still works for anonymous visitors (use a security-definer count or a public-safe path).
- Add a regression test: as a logged-out browser context, open a share link for an open sweepstake and assert the join page renders (not a 404), AND a test asserting an anonymous client cannot read organiser emails.

## Set up Playwright end-to-end tests
- Add Playwright with a config that can run against local dev and, via a base-URL env var, against production.
- Run tests in a logged-out context by default, since that is where most bugs hide. Add authenticated contexts where a flow needs login.
- Fail any test on an uncaught console error or a page-level error, not just on assertions (the 404 page in question also threw a console error).

### Flows to cover (write a test per flow)
1. Anonymous visitor opens a share link `/j/<slug>` for an open sweepstake and sees the join page.
2. Player join, random mode: open link, enter email, accept T&Cs, get assigned (or "team coming"), reach the PayPal payment step, self-mark "I've paid".
3. Player join, pick-your-own: choose an available team, confirm a taken team cannot be picked twice.
4. Join via the join code (the `/join` page) resolves to the same flow.
5. Closed and full sweepstakes show the correct closed/full message, not a 404.
6. Organiser signup and login.
7. Create-sweepstake wizard end to end through to the Stripe step (use Stripe test mode and test cards), then the success page shows the share link and join code.
8. Stripe webhook flips the sweepstake from draft to open (simulate the webhook in test mode).
9. Organiser confirms a player's payment; the player's state moves to confirmed.
10. Organiser runs the draw (random) and teams are assigned.
11. Organiser manual result override updates standings.
12. Player dashboard: "your next match" and live standings render for a seeded tournament (reuse the sim endpoints if present).
13. Auth-protected pages redirect logged-out users to login rather than 404 or error.

## Add a route smoke crawler
- A test that loads every top-level route and key dynamic route (with a seeded valid id/slug) and asserts a 200 and no console errors. This catches stray 404s like the one reported.
- Include negative cases: an invalid slug should show a friendly "not found" state, not an unhandled error.

## Add unit tests for the logic
- Standings ranking, group-table maths, knockout/elimination, pricing-band selection, and the PayPal link amount-append. Given fixed inputs, assert the outputs.

## Run, fix, repeat
- Run the whole suite. For every failure, find the root cause and fix it (code or RLS or routing), then re-run until green. Prefer fixing the underlying cause over loosening the test.
- Keep a short `docs/known-issues.md` listing each bug found, the cause, and the fix.

## Finish
- Add an npm script `test:e2e` and `test:unit`, and document how to run them against local and prod in `docs/testing.md`.
- Wire the suite into CI (GitHub Actions) so it runs on every push, to catch regressions before they reach production.
- Report: the list of bugs found and fixed, which flows pass, and anything still failing that needs my input (e.g. Stripe or Supabase test credentials).
```
