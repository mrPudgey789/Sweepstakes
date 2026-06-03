import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authClient = createServerSupabaseClient()
    const supabase = createAdminClient()

    // Verify the organiser owns this sweepstake
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: sweepstake } = await supabase
      .from('sweepstakes')
      .select(`
        id, mode, status,
        organisers!inner(auth_id)
      `)
      .eq('id', params.id)
      .single()

    if (!sweepstake) {
      return NextResponse.json({ error: 'Sweepstake not found' }, { status: 404 })
    }

    const organiser = (sweepstake as Record<string, unknown>).organisers as { auth_id: string }
    if (organiser.auth_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    if (sweepstake.mode !== 'random') {
      return NextResponse.json({ error: 'Draw is only for random-mode sweepstakes.' }, { status: 400 })
    }

    if (sweepstake.status !== 'open') {
      return NextResponse.json({ error: 'Sweepstake must be open to run the draw.' }, { status: 400 })
    }

    // Get unassigned entries
    const { data: entries } = await supabase
      .from('entries')
      .select('id')
      .eq('sweepstake_id', params.id)
      .is('team_id', null)

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'No entries to assign teams to.' }, { status: 400 })
    }

    // Get all teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('tournament_id', (await supabase.from('tournaments').select('id').eq('name', 'FIFA World Cup 2026').single()).data?.id || '')

    if (!teams || teams.length === 0) {
      return NextResponse.json({ error: 'No teams available.' }, { status: 500 })
    }

    // Shuffle teams (Fisher-Yates)
    const shuffled = [...teams]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Assign teams to entries
    const assignments: { entry_id: string; team_id: string; team_name: string }[] = []

    for (let i = 0; i < entries.length && i < shuffled.length; i++) {
      const { error } = await supabase
        .from('entries')
        .update({ team_id: shuffled[i].id })
        .eq('id', entries[i].id)

      if (!error) {
        assignments.push({
          entry_id: entries[i].id,
          team_id: shuffled[i].id,
          team_name: shuffled[i].name,
        })
      }
    }

    // Update sweepstake status to drawn
    await supabase
      .from('sweepstakes')
      .update({
        status: 'drawn',
        drawn_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    return NextResponse.json({
      message: `Draw complete. ${assignments.length} teams assigned.`,
      assignments,
    })
  } catch (err) {
    console.error('Draw error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
