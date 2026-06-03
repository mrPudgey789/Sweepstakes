import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { materialiseStandings } from '@/lib/standings'

// Recompute standings for all open/drawn sweepstakes.
// Call after poll-results or after a manual override.

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
