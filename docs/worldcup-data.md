# Tournament Data and Results

> Part of the [World Cup Sweepstakes](../spec/project-spec.md) project. How the app gets fixtures, results, and team progression, and how it survives an unreliable free feed.

## Money-separation note

This document touches no money at all. Tournament data drives team assignment, fixtures display, standings, and knockout detection. It never relates to the entry pot. Listed here only to keep the rule visible across every document.

## What the data layer must provide

- The list of teams in the tournament (for assignment and pick-your-own).
- The full fixtures list (the all-matches view), with kickoff times, venues, and stages.
- Live and finished results.
- Team progression: which teams advance and which are knocked out (drives the knockout email in [notifications.md](notifications.md)).
- Enough structure to compute per-sweepstake standings for the chosen winner structure.

## Candidate free public football APIs

Three concrete candidates, compared for v1.

### 1. football-data.org (recommended primary)

- **Coverage:** major competitions including the FIFA World Cup; well-structured competitions, teams, matches, and standings endpoints. Historically covers the World Cup as a competition.
- **Free tier rate limit:** 10 requests per minute on the free tier.
- **Auth:** free API token.
- **Reliability:** mature, stable, widely used, clear documentation and a sensible data model (competitions → matches → scores). Good fit for our entities.
- **Why recommended:** the 10-requests-per-minute window is comfortably enough for a poll-on-a-schedule design (we are not making per-user calls), the data shape maps cleanly onto [data-model.md](../spec/data-model.md), and it is reliable enough to be the spine of the app.

### 2. API-Football / API-Sports (api-football.com)

- **Coverage:** very broad; the 2026 World Cup is addressable via `league=1`, `season=2026`, with full match, standings, lineup, and event data.
- **Free tier rate limit:** **100 requests per day**, resetting at 00:00 UTC, with access to all endpoints.
- **Auth:** free API key (free account).
- **Reliability:** strong, detailed data, good World Cup 2026 support already in place.
- **Trade-off:** the 100-per-day cap is tight. It is workable with aggressive caching and polling only inside match windows, but it leaves little headroom on a busy match day with many concurrent fixtures. Good as a **secondary / richer-data source** or a fallback.

### 3. openfootball/worldcup.json (recommended seed + offline fallback)

- **Coverage:** free, public-domain JSON for the World Cups including **Canada/USA/Mexico 2026**, with the match schedule, groups, teams, and grounds. No API key required.
- **Rate limit:** none in the API sense; it is static JSON hosted on GitHub, so it is just file fetches.
- **Reliability for fixtures:** excellent and dependency-free; perfect for **seeding** the fixtures, teams, and groups before and during the tournament.
- **Limitation:** community-maintained and **not a live results feed**. It is not guaranteed to update results in real time, so it cannot be the sole source for live/finished scores.

(TheSportsDB is a further free option, 30 requests per minute on the free tier but with per-endpoint restrictions; usable but not preferred over football-data.org for our needs.)

### Comparison summary

| API | 2026 WC coverage | Free rate limit | Live results | Best role here |
| --- | --- | --- | --- | --- |
| football-data.org | Yes (as a competition) | 10 req/min | Yes | **Primary** |
| API-Football | Yes (league=1, season=2026) | 100 req/day | Yes | Secondary / fallback |
| openfootball JSON | Yes (CA/US/MX 2026) | n/a (static JSON) | No (schedule, not live) | **Seed + offline fallback** |

## Recommendation

Use **football-data.org as the primary live source**, **seed fixtures and teams from openfootball/worldcup.json** (so the app has the full schedule even before the live feed is wired up and as an offline fallback), and keep **API-Football as a documented secondary** in case football-data.org's World Cup coverage or uptime disappoints. Crucially, **never depend on any single feed for correctness**: the organiser's manual override (below) is the ultimate source of truth.

Store the chosen source per record so a manually overridden result is never clobbered by the feed (`source` on `Result`, see [data-model.md](../spec/data-model.md)).

## Designing for unreliability

