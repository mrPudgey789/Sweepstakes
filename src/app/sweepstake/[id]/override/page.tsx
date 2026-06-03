'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface Match {
  id: string
  stage: string
  kickoff_at: string
  status: string
  home_team: { id: string; name: string } | null
  away_team: { id: string; name: string } | null
}

export default function OverrideResultPage() {
  const { id } = useParams()
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('matches')
        .select(`
          id, stage, kickoff_at, status,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .eq('tournament_id', (await supabase.from('tournaments').select('id').eq('name', 'FIFA World Cup 2026').single()).data?.id || '')
        .order('kickoff_at')

      const processed = (data || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        stage: m.stage as string,
        kickoff_at: m.kickoff_at as string,
        status: m.status as string,
        home_team: Array.isArray(m.home_team) ? m.home_team[0] : m.home_team,
        away_team: Array.isArray(m.away_team) ? m.away_team[0] : m.away_team,
      })) as Match[]

      setMatches(processed)
    }
    load()
  }, [])

  const selected = matches.find((m) => m.id === selectedMatch)

  async function handleOverride() {
    if (!selectedMatch) return
    setLoading(true)
    setMessage(null)

    const res = await fetch(`/api/sweepstakes/${id}/override-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: selectedMatch,
        home_score: homeScore,
        away_score: awayScore,
        winner_team_id: winnerId,
      }),
    })

    const result = await res.json()
    if (res.ok) {
      setMessage('Result overridden successfully. Standings will be recomputed.')
      setSelectedMatch(null)
      setHomeScore('')
      setAwayScore('')
      setWinnerId(null)
    } else {
      setMessage(result.error || 'Failed to override.')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Override a result</h1>
      <p className="text-sm text-gray-500 mb-6">
        Correct or set a match result when the data feed is wrong or late.
        This may trigger knockout emails if a team is eliminated.
      </p>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4 text-sm">
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select match</label>
          <select
            value={selectedMatch || ''}
            onChange={(e) => {
              setSelectedMatch(e.target.value || null)
              setHomeScore('')
              setAwayScore('')
              setWinnerId(null)
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Choose a match</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.home_team?.name || 'TBD'} vs {m.away_team?.name || 'TBD'} ({m.stage.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {selected.home_team?.name || 'Home'} score
                </label>
                <input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {selected.away_team?.name || 'Away'} score
                </label>
                <input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            {selected.stage !== 'group' && (
              <div>
                <label className="block text-sm font-medium mb-1">Winner (for knockout stages)</label>
                <select
                  value={winnerId || ''}
                  onChange={(e) => setWinnerId(e.target.value || null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Draw / no winner yet</option>
                  {selected.home_team && (
                    <option value={selected.home_team.id}>{selected.home_team.name}</option>
                  )}
                  {selected.away_team && (
                    <option value={selected.away_team.id}>{selected.away_team.name}</option>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Setting a winner in a knockout match will eliminate the losing team and may trigger knockout emails.
                </p>
              </div>
            )}

            <button
              onClick={handleOverride}
              disabled={loading || !homeScore || !awayScore}
              className="w-full bg-orange-600 text-white py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Override result'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
