'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
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

export default function SweepstakeManagePage() {
  const { id } = useParams()
  const router = useRouter()
  const [sweepstake, setSweepstake] = useState<SweepstakeDetail | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [drawLoading, setDrawLoading] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: s } = await supabase
      .from('sweepstakes')
      .select('*')
      .eq('id', id)
      .single()

    if (!s) { router.push('/dashboard'); return }
    setSweepstake(s as SweepstakeDetail)

    const { data: e } = await supabase
      .from('entries')
      .select('id, payment_state, created_at, team_id, players(email, display_name), teams(name, code)')
      .eq('sweepstake_id', id as string)
      .order('created_at')

    setEntries((e as unknown as Entry[]) || [])
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

  if (loading || !sweepstake) return <p className="text-gray-500">Loading...</p>

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const shareLink = `${appUrl}/j/${sweepstake.share_slug}`
  const pendingCount = entries.filter((e) => e.payment_state === 'marked_paid').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{sweepstake.name}</h1>
          <p className="text-sm text-gray-500">
            {sweepstake.mode === 'random' ? 'Random draw' : 'Pick your own'} &middot;{' '}
            {formatCurrency(sweepstake.entry_amount, sweepstake.currency)} entry &middot;{' '}
            {sweepstake.winner_structure === 'single' ? 'Single winner' : '1st, 2nd, 3rd'}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          sweepstake.status === 'open' ? 'bg-green-100 text-green-800' :
          sweepstake.status === 'drawn' ? 'bg-blue-100 text-blue-800' :
          sweepstake.status === 'closed' ? 'bg-gray-100 text-gray-600' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {sweepstake.status}
        </span>
      </div>

      {/* Share info */}
      {sweepstake.status !== 'draft' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex gap-6">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Share link</p>
              <p className="text-sm font-mono break-all">{shareLink}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Join code</p>
              <p className="text-lg font-bold tracking-widest">{sweepstake.join_code}</p>
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(shareLink)}
            className="mt-2 text-sm text-green-700 hover:underline"
          >
            Copy link
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {sweepstake.mode === 'random' && sweepstake.status === 'open' && entries.length > 0 && (
          <button
            onClick={runDraw}
            disabled={drawLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {drawLoading ? 'Drawing...' : `Run the draw (${entries.length} players)`}
          </button>
        )}
        {(sweepstake.status === 'open' || sweepstake.status === 'drawn') && (
          <button
            onClick={closeSweepstake}
            className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            Close sweepstake
          </button>
        )}
        <Link
          href={`/sweepstake/${id}/fixtures`}
          className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
        >
          View fixtures
        </Link>
        <Link
          href={`/sweepstake/${id}/standings`}
          className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
        >
          View standings
        </Link>
      </div>

      {/* Pending payments alert */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-3 mb-6 text-sm">
          <strong>{pendingCount} player{pendingCount > 1 ? 's' : ''}</strong> waiting for you to confirm payment.
        </div>
      )}

      {/* Entries table */}
      <h2 className="text-lg font-semibold mb-3">Players ({entries.length})</h2>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm">No players have joined yet. Share the link!</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Player</th>
                <th className="text-left px-4 py-2 font-medium">Team</th>
                <th className="text-left px-4 py-2 font-medium">Payment</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-2">
                    {entry.players?.display_name || entry.players?.email}
                  </td>
                  <td className="px-4 py-2">
                    {entry.teams?.name || (sweepstake.mode === 'random' ? 'Awaiting draw' : 'Not chosen')}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      entry.payment_state === 'confirmed' ? 'bg-green-100 text-green-800' :
                      entry.payment_state === 'marked_paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {entry.payment_state === 'confirmed' ? 'Confirmed' :
                       entry.payment_state === 'marked_paid' ? 'Awaiting confirmation' :
                       'Unpaid'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {entry.payment_state === 'marked_paid' && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => confirmPayment(entry.id, 'confirm')}
                          className="text-green-700 hover:underline text-xs"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => confirmPayment(entry.id, 'reject')}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Reset
                        </button>
                      </div>
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
