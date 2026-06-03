import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchMatches, mapStage, mapStatus } from '@/lib/football-data'
import { buildTeamIndex, matchTeam } from '@/lib/team-matcher'
import { verifyCronAuth } from '@/lib/cron-auth'
import { materialiseAllStandings } from '@/lib/standings'

// Runs every 5 minutes via Vercel Cron (see vercel.json).
// Polls football-data.org for 2026 World Cup results, updates matches,
// detects eliminations, enqueues knockout notifications, recomputes standings.

export const maxDuration = 60 // seconds

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Record heartbeat at the start
    await recordHeartbeat(supabase, 'started')

    const fdMatches = await fetchMatches()

    if (!fdMatches.length) {
      await recordHeartbeat(supabase, 'completed', 'No matches from API')
      return NextResponse.json({ message: 'No matches from API' })
    }

    // Get the 2026 tournament
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id')
      .eq('name', 'FIFA World Cup 2026')
      .single()

    if (!tournament) {
      await recordHeartbeat(supabase, 'error', 'No 2026 tournament found')
      return NextResponse.json({ error: 'No tournament found' }, { status: 500 })
    }

    const tournamentId = tournament.id

    // Load our teams and build the matcher index
    const { data: ourTeams } = await supabase
      .from('teams')
      .select('id, name, code, aliases')
      .eq('tournament_id', tournamentId)

    const teamIndex = buildTeamIndex((ourTeams || []).map(t => ({
      id: t.id,
      name: t.name,
      code: t.code,
      aliases: (t.aliases as string[]) || [],
    })))

    // Load our matches for fallback matching
    const { data: ourMatches } = await supabase
      .from('matches')
      .select('id, home_team_id, away_team_id, kickoff_at, external_ref')

    let updatedCount = 0
    let unmatchedTeams: string[] = []
    const eliminatedTeams: string[] = []
    const groupsToCheck = new Set<string>()

    for (const fdMatch of fdMatches) {
      const status = mapStatus(fdMatch.status)
      const stage = mapStage(fdMatch.stage)

      // Try to find matching match by external_ref first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let matchRow: any = null

      const { data: byRef } = await supabase
        .from('matches')
        .select('id, status, home_team_id, away_team_id')
        .eq('external_ref', String(fdMatch.id))
        .maybeSingle()

      if (byRef) {
        matchRow = byRef
      } else {
        // Fallback: match by team pair + date
        const homeTeam = matchTeam(teamIndex, fdMatch.homeTeam.tla, fdMatch.homeTeam.name)
        const awayTeam = matchTeam(teamIndex, fdMatch.awayTeam.tla, fdMatch.awayTeam.name)

        if (!homeTeam) { unmatchedTeams.push(fdMatch.homeTeam.name); continue }
        if (!awayTeam) { unmatchedTeams.push(fdMatch.awayTeam.name); continue }

        const fdDate = fdMatch.utcDate.slice(0, 10)
        const found = (ourMatches || []).find(m => {
          const ourDate = m.kickoff_at.slice(0, 10)
          return ourDate === fdDate && (
            (m.home_team_id === homeTeam.id && m.away_team_id === awayTeam.id) ||
            (m.home_team_id === awayTeam.id && m.away_team_id === homeTeam.id)
          )
        })

        if (found) {
          await supabase.from('matches').update({ external_ref: String(fdMatch.id) }).eq('id', found.id)
          const { data: refreshed } = await supabase
            .from('matches')
            .select('id, status, home_team_id, away_team_id')
            .eq('id', found.id)
            .single()
          matchRow = refreshed
        }
      }

      if (!matchRow) continue

      // Update match status
      if (matchRow.status !== status) {
        await supabase
          .from('matches')
          .update({ status } as Record<string, unknown>)
          .eq('id', matchRow.id)
      }

      // Write live score for in-play matches
      if (status === 'live' && fdMatch.score.fullTime.home !== null) {
        const { data: existingResult } = await supabase
          .from('results')
          .select('id, source')
          .eq('match_id', matchRow.id)
          .maybeSingle()

        const liveResult = existingResult as { id: string; source: string } | null
        if (liveResult?.source !== 'manual_override') {
          await supabase
            .from('results')
            .upsert({
              match_id: matchRow.id,
              home_score: fdMatch.score.fullTime.home!,
              away_score: fdMatch.score.fullTime.away!,
              winner_team_id: null,
              source: 'feed',
              recorded_at: new Date().toISOString(),
            } as Record<string, unknown>, { onConflict: 'match_id' })
        }
      }

      // Process finished matches
      if (status === 'finished' && fdMatch.score.fullTime.home !== null) {
        const { data: existingResult } = await supabase
          .from('results')
          .select('id, source')
          .eq('match_id', matchRow.id)
          .maybeSingle()

        const resultRow = existingResult as { id: string; source: string } | null
        if (resultRow?.source === 'manual_override') continue

        let winnerTeamId: string | null = null
        if (fdMatch.score.winner === 'HOME_TEAM') winnerTeamId = matchRow.home_team_id
        else if (fdMatch.score.winner === 'AWAY_TEAM') winnerTeamId = matchRow.away_team_id

        await supabase
          .from('results')
          .upsert({
            match_id: matchRow.id,
            home_score: fdMatch.score.fullTime.home!,
            away_score: fdMatch.score.fullTime.away!,
            winner_team_id: winnerTeamId,
            source: 'feed',
            recorded_at: new Date().toISOString(),
          } as Record<string, unknown>, { onConflict: 'match_id' })

        updatedCount++

        // Knockout elimination
        if (stage !== 'group' && stage !== 'semi' && winnerTeamId) {
          const loserId = matchRow.home_team_id === winnerTeamId
            ? matchRow.away_team_id
            : matchRow.home_team_id

          // Loser is always eliminated (except semi-final losers who play 3rd place)
          if (loserId) {
            const eliminated = await eliminateTeam(supabase, loserId, stage)
            if (eliminated) eliminatedTeams.push(eliminated)
          }

          // Third-place match: the winner also gets eliminated (3rd place, not champion)
          if (stage === 'third_place') {
            const eliminated = await eliminateTeam(supabase, winnerTeamId, stage)
            if (eliminated) eliminatedTeams.push(eliminated)
          }
        }

        // Track which groups have finished matches (for group elimination)
        if (stage === 'group') {
          // Find the group letter for these teams
          const team = ourTeams?.find(t => t.id === matchRow.home_team_id)
          if (team) {
            const teamWithGroup = await supabase
              .from('teams')
              .select('group_letter')
              .eq('id', team.id)
              .single()
            if (teamWithGroup.data?.group_letter) {
              groupsToCheck.add(teamWithGroup.data.group_letter)
            }
          }
        }
      }
    }

    // Check group-stage elimination for any groups that had results updated
    if (groupsToCheck.size > 0) {
      const groupEliminated = await checkGroupEliminations(supabase, tournamentId, groupsToCheck)
      eliminatedTeams.push(...groupEliminated)
    }

    // Recompute standings for ALL active sweepstakes in one batch
    await materialiseAllStandings(supabase)

    unmatchedTeams = Array.from(new Set(unmatchedTeams))

    const summary = `Polled ${fdMatches.length} matches. Updated ${updatedCount}. Eliminated: ${eliminatedTeams.join(', ') || 'none'}.`
    await recordHeartbeat(supabase, 'completed', summary)

    return NextResponse.json({
      message: summary,
      unmatched_teams: unmatchedTeams,
    })
  } catch (err) {
    console.error('Poll results error:', err)
    const supabase = createAdminClient()
    await recordHeartbeat(supabase, 'error', String(err))
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function eliminateTeam(
  supabase: ReturnType<typeof createAdminClient>,
  teamId: string,
  stage: string
): Promise<string | null> {
  const { data: team } = await supabase
    .from('teams')
    .select('id, status, name')
    .eq('id', teamId)
    .single()

  const teamRow = team as { id: string; status: string; name: string } | null
  if (!teamRow || teamRow.status === 'eliminated') return null

  await supabase
    .from('teams')
    .update({ status: 'eliminated', eliminated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', teamId)

  // Send knockout notifications across all active sweepstakes
  await enqueueKnockoutNotifications(supabase, teamId, teamRow.name, stage)

  return teamRow.name
}

/** Enqueue knockout notifications (does NOT send; the drain-queue cron sends) */
async function enqueueKnockoutNotifications(
  supabase: ReturnType<typeof createAdminClient>,
  teamId: string,
  teamName: string,
  stage: string
) {
  const { data: entries } = await supabase
    .from('entries')
    .select('id, sweepstake_id, players!inner(email, display_name), sweepstakes!inner(name, status)')
    .eq('team_id', teamId)

  if (!entries) return

  // Batch check existing notifications to avoid per-entry queries
  const entryIds = entries.map(e => e.id)
  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('entry_id')
    .in('entry_id', entryIds)
    .eq('type', 'knockout')

  const alreadySent = new Set((existingNotifs || []).map(n => n.entry_id))

  const toInsert: {
    entry_id: string
    type: string
    status: string
    payload: Record<string, unknown>
  }[] = []

  for (const entry of entries) {
    const sweepstake = (entry as Record<string, unknown>).sweepstakes as { name: string; status: string }
    if (sweepstake.status === 'closed') continue
    if (alreadySent.has(entry.id)) continue

    const player = (entry as Record<string, unknown>).players as { email: string; display_name: string | null }

    toInsert.push({
      entry_id: entry.id,
      type: 'knockout',
      status: 'queued',
      payload: {
        email: player.email,
        playerName: player.display_name || 'there',
        teamName,
        stage,
        sweepstakeName: sweepstake.name,
      },
    })
  }

  // Batch insert all queued notifications
  if (toInsert.length > 0) {
    await supabase.from('notifications').insert(toInsert)
  }
}

/**
 * Check if any group is fully played and eliminate teams that did not qualify.
 * Computes group tables inline (one query, runs once per poll, not per sweepstake).
 */
async function checkGroupEliminations(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  groupsToCheck: Set<string>
): Promise<string[]> {
  const eliminated: string[] = []

  // Load teams and group matches in parallel
  const [teamsResult, matchesResult] = await Promise.all([
    supabase.from('teams').select('id, name, group_letter').eq('tournament_id', tournamentId),
    supabase.from('matches').select('home_team_id, away_team_id, stage, results(home_score, away_score)')
      .eq('tournament_id', tournamentId).eq('stage', 'group').eq('status', 'finished'),
  ])

  const teams = teamsResult.data || []
  const matches = matchesResult.data || []
  const is48Team = teams.length > 32

  // Build per-group stats
  const groupStats = new Map<string, Map<string, { id: string; name: string; pts: number; gd: number; gf: number; played: number }>>()
  for (const t of teams) {
    if (!groupStats.has(t.group_letter)) groupStats.set(t.group_letter, new Map())
    groupStats.get(t.group_letter)!.set(t.id, { id: t.id, name: t.name, pts: 0, gd: 0, gf: 0, played: 0 })
  }

  const teamGroup = new Map<string, string>()
  for (const t of teams) teamGroup.set(t.id, t.group_letter)

  for (const m of matches) {
    const r = Array.isArray(m.results) ? m.results[0] : m.results
    if (!r || !m.home_team_id || !m.away_team_id) continue
    const g = teamGroup.get(m.home_team_id as string)
    if (!g) continue
    const group = groupStats.get(g)
    if (!group) continue
    const home = group.get(m.home_team_id as string)
    const away = group.get(m.away_team_id as string)
    if (!home || !away) continue

    home.played++; away.played++
    home.gf += r.home_score; home.gd += r.home_score - r.away_score
    away.gf += r.away_score; away.gd += r.away_score - r.home_score
    if (r.home_score > r.away_score) home.pts += 3
    else if (r.home_score < r.away_score) away.pts += 3
    else { home.pts += 1; away.pts += 1 }
  }

  for (const groupLetter of Array.from(groupsToCheck)) {
    const group = groupStats.get(groupLetter)
    if (!group) continue

    const rows = Array.from(group.values())
    const totalPlayed = rows.reduce((sum, r) => sum + r.played, 0) / 2
    if (totalPlayed < 6) continue // group not complete

    rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

    // Bottom 1 in 2026 (4th always out), bottom 2 in 2022
    const eliminateCount = is48Team ? 1 : 2
    for (const row of rows.slice(rows.length - eliminateCount)) {
      const result = await eliminateTeam(supabase, row.id, `Group ${groupLetter}`)
      if (result) eliminated.push(result)
    }
  }

  return eliminated
}

/**
 * Record a heartbeat for the dead-man's switch.
 * Stores the last poll time and status in a simple key-value approach
 * using the notifications table (or a dedicated table if you prefer).
 * We use Supabase's built-in updated_at on a dedicated row.
 */
async function recordHeartbeat(
  supabase: ReturnType<typeof createAdminClient>,
  status: 'started' | 'completed' | 'error',
  details?: string
) {
  // Store heartbeat in a simple format: upsert a row keyed by 'poll-results'
  try {
    await supabase.from('cron_heartbeats').upsert({
      job_name: 'poll-results',
      status,
      details: details || null,
      last_run_at: new Date().toISOString(),
    }, { onConflict: 'job_name' })
  } catch {
    // Table might not exist yet, that is fine
  }
}
