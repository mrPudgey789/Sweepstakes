'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function JoinByCodePage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const normalised = code.trim().toUpperCase()
    if (normalised.length < 4) {
      setError('Please enter a valid join code.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('sweepstakes')
      .select('share_slug')
      .eq('join_code', normalised)
      .single()

    if (!data) {
      setError('No sweepstake found with that code. Check the code and try again.')
      setLoading(false)
      return
    }

    router.push(`/j/${data.share_slug}`)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="heading text-4xl md:text-5xl text-brand-navy mb-3">
          Join a sweepstake
        </h1>
        <p className="text-gray-500 mb-8">
          Enter the code your organiser gave you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. WC7K9P"
            maxLength={8}
            autoFocus
            className="w-full border-2 border-gray-200 rounded-2xl px-6 py-5 text-center text-3xl tracking-[0.3em] font-mono uppercase focus:border-brand-blue focus:ring-0 focus:outline-none transition-colors"
          />

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full btn-primary !py-4 !text-lg"
          >
            {loading ? 'Looking up...' : 'Find sweepstake'}
          </button>
        </form>
      </div>
    </div>
  )
}
