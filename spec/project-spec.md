# Project Specification - World Cup Sweepstakes App

> Master spec. This is the anchor document for the project. Every other document expands on a section here and links back to it.

## 1. Project overview and goals

A web app for running World Cup sweepstakes in offices and friend groups. An organiser creates a sweepstake, sets the parameters, and shares a link or join code. Players join, are given (or pick) a team, and follow that team through the tournament. The app shows fixtures and results and emails players when their team is knocked out.

The product targets the **summer 2026 men's World Cup**, hosted across the USA, Canada and Mexico. This is a fast build with a hard external deadline, so every choice favours pragmatic, shippable solutions over completeness.

Primary goals:

- Let a non-technical organiser stand up a working sweepstake in under five minutes.
- Make joining frictionless for players (open a link, give an email, accept terms, get a team).
- Keep players engaged through the tournament with fixtures, standings and a knockout email.
- Earn revenue through a flat software fee, while staying structurally clear of gambling-operator and payment-handling regulation.

## 2. The non-negotiable money-separation rule

**The platform never holds, touches, or routes the entry-money pot.**

Entry money is paid by players directly to the organiser, via the organiser's own PayPal (or PayPal.Me) link, entirely outside the platform. The platform's only revenue is a flat **software fee** charged to the organiser per sweepstake created, paid by card via Stripe.

This separation is the structural backbone of the product. It is what keeps the platform clear of UK gambling-operator and payment-handling regulation. Every document in this project respects and reinforces it. Nothing in any spec ever describes the platform collecting, holding, or paying out the pot. The platform records *state* (who has paid, who is confirmed); it never records or moves *money* belonging to the pot.

The Stripe software-fee flow and the PayPal entry flow are completely separate systems that must never be wired together. See [billing-stripe.md](../docs/billing-stripe.md) and [payments-paypal.md](../docs/payments-paypal.md).

> Note: this document describes a structure. The structure is what keeps the product on the right side of the line, but it is the [Terms & Conditions](../docs/terms-and-conditions.md), reviewed by a qualified UK solicitor, that must record it before the product takes real users or money. The structure does not by itself make the product lawful.

## 3. The two core mechanics

When creating a sweepstake the organiser chooses one of two assignment modes:

1. **Random team assignment (recommended default).** Teams are drawn and allocated to players automatically once the draw is run. Fair, fast, and the classic office-sweepstake experience.
2. **Pick your own team.** Players choose an available team on a first-come-first-served basis at join time.

The chosen mode is fixed per sweepstake and stored on the Sweepstake entity. See [data-model.md](data-model.md) and [create-sweepstake-flow.md](../docs/create-sweepstake-flow.md).

## 4. User roles at a glance

Two roles. Full detail in [user-roles.md](user-roles.md).

- **Organiser** - creates and configures the sweepstake, sets the entry amount, sets the winner structure, pastes and validates their PayPal link, pays the Stripe software fee, runs the draw, confirms receipt of entry payments, overrides a result if the data feed is wrong, and closes the sweepstake. The organiser is **solely responsible** for collecting entry money and distributing all winnings.
- **Player** - joins via link or code, provides an email (required), accepts the Terms & Conditions, sees their team, views fixtures and standings, and receives a knockout email. The player pays the organiser directly, outside the platform.

## 5. Features in scope for v1

- Organiser account creation and login (required for Stripe payment).
- Sweepstake creation wizard: mode, entry amount, winner structure, PayPal link, Stripe fee payment.
- Pricing bands for the software fee by player count (see section 8).
- Unique shareable link plus a short human-friendly join code per sweepstake.
- Lightweight player join: email + T&C acceptance, then team assignment or selection.
- Random draw and pick-your-own allocation.
- Fixtures list / all-matches view, standings and per-team progression from a free football API.
- Manual result override for the organiser when the feed is wrong or late.
- PayPal entry-payment display with the amount appended to the link; paid / unpaid / confirmed state machine (state only, never money).
- Email notifications: join confirmation, payment-confirmed, knockout. Optional round/standings updates.
- Terms & Conditions acceptance gate at join.

## 6. Explicitly out of scope for v1

- Any handling, holding, escrow, or routing of the entry pot. Permanently out of scope, by design.
- In-app payments between players, wallets, or balances.
- Native mobile apps (the web app is the product; links open cleanly in mobile browsers).
- SMS, push, or WhatsApp notifications (email only for v1; see [notifications.md](../docs/notifications.md)).
- Multiple tournaments or non-World-Cup competitions.
- Public leaderboards across sweepstakes, social feeds, or in-app chat.
- Automated payouts, refunds, or dispute resolution. Disputes are between participants.
- Multi-currency entry beyond what the organiser's own PayPal link supports.

## 7. Chosen stack and architecture sketch

**Frontend:** React (single-page web app). Chosen because the product lives on shareable links that must open cleanly from a Slack channel or WhatsApp group; a React web app gives a fast, installable-feeling experience without app-store friction.

