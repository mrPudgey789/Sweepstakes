'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Sweepstake {
  id: string
  name: string
  mode: string
  status: string
  entry_amount: number
  currency: string
  join_code: string
  share_slug: string
  created_at: string
  max_players: number | null
}

export default function DashboardPage() {
  const [sweepstakes, setSweepstakes] = useState<Sweepstake[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: organiser } = await supabase
        .from('organisers')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (!organiser) {
        router.push('/auth/signup')
        return
      }

      const { data } = await supabase
        .from('sweepstakes')
        .select('*')
        .eq('organiser_id', organiser.id)
        .order('created_at', { ascending: false })

      setSweepstakes(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your sweepstakes</h1>
        <Link
          href="/create"
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800"
        >
          Create new
        </Link>
      </div>

      {sweepstakes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">You have not created any sweepstakes yet.</p>
          <Link
            href="/create"
            className="text-green-700 hover:underline font-medium"
          >
            Create your first sweepstake
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {sweepstakes.map((s) => (
            <Link
              key={s.id}
              href={`/sweepstake/${s.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{s.name}</h2>
                  <p className="text-sm text-gray-500">
                    {s.mode === 'random' ? 'Random draw' : 'Pick your own'} &middot;{' '}
                    {formatCurrency(s.entry_amount, s.currency)} entry
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  s.status === 'open' ? 'bg-green-100 text-green-800' :
                  s.status === 'drawn' ? 'bg-blue-100 text-blue-800' :
                  s.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {s.status}
                </span>
              </div>
              {s.status !== 'draft' && (
                <p className="text-xs text-gray-400 mt-2">
                  Code: {s.join_code}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
