import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeSweepstakeStandings } from '@/lib/standings'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sweepstakeId = searchParams.get('sweepstake_id')

  if (!sweepstakeId) {
    return NextResponse.json({ error: 'Missing sweepstake_id' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const standings = await computeSweepstakeStandings(supabase, sweepstakeId)

  return NextResponse.json(standings)
}
