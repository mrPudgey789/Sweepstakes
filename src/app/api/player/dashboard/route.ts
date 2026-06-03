import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json([])
  }

  const admin = createAdminClient()

  // Fetch organiser and player records in parallel
  const [{ data: organiser }, { data: player }] = await Promise.all([
    admin.from('organisers').select('id').eq('auth_id', user.id).maybeSingle(),
    admin.from('players').select('id').eq('email', user.email!).maybeSingle(),
  ])

  // Fetch organised sweepstakes and player entries in parallel
  const [organisedResult, entriesResult] = await Promise.all([
    organiser
      ? admin.from('sweepstakes').select('*').eq('organiser_id', organiser.id).order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
    player
      ? admin.from('entries').select('sweepstakes(*)').eq('player_id', player.id)
      : Promise.resolve({ data: null }),
  ])

  const all: Record<string, unknown>[] = []
  const seenIds = new Set<string>()

  for (const s of organisedResult.data || []) {
    seenIds.add(s.id)
    all.push({ ...s, role: 'organiser' })
  }

  for (const e of entriesResult.data || []) {
    const s = e.sweepstakes as unknown as Record<string, unknown> | null
    if (s && !seenIds.has(s.id as string)) {
      seenIds.add(s.id as string)
      all.push({ ...s, role: 'player' })
    }
  }

  return NextResponse.json(all)
}
