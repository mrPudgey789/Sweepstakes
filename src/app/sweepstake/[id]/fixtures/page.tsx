'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { TeamFlag } from '@/components/team-flag'

interface Match {
  id: string
  stage: string
  kickoff_at: string
  venue: string | null
  status: string
  home_team: { id: string; name: string; code: string } | null
  away_team: { id: string; name: string; code: string } | null
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

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FixturesPage() {
  const { id } = useParams()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [teamPlayers, setTeamPlayers] = useState<Record<string, string>>({})

  async function loadMatches() {
    const supabase = createClient()

    // Get tournament from the sweepstake
    const { data: sweep } = await supabase
      .from('sweepstakes')
      .select('tournament_id')
      .eq('id', id as string)
      .maybeSingle()

    if (!sweep?.tournament_id) { setLoading(false); return [] }
    const tournament = { id: sweep.tournament_id }

    const { data: rawMatches } = await supabase
      .from('matches')
      .select(`
        id, stage, kickoff_at, venue, status, match_number, home_slot, away_slot,
        home_team:teams!matches_home_team_id_fkey(id, name, code),
        away_team:teams!matches_away_team_id_fkey(id, name, code),
        result:results(home_score, away_score, source)
      `)
      .eq('tournament_id', tournament.id)
      .order('kickoff_at')

    // Build team_id -> player name map
    const { data: entries } = await supabase
      .from('entries')
      .select('team_id, players(display_name, email)')
      .eq('sweepstake_id', id as string)
      .not('team_id', 'is', null)

    const map: Record<string, string> = {}
    for (const e of entries || []) {
      const player = (e as Record<string, unknown>).players as { display_name: string | null; email: string } | null
      if (e.team_id && player) {
        map[e.team_id] = player.display_name || player.email.split('@')[0]
      }
    }
    setTeamPlayers(map)

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

    return processed
  }

  async function triggerPollAndReload() {
    setPolling(true)
    try {
      await fetch('/api/cron/poll-results', { method: 'POST' })
    } catch {
      // best effort
    }
    const fresh = await loadMatches()
    setMatches(fresh)
    setPolling(false)
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      // Trigger a fixture fetch on mount in case the DB is empty
      try {
        await fetch('/api/cron/poll-results', { method: 'POST' })
      } catch {
        // best effort
      }
      const data = await loadMatches()
      setMatches(data)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-brand-blue border-t-transparent animate-spin" />
        <p className="font-extrabold text-brand-navy">Loading fixtures...</p>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-20 px-4 gap-6">
        {/* Simple SVG illustration */}
        <svg viewBox="0 0 96 96" fill="none" className="w-24 h-24 opacity-60" aria-hidden="true">
          <circle cx="48" cy="48" r="44" stroke="#1A56DB" strokeWidth="4" />
          <path d="M28 48h40M48 28v40" stroke="#65FF47" strokeWidth="5" strokeLinecap="round" />
          <circle cx="48" cy="48" r="10" fill="#A5D9FF" />
        </svg>
        <div>
          <h1 className="heading text-4xl text-brand-navy mb-2">No fixtures yet</h1>
          <p className="text-gray-500 max-w-xs">
            The tournament schedule hasn&apos;t been loaded. Hit the button below to check for fixtures.
          </p>
        </div>
        <button
          onClick={triggerPollAndReload}
          disabled={polling}
          className="btn-primary"
        >
          {polling ? 'Checking...' : 'Check for fixtures'}
        </button>
      </div>
    )
  }

