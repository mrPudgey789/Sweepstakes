# Claude Code prompt: alert on silent feed failure during live match windows

The poll-results cron was made resilient (a failed fetch now returns [] and records a SUCCESSFUL heartbeat instead of crashing). That fixed the spam, but it created a silent-failure risk: if the football-data.org feed is persistently broken (bad API key, IP block, changed endpoint), the poll will look healthy (green heartbeat, no error email) while never ingesting any results. During a live match that would mean scores silently never update and no one is alerted. Close that gap. Use British English. Do not use em dashes.

## Context
- A "successful" heartbeat now only means "the cron ran without crashing", NOT "we got data". Those are no longer the same thing.
- There is a debug endpoint `/api/debug/football-data` that returns the match count and unmatched teams.

## 1. Distinguish "ran" from "got data"
- Have the poll record, separately from the heartbeat, whether the football-data.org fetch actually returned data this cycle (e.g. matches array length, and whether the API call succeeded vs returned []). Store the last time the feed returned data successfully.

## 2. Live-window no-data alert
- Determine when we are inside a live match window: a fixture whose kickoff is within roughly the last 2.5 hours and is not yet finished.
- If we are inside a live window AND the feed has returned no data (empty/failed) for N consecutive cycles (e.g. 3), send me an alert email ("ALERT: feed returning no data during a live match") and surface it red on /admin. This is the case that means scores are silently not updating during a match.
- Outside live windows, do NOT alert on empty data (it is normal to have nothing new), so I am not spammed overnight.

## 3. Persistent-failure alert (any time)
- Separately, if the football-data.org fetch has FAILED (not just returned empty, but errored/timed out) for N consecutive cycles regardless of match windows, alert me. This catches a broken key/endpoint even before a match.
- Keep the existing transient-blip throttling (single failures do not alert).

## 4. Admin clarity
- On /admin, show two distinct signals: "cron ran" (heartbeat) and "feed returning data" (last successful data fetch time + last match-count). Green only when both are healthy. This makes a silent feed failure visible at a glance.

## 5. Verify
- Simulate: feed returns [] during a live window for 3 cycles -> I get the live no-data alert and /admin shows red on the feed signal, while the heartbeat may still be green.
- Simulate: feed errors for 3 cycles outside any match -> I get the persistent-failure alert.
- Confirm normal empty cycles overnight do NOT alert.
- Report what you added and how each alert is triggered/tested.
```
