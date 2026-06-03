'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { TeamFlag } from '@/components/team-flag'
import Link from 'next/link'

interface Entry {
  id: string
  payment_state: string
  created_at: string
  team_id: string | null
  players: { email: string; display_name: string | null }
  teams: { name: string; code: string } | null
}

interface SweepstakeDetail {
  id: string
  name: string
  mode: string
  status: string
  entry_amount: number
  currency: string
  winner_structure: string
  paypal_link: string
  join_code: string
  share_slug: string
  max_players: number | null
  drawn_at: string | null
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function SweepstakeManagePage() {
  const { id } = useParams()
  const router = useRouter()
  const [sweepstake, setSweepstake] = useState<SweepstakeDetail | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [drawLoading, setDrawLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [organiserName, setOrganiserName] = useState<string>('')
  const [myTeamEntry, setMyTeamEntry] = useState<Entry | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nextMatch, setNextMatch] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [availableTeams, setAvailableTeams] = useState<{ id: string; name: string; code: string; group_letter: string }[]>([])
  const [pickingTeam, setPickingTeam] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUserEmail(user.email?.toLowerCase() || '')

    const { data: s } = await supabase
      .from('sweepstakes')
      .select('*')
      .eq('id', id)
      .single()

    if (!s) { router.push('/dashboard'); return }
    setSweepstake(s as SweepstakeDetail)

    // Fetch entries via API (admin client bypasses RLS so we can see player names)
    const entriesRes = await fetch(`/api/sweepstakes/${id}/entries`)
    if (entriesRes.ok) {
      const result = await entriesRes.json()
      const entryList = (result.entries as Entry[]) || []
      setEntries(entryList)
      if (result.organiser_name) setOrganiserName(result.organiser_name)

      // Find organiser's own entry by their email (reliable match)
      const userEmail = user.email?.toLowerCase()
      const mine = entryList.find(e => e.players?.email?.toLowerCase() === userEmail)
      if (mine) {
        setMyTeamEntry(mine)
        if (mine.team_id) {
          const matchRes = await fetch(`/api/player/next-match?team_id=${mine.team_id}`)
          if (matchRes.ok) setNextMatch(await matchRes.json())
        } else if (s.mode === 'pick_your_own') {
          // Load available teams for pick-your-own
          const { data: tournament } = await supabase
            .from('tournaments')
            .select('id')
            .eq('name', 'FIFA World Cup 2026')
            .maybeSingle()
          if (tournament) {
            const { data: allTeams } = await supabase
              .from('teams')
              .select('id, name, code, group_letter')
              .eq('tournament_id', tournament.id)
              .order('group_letter')
              .order('name')
            const takenIds = new Set(entryList.filter(e => e.team_id).map(e => e.team_id))
            setAvailableTeams((allTeams || []).filter(t => !takenIds.has(t.id)))
          }
        }
      }
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id])

  async function runDraw() {
    setDrawLoading(true)
    const res = await fetch(`/api/sweepstakes/${id}/draw`, { method: 'POST' })
    if (res.ok) {
      await load()
    }
    setDrawLoading(false)
  }

