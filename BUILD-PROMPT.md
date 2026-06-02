# Claude Code build prompt

Hello. On my Desktop there is a folder `Projects`, and inside it a folder called `Sweepstakes`. Please open it and start by reading everything in it.

## Step 1: Read the spec
Read `README.md` first, then every file under `spec/` and `docs/`. This is a complete spec-first design for a World Cup sweepstakes web app. Treat these documents as the source of truth and follow them closely. In particular, respect the non-negotiable rule that the platform never holds, touches, or routes the entry-money pot: entry money goes directly from players to the organiser via the organiser's own PayPal link, and the platform's only revenue is a flat software fee charged to the organiser via Stripe. Never wire the Stripe flow to the entry pot.

If anything in the docs is ambiguous, ask me before guessing.

## Step 2: Build the app
Build the v1 app described in the spec, into this same `Sweepstakes` folder.

- Frontend: React, as specified in `spec/project-spec.md`.
- Backend: the lightweight managed backend recommended in the spec (Supabase: Postgres, auth, edge functions). Implement the data model in `spec/data-model.md` as SQL migrations.
- Implement: organiser account and the create-sweepstake wizard, the two mechanics (random and pick-your-own), the Stripe software-fee flow with the pricing bands, the PayPal entry-payment display and the paid/unpaid/confirmed state machine (state only, never money), the unique link plus join code and join flow, the fixtures and standings views from the football API with caching and manual override, and the email notifications (knockout, join, payment-confirmed).
- Use the recommended choices from each doc as the default (for example football-data.org as the primary data source, seeded from openfootball/worldcup.json), and note any deviation.
- Use British English and pounds sterling. Do not use em dashes.

Build it cleanly and incrementally with sensible commits as you go. Add a clear `.env.example` listing every secret the app needs, and a short `SETUP.md` explaining how to run it locally and what I need to provide.

## Step 3: Secrets (I will provide later)
I have not given you any live credentials yet. For now, read all secrets from environment variables and document them in `.env.example`. This includes the Stripe keys, the football API key, the email provider key, and the Supabase project URL and keys. I will provide the real Stripe payment info and the Supabase connection details later, so structure the code so I can drop those in without changes. Do not hardcode any secret, and make sure `.env` is gitignored.

## Step 4: Push to GitHub
Initialise git (if needed) and push the code to this existing repository:

https://github.com/mrPudgey789/Sweepstakes

Use `main` as the default branch, add a sensible `.gitignore` (Node, env files, build output), make a clear initial commit history, and push. Tell me if you need me to authenticate or set a remote.

When you are done, give me a short summary of what you built, what is stubbed pending my Stripe and Supabase details, and how to run it.
