import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, buildPaypalLink } from '@/lib/utils'

interface NotificationPayload {
  type: 'join_confirmation' | 'payment_confirmed' | 'knockout' | 'standings_update'
  entryId: string
  email: string
  data: Record<string, unknown>
}

// Stubbed email sender. Replace the send() call with your chosen provider
// (Resend, Postmark, or Supabase's built-in email).
async function send(to: string, subject: string, html: string): Promise<boolean> {
  // --- STUB: replace with your email provider ---
  // Example with Resend:
  //   const resend = new Resend(process.env.EMAIL_PROVIDER_API_KEY)
  //   await resend.emails.send({
  //     from: process.env.EMAIL_FROM_ADDRESS!,
  //     to,
  //     subject,
  //     html,
  //   })
  console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`)
  console.log(`[EMAIL STUB] Body preview: ${html.substring(0, 200)}...`)
  return true
}

export async function sendNotification(payload: NotificationPayload) {
  const { type, entryId, email, data } = payload

  let subject = ''
  let html = ''

  switch (type) {
    case 'join_confirmation': {
      const name = data.sweepstakeName as string
      const teamName = data.teamName as string | null
      const amount = data.entryAmount as number
      const currency = data.currency as string
      const link = data.paypalLink as string
      const mode = data.mode as string

      subject = `You have joined ${name}`
      html = `
        <h2>Welcome to ${name}!</h2>
        ${teamName
          ? `<p>Your team: <strong>${teamName}</strong></p>`
          : mode === 'random'
          ? '<p>Your team will be drawn soon. We will email you when the organiser runs the draw.</p>'
          : ''}
        <p>Entry amount: <strong>${formatCurrency(amount, currency)}</strong></p>
        <p>Pay the organiser directly using their payment link:
          <a href="${buildPaypalLink(link, amount)}">${buildPaypalLink(link, amount)}</a>
        </p>
        <p><em>This is a personal payment between you and the organiser. The platform never touches this money.</em></p>
      `
      break
    }

    case 'payment_confirmed': {
      const name = data.sweepstakeName as string
      subject = `Payment confirmed for ${name}`
      html = `
        <h2>You are in!</h2>
        <p>The organiser has confirmed your entry payment for <strong>${name}</strong>.</p>
        <p>The organiser confirmed receipt directly. The platform did not handle this money.</p>
      `
      break
    }

    case 'knockout': {
      const teamName = data.teamName as string
      const stage = data.stage as string
      const name = data.sweepstakeName as string

      subject = `Bad news: ${teamName} is out`
      html = `
        <h2>Bad news, ${teamName} is out.</h2>
        <p>${teamName} was knocked out at the ${stage.replace(/_/g, ' ')} stage.</p>
        <p>Better luck next time! You can still follow the rest of the tournament in ${name}.</p>
      `
      break
    }

    case 'standings_update': {
      const name = data.sweepstakeName as string
      subject = `Standings update for ${name}`
      html = `
        <h2>Standings update</h2>
        <p>Check the latest standings for ${name}.</p>
      `
      break
    }
  }

  const sent = await send(email, subject, html)

  // Record the notification
  try {
    const supabase = createAdminClient()
    await supabase.from('notifications').insert({
      entry_id: entryId,
      type,
      status: sent ? 'sent' : 'failed',
      sent_at: sent ? new Date().toISOString() : null,
      payload: { subject, to: email },
    })
  } catch (err) {
    console.error('Failed to record notification:', err)
  }
}
