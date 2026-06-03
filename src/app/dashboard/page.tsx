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
  role: 'organiser' | 'player'
}

export default function DashboardPage() {
  const [sweepstakes, setSweepstakes] = useState<Sweepstake[]>([])
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('hidden_sweepstakes')
    if (stored) setHiddenIds(new Set(JSON.parse(stored)))
  }, [])

  function hideSweepstake(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = new Set(hiddenIds)
    next.add(id)
    setHiddenIds(next)
    localStorage.setItem('hidden_sweepstakes', JSON.stringify(Array.from(next)))
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch all sweepstakes via API (bypasses RLS issues)
      const res = await fetch('/api/player/dashboard')
      if (res.ok) {
        const all = await res.json()
        setSweepstakes(all)
      }
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-brand-green animate-spin" />
      </div>
    )
  }

  const statusStyles: Record<string, string> = {
    open: 'bg-brand-green/20 text-[#1a7a00] border border-brand-green',
    drawn: 'bg-brand-ice/30 text-brand-blue border border-brand-ice',
    closed: 'bg-gray-100 text-gray-500 border border-gray-200',
    draft: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
      <h1 className="heading text-4xl md:text-5xl text-brand-navy mb-8">Your sweepstakes</h1>

      {sweepstakes.filter(s => !hiddenIds.has(s.id)).length === 0 ? (
        <div className="border-2 border-dashed border-brand-navy/20 rounded-3xl p-10 text-center">
          <svg className="w-12 h-12 text-brand-navy/20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          <p className="text-brand-navy/40 font-bold text-lg mb-1">No sweepstakes yet</p>
          <p className="text-brand-navy/30 text-sm mb-5">Create your first one and invite your mates.</p>
          <Link href="/create" className="btn-primary">Create a sweepstake</Link>
        </div>
      ) : (
      <div className="space-y-4">
        {sweepstakes.filter(s => !hiddenIds.has(s.id)).map((s) => (
          <Link
            key={s.id}
            href={s.role === 'organiser' ? `/sweepstake/${s.id}` : `/sweepstake/${s.id}/player`}
            className="block bg-white border-2 border-brand-navy/10 rounded-2xl p-5 hover:border-brand-blue hover:shadow-md transition-all"
          >
            <div className="space-y-2">
              <h2 className="font-extrabold text-lg text-brand-navy">{s.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${s.role === 'organiser' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/30' : 'bg-brand-green/10 text-[#1a7a00] border border-brand-green/30'}`}>
                  {s.role === 'organiser' ? 'Organiser' : 'Player'}
                </span>
                <span className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${statusStyles[s.status] || statusStyles.draft}`}>
                  {s.status}
                </span>
                <span className="text-xs text-brand-navy/40 font-medium">
                  {s.mode === 'random' ? 'Random draw' : 'Pick your own'} &middot; {formatCurrency(s.entry_amount, s.currency)} entry
                </span>
              </div>
            </div>
            {s.status === 'open' && s.join_code && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-navy/5">
                <span className="text-xs text-brand-navy/30 font-semibold uppercase tracking-wider">Code:</span>
                <span className="font-mono font-bold text-sm text-brand-navy">{s.join_code}</span>
              </div>
            )}
            {s.status === 'closed' && (
              <div className="mt-3 pt-3 border-t border-brand-navy/5">
                <button
                  onClick={(e) => hideSweepstake(s.id, e)}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove from list
                </button>
              </div>
            )}
          </Link>
        ))}
      </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 px-4 py-4 z-40">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Link href="/join" className="flex-1 btn-secondary !px-4 !py-3.5 text-center">
            Join
          </Link>
          <Link href="/create" className="flex-1 btn-primary !px-4 !py-3.5 text-center">
            Create
          </Link>
        </div>
      </div>
    </div>
  )
}
