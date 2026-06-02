# Data Model

> Part of the [World Cup Sweepstakes](project-spec.md) project. Defines the entities, their fields, and their relationships.

## Money-separation rule, restated for this layer

**No entity in this data model ever stores, holds, or moves player pot money.** The only money the platform records is the organiser's Stripe software-fee payment (the `Payment` entity below). Entry payments between players and the organiser are recorded as **state** (paid / unpaid / confirmed flags on `Entry`), never as amounts the platform holds or transfers. The `entry_amount` field on `Sweepstake` is a display figure used to pre-fill the organiser's PayPal link; it is not a balance the platform controls.

## Entity relationship overview

```
Organiser 1───* Sweepstake 1───* Entry *───1 Player
                    │   │              │
                    │   │              └──1 Team (assigned or chosen)
                    │   └──1 Payment (Stripe software fee)
                    │
Team *──────────────┘ (Teams belong to the global Tournament, referenced per Sweepstake)

Tournament 1───* Team
Tournament 1───* Match 1───1 Result
Match *───2 Team (home, away)

Entry 1───* Notification
Sweepstake 1───* Standing (derived ranking per sweepstake)
```

Key relationships in words:

- An **Organiser** owns many **Sweepstakes**.
- A **Sweepstake** has many **Entries**; each **Entry** belongs to one **Player** and references one **Team**.
- A **Sweepstake** has exactly one **Payment** (the Stripe software fee paid at creation).
- **Teams**, **Matches** and **Results** belong to the global **Tournament** and are shared across all sweepstakes (the World Cup is the same for everyone). A sweepstake references teams; it does not copy them.
- **Standings** are derived per sweepstake from match results and the sweepstake's allocation.
- **Notifications** are sent to a player in the context of an entry.

## Entities

### Organiser

The account holder who creates and runs sweepstakes. A full account is required because the Stripe software-fee payment is tied to it.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `email` | string | Unique, used for login. |
| `auth_id` | uuid | Reference to the auth provider (Supabase Auth). |
| `display_name` | string | Optional, shown to players as the organiser name. |
| `paypal_link` | string | The organiser's PayPal.Me or PayPal link. Validated on entry. Display only. |
| `created_at` | timestamp | |

Note: `paypal_link` is also stored per `Sweepstake` (below) so an organiser can use different links for different sweepstakes; the organiser-level value is a convenience default.

### Player

A lighter participant record. No password is strictly required (magic-link / email login), but the email is mandatory.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `email` | string | **Required.** Used for login, fixtures access, and knockout notifications. |
| `display_name` | string | Optional, shown on standings. |
| `created_at` | timestamp | |

A player may appear in multiple sweepstakes; the link between a player and a sweepstake is the `Entry`.

### Sweepstake

The central configuration object.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `organiser_id` | uuid (FK → Organiser) | |
| `tournament_id` | uuid (FK → Tournament) | Always the 2026 World Cup for v1. |
| `name` | string | E.g. "Marketing Team Sweepstake". |
| `mode` | enum | `random` or `pick_your_own`. The core mechanic. |
| `entry_amount` | decimal | The pot stake per player, in the organiser's currency. **Display only** - used to pre-fill the PayPal link. The platform never holds this. |
| `currency` | string | ISO code, e.g. `GBP`. Matches the organiser's PayPal currency. |
| `winner_structure` | enum | `single` (1 winner) or `top_three` (1st / 2nd / 3rd). |
| `paypal_link` | string | The organiser's PayPal.Me / PayPal link for this sweepstake. Display only. |
| `join_code` | string | Short human-friendly code (see [sharing-and-join.md](../docs/sharing-and-join.md)). Unique. |
| `share_slug` | string | Unique slug for the shareable link. |
| `status` | enum | `draft`, `open`, `drawn`, `closed`. |
| `max_players` | integer | Optional cap. |
| `created_at` | timestamp | |
| `drawn_at` | timestamp | When the random draw was run (null for pick-your-own until full or closed). |

The Sweepstake holds its **mode** (`mode`), **entry amount** (`entry_amount`), **winner configuration** (`winner_structure`), **join code** (`join_code`), and **organiser PayPal link** (`paypal_link`) as required by the brief.

### Team

A national team in the tournament. Belongs to the global Tournament; referenced, not copied, by sweepstakes.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `tournament_id` | uuid (FK → Tournament) | |
| `name` | string | E.g. "Brazil". |
| `code` | string | FIFA / ISO code, e.g. `BRA`. |
| `group` | string | Group letter (A–L for the 48-team format). |
| `crest_url` | string | Optional badge image. |
| `status` | enum | `active`, `eliminated`. Drives knockout detection. |
| `eliminated_at` | timestamp | Null until knocked out. |
| `external_ref` | string | The team's ID in the chosen football API, for syncing. |

### Entry (Assignment)

