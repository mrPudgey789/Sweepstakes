// Standings computation with O(1) tournament state shared across all sweepstakes.
//
// Architecture:
// 1. computeTournamentRankings() runs ONCE per tournament per cycle. It produces
//    a Map<teamId, TeamRanking> with stage, won-last-match, group points, GD, GF.
//    This is the expensive part (reads all matches + results) and it is global.
// 2. computeSweepstakeStandings() takes the pre-computed rankings and a sweepstake's
//    entries, then does a trivial sort. No DB calls except loading the entries.
// 3. materialiseAllStandings() computes tournament rankings once, then materialises
//    every active sweepstake in batch.

import { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamRanking {
  team_id: string
  team_name: string
  team_code: string
  team_status: string
  group_letter: string
  stage_reached: string
  stage_weight: number
  won_last_match: boolean
  group_points: number
  goal_difference: number
  goals_for: number
  is_eliminated: boolean
  is_champion: boolean
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
// Step 1: Compute tournament rankings ONCE (the expensive global part)
// ---------------------------------------------------------------------------

export async function computeTournamentRankings(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<Map<string, TeamRanking>> {
  // Load teams and all finished matches in TWO queries (not per-team)
  const [teamsResult, matchesResult] = await Promise.all([
    supabase.from('teams').select('id, name, code, group_letter, status').eq('tournament_id', tournamentId),
    supabase.from('matches')
      .select('id, home_team_id, away_team_id, stage, results(home_score, away_score, winner_team_id)')
      .eq('tournament_id', tournamentId)
      .eq('status', 'finished'),
  ])

  const teams = teamsResult.data || []
  const matches = matchesResult.data || []

  // Build group tables in memory
  const groupStats = new Map<string, { points: number; gd: number; gf: number }>()
  for (const team of teams) {
    groupStats.set(team.id, { points: 0, gd: 0, gf: 0 })
  }

  // Build team lookup
  const teamById = new Map<string, typeof teams[0]>()
  for (const team of teams) {
    teamById.set(team.id, team)
  }

  // Process group matches for points/GD/GF
  for (const m of matches) {
    if (m.stage !== 'group') continue
    const results = m.results as { home_score: number; away_score: number }[] | { home_score: number; away_score: number } | null
    if (!results) continue
    if (!m.home_team_id || !m.away_team_id) continue

    const r = Array.isArray(results) ? results[0] : results
    if (!r || r.home_score === undefined) continue

    const homeId = m.home_team_id as string
    const awayId = m.away_team_id as string
    const home = groupStats.get(homeId)
    const away = groupStats.get(awayId)
    if (!home || !away) continue

    home.gf += r.home_score; home.gd += r.home_score - r.away_score
    away.gf += r.away_score; away.gd += r.away_score - r.home_score

    if (r.home_score > r.away_score) { home.points += 3 }
    else if (r.home_score < r.away_score) { away.points += 3 }
    else { home.points += 1; away.points += 1 }
  }

  // Find each team's last match (highest stage) and whether they won it
  const teamLastMatch = new Map<string, { stage: string; stageWeight: number; won: boolean }>()

  for (const m of matches) {
    const results = m.results as { winner_team_id: string | null }[] | { winner_team_id: string | null } | null
    if (!results) continue
    const r = Array.isArray(results) ? results[0] : results
    if (!r) continue

    const stage = m.stage as string
    const weight = STAGE_WEIGHT[stage] || 0

    for (const tid of [m.home_team_id, m.away_team_id]) {
      if (!tid) continue
      const teamId = tid as string
      const current = teamLastMatch.get(teamId)
      if (!current || weight > current.stageWeight) {
        teamLastMatch.set(teamId, { stage, stageWeight: weight, won: r.winner_team_id === teamId })
      }
    }
  }

  // Build final rankings map
  const rankings = new Map<string, TeamRanking>()
  for (const team of teams) {
    const stats = groupStats.get(team.id) || { points: 0, gd: 0, gf: 0 }
    const lastMatch = teamLastMatch.get(team.id)
    const stageReached = lastMatch?.stage || 'group'
    const wonLastMatch = lastMatch?.won ?? false
    const isChampion = stageReached === 'final' && wonLastMatch

    rankings.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      team_code: team.code,
      team_status: isChampion ? 'champion' : team.status,
      group_letter: team.group_letter,
      stage_reached: stageReached,
      stage_weight: lastMatch?.stageWeight || 0,
      won_last_match: wonLastMatch,
      group_points: stats.points,
      goal_difference: stats.gd,
      goals_for: stats.gf,
      is_eliminated: team.status === 'eliminated' && !isChampion,
      is_champion: isChampion,
    })
  }

  return rankings
}

// ---------------------------------------------------------------------------
// Step 2: Compute one sweepstake's standings from pre-computed rankings
// (ZERO additional DB queries for tournament data)
// ---------------------------------------------------------------------------

export function computeStandingsFromRankings(
  entries: { id: string; team_id: string | null; player_name: string }[],
  rankings: Map<string, TeamRanking>
): SweepstakeStanding[] {
  const standings: SweepstakeStanding[] = entries.map(e => {
    const r = e.team_id ? rankings.get(e.team_id) : null
    return {
      entry_id: e.id,
      player_name: e.player_name,
      team_id: r?.team_id || null,
      team_name: r?.team_name || null,
      team_code: r?.team_code || null,
      team_status: r?.team_status || 'active',
      stage_reached: r?.stage_reached || 'group',
      won_last_match: r?.won_last_match ?? false,
      group_points: r?.group_points || 0,
      goal_difference: r?.goal_difference || 0,
      goals_for: r?.goals_for || 0,
      rank: 0,
      is_eliminated: r?.is_eliminated ?? false,
      is_champion: r?.is_champion ?? false,
    }
  })

  standings.sort((a, b) => {
    const weightA = STAGE_WEIGHT[a.stage_reached] || 0
    const weightB = STAGE_WEIGHT[b.stage_reached] || 0
    if (weightB !== weightA) return weightB - weightA
    if (a.won_last_match !== b.won_last_match) return a.won_last_match ? -1 : 1
    if (b.group_points !== a.group_points) return b.group_points - a.group_points
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
    return b.goals_for - a.goals_for
  })

  standings.forEach((s, i) => { s.rank = i + 1 })
  return standings
}

// ---------------------------------------------------------------------------
// Step 3: Convenience wrapper for API reads (single sweepstake)
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

  if (!sweepstake?.tournament_id) return []

  // Load entries and tournament rankings in parallel
  const [entriesResult, rankings] = await Promise.all([
    supabase.from('entries')
      .select('id, team_id, players(display_name)')
      .eq('sweepstake_id', sweepstakeId),
    computeTournamentRankings(supabase, sweepstake.tournament_id),
  ])

  const entries = (entriesResult.data || []).map(e => ({
    id: e.id,
    team_id: e.team_id,
    player_name: (e.players as unknown as { display_name: string | null })?.display_name || 'Anonymous',
  }))

  return computeStandingsFromRankings(entries, rankings)
}

