# Email setup (Resend)

## Overview

Email is handled by Resend in two paths:
1. **Supabase Auth emails** (signup, password reset, magic link) via custom SMTP
2. **App notifications** (join, payment, knockout, winner) via the Resend API

## 1. Domain verification in Resend

Go to https://resend.com/domains and add `sweeporweep.com`.

Resend will give you DNS records to add. You will need to add these at your registrar (GoDaddy):

### Expected records

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSq...` (Resend provides this) | DKIM signing |
| TXT | `@` or blank | `v=spf1 include:amazonses.com ~all` | SPF (Resend sends via AWS SES) |
| CNAME | `resend._domainkey` | (Resend provides) | DKIM alternate |
| MX | `feedback` | `feedback-smtp.us-east-1.amazonses.com` | Bounce handling |

Resend's dashboard shows the exact records. Add them all in GoDaddy (Domain > DNS > Add Record).

### Verify

After adding DNS records (allow up to 48 hours, usually minutes):
1. Click "Verify" in the Resend dashboard
2. Send a test email from the Resend dashboard to yourself
3. Check email headers for `dkim=pass`, `spf=pass`, `dmarc=pass`
4. Optional: use https://www.mail-tester.com to score deliverability

### DMARC record

If you do not already have a DMARC record, add one:

| Type | Name | Value |
|------|------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` |

You already have this record in GoDaddy from the screenshot earlier.

## 2. Supabase Auth emails (custom SMTP)

Go to your Supabase dashboard:
**Authentication > Email Templates > SMTP Settings**

Enter these values:
- **Host**: `smtp.resend.com`
- **Port**: `465` (SSL) or `587` (STARTTLS)
- **Username**: `resend`
- **Password**: your Resend API key (`re_QYo5TTjU_...`)
- **Sender email**: `notifications@sweeporweep.com`
- **Sender name**: `Sweep or Weep`

### Rate limits

The default Supabase auth rate limit is 4 emails/hour for signups. To raise it:
1. Go to **Authentication > Rate Limits**
2. Set "Email rate limit" to a higher value (recommended: 30/hour for launch)
3. If you need more, contact Supabase support

### Customise templates

In **Authentication > Email Templates**, customise:

**Confirm signup:**
```
Subject: Confirm your Sweep or Weep account
Body: Welcome to Sweep or Weep! Click below to confirm your email.
[Confirm email button with {{ .ConfirmationURL }}]
```

**Reset password:**
```
Subject: Reset your Sweep or Weep password
Body: Click below to reset your password.
[Reset password button with {{ .ConfirmationURL }}]
```

**Magic link:**
```
Subject: Your Sweep or Weep sign-in link
Body: Click below to sign in.
[Sign in button with {{ .ConfirmationURL }}]
```

## 3. App notifications (Resend API)

Set in your environment:
```
RESEND_API_KEY=re_...
EMAIL_FROM=Sweep or Weep <notifications@sweeporweep.com>
```

In development, set `MAIL_TRANSPORT=log` to print emails to console instead of sending.
In production (Vercel), do NOT set `MAIL_TRANSPORT` (defaults to live sending).

### Templates

All templates use React Email (`@react-email/components`) and are rendered server-side by Resend:

1. **Join confirmation** - sent when a player joins
2. **Payment confirmed** - sent when the organiser confirms payment
3. **Team knocked out** - sent when a team is eliminated
4. **Organiser winner summary** - sent when the sweepstake resolves
5. **Standings digest** (opt-in) - periodic standings update with unsubscribe

### Idempotency

Every send checks the `notifications` table for an existing `sent` record of the same `type` for the same `entry_id`. Retries and recomputes never double-send.

### Test route

In development, visit:
```
GET /api/debug/test-email?to=you@example.com
```
This sends one of each template to the specified address.

## 4. Volume and plan

The Resend free tier allows:
- **3,000 emails/month**
- **100 emails/day** (this is the real constraint)

A busy knockout day (e.g. 8 group matches finishing, each eliminating teams across many sweepstakes) can exceed 100 emails. **Upgrade to Resend Pro ($20/month, no daily cap) before the tournament starts on 11 June.**

## Checklist

- [ ] Add domain `sweeporweep.com` in Resend
- [ ] Add DNS records (SPF, DKIM, DMARC) in GoDaddy
- [ ] Verify domain in Resend
- [ ] Configure Supabase SMTP settings
- [ ] Customise Supabase auth email templates
- [ ] Add `RESEND_API_KEY` to Vercel env vars
- [ ] Add `EMAIL_FROM` to Vercel env vars
- [ ] Remove `MAIL_TRANSPORT=log` from Vercel (or do not set it)
- [ ] Send a test email and check headers
- [ ] Upgrade to Resend Pro before 11 June
