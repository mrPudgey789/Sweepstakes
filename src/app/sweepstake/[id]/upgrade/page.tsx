'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PRICING_BANDS, type PricingBand } from '@/lib/pricing'
import Link from 'next/link'

const BAND_ORDER: PricingBand[] = ['free', '6_15', '16_32', '33_48']

interface SweepstakeInfo {
  id: string
  name: string
  max_players: number | null
  status: string
}

export default function UpgradePage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled') === 'true'

  const [sweepstake, setSweepstake] = useState<SweepstakeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<PricingBand | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Get the organiser record for this user
      const { data: org } = await supabase
        .from('organisers')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (!org) { router.push('/dashboard'); return }

      const { data: s } = await supabase
        .from('sweepstakes')
        .select('id, name, max_players, status')
        .eq('id', id as string)
        .eq('organiser_id', org.id)
        .single()

      if (!s) { router.push('/dashboard'); return }
      setSweepstake(s as SweepstakeInfo)
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading || !sweepstake) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-brand-green animate-spin mx-auto mb-4" />
          <p className="text-brand-navy/50 font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  // Determine current band
  const currentBand = (Object.entries(PRICING_BANDS) as [PricingBand, typeof PRICING_BANDS[PricingBand]][])
    .find(([, cfg]) => cfg.max === sweepstake.max_players)?.[0] ?? 'free'

  const currentBandIndex = BAND_ORDER.indexOf(currentBand)
  const currentBandConfig = PRICING_BANDS[currentBand]

  // Available upgrades = bands higher than current
  const upgradeBands = BAND_ORDER.slice(currentBandIndex + 1)

  async function handleUpgrade(newBand: PricingBand) {
    setError(null)
    setUpgrading(newBand)
    try {
      const res = await fetch(`/api/sweepstakes/${id}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_band: newBand }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setUpgrading(null)
        return
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setUpgrading(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

      {/* Back link */}
      <Link
        href={`/sweepstake/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy/50 hover:text-brand-navy transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to sweepstake
      </Link>

      {/* Title */}
      <div>
        <h1 className="heading text-4xl sm:text-5xl text-brand-navy leading-none mb-3">
          Upgrade group size
        </h1>
        <p className="text-brand-navy/60 font-semibold text-base">
          {sweepstake.name}
        </p>
      </div>

      {/* Current tier */}
      <div className="bg-brand-navy/5 border-2 border-brand-navy/10 rounded-2xl px-6 py-5">
        <p className="text-xs font-extrabold uppercase tracking-widest text-brand-navy/40 mb-1">Current tier</p>
        <p className="font-extrabold text-brand-navy text-lg">{currentBandConfig.label}</p>
        <p className="text-sm text-brand-navy/50 font-medium mt-0.5">{currentBandConfig.tagline}</p>
      </div>

      {/* Cancelled notice */}
      {cancelled && (
        <div className="flex items-center gap-3 bg-yellow-50 border-2 border-yellow-300 rounded-2xl px-5 py-4">
          <p className="text-sm font-bold text-yellow-800">Payment cancelled — no changes were made.</p>
        </div>
      )}

      {/* Error notice */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4">
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* Upgrade options */}
      {upgradeBands.length === 0 ? (
        <div className="border-2 border-dashed border-brand-navy/20 rounded-2xl p-10 text-center">
          <p className="text-brand-navy/40 font-bold text-lg mb-1">You&apos;re already on the highest tier</p>
          <p className="text-brand-navy/30 text-sm">No further upgrades are available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-bold text-brand-navy/60 uppercase tracking-widest">Choose a new tier</p>
          {upgradeBands.map((band) => {
            const cfg = PRICING_BANDS[band]
            const currentPaid = currentBand === 'free' ? 0 : currentBandConfig.amount
            const diffPence = cfg.amount - currentPaid
            const diffDisplay = (diffPence / 100).toFixed(2)
            const isLoading = upgrading === band

            return (
              <div
                key={band}
                className="border-2 border-brand-navy/10 hover:border-brand-blue rounded-2xl p-5 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-extrabold text-brand-navy text-base">{cfg.label}</p>
                    <p className="text-xs text-brand-navy/50 font-medium mt-0.5">{cfg.tagline}</p>
                  </div>
                  <p className="text-2xl font-extrabold text-brand-navy">£{diffDisplay}</p>
                </div>
                <button
                  onClick={() => handleUpgrade(band)}
                  disabled={upgrading !== null}
                  className="btn-primary !px-4 !py-3 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Redirecting...' : 'Upgrade'}
                </button>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
