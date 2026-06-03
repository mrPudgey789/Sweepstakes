import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json([], { status: 200 })
  }

  const admin = createAdminClient()

  // Find player by email (more reliable than auth_id which may not be linked)
  const { data: player } = await admin
    .from('players')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle()

  if (!player) {
    return NextResponse.json([])
  }

  const { data: entries } = await admin
    .from('entries')
    .select('sweepstakes(*)')
    .eq('player_id', player.id)

  if (!entries) {
    return NextResponse.json([])
  }

  const sweepstakes = entries
    .map(e => e.sweepstakes)
    .filter(Boolean)

  return NextResponse.json(sweepstakes)
}
