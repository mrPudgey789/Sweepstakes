import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchMatches, mapStage, mapStatus } from '@/lib/football-data'
import { buildTeamIndex, matchTeam } from '@/lib/team-matcher'
import { sendNotification } from '@/lib/email'
import { verifyCronAuth } from '@/lib/cron-auth'
import { materialiseStandings, computeGroupTables } from '@/lib/standings'

// Runs every 5 minutes via Vercel Cron (see vercel.json).
// Polls football-data.org for 2026 World Cup results, updates matches,
// detects eliminations, sends knockout emails, recomputes standings.

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

    // Recompute standings for all active sweepstakes
    const { data: sweepstakes } = await supabase
      .from('sweepstakes')
      .select('id')
      .in('status', ['open', 'drawn'])

    for (const sw of sweepstakes || []) {
      await materialiseStandings(supabase, sw.id)
    }

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
  await sendKnockoutNotifications(supabase, teamId, teamRow.name, stage)

  return teamRow.name
}

async function sendKnockoutNotifications(
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

  for (const entry of entries) {
    const sweepstake = (entry as Record<string, unknown>).sweepstakes as { name: string; status: string }
    if (sweepstake.status === 'closed') continue

    // Idempotency: skip if knockout notification already exists for this entry
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('entry_id', entry.id)
      .eq('type', 'knockout')
      .limit(1)
      .maybeSingle()

    if (existing) continue

    const player = (entry as Record<string, unknown>).players as { email: string; display_name: string | null }

    sendNotification({
      type: 'knockout',
      entryId: entry.id,
      email: player.email,
      data: {
        playerName: player.display_name || 'there',
        teamName,
        stage,
        sweepstakeName: sweepstake.name,
      },
    }).catch(console.error)
  }
}

/**
 * Check if any group is fully played and eliminate teams that did not qualify.
 * In 2026 format: 48 teams, 12 groups of 4, top 2 per group + 8 best 3rd-place advance.
 * For simplicity: bottom team of each completed group is eliminated.
 * In 2022 format: 32 teams, 8 groups of 4, top 2 advance, bottom 2 eliminated.
 */
async function checkGroupEliminations(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  groupsToCheck: Set<string>
): Promise<string[]> {
  const eliminated: string[] = []

  // Get team count to determine format
  const { count: teamCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)

  const is48Team = (teamCount || 0) > 32
  const matchesPerGroup = is48Team ? 6 : 6 // 4 teams = 6 matches per group in both formats

  const groupTables = await computeGroupTables(supabase, tournamentId)

  for (const groupLetter of Array.from(groupsToCheck)) {
    const table = groupTables.get(groupLetter)
    if (!table) continue

    // Check if all group matches are played
    const totalPlayed = table.reduce((sum, row) => sum + row.played, 0) / 2 // each match counted twice
    if (totalPlayed < matchesPerGroup) continue // group not complete

    // In 2026: top 2 advance, 3rd might advance (best 3rd-place), 4th is out.
    // In 2022: top 2 advance, bottom 2 out.
    // For now: eliminate the bottom team for certain. The 3rd-place team's fate
    // in 2026 depends on other groups, so we only eliminate the definite 4th.
    // In 2022: eliminate bottom 2.
    const eliminateCount = is48Team ? 1 : 2 // safe: 4th is always out in 2026, bottom 2 in 2022
    const toEliminate = table.slice(table.length - eliminateCount)

    for (const row of toEliminate) {
      const result = await eliminateTeam(supabase, row.team_id, `Group ${groupLetter}`)
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
