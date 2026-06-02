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
    <div className="max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-2">Join a sweepstake</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Enter the code your organiser gave you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. WC7K9P"
          maxLength={8}
          className="w-full border border-gray-300 rounded-md px-4 py-3 text-center text-2xl tracking-widest font-mono uppercase"
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? 'Looking up...' : 'Find sweepstake'}
        </button>
      </form>
    </div>
  )
}
