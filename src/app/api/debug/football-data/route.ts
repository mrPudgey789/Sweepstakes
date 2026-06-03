import { NextResponse } from 'next/server'
import { fetchMatches, fetchTeams, getLastRateLimit } from '@/lib/football-data'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildTeamIndex, matchTeam } from '@/lib/team-matcher'

// Health check: verifies football-data.org returns 2026 data and teams match
// Protected: only works in development or with correct auth
export async function GET(request: Request) {
  // Block in production unless authed
  const isDev = process.env.NODE_ENV === 'development'
  if (!isDev) {
    const auth = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }
  }

  const results: Record<string, unknown> = {}

  // 1. Fetch matches from football-data.org
  const fdMatches = await fetchMatches()
  results.fd_match_count = fdMatches.length
  results.fd_sample = fdMatches.length > 0 ? {
    id: fdMatches[0].id,
    date: fdMatches[0].utcDate,
    status: fdMatches[0].status,
    stage: fdMatches[0].stage,
    home: fdMatches[0].homeTeam.name,
    away: fdMatches[0].awayTeam.name,
  } : null

  // 2. Rate limit info
  results.rate_limit = getLastRateLimit()

  // 3. Fetch our teams and check matching
  const supabase = createAdminClient()
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'FIFA World Cup 2026')
    .maybeSingle()

  if (!tournament) {
    results.error = 'No FIFA World Cup 2026 tournament found in DB. Run the seed migration.'
    return NextResponse.json(results)
  }

  const { data: ourTeams } = await supabase
    .from('teams')
    .select('id, name, code, aliases, group_letter')
    .eq('tournament_id', tournament.id)

  results.our_team_count = ourTeams?.length || 0
  results.our_groups = Array.from(new Set((ourTeams || []).map(t => t.group_letter))).sort()

  // 4. Check team matching
  const teamIndex = buildTeamIndex((ourTeams || []).map(t => ({
    id: t.id,
    name: t.name,
    code: t.code,
    aliases: (t.aliases as string[]) || [],
  })))

  const fdTeams = await fetchTeams()
  results.fd_team_count = fdTeams.length

  const unmatched: string[] = []
  const matched: string[] = []
  for (const fdt of fdTeams) {
    const result = matchTeam(teamIndex, fdt.tla, fdt.name)
    if (result) {
      matched.push(`${fdt.name} (${fdt.tla}) -> ${result.name} (${result.code})`)
    } else {
      unmatched.push(`${fdt.name} (${fdt.tla})`)
    }
  }
  results.matched_teams = matched.length
  results.unmatched_teams = unmatched

  // 5. Check our matches
  const { count: matchCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournament.id)

  results.our_match_count = matchCount

  // 6. Check if the Final is on 19 July in New York/New Jersey
  const { data: finalMatch } = await supabase
    .from('matches')
    .select('kickoff_at, venue, stage')
    .eq('tournament_id', tournament.id)
    .eq('stage', 'final')
    .maybeSingle()

  results.final_match = finalMatch ? {
    date: finalMatch.kickoff_at,
    venue: finalMatch.venue,
    stage: finalMatch.stage,
  } : 'NOT FOUND'

  return NextResponse.json(results)
}
