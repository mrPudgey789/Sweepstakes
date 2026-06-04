import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { materialiseAllStandings } from '@/lib/standings'
import { verifyCronAuth } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const result = await materialiseAllStandings(supabase)

    return NextResponse.json({
      message: `Recomputed standings for ${result.sweepstakes} sweepstakes. ${result.rows} rows.`,
    })
  } catch (err) {
    console.error('Recompute standings error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
