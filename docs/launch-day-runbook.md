# Launch-day runbook (World Cup kickoff, Thursday 11 June 2026)

The money-separation design means no bug can lose anyone's pot, and Thursday has no knockout emails due (first eliminations are late June). So the only things that must work on Thursday are: the app stays up, the one match result ingests correctly and on time, and scores/standings update. Any wobble is recoverable with the manual override.

Thursday's only UK-evening match: Mexico v South Africa, 20:00 UK kickoff, finishes ~22:00 UK. (South Korea v Czech Republic is 03:00 UK Friday.)

## Do now / by Wednesday (pre-flight)

- [ ] **healthchecks.io live and TESTED.** Create the check (period 5 min, grace 10), paste the ping URL into Vercel as HEARTBEAT_PING_URL, set your alert email. Then break/pause the cron once and confirm you actually receive the alert email. An untested alert equals no alert.
- [ ] **Supabase on Pro**, and Sweeporweep isolated from the AURAMARKET project so a free-tier pause/quota can't take you down.
- [ ] **Resend on Pro** (removes the daily cap) with domain auth confirmed (already landing in inbox, good).
- [ ] **Error tracking (Sentry)** added so you can see client/server errors live.
- [ ] **Final production dry run** on a throwaway sweepstake: create, join with a test email, see team, see next match, override a result, watch standings move, confirm emails arrive. Then delete it.
- [ ] **Confirm rollback works:** know how to one-click revert to the previous Vercel deploy.
- [ ] **Fixtures confirmed correct** (done) and **kickoff times display in UK time** (done).
- [ ] Ship the close-confirmation fix before the freeze.

## Wednesday: code freeze

- [ ] Stop deploying anything non-essential from Wednesday. The classic launch-day disaster is a last-minute "quick fix." After the freeze, only deploy if something is genuinely broken, and only with a rollback ready.

## Thursday: game day

- [ ] Be online by ~19:45 UK, before the 20:00 kickoff.
- [ ] Open `/admin` and confirm the poll-status card is GREEN (recent successful run).
- [ ] After full time (~22:00 UK), follow the canary checks for Mexico v South Africa:
  - [ ] `cron_heartbeats` shows a completed run after ~22:00 UK.
  - [ ] `results` has a row with the correct score for that match.
  - [ ] `matches` shows that match as `finished`.
  - [ ] A sweepstake's fixtures page shows the score with an FT badge.
  - [ ] A sweepstake with a Mexico or South Africa player shows updated standings (3 points to the winner, or 1 each for a draw).
  - [ ] Notification queue stays at 0 (group match, no eliminations Thursday).
- [ ] Do NOT deploy code during the match window.

## If something breaks (pre-mortem)

- **Poller stops / no result after full time** → healthchecks.io alerts you; manually trigger the poll, or enter the result via the override page. The override is your guaranteed fallback.
- **Feed is late or shows a wrong score** → use the manual override to set the correct result; it wins over the feed and won't be overwritten.
- **App or a page is down** → roll back to the previous Vercel deploy; check Vercel and Supabase status pages.
- **Sign-up spike from marketing** → you're on Supabase/Resend Pro, so limits have headroom; watch the `/admin` and Supabase usage.
- **An organiser closes by accident** → reopen it for them (or they self-serve once the close-confirmation/reopen fix is live).

## Not Thursday-urgent (you have the group stage to do these)

- Scaling fixes (standings recompute, email queue) only bite if you go viral; the email burst specifically matters at the knockouts (late June).
- The best-third-placed elimination backstop is a late-June (Round of 32) concern, already built.
- Solicitor sign-off on the T&Cs is the big non-engineering item; not a Thursday blocker but do it before scaling up promotion.
