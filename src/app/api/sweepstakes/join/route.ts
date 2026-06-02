import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sweepstake_id, email, display_name, team_id } = body

    if (!sweepstake_id || !email) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check sweepstake exists and is open
    const { data: sweepstake } = await supabase
      .from('sweepstakes')
      .select('id, status, mode, max_players, name, entry_amount, currency, paypal_link')
      .eq('id', sweepstake_id)
      .single()

    if (!sweepstake || sweepstake.status !== 'open') {
      return NextResponse.json({ error: 'This sweepstake is not accepting new players.' }, { status: 400 })
    }

    // Check player count
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('sweepstake_id', sweepstake_id)

    if (sweepstake.max_players && (count || 0) >= sweepstake.max_players) {
      return NextResponse.json({ error: 'This sweepstake is full.' }, { status: 400 })
    }

    // Find or create player
    let { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('email', email)
      .single()

    if (!player) {
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({ email, display_name })
        .select('id')
        .single()

      if (playerError) {
        console.error('Player insert error:', playerError)
        return NextResponse.json({ error: 'Failed to create player record.' }, { status: 500 })
      }
      player = newPlayer
    }

    // Check for duplicate entry
    const { data: existingEntry } = await supabase
      .from('entries')
      .select('id')
      .eq('sweepstake_id', sweepstake_id)
      .eq('player_id', player.id)
      .single()

    if (existingEntry) {
      return NextResponse.json({ error: 'You have already joined this sweepstake.' }, { status: 400 })
    }

    // For pick-your-own, check team is not taken
    if (sweepstake.mode === 'pick_your_own' && team_id) {
      const { data: takenEntry } = await supabase
        .from('entries')
        .select('id')
        .eq('sweepstake_id', sweepstake_id)
        .eq('team_id', team_id)
        .single()

      if (takenEntry) {
        return NextResponse.json({ error: 'This team has already been taken.' }, { status: 400 })
      }
    }

    // Create entry
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .insert({
        sweepstake_id,
        player_id: player.id,
        team_id: sweepstake.mode === 'pick_your_own' ? team_id : null,
        tc_accepted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (entryError) {
      console.error('Entry insert error:', entryError)
      return NextResponse.json({ error: 'Failed to create entry.' }, { status: 500 })
    }

    // Get team name if assigned
    let teamName: string | null = null
    if (team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', team_id)
        .single()
      teamName = team?.name || null
    }

    // Send join confirmation email (non-blocking)
    sendNotification({
      type: 'join_confirmation',
      entryId: entry.id,
      email,
      data: {
        sweepstakeName: sweepstake.name,
        teamName,
        entryAmount: sweepstake.entry_amount,
        currency: sweepstake.currency,
        paypalLink: sweepstake.paypal_link,
        mode: sweepstake.mode,
      },
    }).catch(console.error)

    return NextResponse.json({
      entry_id: entry.id,
      team_name: teamName,
    })
  } catch (err) {
    console.error('Join error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
