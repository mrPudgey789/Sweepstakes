import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Returns the player's team's next match (or current live match)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')

  if (!teamId) {
    return NextResponse.json(null)
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // First check for any live match
  const { data: liveMatch } = await supabase
    .from('matches')
    .select(`
      id, stage, kickoff_at, venue, status, match_number, home_slot, away_slot,
      home_team:teams!matches_home_team_id_fkey(id, name, code),
      away_team:teams!matches_away_team_id_fkey(id, name, code),
      results(home_score, away_score, winner_team_id)
    `)
    .eq('status', 'live')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .maybeSingle()

  if (liveMatch) {
    return NextResponse.json({ ...liveMatch, match_state: 'live' })
  }

  // Check for most recent finished match (show result briefly)
  const { data: lastMatch } = await supabase
    .from('matches')
    .select(`
      id, stage, kickoff_at, venue, status, match_number,
      home_team:teams!matches_home_team_id_fkey(id, name, code),
      away_team:teams!matches_away_team_id_fkey(id, name, code),
      results(home_score, away_score, winner_team_id)
    `)
    .eq('status', 'finished')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('kickoff_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Next upcoming match
  const { data: nextMatch } = await supabase
    .from('matches')
    .select(`
      id, stage, kickoff_at, venue, status, match_number, home_slot, away_slot,
      home_team:teams!matches_home_team_id_fkey(id, name, code),
      away_team:teams!matches_away_team_id_fkey(id, name, code)
    `)
    .eq('status', 'scheduled')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .gte('kickoff_at', now)
    .order('kickoff_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (nextMatch) {
    return NextResponse.json({ ...nextMatch, match_state: 'upcoming', last_result: lastMatch })
  }

  // No upcoming match - team might be eliminated or tournament over
  return NextResponse.json({ match_state: 'none', last_result: lastMatch })
}
