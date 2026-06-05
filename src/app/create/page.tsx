'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PRICING_BANDS, type PricingBand } from '@/lib/pricing'
import { formatCurrency, normalisePaypalHandle } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7

const ENTRY_PRESETS = [5, 10, 15, 20]

export default function CreateSweepstakePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [organiserName, setOrganiserName] = useState('')
  const [organiserPlays, setOrganiserPlays] = useState(true)
  const [tcAccepted, setTcAccepted] = useState(false)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'random' | 'pick_your_own'>('random')
  const [drawPool, setDrawPool] = useState<'all' | 'top_ranked'>('all')
  const [entryAmount, setEntryAmount] = useState<number>(10)
  const [customAmount, setCustomAmount] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [winnerStructure, setWinnerStructure] = useState<'single' | 'top_three'>('single')
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'manual' | null>(null)
  const [paypalInput, setPaypalInput] = useState('')
  const [band, setBand] = useState<PricingBand | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [organiserId, setOrganiserId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    // Restore wizard state if returning from email verification
    const saved = localStorage.getItem('sweepstake_wizard')
    if (saved) {
      try {
        const state = JSON.parse(saved)
        if (state.name) setName(state.name)
        if (state.organiserName) setOrganiserName(state.organiserName)
        if (state.mode) setMode(state.mode)
        if (state.entryAmount) setEntryAmount(state.entryAmount)
        if (state.customAmount) setCustomAmount(state.customAmount)
        if (state.currency) setCurrency(state.currency)
        if (state.drawPool) setDrawPool(state.drawPool)
        if (state.winnerStructure) setWinnerStructure(state.winnerStructure)
        if (state.paymentMethod) setPaymentMethod(state.paymentMethod)
        if (state.paypalInput) setPaypalInput(state.paypalInput)
        if (state.band) setBand(state.band)
        if (state.organiserId) setOrganiserId(state.organiserId)
        if (state.organiserPlays !== undefined) setOrganiserPlays(state.organiserPlays)
        if (state.step) setStep(state.step)
        localStorage.removeItem('sweepstake_wizard')
      } catch { /* ignore parse errors */ }
    }

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        setAuthEmail(user.email || '')
        const { data: organiser } = await supabase
          .from('organisers')
          .select('id, paypal_link, display_name')
          .eq('auth_id', user.id)
          .maybeSingle()
        if (organiser) {
          setOrganiserId(organiser.id)
          if (organiser.paypal_link) setPaypalInput(organiser.paypal_link)
          if (organiser.display_name) setOrganiserName(organiser.display_name)
        }
      }
    })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [step])

  const effectiveAmount = customAmount ? parseFloat(customAmount) : entryAmount
  const isFree = band === 'free'
  const bandConfig = band ? PRICING_BANDS[band] : null

  async function handleStep6Submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (isLoggedIn) {
      // Ensure organiser record exists
      if (!organiserId) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const res = await fetch('/api/organisers/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, auth_id: user.id, display_name: organiserName || null }),
          })
          const result = await res.json()
          if (res.ok) setOrganiserId(result.id)
        }
      }
      setStep(7)
      return
    }

    setAuthLoading(true)
    const supabase = createClient()

    if (authMode === 'signup') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: authEmail, password: authPassword,
        options: {
          data: { role: 'organiser' },
          emailRedirectTo: `${appUrl}/auth/callback?next=/create`,
        },
      })
      if (signUpError) { setError(signUpError.message); setAuthLoading(false); return }
      if (data.user) {
        const res = await fetch('/api/organisers/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, auth_id: data.user.id, display_name: organiserName || null }),
        })
        const result = await res.json()
        if (!res.ok) { setError(result.error || 'Profile setup failed. Try logging in.'); setAuthLoading(false); return }
        setOrganiserId(result.id)
        // If email confirmation required, save wizard state and redirect to verify
        if (!data.session) {
          localStorage.setItem('sweepstake_wizard', JSON.stringify({
            name, organiserName, mode, drawPool, entryAmount, customAmount, currency, winnerStructure,
            paymentMethod, paypalInput, band, organiserId: result.id, organiserPlays,
            step: 7,
          }))
          router.push(`/auth/verify?email=${encodeURIComponent(authEmail)}&next=/create`)
          return
        }
        setIsLoggedIn(true)
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      if (signInError) { setError(signInError.message); setAuthLoading(false); return }
      if (data.user) {
        const res = await fetch('/api/organisers/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, auth_id: data.user.id }),
        })
        const result = await res.json()
        if (res.ok) setOrganiserId(result.id)
        setIsLoggedIn(true)
      }
    }
    setAuthLoading(false)
    setStep(7)
  }

  async function handleCreateAndPay() {
    setLoading(true)
    setError(null)
    try {
      const handle = paymentMethod === 'paypal' ? normalisePaypalHandle(paypalInput) : ''
      const paypalLink = paymentMethod === 'paypal' ? `https://paypal.me/${handle}` : 'manual'
      const res = await fetch('/api/sweepstakes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mode, draw_pool: drawPool, entry_amount: effectiveAmount, currency, winner_structure: winnerStructure, paypal_link: paypalLink, band, organiser_id: organiserId, organiser_plays: organiserPlays, organiser_name: organiserName, organiser_email: authEmail }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Failed to create sweepstake.'); setLoading(false); return }
      if (result.checkout_url) { window.location.href = result.checkout_url }
      else { router.push(`/sweepstake/${result.sweepstake_id}`) }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // Work out which buttons to show for the fixed bar
  const canGoBack = step > 1
  const backStep = (): void => {
    if (step === 7) setStep(6)
    else if (step > 1) setStep((step - 1) as Step)
  }

  return (
    <div className="fixed inset-0 top-[57px] flex flex-col">
      {/* Header + progress */}
      <div className="z-30 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="max-w-xl mx-auto pt-4 pb-3 px-4">
          {step === 1 ? (
            <h1 className="heading text-3xl md:text-4xl text-brand-navy">Create your sweepstake</h1>
          ) : (
            <div>
              <p className="text-xs font-bold text-brand-blue uppercase tracking-widest">Creating</p>
              <h1 className="heading text-2xl md:text-3xl text-brand-navy">{name}</h1>
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            {[1,2,3,4,5,6,7].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-brand-green' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content — scrolls internally so inputs never hide behind header */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 pb-24">
        <div className="max-w-xl mx-auto pt-6 px-4">

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium mb-6">
              {error}
            </div>
          )}

      {/* ===== Step 1: Name ===== */}
      {step === 1 && (
        <div className="animate-slideUp space-y-5">
          {!isLoggedIn && (
            <div>
              <label className="block text-lg font-bold mb-3 text-brand-navy">
                Your full name
              </label>
              <input
                type="text"
                value={organiserName}
                onChange={(e) => setOrganiserName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg focus:border-brand-blue focus:ring-0 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          )}
          <div>
            <label className="block text-lg font-bold mb-3 text-brand-navy">
              Name your sweepstake
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing Team Sweepstake"
              className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg focus:border-brand-blue focus:ring-0 focus:outline-none transition-colors"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer border-2 border-gray-200 rounded-2xl px-5 py-4 hover:border-brand-blue/30 transition-colors">
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                checked={organiserPlays}
                onChange={(e) => setOrganiserPlays(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-6 h-6 rounded-lg border-2 border-gray-300 bg-white peer-checked:bg-brand-green peer-checked:border-brand-green transition-all flex items-center justify-center">
                {organiserPlays && (
                  <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm font-bold text-brand-navy">I want to play too</span>
              <p className="text-xs text-brand-navy/50">You will be added as player number 1</p>
            </div>
          </label>
          {/* CTA in fixed bar below */}
        </div>
      )}

      {/* ===== Step 2: Mode ===== */}
      {step === 2 && (
        <div className="animate-slideUp space-y-4">
          <p className="text-lg font-bold text-brand-navy">How are teams assigned?</p>
          <label className={`block border-2 rounded-2xl p-5 cursor-pointer transition-all ${mode === 'random' ? 'border-brand-green bg-brand-green/10 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" name="mode" checked={mode === 'random'} onChange={() => setMode('random')} className="sr-only" />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-brand-navy">Random draw</span>
                <span className="ml-2 text-xs bg-brand-green text-brand-navy px-2.5 py-1 rounded-full font-bold">Recommended</span>
                <p className="text-sm text-gray-500 mt-1">Teams are drawn automatically. Fair, fast, classic.</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${mode === 'random' ? 'border-brand-green bg-brand-green' : 'border-gray-300'}`}>
                {mode === 'random' && <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
            </div>
          </label>

          {/* Draw pool sub-option (only when random is selected) */}
          {mode === 'random' && (
            <div className="ml-4 pl-4 border-l-2 border-brand-green space-y-2 animate-fadeIn">
              <p className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest">Draw from which teams?</p>
              <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all ${drawPool === 'all' ? 'border-brand-green bg-brand-green/10' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="drawPool" checked={drawPool === 'all'} onChange={() => setDrawPool('all')} className="sr-only" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${drawPool === 'all' ? 'border-brand-green bg-brand-green' : 'border-gray-300'}`}>
                  {drawPool === 'all' && <svg className="w-3 h-3 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div>
                  <span className="text-sm font-bold text-brand-navy">All 48 teams</span>
                  <p className="text-xs text-gray-500">Every nation in the tournament is in the hat.</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all ${drawPool === 'top_ranked' ? 'border-brand-green bg-brand-green/10' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="drawPool" checked={drawPool === 'top_ranked'} onChange={() => setDrawPool('top_ranked')} className="sr-only" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${drawPool === 'top_ranked' ? 'border-brand-green bg-brand-green' : 'border-gray-300'}`}>
                  {drawPool === 'top_ranked' && <svg className="w-3 h-3 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div>
                  <span className="text-sm font-bold text-brand-navy">Top-ranked teams only</span>
                  <p className="text-xs text-gray-500">Best for smaller groups. Only the strongest nations are in the draw.</p>
                </div>
              </label>
            </div>
          )}
          <label className={`block border-2 rounded-2xl p-5 cursor-pointer transition-all ${mode === 'pick_your_own' ? 'border-brand-green bg-brand-green/10 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" name="mode" checked={mode === 'pick_your_own'} onChange={() => setMode('pick_your_own')} className="sr-only" />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-brand-navy">Pick your own</span>
                <p className="text-sm text-gray-500 mt-1">Players choose a team when they join. First come, first served.</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${mode === 'pick_your_own' ? 'border-brand-green bg-brand-green' : 'border-gray-300'}`}>
                {mode === 'pick_your_own' && <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
            </div>
          </label>
          {/* CTA in fixed bar below */}
        </div>
      )}

      {/* ===== Step 3: Entry amount ===== */}
      {step === 3 && (() => {
        const CURRENCIES = [
          { code: 'GBP', symbol: '£', label: '£ GBP' },
          { code: 'EUR', symbol: '€', label: '€ EUR' },
          { code: 'USD', symbol: '$', label: '$ USD' },
        ]
        const currSymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '£'
        return (
          <div className="animate-slideUp">
            <p className="text-lg font-bold text-brand-navy mb-1">Entry amount per player</p>
            <p className="text-sm text-gray-500 mb-5">Players pay you directly. We never touch this money.</p>

            {/* Currency selector */}
            <div className="flex gap-2 mb-5">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`flex-1 border-2 rounded-2xl py-2.5 text-sm font-bold transition-all ${
                    currency === c.code
                      ? 'border-brand-green bg-brand-green/10 text-brand-navy shadow-md'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-3 mb-5">
              {ENTRY_PRESETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setEntryAmount(amt); setCustomAmount('') }}
                  className={`border-2 rounded-2xl py-3 text-base font-bold transition-all ${
                    entryAmount === amt && !customAmount
                      ? 'border-brand-green bg-brand-green/10 text-brand-navy shadow-md'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {formatCurrency(amt, currency)}
                </button>
              ))}
            </div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Or enter a custom amount</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 text-lg font-bold">{currSymbol}</span>
              <input type="number" min="1" step="0.01" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-2xl pl-9 pr-4 py-3 text-lg focus:border-brand-blue focus:ring-0 focus:outline-none" />
            </div>
            {/* CTA in fixed bar below */}
          </div>
        )
      })()}

      {/* ===== Step 4: Winners ===== */}
      {step === 4 && (
        <div className="animate-slideUp space-y-4">
          <p className="text-lg font-bold text-brand-navy">How many winners?</p>
          <label className={`block border-2 rounded-2xl p-5 cursor-pointer transition-all ${winnerStructure === 'single' ? 'border-brand-green bg-brand-green/10 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" name="winner" checked={winnerStructure === 'single'} onChange={() => setWinnerStructure('single')} className="sr-only" />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-brand-navy">Single winner</span>
                <p className="text-sm text-gray-500 mt-1">One player takes the whole pot.</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${winnerStructure === 'single' ? 'border-brand-green bg-brand-green' : 'border-gray-300'}`}>
                {winnerStructure === 'single' && <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
            </div>
          </label>
          <label className={`block border-2 rounded-2xl p-5 cursor-pointer transition-all ${winnerStructure === 'top_three' ? 'border-brand-green bg-brand-green/10 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" name="winner" checked={winnerStructure === 'top_three'} onChange={() => setWinnerStructure('top_three')} className="sr-only" />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-brand-navy">1st, 2nd, and 3rd</span>
                <p className="text-sm text-gray-500 mt-1">Three placed positions. You decide the split.</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${winnerStructure === 'top_three' ? 'border-brand-green bg-brand-green' : 'border-gray-300'}`}>
                {winnerStructure === 'top_three' && <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
            </div>
          </label>
          {/* CTA in fixed bar below */}
        </div>
      )}

      {/* ===== Step 5: Payment method ===== */}
      {step === 5 && (
        <div className="animate-slideUp">
          <p className="text-lg font-bold text-brand-navy mb-2">How will players pay you?</p>
          <p className="text-sm text-gray-500 mb-5">All entry money goes directly to you. We never touch it.</p>

          <div className="space-y-3 mb-5">
            {/* PayPal option */}
            <label className={`block border-2 rounded-2xl p-5 cursor-pointer transition-all ${paymentMethod === 'paypal' ? 'border-brand-green bg-brand-green/10' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="payMethod" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} className="sr-only" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/paypal-logo.svg" alt="PayPal" className="w-8 h-8" />
                  <div>
                    <span className="text-base font-bold text-brand-navy">Via PayPal</span>
                    <p className="text-xs text-gray-500 mt-0.5">We will generate a payment link for your players.</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'paypal' ? 'border-brand-green bg-brand-green' : 'border-gray-300'}`}>
                  {paymentMethod === 'paypal' && <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            </label>

            {/* Manual / outside the app */}
            <label className={`block border-2 rounded-2xl p-5 cursor-pointer transition-all ${paymentMethod === 'manual' ? 'border-brand-green bg-brand-green/10' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="payMethod" checked={paymentMethod === 'manual'} onChange={() => { setPaymentMethod('manual') }} className="sr-only" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <span className="text-base font-bold text-brand-navy">I will handle it myself</span>
                    <p className="text-xs text-gray-500 mt-0.5">Collect payments in person, by bank transfer, or any other way.</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'manual' ? 'border-brand-green bg-brand-green' : 'border-gray-300'}`}>
                  {paymentMethod === 'manual' && <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            </label>
          </div>

          {/* PayPal handle input (only when PayPal selected) */}
          {paymentMethod === 'paypal' && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-bold mb-2 text-brand-navy">Your PayPal.Me handle</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden mb-4 focus-within:border-brand-blue transition-colors">
                <span className="bg-gray-100 text-gray-500 text-sm font-semibold px-4 py-3.5 border-r-2 border-gray-200 select-none whitespace-nowrap">paypal.me/</span>
                <input
                  type="text"
                  value={paypalInput.replace(/^https?:\/\/paypal\.me\//i, '')}
                  onChange={(e) => { setPaypalInput(e.target.value.replace(/[^A-Za-z0-9]/g, ''));  }}
                  placeholder="yourhandle"
                  className="flex-1 px-4 py-3.5 outline-none text-base"
                  autoFocus
                />
              </div>

              {paypalInput.trim().length >= 2 && (
                <p className="text-xs text-gray-500 mb-4">
                  Players will see: <span className="font-mono font-semibold text-brand-navy">paypal.me/{normalisePaypalHandle(paypalInput)}/{effectiveAmount}</span>
                </p>
              )}

              <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-gray-700 mb-3">Not sure of your link?</p>
                <a href="https://www.paypal.com/myaccount/settings/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-blue font-bold py-2.5 hover:underline">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Open PayPal settings to find your link
                </a>
                <a href="https://www.paypal.com/paypalme/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-blue font-bold py-2.5 hover:underline">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Create a free PayPal.Me link
                </a>
              </div>
            </div>
          )}

          {/* Manual info (only when manual selected) */}
          {paymentMethod === 'manual' && (
            <div className="animate-fadeIn bg-gray-50 border-2 border-gray-100 rounded-2xl p-4">
              <p className="text-sm text-gray-600">
                Players will be told to pay you directly. You can share your payment details with them after they join.
              </p>
            </div>
          )}

          {/* CTA in fixed bar below */}
        </div>
      )}

      {/* ===== Step 6: Account + Band ===== */}
      {step === 6 && (
        <form onSubmit={handleStep6Submit} className="animate-slideUp">
          {!isLoggedIn ? (
            <div className="mb-8">
              <p className="text-lg font-bold text-brand-navy mb-1">Your account</p>
              <p className="text-sm text-gray-500 mb-5">So you can manage <strong>{name}</strong> and confirm player payments.</p>

              <div className="flex border-2 border-gray-200 rounded-full overflow-hidden mb-5">
                <button type="button" onClick={() => { setAuthMode('signup'); setError(null) }} className={`flex-1 py-3 text-sm font-bold transition-all ${authMode === 'signup' ? 'bg-brand-blue text-white' : 'bg-white text-gray-500'}`}>New account</button>
                <button type="button" onClick={() => { setAuthMode('login'); setError(null) }} className={`flex-1 py-3 text-sm font-bold transition-all ${authMode === 'login' ? 'bg-brand-blue text-white' : 'bg-white text-gray-500'}`}>I have an account</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-brand-navy">Email</label>
                  <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:border-brand-blue focus:ring-0 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-brand-navy">{authMode === 'signup' ? 'Create a password' : 'Password'}</label>
                  <input type="password" required minLength={6} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:border-brand-blue focus:ring-0 focus:outline-none transition-colors" />
                  {authMode === 'login' && (
                    <div className="mt-2 text-right">
                      <Link href="/auth/forgot-password?next=/create" className="text-sm text-brand-blue font-semibold hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  )}
                  {authMode === 'signup' && authPassword.length > 0 && (() => {
                    const hasLength = authPassword.length >= 8
                    const hasUpper = /[A-Z]/.test(authPassword)
                    const hasNumber = /[0-9]/.test(authPassword)
                    const strength = [hasLength, hasUpper, hasNumber].filter(Boolean).length
                    const label = strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : 'Strong'
                    const colour = strength <= 1 ? 'bg-red-400' : strength === 2 ? 'bg-yellow-400' : 'bg-brand-green'
                    return (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[0,1,2].map((i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? colour : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <p className={`text-xs font-bold ${strength <= 1 ? 'text-red-500' : strength === 2 ? 'text-yellow-600' : 'text-brand-green'}`}>{label}</p>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 bg-brand-green/10 border-2 border-brand-green/30 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-bold text-brand-navy">Logged in as {authEmail}</p>
            </div>
          )}

          <div className="border-t-2 border-gray-100 pt-8">
            <p className="text-lg font-bold text-brand-navy mb-1">Choose your plan</p>
            <p className="text-sm text-gray-500 mb-2">A small one-off fee to Sweep or Weep to run your sweepstake.</p>
            <p className="text-xs text-gray-400 mb-5">This is NOT the entry fee your players pay. That goes directly to you.</p>

            <div className="space-y-3 mb-6">
              {(Object.entries(PRICING_BANDS) as [PricingBand, typeof PRICING_BANDS[PricingBand]][]).map(([key, b]) => (
                <label key={key} className={`block border-2 rounded-2xl p-5 cursor-pointer transition-all ${band === key ? 'border-brand-green bg-brand-green/10 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="band" value={key} checked={band === key} onChange={() => setBand(key)} className="sr-only" />
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-brand-navy">{b.label}</span>
                      {key === 'free' && <span className="ml-2 text-xs bg-brand-green text-brand-navy px-2.5 py-1 rounded-full font-bold">Free</span>}
                      <p className="text-xs text-gray-500 mt-0.5">{b.tagline}</p>
                    </div>
                    <span className={`text-lg font-bold ${b.amount === 0 ? 'text-brand-navy' : 'text-brand-navy'}`}>
                      {b.amount === 0 ? '£0' : formatCurrency(parseFloat(b.display))}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {!isFree && (
              <p className="text-xs text-gray-500 mb-5 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Secure payment via Stripe. Apple Pay and Google Pay accepted.
              </p>
            )}
          </div>

          {/* CTA in fixed bar below */}
        </form>
      )}

      {/* ===== Step 7: Review ===== */}
      {step === 7 && (
        <div className="animate-slideUp">
          <p className="text-lg font-bold text-brand-navy mb-5">Everything look right?</p>
          <div className="bg-white border-2 border-gray-100 rounded-3xl divide-y-2 divide-gray-100 shadow-lg overflow-hidden mb-6">
            {[
              ['Name', name],
              ['Mode', mode === 'random' ? (drawPool === 'top_ranked' ? 'Random draw (top teams)' : 'Random draw (all teams)') : 'Pick your own'],
              ['Entry amount', formatCurrency(effectiveAmount, currency)],
              ['Winners', winnerStructure === 'single' ? 'Single winner' : '1st, 2nd, 3rd'],
              ['Payment', paymentMethod === 'paypal' ? `paypal.me/${normalisePaypalHandle(paypalInput)}` : 'Handled outside the app'],
              ['Players', bandConfig?.label || ''],
              ['Software fee', isFree ? 'Free' : formatCurrency(parseFloat(bandConfig?.display || '0'))],
            ].map(([label, value]) => (
              <div key={label} className="px-6 py-4 flex justify-between items-center">
                <span className="text-gray-500 text-sm font-medium">{label}</span>
                <span className={`text-sm font-bold ${label === 'Software fee' && isFree ? 'text-[#1a7a00]' : 'text-brand-navy'}`}>{value}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mb-6">
            {isFree
              ? 'No charge for up to 5 players. Entry money is paid by players directly to you.'
              : 'One-off fee via Stripe (Apple Pay and Google Pay accepted). Entry money is paid by players directly to you.'}
          </p>

          {/* T&Cs */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-sm text-brand-navy/70 max-h-44 overflow-y-auto space-y-3 leading-relaxed mb-5">
            <p>By creating this sweepstake you agree to the following:</p>
            <p>
              <strong className="text-brand-navy">You are the organiser.</strong> You are solely responsible for collecting entry payments
              from your players and paying out winnings. The platform never holds, receives, or distributes any entry money or prize pot.
            </p>
            <p>
              The platform provides software only. It is not the operator of any lottery, gambling service, or sweepstake.
              Any sweepstake is created, run, and controlled entirely by you.
            </p>
            <p>
              Fixtures and results are sourced from third-party data feeds and may be delayed or incorrect.
              You can manually override any result at any time.
            </p>
            <p>
              The software fee (if applicable) is a one-off charge for use of the platform and is non-refundable.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group mb-4">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={tcAccepted}
                onChange={(e) => setTcAccepted(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-6 h-6 rounded-lg border-2 border-gray-300 bg-gray-50 peer-checked:bg-brand-green peer-checked:border-brand-green transition-all flex items-center justify-center">
                {tcAccepted && (
                  <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-brand-navy/70 group-hover:text-brand-navy transition-colors">
              I accept the Terms and Conditions
            </span>
          </label>

          {/* CTA in fixed bar below */}
        </div>
      )}

        </div>{/* end max-w-xl */}
      </div>{/* end scrollable */}

      {/* ===== Bottom bar ===== */}
      <div className="flex-shrink-0 bg-white border-t-2 border-gray-100 px-4 py-4 z-40">
        <div className="max-w-xl mx-auto flex gap-3">
          {canGoBack && (
            <button onClick={backStep} className="flex-1 btn-secondary !py-3.5" type="button">
              Back
            </button>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <button disabled={!name.trim() || (!isLoggedIn && !organiserName.trim())} onClick={() => setStep(2)} className={`${canGoBack ? 'flex-1' : 'w-full'} btn-primary !py-3.5`}>
              Let&apos;s go
            </button>
          )}

          {/* Steps 2-4: simple Next */}
          {step === 2 && (
            <button onClick={() => setStep(3)} className="flex-1 btn-primary !py-3.5">Next</button>
          )}
          {step === 3 && (
            <button disabled={!effectiveAmount || effectiveAmount <= 0} onClick={() => setStep(4)} className="flex-1 btn-primary !py-3.5">Next</button>
          )}
          {step === 4 && (
            <button onClick={() => setStep(5)} className="flex-1 btn-primary !py-3.5">Next</button>
          )}

          {/* Step 5: Payment method */}
          {step === 5 && (
            <button
              onClick={() => {
                if (paymentMethod === 'paypal' && paypalInput.trim().length >= 2) {
                                    setStep(6)
                } else if (paymentMethod === 'manual') {
                  setStep(6)
                }
              }}
              disabled={!paymentMethod || (paymentMethod === 'paypal' && paypalInput.trim().length < 2)}
              className="flex-1 btn-primary !py-3.5"
            >
              Next
            </button>
          )}

          {/* Step 6: Account + band - submit form */}
          {step === 6 && (
            <button
              type="button"
              disabled={authLoading || (!isLoggedIn && (!authEmail || !authPassword)) || !band}
              onClick={(e) => {
                const form = document.querySelector('form')
                if (form) form.requestSubmit()
                else handleStep6Submit(e as unknown as React.FormEvent)
              }}
              className="flex-1 btn-primary !py-3.5"
            >
              {authLoading ? 'Working...' : 'Review'}
            </button>
          )}

          {/* Step 7: Create/pay */}
          {step === 7 && (
            <button onClick={handleCreateAndPay} disabled={loading || !tcAccepted} className="flex-1 btn-primary !py-3.5 !text-lg disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? 'Creating...' : isFree ? 'Create' : `Pay ${formatCurrency(parseFloat(bandConfig?.display || '0'))}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
