# Claude Code prompt: build a dev-only tournament simulator and test harness

The 2026 World Cup has not started yet, so we cannot test the in-tournament experience against live data. Build a dev-only simulator that lets us fast-forward a fake tournament and verify the in-tournament features end to end: "your next match", live match states, live sweepstake standings, knockout detection, and the knockout email.

Work in this repo. Use British English and pounds sterling. Do not use em dashes. Everything below must be dev-only and must never run against production data.

## Guardrails (important)
- Gate every simulator route and UI behind an explicit check: only enabled when `NODE_ENV !== 'production'` AND an env flag `ENABLE_SIM=true` is set. If either is false, return 404.
- Never call the real football-data.org API from the simulator. It writes results directly to our database as `source = 'sim'` (treat like a feed result, still overridable by the organiser).
- Make all of it reversible with a reset.

## 1. Seed a test world
Add a script or route `POST /api/sim/seed-test-world` that:
- Ensures the 2026 fixtures and 48 teams are seeded from openfootball (reuse the real seeder).
- Creates one test organiser and one test sweepstake (random mode, single-winner and a second one with 1st/2nd/3rd so both winner structures can be tested).
- Joins 6 to 8 test players with fake emails, accepts T&Cs, and assigns teams (mix of strong and weak teams so some go out early).
- Returns the sweepstake links and the test player emails so we can open each player view.

## 2. Simulate match results
Add `POST /api/sim/play` accepting a body that supports:
- `{ "matchday": 1 }` plays every match in that group matchday with plausible random scores.
- `{ "matchId": "...", "home": 2, "away": 1 }` sets a specific result.
- `{ "stage": "round_of_32" }` plays a whole knockout round, resolving the bracket placeholders (W74 etc) to the winners and marking losers eliminated.
- After writing results it must run the same downstream logic as a real result: recompute group tables and standings, mark teams eliminated, and fire knockout notifications. Reuse the real recompute-standings and knockout code, do not duplicate it.

## 3. Simulate a LIVE match (for the live card and "currently winning")
Add `POST /api/sim/live` accepting `{ "matchId": "...", "home": 1, "away": 0, "minute": 67 }` that:
- Sets the match status to `live` and stores the current score and minute.
- Optionally `{ "matchId": "...", "now": true }` shifts that match's kickoff to the current time so "your next match" flips into live mode.
- Add `POST /api/sim/finish` to end a live match and bank the result (so we can test the live -> finished -> next match transition).

## 4. Trigger the crons on demand
Add buttons/routes to run the existing crons manually: poll-results (in sim mode this is a no-op or reads sim state) and recompute-standings. This lets us confirm the scheduled jobs produce the same result as the simulator.

## 5. Reset
Add `POST /api/sim/reset` that deletes all sim results and notifications and returns teams to active, so we can run the whole playthrough again from scratch.

## 6. A simple simulator control panel
Add a dev-only page at `/sim` (same guardrails) with buttons for: seed test world, play matchday 1/2/3, play each knockout round, set a chosen match live, finish it, run the crons, and reset. Show the current sweepstake standings and each test player's "next match" inline so we can watch them change as we click.

## 7. Email capture
- Make sure knockout and other emails in dev go to a capture inbox, not real recipients. Support a `MAIL_TRANSPORT=log` mode that writes the email to the console and the `notifications` table instead of sending, plus instructions for pointing at Mailtrap if we want to see rendered emails.

## 8. Write the manual test script
Create `docs/testing-in-tournament.md` documenting a step-by-step manual playthrough using the panel:
1. Seed the test world, open two player views side by side.
2. Play matchday 1, confirm scores show, "currently winning" logic, and standings move.
3. Set one match live, confirm the live card and countdown, then finish it.
4. Play out the groups, confirm a team's elimination marks the player out and sends the knockout email (check the capture inbox and notifications table).
5. Play the knockout rounds, confirm the bracket resolves and final standings/winner(s) are correct for both the single-winner and 1st/2nd/3rd sweepstakes.
6. Reset.
List the expected result at each step so a non-developer can follow it.

## Finish
- Add unit tests for the standings and knockout maths (given a set of results, assert the table, eliminations, and final places).
- When done, run the playthrough yourself, and report what you saw at each step plus any bugs found and fixed. Include the `/sim` panel screenshots.
```
