'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'jimmyjopeel@gmail.com'

interface Stats {
  totalSweepstakes: number
  totalPlayers: number
  totalEntries: number
  totalOrganisers: number
  sweepstakesByStatus: Record<string, number>
  recentSweepstakes: { id: string; name: string; status: string; created_at: string; player_count: number; max_players: number | null; paid_amount: number; organiser_email: string }[]
  recentPlayers: { id: string; email: string; display_name: string | null; created_at: string }[]
  notifications: { queued: number; sent: number; failed: number }
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorised, setAuthorised] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/dashboard')
        return
      }
      setAuthorised(true)

      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        setStats(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [router])

  if (!authorised || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-brand-green animate-spin" />
      </div>
    )
  }

  if (!stats) return <p className="p-8 text-brand-navy/50">Failed to load stats.</p>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="heading text-3xl text-brand-navy">Admin Dashboard</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Sweepstakes', value: stats.totalSweepstakes },
          { label: 'Players', value: stats.totalPlayers },
          { label: 'Entries', value: stats.totalEntries },
          { label: 'Organisers', value: stats.totalOrganisers },
        ].map(c => (
          <div key={c.label} className="bg-white border-2 border-brand-navy/10 rounded-2xl p-5 text-center">
            <p className="heading text-3xl text-brand-navy">{c.value}</p>
            <p className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Sweepstakes by status */}
      <div className="bg-white border-2 border-brand-navy/10 rounded-2xl p-5">
        <h2 className="heading text-xl text-brand-navy mb-3">Sweepstakes by status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.sweepstakesByStatus).map(([status, count]) => (
            <div key={status} className="bg-gray-50 rounded-xl px-4 py-2">
              <span className="text-sm font-bold text-brand-navy">{count}</span>
              <span className="text-xs text-brand-navy/40 ml-2 uppercase">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification queue */}
      <div className="bg-white border-2 border-brand-navy/10 rounded-2xl p-5">
        <h2 className="heading text-xl text-brand-navy mb-3">Notifications</h2>
        <div className="flex flex-wrap gap-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
            <span className="text-sm font-bold text-yellow-700">{stats.notifications.queued}</span>
            <span className="text-xs text-yellow-600 ml-2">Queued</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <span className="text-sm font-bold text-green-700">{stats.notifications.sent}</span>
            <span className="text-xs text-green-600 ml-2">Sent</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <span className="text-sm font-bold text-red-700">{stats.notifications.failed}</span>
            <span className="text-xs text-red-600 ml-2">Failed</span>
          </div>
        </div>
      </div>

      {/* Recent sweepstakes */}
      <div className="bg-white border-2 border-brand-navy/10 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="heading text-xl text-brand-navy">Recent sweepstakes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {stats.recentSweepstakes.map(s => {
            const tier = !s.max_players || s.max_players <= 5 ? 'Free (1-5)'
              : s.max_players <= 15 ? '£5 (6-15)'
              : s.max_players <= 32 ? '£10 (16-32)'
              : '£20 (33-48)'
            return (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand-navy truncate">{s.name}</p>
                  <p className="text-xs text-brand-navy/40">{s.organiser_email} · {new Date(s.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold text-brand-navy/30">{tier}</span>
                  <span className="text-xs font-bold text-brand-navy/50">{s.player_count}/{s.max_players || 5}</span>
                  {s.paid_amount > 0 && (
                    <span className="text-[10px] font-bold text-brand-green">£{(s.paid_amount / 100).toFixed(0)} paid</span>
                  )}
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full ${
                    s.status === 'open' ? 'bg-brand-green/20 text-[#1a7a00]' :
                    s.status === 'drawn' ? 'bg-brand-blue/10 text-brand-blue' :
                    s.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{s.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent players */}
      <div className="bg-white border-2 border-brand-navy/10 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="heading text-xl text-brand-navy">Recent players</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {stats.recentPlayers.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-brand-navy">{p.display_name || 'No name'}</p>
                <p className="text-xs text-brand-navy/40">{p.email}</p>
              </div>
              <span className="text-xs text-brand-navy/30">{new Date(p.created_at).toLocaleDateString('en-GB')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