Free feeds are late, rate-limited, and occasionally wrong. The design assumes this.

### Caching

- Cache all feed responses server-side (Supabase table or KV) with a timestamp.
- Fixtures and teams change rarely: cache for hours, refresh a few times a day.
- Results change only around and after matches: cache aggressively, and serve every player page from the cache, never from a live call. This keeps us far inside any rate limit because user traffic never hits the API directly.

### Polling cadence

- **Outside match windows:** poll a few times per day for schedule changes.
- **Inside a match window** (from kickoff to roughly two hours after, per live fixture): poll every 2–5 minutes for that match's result. With football-data.org's 10/min this is trivially within budget; even on API-Football's 100/day it is manageable if windows are tracked so we only poll active matches.
- Drive polling from a scheduled server function (cron edge function), not from client page loads.

### Manual override (the safety net)

The organiser can **correct or set any match result** when the feed is wrong or late. This is the ultimate source of truth.

- A `Result` with `source = manual_override` always wins over a `feed` result and is never overwritten by subsequent polls.
- The override UI lets the organiser enter the score and the winner, with a confirmation step.
- Overriding a result re-triggers downstream logic: standings recompute and knockout detection re-runs, which can fire knockout emails. Make this clear in the override confirmation so an organiser knows an email may go out.
- Record `overridden_by` and `recorded_at` for transparency.

## Detecting that a team has been knocked out

Knockout detection drives the primary notification ([notifications.md](notifications.md)). Two complementary signals:

1. **Direct from team status.** If the feed (or an override) marks a team `eliminated`, set `Team.status = eliminated` and `eliminated_at`, and fire knockout handling for every entry on that team.
2. **Derived from match results.** In knockout-stage matches (round of 32 onward), the losing team is eliminated. When a knockout-stage `Result` is recorded with a `winner_team_id`, mark the other team eliminated. At group stage, elimination is computed once the group table is final (a team that cannot finish in a qualifying position is out).

Because group-stage elimination depends on the full group table, recompute group standings whenever a group result lands, and only mark a team eliminated when the table guarantees it. When in doubt, prefer the explicit team-status signal and let the organiser override.

## Standings and rankings for the winner structure

Standings are computed per sweepstake (see the `Standing` entity in [data-model.md](../spec/data-model.md)) by mapping each entry's team progression onto a rank:

- A team's **stage reached** (group → round of 32 → round of 16 → quarter → semi → final/winner) is the primary ranking key. Teams still in, and further along, rank above eliminated teams.
- Tie-breaks within the same stage can use group-stage performance (points, goal difference) where the feed provides it; for v1 a simple stage-based ranking with the organiser able to adjust at the end is acceptable.
- The **winner structure** decides how many positions resolve to winners:
  - `single` - the entry whose team progresses furthest (ultimately the tournament winner) is the sweepstake winner.
  - `top_three` - the top three entries by final standing are 1st, 2nd, 3rd.
- The app sets `final_position` on the winning entries when the sweepstake resolves. This is for display and for the organiser's reference only; **the platform makes no payout** and how the organiser splits the pot is entirely off-platform.

## Fixtures / all-matches view

The app must show a full fixtures list: all matches with date, kickoff time, teams, stage, venue, and status (scheduled / live / finished) with scores once played. Served entirely from cache. Players reach it after joining (see [user-roles.md](../spec/user-roles.md)). Highlight the player's own team's fixtures.

## Assumptions

- A free tier gives adequate 2026 World Cup coverage for v1; if it proves thin, a low-cost paid tier or API-Football upgrade is the fallback.
- The organiser is willing to act as the human safety net via manual override for the rare wrong/late result.
- User-facing pages are always served from cache, keeping us within free rate limits regardless of traffic.

## Open questions

- Final primary API choice once 2026 coverage can be tested live (football-data.org recommended).
- Is a paid tier needed if free World Cup coverage or uptime disappoints? Carried to the README open decisions.
- How sophisticated should tie-breaking be for `top_three` standings in v1? Recommended: stage-based with optional organiser adjustment at resolution.
