'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface Match {
  id: string
  stage: string
  kickoff_at: string
  venue: string | null
  status: string
  home_team: { name: string; code: string } | null
  away_team: { name: string; code: string } | null
  result: { home_score: number; away_score: number; source: string } | null
}

const STAGE_ORDER = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final']

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter: 'Quarter-Finals',
  semi: 'Semi-Finals',
  third_place: 'Third Place Play-Off',
  final: 'Final',
}

export default function FixturesPage() {
  const { id } = useParams()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [, setPlayerTeamIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Get matches with results
      const { data: rawMatches } = await supabase
        .from('matches')
        .select(`
          id, stage, kickoff_at, venue, status,
          home_team:teams!matches_home_team_id_fkey(name, code),
          away_team:teams!matches_away_team_id_fkey(name, code),
          result:results(home_score, away_score, source)
        `)
        .eq('tournament_id', '00000000-0000-0000-0000-000000002026')
        .order('kickoff_at')

      // Get player's team IDs in this sweepstake (for highlighting)
      const { data: entries } = await supabase
        .from('entries')
        .select('team_id')
        .eq('sweepstake_id', id as string)
        .not('team_id', 'is', null)

      const teamIds = new Set((entries || []).map((e) => e.team_id).filter(Boolean) as string[])
      setPlayerTeamIds(teamIds)

      // Flatten the joined data
      const processed = (rawMatches || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        stage: m.stage as string,
        kickoff_at: m.kickoff_at as string,
        venue: m.venue as string | null,
        status: m.status as string,
        home_team: Array.isArray(m.home_team) ? m.home_team[0] : m.home_team,
        away_team: Array.isArray(m.away_team) ? m.away_team[0] : m.away_team,
        result: Array.isArray(m.result) && m.result.length > 0 ? m.result[0] : null,
      })) as Match[]

      setMatches(processed)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p className="text-gray-500">Loading fixtures...</p>

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-2">Fixtures</h1>
        <p className="text-gray-500">
          No fixtures loaded yet. The fixtures will appear once the tournament schedule is seeded.
        </p>
      </div>
    )
  }

  // Group by stage
  const grouped: Record<string, Match[]> = {}
  for (const m of matches) {
    if (!grouped[m.stage]) grouped[m.stage] = []
    grouped[m.stage].push(m)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Fixtures</h1>

      {STAGE_ORDER.map((stage) => {
        const stageMatches = grouped[stage]
        if (!stageMatches) return null

        return (
          <div key={stage} className="mb-8">
            <h2 className="text-lg font-semibold mb-3">{STAGE_LABELS[stage] || stage}</h2>
            <div className="space-y-2">
              {stageMatches.map((m) => (
                <div
                  key={m.id}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {m.home_team?.name || 'TBD'}
                      </span>
                      {m.result ? (
                        <span className="font-bold text-lg">
                          {m.result.home_score} - {m.result.away_score}
                        </span>
                      ) : (
                        <span className="text-gray-400">vs</span>
                      )}
                      <span className="font-medium">
                        {m.away_team?.name || 'TBD'}
                      </span>
                      {m.result?.source === 'manual_override' && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                          Override
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(m.kickoff_at).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {m.venue && ` \u00B7 ${m.venue}`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-3 ${
                    m.status === 'finished' ? 'bg-gray-100 text-gray-600' :
                    m.status === 'live' ? 'bg-red-100 text-red-700' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {m.status === 'finished' ? 'FT' :
                     m.status === 'live' ? 'LIVE' :
                     'Upcoming'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
