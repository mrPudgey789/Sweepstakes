// Compute group tables and sweepstake standings
// Group points: win 3, draw 1, loss 0
// Tiebreak: goal difference, then goals scored

import { SupabaseClient } from '@supabase/supabase-js'

interface GroupRow {
  team_id: string
  team_name: string
  team_code: string
  group_letter: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  position: number
}

export async function computeGroupTables(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<Map<string, GroupRow[]>> {
  // Get all group stage matches with results
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, stage, results(home_score, away_score)')
    .eq('tournament_id', tournamentId)
    .eq('stage', 'group')

  // Get all teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, code, group_letter')
    .eq('tournament_id', tournamentId)

  if (!teams) return new Map()

  // Initialise group tables
  const tables = new Map<string, Map<string, GroupRow>>()
  for (const team of teams) {
    if (!tables.has(team.group_letter)) {
      tables.set(team.group_letter, new Map())
    }
    tables.get(team.group_letter)!.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      team_code: team.code,
      group_letter: team.group_letter,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      position: 0,
    })
  }

  // Process each finished group match
  for (const match of (matches || [])) {
    const results = match.results as { home_score: number; away_score: number }[] | null
    if (!results || results.length === 0) continue
    if (!match.home_team_id || !match.away_team_id) continue

    const result = Array.isArray(results) ? results[0] : results
    const homeId = match.home_team_id as string
    const awayId = match.away_team_id as string

    // Find the group for these teams
    const homeTeam = teams.find(t => t.id === homeId)
    if (!homeTeam) continue
    const group = homeTeam.group_letter

    const groupTable = tables.get(group)
    if (!groupTable) continue

    const home = groupTable.get(homeId)
    const away = groupTable.get(awayId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goals_for += result.home_score
    home.goals_against += result.away_score
    away.goals_for += result.away_score
    away.goals_against += result.home_score

    if (result.home_score > result.away_score) {
      home.won++
      away.lost++
      home.points += 3
    } else if (result.home_score < result.away_score) {
      away.won++
      home.lost++
      away.points += 3
    } else {
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    }

    home.goal_difference = home.goals_for - home.goals_against
    away.goal_difference = away.goals_for - away.goals_against
  }

  // Sort each group and assign positions
  const result = new Map<string, GroupRow[]>()
  for (const [group, teamMap] of tables) {
    const sorted = [...teamMap.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
      return a.team_name.localeCompare(b.team_name) // alphabetical tiebreak
    })
    sorted.forEach((row, i) => { row.position = i + 1 })
    result.set(group, sorted)
  }

  return result
}

// Compute sweepstake standings: rank players by their team's tournament performance
export interface SweepstakeStanding {
  entry_id: string
  player_name: string
  team_id: string | null
  team_name: string | null
  team_code: string | null
  team_status: string
  stage_reached: string
  group_points: number
  goal_difference: number
  goals_for: number
  rank: number
  is_eliminated: boolean
}

const STAGE_ORDER: Record<string, number> = {
  group: 0,
  round_of_32: 1,
  round_of_16: 2,
  quarter: 3,
  semi: 4,
  third_place: 5,
  final: 6,
}

export async function computeSweepstakeStandings(
  supabase: SupabaseClient,
  sweepstakeId: string
): Promise<SweepstakeStanding[]> {
  // Get tournament
  const { data: sweepstake } = await supabase
    .from('sweepstakes')
    .select('id')
    .eq('id', sweepstakeId)
    .single()

  if (!sweepstake) return []

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'FIFA World Cup 2026')
    .single()

  if (!tournament) return []

  // Get entries with player and team info
  const { data: entries } = await supabase
    .from('entries')
    .select('id, players(display_name), teams(id, name, code, status, group_letter)')
    .eq('sweepstake_id', sweepstakeId)

  if (!entries) return []

  // Compute group tables
  const groupTables = await computeGroupTables(supabase, tournament.id)

  // Determine furthest stage reached per team
  const { data: knockoutMatches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, stage, results(home_score, away_score, winner_team_id)')
    .eq('tournament_id', tournament.id)
    .neq('stage', 'group')

  const teamStages = new Map<string, string>()
  for (const m of (knockoutMatches || [])) {
    const results = m.results as { winner_team_id: string | null }[] | null
    if (!results || results.length === 0) continue
    for (const tid of [m.home_team_id, m.away_team_id]) {
      if (!tid) continue
      const current = teamStages.get(tid as string)
      const stage = m.stage as string
      if (!current || (STAGE_ORDER[stage] || 0) > (STAGE_ORDER[current] || 0)) {
        teamStages.set(tid as string, stage)
      }
    }
  }

  // Build standings
  const standings: SweepstakeStanding[] = entries.map(e => {
    const team = e.teams as { id: string; name: string; code: string; status: string; group_letter: string } | null
    const player = e.players as { display_name: string | null } | null

    let groupPoints = 0
    let goalDifference = 0
    let goalsFor = 0

    if (team) {
      const groupTable = groupTables.get(team.group_letter)
      const row = groupTable?.find(r => r.team_id === team.id)
      if (row) {
        groupPoints = row.points
        goalDifference = row.goal_difference
        goalsFor = row.goals_for
      }
    }

    const stageReached = team ? (teamStages.get(team.id) || 'group') : 'group'

    return {
      entry_id: e.id,
      player_name: player?.display_name || 'Anonymous',
      team_id: team?.id || null,
      team_name: team?.name || null,
      team_code: team?.code || null,
      team_status: team?.status || 'active',
      stage_reached: stageReached,
      group_points: groupPoints,
      goal_difference: goalDifference,
      goals_for: goalsFor,
      rank: 0,
      is_eliminated: team?.status === 'eliminated',
    }
  })

  // Sort: furthest stage DESC, then points DESC, then GD DESC, then GF DESC
  standings.sort((a, b) => {
    const stageA = STAGE_ORDER[a.stage_reached] || 0
    const stageB = STAGE_ORDER[b.stage_reached] || 0
    if (stageB !== stageA) return stageB - stageA
    if (b.group_points !== a.group_points) return b.group_points - a.group_points
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
    return b.goals_for - a.goals_for
  })

  standings.forEach((s, i) => { s.rank = i + 1 })

  return standings
}
