'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const resetDest = next
      ? `/auth/reset-password?next=${encodeURIComponent(next)}`
      : '/auth/reset-password'
    const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(resetDest)}`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto pt-8 px-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="heading text-2xl md:text-3xl mb-3 text-brand-navy">Check your email</h1>
          <p className="text-gray-500 mb-2">
            We sent a password reset link to:
          </p>
          <p className="font-bold text-brand-navy mb-6">{email}</p>
          <p className="text-sm text-gray-400">
            Click the link in the email to set a new password. Check your spam folder if you don&apos;t see it.
          </p>
          <Link href={next || '/auth/login'} className="block mt-6 text-sm text-brand-blue font-semibold hover:underline">
            Back to {next ? 'what you were doing' : 'login'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto pt-8 px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="heading text-3xl md:text-4xl mb-2 text-brand-navy">Reset password</h1>
        <p className="text-gray-500 mb-8">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2 text-brand-navy">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:border-brand-blue focus:ring-0 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green text-brand-navy py-4 rounded-full text-base font-bold hover:bg-[#4CD930] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500 text-center">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-brand-blue font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
