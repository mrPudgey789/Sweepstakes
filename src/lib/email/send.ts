import { Resend } from 'resend'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { createElement } from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Sweep or Weep <notifications@sweeporweep.com>'
const LOG_ONLY = process.env.MAIL_TRANSPORT === 'log'

interface SendEmailOptions {
  to: string
  subject: string
  template: React.ComponentType<Record<string, unknown>>
  props: Record<string, unknown>
  // Idempotency
  entryId?: string
  notificationType?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  const { to, subject, template, props, entryId, notificationType } = options

  // Idempotency check: skip if already sent for this entry + type
  if (entryId && notificationType) {
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('entry_id', entryId)
      .eq('type', notificationType)
      .eq('status', 'sent')
      .limit(1)
      .maybeSingle()

    if (existing) {
      console.log(`[email] Skipped duplicate: ${notificationType} for entry ${entryId}`)
      return { success: true, id: existing.id }
    }
  }

  // Record as queued
  let notificationId: string | null = null
  if (entryId && notificationType) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('notifications')
      .insert({
        entry_id: entryId,
        type: notificationType,
        status: 'queued',
        payload: { subject, to },
      })
      .select('id')
      .maybeSingle()
    notificationId = data?.id || null
  }

  // Dev mode: log only
  if (LOG_ONLY) {
    console.log(`[email] To: ${to} | Subject: ${subject}`)
    console.log(`[email] Template: ${template.name || 'unknown'} | Props:`, JSON.stringify(props).slice(0, 200))

    if (notificationId) {
      const supabase = createAdminClient()
      await supabase.from('notifications').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', notificationId)
    }

    return { success: true }
  }

  // Production: send via Resend
  try {
    const html = await render(createElement(template, props))
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    })

    if (error) {
      console.error(`[email] Resend error:`, error)
      if (notificationId) {
        const supabase = createAdminClient()
        await supabase.from('notifications').update({
          status: 'failed',
          payload: { subject, to, error: error.message },
        }).eq('id', notificationId)
      }
      return { success: false }
    }

    // Mark as sent
    if (notificationId) {
      const supabase = createAdminClient()
      await supabase.from('notifications').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', notificationId)
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error(`[email] Send failed:`, err)
    if (notificationId) {
      const supabase = createAdminClient()
      await supabase.from('notifications').update({
        status: 'failed',
        payload: { subject, to, error: String(err) },
      }).eq('id', notificationId)
    }
    return { success: false }
  }
}

// Convenience: send without blocking the caller
export function sendEmailAsync(options: SendEmailOptions): void {
  sendEmail(options).catch(err => {
    console.error('[email] Async send failed:', err)
  })
}
