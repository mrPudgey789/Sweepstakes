'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PRICING_BANDS, type PricingBand } from '@/lib/pricing'
import { formatCurrency, normalisePaypalHandle } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

const ENTRY_PRESETS = [5, 10, 15, 20]

export default function CreateSweepstakePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'random' | 'pick_your_own'>('random')
  const [entryAmount, setEntryAmount] = useState<number>(10)
  const [customAmount, setCustomAmount] = useState('')
  const [winnerStructure, setWinnerStructure] = useState<'single' | 'top_three'>('single')
  const [paypalInput, setPaypalInput] = useState('')
  const [paypalValidated, setPaypalValidated] = useState(false)
  const [band, setBand] = useState<PricingBand>('1_10')
  const [organiserId, setOrganiserId] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      const { data: organiser } = await supabase
        .from('organisers')
        .select('id, paypal_link')
        .eq('auth_id', user.id)
        .single()
      if (!organiser) {
        router.push('/auth/signup')
        return
      }
      setOrganiserId(organiser.id)
      if (organiser.paypal_link) {
        setPaypalInput(organiser.paypal_link)
      }
    }
    checkAuth()
  }, [router])

  const effectiveAmount = customAmount ? parseFloat(customAmount) : entryAmount

  async function validatePaypal() {
    setError(null)
    const handle = normalisePaypalHandle(paypalInput)
    if (!handle || handle.length < 2) {
      setError('Please enter a valid PayPal.Me handle or link.')
      return
    }
    // Lightweight validation: check the handle format
    setPaypalValidated(true)
  }

  async function handleCreateAndPay() {
    setLoading(true)
    setError(null)

    try {
      const handle = normalisePaypalHandle(paypalInput)
      const paypalLink = `https://paypal.me/${handle}`

      const res = await fetch('/api/sweepstakes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mode,
          entry_amount: effectiveAmount,
          currency: 'GBP',
          winner_structure: winnerStructure,
          paypal_link: paypalLink,
          band,
          organiser_id: organiserId,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Failed to create sweepstake.')
        setLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      if (result.checkout_url) {
        window.location.href = result.checkout_url
      } else {
        router.push(`/sweepstake/${result.sweepstake_id}`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Create a sweepstake</h1>
      <p className="text-sm text-gray-500 mb-6">Step {step} of 8</p>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
        <div
          className="bg-green-700 h-1.5 rounded-full transition-all"
          style={{ width: `${(step / 8) * 100}%` }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Name */}
      {step === 1 && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Name your sweepstake
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Marketing Team Sweepstake"
            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
          />
          <button
            disabled={!name.trim()}
            onClick={() => setStep(2)}
            className="w-full bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 2: unused - skip */}
      {/* Step 2: Auth already handled (user is logged in) - skip to Step 3 renamed as Step 2 */}

      {/* Step 2: Choose mechanic */}
      {step === 2 && (
        <div>
          <p className="text-sm font-medium mb-4">Choose the assignment mode</p>
          <div className="space-y-3">
            <label className={`block border rounded-lg p-4 cursor-pointer ${mode === 'random' ? 'border-green-700 bg-green-50' : 'border-gray-200'}`}>
              <input
                type="radio"
                name="mode"
                value="random"
                checked={mode === 'random'}
                onChange={() => setMode('random')}
                className="sr-only"
              />
              <span className="font-medium">Random team assignment</span>
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Recommended</span>
              <p className="text-sm text-gray-500 mt-1">
                Teams are drawn and allocated automatically. Fair, fast, and the classic sweepstake experience.
              </p>
            </label>
            <label className={`block border rounded-lg p-4 cursor-pointer ${mode === 'pick_your_own' ? 'border-green-700 bg-green-50' : 'border-gray-200'}`}>
              <input
                type="radio"
                name="mode"
                value="pick_your_own"
                checked={mode === 'pick_your_own'}
                onChange={() => setMode('pick_your_own')}
                className="sr-only"
              />
              <span className="font-medium">Pick your own team</span>
              <p className="text-sm text-gray-500 mt-1">
                Players choose an available team when they join, first come first served.
              </p>
            </label>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button onClick={() => setStep(3)} className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800">Next</button>
          </div>
        </div>
      )}

      {/* Step 3: Entry amount */}
      {step === 3 && (
        <div>
          <p className="text-sm font-medium mb-4">Set the entry amount per player</p>
          <p className="text-xs text-gray-500 mb-4">
            This is what each player pays the organiser directly. The platform never touches this money.
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {ENTRY_PRESETS.map((amt) => (
              <button
                key={amt}
                onClick={() => { setEntryAmount(amt); setCustomAmount('') }}
                className={`border rounded-md py-2 text-sm font-medium ${
                  entryAmount === amt && !customAmount
                    ? 'border-green-700 bg-green-50 text-green-800'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {formatCurrency(amt)}
              </button>
            ))}
          </div>
          <label className="block text-sm text-gray-600 mb-1">Or enter a custom amount</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400">&#163;</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button
              disabled={!effectiveAmount || effectiveAmount <= 0}
              onClick={() => setStep(4)}
              className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Winner structure */}
      {step === 4 && (
        <div>
          <p className="text-sm font-medium mb-4">How many winners?</p>
          <div className="space-y-3">
            <label className={`block border rounded-lg p-4 cursor-pointer ${winnerStructure === 'single' ? 'border-green-700 bg-green-50' : 'border-gray-200'}`}>
              <input
                type="radio"
                name="winner"
                value="single"
                checked={winnerStructure === 'single'}
                onChange={() => setWinnerStructure('single')}
                className="sr-only"
              />
              <span className="font-medium">Single winner</span>
              <p className="text-sm text-gray-500 mt-1">One player wins the whole pot.</p>
            </label>
            <label className={`block border rounded-lg p-4 cursor-pointer ${winnerStructure === 'top_three' ? 'border-green-700 bg-green-50' : 'border-gray-200'}`}>
              <input
                type="radio"
                name="winner"
                value="top_three"
                checked={winnerStructure === 'top_three'}
                onChange={() => setWinnerStructure('top_three')}
                className="sr-only"
              />
              <span className="font-medium">1st, 2nd, and 3rd</span>
              <p className="text-sm text-gray-500 mt-1">Three placed positions. You decide the split.</p>
            </label>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(3)} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button onClick={() => setStep(5)} className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800">Next</button>
          </div>
        </div>
      )}

      {/* Step 5: PayPal link */}
      {step === 5 && (
        <div>
          <p className="text-sm font-medium mb-2">Your PayPal.Me link</p>
          <p className="text-xs text-gray-500 mb-4">
            Players will pay you directly through this link. The platform never touches entry money.
          </p>
          <input
            type="text"
            value={paypalInput}
            onChange={(e) => { setPaypalInput(e.target.value); setPaypalValidated(false) }}
            placeholder="paypal.me/yourhandle or just yourhandle"
            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
          />
          {paypalValidated && (
            <p className="text-green-700 text-sm mb-3">
              Link validated: paypal.me/{normalisePaypalHandle(paypalInput)}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(4)} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            {!paypalValidated ? (
              <button
                onClick={validatePaypal}
                disabled={!paypalInput.trim()}
                className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
              >
                Validate
              </button>
            ) : (
              <button onClick={() => setStep(6)} className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800">
                Next
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 6: Choose band / expected size */}
      {step === 6 && (
        <div>
          <p className="text-sm font-medium mb-2">How many players do you expect?</p>
          <p className="text-xs text-gray-500 mb-4">
            This sets the software fee and the player cap. You can upgrade later if you need more places.
          </p>
          <div className="space-y-3">
            {(Object.entries(PRICING_BANDS) as [PricingBand, typeof PRICING_BANDS[PricingBand]][]).map(([key, b]) => (
              <label
                key={key}
                className={`block border rounded-lg p-4 cursor-pointer ${band === key ? 'border-green-700 bg-green-50' : 'border-gray-200'}`}
              >
                <input
                  type="radio"
                  name="band"
                  value={key}
                  checked={band === key}
                  onChange={() => setBand(key)}
                  className="sr-only"
                />
                <div className="flex justify-between items-center">
                  <span className="font-medium">{b.label}</span>
                  <span className="text-green-800 font-semibold">{formatCurrency(parseFloat(b.display))}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(5)} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button onClick={() => setStep(7)} className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800">Next</button>
          </div>
        </div>
      )}

      {/* Step 7: Review and pay */}
      {step === 7 && (
        <div>
          <p className="text-sm font-medium mb-4">Review your sweepstake</p>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500 text-sm">Name</span>
              <span className="text-sm font-medium">{name}</span>
            </div>
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500 text-sm">Mode</span>
              <span className="text-sm font-medium">{mode === 'random' ? 'Random draw' : 'Pick your own'}</span>
            </div>
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500 text-sm">Entry amount</span>
              <span className="text-sm font-medium">{formatCurrency(effectiveAmount)}</span>
            </div>
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500 text-sm">Winners</span>
              <span className="text-sm font-medium">{winnerStructure === 'single' ? 'Single winner' : '1st, 2nd, 3rd'}</span>
            </div>
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500 text-sm">PayPal link</span>
              <span className="text-sm font-medium">paypal.me/{normalisePaypalHandle(paypalInput)}</span>
            </div>
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500 text-sm">Software fee</span>
              <span className="text-sm font-semibold text-green-800">
                {formatCurrency(parseFloat(PRICING_BANDS[band].display))}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            The software fee is charged to you by card via Stripe. It is the only payment the platform receives.
            Entry money is paid by players directly to you via your PayPal link and never touches the platform.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(6)} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button
              onClick={handleCreateAndPay}
              disabled={loading}
              className="flex-1 bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Creating...' : `Pay ${formatCurrency(parseFloat(PRICING_BANDS[band].display))} and create`}
            </button>
          </div>
        </div>
      )}

      {/* Step 8: Success (shown after Stripe redirect) */}
      {step === 8 && (
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-green-700 mb-2">Sweepstake created!</h2>
          <p className="text-gray-600">Redirecting to your sweepstake...</p>
        </div>
      )}
    </div>
  )
}
