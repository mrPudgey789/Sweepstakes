'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role: 'organiser' },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await fetch('/api/organisers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, auth_id: data.user.id, display_name: displayName || null }),
      })
      // If email confirmation is required, redirect to verify page
      if (!data.session) {
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
      } else {
        router.push('/dashboard')
      }
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto pt-8">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="heading text-3xl md:text-4xl mb-2 text-brand-navy">Create an account</h1>
        <p className="text-gray-500 mb-8">
          Set up your organiser account to create and manage sweepstakes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="displayName" className="block text-sm font-semibold mb-2 text-[#0A1628]">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:border-[#1A56DB] focus:ring-0 focus:outline-none transition-colors"
              placeholder="e.g. Jane from Marketing"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2 text-[#0A1628]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:border-[#1A56DB] focus:ring-0 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2 text-[#0A1628]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:border-[#1A56DB] focus:ring-0 focus:outline-none transition-colors"
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
            className="w-full bg-[#65FF47] text-[#0A1628] py-4 rounded-full text-base font-bold hover:bg-[#4CD930] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500 text-center">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#1A56DB] font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
