# Testing

## Unit tests

Run with:
```bash
npm run test:unit
```

Uses Vitest. Tests cover:
- `buildPaypalLink`, `normalisePaypalHandle`, `formatCurrency` (utils)
- Team matcher (code, alias, normalised name matching)
- Flag URL generation
- Pricing bands

## End-to-end tests

Run against local dev server:
```bash
npm run test:e2e
```

Run headed (visible browser):
```bash
npm run test:e2e:headed
```

Run against production:
```bash
TEST_BASE_URL=https://sweeporweep.com npm run test:e2e
```

Uses Playwright with Chromium. Tests cover:
- Anonymous share link access (regression for the 404 bug)
- Route smoke test (all top-level routes return 200)
- Join flow (random and pick-your-own modes)
- Auth flows (login, signup, protected redirect)
- Closed/drawn sweepstake states

## CI

Tests run automatically on every push to `main` and on pull requests via GitHub Actions.
Unit tests and e2e tests run in separate jobs.

For e2e tests in CI, you need to add the Supabase and Stripe secrets to GitHub repository settings.
