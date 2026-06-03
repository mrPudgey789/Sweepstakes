import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sweepstakeId = searchParams.get('sweepstake_id')

  if (!sweepstakeId) {
    return NextResponse.json([])
  }

  const admin = createAdminClient()

  const { data: entries } = await admin
    .from('entries')
    .select('id, players(display_name), teams(name, code, status)')
    .eq('sweepstake_id', sweepstakeId)
    .order('created_at', { ascending: true })

  if (!entries) return NextResponse.json([])

  const players = entries.map((e: Record<string, unknown>) => ({
    id: e.id,
    display_name: (e.players as { display_name: string | null } | null)?.display_name || 'Anonymous',
    team_name: (e.teams as { name: string; code: string; status: string } | null)?.name || null,
    team_code: (e.teams as { name: string; code: string; status: string } | null)?.code || null,
    team_status: (e.teams as { name: string; code: string; status: string } | null)?.status || null,
  }))

  return NextResponse.json(players)
}
