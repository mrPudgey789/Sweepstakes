# Claude Code prompt: fix the data layer and build the in-tournament experience

Work in this repo (the Sweepstakes Next.js app). Read `spec/` and `docs/`, especially `docs/worldcup-data.md`, `spec/data-model.md`, and `docs/notifications.md`, then do the work below. Use British English and pounds sterling. Do not use em dashes.

There are three parts: (A) make the football data genuinely correct and working, (B) prove it works, (C) build the in-tournament player experience. Do A and B before C.

---

## Part A: make the data layer correct and actually working

The current fixtures are wrong because `src/lib/football-data.ts` calls football-data.org `/competitions/WC/matches` with no season filter, so it returns the 2022 World Cup, not 2026. Fix the whole data layer so the schedule is correct AND live scores attach to the right fixtures.

### A1. Schedule is the source of truth from openfootball 2026
- Rewrite the seed so the canonical schedule, teams, groups, venues, and full knockout bracket come from the openfootball 2026 file:
  `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`
- Seed all 48 teams (groups A to L) and all 104 matches (group stage plus Round of 32, Round of 16, Quarter-finals, Semi-finals, Third place, Final).
- It is the 48-team format: 12 groups (A to L), tournament runs 11 June to the Final on 19 July 2026 in New York/New Jersey. Make sure the seed reflects this, not the old 32-team format.
- Six group slots are still playoff placeholders (for example "UEFA Path D winner", "IC Path 1 winner") and the knockout rounds use placeholder slots ("2A", "W74", "L101"). Store these as placeholder teams that resolve later. Never drop those matches. Show them in the UI as "To be confirmed" with the slot label.
- Store kickoff times as proper UTC timestamps (the file gives local time plus a UTC offset like "UTC-6"; convert to UTC on seed).

### A2. Live scores from football-data.org, correctly scoped to 2026
- Keep football-data.org but ALWAYS scope to the 2026 edition. The FIFA World Cup is on their free tier. Add the season filter to every call, e.g. `/competitions/WC/matches?season=2026`, and send the `X-Auth-Token` header from `FOOTBALL_DATA_API_KEY`.
- The poll-results cron should fetch live and finished matches and write into our `results` table: `home_score`, `away_score`, `winner_team_id`, and the match `status` (scheduled, live, finished). During an in-play match, store the current score so the UI can show who is currently winning.
- Never overwrite a `manual_override` result (this rule already exists; keep it).

### A3. The hard part: reliably matching football-data matches to our openfootball fixtures
This is where it silently breaks, so do it carefully. openfootball identifies teams by full name ("South Korea", "Cote d'Ivoire" vs "Ivory Coast"), football-data.org uses a three-letter `tla` and its own names. Build a robust matcher:
- Maintain a canonical `teams` table seeded from openfootball, each with a stable `code`, the display name, and an `aliases` list (alternative spellings and the football-data `tla`/name).
- When ingesting a football-data match, resolve each side to our team via: exact code, then alias, then normalised-name match (lowercase, strip accents and punctuation). Log any unmatched team name to the console and skip writing that result rather than guessing.
- Match a football-data fixture to our fixture by the team pair plus the kickoff date (same two teams on the same calendar day). Store football-data's match id in our `external_ref` once matched, so subsequent polls update the same row.
- For knockout placeholder fixtures, only attach a result once both real teams are known (the bracket has resolved).

### A4. Scores, "who is winning", and standings must be correct
- A finished match must produce a clear result: final score and winner (or draw at group stage).
- A live match must show the live score and a "currently winning" indicator (or "level").
- Compute proper group tables (points: win 3, draw 1, loss 0; then goal difference, then goals scored) so group-stage progression and elimination are correct.
- Knockout: the loser is eliminated; the winner advances and fills the next bracket slot (resolve "W74" style placeholders as results come in).
- Recompute sweepstake standings whenever a result changes (the recompute-standings cron exists; wire it in).

---

## Part B: prove the API works (do this before Part C)

Do not assume it works. Verify it.
- Add a health-check route, e.g. `GET /api/debug/football-data`, that calls football-data.org for season 2026 and returns: number of matches, a sample fixture with teams and status, the current daily/again rate-limit headers, and a list of any team names it could NOT match to our table. Protect it so it is not public in production.
- Add a small test (or a seed-and-check script) that: seeds from openfootball, ingests a known finished 2026 group match once results exist, and asserts that our `results` row has the right score, winner, and that the two teams' group standings updated. If the tournament has not started, simulate by injecting one finished match into the matcher and asserting the standings math.
- Run the dev server, open the fixtures page, and confirm it shows 48 teams, groups A to L, real matchups (England, Brazil, Argentina, etc.), and the Final on 19 July in New York/New Jersey. Fix anything that is still showing 2022 or 32 teams.
- Report back: does the live feed return 2026 data with your key, what is the rate-limit headroom, and did any team names fail to match.

---

## Part C: the in-tournament player experience

Once data is correct, build the experience a player sees during the tournament. The player has one team (assigned or chosen) in a given sweepstake. Update the player dashboard (`src/app/sweepstake/[id]/player` and the player API routes under `src/app/api/player`).

### C1. "Your next match" card (based on the player's team)
- Find the player's team's next fixture where kickoff is in the future, and show: opponent (with both badges), kickoff in the player's local timezone with a countdown, stage (e.g. "Group L, Matchday 1" or "Round of 16"), and venue/city.
- If the team is currently playing, switch the card to live mode: show the live score, who is currently winning or "level", and the minute if available.
- Just after a match, show the result and whether the team progressed or is now out, then roll the card forward to the next fixture.
- If the team is eliminated, show a clear "Knocked out at [stage]" state instead of a next match (this ties to the existing knockout email).
- If the team is a knockout placeholder not yet resolved, show "Next match to be confirmed once the bracket resolves".

### C2. Live sweepstake standings
- Show the live league table for THIS sweepstake: every player, their team, the team's current stage reached, group points/goal difference where relevant, and their current rank.
- Rank by furthest stage reached, then group-stage performance as a tiebreak, consistent with `docs/worldcup-data.md`. Resolve final places per the sweepstake's winner structure (single winner, or 1st/2nd/3rd).
- Clearly mark who is still in versus knocked out, and highlight the current player's own row.
- Show position movement since the last update if feasible (up/down/same).
- Keep it live: refresh from the cached results so it updates as matches finish, without hammering the API.

### C3. Tie it together on the player dashboard
- Hero: the player's team badge and status (in / knocked out), their current position in the sweepstake (e.g. "3rd of 12"), and the "Your next match" card.
- Secondary: a compact top-of-table standings preview with a link to the full live standings, and a link to the full fixtures view.
- Make sure the organiser's manual result override immediately flows through to all of the above.

---

## Constraints and finish
- Respect the money-separation rule: none of this touches the entry pot. It is data and display only.
- Serve all player-facing pages from cached results, never direct per-user API calls, so we stay inside the free rate limit.
- Commit in logical steps (data layer, verification, player experience).
- When done, give me: a summary of what changed, the result of the Part B verification (including whether the live feed returned 2026 data and any unmatched teams), and screenshots or a description of the fixtures page, the "your next match" card, and the live standings.
```
