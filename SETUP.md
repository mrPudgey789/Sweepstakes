# Setup Guide

## Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)
- A Stripe account (test mode for development)
- A football-data.org free API key
- An email provider account (e.g. Resend, Postmark) - optional for local dev

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   You need to provide:

   | Variable | Where to get it |
   |----------|----------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard > Settings > API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard > Settings > API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard > Settings > API (keep secret) |
   | `STRIPE_SECRET_KEY` | Stripe dashboard > Developers > API keys |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard > Developers > API keys |
   | `STRIPE_WEBHOOK_SECRET` | Stripe CLI or dashboard > Webhooks |
   | `FOOTBALL_DATA_API_KEY` | https://www.football-data.org/client/register |
   | `EMAIL_PROVIDER_API_KEY` | Your email provider (Resend, Postmark, etc.) |
   | `EMAIL_FROM_ADDRESS` | A verified sender address |
   | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

3. **Run the database migrations**

   Go to your Supabase dashboard > SQL Editor and run the migration files in order:

   - `supabase/migrations/001_initial_schema.sql` - Creates all tables, enums, indexes, and RLS policies
   - `supabase/migrations/002_seed_2026_world_cup.sql` - Seeds the 2026 World Cup tournament and all 48 teams

   Alternatively, if you have the Supabase CLI:
   ```bash
   supabase db push
   ```

4. **Set up Stripe webhook (for local dev)**

   Install the Stripe CLI and forward events to your local server:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   Copy the webhook signing secret it prints and put it in `STRIPE_WEBHOOK_SECRET`.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## How It Works

### For organisers

1. Sign up at `/auth/signup`
2. Create a sweepstake at `/create` (8-step wizard)
3. Pay the software fee via Stripe (the only money the platform touches)
4. Share the link or join code with players
5. Manage entries, confirm payments, run the draw at `/sweepstake/[id]`
6. Override results if the feed is wrong at `/sweepstake/[id]/override`

### For players

1. Open the share link (`/j/[slug]`) or enter the join code at `/join`
2. Provide email, accept T&Cs, pick a team (or wait for the draw)
3. Pay the organiser directly via their PayPal link
4. Mark payment as done; wait for the organiser to confirm
5. View fixtures and standings; receive a knockout email

### Cron jobs (production)

Two cron endpoints poll football-data.org and recompute standings:

- `GET /api/cron/poll-results` - Fetches match results, updates scores, detects knockouts, sends emails
- `GET /api/cron/recompute-standings` - Recalculates standings for all active sweepstakes

These are configured in `vercel.json` to run every 5 and 10 minutes respectively. For local testing, call them manually:

```bash
curl http://localhost:3000/api/cron/poll-results
curl http://localhost:3000/api/cron/recompute-standings
```

## What Is Stubbed

- **Email sending**: The email provider is stubbed in `src/lib/email.ts`. It logs to the console instead of sending. Drop in your provider (Resend recommended) by replacing the `send()` function.
- **Football data sync**: Works when you provide a `FOOTBALL_DATA_API_KEY`. Without it, the poller logs a warning and returns empty. Fixtures can also be loaded manually via the seed migration.
- **PayPal link validation**: Currently validates format only, not reachability. A HEAD request to PayPal.Me can be added.

## The Money Rule

The platform **never holds, touches, or routes entry money**. The only money it handles is the software fee via Stripe. Entry money goes directly from players to the organiser via their PayPal link. This is enforced architecturally: there is no entity, endpoint, or flow for pot money anywhere in the codebase.
