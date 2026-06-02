# Sharing and Joining

> Part of the [World Cup Sweepstakes](../spec/project-spec.md) project. How a sweepstake is shared and how a player joins.

## Money-separation note

Sharing and joining move no money. The join flow ends by **showing** the player the organiser's PayPal payment step; the payment itself happens directly between player and organiser, outside the platform. See [payments-paypal.md](payments-paypal.md).

## Two ways in: a unique link and a join code

Every sweepstake gets two access methods, generated when it becomes `open` (after the software fee is paid, see [create-sweepstake-flow.md](create-sweepstake-flow.md)):

1. **A unique shareable link.** Following it opens the join page for that specific sweepstake. Stored as `share_slug` on the Sweepstake.
2. **A short human-friendly join code.** A player can go to the app and type the code to find and join the sweepstake. Stored as `join_code`.

Both resolve to the same join flow.

## Link and code generation, and uniqueness

**Shareable link:**

- Form: `https://<app-domain>/j/<share_slug>`.
- `share_slug` is a URL-safe random string (for example a base62 token of 8–10 characters) generated at open time.
- Enforce uniqueness with a unique constraint on `share_slug`; on the rare collision, regenerate.
- The slug is unguessable enough that the link itself is the access token; no separate secret is needed to open the join page.

**Join code:**

- Form: a short, human-friendly, unambiguous code, for example 6 characters from a reduced alphabet that excludes easily-confused characters (no `0/O`, `1/I/L`), e.g. `WC7K9P`.
- Generated at open time, checked for uniqueness with a unique constraint, regenerated on collision.
- Case-insensitive on entry (normalise to upper case) so players can type it however they like.
- Short enough to read aloud or type from a screenshot.

## How it renders when pasted into Slack or WhatsApp

The shareable link must produce a clean preview when pasted into a Slack channel or WhatsApp group, because that is the primary distribution path (the reason for choosing a web app, see [project-spec.md](../spec/project-spec.md)).

- Serve proper **Open Graph / link-preview meta tags** on the join page: `og:title` (e.g. "Join the Marketing Team Sweepstake"), `og:description` (e.g. "World Cup sweepstake. Tap to join and get your team."), `og:image` (a branded card, optionally naming the sweepstake), and `og:url`.
- Because the React app is client-rendered, the join route needs **server-side rendering or pre-rendered meta tags** for the preview crawlers (Slack's and WhatsApp's bots do not run JavaScript). Use a small server function or an SSR/edge-rendered route for `/j/<slug>` that returns the meta tags, then hydrate the app. This is a known requirement to flag for the build.
- Keep the `og:image` generic enough to not leak who has joined or any payment detail.

## The join flow

```
Open link  OR  enter join code
   → Join page for the sweepstake
      → Provide email (required)
         → Accept Terms & Conditions (required)
            → Get team:
                 random mode  → team assigned (at draw time)
                 pick-your-own → choose an available team now
               → Shown the PayPal payment step (amount pre-filled)
```

Step detail:

1. **Arrive** via link or code. The join page shows the sweepstake name, organiser name, entry amount, mode, and winner structure so the player knows what they are joining.
2. **Provide email** (required). Used for login, fixtures/standings access, and the knockout email. See [user-roles.md](../spec/user-roles.md).
3. **Accept the Terms & Conditions** (required) before the entry is valid. Records `tc_accepted_at` on the Entry. See [terms-and-conditions.md](terms-and-conditions.md).
4. **Get a team.** In **random** mode the entry is created now and the team is assigned when the organiser runs the draw; the player is told their team is coming and can be emailed when drawn. In **pick-your-own** mode the player selects from the teams still available, claimed first-come-first-served (a team cannot be picked twice).
5. **Shown the payment step.** The player sees the organiser's PayPal link pre-filled with the entry amount and the "I've paid" control. Payment happens directly with the organiser, outside the platform; the platform only records state. See [payments-paypal.md](payments-paypal.md).

A join confirmation email is sent at this point (see [notifications.md](notifications.md)).

## Late joiners, closed, or full sweepstakes

- **Closed sweepstake** (`status = closed`): the join page shows "This sweepstake is closed" and offers no join action.
- **Full sweepstake** (reached `max_players` or the band cap from [billing-stripe.md](billing-stripe.md)): show "This sweepstake is full", and, if relevant, note that the organiser can upgrade the band to add more places.
- **After the draw, random mode:** decide and state a rule. Recommended: once the draw has run (`status = drawn`), new joins are closed, because all teams are allocated. Surface this as "The draw has already happened, so joining is closed."
- **Pick-your-own with no teams left:** treat as full; show "All teams have been taken".
- **Late joiner before draw/cutoff:** allowed normally; they are just another entry until the draw or close.

In every closed/full case the page should be friendly and suggest the player ask the organiser, rather than dead-ending.

## Assumptions

- The shareable link's slug is unguessable enough to act as the access token; no per-player invite tokens are needed for v1.
- Join codes are typed rarely compared to links, but are valuable for in-person sharing ("the code is WC7K9P").
- Server-side meta tags for `/j/<slug>` are in scope for the build, since link previews materially affect sharing.

## Open questions

- After a random draw, should late joins be hard-closed or allowed if spare teams remain (e.g. fewer players than teams)? Recommended: allow joins only until the draw runs, then close.
- Do we want per-player magic-link sign-in from the join email, so returning players skip re-entering anything? Recommended yes, ties to the email-required model.
- Should the join code expire or be rotatable if leaked? Deferred past v1.
