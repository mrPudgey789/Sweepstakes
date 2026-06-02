'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { formatCurrency, buildPaypalLink } from '@/lib/utils'
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
  }
}

export default function PlayerSweepstakePage() {
  const { id } = useParams()
  const [entry, setEntry] = useState<PlayerEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // Try to find the player's entry for this sweepstake
      const { data } = await supabase
        .from('entries')
        .select(`
          id, payment_state, team_id,
          teams(name, code, status),
          sweepstakes!inner(name, mode, entry_amount, currency, paypal_link, status, winner_structure)
        `)
        .eq('sweepstake_id', id as string)
        .limit(1)
        .single()

      setEntry(data as unknown as PlayerEntry)
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

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!entry) return <p className="text-gray-500">Entry not found.</p>

  const s = entry.sweepstakes

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">{s.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {s.mode === 'random' ? 'Random draw' : 'Pick your own'} &middot;{' '}
        {s.winner_structure === 'single' ? 'Single winner' : '1st, 2nd, 3rd'}
      </p>

      {/* Team card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 text-center">
        {entry.teams ? (
          <>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Your team</p>
            <p className="text-3xl font-bold mt-1">{entry.teams.name}</p>
            <p className="text-sm text-gray-500 mt-1">{entry.teams.code}</p>
            {entry.teams.status === 'eliminated' && (
              <p className="mt-2 text-red-600 text-sm font-medium">Eliminated</p>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Your team</p>
            <p className="text-lg text-gray-400 mt-1">Awaiting draw</p>
          </>
        )}
      </div>

      {/* Payment state */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Entry payment</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            entry.payment_state === 'confirmed' ? 'bg-green-100 text-green-800' :
            entry.payment_state === 'marked_paid' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {entry.payment_state === 'confirmed' ? 'Confirmed' :
             entry.payment_state === 'marked_paid' ? 'Awaiting organiser confirmation' :
             'Unpaid'}
          </span>
        </div>

        {entry.payment_state === 'unpaid' && (
          <>
            <a
              href={buildPaypalLink(s.paypal_link, s.entry_amount)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 text-white text-center py-2 rounded-md hover:bg-blue-700 mb-2"
            >
              Pay {formatCurrency(s.entry_amount, s.currency)} via PayPal
            </a>
            <button
              onClick={markPaid}
              className="w-full border border-green-700 text-green-700 py-2 rounded-md hover:bg-green-50"
            >
              I have paid
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Pay the organiser directly. The platform never touches entry money.
              The pre-filled amount is editable and not enforced by PayPal.
            </p>
          </>
        )}

        {entry.payment_state === 'marked_paid' && (
          <p className="text-sm text-gray-600">
            You have marked your payment. The organiser needs to check their PayPal and confirm receipt.
          </p>
        )}

        {entry.payment_state === 'confirmed' && (
          <p className="text-sm text-green-700">
            The organiser has confirmed your payment. You are fully in!
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Link
          href={`/sweepstake/${id}/fixtures`}
          className="flex-1 border border-gray-300 text-center py-2 rounded-md hover:bg-gray-50 text-sm"
        >
          Fixtures
        </Link>
        <Link
          href={`/sweepstake/${id}/standings`}
          className="flex-1 border border-gray-300 text-center py-2 rounded-md hover:bg-gray-50 text-sm"
        >
          Standings
        </Link>
      </div>
    </div>
  )
}
