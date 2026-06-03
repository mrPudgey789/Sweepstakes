# Supabase Auth Email Templates

Paste these into your Supabase dashboard at:
**Authentication > Email Templates**

## Confirm Signup

**Subject:** `Verify your Sweep or Weep account`

**Body:**
```html
<div style="background-color:#f0f5ff;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background-color:#1A56DB;padding:24px 0;text-align:center">
      <img src="https://sweeporweep.com/Sweep%20or%20weep%20white.svg" alt="Sweep or Weep" width="200" style="margin:0 auto;display:block" />
    </div>
    <div style="padding:32px 24px">
      <h1 style="color:#0A1628;font-size:24px;font-weight:800;margin:0 0 16px">Verify your email</h1>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px">
        Welcome to Sweep or Weep! Click the button below to confirm your email address and get started.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="{{ .ConfirmationURL }}" style="background-color:#65FF47;color:#0A1628;font-weight:bold;padding:14px 28px;border-radius:9999px;text-decoration:none;display:inline-block;font-size:14px">
          Verify email address
        </a>
      </div>
      <p style="color:#9CA3AF;font-size:12px;line-height:1.5;margin:24px 0 0">
        If you did not create an account, you can safely ignore this email.
      </p>
    </div>
    <div style="background-color:#f0f5ff;padding:20px 24px;text-align:center">
      <p style="color:#6B7280;font-size:11px;margin:0">Sweep or Weep - World Cup 2026 Sweepstakes</p>
    </div>
  </div>
</div>
```

## Reset Password

**Subject:** `Reset your Sweep or Weep password`

**Body:**
```html
<div style="background-color:#f0f5ff;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background-color:#1A56DB;padding:24px 0;text-align:center">
      <img src="https://sweeporweep.com/Sweep%20or%20weep%20white.svg" alt="Sweep or Weep" width="200" style="margin:0 auto;display:block" />
    </div>
    <div style="padding:32px 24px">
      <h1 style="color:#0A1628;font-size:24px;font-weight:800;margin:0 0 16px">Reset your password</h1>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px">
        Someone requested a password reset for your Sweep or Weep account. Click below to choose a new password.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="{{ .ConfirmationURL }}" style="background-color:#65FF47;color:#0A1628;font-weight:bold;padding:14px 28px;border-radius:9999px;text-decoration:none;display:inline-block;font-size:14px">
          Reset password
        </a>
      </div>
      <p style="color:#9CA3AF;font-size:12px;line-height:1.5;margin:24px 0 0">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
    <div style="background-color:#f0f5ff;padding:20px 24px;text-align:center">
      <p style="color:#6B7280;font-size:11px;margin:0">Sweep or Weep - World Cup 2026 Sweepstakes</p>
    </div>
  </div>
</div>
```

## Magic Link

**Subject:** `Your Sweep or Weep sign-in link`

**Body:**
```html
<div style="background-color:#f0f5ff;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background-color:#1A56DB;padding:24px 0;text-align:center">
      <img src="https://sweeporweep.com/Sweep%20or%20weep%20white.svg" alt="Sweep or Weep" width="200" style="margin:0 auto;display:block" />
    </div>
    <div style="padding:32px 24px">
      <h1 style="color:#0A1628;font-size:24px;font-weight:800;margin:0 0 16px">Sign in to Sweep or Weep</h1>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px">
        Click the button below to sign in to your account. This link expires in 24 hours.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="{{ .ConfirmationURL }}" style="background-color:#65FF47;color:#0A1628;font-weight:bold;padding:14px 28px;border-radius:9999px;text-decoration:none;display:inline-block;font-size:14px">
          Sign in
        </a>
      </div>
      <p style="color:#9CA3AF;font-size:12px;line-height:1.5;margin:24px 0 0">
        If you did not request this link, you can safely ignore this email.
      </p>
    </div>
    <div style="background-color:#f0f5ff;padding:20px 24px;text-align:center">
      <p style="color:#6B7280;font-size:11px;margin:0">Sweep or Weep - World Cup 2026 Sweepstakes</p>
    </div>
  </div>
</div>
```

## How to apply

1. Go to **Supabase Dashboard > Authentication > Email Templates**
2. For each template type (Confirm signup, Reset password, Magic link):
   - Replace the **Subject** with the one above
   - Replace the **Body** HTML with the template above
3. Click **Save**

The templates use `{{ .ConfirmationURL }}` which Supabase replaces with the actual link.
