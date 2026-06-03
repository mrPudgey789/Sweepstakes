'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { TeamFlag } from '@/components/team-flag'

interface Standing {
  entry_id: string
  player_name: string
  team_id: string | null
  team_name: string | null
  team_code: string | null
  team_status: string
  stage_reached: string
  group_points: number
  goal_difference: number
  goals_for: number
  rank: number
  is_eliminated: boolean
  is_champion: boolean
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter: 'Quarter-Finals',
  semi: 'Semi-Finals',
  third_place: 'Third Place',
  final: 'Final',
}

export default function StandingsPage() {
  const { id } = useParams()
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/sweepstakes/standings?sweepstake_id=${id}`)
      if (res.ok) {
        setStandings(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-brand-blue border-t-transparent animate-spin" />
        <p className="font-extrabold text-brand-navy">Loading standings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 text-sm font-bold text-brand-blue mb-4 hover:underline"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>

      <h1 className="heading text-4xl sm:text-5xl text-brand-navy mb-8">Standings</h1>

      {standings.length === 0 ? (
        <div className="bg-brand-blue/5 border-2 border-brand-blue/20 rounded-3xl p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-brand-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-brand-navy mb-2">No standings yet</h2>
          <p className="text-brand-navy/50 text-sm max-w-xs mx-auto">
            Standings will appear once the draw has been run and teams are assigned.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {standings.map((s) => (
            <div
              key={s.entry_id}
              className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 transition-colors ${
                s.is_eliminated
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : 'border-brand-navy/10 bg-white'
              }`}
            >
              <span className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-extrabold text-sm flex-shrink-0">
                {s.rank}
              </span>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-navy text-sm truncate">{s.player_name}</p>
                {s.team_name ? (
                  <span className="flex items-center gap-1.5 mt-0.5">
                    {s.team_code && <TeamFlag code={s.team_code} size="sm" />}
                    <span className="text-xs text-brand-navy/50 font-medium">{s.team_name}</span>
                  </span>
                ) : (
                  <span className="text-xs text-brand-navy/30 italic">No team</span>
                )}
              </div>

              <div className="text-right flex-shrink-0 space-y-1">
                <span className="block text-xs text-brand-navy/40 font-medium">
                  {STAGE_LABELS[s.stage_reached] || s.stage_reached}
                </span>
                {s.group_points > 0 && (
                  <span className="block text-[10px] text-brand-navy/30 font-medium">
                    {s.group_points}pts, {s.goal_difference > 0 ? '+' : ''}{s.goal_difference} GD
                  </span>
                )}
              </div>

              <div className="flex-shrink-0">
                {s.is_champion ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300">🏆</span>
                ) : s.is_eliminated ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">Out</span>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-brand-green/20 text-[#1a7a00] border border-brand-green">In</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
