import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { match_id, home_score, away_score, winner_team_id } = body

    if (!match_id || home_score === undefined || away_score === undefined) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const authClient = createServerSupabaseClient()
    const supabase = createAdminClient()

    // Verify the organiser owns this sweepstake
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!organiser) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    // Upsert result with manual override
    const { error } = await supabase
      .from('results')
      .upsert({
        match_id,
        home_score: parseInt(home_score),
        away_score: parseInt(away_score),
        winner_team_id: winner_team_id || null,
        source: 'manual_override',
        overridden_by: organiser.id,
        recorded_at: new Date().toISOString(),
      }, {
        onConflict: 'match_id',
      })

    if (error) {
      console.error('Override error:', error)
      return NextResponse.json({ error: 'Failed to override result.' }, { status: 500 })
    }

    // Update match status
    await supabase
      .from('matches')
      .update({ status: 'finished' })
      .eq('id', match_id)

    // If a team was eliminated (knockout stage loss), update team status
    if (winner_team_id) {
      const { data: match } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id, stage')
        .eq('id', match_id)
        .single()

      if (match && match.stage !== 'group') {
        const loserId = match.home_team_id === winner_team_id
          ? match.away_team_id
          : match.home_team_id

        if (loserId) {
          await supabase
            .from('teams')
            .update({
              status: 'eliminated',
              eliminated_at: new Date().toISOString(),
            })
            .eq('id', loserId)
        }
      }
    }

    return NextResponse.json({ message: 'Result overridden.' })
  } catch (err) {
    console.error('Override result error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
