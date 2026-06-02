# Software Fee via Stripe (organiser → platform)

> Part of the [World Cup Sweepstakes](../spec/project-spec.md) project. How the platform earns money: a flat software fee charged to the organiser at sweepstake creation.

## Money-separation rule, central to this document

**This Stripe flow is for the software fee only. It must never be wired to the entry pot.** The only money the platform ever handles is this fee, paid by the **organiser** to the **platform**, by card, to use the software. The entry pot moves separately and directly between players and the organiser via PayPal, and the platform never touches it. See [payments-paypal.md](payments-paypal.md). If any part of the Stripe integration ever appears to collect or hold entry money, it is wrong by design.

## What is charged

A **flat fee per sweepstake created**, charged once, up front, on the organiser's card via Stripe, at creation time (step 7 of [create-sweepstake-flow.md](create-sweepstake-flow.md)). Paying the fee is what moves the sweepstake from `draft` to `open`.

### Pricing bands by player count

| Band | Players | Software fee |
| --- | --- | --- |
| `1_10` | 1–10 | £5 |
| `11_50` | 11–50 | £10 |
| `50_plus` | 50+ | £20 |

Stored as `band` and `amount` on the `Payment` entity (see [data-model.md](../spec/data-model.md)).

## How the band is determined

Two options, with a clear recommendation.

**Option A - Organiser declares expected size up front (recommended).**
At creation the organiser picks the expected player count, which sets the band and the fee, and they pay before the sweepstake opens. Clean, simple, and it lets the charge happen at the natural moment (creation), with no later billing surprises.

- Pros: single charge, single moment, no card-on-file needed later, matches the "pay to open" flow.
- Cons: an organiser could under-declare; needs the grow-past-band rule below.

**Option B - Compute from actual joins by a cutoff.**
Open the sweepstake first, count real joins at a deadline, then charge the matching band.

- Pros: always accurate to actual size.
- Cons: requires holding the organiser's card on file and charging later, adds a billing step after the fun part, and complicates the "pay to open" gate. More moving parts under deadline pressure.

**Recommendation: Option A.** Declare up front, pay up front, open immediately. It is the simplest shippable flow and fits the creation wizard. Handle the honesty gap with the edge-case rule below.

## Edge case: a sweepstake grows past its paid band

With Option A, a sweepstake can exceed the band the organiser paid for (they declared 1–10, then 14 people join). Options:

1. **Soft cap (recommended for v1).** Enforce the declared band as a join cap. When the sweepstake is full for its band, new joins are blocked with a message: "This sweepstake is full. The organiser can upgrade to add more players." The organiser can then pay the band difference to raise the cap. This keeps revenue aligned with size and needs no card-on-file.
2. **Top-up charge.** Detect the overflow and prompt the organiser to pay the difference (£5 to go from the £5 band to the £10 band, etc.) before the extra players are allocated.
3. **Honour the original.** Let it grow and absorb the difference. Simplest for the user, leaks revenue; acceptable only if the gaps are small.

**Recommendation:** soft cap (option 1) as the default, with an easy in-product upgrade that charges the band difference. Flag the final choice in the README open decisions.

## Indicative margin after Stripe fees

Stripe's standard UK online card rate is **1.5% + 20p** per successful charge for UK cards (higher for EU/international cards: roughly 2.5% + 20p and 3.25% + 20p respectively). Using the UK standard rate:

| Band | Fee charged | Stripe cost (1.5% + 20p) | Net to platform | Margin |
| --- | --- | --- | --- | --- |
| 1–10 | £5.00 | £0.28 | £4.72 | ~94% |
| 11–50 | £10.00 | £0.35 | £9.65 | ~97% |
| 50+ | £20.00 | £0.50 | £19.50 | ~98% |

Notes:

- Figures are indicative and assume UK cards at the standard rate. EU/international cards reduce net slightly (e.g. the £5 band nets about £4.55 at the EU rate). Confirm the live rate in the Stripe dashboard before launch.
- The fixed 20p hurts the £5 band proportionally most, which is the main argument for not pricing the lowest band any lower.
- There are no platform costs for the entry pot, because the platform never handles it.

## Integration shape

- Use **Stripe Checkout** or a **Payment Intent** with Stripe Elements in the React app. Checkout is faster to ship and offloads PCI scope.
- Create the Payment Intent server-side (Supabase edge function) for the banded amount, in GBP.
- On success, Stripe fires a **webhook** (`payment_intent.succeeded`) to a server-side endpoint; the handler marks the `Payment` as `succeeded` and flips the Sweepstake to `open`. Do not rely on the client redirect alone.
- Store `stripe_payment_intent_id` on the `Payment` record for reconciliation.
- Refunds (e.g. organiser created in error) are a manual operational action via the Stripe dashboard for v1; there is no in-app refund flow.

This entire integration concerns the software fee only. No Stripe object here ever represents entry-pot money.

## Assumptions

- Organisers pay by card; no invoicing or bank transfer for v1.
- GBP only for the software fee.
- One Payment per Sweepstake; an upgrade (band difference) is a second Payment linked to the same Sweepstake.

## Open questions

- Final band-determination choice: Option A up-front declaration (recommended) vs Option B compute-from-joins.
- Final grow-past-band handling: soft cap (recommended) vs top-up vs honour-original.
- Do we offer any refund path in-product, or keep refunds dashboard-only for v1? Recommended: dashboard-only.
