'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    setTimeout(() => router.push(next), 2000)
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto pt-8 px-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="heading text-2xl md:text-3xl mb-3 text-brand-navy">Password updated</h1>
          <p className="text-gray-500">Redirecting you now...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto pt-8 px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="heading text-3xl md:text-4xl mb-2 text-brand-navy">New password</h1>
        <p className="text-gray-500 mb-8">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2 text-brand-navy">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:border-brand-blue focus:ring-0 focus:outline-none transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-semibold mb-2 text-brand-navy">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:border-brand-blue focus:ring-0 focus:outline-none transition-colors"
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
            {loading ? 'Updating...' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
