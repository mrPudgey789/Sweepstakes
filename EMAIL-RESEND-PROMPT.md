# Claude Code prompt: wire up email with Resend

Set up production email for the live app (sweeporweep.com) using Resend. There are two email paths and both go through Resend: Supabase Auth emails (signup, magic link, password reset) via custom SMTP, and our own transactional notifications via the Resend API. Use British English and pounds sterling. Do not use em dashes.

## 1. Provider and config
- Use Resend. Add `RESEND_API_KEY` to env and `.env.example`.
- Send from a real domain address, e.g. `EMAIL_FROM="Sweep or Weep <notifications@sweeporweep.com>"`. Never send from a Gmail address.
- Keep the existing `MAIL_TRANSPORT=log` dev mode (writes to console and the notifications table) so dev and the simulator never send real email.

## 2. Domain authentication (write me a checklist, do not guess DNS)
- Produce `docs/email-setup.md` with the exact steps to: verify sweeporweep.com in Resend, add the SPF, DKIM and DMARC DNS records Resend provides, and confirm verification. I will add the DNS records at my registrar. List what records to expect and how to test that auth passes (e.g. send a test and check the headers / a tool like mail-tester).

## 3. Supabase Auth emails (custom SMTP)
- Document in `docs/email-setup.md` how to point Supabase Auth at Resend SMTP (Authentication > Emails > SMTP settings), and how to raise the auth rate limit from the default 30/hour to a sensible value for launch.
- Customise the Supabase auth email templates (confirm signup, magic link, reset) to match Sweep or Weep branding and the from address.

## 4. Transactional notifications via Resend API
Build a single send service (e.g. `src/lib/email/send.ts`) used by all app notifications, with:
- React Email templates (Resend's @react-email) for each type, branded for Sweep or Weep.
- Idempotency: before sending, check the `notifications` table for an existing send of that type for that entry/event so retries and recomputes never double-send. Record status (queued/sent/failed) and allow retry of failures.
- Async/queued sending so a burst (a whole group going out at once) does not block the request that triggered it.

Templates to build:
1. **Join confirmation** - player joined a sweepstake; show their team (or "team coming soon" in random mode), the entry amount, and that payment goes directly to the organiser via the shown link (the platform never holds the pot). Include a sign-in link.
2. **Payment confirmed** - the organiser confirmed receipt; "you're in".
3. **Team knocked out** (the headline) - "Bad news, [Team] is out", the stage they exited, their final or current position, link to standings. Light and good-humoured.
4. **Organiser winner summary** (NEW) - sent to the organiser when the sweepstake resolves, naming the winner(s) per the winner structure (single, or 1st/2nd/3rd), with each winning player and their team. Reinforce that the organiser distributes any winnings directly; the platform holds no pot. Also update `docs/notifications.md` to include this email.
5. **Optional standings digest** - opt-in, must include a working unsubscribe link that does not affect the essential transactional emails above.

## 5. Compliance
- Transactional emails (1-4 and auth) are service messages and do not need prior marketing consent, but must show the sender identity and the reason for receipt.
- The optional digest (5) needs a real unsubscribe that is honoured and recorded.
- Respect the money-separation rule in all copy: never imply the platform holds or pays the pot.

## 6. Volume and plan
- Note in `docs/email-setup.md`: the Resend free tier is 3,000/month but capped at 100/day, which a busy knockout day can exceed across many live sweepstakes. Recommend upgrading to Resend Pro (no daily cap) before the tournament starts on 11 June.

## 7. Verify
- Add a dev route or script to send one of each template to a test inbox (or Mailtrap) so I can see them rendered.
- Run the tournament simulator's knockout flow and confirm the knockout email and the organiser winner summary fire correctly and are recorded in the notifications table.
- Report: domain auth steps done vs pending on me, which templates are built, and the result of the test sends.
```
