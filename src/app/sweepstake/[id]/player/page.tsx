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

interface OtherPlayer {
  id: string
  display_name: string | null
  team_name: string | null
  team_code: string | null
  team_status: string | null
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
  last_result?: string | null
}

interface StandingRow {
  rank: number
  entry_id: string
  player_name: string
  team_name: string | null
  team_code: string | null
  team_status: string | null
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
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([])
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

      // Load all players via API (bypasses RLS)
      const peersRes = await fetch(`/api/player/peers?sweepstake_id=${id}`)
      if (peersRes.ok) {
        setOtherPlayers(await peersRes.json())
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
        setStandings(await standingsRes.json())
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function markPaid() {
    if (!entry) return
    const supabase = createClient()
    await supabase
      .from('entries')
      .update({
        payment_state: 'marked_paid',
        marked_paid_at: new Date().toISOString(),
      })
      .eq('id', entry.id)

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
  const top5 = standings.slice(0, 5)

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
        <h1 className="heading text-4xl md:text-5xl text-brand-navy">{s.name}</h1>
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

      {/* ── Prize pot (after draw) ─────────────────────────── */}
      {hasTeam && otherPlayers.length > 0 && (
        <div className="bg-brand-blue rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
              {s.winner_structure === 'single' ? 'Winner takes all' : 'Prize pot'}
            </p>
            <p className="heading text-3xl text-white">
              {formatCurrency(s.entry_amount * otherPlayers.length, s.currency)}
            </p>
          </div>
          <p className="text-white/40 text-xs font-medium">
            {otherPlayers.length} &times; {formatCurrency(s.entry_amount, s.currency)}
          </p>
        </div>
      )}

      {/* ── 2. Team card ─────────────────────────────────────── */}
      <div className={`rounded-3xl border-2 p-8 text-center ${
        isEliminated
          ? 'bg-red-50 border-red-200'
          : hasTeam
          ? 'bg-brand-blue border-brand-blue'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${
          hasTeam && !isEliminated ? 'text-white/60' : 'text-brand-navy/40'
        }`}>
          Your team
        </p>
        {hasTeam ? (
          <>
            <TeamFlag code={entry.teams!.code} size="lg" className="mx-auto mb-3" />
            <p className={`heading text-5xl md:text-6xl ${
              isEliminated ? 'text-red-600' : 'text-white'
            }`}>
              {entry.teams!.name}
            </p>
            <p className={`text-sm font-bold mt-2 ${
              isEliminated ? 'text-red-500' : 'text-white/60'
            }`}>
              {entry.teams!.code}
            </p>
            {isEliminated && (
              <span className="inline-block mt-3 text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                Eliminated
              </span>
            )}
          </>
        ) : (
          <p className="text-2xl font-bold text-brand-navy/30 mt-2">Awaiting draw</p>
        )}
      </div>

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
          {nextMatch.last_result && (
            <p className="text-xs text-white/40 font-medium mt-3 pt-3 border-t border-white/10">
              Last result: {nextMatch.last_result}
            </p>
          )}
        </div>
      )}

      {/* Knocked out / no matches state */}
      {hasTeam && (!nextMatch || nextMatch.match_state === 'none') && (
        <div className="rounded-2xl border-2 border-brand-navy/10 bg-white p-5 text-center">
          {isEliminated ? (
            <>
              <p className="text-2xl mb-1">🏴</p>
              <p className="text-sm font-extrabold text-brand-navy">Knocked out</p>
              {nextMatch?.stage && (
                <p className="text-xs text-brand-navy/40 mt-0.5">Eliminated at: {nextMatch.stage}</p>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-brand-navy/50">No more matches scheduled</p>
          )}
          {nextMatch?.last_result && (
            <p className="text-xs text-brand-navy/30 mt-2">Last result: {nextMatch.last_result}</p>
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

      {/* ── 5. Standings preview (only after draw) ─────────── */}
      {hasTeam && top5.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="heading text-xl text-brand-navy">Standings</h2>
            <Link
              href={`/sweepstake/${id}/standings`}
              className="text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="bg-white border-2 border-brand-navy/10 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {top5.map((row) => {
                const isMe = row.entry_id === entry.id
                return (
                  <div
                    key={row.entry_id}
                    className={`flex items-center justify-between px-4 py-3 ${isMe ? 'bg-brand-blue/8' : ''}`}
                    style={isMe ? { backgroundColor: 'rgba(26,86,219,0.07)' } : {}}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs font-extrabold w-5 text-center ${
                        row.rank === 1 ? 'text-yellow-500' :
                        row.rank === 2 ? 'text-gray-400' :
                        row.rank === 3 ? 'text-amber-600' :
                        'text-brand-navy/30'
                      }`}>
                        {row.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-brand-navy truncate">
                          {row.player_name}
                          {isMe && <span className="text-brand-blue ml-1 text-xs">(you)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {row.team_name ? (
                        <>
                          <span className={`text-xs font-bold ${
                            row.team_status === 'eliminated' ? 'text-red-400 line-through' : 'text-brand-navy/60'
                          }`}>
                            {row.team_name}
                          </span>
                          {row.team_code && <TeamFlag code={row.team_code} size="sm" />}
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

      {/* ── 8. All players ───────────────────────────────────── */}
      <div>
        <h2 className="heading text-xl text-brand-navy mb-3">Players ({otherPlayers.length})</h2>
        <div className="bg-white border-2 border-brand-navy/10 rounded-2xl overflow-hidden">
          {otherPlayers.length === 0 ? (
            <p className="text-sm text-brand-navy/40 p-5 text-center">No players yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {otherPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between px-4 py-3 ${p.id === entry?.id ? 'bg-brand-blue/5' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-brand-navy/30 w-5 text-center">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-navy truncate">
                        {p.display_name}
                        {p.id === entry?.id && <span className="text-brand-blue ml-1 text-xs">(you)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    {p.team_name ? (
                      <>
                        <span className={`text-xs font-bold ${p.team_status === 'eliminated' ? 'text-red-500 line-through' : 'text-brand-navy/70'}`}>
                          {p.team_name}
                        </span>
                        {p.team_code && <TeamFlag code={p.team_code} size="sm" />}
                      </>
                    ) : (
                      <span className="text-xs text-brand-navy/30 italic">Awaiting draw</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 9. Quick links ───────────────────────────────────── */}
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
