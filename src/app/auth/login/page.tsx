'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto pt-8">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="heading text-3xl md:text-4xl mb-2 text-brand-navy">Welcome back</h1>
        <p className="text-gray-500 mb-8">Log in to manage your sweepstakes.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-sm text-brand-blue font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#65FF47] text-[#0A1628] py-4 rounded-full text-base font-bold hover:bg-[#4CD930] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500 text-center">
          No account yet?{' '}
          <Link href="/auth/signup" className="text-[#1A56DB] font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
