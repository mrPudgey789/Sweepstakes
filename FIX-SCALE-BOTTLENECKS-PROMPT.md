# Claude Code prompt: fix the two scaling bottlenecks before going viral

An audit found the data-fetch model is correct (single central poll, fixed API calls regardless of sweepstake count) and the manual override works. Two things break at scale and must be fixed. Use British English. Do not use em dashes.

## Critical 1: standings recomputation scales linearly with sweepstakes (breaks first)
Both crons do `for (const sw of sweepstakes) await materialiseStandings(sw.id)` sequentially, every cycle, whether or not anything changed. `computeSweepstakeStandings` recomputes the GLOBAL group tables and each team's last-match/stage from scratch INSIDE every sweepstake, even though that state is identical for all sweepstakes in a tournament. At thousands of sweepstakes this is tens of thousands of sequential DB round-trips per cycle and the serverless function times out, silently halting standings.

Fix:
- Compute the shared tournament state ONCE per poll: a single per-team ranking (stage reached, won-last-match, group points, goal difference, goals for) for the 32 to 48 teams, stored in a small `team_rankings` table (or computed once in memory per run). This is the expensive part and it is global.
- Make a sweepstake's standings a trivial ordering of its own entries by that shared team ranking. Prefer computing standings ON READ from the shared ranking (cached), so there is no per-sweepstake materialisation cron at all. If you keep materialisation, only recompute sweepstakes that contain a team whose ranking actually changed this cycle, and never run a full sweep when nothing changed.
- Do not recompute group tables or last-match per sweepstake. Compute them once per tournament per cycle and reuse.
- Add a `maxDuration` to the cron route configs and batch-load matches once instead of per-match `byRef` lookups in the poll loop.

## Critical 2: knockout emails are fire-and-forget in a loop (unreliable now, fails under load)
The poll calls `sendEmailAsync` per recipient inside the cron. Fire-and-forget in serverless is unreliable (Vercel kills un-awaited work when the function returns), and a popular team going out spawns tens of thousands of sends at once, hitting Resend's ~2 req/sec rate limit (429s) and possibly the daily cap. Each send also does 3 Supabase writes.

Fix:
- The poll must only ENQUEUE notifications (the `notifications` table already has a `queued` status). Do not send from the poll.
- Add a separate throttled worker cron that drains the queue using Resend's BATCH endpoint (up to 100 recipients per API call) at a rate that respects Resend's limit, marking each sent/failed with retry and backoff on 429.
- Keep the existing idempotency (one knockout per entry) so re-runs never double-send.
- Confirm we are on Resend Pro with a requested rate-limit increase before the tournament; document the daily/burst headroom in `docs/results-pipeline-reliability.md`.

## Minor
- The per-match `byRef` selects in the poll are fine alone but compound the timeout risk; batch them.
- Player-facing reads (dashboard, standings, fixtures) already read from Supabase, which is correct. Make sure the hot read paths are indexed (sweepstake_id on entries/standings, team_id on entries) and consider a short cache on the standings read.

## Verify (load test, do not guess)
- Seed a test tournament with a large number of sweepstakes (for example 5,000 to 20,000) each with entries, then run one poll cycle that finishes a match eliminating a widely-held team.
- Assert: the poll completes well within the function time limit; standings for all affected sweepstakes are correct; the notification queue contains the right rows; the worker drains them via batch sends without exceeding Resend's rate limit; no duplicates.
- Report the poll cycle duration and DB query count at 1k, 5k, and 20k sweepstakes, before and after the fix, so we can see the scaling curve flatten.
```