Links a player to a sweepstake and a team. Holds the entry payment **state** (never money).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `sweepstake_id` | uuid (FK → Sweepstake) | |
| `player_id` | uuid (FK → Player) | |
| `team_id` | uuid (FK → Team) | Assigned (random) or chosen (pick-your-own). Null until allocated. |
| `payment_state` | enum | `unpaid`, `marked_paid`, `confirmed`. State only. See [payments-paypal.md](../docs/payments-paypal.md). |
| `marked_paid_at` | timestamp | When the player self-marked "I've paid". |
| `confirmed_at` | timestamp | When the organiser confirmed receipt. |
| `payment_proof_url` | string | Optional screenshot the player may upload. No money, just evidence. |
| `tc_accepted_at` | timestamp | When the player accepted the T&Cs. Required and non-null for a valid entry. |
| `final_position` | integer | Set when the sweepstake resolves: 1, 2, 3, or null. Drives "you won" display, not a payout. |
| `created_at` | timestamp | |

Uniqueness: one entry per player per sweepstake. In pick-your-own, one team per sweepstake (a team cannot be picked twice).

### Match (Fixture)

A tournament fixture. Global, shared across sweepstakes.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `tournament_id` | uuid (FK → Tournament) | |
| `home_team_id` | uuid (FK → Team) | |
| `away_team_id` | uuid (FK → Team) | |
| `stage` | enum | `group`, `round_of_32`, `round_of_16`, `quarter`, `semi`, `final`, `third_place`. |
| `kickoff_at` | timestamp | |
| `venue` | string | |
| `status` | enum | `scheduled`, `live`, `finished`. |
| `external_ref` | string | Match ID in the football API. |

### Result

The outcome of a match. Separated from Match so a manual override can coexist with the feed value.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `match_id` | uuid (FK → Match) | One result per match. |
| `home_score` | integer | |
| `away_score` | integer | |
| `winner_team_id` | uuid (FK → Team) | Null for a draw at group stage. |
| `source` | enum | `feed` or `manual_override`. Manual override wins if present. See [worldcup-data.md](../docs/worldcup-data.md). |
| `overridden_by` | uuid (FK → Organiser) | Null unless manually set. |
| `recorded_at` | timestamp | |

### Standing / Ranking

A derived ranking per sweepstake, computed from results and the allocation. Stored (materialised) for fast display and recomputed when results change.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `sweepstake_id` | uuid (FK → Sweepstake) | |
| `entry_id` | uuid (FK → Entry) | The player/team row being ranked. |
| `rank` | integer | Current position within the sweepstake. |
| `team_stage` | enum | How far the team has progressed (mirrors Match stages). |
| `is_eliminated` | boolean | Mirrors the team status. |
| `computed_at` | timestamp | |

Ranking logic lives in [worldcup-data.md](../docs/worldcup-data.md); the winner structure (`single` vs `top_three`) determines how many positions resolve to winners.

### Notification

A record of an email sent (or queued) to a player.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `entry_id` | uuid (FK → Entry) | The player/sweepstake context. |
| `type` | enum | `join_confirmation`, `payment_confirmed`, `knockout`, `standings_update`. |
| `channel` | enum | `email` (only value for v1). |
| `status` | enum | `queued`, `sent`, `failed`. |
| `sent_at` | timestamp | |
| `payload` | json | Rendered subject/body or template variables. |

See [notifications.md](../docs/notifications.md).

### Payment (Stripe software fee - never the pot)

The single record of money the platform handles: the organiser's software fee. **This is never the entry pot.**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `sweepstake_id` | uuid (FK → Sweepstake) | One payment per sweepstake. |
| `organiser_id` | uuid (FK → Organiser) | |
| `stripe_payment_intent_id` | string | Stripe reference. |
| `band` | enum | `1_10`, `11_50`, `50_plus`. Drives the amount. |
| `amount` | decimal | £5, £10, or £20 per band. |
| `currency` | string | `GBP`. |
| `status` | enum | `pending`, `succeeded`, `failed`, `refunded`. |
| `paid_at` | timestamp | |

This entity exists only for the software fee. There is deliberately **no** entity anywhere in this model for entry-pot money, payouts, balances, or winnings amounts. Player payment is captured solely as the `payment_state` enum on `Entry`. See [billing-stripe.md](../docs/billing-stripe.md).

### Tournament

The competition itself. One row for v1 (the 2026 World Cup).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `name` | string | "FIFA World Cup 2026". |
| `external_competition_ref` | string | The competition ID in the chosen football API. |
| `starts_at` / `ends_at` | timestamp | Tournament window. |

## Assumptions

- Teams, matches and results are global and shared; sweepstakes only reference them. This avoids duplicating tournament data per sweepstake and keeps result updates in one place.
- Standings are materialised for performance and recomputed on result change rather than calculated on every page load.
- A player record is keyed by email; the same person joining two sweepstakes reuses one player record.

## Open questions

- Should `payment_proof_url` (the optional screenshot) be retained after confirmation, or purged for data-minimisation? Flagged for the T&C / data-usage review.
- Do we need a soft-delete / audit trail on `Result` overrides for transparency to players? Recommended but not required for v1.
- Should `entry_amount` support multiple currencies per organiser, or is one currency per organiser sufficient for v1? See the open question in [project-spec.md](project-spec.md).