  async function confirmPayment(entryId: string, action: 'confirm' | 'reject') {
    await fetch(`/api/sweepstakes/${id}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, action }),
    })
    await load()
  }

  async function closeSweepstake() {
    const supabase = createClient()
    await supabase
      .from('sweepstakes')
      .update({ status: 'closed' })
      .eq('id', id as string)
    await load()
  }

  function copyLink(shareLink: string) {
    navigator.clipboard.writeText(shareLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  if (loading || !sweepstake) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-brand-green animate-spin mx-auto mb-4" />
          <p className="text-brand-navy/50 font-semibold">Loading sweepstake...</p>
        </div>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const shareLink = `${appUrl}/j/${sweepstake.share_slug}`
  const pendingCount = entries.filter((e) => e.payment_state === 'marked_paid').length
  const confirmedCount = entries.filter((e) => e.payment_state === 'confirmed').length
  const isFull = sweepstake.max_players ? entries.length >= sweepstake.max_players : false

  const statusStyles: Record<string, string> = {
    open:   'bg-[#65FF47]/20 text-[#1a7a00] border border-[#65FF47]',
    drawn:  'bg-[#A5D9FF]/20 text-[#1A56DB] border border-[#A5D9FF]',
    closed: 'bg-brand-navy/10 text-brand-navy/60 border border-brand-navy/20',
    draft:  'bg-yellow-100 text-yellow-700 border border-yellow-300',
  }
  const statusLabel: Record<string, string> = {
    open: 'Open',
    drawn: 'Drawn',
    closed: 'Closed',
    draft: 'Draft',
  }

  const whatsappText = encodeURIComponent(
    `Join my sweepstake "${sweepstake.name}"! Use code ${sweepstake.join_code} or this link: ${shareLink}`
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="heading text-4xl sm:text-5xl text-brand-navy leading-none mb-3 truncate">
            {sweepstake.name}
          </h1>
          {organiserName && (
            <p className="text-sm text-brand-navy/40 font-medium mb-2">
              Organised by <span className="text-brand-navy font-semibold">{organiserName}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-navy/60">
            <span>{sweepstake.mode === 'random' ? 'Random draw' : 'Pick your own'}</span>
            <span className="text-brand-navy/30">&middot;</span>
            <span>{formatCurrency(sweepstake.entry_amount, sweepstake.currency)} entry</span>
            <span className="text-brand-navy/30">&middot;</span>
            <span>{sweepstake.winner_structure === 'single' ? 'Single winner' : '1st, 2nd & 3rd'}</span>
            {sweepstake.max_players && (
              <>
                <span className="text-brand-navy/30">&middot;</span>
                <span>Max {sweepstake.max_players} players</span>
              </>
            )}
            {sweepstake.status === 'open' && (
              <>
                <span className="text-brand-navy/30">&middot;</span>
                <Link
                  href={`/sweepstake/${sweepstake.id}/upgrade`}
                  className="text-brand-blue font-bold hover:underline underline-offset-2"
                >
                  Upgrade group size
                </Link>
              </>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full ${statusStyles[sweepstake.status] ?? statusStyles.draft}`}>
          {statusLabel[sweepstake.status] ?? sweepstake.status}
        </span>
      </div>

      {/* ── Prize pot ─────────────────────────────────────────────── */}
      {sweepstake.status === 'drawn' && entries.length > 0 && (
        <div className="bg-brand-blue rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
              {sweepstake.winner_structure === 'single' ? 'Winner takes all' : 'Prize pot'}
            </p>
            <p className="heading text-3xl text-white">
              {formatCurrency(sweepstake.entry_amount * entries.length, sweepstake.currency)}
            </p>
          </div>
          <p className="text-white/40 text-xs font-medium">
            {entries.length} &times; {formatCurrency(sweepstake.entry_amount, sweepstake.currency)}
          </p>
        </div>
      )}

      {/* ── Pick your team (organiser in pick_your_own without a team) ── */}
      {myTeamEntry && !myTeamEntry.team_id && sweepstake.mode === 'pick_your_own' && availableTeams.length > 0 && (
        <div className="bg-white border-2 border-brand-blue rounded-2xl p-5">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-1">You are player 1</p>
          <p className="text-lg font-extrabold text-brand-navy mb-4">Pick your team</p>
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto mb-4">
            {availableTeams.map(team => (
              <button
                key={team.id}
                disabled={pickingTeam}
                onClick={async () => {
                  setPickingTeam(true)
                  const supabase = (await import('@/lib/supabase/client')).createClient()
                  await supabase.from('entries').update({ team_id: team.id }).eq('id', myTeamEntry.id)
                  await load()
                  setPickingTeam(false)
                }}
                className="text-left border-2 border-gray-200 rounded-2xl px-3 py-3 hover:border-brand-blue transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <TeamFlag code={team.code} size="sm" />
                  <span className="text-sm font-bold text-brand-navy">{team.name}</span>
                </div>
                <span className="text-xs text-brand-navy/40 mt-0.5 block">Group {team.group_letter}</span>
              </button>
            ))}
          </div>
          {pickingTeam && <p className="text-sm text-brand-blue font-bold text-center">Picking...</p>}
        </div>
      )}

      {/* ── Organiser's team + next match ────────────────────────── */}
      {myTeamEntry?.teams && (
        <div className="bg-brand-blue rounded-2xl p-5 text-white">
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2 text-center">Your team</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <TeamFlag code={myTeamEntry.teams.code} size="lg" />
            <span className="heading text-3xl text-white">{myTeamEntry.teams.name}</span>
          </div>
          {nextMatch && nextMatch.match_state === 'upcoming' && nextMatch.kickoff_at && (
            <div className="border-t border-white/20 pt-4 mt-2">
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Next match</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(nextMatch.home_team as Record<string, string>)?.code && <TeamFlag code={(nextMatch.home_team as Record<string, string>).code} size="sm" />}
                  <span className="text-sm font-bold text-white/90">{(nextMatch.home_team as Record<string, string>)?.name || 'TBC'}</span>
                  <span className="text-white/40 text-sm font-bold mx-1">vs</span>
                  <span className="text-sm font-bold text-white/90">{(nextMatch.away_team as Record<string, string>)?.name || 'TBC'}</span>
                  {(nextMatch.away_team as Record<string, string>)?.code && <TeamFlag code={(nextMatch.away_team as Record<string, string>).code} size="sm" />}
                </div>
              </div>
              <p className="text-white/40 text-xs mt-2">
                {new Date(nextMatch.kickoff_at as string).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {', '}
                {new Date(nextMatch.kickoff_at as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                {nextMatch.venue ? ` - ${nextMatch.venue}` : ''}
              </p>
            </div>
          )}
          {nextMatch && nextMatch.match_state === 'live' && (
            <div className="border-t border-white/20 pt-4 mt-2 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-green" />
              </span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-brand-green">Live now</span>
            </div>
          )}
        </div>
      )}

      {/* ── Draft: complete setup CTA ─────────────────────────────── */}
      {sweepstake.status === 'draft' && (
        <div className="bg-brand-blue/5 border-2 border-brand-blue/20 rounded-2xl p-6 text-center">
          <p className="text-lg font-extrabold text-brand-navy mb-2">Almost there!</p>
          <p className="text-sm text-brand-navy/50 mb-4">Pay the software fee to go live and start inviting players.</p>
          <button
            onClick={async () => {
              const res = await fetch(`/api/sweepstakes/${id}/pay`, { method: 'POST' })
              const data = await res.json()
              if (data.checkout_url) {
                window.location.href = data.checkout_url
              } else if (data.sweepstake_id) {
                window.location.href = `/create/success?sweepstake_id=${data.sweepstake_id}`
              }
            }}
            className="btn-primary"
          >
            Pay and go live
          </button>
        </div>
      )}

      {/* ── Pending payments alert ─────────────────────────────────── */}
      {pendingCount > 0 && (
        <div className="bg-brand-blue/5 border-2 border-brand-blue/20 rounded-2xl px-5 py-4">
          <p className="text-sm font-bold text-brand-navy">
            {pendingCount} player{pendingCount > 1 ? 's have' : ' has'} marked payment. Scroll down to confirm.
          </p>
        </div>
      )}

      {/* ── Share card OR full/upgrade prompt ────────────────────── */}
      {sweepstake.status === 'open' && isFull && (
        <div className="bg-brand-navy/5 border-2 border-brand-navy/10 rounded-3xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-extrabold text-brand-navy mb-1">Sweepstake is full!</h3>
          <p className="text-sm text-brand-navy/50 mb-5">
            {entries.length} of {sweepstake.max_players} spots taken. Need more room?
          </p>
          <Link href={`/sweepstake/${id}/upgrade`} className="btn-primary">
            Upgrade group size
          </Link>
        </div>
      )}
      {sweepstake.status === 'open' && !isFull && (
        <div className="bg-brand-blue rounded-3xl border-2 border-brand-blue p-6 sm:p-8 text-white">
          <p className="text-white/70 text-xs font-extrabold uppercase tracking-widest mb-5">
            Invite players
          </p>

          {/* Join code */}
          <div className="mb-6">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">Join code</p>
            <p className="heading text-5xl sm:text-6xl text-white leading-none tracking-widest mb-3">
              {sweepstake.join_code}
            </p>
            <button
              onClick={() => copyCode(sweepstake.join_code)}
              className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-navy bg-brand-green rounded-full px-4 py-2 hover:brightness-95 active:scale-95 transition-all"
            >
              {copiedCode ? <CheckIcon /> : <CopyIcon />}
              {copiedCode ? 'Copied!' : 'Copy code'}
            </button>
          </div>

          {/* Share link */}
          <div className="bg-white/10 rounded-2xl border border-white/20 p-4 mb-5">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Share link</p>
            <p className="text-white font-mono text-sm break-all leading-relaxed">{shareLink}</p>
          </div>

          {/* Share buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => copyLink(shareLink)}
              className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-brand-navy bg-brand-green rounded-full px-5 py-2.5 hover:brightness-95 active:scale-95 transition-all"
            >
              {copiedLink ? <CheckIcon /> : <CopyIcon />}
              {copiedLink ? 'Copied!' : 'Copy link'}
            </button>
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-white bg-[#25D366] rounded-full px-5 py-2.5 hover:brightness-95 active:scale-95 transition-all"
            >
              <WhatsAppIcon />
              Share on WhatsApp
            </a>
          </div>

          {/* Organiser join note */}
        </div>
      )}

      {/* ── Action buttons ─────────────────────────────────────────── */}
      {sweepstake.mode === 'random' && sweepstake.status === 'open' && entries.length > 1 && (() => {
        const allConfirmed = entries.every((e) => e.payment_state === 'confirmed')
        const unconfirmedCount = entries.filter((e) => e.payment_state !== 'confirmed').length
        return (
          <div>
            <button
              onClick={runDraw}
              disabled={drawLoading || !allConfirmed}
              className="btn-primary w-full"
            >
              {drawLoading ? 'Drawing...' : `Run the draw (${entries.length} players)`}
            </button>
            {!allConfirmed && (
              <p className="text-xs text-brand-navy/40 mt-2">
                {unconfirmedCount} player{unconfirmedCount !== 1 ? 's' : ''} still need{unconfirmedCount === 1 ? 's' : ''} payment confirmed before you can draw.
              </p>
            )}
          </div>
        )
      })()}

      {/* ── Players ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-2xl text-brand-navy">
            Players
          </h2>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="bg-brand-navy/10 text-brand-navy rounded-full px-3 py-1">
              {entries.length} player{entries.length !== 1 ? 's' : ''}
            </span>
            {sweepstake.status !== 'drawn' && confirmedCount > 0 && (
              <span className="bg-[#65FF47]/20 text-[#1a7a00] border border-[#65FF47] rounded-full px-3 py-1">
                {confirmedCount} paid
              </span>
            )}
            {sweepstake.status !== 'drawn' && pendingCount > 0 && (
              <span className="bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full px-3 py-1">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="border-2 border-dashed border-brand-navy/20 rounded-3xl p-10 text-center">
            <svg className="w-12 h-12 text-brand-navy/20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2l-5 5 3 2 1-2v15h10V7l1 2 3-2-5-5-2.5 1h-3L8 2z" />
            </svg>
            <p className="text-brand-navy/40 font-bold text-lg mb-1">No players yet</p>
            <p className="text-brand-navy/30 text-sm">Share the link or code above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => (
              <div key={entry.id} className="border-2 border-brand-navy/10 rounded-2xl p-4 hover:border-brand-blue/30 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-brand-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-blue font-extrabold text-sm">{idx + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-brand-navy truncate flex items-center gap-2">
                        {entry.players?.display_name || entry.players?.email}
                        {userEmail && entry.players?.email?.toLowerCase() === userEmail && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">Organiser</span>
                        )}
                      </p>
                      <span className="text-xs text-brand-navy/40 font-medium block">
                        {entry.teams ? (
                          <span className="flex items-center gap-1.5">
                            <TeamFlag code={entry.teams.code} size="sm" />
                            {entry.teams.name}
                          </span>
                        ) : (sweepstake.mode === 'random' ? 'Awaiting draw' : 'Not chosen')}
                      </span>
                    </div>
                  </div>
                  {sweepstake.status !== 'drawn' && (
                    entry.payment_state === 'confirmed' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-green/20 text-[#1a7a00] border border-brand-green flex-shrink-0">
                        <CheckIcon /> Paid
                      </span>
                    ) : entry.payment_state === 'marked_paid' ? (
                      <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300 flex-shrink-0">
                        Pending
                      </span>
                    ) : (
                      <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0">
                        Unpaid
                      </span>
                    )
                  )}
                </div>
                {entry.payment_state === 'marked_paid' && sweepstake.status !== 'drawn' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-brand-navy/5">
                    <button
                      onClick={() => confirmPayment(entry.id, 'confirm')}
                      className="flex-1 text-sm font-bold text-[#1a7a00] bg-brand-green/20 border-2 border-brand-green hover:bg-brand-green/30 py-2.5 rounded-full transition-colors"
                    >
                      Confirm payment
                    </button>
                    <button
                      onClick={() => confirmPayment(entry.id, 'reject')}
                      className="text-sm font-bold text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 px-5 py-2.5 rounded-full transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick links ────────────────────────────────────────────── */}
      <div>
        <h2 className="heading text-2xl text-brand-navy mb-4">Quick links</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/sweepstake/${id}/fixtures`}
            className="group flex items-center justify-between bg-white border-2 border-brand-navy/10 hover:border-brand-blue rounded-2xl px-5 py-4 transition-all hover:shadow-md"
          >
            <div>
              <p className="font-extrabold text-brand-navy text-sm">Fixtures</p>
              <p className="text-xs text-brand-navy/40 font-medium mt-0.5">All matches</p>
            </div>
            <svg className="text-brand-blue/40 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href={`/sweepstake/${id}/standings`}
            className="group flex items-center justify-between bg-white border-2 border-brand-navy/10 hover:border-brand-blue rounded-2xl px-5 py-4 transition-all hover:shadow-md"
          >
            <div>
              <p className="font-extrabold text-brand-navy text-sm">Standings</p>
              <p className="text-xs text-brand-navy/40 font-medium mt-0.5">Live table</p>
            </div>
            <svg className="text-brand-blue/40 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Close sweepstake (danger zone) ───────────────────────────── */}
      {(sweepstake.status === 'open' || sweepstake.status === 'drawn') && (
        <div className="border-t-2 border-gray-100 pt-6">
          <button
            onClick={closeSweepstake}
            className="w-full rounded-full py-3 px-10 font-extrabold text-base text-red-600 border-2 border-red-200 hover:bg-red-50 active:scale-[0.97] transition-all"
          >
            Close sweepstake
          </button>
        </div>
      )}

    </div>
  )
}
