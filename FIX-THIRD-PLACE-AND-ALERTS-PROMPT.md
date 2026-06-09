# Claude Code prompt: best-third-placed elimination + real heartbeat alerting

Two pre-tournament hardening tasks. Use British English. Do not use em dashes.

## Part A: best-third-placed elimination (2026 format gap)
The current group-stage elimination only knocks out the bottom (4th) team in each completed group. But 2026 is a 48-team format: 12 groups of 4, with the top 2 from each group (24 teams) PLUS the 8 best third-placed teams advancing, for 32 qualifiers. That means 4 of the 12 third-placed teams are also eliminated, decided by comparing third-placed teams ACROSS groups, not within one group. Those 4 teams are currently never marked knocked out, so their players never get a knockout email.

Implement it robustly using the actual qualification outcome rather than re-deriving FIFA's third-place ranking:
- After the group stage completes and the Round of 32 fixtures resolve to real teams (the placeholder slots like "1A", "2B", "3C/D/F/..." get filled with actual team names), any group-stage team that does NOT appear in ANY Round of 32 fixture is eliminated. This automatically catches the 12 fourth-placed teams AND the 4 worst third-placed teams, and it is robust to however the best-third-placed teams are ranked.
- When such a team is marked eliminated, fire the knockout notification for every entry on that team (same path as existing knockout detection, with the existing idempotency guard so no duplicates).
- Keep the existing per-group "4th is out once the group is complete" logic as an early signal if you like, but the "not in any Round of 32 fixture" sweep is the authoritative backstop that must run once the bracket resolves.
- This also serves as a general backstop: any group team not in the R32 is out, full stop.

Test it: simulate a completed group stage with a resolved Round of 32 where specific teams (including third-placed ones) do and do not appear, and assert exactly the right teams are eliminated and notified, with no duplicates and none missed.

## Part B: real heartbeat alerting (dead-man's switch that actually alerts)
The cron writes a heartbeat row but nothing notifies me, which is why a failed run produced no alert. Make it actually alert, using an EXTERNAL monitor so it works even if the app or Vercel is down.

- Integrate an external cron monitor (healthchecks.io or Better Stack Uptime). On each SUCCESSFUL poll-results run, send a ping to the monitor's unique URL. Configure the monitor (document the steps for me) to expect a ping at least every N minutes matching our cron schedule, and to email/SMS me if a ping is missed. Put the ping URL in an env var (e.g. HEARTBEAT_PING_URL); do not hardcode it.
- Also send me an immediate email (via Resend, to my admin address) if a poll run throws an error, with the error detail, as a secondary signal.
- Add a `/admin` widget showing: last successful poll time, last error (if any), and a green/red status, so I have an at-a-glance view too.
- Document exactly where the alert will arrive (which email/phone) and how to test it (e.g. pause the cron and confirm the external monitor emails me).

## Report
- Part A: confirm the "not in Round of 32 means eliminated" sweep is implemented and tested, with the test asserting the right third-placed teams are caught.
- Part B: confirm the external monitor is wired, tell me which address alerts will go to, and how I can trigger a test alert to prove I actually receive it.
```
