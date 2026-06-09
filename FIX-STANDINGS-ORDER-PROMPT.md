# Claude Code prompt: fix sweepstake standings ordering

The 2022 replay validated the pipeline (eliminations and notifications are correct), but the final standings order is wrong: it shows France above Argentina and Morocco above Croatia. Fix the ranking. Use British English. Do not use em dashes.

## Root cause
Ranking by "stage reached" is insufficient. In knockout football two teams reach the same stage but one wins and one loses (champion vs runner-up both reached the final; 3rd vs 4th both reached the third-place match). Also the champion was never given a terminal state, and there are TWO standings implementations that disagree.

## Fix 1: single source of truth
- Collapse the two standings code paths (the `recompute-standings` cron and `computeSweepstakeStandings()` in standings.ts) into ONE shared function. The cron and the API must both call it so stored and displayed standings can never diverge. Delete or wrap the duplicate.

## Fix 2: rank by the team's LAST match, not stage reached
For each entry's team, compute a sort key from the team's final game:
- Determine the team's last match (the latest match they played) and whether they WON or LOST it.
- Sort key, best to worst:
  1. Last-match stage weight, descending. Weights: final > third_place > semi > quarter > round_of_16 > round_of_32 > group.
  2. Won-last-match before lost-last-match (within the same last-match stage).
  3. Group-stage performance as the within-tier tie-break: points, then goal difference, then goals scored.
- The champion (won the final) is the single team whose last match is the final and who won it; they rank 1 and are never treated as "eliminated".

This yields, for a 32-team tournament: 1 = won final, 2 = lost final, 3 = won third-place match, 4 = lost third-place match, 5 to 8 = quarter-final losers (by group performance), 9 to 16 = round-of-16 losers, 17 to 32 = group-stage exits. It must work the same for the 48-team 2026 format (which adds a round_of_32 tier) without special-casing, because it derives from the stages actually present.

## Fix 3: champion terminal state
- Give the tournament winner a clear non-eliminated terminal state so the UI shows them as the winner, not as "active, still playing". Make sure the winner-structure resolution (single, or 1st/2nd/3rd) reads from this unified ranking.

## Tests (assert against the real 2022 result)
Add unit tests using the 2022 final standings as the oracle:
- 1st Argentina, 2nd France, 3rd Croatia, 4th Morocco.
- The four quarter-final losers (Netherlands, Brazil, Portugal, England) occupy ranks 5 to 8, ordered by the group-performance tie-break.
- Round-of-16 losers occupy 9 to 16; group-stage exits (including Qatar) occupy 17 to 32.
- Assert the 1st/2nd/3rd winner structure resolves to Argentina, France, Croatia.
- Add a focused test for the third-place match: the WINNER of it outranks the loser even though both reached the same stage.

## Fix 4: UI changes (from reviewing the live screens)

### 4a. Fixtures page: show scores and winner/loser
Currently the fixtures list shows team names but no scores and no indication of who won. For every FINISHED match:
- Show the final score (e.g. "Netherlands 2 - 0 Qatar"). The data exists in the results table (home_score, away_score, winner_team_id).
- Visually mark the result: the winner in bold/normal colour, the loser greyed or struck through (consistent with how the standings already grey eliminated teams). Show draws as a draw.
- For knockout matches decided on penalties, indicate it, e.g. "3 - 3 (4-2 pens)". Use winner_team_id as the source of truth for who progressed so the correct team is marked even when the score is level. If penalty scores are not stored, at minimum bold the winner via winner_team_id and add a small "won on penalties" note; flag whether we should start storing the penalty score.
- Keep scheduled (future) matches as they are (kickoff time, no score).

### 4b. Pot card: announce the winner(s) at the top once resolved
When the sweepstake has resolved (the tournament winner is known, or 1st/2nd/3rd are settled):
- Show the winner(s) prominently at the top of the prize-pot card. For a single-winner sweepstake: "Winner: Alice (Argentina)". For 1st/2nd/3rd: list all three with positions/medals (1st Alice / Argentina, 2nd Bob / France, 3rd Charlie / Croatia).
- Before resolution, keep the pot card as it is.
- Keep the money-separation wording intact: this is informational, the organiser distributes any winnings directly; the platform holds no pot. Do not imply the platform pays out.

### 4c. Standings reorder everywhere
- Apply the corrected ranking (Fix 2) to BOTH the mini-standings on the player dashboard and the full live standings table, so France no longer appears above Argentina. The current player's row stays highlighted.

## Verify
- Re-run the 2022 visual replay and confirm:
  - The standings (dashboard mini-table and full table) read 1 Argentina, 2 France, 3 Croatia, 4 Morocco.
  - The pot card shows the winner(s) at the top (Argentina 1st; with France 2nd and Croatia 3rd for the 1st/2nd/3rd structure).
  - The fixtures page shows scores with the winner marked and losers greyed, including the penalty results (e.g. the Final 3-3, Argentina won on penalties).
  - The organiser winner summary email names Argentina (1st), France (2nd), Croatia (3rd).
- Report the corrected final table and confirm both the cron-materialised standings and the API standings now match.
- Include screenshots of the updated player dashboard, full standings, and fixtures page.
```
