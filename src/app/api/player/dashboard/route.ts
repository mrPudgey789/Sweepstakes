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
  const all: Record<string, unknown>[] = []
  const seenIds = new Set<string>()

  // Sweepstakes user organises
  const { data: organiser } = await admin
    .from('organisers')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (organiser) {
    const { data: organised } = await admin
      .from('sweepstakes')
      .select('*')
      .eq('organiser_id', organiser.id)
      .order('created_at', { ascending: false })

    if (organised) {
      for (const s of organised) {
        seenIds.add(s.id)
        all.push({ ...s, role: 'organiser' })
      }
    }
  }

  // Sweepstakes user joined as player (match by email)
  const { data: player } = await admin
    .from('players')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle()

  if (player) {
    const { data: entries } = await admin
      .from('entries')
      .select('sweepstakes(*)')
      .eq('player_id', player.id)

    if (entries) {
      for (const e of entries) {
        const s = e.sweepstakes as unknown as Record<string, unknown> | null
        if (s && !seenIds.has(s.id as string)) {
          seenIds.add(s.id as string)
          all.push({ ...s, role: 'player' })
        }
      }
    }
  }

  return NextResponse.json(all)
}
