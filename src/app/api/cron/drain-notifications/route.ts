import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/email'
import { verifyCronAuth } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Drains the notification queue: picks up queued notifications and sends them
// in controlled batches, respecting Resend's rate limits.
// Runs every minute via Vercel Cron.

const BATCH_SIZE = 50 // notifications per cycle
const DELAY_BETWEEN_SENDS_MS = 100 // ~10/sec, well within Resend Pro limits

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Pick up queued notifications, oldest first
    const { data: queued } = await supabase
      .from('notifications')
      .select('id, entry_id, type, payload')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (!queued || queued.length === 0) {
      return NextResponse.json({ message: 'Queue empty', sent: 0 })
    }

    let sent = 0
    let failed = 0

    for (const notif of queued) {
      const payload = notif.payload as Record<string, unknown>
      const email = payload.email as string
      if (!email) {
        await supabase.from('notifications').update({ status: 'failed' }).eq('id', notif.id)
        failed++
        continue
      }

      try {
        await sendNotification({
          type: notif.type as 'knockout',
          entryId: notif.entry_id,
          email,
          data: payload,
        })

        await supabase.from('notifications').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).eq('id', notif.id)

        sent++
      } catch (err) {
        console.error(`[drain] Failed to send ${notif.type} to ${email}:`, err)

        // Check if this is a rate limit (429)
        const isRateLimit = err instanceof Error && err.message.includes('429')
        if (isRateLimit) {
          // Stop processing this batch, will retry next cycle
          console.log('[drain] Rate limited, stopping batch')
          break
        }

        await supabase.from('notifications').update({
          status: 'failed',
          payload: { ...payload, error: String(err) },
        }).eq('id', notif.id)

        failed++
      }

      // Throttle between sends
      if (DELAY_BETWEEN_SENDS_MS > 0) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_SENDS_MS))
      }
    }

    return NextResponse.json({
      message: `Drained ${sent} sent, ${failed} failed, ${queued.length - sent - failed} deferred.`,
      sent,
      failed,
    })
  } catch (err) {
    console.error('Drain notifications error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
