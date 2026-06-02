# Entry Payments via PayPal (player → organiser)

> Part of the [World Cup Sweepstakes](../spec/project-spec.md) project. The exact peer-to-peer flow by which a player pays their entry to the organiser, entirely outside the platform.

## Money-separation rule, central to this document

This is the document where the rule matters most. **The platform never sees, holds, routes, or pays out the entry pot.** Every penny of entry money moves directly from the player to the organiser, through the organiser's own payment method. The platform only ever records **state**: whether a player says they have paid, and whether the organiser has confirmed receipt. There is no platform balance, escrow, wallet, or payout. If this document ever seems to describe the platform touching the money, it is wrong and must be corrected.

The contrasting, fully-integrated money path is the **software fee**, organiser to platform, via Stripe. That is a separate system. See [billing-stripe.md](billing-stripe.md). The two are never wired together.

## The peer-to-peer flow

```
Player joins (email + accept T&Cs)
   → Player is shown the organiser's PayPal link, pre-filled with the entry amount
      → Player pays the organiser directly, outside the platform
         → Player self-marks "I've paid"
            → Organiser confirms receipt (off-platform check of their PayPal)
               → Player's status locks to "in / paid" and lights up
```

At no point does the platform receive money or a payment notification from PayPal. The player opens PayPal (or the organiser's chosen provider), pays, and comes back. The app records the *claim* and the *confirmation*, nothing more.

## The payment state machine

Stored as `payment_state` on the `Entry` entity (see [data-model.md](../spec/data-model.md)). Three states:

| State | Meaning | Set by | Trigger |
| --- | --- | --- | --- |
| `unpaid` | No payment claimed yet. | system | Default on join. |
| `marked_paid` | Player says they have paid; organiser has not yet confirmed. | player | Player taps "I've paid". |
| `confirmed` | Organiser has checked their PayPal and confirmed receipt. | organiser | Organiser taps "Confirm receipt". |

Transitions:

```
unpaid ──player taps "I've paid"──► marked_paid ──organiser confirms──► confirmed
   ▲                                     │
   └──────organiser rejects / resets─────┘
```

- Only `confirmed` should be treated as truly paid. `marked_paid` is an unverified claim.
- The organiser can reset a `marked_paid` entry back to `unpaid` if no payment arrived (for example a player tapped the button by mistake).
- A `confirmed` entry "lights up" in the UI (green / paid badge) for both the player and the organiser.

## The "I paid but not yet confirmed" gap

There is an inherent gap between a player tapping "I've paid" (`marked_paid`) and the organiser confirming (`confirmed`). The organiser has to go and look at their actual PayPal activity. Handle it like this:

- **Visible pending state.** Show `marked_paid` entries clearly as "Awaiting confirmation" to the player, so they know the ball is in the organiser's court.
- **Organiser nudge.** Surface a count of "X players are waiting for you to confirm payment" in the organiser dashboard, and optionally email the organiser a daily digest of pending confirmations.
- **Optional screenshot upload.** Let the player attach a screenshot of their PayPal confirmation (`payment_proof_url` on Entry) to help the organiser match it. This is **evidence for the organiser, not a payment**, and the platform still does not treat it as proof of receipt. The organiser's confirmation remains the source of truth.
- **No auto-confirm.** The app must never auto-advance `marked_paid` to `confirmed` on a timer or on a screenshot. Only the organiser confirms.

## Why the source of truth is manual confirmation

As noted in [create-sweepstake-flow.md](create-sweepstake-flow.md), the pre-filled amount on a PayPal.Me link is **editable by the payer and not enforced by PayPal**. A player could open `paypal.me/handle/10`, change it to £5, and send the wrong amount, or pay a different person entirely. Because of this, neither the existence of the link nor the player opening it is evidence of payment. The only reliable signal is the organiser looking at their own PayPal activity and confirming the money arrived. The state machine reflects this: `confirmed` requires a human, off-platform check.

## PayPal friends-and-family vs goods-and-services

PayPal offers two transfer types and the distinction matters here:

- **Friends and family (personal payment).** No buyer/seller protection, typically no fee for the sender when funded from balance or bank, and framed as a gift or personal transfer between people who know each other. This is the appropriate model for an office or friend-group sweepstake, because the organiser is a **private individual collecting a personal contribution from friends or colleagues**, not selling a product or service.
- **Goods and services.** Adds buyer protection and a seller fee, and frames the payee as a merchant. This is **not** appropriate here, because the organiser is not a merchant and there is no good or service being sold by the organiser.

Guidance to surface in the UI: present the entry payment as a personal contribution between friends, and avoid any language that frames the organiser as a seller or the platform as a marketplace. This reinforces both the friends-and-family framing and the structural position that the platform is software only. Note that PayPal.Me links default the payer to a choice; the app cannot force the type, so this is guidance, not enforcement. The [Terms & Conditions](terms-and-conditions.md) must make clear the platform is not a party to these transfers.

## Payment-agnostic option

The organiser is not locked to PayPal. The app should let the organiser paste **any** payment link and simply display it:

- **PayPal.Me** - supports the amount suffix (`/<amount>`); preferred default.
- **Monzo.me** - a personal payment link; display it, optionally with the amount per Monzo's URL scheme if reliable, otherwise show the amount as text.
- **Revolut** (revolut.me / `@` tag) - display the link, show the amount as text.

In every case the platform only **displays** the link. It does not integrate with the provider, receive webhooks, or learn whether money moved. The state machine above is identical regardless of provider, because confirmation is always the organiser's manual act. Validate the link on setup as described in [create-sweepstake-flow.md](create-sweepstake-flow.md).

## Disputes are between participants

Any disagreement about an entry payment (a player says they paid but the organiser cannot find it, an organiser collects but does not pay out winnings, a wrong amount was sent) is **between the participants**. The platform is not a party to these transfers and is **not responsible** for resolving them. The app should:

- State this plainly at the payment step and in the [Terms & Conditions](terms-and-conditions.md).
- Provide the state and any optional screenshot as a neutral record to help participants sort it out themselves.
- Never offer refunds, chargebacks, mediation, or guarantees on the pot. The platform has no money to refund, by design.

## What the platform records vs never records

| The platform records | The platform never records or does |
| --- | --- |
| `payment_state` (unpaid / marked_paid / confirmed) | The pot money itself |
| Timestamps of the claim and confirmation | A PayPal balance or transaction |
| An optional screenshot as evidence | Any payout, refund, or transfer of the pot |
| The displayed payment link | A webhook or API call to PayPal/Monzo/Revolut about money |

## Assumptions

- The organiser checks their PayPal activity and confirms receipt in a timely way; the nudge mechanisms exist to encourage this.
- Players use the same name/handle they are known by, helping the organiser match payments. (Matching is the organiser's job, not the platform's.)
- A single currency per sweepstake, matching the organiser's payment account.

## Open questions

- Should screenshots be auto-deleted after confirmation for data minimisation? See the related question in [data-model.md](../spec/data-model.md) and the data-usage section of [terms-and-conditions.md](terms-and-conditions.md).
- Should the app let a player retract a "marked_paid" claim themselves, or only the organiser? Recommended: allow the player to retract while still `marked_paid`.
- For non-PayPal providers, how hard should we try to pre-fill the amount vs always showing it as text? Recommended: text-only amount for non-PayPal to keep it robust.