**Backend (proposed, lightweight):** a managed Backend-as-a-Service to avoid running servers under deadline pressure. Recommended: **Supabase** (hosted Postgres + built-in auth + row-level security + edge functions). Justification: it gives a real relational database for the entities in [data-model.md](data-model.md), email/password and magic-link auth out of the box (covering both the heavier organiser account and the lighter email-only player join), and serverless functions for the few server-side jobs (Stripe webhook handling, result polling, sending email). Firebase is a viable alternative but its document model fits the relational sweepstake data less naturally. A bespoke Node/Express + Postgres stack is more work than the timeline justifies.

**Third-party services:**

- **Stripe** - software-fee card payments from organiser to platform only. See [billing-stripe.md](../docs/billing-stripe.md).
- **PayPal / PayPal.Me (and optionally Monzo.me, Revolut)** - entry payments, player to organiser, displayed only, never integrated for money movement. See [payments-paypal.md](../docs/payments-paypal.md).
- **Football data API** - fixtures and results, with caching and a manual-override fallback. See [worldcup-data.md](../docs/worldcup-data.md).
- **Transactional email** (e.g. Resend, Postmark, or Supabase's email) - notifications. See [notifications.md](../docs/notifications.md).

Architecture sketch:

```
[React SPA] ── reads/writes ──> [Supabase: Postgres + Auth + RLS]
     │                                  │
     │                                  ├── Edge function: Stripe webhook (software fee)
     │                                  ├── Edge function: result poller (cron) ──> [Football API] ──> cache
     │                                  └── Edge function: email sender ──> [Email provider]
     │
     └── displays organiser PayPal link (no money flows through the platform)
```

The two money paths sit on opposite sides of the diagram and never cross: Stripe (organiser to platform) is server-side and integrated; PayPal (player to organiser) is a displayed link only.

## 8. Pricing and amounts

- **Software fee (organiser to platform, via Stripe), banded by player count:** 1–10 players = £5, 11–50 = £10, 50+ = £20. See [billing-stripe.md](../docs/billing-stripe.md) for how the band is determined and the grow-past-band edge case.
- **Entry amount (player to organiser, via PayPal):** set freely by the organiser per sweepstake. This is the pot stake and the platform never touches it. See [payments-paypal.md](../docs/payments-paypal.md).

## 9. Map of every document in this project

| Document | Covers |
| --- | --- |
| [spec/project-spec.md](project-spec.md) | This master spec. |
| [spec/data-model.md](data-model.md) | Entities, fields, relationships. |
| [spec/user-roles.md](user-roles.md) | Organiser vs player permissions. |
| [docs/create-sweepstake-flow.md](../docs/create-sweepstake-flow.md) | Step-by-step organiser creation flow. |
| [docs/payments-paypal.md](../docs/payments-paypal.md) | Entry payments, player to organiser, via PayPal. |
| [docs/billing-stripe.md](../docs/billing-stripe.md) | Software fee, organiser to platform, via Stripe. |
| [docs/worldcup-data.md](../docs/worldcup-data.md) | Tournament data, results, knockout detection. |
| [docs/sharing-and-join.md](../docs/sharing-and-join.md) | Link and join-code generation and the join flow. |
| [docs/notifications.md](../docs/notifications.md) | Email notifications, triggers and content. |
| [docs/terms-and-conditions.md](../docs/terms-and-conditions.md) | Lawyer-ready T&C template (requires solicitor review). |

## 10. Open questions and assumptions

Assumptions:

- The organiser is a private individual collecting from friends or colleagues, not a business running a commercial lottery.
- A free football API will provide adequate 2026 World Cup coverage for v1; the design tolerates feed unreliability through caching and manual override.
- One organiser owns one sweepstake; co-organisers are not needed for v1.
- Players are happy to receive transactional email and can be reached at the address they provide.

Open questions (carried into the README open-decisions list):

- Should the software-fee band be declared by the organiser up front, or computed from actual joins by a cutoff? See the recommendation in [billing-stripe.md](../docs/billing-stripe.md).
- What happens to a sweepstake that grows past its paid band (top-up charge, or honour the original)? See [billing-stripe.md](../docs/billing-stripe.md).
- Which football API is the final primary choice, and is a paid tier needed if free coverage proves thin? See [worldcup-data.md](../docs/worldcup-data.md).
- Currency handling if an organiser uses a non-GBP PayPal account.

## 11. Legal note (read before launch)

The [Terms & Conditions](../docs/terms-and-conditions.md) in this project are a **lawyer-ready template only**. They must be reviewed and signed off by a qualified UK solicitor specialising in gambling and fintech before the product takes any real users or money. Nothing in this project is final, certified, or guaranteed to be "within the law". The money-separation structure is what the T&Cs document; the T&Cs record that structure, they do not by themselves make it lawful.