  // ── Group by stage ─────────────────────────────────────────────────────────
  const grouped: Record<string, Match[]> = {}
  for (const m of matches) {
    if (!grouped[m.stage]) grouped[m.stage] = []
    grouped[m.stage].push(m)
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 text-sm font-bold text-brand-blue mb-4 hover:underline"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>
      <h1 className="heading text-5xl text-brand-navy mb-8">Fixtures</h1>

      {STAGE_ORDER.map((stage) => {
        const stageMatches = grouped[stage]
        if (!stageMatches) return null

        return (
          <div key={stage} className="mb-10">
            {/* Stage heading */}
            <div className="flex items-center gap-3 mb-4">
              <span className="heading text-xl text-brand-blue">
                {STAGE_LABELS[stage] || stage}
              </span>
              <div className="flex-1 h-0.5 bg-brand-blue/20 rounded-full" />
            </div>

            <div className="space-y-3">
              {stageMatches.map((m) => {
                const isLive = m.status === 'live'
                const isFinished = m.status === 'finished'
                const homeWon = m.result && m.result.home_score > m.result.away_score
                const awayWon = m.result && m.result.away_score > m.result.home_score
                // const isDraw = m.result && m.result.home_score === m.result.away_score

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border-2 p-5 flex flex-col gap-3 transition-colors duration-150 ${
                      isFinished
                        ? 'bg-gray-50 border-gray-200'
                        : isLive
                        ? 'bg-brand-green/5 border-brand-green'
                        : 'bg-white border-brand-navy/10 hover:border-brand-blue'
                    }`}
                  >
                    {/* Live badge */}
                    {isLive && (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-green" />
                        </span>
                        <span className="text-xs font-extrabold uppercase tracking-widest text-brand-green">Live</span>
                      </div>
                    )}

                    {/* Teams + score row */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Home team */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2.5">
                          {m.home_team?.code && <TeamFlag code={m.home_team.code} size="lg" />}
                          <span className={`font-extrabold text-base ${
                            isFinished && awayWon ? 'text-brand-navy/40' : 'text-brand-navy'
                          }`}>{m.home_team?.name || 'TBD'}</span>
                        </div>
                        {m.home_team?.id && teamPlayers[m.home_team.id] && (
                          <span className="block text-xs text-brand-blue font-semibold ml-12 mt-0.5">{teamPlayers[m.home_team.id]}</span>
                        )}
                      </div>

                      {/* Score or vs */}
                      <div className="flex items-center gap-1 shrink-0">
                        {m.result ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`heading text-2xl tabular-nums ${homeWon ? 'text-brand-navy' : isFinished ? 'text-brand-navy/40' : 'text-brand-navy'}`}>
                              {m.result.home_score}
                            </span>
                            <span className="heading text-lg text-brand-navy/20">-</span>
                            <span className={`heading text-2xl tabular-nums ${awayWon ? 'text-brand-navy' : isFinished ? 'text-brand-navy/40' : 'text-brand-navy'}`}>
                              {m.result.away_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 font-bold text-lg">vs</span>
                        )}
                      </div>

                      {/* Away team */}
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <span className={`font-extrabold text-base ${
                            isFinished && homeWon ? 'text-brand-navy/40' : 'text-brand-navy'
                          }`}>{m.away_team?.name || 'TBD'}</span>
                          {m.away_team?.code && <TeamFlag code={m.away_team.code} size="lg" />}
                        </div>
                        {m.away_team?.id && teamPlayers[m.away_team.id] && (
                          <span className="block text-xs text-brand-blue font-semibold mr-12 mt-0.5">{teamPlayers[m.away_team.id]}</span>
                        )}
                      </div>
                    </div>

                    {/* Meta row: date, venue, status badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs text-gray-400 font-medium space-y-0.5">
                        <p>{formatKickoff(m.kickoff_at)}</p>
                        {m.venue && (
                          <p className="flex items-center gap-1">
                            <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3 shrink-0" aria-hidden="true">
                              <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3 4.5 8.5 4.5 8.5S12.5 9 12.5 6A4.5 4.5 0 0 0 8 1.5zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor" />
                            </svg>
                            {m.venue}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      {isFinished ? (
                        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-gray-200 text-gray-500">
                          FT
                        </span>
                      ) : !isLive ? (
                        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue">
                          Upcoming
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
