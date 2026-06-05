import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/email'

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

    // Get tournament and draw_pool from sweepstake
    const { data: sweepFull } = await supabase
      .from('sweepstakes')
      .select('tournament_id, name, draw_pool')
      .eq('id', params.id)
      .single()

    const drawPool = (sweepFull as Record<string, unknown>)?.draw_pool as string || 'all'

    // Get all teams
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, name, code')
      .eq('tournament_id', sweepFull?.tournament_id || '')

    if (!allTeams || allTeams.length === 0) {
      return NextResponse.json({ error: 'No teams available.' }, { status: 500 })
    }

    // If top_ranked, filter to only the top N teams (where N = number of entries)
    // Ranked by FIFA seeding: pot 1 teams first (group position 1A-1L), then pot 2, etc.
    // For simplicity, use a hardcoded ranking of the strongest teams
    let teamPool = allTeams
    if (drawPool === 'top_ranked') {
      const TOP_RANKED_CODES = [
        'ARG', 'FRA', 'BRA', 'ENG', 'ESP', 'GER', 'POR', 'NED',
        'BEL', 'CRO', 'URU', 'COL', 'ITA', 'MEX', 'USA', 'SUI',
        'JPN', 'DEN', 'SEN', 'POL', 'KOR', 'MAR', 'AUS', 'NOR',
        'TUR', 'AUT', 'SWE', 'EGY', 'IRN', 'SRB', 'CAN', 'ECU',
      ]
      // Take the top N codes where N = number of entries (minimum the entry count)
      const needed = Math.max(entries.length, 8)
      const topCodes = new Set(TOP_RANKED_CODES.slice(0, needed))
      const filtered = allTeams.filter(t => topCodes.has(t.code))
      if (filtered.length >= entries.length) {
        teamPool = filtered
      }
      // If not enough top teams, fall back to all
    }

    // Shuffle teams (Fisher-Yates)
    const shuffled = [...teamPool]
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

    // Send "team drawn" email to each player
    const { data: drawnEntries } = await supabase
      .from('entries')
      .select('id, team_id, players(email, display_name), teams(name, code)')
      .eq('sweepstake_id', params.id)
      .not('team_id', 'is', null)

    for (const entry of drawnEntries || []) {
      const player = (entry as Record<string, unknown>).players as { email: string; display_name: string | null } | null
      const team = (entry as Record<string, unknown>).teams as { name: string; code: string } | null
      if (!player || !team) continue

      sendNotification({
        type: 'team_drawn',
        entryId: entry.id,
        email: player.email,
        data: {
          playerName: player.display_name || 'there',
          teamName: team.name,
          teamCode: team.code,
          sweepstakeName: sweepFull?.name || 'your sweepstake',
          sweepstakeId: params.id,
        },
      }).catch(console.error)
    }

    return NextResponse.json({
      message: `Draw complete. ${assignments.length} teams assigned.`,
      assignments,
    })
  } catch (err) {
    console.error('Draw error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
