import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sweepstakeId = searchParams.get('sweepstake_id')

  if (!sweepstakeId) {
    return NextResponse.json({ error: 'Missing sweepstake_id' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: player } = await admin
    .from('players')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle()

  if (!player) {
    return NextResponse.json(null)
  }

  const { data: entry } = await admin
    .from('entries')
    .select(`
      id, payment_state, team_id,
      teams(name, code, status),
      sweepstakes!inner(name, mode, entry_amount, currency, paypal_link, status, winner_structure, share_slug, join_code, organiser_id, organisers!inner(display_name, email))
    `)
    .eq('sweepstake_id', sweepstakeId)
    .eq('player_id', player.id)
    .maybeSingle()

  // Flatten organiser name
  if (entry) {
    const sw = entry.sweepstakes as unknown as Record<string, unknown>
    const org = sw?.organisers as { display_name: string | null; email: string } | null
    sw.organiser_name = org?.display_name || org?.email || 'the organiser'
  }

  return NextResponse.json(entry)
}
