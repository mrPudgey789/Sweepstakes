import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STAGE_WEIGHT: Record<string, number> = {
  group: 1,
  round_of_32: 2,
  round_of_16: 3,
  quarter: 4,
  semi: 5,
  third_place: 6,
  final: 7,
}

// Recompute standings for all open/drawn sweepstakes
// Call after poll-results or after a manual override

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Get all active sweepstakes
    const { data: sweepstakes } = await supabase
      .from('sweepstakes')
      .select('id')
      .in('status', ['open', 'drawn'])

    if (!sweepstakes || sweepstakes.length === 0) {
      return NextResponse.json({ message: 'No active sweepstakes.' })
    }

    let totalUpdated = 0

    for (const sw of sweepstakes) {
      // Get entries with teams
      const { data: entries } = await supabase
        .from('entries')
        .select('id, team_id, teams(id, status, eliminated_at)')
        .eq('sweepstake_id', sw.id)
        .not('team_id', 'is', null)

      if (!entries || entries.length === 0) continue

      // For each entry, determine the furthest stage their team reached
      const entryStages: {
        entry_id: string
        team_id: string
        best_stage: string
        is_eliminated: boolean
        stage_weight: number
      }[] = []

      for (const entry of entries) {
        const teamData = (entry as Record<string, unknown>).teams as {
          id: string
          status: string
          eliminated_at: string | null
        } | null

        if (!teamData) continue

        // Find the furthest match this team played in
        const { data: teamMatches } = await supabase
          .from('matches')
          .select('stage, status')
          .eq('tournament_id', (await supabase.from('tournaments').select('id').eq('name', 'FIFA World Cup 2026').single()).data?.id || '')
          .or(`home_team_id.eq.${entry.team_id},away_team_id.eq.${entry.team_id}`)
          .eq('status', 'finished')

        let bestStage = 'group'
        let bestWeight = 0

        for (const m of teamMatches || []) {
          const w = STAGE_WEIGHT[m.stage] || 0
          if (w > bestWeight) {
            bestWeight = w
            bestStage = m.stage
          }
        }

        entryStages.push({
          entry_id: entry.id,
          team_id: entry.team_id!,
          best_stage: bestStage,
          is_eliminated: teamData.status === 'eliminated',
          stage_weight: bestWeight,
        })
      }

      // Sort: active teams first (by stage weight desc), then eliminated (by stage weight desc)
      entryStages.sort((a, b) => {
        if (a.is_eliminated !== b.is_eliminated) {
          return a.is_eliminated ? 1 : -1
        }
        return b.stage_weight - a.stage_weight
      })

      // Delete old standings
      await supabase
        .from('standings')
        .delete()
        .eq('sweepstake_id', sw.id)

      // Insert new standings
      const standingsRows = entryStages.map((e, i) => ({
        sweepstake_id: sw.id,
        entry_id: e.entry_id,
        rank: i + 1,
        team_stage: e.best_stage,
        is_eliminated: e.is_eliminated,
      }))

      if (standingsRows.length > 0) {
        await supabase.from('standings').insert(standingsRows)
        totalUpdated += standingsRows.length
      }
    }

    return NextResponse.json({
      message: `Recomputed standings for ${sweepstakes.length} sweepstakes. ${totalUpdated} rows updated.`,
    })
  } catch (err) {
    console.error('Recompute standings error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
