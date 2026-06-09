# Claude Code prompt: re-seed and verify 2026 fixtures (URGENT, live sweepstakes affected)

The fixtures in production are wrong. Many matchups are fabricated cross-group pairings that can never happen (e.g. the app shows "England v Senegal" and "Japan v Jordan", but those teams are in different groups). Some fixtures are correct (e.g. Ivory Coast v Ecuador, Group E) and some are wrong, so the table is inconsistent and must be fully re-seeded from the authoritative source and then verified match-by-match. This is live and affects paying players and knockout detection, so treat it as urgent. Use British English. Do not use em dashes.

## Source of truth
The real 2026 schedule is the openfootball file:
https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
It contains all 104 matches with team1, team2, group, date, time (local with a UTC offset like "UTC-5"), and ground. Treat this file as canonical. Examples that MUST be true after the fix:
- Group L: England, Croatia, Ghana, Panama. England's group games: v Croatia (17 Jun, Dallas), v Ghana (23 Jun, Boston), v Panama (27 Jun, NY/NJ).
- Group I: France, Senegal, Norway, IC Path 2 winner. France's first game: v Senegal (16 Jun, NY/NJ).
- Group E: Germany, Curaçao, Ivory Coast, Ecuador.

## 1. Re-seed teams, groups and fixtures from openfootball (replace, do not merge)
- Wipe and re-import the teams (with their group letter A to L) and all 104 matches from the openfootball 2026 file, so the DB fixtures exactly equal the canonical schedule. Do not keep any existing fabricated rows.
- Preserve linkage so existing entries/assignments still point at the correct team rows (match teams by canonical name/alias; do not orphan live sweepstake entries). If a team row is reused, keep its id stable; only fix its group and its fixtures.
- Convert each match time from the file's local time + offset into a proper UTC timestamp (the display layer already converts UTC to UK time correctly, so just store correct UTC).
- Keep placeholder teams (e.g. "UEFA Path D winner", "IC Path 2 winner") and knockout bracket slots ("2A", "W74", "L101") as-is; do not drop those matches.

## 2. Verify every fixture against the source (hard gate)
- Add a verification script that loads the openfootball 2026 file and asserts the DB matches it EXACTLY: same 104 matches, each with the same team1, team2, group, date, venue. Fail loudly listing any mismatch.
- Add an invariant check: NO group-stage match may contain two teams from different groups. Assert there are zero cross-group group-stage fixtures (this is the bug class we just hit).
- Spot-assert the known-good cases above (England v Croatia first, France v Senegal first, Ecuador in Group E).
- Do not consider the task done until the verification passes with zero mismatches.

## 3. Show groups on the fixtures page
- Group the fixtures view by group (Group A to L) for the group stage, with a clear group label/header, then the knockout rounds. Keep the existing per-match display (teams, date in UK time, venue, status).

## 4. Make sure every sweepstake page reflects the corrected fixtures
- "Your next match" on each sweepstake/player page must read from the corrected fixtures, so a player holding England sees "v Croatia, 17 Jun" as their next game, not the old wrong opponent.
- Standings, knockout detection and the knockout emails all key off team-to-fixture mapping, so re-verify after re-seeding that the right team is attached to the right fixture (a wrong mapping could eliminate or notify the wrong team).
- Because sweepstakes are already live, do this as a careful migration: re-seed, run the verification gate, then confirm a sample of live sweepstakes (including one with England, one with France, one with Ecuador) now show the correct next match.

## 5. Report
- Confirm the verification passed with zero mismatches and zero cross-group group-stage fixtures.
- Show the corrected fixtures for England, France, Japan, Netherlands, Uzbekistan (the ones that were wrong) and confirm they now match the real schedule.
- Confirm the fixtures page now shows groups, and that "your next match" is correct on a few live sweepstakes.
- Note anything that needed manual decisions (e.g. team name/alias mapping for the playoff placeholder slots).
```
