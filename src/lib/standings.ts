// Compute group tables and sweepstake standings
// Group points: win 3, draw 1, loss 0
// Tiebreak: goal difference, then goals scored
//
// Ranking logic (Fix 2):
// For each team, find their LAST match (highest stage played) and whether they WON or LOST it.
// Sort key (best to worst):
//   1. Last-match stage weight DESC (final > third_place > semi > quarter > ...)
//   2. Won last match before lost last match (within same stage)
//   3. Group performance tiebreak: points DESC, GD DESC, GF DESC

import { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface SweepstakeStanding {
  entry_id: string
  player_name: string
  team_id: string | null
  team_name: string | null
  team_code: string | null
  team_status: string
  stage_reached: string
  won_last_match: boolean
  group_points: number
  goal_difference: number
  goals_for: number
  rank: number
  is_eliminated: boolean
  is_champion: boolean
}

export const STAGE_WEIGHT: Record<string, number> = {
  group: 1,
  round_of_32: 2,
  round_of_16: 3,
  quarter: 4,
  semi: 5,
  third_place: 6,
  final: 7,
}

// ---------------------------------------------------------------------------
// Group tables
// ---------------------------------------------------------------------------

export async function computeGroupTables(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<Map<string, GroupRow[]>> {
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, stage, results(home_score, away_score)')
    .eq('tournament_id', tournamentId)
    .eq('stage', 'group')

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, code, group_letter')
    .eq('tournament_id', tournamentId)

  if (!teams) return new Map()

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
      played: 0, won: 0, drawn: 0, lost: 0,
      goals_for: 0, goals_against: 0, goal_difference: 0,
      points: 0, position: 0,
    })
  }

  for (const match of (matches || [])) {
    const results = match.results as { home_score: number; away_score: number }[] | null
    if (!results || results.length === 0) continue
    if (!match.home_team_id || !match.away_team_id) continue

    const result = Array.isArray(results) ? results[0] : results
    const homeId = match.home_team_id as string
    const awayId = match.away_team_id as string

    const homeTeam = teams.find(t => t.id === homeId)
    if (!homeTeam) continue
    const groupTable = tables.get(homeTeam.group_letter)
    if (!groupTable) continue

    const home = groupTable.get(homeId)
    const away = groupTable.get(awayId)
    if (!home || !away) continue

    home.played++; away.played++
    home.goals_for += result.home_score; home.goals_against += result.away_score
    away.goals_for += result.away_score; away.goals_against += result.home_score

    if (result.home_score > result.away_score) {
      home.won++; away.lost++; home.points += 3
    } else if (result.home_score < result.away_score) {
      away.won++; home.lost++; away.points += 3
    } else {
      home.drawn++; away.drawn++; home.points += 1; away.points += 1
    }

    home.goal_difference = home.goals_for - home.goals_against
    away.goal_difference = away.goals_for - away.goals_against
  }

  const result = new Map<string, GroupRow[]>()
  tables.forEach((teamMap, group) => {
    const sorted = Array.from(teamMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
      return a.team_name.localeCompare(b.team_name)
    })
    sorted.forEach((row, i) => { row.position = i + 1 })
    result.set(group, sorted)
  })

  return result
}

// ---------------------------------------------------------------------------
// Sweepstake standings (single source of truth)
// ---------------------------------------------------------------------------

