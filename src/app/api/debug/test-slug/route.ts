import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Returns a valid share_slug for testing. Only works in development.
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // Get an open sweepstake's slug
  const { data: open } = await supabase
    .from('sweepstakes')
    .select('share_slug, name, status')
    .eq('status', 'open')
    .limit(1)
    .maybeSingle()

  // Also get a drawn one for closed tests
  const { data: drawn } = await supabase
    .from('sweepstakes')
    .select('share_slug, name, status')
    .eq('status', 'drawn')
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    open_slug: open?.share_slug || null,
    open_name: open?.name || null,
    drawn_slug: drawn?.share_slug || null,
    drawn_name: drawn?.name || null,
  })
}
