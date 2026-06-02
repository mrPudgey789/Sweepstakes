# Notifications

> Part of the [World Cup Sweepstakes](../spec/project-spec.md) project. Email notifications for v1: triggers, content, and how knockout is detected.

## Money-separation note

Notifications never move or reference platform-held money. The payment-confirmed email tells a player the **organiser** has confirmed receiving their entry directly; the platform is only reporting a state change, not a transaction it processed. See [payments-paypal.md](payments-paypal.md).

## Channel: email only for v1

Email is the only channel in v1. No SMS, push, or WhatsApp (see out-of-scope in [project-spec.md](../spec/project-spec.md)). This is exactly why a player's **email is required** at join (see [user-roles.md](../spec/user-roles.md)). Use a transactional email provider (e.g. Resend, Postmark, or the backend's built-in email) sent from a server-side function.

Each send is recorded as a `Notification` row against the player's `Entry` (see [data-model.md](../spec/data-model.md)), with a `type`, a `status` (queued / sent / failed), and a timestamp.

## The notifications

### 1. Knockout (primary trigger)

The headline feature: a player is emailed when **their team is knocked out**.

- **Trigger:** the team on the player's entry becomes eliminated. Detection is described below and in [worldcup-data.md](worldcup-data.md).
- **Content:** "Bad news, [Team] is out." Confirm the team and the stage they went out at, show where the player finished or still stands if relevant, and link back to the fixtures/standings view. Keep it light and good-humoured.
- **One per entry per elimination:** guard against duplicates so a re-poll or a recompute does not email twice for the same elimination (check for an existing `knockout` Notification on the entry before sending).

### 2. Join confirmation

- **Trigger:** a player completes the join flow (email given, T&Cs accepted). See [sharing-and-join.md](sharing-and-join.md).
- **Content:** confirm they have joined [sweepstake name], state their team (or "your team will be drawn soon" in random mode), restate the entry amount and that payment goes directly to the organiser via the shown link, and link back to the sweepstake. Include a sign-in / magic link so they can return easily.

### 3. Payment confirmed

- **Trigger:** the organiser confirms receipt of the player's entry, moving `payment_state` to `confirmed` (see [payments-paypal.md](payments-paypal.md)).
- **Content:** "You are in. The organiser has confirmed your entry for [sweepstake name]." Reinforce that the organiser confirmed receipt directly; the platform did not handle the money.

### 4. Optional round-by-round / standings updates

- **Trigger:** end of a tournament round, or a standings change, for sweepstakes the organiser has opted into.
- **Content:** a short digest of how the player's team did and their current position. Optional and off by default to avoid over-emailing; the organiser (or player) can enable it.

## How knockout is detected from the data layer

Knockout detection is owned by the data layer in [worldcup-data.md](worldcup-data.md); the notification system consumes its signal. In short:

1. The result poller or a manual override records a result.
2. The data layer updates team status: a team is marked `eliminated` either directly (the feed/override says so) or derived (it lost a knockout-stage match, or its group table makes qualification impossible).
3. When `Team.status` flips to `eliminated`, the system finds every `Entry` on that team across open sweepstakes and queues a `knockout` Notification for each, after the duplicate guard.

Because a manual override can also eliminate a team, overrides can trigger knockout emails. The override confirmation UI warns the organiser of this (see [worldcup-data.md](worldcup-data.md)).

## Sending mechanics

- Sends run from a **server-side function**, triggered by the result poller, the override action, the confirmation action, or the join action.
- **Idempotency:** before sending, check for an existing Notification of that type for that entry/event so retries and recomputes do not double-send. Mark `status = sent` on success, `failed` on error, and allow a retry of failed sends.
- **Queue, do not block:** queue the notification and send asynchronously so a burst of eliminations (a whole group going out at once) does not stall the request that triggered them.

## Where email lands in the data model

A player's email lives on the `Player` entity, required (see [data-model.md](../spec/data-model.md)). Every send is a `Notification` row linked to the `Entry`, giving a per-player, per-sweepstake audit of what was sent and when.

## Unsubscribe and minimal compliance

- All emails are **transactional** (tied to an action the player took by joining), which is the appropriate basis under UK PECR/GDPR for the join confirmation, payment confirmation, and knockout emails.
- The **optional standings/round digest is marketing-adjacent**: make it opt-in and include a working **unsubscribe** link that stops those updates without affecting the essential transactional emails.
- Every email shows the sending identity and a clear reason for receipt ("You are getting this because you joined [sweepstake]").
- Honour unsubscribe promptly and record it. Data and email usage is also covered in the [Terms & Conditions](terms-and-conditions.md), which require solicitor review.

## Assumptions

- Players provide a valid, reachable email; bounces are logged but not heavily managed in v1.
- Transactional emails do not require prior marketing consent because they are service messages for an action the player initiated.
- One knockout email per entry per elimination is sufficient; no escalation or reminders.

## Open questions

- Should round/standings digests be organiser-controlled (one toggle for the whole sweepstake) or player-controlled (each player opts in)? Recommended: organiser enables the feature, each player can still unsubscribe.
- Do we send the organiser any digests (e.g. pending payment confirmations)? Suggested in [payments-paypal.md](payments-paypal.md); confirm for v1.
- How aggressively do we handle hard bounces and invalid emails in v1? Recommended: log and surface to the organiser, no automated suppression beyond provider defaults.
