import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { materialiseStandings } from '@/lib/standings'
import { verifyCronAuth } from '@/lib/cron-auth'

// Recompute standings for all open/drawn sweepstakes.
// Call after poll-results or after a manual override.

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const { data: sweepstakes } = await supabase
      .from('sweepstakes')
      .select('id')
      .in('status', ['open', 'drawn'])

    if (!sweepstakes || sweepstakes.length === 0) {
      return NextResponse.json({ message: 'No active sweepstakes.' })
    }

    let totalUpdated = 0

    for (const sw of sweepstakes) {
      const count = await materialiseStandings(supabase, sw.id)
      totalUpdated += count
    }

    return NextResponse.json({
      message: `Recomputed standings for ${sweepstakes.length} sweepstakes. ${totalUpdated} rows updated.`,
    })
  } catch (err) {
    console.error('Recompute standings error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
