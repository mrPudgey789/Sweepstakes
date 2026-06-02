'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildPaypalLink, formatCurrency } from '@/lib/utils'

interface Props {
  sweepstakeId: string
  sweepstakeName: string
  mode: string
  entryAmount: number
  currency: string
  paypalLink: string
}

interface Team {
  id: string
  name: string
  code: string
  group_letter: string
}

export function JoinFlow({
  sweepstakeId,
  sweepstakeName,
  mode,
  entryAmount,
  currency,
  paypalLink,
}: Props) {
  const [step, setStep] = useState<'email' | 'terms' | 'team' | 'payment' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [tcAccepted, setTcAccepted] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [assignedTeam, setAssignedTeam] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'pick_your_own' && step === 'team') {
      const supabase = createClient()

      const loadTeams = async () => {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, name, code, group_letter')
          .eq('tournament_id', '00000000-0000-0000-0000-000000002026')
          .order('group_letter')
          .order('name')

        const { data: takenEntries } = await supabase
          .from('entries')
          .select('team_id')
          .eq('sweepstake_id', sweepstakeId)
          .not('team_id', 'is', null)

        const takenIds = new Set((takenEntries || []).map((e) => e.team_id))
        setAvailableTeams((allTeams || []).filter((t) => !takenIds.has(t.id)))
      };

      loadTeams()
    }
  }, [step, mode, sweepstakeId])



  async function handleJoin() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sweepstakes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sweepstake_id: sweepstakeId,
          email,
          display_name: displayName || null,
          team_id: mode === 'pick_your_own' ? selectedTeam : null,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Failed to join.')
        setLoading(false)
        return
      }

      setEntryId(result.entry_id)
      if (result.team_name) {
        setAssignedTeam(result.team_name)
      }
      setStep('payment')
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function markPaid() {
    if (!entryId) return
    setLoading(true)

    const supabase = createClient()
    await supabase
      .from('entries')
      .update({
        payment_state: 'marked_paid',
        marked_paid_at: new Date().toISOString(),
      })
      .eq('id', entryId)

    setStep('done')
    setLoading(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Email */}
      {step === 'email' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your email (required)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used to sign in, view fixtures, and receive your knockout notification.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Display name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <button
            onClick={() => setStep('terms')}
            disabled={!email}
            className="w-full bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: T&Cs */}
      {step === 'terms' && (
        <div className="space-y-4">
          <h2 className="font-semibold">Terms & Conditions</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-700 max-h-48 overflow-y-auto space-y-2">
            <p>By joining this sweepstake you agree to the following:</p>
            <p>
              The platform provides software only. It is not the operator of any lottery or sweepstake.
              Any sweepstake is created, run, and controlled by the organiser.
            </p>
            <p>
              <strong>Entry money is paid directly to the organiser, outside the platform.</strong> The
              platform never holds, receives, or pays out any entry money or pot. Any dispute about
              payment is between you and the organiser.
            </p>
            <p>
              The platform charges a software fee to the organiser only. This is entirely separate
              from the entry money.
            </p>
            <p>
              Fixtures and results are sourced from third-party data feeds and may be delayed or
              incorrect. The organiser may correct results manually.
            </p>
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tcAccepted}
              onChange={(e) => setTcAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm">I accept the Terms & Conditions</span>
          </label>
          <div className="flex gap-3">
            <button onClick={() => setStep('email')} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button
              onClick={() => {
                if (mode === 'pick_your_own') {
                  setStep('team')
                } else {
                  handleJoin()
                }
              }}
              disabled={!tcAccepted || loading}
              className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
            >
              {mode === 'pick_your_own' ? 'Choose your team' : loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pick team (pick-your-own only) */}
      {step === 'team' && (
        <div className="space-y-4">
          <h2 className="font-semibold">Choose your team</h2>
          <p className="text-sm text-gray-500">Pick an available team. First come, first served.</p>

          {availableTeams.length === 0 ? (
            <p className="text-sm text-gray-500">No teams available. All have been taken.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {availableTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className={`text-left border rounded-md px-3 py-2 text-sm ${
                    selectedTeam === team.id
                      ? 'border-green-700 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{team.name}</span>
                  <span className="text-xs text-gray-400 ml-1">({team.group_letter})</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('terms')} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button
              onClick={handleJoin}
              disabled={!selectedTeam || loading}
              className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Confirm and join'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 'payment' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-green-700">You are in!</h2>
          {mode === 'random' && !assignedTeam && (
            <p className="text-sm text-gray-600">
              Your team will be drawn soon. You will be notified when the organiser runs the draw.
            </p>
          )}
          {assignedTeam && (
            <p className="text-sm text-gray-600">Your team: <strong>{assignedTeam}</strong></p>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm font-medium mb-2">Pay your entry: {formatCurrency(entryAmount, currency)}</p>
            <p className="text-xs text-gray-600 mb-3">
              Pay the organiser directly using their payment link below.
              This is a personal payment between you and the organiser.
              The platform never touches this money.
            </p>
            <a
              href={buildPaypalLink(paypalLink, entryAmount)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 text-white text-center py-2 rounded-md hover:bg-blue-700 mb-3"
            >
              Pay {formatCurrency(entryAmount, currency)} via PayPal
            </a>
            <p className="text-xs text-gray-500">
              The pre-filled amount is editable and not enforced by PayPal. The organiser
              will confirm receipt manually.
            </p>
          </div>

          <button
            onClick={markPaid}
            disabled={loading}
            className="w-full border border-green-700 text-green-700 py-2 rounded-md hover:bg-green-50 disabled:opacity-50"
          >
            {loading ? 'Marking...' : "I have paid"}
          </button>
          <button
            onClick={() => setStep('done')}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Step 5: Done */}
      {step === 'done' && (
        <div className="text-center py-4">
          <h2 className="text-xl font-bold text-green-700 mb-2">You are in {sweepstakeName}!</h2>
          <p className="text-sm text-gray-600 mb-4">
            {mode === 'random'
              ? 'Your team will be assigned when the organiser runs the draw.'
              : `Your team has been locked in.`}
          </p>
          <p className="text-sm text-gray-600">
            A confirmation email will be sent to {email}.
          </p>
          <a
            href={`/sweepstake/${sweepstakeId}/player`}
            className="inline-block mt-4 bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800"
          >
            View your sweepstake
          </a>
        </div>
      )}
    </div>
  )
}
