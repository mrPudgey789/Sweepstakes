'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildPaypalLink, formatCurrency } from '@/lib/utils'
import { TeamFlag } from '@/components/team-flag'
import { useRouter } from 'next/navigation'

interface Props {
  sweepstakeId: string
  sweepstakeName: string
  mode: string
  entryAmount: number
  currency: string
  paypalLink: string
  organiserName: string
}

interface Team {
  id: string
  name: string
  code: string
  group_letter: string
}

type Step = 'email' | 'terms' | 'team' | 'payment' | 'done'

function StepIndicator({ current, mode }: { current: Step; mode: string }) {
  const steps: { key: Step; label: string }[] =
    mode === 'pick_your_own'
      ? [
          { key: 'email', label: 'You' },
          { key: 'terms', label: 'T&Cs' },
          { key: 'team', label: 'Team' },
          { key: 'payment', label: 'Pay' },
        ]
      : [
          { key: 'email', label: 'You' },
          { key: 'terms', label: 'T&Cs' },
          { key: 'payment', label: 'Pay' },
        ]

  const currentIndex = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const isComplete = i < currentIndex
        const isActive = i === currentIndex
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 transition-all ${
                  isComplete
                    ? 'bg-brand-green border-brand-green text-[#0A1628]'
                    : isActive
                    ? 'bg-brand-blue border-brand-blue text-white'
                    : 'bg-transparent border-gray-300 text-brand-blue/50'
                }`}
              >
                {isComplete ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-brand-blue' : isComplete ? 'text-brand-green' : 'text-brand-blue/40'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${
                  i < currentIndex ? 'bg-brand-green' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function JoinFlow({
  sweepstakeId,
  sweepstakeName,
  mode,
  entryAmount,
  currency,
  paypalLink,
  organiserName,
}: Props) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [tcAccepted, setTcAccepted] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [assignedTeam, setAssignedTeam] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  // Check if user is already logged in, or if returning from email verification
  useEffect(() => {
    // Restore join intent from localStorage (returning from email verification)
    const saved = localStorage.getItem('join_intent')
    if (saved) {
      try {
        const intent = JSON.parse(saved)
        if (intent.sweepstakeId === sweepstakeId) {
          if (intent.displayName) setDisplayName(intent.displayName)
          if (intent.email) setEmail(intent.email)
          if (intent.selectedTeam) setSelectedTeam(intent.selectedTeam)
        }
      } catch { /* ignore */ }
    }

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        setEmail(user.email || '')
        const name = user.user_metadata?.display_name || user.user_metadata?.name || ''
        if (name && !displayName) setDisplayName(name)

        // If returning from verification with saved intent, go straight to join
        if (saved) {
          const intent = JSON.parse(saved)
          if (intent.sweepstakeId === sweepstakeId) {
            localStorage.removeItem('join_intent')
            // Go to T&Cs step (user still needs to accept)
            setStep('terms')
            return
          }
        }

        // Normal logged-in flow: skip step 1 if we have a name
        if (name || displayName) {
          setStep('terms')
        }
      } else if (saved) {
        // Not logged in but have saved intent: user hasn't verified yet
        localStorage.removeItem('join_intent')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mode === 'pick_your_own' && step === 'team') {
      const supabase = createClient()

      const loadTeams = async () => {
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('id')
          .eq('name', 'FIFA World Cup 2026')
          .maybeSingle()

        if (!tournament) return

        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, name, code, group_letter')
          .eq('tournament_id', tournament.id)
          .order('group_letter')
          .order('name')

        const { data: takenEntries } = await supabase
          .from('entries')
          .select('team_id')
          .eq('sweepstake_id', sweepstakeId)
          .not('team_id', 'is', null)

        const takenIds = new Set((takenEntries || []).map((e) => e.team_id))
        setAvailableTeams((allTeams || []).filter((t) => !takenIds.has(t.id)))
      }

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
          password: isLoggedIn ? undefined : password,
          display_name: displayName,
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

    await fetch('/api/player/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId }),
    })

    setStep('done')
    setLoading(false)
  }

  const inputClass =
    'w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-brand-navy placeholder-gray-400 font-medium focus:outline-none focus:border-brand-blue transition-colors'

  return (
    <div className="bg-white border-2 border-brand-navy/10 rounded-3xl p-6 sm:p-8">
      {step !== 'done' && <StepIndicator current={step} mode={mode} />}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Step 1: Email */}
      {step === 'email' && (
        <div className="space-y-5">
          <div>
            <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-4">
              Step 1 of {mode === 'pick_your_own' ? 4 : 3}
            </p>
            <h2 className="text-brand-navy text-xl font-extrabold mb-1">Who are you?</h2>
            <p className="text-brand-blue/70 text-sm">
              {isLoggedIn ? 'Confirm your details to claim your spot.' : 'Enter your details to claim your spot.'}
            </p>
          </div>

          {isLoggedIn ? (
            /* Logged-in user: just show name field */
            <div className="space-y-4">
              <div className="bg-brand-green/10 border-2 border-brand-green/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 bg-brand-green rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-bold text-brand-navy">Logged in as {email}</p>
              </div>
              <div>
                <label className="block text-brand-blue text-xs font-bold uppercase tracking-widest mb-2">
                  Display name <span className="text-brand-green">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. James Smith"
                  className={inputClass}
                />
                <p className="text-brand-blue/50 text-xs mt-2">
                  This is how other players will see you.
                </p>
              </div>
            </div>
          ) : (
            /* Not logged in: signup or login */
            <div className="space-y-4">
              <div className="flex border-2 border-gray-200 rounded-full overflow-hidden">
                <button type="button" onClick={() => { setAuthMode('signup'); setError(null) }} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${authMode === 'signup' ? 'bg-brand-blue text-white' : 'bg-white text-gray-500'}`}>New here</button>
                <button type="button" onClick={() => { setAuthMode('login'); setError(null) }} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${authMode === 'login' ? 'bg-brand-blue text-white' : 'bg-white text-gray-500'}`}>I have an account</button>
              </div>

              <div>
                <label className="block text-brand-blue text-xs font-bold uppercase tracking-widest mb-2">
                  Your full name <span className="text-brand-green">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. James Smith"
                  className={inputClass}
                />
                <p className="text-brand-blue/50 text-xs mt-2">
                  This is how other players will see you.
                </p>
              </div>

              <div>
                <label className="block text-brand-blue text-xs font-bold uppercase tracking-widest mb-2">
                  Email address <span className="text-brand-green">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-brand-blue text-xs font-bold uppercase tracking-widest mb-2">
                  {authMode === 'signup' ? 'Create a password' : 'Password'} <span className="text-brand-green">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'signup' ? 'Min 6 characters' : 'Your password'}
                  className={inputClass}
                />
                {authMode === 'signup' && password.length > 0 && password.length < 6 && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">Password must be at least 6 characters.</p>
                )}
              </div>

              {authMode === 'login' && (
                <a href="/auth/forgot-password" className="text-sm text-brand-blue font-semibold hover:underline block text-right">
                  Forgot password?
                </a>
              )}
            </div>
          )}

          <button
            onClick={async () => {
              setError(null)

              if (isLoggedIn) {
                if (!displayName.trim()) { setError('Please enter your name.'); return }
                setStep('terms')
                return
              }

              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
              if (!emailRegex.test(email)) { setError('Please enter a valid email address.'); return }
              if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
              if (!displayName.trim()) { setError('Please enter your name.'); return }

              setLoading(true)
              const supabase = createClient()

              if (authMode === 'login') {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
                if (signInError) {
                  setError(signInError.message)
                  setLoading(false)
                  return
                }
                setIsLoggedIn(true)
                setLoading(false)
                setStep('terms')
                return
              }

              // Signup: create account with email verification
              const appUrl = window.location.origin
              const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: { display_name: displayName, role: 'player' },
                  emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
                },
              })

              if (signUpError) {
                setError(signUpError.message)
                setLoading(false)
                return
              }

              // If email confirmation required (no session), save intent and redirect
              if (!data.session) {
                // Save the current path so we can redirect back after verification
                const joinPath = window.location.pathname
                localStorage.setItem('join_intent', JSON.stringify({
                  sweepstakeId,
                  joinPath,
                  displayName,
                  email,
                  selectedTeam,
                }))
                router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
                return
              }

              // Session exists (email already confirmed or confirmation disabled)
              setIsLoggedIn(true)
              setLoading(false)
              setStep('terms')
            }}
            disabled={!displayName.trim() || (!isLoggedIn && (!email || password.length < 6)) || loading}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (authMode === 'login' ? 'Logging in...' : 'Creating account...') : 'Continue'}
          </button>
        </div>
      )}

      {/* Step 2: T&Cs */}
      {step === 'terms' && (
        <div className="space-y-5">
          <div>
            <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-4">
              Step 2 of {mode === 'pick_your_own' ? 4 : 3}
            </p>
            <h2 className="text-brand-navy text-xl font-extrabold mb-1">Terms and Conditions</h2>
            <p className="text-brand-blue/70 text-sm">Please read and accept before continuing.</p>
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-sm text-brand-blue/80 max-h-52 overflow-y-auto space-y-3 leading-relaxed">
            <p>By joining this sweepstake you agree to the following:</p>
            <p>
              The platform provides software only. It is not the operator of any lottery or sweepstake.
              Any sweepstake is created, run, and controlled by the organiser.
            </p>
            <p>
              <strong className="text-brand-navy font-bold">
                Entry money is paid directly to the organiser, outside the platform.
              </strong>{' '}
              The platform never holds, receives, or pays out any entry money or pot. Any dispute about
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

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={tcAccepted}
                onChange={(e) => setTcAccepted(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-6 h-6 rounded-lg border-2 border-gray-300 bg-gray-50 peer-checked:bg-brand-green peer-checked:border-brand-green transition-all flex items-center justify-center">
                {tcAccepted && (
                  <svg className="w-3.5 h-3.5 text-[#0A1628]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-brand-blue group-hover:text-brand-navy transition-colors">
              I accept the Terms and Conditions
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('email')}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              data-auto-join
              onClick={() => {
                if (mode === 'pick_your_own') {
                  setStep('team')
                } else {
                  handleJoin()
                }
              }}
              disabled={!tcAccepted || loading}
              className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mode === 'pick_your_own' ? 'Choose your team' : loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pick team (pick-your-own only) */}
      {step === 'team' && (
        <div className="space-y-5">
          <div>
            <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-4">
              Step 3 of 4
            </p>
            <h2 className="text-brand-navy text-xl font-extrabold mb-1">Choose your team</h2>
            <p className="text-brand-blue/70 text-sm">Pick an available team. First come, first served.</p>
          </div>

          {availableTeams.length === 0 ? (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-6 text-center">
              <p className="text-brand-blue/60 text-sm font-medium">
                No teams available. All have been taken.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {availableTeams.map((team) => {
                const isSelected = selectedTeam === team.id
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team.id)}
                    className={`text-left border-2 rounded-2xl px-3 py-3 transition-all ${
                      isSelected
                        ? 'border-brand-green bg-brand-green/10'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <TeamFlag code={team.code} size="sm" />
                        <span className={`text-sm font-bold leading-tight ${isSelected ? 'text-brand-green' : 'text-brand-navy'}`}>
                          {team.name}
                        </span>
                      </div>
                      {isSelected && (
                        <svg className="w-4 h-4 text-brand-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-brand-blue/50 font-medium mt-0.5 block">
                      Group {team.group_letter}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('terms')}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              onClick={handleJoin}
              disabled={!selectedTeam || loading}
              className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Confirm and join'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 'payment' && (
        <div className="space-y-5">
          <div>
            <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-4">
              Almost there
            </p>
            <h2 className="text-brand-navy text-xl font-extrabold mb-1">
              You are in{assignedTeam ? ` with ${assignedTeam}` : ''}!
            </h2>
            {mode === 'random' && !assignedTeam ? (
              <p className="text-brand-blue/70 text-sm">
                Your team will be drawn when the organiser runs the draw. You will be notified by email.
              </p>
            ) : assignedTeam ? (
              <p className="text-brand-blue/70 text-sm">
                Your team has been locked in. Now sort your entry payment.
              </p>
            ) : null}
          </div>

          <div className="bg-gray-50 border-2 border-brand-navy/10 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-1">
                Entry fee set by {organiserName}
              </p>
              <p className="text-brand-navy text-2xl font-extrabold">
                {formatCurrency(entryAmount, currency)}
              </p>
            </div>

            {paypalLink && paypalLink !== 'manual' ? (
              <>
                <p className="text-brand-navy/50 text-xs leading-relaxed">
                  Pay {organiserName} directly via PayPal. This is a personal payment between
                  you and the organiser. The platform never touches this money.
                </p>
                <a
                  href={buildPaypalLink(paypalLink, entryAmount)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-bold py-3.5 rounded-full transition-colors text-sm"
                >
                  Pay {formatCurrency(entryAmount, currency)} via PayPal
                </a>
                <p className="text-brand-navy/30 text-xs text-center">
                  The pre-filled amount is editable. {organiserName} will confirm receipt.
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-brand-navy/70 text-sm leading-relaxed">
                  The organiser collects payments outside the app. Pay <strong className="text-brand-navy">{organiserName}</strong> directly
                  (in person, bank transfer, or however they prefer).
                </p>
                <p className="text-brand-navy/40 text-xs">
                  The platform never touches entry money. Once you have paid, tap the button below.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={markPaid}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Marking...' : 'I have paid'}
          </button>

          <button
            onClick={() => setStep('done')}
            className="w-full text-sm text-brand-blue/50 hover:text-brand-blue transition-colors py-1"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Step 5: Done */}
      {step === 'done' && (
        <div className="text-center py-4 space-y-5">
          <div className="w-16 h-16 rounded-full bg-brand-green/15 border-2 border-brand-green flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h2 className="heading text-3xl text-brand-green mb-2">
              You are in!
            </h2>
            <p className="text-brand-navy font-extrabold text-lg mb-1">{sweepstakeName}</p>
            <p className="text-brand-blue/70 text-sm">
              {mode === 'random'
                ? 'Your team will be assigned when the organiser runs the draw.'
                : 'Your team has been locked in. Good luck!'}
            </p>
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-brand-navy font-bold text-sm">{email}</p>
            <p className="text-brand-navy/40 text-xs mt-1">
              You can log in with this email to track your team.
            </p>
          </div>

          <a
            href={`/sweepstake/${sweepstakeId}/player`}
            className="btn-primary block w-full"
          >
            View your sweepstake
          </a>
        </div>
      )}
    </div>
  )
}