// ---------------------------------------------------------------------------
// Step 4: Batch materialise ALL active sweepstakes (used by cron)
// Computes tournament rankings ONCE, then materialises each sweepstake
// with zero additional tournament queries.
// ---------------------------------------------------------------------------

export async function materialiseAllStandings(
  supabase: SupabaseClient
): Promise<{ sweepstakes: number; rows: number }> {
  // Get all active sweepstakes grouped by tournament
  const { data: sweepstakes } = await supabase
    .from('sweepstakes')
    .select('id, tournament_id')
    .in('status', ['open', 'drawn'])

  if (!sweepstakes || sweepstakes.length === 0) return { sweepstakes: 0, rows: 0 }

  // Group sweepstakes by tournament
  const byTournament = new Map<string, string[]>()
  for (const sw of sweepstakes) {
    if (!sw.tournament_id) continue
    const list = byTournament.get(sw.tournament_id) || []
    list.push(sw.id)
    byTournament.set(sw.tournament_id, list)
  }

  let totalRows = 0

  for (const [tournamentId, sweepIds] of Array.from(byTournament.entries())) {
    // Compute tournament rankings ONCE for all sweepstakes in this tournament
    const rankings = await computeTournamentRankings(supabase, tournamentId)

    // Load ALL entries for all sweepstakes in ONE query
    const { data: allEntries } = await supabase
      .from('entries')
      .select('id, sweepstake_id, team_id, players(display_name)')
      .in('sweepstake_id', sweepIds)

    if (!allEntries || allEntries.length === 0) continue

    // Group entries by sweepstake
    const entriesBySweep = new Map<string, typeof allEntries>()
    for (const e of allEntries) {
      const list = entriesBySweep.get(e.sweepstake_id) || []
      list.push(e)
      entriesBySweep.set(e.sweepstake_id, list)
    }

    // Delete all old standings in batch
    await supabase.from('standings').delete().in('sweepstake_id', sweepIds)

    // Compute and insert standings for each sweepstake
    const allRows: {
      sweepstake_id: string
      entry_id: string
      rank: number
      team_stage: string
      is_eliminated: boolean
    }[] = []

    for (const [sweepId, entries] of Array.from(entriesBySweep.entries())) {
      const mapped = entries.map(e => ({
        id: e.id,
        team_id: e.team_id,
        player_name: (e.players as unknown as { display_name: string | null })?.display_name || 'Anonymous',
      }))

      const standings = computeStandingsFromRankings(mapped, rankings)

      for (const s of standings) {
        allRows.push({
          sweepstake_id: sweepId,
          entry_id: s.entry_id,
          rank: s.rank,
          team_stage: s.stage_reached,
          is_eliminated: s.is_eliminated,
        })
      }
    }

    // Insert all standings in batches of 500
    for (let i = 0; i < allRows.length; i += 500) {
      const batch = allRows.slice(i, i + 500)
      await supabase.from('standings').insert(batch)
    }

    totalRows += allRows.length
  }

  return { sweepstakes: sweepstakes.length, rows: totalRows }
}

// Backwards-compatible single-sweepstake materialise
export async function materialiseStandings(
  supabase: SupabaseClient,
  sweepstakeId: string
): Promise<number> {
  const standings = await computeSweepstakeStandings(supabase, sweepstakeId)
  if (standings.length === 0) return 0

  await supabase.from('standings').delete().eq('sweepstake_id', sweepstakeId)
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

