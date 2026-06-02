'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface StandingRow {
  id: string
  rank: number
  team_stage: string
  is_eliminated: boolean
  entry: {
    id: string
    final_position: number | null
    payment_state: string
    players: { display_name: string | null; email: string }
    teams: { name: string; code: string; status: string } | null
  }
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter: 'Quarter-Finals',
  semi: 'Semi-Finals',
  third_place: 'Third Place',
  final: 'Final / Winner',
}

export default function StandingsPage() {
  const { id } = useParams()
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [noStandings, setNoStandings] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data } = await supabase
        .from('standings')
        .select(`
          id, rank, team_stage, is_eliminated,
          entry:entries!inner(
            id, final_position, payment_state,
            players!inner(display_name, email),
            teams(name, code, status)
          )
        `)
        .eq('sweepstake_id', id as string)
        .order('rank')

      if (!data || data.length === 0) {
        setNoStandings(true)
      } else {
        setStandings(data as unknown as StandingRow[])
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p className="text-gray-500">Loading standings...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Standings</h1>

      {noStandings ? (
        <div className="text-center py-12 text-gray-500">
          <p>No standings computed yet.</p>
          <p className="text-sm mt-2">
            Standings are calculated once match results start coming in.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium w-12">#</th>
                <th className="text-left px-4 py-2 font-medium">Player</th>
                <th className="text-left px-4 py-2 font-medium">Team</th>
                <th className="text-left px-4 py-2 font-medium">Stage reached</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {standings.map((s) => (
                <tr key={s.id} className={s.is_eliminated ? 'text-gray-400' : ''}>
                  <td className="px-4 py-2 font-semibold">{s.rank}</td>
                  <td className="px-4 py-2">
                    {s.entry?.players?.display_name || s.entry?.players?.email}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {s.entry?.teams?.name || 'Unassigned'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {STAGE_LABELS[s.team_stage] || s.team_stage}
                  </td>
                  <td className="px-4 py-2">
                    {s.is_eliminated ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Out</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">In</span>
                    )}
                    {s.entry?.final_position && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                        {s.entry.final_position === 1 ? 'Winner' :
                         s.entry.final_position === 2 ? '2nd' :
                         s.entry.final_position === 3 ? '3rd' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
