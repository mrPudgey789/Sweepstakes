import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchMatches, mapStage, mapStatus } from '@/lib/football-data'
import { buildTeamIndex, matchTeam } from '@/lib/team-matcher'
import { sendNotification } from '@/lib/email'

// This route should be called on a schedule (e.g. every 5 minutes during matches,
// every few hours otherwise). In production, use Vercel Cron or a scheduled function.

export async function GET(request: Request) {
  // Simple auth check for cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const fdMatches = await fetchMatches()

    if (!fdMatches.length) {
      return NextResponse.json({ message: 'No matches from API' })
    }

    // Load our teams and build the matcher index
    const { data: ourTeams } = await supabase
      .from('teams')
      .select('id, name, code, aliases')
      .eq('tournament_id', (await supabase.from('tournaments').select('id').eq('name', 'FIFA World Cup 2026').single()).data?.id || '')

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

        if (!homeTeam) {
          unmatchedTeams.push(fdMatch.homeTeam.name)
          continue
        }
        if (!awayTeam) {
          unmatchedTeams.push(fdMatch.awayTeam.name)
          continue
        }

        // Find our fixture by team pair + same date
        const fdDate = fdMatch.utcDate.slice(0, 10)
        const found = (ourMatches || []).find(m => {
          const ourDate = m.kickoff_at.slice(0, 10)
          return ourDate === fdDate && (
            (m.home_team_id === homeTeam.id && m.away_team_id === awayTeam.id) ||
            (m.home_team_id === awayTeam.id && m.away_team_id === homeTeam.id)
          )
        })

        if (found) {
          // Store external_ref so future polls match directly
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
              winner_team_id: null, // not final yet
              source: 'feed',
              recorded_at: new Date().toISOString(),
            } as Record<string, unknown>, { onConflict: 'match_id' })
        }
      }

      // Process finished matches
      if (status === 'finished' && fdMatch.score.fullTime.home !== null) {
        // Check if we already have a manual override
        const { data: existingResult } = await supabase
          .from('results')
          .select('id, source')
          .eq('match_id', matchRow.id)
          .single()

        // Never overwrite a manual override
        const resultRow = existingResult as { id: string; source: string } | null
        if (resultRow?.source === 'manual_override') continue

        // Determine winner
        let winnerTeamId: string | null = null
        if (fdMatch.score.winner === 'HOME_TEAM') {
          winnerTeamId = matchRow.home_team_id
        } else if (fdMatch.score.winner === 'AWAY_TEAM') {
          winnerTeamId = matchRow.away_team_id
        }

        // Upsert result
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

        // Knockout detection: if knockout stage and there is a winner, loser is eliminated
        if (stage !== 'group' && winnerTeamId) {
          const loserId = matchRow.home_team_id === winnerTeamId
            ? matchRow.away_team_id
            : matchRow.home_team_id

          if (loserId) {
            const { data: team } = await supabase
              .from('teams')
              .select('id, status, name')
              .eq('id', loserId)
              .single()

            const teamRow = team as { id: string; status: string; name: string } | null
            if (teamRow && teamRow.status !== 'eliminated') {
              await supabase
                .from('teams')
                .update({
                  status: 'eliminated',
                  eliminated_at: new Date().toISOString(),
                } as Record<string, unknown>)
                .eq('id', loserId)

              eliminatedTeams.push(teamRow.name)

              // Send knockout notifications
              await sendKnockoutNotifications(supabase, loserId, teamRow.name, stage)
            }
          }
        }
      }
    }

    // Dedupe unmatched teams
    unmatchedTeams = Array.from(new Set(unmatchedTeams))

    return NextResponse.json({
      message: `Polled ${fdMatches.length} matches. Updated ${updatedCount} results. Eliminated: ${eliminatedTeams.join(', ') || 'none'}.`,
      unmatched_teams: unmatchedTeams,
    })
  } catch (err) {
    console.error('Poll results error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

async function sendKnockoutNotifications(
  supabase: ReturnType<typeof createAdminClient>,
  teamId: string,
  teamName: string,
  stage: string
) {
  // Find all entries with this team across open sweepstakes
  const { data: entries } = await supabase
    .from('entries')
    .select(`
      id,
      sweepstake_id,
      players!inner(email),
      sweepstakes!inner(name, status)
    `)
    .eq('team_id', teamId)

  if (!entries) return

  for (const entry of entries) {
    const sweepstake = (entry as Record<string, unknown>).sweepstakes as { name: string; status: string }
    if (sweepstake.status === 'closed') continue

    // Duplicate guard: check if knockout notification already sent for this entry
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('entry_id', entry.id)
      .eq('type', 'knockout')
      .limit(1)
      .single()

    if (existing) continue

    const player = (entry as Record<string, unknown>).players as { email: string }

    sendNotification({
      type: 'knockout',
      entryId: entry.id,
      email: player.email,
      data: {
        teamName,
        stage,
        sweepstakeName: sweepstake.name,
      },
    }).catch(console.error)
  }
}
