# Claude Code prompt: make the results-to-knockout pipeline provably reliable

The core paid feature is: when the football API reports a result, the app must automatically detect who is knocked out, notify those players, and update standings, with no manual intervention. This MUST be trustworthy during the live 2026 World Cup, before we take money. Build the testing and safety infrastructure below so we can prove it works and catch any failure within minutes. Use British English. Do not use em dashes.

The pipeline under test: feed result -> match the result to the correct fixture/teams -> determine eliminations (knockout: loser out; group: out when the table mathematically eliminates them) -> fire knockout notifications for every entry on an eliminated team -> recompute standings. It must be deterministic, idempotent (never double-send, never miss), and self-healing.

## 1. Replay a real completed tournament end to end (the headline test)
- Build a replay harness that takes a completed World Cup (start with 2022; ideally also an earlier one) from real data (football-data.org historical, or openfootball) and feeds every match into the pipeline in chronological order, simulating the real status transitions (scheduled -> in-play -> finished) and the matchday cadence.
- Seed a test sweepstake with one player per team so every elimination should trigger exactly one knockout notification.
- After each match, assert the pipeline's state matches the KNOWN historical outcome: the correct teams are marked eliminated at the correct point, standings ordering is correct, and exactly the right knockout notifications were queued (no missing, no duplicates, no premature ones).
- The test passes only if replaying the whole tournament reproduces the real elimination order exactly. Report any divergence with the match that caused it.

## 1b. Visual replay with the two real accounts logged in (so I can watch the UI)
On top of the headless assertion replay, add a "visual" mode of the 2022 replay that I can watch in the live UI as the two real accounts:
- Seed a 2022 World Cup sweepstake (NOTE: 2022 is the 32-team format, groups A to H; use the 2022 teams, not 2026) with:
  - Organiser: `jimmyjopeel@gmail.com`.
  - Player: `james.peel@xeneta.com`, assigned a 2022 team that is KNOCKED OUT in the group stage (so I see the "your team is out" state and email), for example a team that finished bottom of its group.
  - 6 to 8 synthetic players covering a spread of 2022 teams, including the eventual winner (Argentina 2022) so 1st/2nd/3rd resolve.
- Generate a one-time login link (or set a temporary password) via the Supabase admin API for BOTH `jimmyjopeel@gmail.com` and `james.peel@xeneta.com`, and print them, so I can open the organiser in one browser window and the player in an incognito window and watch both perspectives side by side. Do not print or commit any other secret.
- Run the replay at an OBSERVABLE pace, not instant: add a configurable delay between matches (default a few seconds) and/or a step control (play next match / play next matchday) and a speed setting, so I can watch standings reorder, the player's "your next match" roll forward, and the team's elimination happen live.
- Make sure the visual replay drives the real pipeline (same matcher, elimination logic, notifications, standings) so what I see is exactly what real users would see, just sped up. Knockout/notification emails should fire to the real inboxes (or log to the notifications table if email is not wired yet).
- Provide a reset so I can re-run the visual replay from scratch, and a cleanup that removes this 2022 demo sweepstake and its synthetic players afterwards (leave the 2026 data intact).
- This visual mode is for my eyes; the headless assertion replay in section 1 remains the thing that must pass in CI.

## 2. Hammer the group-stage elimination maths (most likely bug source)
- Unit-test group elimination against real and adversarial group tables: a team eliminated before its last game, elimination that depends on another group's result, three-way ties on points, goal difference and goals scored, and the case where a team is NOT yet eliminated and must not be notified.
- Assert the pipeline never marks a team out before the table guarantees it, and always marks it out once it does.

## 3. Contract-test and monitor the live feed
- A contract test that calls football-data.org for the 2026 World Cup (season 2026) and asserts the response contains the fields we depend on, in the expected shape (match status values, score.fullTime, winner, team identifiers). Fail loudly if the feed shape changes.
- A health monitor (scheduled, every few minutes during the tournament) that checks the feed is reachable and returning 2026 data, and alerts (email/Slack) if it goes quiet or returns an unexpected shape.

## 4. Monitor the job itself (dead-man's switch)
- The result poller runs on a schedule. Add a heartbeat: record each successful run, and alert me if a scheduled run is missed (the silent-cron-stop is the worst failure because nobody gets notified and we do not find out).
- Make every send idempotent: before sending a knockout email, check for an existing one for that entry/elimination so retries and recomputes never double-send.

## 5. Reconciliation sweep (self-healing guarantee)
- A scheduled job that cross-checks the database: for every team marked eliminated, every entry on that team must have a knockout notification. If any are missing, send them and log it.
- Same idea for standings: recompute and correct if they drift from the results.
- This guarantees eventual correctness even if a single poll or email failed.

## 6. Live ops dashboard (admin only)
- A protected page showing, during the tournament: last successful poll time, results ingested today, teams eliminated today, knockout notifications sent vs expected, any failed sends, and feed health.
- A clear manual-override control as a backstop, plus a "resend missing notifications" button that triggers the reconciliation sweep on demand.

## 7. Verify and report
- Run the 2022 replay and the unit tests. Report: did the replay reproduce the real elimination order exactly, which tests pass, and any bug found and fixed.
- Document the whole pipeline and these safety nets in `docs/results-pipeline-reliability.md`, including what each alert means and what to do when it fires.
- List anything still needing my input (e.g. an alerting channel, historical-data access).
```
