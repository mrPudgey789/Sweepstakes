# Creating a Sweepstake - Organiser Flow

> Part of the [World Cup Sweepstakes](../spec/project-spec.md) project. The step-by-step flow an organiser follows to stand up a sweepstake.

## Money-separation rule in this flow

Two amounts appear in this flow and they must never be confused:

- The **entry amount** is the pot stake each player pays the **organiser**, directly via PayPal, outside the platform. The platform never holds it.
- The **software fee** is what the **organiser** pays the **platform**, by card via Stripe, to create the sweepstake.

The flow below charges only the software fee through the platform. It never collects the pot. See [billing-stripe.md](billing-stripe.md) and [payments-paypal.md](payments-paypal.md).

## The flow at a glance

```
Sign up / log in
   → Create sweepstake (name it)
      → Choose mechanic (random recommended, or pick-your-own)
         → Set entry amount
            → Set winner structure (single, or 1st/2nd/3rd)
               → Paste & validate PayPal / PayPal.Me link
                  → Pay the Stripe software fee
                     → Get shareable link + join code
```

## Step 1 - Sign up or log in

The organiser must have an account, because the software fee is tied to it (see [user-roles.md](../spec/user-roles.md)). Email/password or magic-link is fine. A returning organiser logs straight in and skips to step 2.

## Step 2 - Create the sweepstake and name it

The organiser gives the sweepstake a name (e.g. "Marketing Team Sweepstake"). A `Sweepstake` record is created in `draft` status. Nothing is shareable yet and no fee is charged.

## Step 3 - Choose the mechanic

The organiser picks one mode (stored as `mode` on the Sweepstake):

- **Random team assignment (recommended, default-selected).** Teams are drawn and allocated automatically once the draw runs. The UI should pre-select this and label it "Recommended".
- **Pick your own team.** Players choose an available team at join time, first-come-first-served.

See [project-spec.md](../spec/project-spec.md) section 3.

## Step 4 - Set the entry amount

The organiser sets the pot stake each player will pay. Offer quick-pick presets (for example £5, £10, £15, £20) with a free-entry field so any amount is allowed, and a currency that matches the organiser's PayPal account (default GBP).

This amount is **display only**. It is used to pre-fill the PayPal link (step 6) and to show players what to pay. The platform never holds it.

> Note on the brief's figures: the £5 / £10 / £15 / £20 quick-picks here are example **entry** amounts. They are unrelated to the **software-fee** bands (£5 / £10 / £20 by player count) in [billing-stripe.md](billing-stripe.md). Keep the two clearly separated in the UI so the organiser never confuses the pot stake with the platform fee.

## Step 5 - Set the winner structure

The organiser chooses how the sweepstake resolves (stored as `winner_structure`):

- **Single winner** - one team's player wins.
- **1st / 2nd / 3rd** - three placed positions.

This drives how standings resolve to winners (see [worldcup-data.md](worldcup-data.md)). It does **not** set any payout the platform makes; how the organiser splits the pot between placed players is entirely the organiser's business, off-platform.

## Step 6 - Paste and validate the PayPal link

The organiser pastes their **PayPal.Me** handle or PayPal link. This is the link players will pay through, directly.

**Validation on setup** (so dead links are never generated):

- Accept either a full `https://paypal.me/<handle>` URL or a bare `<handle>` and normalise to the canonical form.
- Check the handle matches PayPal.Me's allowed character set and length.
- Do a lightweight reachability check on the profile URL (for example a HEAD request to `https://paypal.me/<handle>`) to catch obvious typos and non-existent handles. Treat a non-resolving handle as a blocking validation error with a clear "we could not find this PayPal.Me page" message.
- Store the validated handle and currency on the Sweepstake (`paypal_link`, `currency`).

### Dynamically updating the PayPal.Me link with the amount

PayPal.Me supports an amount suffix: `paypal.me/<handle>/<amount>` opens the payment screen pre-filled with that amount, in the handle's currency. The app constructs the per-sweepstake payment link by appending the entry amount:

```
https://paypal.me/<handle>/<entry_amount>
e.g. entry amount £10, handle "janedoe"  ->  https://paypal.me/janedoe/10
```

Build this link from `entry_amount` and the validated handle, and match the organiser's currency. If the organiser later edits the entry amount (while still in draft), regenerate the link.

**Important caveat to surface in the UI and to players:** the pre-filled amount is **editable by the payer and is not enforced by PayPal**. A player can change it or pay a different amount. Therefore the source of truth for "paid" is **never** the link, it is the **organiser's manual confirmation** of receipt. The app must not treat a generated link, or a player opening it, as evidence of payment. See the state machine in [payments-paypal.md](payments-paypal.md).

The app may also let the organiser paste a non-PayPal link (Monzo.me, Revolut) and simply display it, in which case the amount-append behaviour depends on that provider's URL scheme. See the payment-agnostic option in [payments-paypal.md](payments-paypal.md).

## Step 7 - Pay the Stripe software fee

The organiser pays the flat software fee by card via Stripe. The amount is set by the player-count band: 1–10 = £5, 11–50 = £10, 50+ = £20. How the band is determined (declared up front vs computed from joins) and the grow-past-band edge case are covered in [billing-stripe.md](billing-stripe.md).

On a successful Stripe payment (confirmed by webhook), the Sweepstake moves from `draft` to `open` and becomes shareable. **This Stripe charge is the software fee only and is never wired to the entry pot.**

## Step 8 - Get the shareable link and join code

Once `open`, the app generates and shows:

- A **unique shareable link** (`share_slug`) that opens the join page.
- A short **human-friendly join code** (`join_code`) a player can type in to find and join.

The organiser copies these into Slack, WhatsApp, or email. Link/code generation, uniqueness, and link previews are covered in [sharing-and-join.md](sharing-and-join.md). What players see when they follow the link is covered there and in [payments-paypal.md](payments-paypal.md).

## Post-creation: running the draw

- **Random mode:** once enough players have joined (or at a cutoff the organiser triggers), the organiser runs the draw. The app shuffles available teams and assigns one per entry, sets `drawn_at`, and moves the Sweepstake to `drawn`. Players are shown their team and can be emailed.
- **Pick-your-own mode:** teams are claimed as players join; no separate draw step. The organiser closes the sweepstake when full or at the cutoff.

## Assumptions

- The organiser's PayPal account currency is consistent for a given sweepstake.
- Quick-pick entry amounts are suggestions; the organiser may set any amount.
- The draw is run by the organiser rather than fully automatic, to give them control over the cutoff.

## Open questions

- Should the random draw run automatically at a deadline, or always require the organiser to trigger it? Recommended: organiser-triggered with an optional auto-draw at a set time.
- For non-PayPal links, should the app attempt amount pre-fill per provider, or always display the bare link and show the amount as text? Recommended: bare link plus a prominent "Pay £X" label to avoid brittle per-provider URL handling.
- Should an organiser be allowed to edit the entry amount after the sweepstake is `open` (players may already have paid)? Recommended: lock the entry amount once `open`.
