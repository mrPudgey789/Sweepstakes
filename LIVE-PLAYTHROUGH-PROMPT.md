# Claude Code prompt: seed a pre-drawn sweepstake and test the match-data experience

I do NOT want to test signup, payment, joining, or the draw. Seed a fully set-up, already-drawn sweepstake directly (via the Supabase service role), then focus entirely on the tournament-data experience: fixtures, results scoring, who is winning, live standings, "your next match", knockout detection, and the resulting emails. Use British English and pounds sterling. Do not use em dashes.

## Guardrails
- Tag everything as test data (sweepstake name "TEST - Match Data", and an `is_test` flag if easy) so it is easy to delete.
- Prefer a Vercel PREVIEW deployment; if using production, label clearly and delete in the cleanup step.
- Read all secrets from env. Do not paste secrets into chat or commits.
- Stripe is not involved here (we skip payment). Seed the sweepstake straight into the open/drawn state.

## 1. Seed the pre-drawn sweepstake (no UI flows)
Insert directly with the service role:
- Organiser: `jimmyjopeel@gmail.com`.
- One sweepstake, status `drawn`, random mode, winner structure 1st/2nd/3rd, entry £5, a placeholder PayPal link.
- Players with teams already assigned and `payment_state = confirmed`:
  - `james.peel@xeneta.com` assigned a team that will be KNOCKED OUT in the group stage (so we test the knockout path).
  - 6 to 8 synthetic players (dev addresses) assigned a spread of real 2026 teams, including at least one team that reaches the FINAL (so 1st/2nd/3rd resolve cleanly).
- Make sure the fixtures and teams are seeded from the correct 2026 data first (openfootball 2026), so the assigned teams map to real fixtures.

Confirm the seed by loading the sweepstake's player dashboard for `james.peel@xeneta.com` and the standings page.

## 2. Verify the data BEFORE any results
- Fixtures page shows the real 2026 schedule (48 teams, groups A to L, Final 19 July, New York/New Jersey). Flag anything showing 2022 or 32 teams.
- Each player's "your next match" shows their team's correct first fixture (opponent, date/time in local time, venue, stage).
- Standings render with everyone level (no results yet).

## 3. Simulate results and verify scoring (the core of this test)
Use the manual override (or /sim endpoints if present) to enter results, and after each batch verify:
- The score attaches to the CORRECT fixture and the right teams (this is the bit that was previously broken by team-name mismatch, so check it explicitly).
- A finished match shows the final score and the correct winner; a drawn group game is handled.
- If a live state is supported, set one match live with a partial score and confirm the "currently winning" indicator and the live card.
- Group tables compute correctly (points, goal difference, goals) and the right teams progress vs are eliminated.
- Live sweepstake standings reorder correctly as teams advance.
- "Your next match" rolls forward from finished match to next fixture, and shows "knocked out at [stage]" once a team is out.

Play the group stage so `james.peel@xeneta.com`'s team is eliminated, then play the knockout rounds through to the Final so 1st/2nd/3rd resolve.

## 4. Verify the emails that depend on match data
- When `james.peel@xeneta.com`'s team is knocked out, confirm the KNOCKOUT email actually arrives in that inbox (real deliverability check). Note if it lands in spam.
- When the sweepstake resolves, confirm the ORGANISER WINNER SUMMARY email arrives in `jimmyjopeel@gmail.com`, naming 1st/2nd/3rd with players and teams. If this email is not built, add it.
- (These two emails require the email layer to be wired. If Resend is not configured yet, say so and fall back to logging the emails to the notifications table.)

## 5. Report
- Pass/fail per check in steps 2 to 4.
- Screenshots of: fixtures page, a player's "your next match" (scheduled, live if supported, and knocked-out states), live standings mid-tournament, and the resolved 1st/2nd/3rd view.
- Which emails arrived in which inbox.
- Any bug found (especially any score attaching to the wrong fixture/team), with the fix.

## 6. Cleanup
- Delete the test sweepstake and all its entries, results overrides, standings, and notifications, and the synthetic players. Confirm production/preview is clean. Leave the real fixtures/teams data intact.
```
