# Claude Code prompt: confirm the LIVE knockout pipeline works before the first real knockout

The 2022 replay proved the elimination/notification logic and the fixtures are now correct. What is NOT yet proven is the LIVE path: the real football-data.org feed reaching the database, and emails actually sending. Verify the live plumbing before the first real knockout. Use British English. Do not use em dashes.

## 1. Team-name matching against the LIVE feed (highest-risk silent failure, check now)
- Call football-data.org for the 2026 World Cup (season 2026) and list every team name the feed uses.
- Diff each against our `teams` table (name + aliases). Report any feed team that does NOT resolve to one of our teams.
- Pay special attention to alternate spellings (e.g. "Korea Republic" vs "South Korea", "Cote d'Ivoire" vs "Ivory Coast", accents on "Curacao", "Cape Verde"/"Cabo Verde", "DR Congo", "USA"/"United States") and the playoff-resolved teams (Sweden, Iraq, and any others now confirmed).
- For every unmatched name, add the correct alias so results will attach. Re-run until ZERO feed teams are unmatched. This is the thing most likely to silently break knockout detection, so it must be clean.

## 2. Confirm the safety nets are actually deployed and running in production
- Cron heartbeat / dead-man's switch: confirm the poll-results cron records each run and that a missed run alerts me (email or Slack). Show me the last recorded run time.
- Feed health monitor: confirm it checks the live feed is reachable and returning 2026 data, and alerts on failure or shape change.
- Reconciliation sweep: confirm the scheduled job that cross-checks "every eliminated team has a knockout notification for every entry on that team" and back-fills any missing ones is live, and add a manual "run reconciliation now" trigger.
- Admin override: confirm I can set or correct any result by hand as the ultimate backstop.

## 3. Live end-to-end dry run with the real email path (do not rely only on the replay)
- On a throwaway test sweepstake (not a real one), simulate a finished knockout match via the override, and confirm a REAL knockout email is sent via Resend to a test inbox (not just logged), with correct content, and recorded in the notifications table with no duplicate.
- Confirm idempotency: re-running the poll does not send a second email for the same elimination.

## 4. Opening-match canary plan (11 June, Mexico v South Africa)
- Document exactly what I should see after that match finishes: the poller ingests it within the polling window, the result attaches to the correct fixture, the score shows, and the group table updates. Give me the admin page or query to confirm each step.
- This proves the live feed-to-database path end to end before any knockout email is due.

## 5. Group-stage elimination timing
- Confirm a group team is only marked knocked out once the group table mathematically eliminates it (not after a single loss), and that the first real knockout emails (group exits ~24-27 June, Round of 32 from 28 June) will fire correctly.

## Report
- Zero unmatched feed team names (list what you fixed).
- Each safety net confirmed live, with last-run timestamps.
- The dry-run knockout email arrived in the test inbox, recorded once.
- The opening-match verification checklist for me to follow on 11 June.
```
