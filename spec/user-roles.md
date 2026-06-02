# User Roles and Permissions

> Part of the [World Cup Sweepstakes](project-spec.md) project. Defines the two roles, what each can see and do, and where responsibility for money sits.

## Money-separation rule, restated for roles

The platform never holds, touches, or routes the entry pot. In role terms this means: **the organiser is solely responsible for collecting all entry money and distributing all winnings.** The platform gives the organiser tools to *track* who has paid; it never receives, holds, or pays out a single penny of the pot. The player pays the organiser directly. See [payments-paypal.md](../docs/payments-paypal.md).

## The two roles

There are exactly two roles in v1: **Organiser** and **Player**. There is no platform-admin role in the product surface (operational admin is out of scope for this spec).

## Organiser

A registered account holder. An account is **required** because the organiser pays the Stripe software fee, which is tied to their account. See [billing-stripe.md](../docs/billing-stripe.md).

What an organiser can do:

- **Create and configure a sweepstake** - name it, choose the mechanic (random or pick-your-own), and set parameters. See [create-sweepstake-flow.md](../docs/create-sweepstake-flow.md).
- **Set the entry amount** - the pot stake per player. This is a display figure used to pre-fill the PayPal link; the platform never holds it.
- **Set the winner structure** - single winner, or 1st / 2nd / 3rd.
- **Paste and validate their PayPal link** - the link players will pay through, directly, outside the platform. Validated on setup so dead links are not generated.
- **Pay the software fee** - by card via Stripe, at creation, banded by player count.
- **Manage the draw** - run the random draw, or oversee pick-your-own allocation.
- **Mark players as paid / confirm receipt** - the organiser confirms, off-platform, that a player's entry payment arrived; this flips the entry's `payment_state` to `confirmed`. The platform records the state, never the money.
- **Override a result** - correct or set a match result if the data feed is wrong or late. See [worldcup-data.md](../docs/worldcup-data.md).
- **Close the sweepstake** - lock entries and finalise.
- **View everything in their own sweepstake** - all entries, payment states, standings, fixtures.

What an organiser is **responsible for** (and the platform is not):

- Collecting every entry payment from players, through their own payment method.
- Distributing all winnings to the winning player(s), through their own payment method.
- Resolving any dispute over payment or winnings. The platform is not a party to these.

What an organiser **cannot** do:

- Cause the platform to hold, escrow, or transfer pot money. The product offers no such function.
- See or manage other organisers' sweepstakes.

## Player

A lighter participant. No full account is required, but an **email is mandatory** (for login, fixtures/standings access, and knockout notifications), and the **Terms & Conditions must be accepted** at the point of joining.

What a player can do:

- **Join** via the shareable link or by entering the join code. See [sharing-and-join.md](../docs/sharing-and-join.md).
- **Provide an email** - required. It is how they log back in and how they are notified.
- **Accept the Terms & Conditions** - required, at join, before an entry is valid. See [terms-and-conditions.md](../docs/terms-and-conditions.md).
- **See their team** - the team assigned (random) or chosen (pick-your-own).
- **View fixtures and standings** - the all-matches view and their position in the sweepstake.
- **Self-mark "I've paid"** - after paying the organiser directly; this sets `payment_state` to `marked_paid` pending the organiser's confirmation.
- **Optionally upload a payment screenshot** - as evidence for the organiser, not a payment.
- **Receive emails** - join confirmation, payment-confirmed, and the knockout email when their team is out.

What a player **cannot** do:

- Configure the sweepstake, run the draw, override results, or confirm their own payment.
- Pay the entry money through the platform. They pay the organiser directly, outside it.
- See other sweepstakes they have not joined.

## Permissions matrix

| Capability | Organiser | Player |
| --- | --- | --- |
| Create / configure sweepstake | Yes | No |
| Set entry amount and winner structure | Yes | No |
| Paste / validate PayPal link | Yes | No |
| Pay Stripe software fee | Yes | No |
| Run draw / oversee allocation | Yes | No |
| Override a match result | Yes | No |
| Confirm receipt of an entry payment | Yes | No |
| Close the sweepstake | Yes | No |
| Join via link / code | n/a | Yes |
| Provide email + accept T&Cs | n/a | Yes (required) |
| See assigned / chosen team | Yes (all) | Yes (own) |
| View fixtures and standings | Yes | Yes |
| Self-mark "I've paid" | n/a | Yes |
| Receive knockout email | n/a | Yes |
| Cause platform to hold/move pot money | **No - impossible by design** | **No - impossible by design** |

## Assumptions

- One organiser per sweepstake; co-organisers are out of scope for v1.
- A player's identity is their email; the same email across sweepstakes is the same person.
- The organiser is a private individual collecting from friends or colleagues, which is what positions the PayPal flow as friends-and-family rather than commercial. See [payments-paypal.md](../docs/payments-paypal.md).

## Open questions

- Should an organiser be able to also join their own sweepstake as a player (take a team)? Likely yes; needs a clear rule that they still cannot confirm their own payment without it looking like self-dealing.
- Do we need a read-only "co-viewer" so a colleague can help the organiser track payments without full control? Deferred past v1.
