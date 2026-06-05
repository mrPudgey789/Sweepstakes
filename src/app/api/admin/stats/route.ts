import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'jimmyjopeel@gmail.com'

export async function GET() {
  // Auth check: only the admin user
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Run all counts in parallel
  const [
    sweepstakesResult,
    playersResult,
    entriesResult,
    organisersResult,
    notifQueuedResult,
    notifSentResult,
    notifFailedResult,
  ] = await Promise.all([
    admin.from('sweepstakes').select('*', { count: 'exact', head: true }),
    admin.from('players').select('*', { count: 'exact', head: true }),
    admin.from('entries').select('*', { count: 'exact', head: true }),
    admin.from('organisers').select('*', { count: 'exact', head: true }),
    admin.from('notifications').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
    admin.from('notifications').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    admin.from('notifications').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
  ])

  // Sweepstakes by status
  const { data: allSweeps } = await admin.from('sweepstakes').select('status')
  const sweepstakesByStatus: Record<string, number> = {}
  for (const s of allSweeps || []) {
    sweepstakesByStatus[s.status] = (sweepstakesByStatus[s.status] || 0) + 1
  }

  // Recent sweepstakes with player count and organiser
  const { data: recentSweeps } = await admin
    .from('sweepstakes')
    .select('id, name, status, created_at, max_players, organiser_id, organisers(email), payments(status, amount)')
    .order('created_at', { ascending: false })
    .limit(20)

  const recentSweepstakes = []
  for (const s of recentSweeps || []) {
    const { count } = await admin.from('entries').select('*', { count: 'exact', head: true }).eq('sweepstake_id', s.id)
    const org = (s as Record<string, unknown>).organisers as { email: string } | null
    const payments = (s as Record<string, unknown>).payments as { status: string; amount: number }[] | null
    const paid = payments && payments.length > 0 ? payments[0] : null
    recentSweepstakes.push({
      id: s.id,
      name: s.name,
      status: s.status,
      created_at: s.created_at,
      player_count: count || 0,
      max_players: (s as Record<string, unknown>).max_players as number | null,
      paid_amount: paid?.status === 'succeeded' ? paid.amount : 0,
      organiser_email: org?.email || 'unknown',
    })
  }

  // Recent players
  const { data: recentPlayers } = await admin
    .from('players')
    .select('id, email, display_name, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({
    totalSweepstakes: sweepstakesResult.count || 0,
    totalPlayers: playersResult.count || 0,
    totalEntries: entriesResult.count || 0,
    totalOrganisers: organisersResult.count || 0,
    sweepstakesByStatus,
    notifications: {
      queued: notifQueuedResult.count || 0,
      sent: notifSentResult.count || 0,
      failed: notifFailedResult.count || 0,
    },
    recentSweepstakes,
    recentPlayers: recentPlayers || [],
  })
}
