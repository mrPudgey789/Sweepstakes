import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/email'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { entry_id, action } = body // action: 'confirm' or 'reject'

    if (!entry_id || !action) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const authClient = createServerSupabaseClient()
    const supabase = createAdminClient()

    // Verify the organiser owns this sweepstake
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: sweepstake } = await supabase
      .from('sweepstakes')
      .select('id, name, organisers!inner(auth_id)')
      .eq('id', params.id)
      .single()

    if (!sweepstake) {
      return NextResponse.json({ error: 'Sweepstake not found' }, { status: 404 })
    }

    const organiser = (sweepstake as Record<string, unknown>).organisers as { auth_id: string }
    if (organiser.auth_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    if (action === 'confirm') {
      await supabase
        .from('entries')
        .update({
          payment_state: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', entry_id)
        .eq('sweepstake_id', params.id)

      // Get player email for notification
      const { data: entry } = await supabase
        .from('entries')
        .select('id, players!inner(email)')
        .eq('id', entry_id)
        .single()

      if (entry) {
        const player = (entry as Record<string, unknown>).players as { email: string }
        sendNotification({
          type: 'payment_confirmed',
          entryId: entry_id,
          email: player.email,
          data: { sweepstakeName: sweepstake.name },
        }).catch(console.error)
      }

      return NextResponse.json({ message: 'Payment confirmed.' })
    } else if (action === 'reject') {
      await supabase
        .from('entries')
        .update({
          payment_state: 'unpaid',
          marked_paid_at: null,
        })
        .eq('id', entry_id)
        .eq('sweepstake_id', params.id)

      return NextResponse.json({ message: 'Payment reset to unpaid.' })
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (err) {
    console.error('Confirm payment error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