export async function computeSweepstakeStandings(
  supabase: SupabaseClient,
  sweepstakeId: string
): Promise<SweepstakeStanding[]> {
  const { data: sweepstake } = await supabase
    .from('sweepstakes')
    .select('id, tournament_id')
    .eq('id', sweepstakeId)
    .single()

  if (!sweepstake || !sweepstake.tournament_id) return []

  const tournamentId = sweepstake.tournament_id

  // Get entries with player and team info
  const { data: entries } = await supabase
    .from('entries')
    .select('id, players(display_name), teams(id, name, code, status, group_letter)')
    .eq('sweepstake_id', sweepstakeId)

  if (!entries) return []

  // Compute group tables for tiebreaking
  const groupTables = await computeGroupTables(supabase, tournamentId)

  // Get ALL finished matches (group + knockout) with results
  const { data: allFinished } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, stage, results(home_score, away_score, winner_team_id)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'finished')

  // For each team, find their last match (highest stage) and whether they won it
  const teamLastMatch = new Map<string, { stage: string; stageWeight: number; won: boolean }>()

  for (const m of (allFinished || [])) {
    const results = m.results as { home_score: number; away_score: number; winner_team_id: string | null }[] | null
    if (!results || results.length === 0) continue
    const r = Array.isArray(results) ? results[0] : results
    const stage = m.stage as string
    const weight = STAGE_WEIGHT[stage] || 0

    for (const tid of [m.home_team_id, m.away_team_id]) {
      if (!tid) continue
      const teamId = tid as string
      const current = teamLastMatch.get(teamId)

      if (!current || weight > current.stageWeight) {
        const won = r.winner_team_id === teamId
        // For group stage draws, "won" is false for both, which is fine
        // since group teams are ranked by points/GD anyway
        teamLastMatch.set(teamId, { stage, stageWeight: weight, won })
      }
    }
  }

  // Build standings
  const standings: SweepstakeStanding[] = entries.map(e => {
    const team = e.teams as unknown as { id: string; name: string; code: string; status: string; group_letter: string } | null
    const player = e.players as unknown as { display_name: string | null } | null

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

    const lastMatch = team ? teamLastMatch.get(team.id) : null
    const stageReached = lastMatch?.stage || 'group'
    const wonLastMatch = lastMatch?.won ?? false
    const isChampion = stageReached === 'final' && wonLastMatch
    const isEliminated = team?.status === 'eliminated'

    return {
      entry_id: e.id,
      player_name: player?.display_name || 'Anonymous',
      team_id: team?.id || null,
      team_name: team?.name || null,
      team_code: team?.code || null,
      team_status: isChampion ? 'champion' : (team?.status || 'active'),
      stage_reached: stageReached,
      won_last_match: wonLastMatch,
      group_points: groupPoints,
      goal_difference: goalDifference,
      goals_for: goalsFor,
      rank: 0,
      is_eliminated: isEliminated && !isChampion,
      is_champion: isChampion,
    }
  })

  // Sort: stage weight DESC, then won-last-match first, then group performance
  standings.sort((a, b) => {
    const weightA = STAGE_WEIGHT[a.stage_reached] || 0
    const weightB = STAGE_WEIGHT[b.stage_reached] || 0
    if (weightB !== weightA) return weightB - weightA
    // Within same stage: winner before loser
    if (a.won_last_match !== b.won_last_match) return a.won_last_match ? -1 : 1
    // Tiebreak by group performance
    if (b.group_points !== a.group_points) return b.group_points - a.group_points
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
    return b.goals_for - a.goals_for
  })

  standings.forEach((s, i) => { s.rank = i + 1 })

  return standings
}

// ---------------------------------------------------------------------------
// Materialise standings to the standings table (used by cron)
// ---------------------------------------------------------------------------

export async function materialiseStandings(
  supabase: SupabaseClient,
  sweepstakeId: string
): Promise<number> {
  const standings = await computeSweepstakeStandings(supabase, sweepstakeId)
  if (standings.length === 0) return 0

  // Delete old standings
  await supabase.from('standings').delete().eq('sweepstake_id', sweepstakeId)

  // Insert new standings
  const rows = standings.map(s => ({
    sweepstake_id: sweepstakeId,
    entry_id: s.entry_id,
    rank: s.rank,
    team_stage: s.stage_reached,
    is_eliminated: s.is_eliminated,
  }))

  await supabase.from('standings').insert(rows)
  return rows.length
}
