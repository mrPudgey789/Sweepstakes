'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { formatCurrency, buildPaypalLink } from '@/lib/utils'
import { TeamFlag } from '@/components/team-flag'
import Link from 'next/link'

interface PlayerEntry {
  id: string
  payment_state: string
  team_id: string | null
  teams: { name: string; code: string; status: string } | null
  sweepstakes: {
    name: string
    mode: string
    entry_amount: number
    currency: string
    paypal_link: string
    status: string
    winner_structure: string
    organiser_name?: string
    share_slug?: string
    join_code?: string
  }
}

interface MatchTeam {
  name: string
  code: string
  score?: number | null
}

interface NextMatch {
  match_state: 'live' | 'upcoming' | 'none'
  stage?: string | null
  kickoff_at?: string | null
  venue?: string | null
  home_team?: MatchTeam | null
  away_team?: MatchTeam | null
  results?: { home: number; away: number } | null
  last_result?: {
    stage?: string
    home_team?: { name: string; code: string }
    away_team?: { name: string; code: string }
    results?: { home_score: number; away_score: number }
  } | null
}

interface StandingRow {
  rank: number
  entry_id: string
  player_name: string
  team_name: string | null
  team_code: string | null
  team_status: string | null
  stage_reached: string
  is_eliminated: boolean
  is_champion: boolean
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatKickoff(isoString: string): string {
  const d = new Date(isoString)
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' })
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${date}, ${time}`
}

function countdownLabel(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now()
  if (diff <= 0) return 'Imminent'
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days >= 2) return `In ${days} days`
  if (days === 1) return 'Tomorrow'
  if (hours >= 1) return `In ${hours}h`
  return `In ${mins}m`
}

export default function PlayerSweepstakePage() {
  const { id } = useParams()
  const [entry, setEntry] = useState<PlayerEntry | null>(null)
  const [playerCount, setPlayerCount] = useState(0)
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null)
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isOrganiser, setIsOrganiser] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Find the player record for the logged-in user
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()

      let playerEntry = null

      if (player) {
        // Direct query via RLS
        const { data } = await supabase
          .from('entries')
          .select(`
            id, payment_state, team_id,
            teams(name, code, status),
            sweepstakes!inner(name, mode, entry_amount, currency, paypal_link, status, winner_structure, share_slug, join_code)
          `)
          .eq('sweepstake_id', id as string)
          .eq('player_id', player.id)
          .maybeSingle()
        playerEntry = data
      }

      if (!playerEntry) {
        // Fallback: try via API using email
        const res = await fetch(`/api/player/entry?sweepstake_id=${id}`)
        if (res.ok) {
          playerEntry = await res.json()
        }
      }

      setEntry(playerEntry as unknown as PlayerEntry)

      // Get player count from peers API
      const peersRes = await fetch(`/api/player/peers?sweepstake_id=${id}`)
      if (peersRes.ok) {
        const peers = await peersRes.json()
        setPlayerCount(peers.length)
      }

      // Check if user is also the organiser
      const { data: organiser } = await supabase
        .from('organisers')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()
      if (organiser) {
        // Check if this sweepstake belongs to this organiser
        const res = await fetch(`/api/player/dashboard`)
        if (res.ok) {
          const all = await res.json()
          const match = all.find((s: Record<string, unknown>) => s.id === id && s.role === 'organiser')
          if (match) setIsOrganiser(true)
        }
      }

      // Load next match if a team is assigned
      if (playerEntry?.team_id) {
        const matchRes = await fetch(`/api/player/next-match?team_id=${playerEntry.team_id}`)
        if (matchRes.ok) {
          setNextMatch(await matchRes.json())
        }
      }

      // Load standings
      const standingsRes = await fetch(`/api/sweepstakes/standings?sweepstake_id=${id}`)
      if (standingsRes.ok) {
        const data = await standingsRes.json()
        setStandings(data)
        if (!playerCount && data.length > 0) setPlayerCount(data.length)
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function markPaid() {
    if (!entry) return
    await fetch('/api/player/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entry.id }),
    })
    setEntry({ ...entry, payment_state: 'marked_paid' })
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-brand-green animate-spin" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="heading text-3xl text-brand-navy mb-2">Entry not found</h1>
          <p className="text-brand-navy/50 text-sm">You may not have joined this sweepstake yet.</p>
        </div>
      </div>
    )
  }

  const s = entry.sweepstakes
  const hasTeam = !!entry.teams
  const isEliminated = entry.teams?.status === 'eliminated'

  // Standings derived values
  const myStandingRow = standings.find((row) => row.entry_id === entry.id)
  const myRank = myStandingRow?.rank ?? null
  const totalPlayers = standings.length

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

      {/* ── 1. Back + Header ─────────────────────────────────── */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:underline"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>

      <div>
        <h1 className="heading text-3xl sm:text-5xl text-brand-navy leading-tight">{s.name}</h1>
        {s.organiser_name && (
          <p className="text-sm text-brand-navy/40 font-medium mt-1">
            Organised by <span className="text-brand-navy font-semibold">{s.organiser_name}</span>
          </p>
        )}
        <p className="text-sm text-brand-navy/50 font-semibold mt-1">
          {s.mode === 'random' ? 'Random draw' : 'Pick your own'}
          {' \u00B7 '}
          {s.winner_structure === 'single' ? 'Single winner' : '1st, 2nd, 3rd'}
        </p>
      </div>

      {/* ── Prize pot + winners ─────────────────────────────── */}
      {playerCount > 0 && (() => {
        const champion = standings.find(r => r.is_champion)
        const top3 = standings.slice(0, 3)
        const isResolved = champion !== undefined

        return (
          <div className="bg-brand-blue rounded-2xl px-5 py-4">
            {isResolved && (
              <div className="mb-4 pb-4 border-b border-white/20">
                {s.winner_structure === 'single' ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Winner</p>
                      <p className="text-white font-extrabold text-lg">{champion.player_name}</p>
                      <p className="text-white/50 text-xs font-medium">{champion.team_name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {top3.map((r, i) => (
                      <div key={r.entry_id} className="flex items-center gap-3">
                        <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <div className="flex-1">
                          <p className="text-white font-extrabold text-sm">{r.player_name}</p>
                          <p className="text-white/50 text-xs">{r.team_name}</p>
                        </div>
                        <span className="text-white/40 text-xs font-bold">{ordinal(i + 1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                  {s.winner_structure === 'single' ? 'Winner takes all' : 'Prize pot'}
                </p>
                <p className="heading text-3xl text-white">
                  {formatCurrency(s.entry_amount * playerCount, s.currency)}
                </p>
              </div>
              <p className="text-white/40 text-xs font-medium">
                {playerCount} &times; {formatCurrency(s.entry_amount, s.currency)}
              </p>
            </div>
            {isResolved && (
              <p className="text-white/30 text-[10px] mt-3">
                The organiser distributes winnings directly. The platform holds no money.
              </p>
            )}
          </div>
        )
      })()}

      {/* ── 2. Team card ─────────────────────────────────────── */}
      {hasTeam ? (
        <Link
          href={`/sweepstake/${id}/fixtures`}
          className={`block rounded-3xl border-2 p-8 text-center transition-all hover:shadow-lg ${
            isEliminated
              ? 'bg-red-50 border-red-200'
              : 'bg-brand-blue border-brand-blue'
          }`}
        >
          <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${
            isEliminated ? 'text-brand-navy/40' : 'text-white/60'
          }`}>
            Your team
          </p>
          <TeamFlag code={entry.teams!.code} size="lg" className="mx-auto mb-3" />
          <p className={`heading text-5xl md:text-6xl ${
            isEliminated ? 'text-red-600' : 'text-white'
          }`}>
            {entry.teams!.name}
          </p>
          {isEliminated && (
            <div className="mt-4 space-y-2">
              <span className="inline-block text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                Eliminated
              </span>
              {nextMatch?.last_result?.stage && (
                <p className="text-xs text-red-400 font-semibold">
                  Knocked out at {nextMatch.last_result.stage.replace(/_/g, ' ')}
                </p>
              )}
              {nextMatch?.last_result?.results && (
                <p className="text-xs text-brand-navy/30">
                  {nextMatch.last_result.home_team?.name} {nextMatch.last_result.results.home_score} - {nextMatch.last_result.results.away_score} {nextMatch.last_result.away_team?.name}
                </p>
              )}
            </div>
          )}
          {!isEliminated && (
            <p className="text-sm font-bold mt-2 text-white/60">{entry.teams!.code}</p>
          )}
        </Link>
      ) : (
        <div className="rounded-3xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-brand-navy/40">Your team</p>
          <p className="text-2xl font-bold text-brand-navy/30 mt-2">Awaiting draw</p>
        </div>
      )}

      {/* ── 3. Next match card ───────────────────────────────── */}
      {hasTeam && nextMatch && nextMatch.match_state !== 'none' && (
        <div className="rounded-2xl border-2 border-brand-blue bg-brand-blue p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Your next match</p>

          {nextMatch.match_state === 'live' && nextMatch.home_team && nextMatch.away_team && (
            <>
              {/* LIVE badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-green" />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand-green">Live</span>
              </div>

              {/* Score row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <TeamFlag code={nextMatch.home_team.code} size="md" className="mx-auto" />
                  <span className="text-sm font-bold text-white/90 text-center leading-tight">{nextMatch.home_team.name}</span>
                </div>
                <div className="flex items-center gap-2 px-3">
                  <span className="heading text-4xl text-white">
                    {nextMatch.results?.home ?? nextMatch.home_team.score ?? 0}
                  </span>
                  <span className="heading text-2xl text-white/40">-</span>
                  <span className="heading text-4xl text-white">
                    {nextMatch.results?.away ?? nextMatch.away_team.score ?? 0}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <TeamFlag code={nextMatch.away_team.code} size="md" className="mx-auto" />
                  <span className="text-sm font-bold text-white/90 text-center leading-tight">{nextMatch.away_team.name}</span>
                </div>
              </div>
            </>
          )}

          {nextMatch.match_state === 'upcoming' && nextMatch.home_team && nextMatch.away_team && (
            <>
              {/* Teams */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <TeamFlag code={nextMatch.home_team.code} size="md" className="mx-auto" />
                  <span className="text-sm font-bold text-white/90 text-center leading-tight">{nextMatch.home_team.name}</span>
                </div>
                <span className="heading text-xl text-white/40">vs</span>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <TeamFlag code={nextMatch.away_team.code} size="md" className="mx-auto" />
                  <span className="text-sm font-bold text-white/90 text-center leading-tight">{nextMatch.away_team.name}</span>
                </div>
              </div>

              {/* Kickoff + countdown */}
              {nextMatch.kickoff_at && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white/80">
                    {formatKickoff(nextMatch.kickoff_at)}
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-wider bg-brand-green text-brand-navy px-2.5 py-1 rounded-full">
                    {countdownLabel(nextMatch.kickoff_at)}
                  </span>
                </div>
              )}

              {/* Stage + venue */}
              {nextMatch.stage && (
                <p className="text-xs text-white/50 font-semibold mb-0.5">{nextMatch.stage}</p>
              )}
              {nextMatch.venue && (
                <p className="text-xs text-white/40">{nextMatch.venue}</p>
              )}
            </>
          )}

          {/* Last result */}
          {nextMatch.last_result?.results && (
            <p className="text-xs text-white/40 font-medium mt-3 pt-3 border-t border-white/10">
              Last: {nextMatch.last_result.home_team?.name} {nextMatch.last_result.results.home_score} - {nextMatch.last_result.results.away_score} {nextMatch.last_result.away_team?.name}
            </p>
          )}
        </div>
      )}

      {/* No more matches (non-eliminated, tournament over for winner) */}
      {hasTeam && !isEliminated && (!nextMatch || nextMatch.match_state === 'none') && nextMatch?.last_result && (
        <div className="rounded-2xl border-2 border-brand-navy/10 bg-white p-5 text-center">
          <p className="text-sm font-semibold text-brand-navy/50">Tournament complete</p>
          {nextMatch.last_result.results && (
            <p className="text-xs text-brand-navy/30 mt-2">
              Last: {nextMatch.last_result.home_team?.name} {nextMatch.last_result.results.home_score} - {nextMatch.last_result.results.away_score} {nextMatch.last_result.away_team?.name}
            </p>
          )}
        </div>
      )}

      {/* ── 4. Position summary (only after draw) ─────────── */}
      {hasTeam && myRank !== null && totalPlayers > 0 && (
        <div className="rounded-2xl border-2 border-brand-green bg-brand-green/10 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-navy/50 mb-0.5">Your position</p>
            <p className="heading text-3xl text-brand-navy">
              {ordinal(myRank)} <span className="text-brand-navy/40 text-xl">of {totalPlayers}</span>
            </p>
          </div>
          <Link
            href={`/sweepstake/${id}/standings`}
            className="text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline"
          >
            Full table →
          </Link>
        </div>
      )}

      {/* ── 5. Standings (unified player + standings table) ── */}
      {standings.length > 0 && (
        <div>
          <h2 className="heading text-xl text-brand-navy mb-3">
            {hasTeam ? 'Standings' : `Players (${standings.length})`}
          </h2>
          <div className="bg-white border-2 border-brand-navy/10 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {standings.map((row) => {
                const isMe = row.entry_id === entry.id
                return (
                  <div
                    key={row.entry_id}
                    className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-brand-blue/5' : ''} ${row.is_eliminated ? 'opacity-60' : ''}`}
                  >
                    <span className={`text-xs font-extrabold w-5 text-center flex-shrink-0 ${
                      row.rank === 1 ? 'text-yellow-500' :
                      row.rank === 2 ? 'text-gray-400' :
                      row.rank === 3 ? 'text-amber-600' :
                      'text-brand-navy/30'
                    }`}>
                      {row.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-brand-navy truncate">
                        {row.player_name}
                        {isMe && <span className="text-brand-blue ml-1 text-xs">(you)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {row.team_name ? (
                        <>
                          {row.team_code && <TeamFlag code={row.team_code} size="sm" />}
                          <span className={`text-xs font-bold ${
                            row.is_eliminated ? 'text-red-400 line-through' : 'text-brand-navy/60'
                          }`}>
                            {row.team_name}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-brand-navy/30 italic">TBC</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Share (only when open) ────────────────────────── */}
      {s.status === 'open' && s.share_slug && s.join_code && (() => {
        const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const shareLink = `${appUrl}/j/${s.share_slug}`
        const whatsappText = encodeURIComponent(`Hey! Please join the World Cup 2026 sweepstake I am in using the link below:\n\n${shareLink}\n\nOr enter code: ${s.join_code}\n\nSweepstake: ${s.name}`)
        return (
          <div className="bg-brand-blue rounded-2xl p-5 text-white">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">Invite more players</p>
            <div className="flex items-center gap-3 mb-3">
              <span className="heading text-2xl text-white tracking-widest">{s.join_code}</span>
              <button
                onClick={() => navigator.clipboard.writeText(s.join_code!)}
                className="text-xs font-bold uppercase bg-brand-green text-brand-navy px-3 py-1.5 rounded-full hover:brightness-95 transition-all"
              >
                Copy
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(shareLink)}
                className="text-xs font-bold uppercase bg-white/20 text-white px-4 py-2 rounded-full hover:bg-white/30 transition-all"
              >
                Copy link
              </button>
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold uppercase bg-[#25D366] text-white px-4 py-2 rounded-full hover:brightness-95 transition-all"
              >
                WhatsApp
              </a>
            </div>
          </div>
        )
      })()}

      {/* ── 7. Payment state ─────────────────────────────────── */}
      <div className="bg-white border-2 border-brand-navy/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-extrabold text-brand-navy">Entry payment</span>
          <span className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${
            entry.payment_state === 'confirmed'
              ? 'bg-brand-green/20 text-[#1a7a00] border border-brand-green'
              : entry.payment_state === 'marked_paid'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
            {entry.payment_state === 'confirmed' ? 'Confirmed' :
             entry.payment_state === 'marked_paid' ? 'Pending' :
             'Unpaid'}
          </span>
        </div>

        {entry.payment_state === 'unpaid' && s.paypal_link !== 'manual' && (
          <div className="space-y-3">
            <a
              href={buildPaypalLink(s.paypal_link, s.entry_amount)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-brand-blue text-white font-bold py-3.5 rounded-full hover:bg-brand-blue-dark transition-colors"
            >
              Pay {formatCurrency(s.entry_amount, s.currency)} via PayPal
            </a>
            <button
              onClick={markPaid}
              className="btn-primary w-full"
            >
              I have paid
            </button>
            <p className="text-xs text-brand-navy/40 text-center">
              Pay the organiser directly. The platform never touches entry money.
            </p>
          </div>
        )}

        {entry.payment_state === 'unpaid' && s.paypal_link === 'manual' && (
          <div className="space-y-3">
            <p className="text-sm text-brand-navy/60">
              Pay the organiser directly using whatever method they have shared with you.
            </p>
            <button onClick={markPaid} className="btn-primary w-full">
              I have paid
            </button>
          </div>
        )}

        {entry.payment_state === 'marked_paid' && (
          <p className="text-sm text-brand-navy/60">
            You have marked your payment. The organiser needs to check and confirm receipt.
          </p>
        )}

        {entry.payment_state === 'confirmed' && (
          <p className="text-sm text-[#1a7a00] font-semibold">
            The organiser has confirmed your payment. You are fully in!
          </p>
        )}
      </div>

      {/* ── 8. Quick links ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/sweepstake/${id}/fixtures`}
          className="group flex items-center justify-between bg-white border-2 border-brand-navy/10 hover:border-brand-blue rounded-2xl px-5 py-4 transition-all"
        >
          <div>
            <p className="font-extrabold text-brand-navy text-sm">Fixtures</p>
            <p className="text-xs text-brand-navy/40 font-medium mt-0.5">All matches</p>
          </div>
          <svg className="text-brand-navy/20 group-hover:text-brand-blue transition-colors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
        <Link
          href={`/sweepstake/${id}/standings`}
          className="group flex items-center justify-between bg-white border-2 border-brand-navy/10 hover:border-brand-blue rounded-2xl px-5 py-4 transition-all"
        >
          <div>
            <p className="font-extrabold text-brand-navy text-sm">Standings</p>
            <p className="text-xs text-brand-navy/40 font-medium mt-0.5">Live table</p>
          </div>
          <svg className="text-brand-navy/20 group-hover:text-brand-blue transition-colors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </div>

      {/* ── 10. Organiser tools (only if user is also organiser) ── */}
      {isOrganiser && (
        <div className="border-t-2 border-gray-100 pt-6">
          <Link
            href={`/sweepstake/${id}`}
            className="block bg-brand-navy/5 border-2 border-brand-navy/10 rounded-2xl px-5 py-4 text-center hover:border-brand-navy/30 transition-all"
          >
            <span className="text-sm font-bold text-brand-navy">Organiser tools</span>
            <span className="text-xs text-brand-navy/40 block mt-0.5">Manage players, confirm payments, close sweepstake</span>
          </Link>
        </div>
      )}

      {/* ── 11. Leave sweepstake (before draw only) ──────────── */}
      {!hasTeam && s.status === 'open' && !isOrganiser && (
        <div className="border-t-2 border-gray-100 pt-6">
          <button
            onClick={async () => {
              if (!confirm('Are you sure you want to leave this sweepstake?')) return
              const res = await fetch(`/api/player/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entry_id: entry.id }),
              })
              if (res.ok) {
                window.location.href = '/dashboard'
              }
            }}
            className="w-full text-sm font-bold text-red-500 hover:text-red-700 py-3 transition-colors"
          >
            Leave sweepstake
          </button>
        </div>
      )}

    </div>
  )
}
