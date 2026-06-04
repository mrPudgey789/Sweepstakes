import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchMatches, mapStage, mapStatus } from '@/lib/football-data'

export const dynamic = 'force-dynamic'

// Seed/update fixtures from football-data.org
// Call once to populate, then the poll-results cron keeps them updated

export async function GET() {
  try {
    const supabase = createAdminClient()
    const fdMatches = await fetchMatches()

    if (!fdMatches || fdMatches.length === 0) {
      return NextResponse.json({ message: 'No matches returned from API. Check your FOOTBALL_DATA_API_KEY.' })
    }

    let created = 0
    let updated = 0

    for (const fdMatch of fdMatches) {
      const stage = mapStage(fdMatch.stage)
      const status = mapStatus(fdMatch.status)

      // Map team codes to our team IDs
      let homeTeamId: string | null = null
      let awayTeamId: string | null = null

      if (fdMatch.homeTeam?.tla) {
        const { data: homeTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('code', fdMatch.homeTeam.tla)
          .single()
        homeTeamId = homeTeam?.id || null
      }

      if (fdMatch.awayTeam?.tla) {
        const { data: awayTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('code', fdMatch.awayTeam.tla)
          .single()
        awayTeamId = awayTeam?.id || null
      }

      // Check if match already exists
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('external_ref', String(fdMatch.id))
        .single()

      if (existing) {
        // Update
        await supabase
          .from('matches')
          .update({
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            stage,
            status,
            kickoff_at: fdMatch.utcDate,
            venue: fdMatch.venue || null,
          })
          .eq('id', existing.id)
        updated++
      } else {
        // Insert
        await supabase
          .from('matches')
          .insert({
            tournament_id: (await supabase.from('tournaments').select('id').eq('name', 'FIFA World Cup 2026').single()).data?.id || '',
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            stage,
            status,
            kickoff_at: fdMatch.utcDate,
            venue: fdMatch.venue || null,
            external_ref: String(fdMatch.id),
          })
        created++
      }

      // If match is finished, upsert result (but never overwrite manual overrides)
      if (status === 'finished' && fdMatch.score?.fullTime?.home !== null) {
        const matchId = existing?.id
        if (matchId) {
          const { data: existingResult } = await supabase
            .from('results')
            .select('id, source')
            .eq('match_id', matchId)
            .single()

          if (!existingResult || existingResult.source !== 'manual_override') {
            let winnerTeamId: string | null = null
            if (fdMatch.score.winner === 'HOME_TEAM') winnerTeamId = homeTeamId
            else if (fdMatch.score.winner === 'AWAY_TEAM') winnerTeamId = awayTeamId

            await supabase
              .from('results')
              .upsert({
                match_id: matchId,
                home_score: fdMatch.score.fullTime.home!,
                away_score: fdMatch.score.fullTime.away!,
                winner_team_id: winnerTeamId,
                source: 'feed',
                recorded_at: new Date().toISOString(),
              } as Record<string, unknown>, { onConflict: 'match_id' })
          }
        }
      }
    }

    return NextResponse.json({
      message: `Seeded ${created} new fixtures, updated ${updated}. Total from API: ${fdMatches.length}.`,
    })
  } catch (err) {
    console.error('Seed fixtures error:', err)
    return NextResponse.json({ error: 'Failed to seed fixtures.' }, { status: 500 })
  }
}
