import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Save pending wizard/join state (called before email verification redirect)
export async function POST(request: Request) {
  const { email, type, state } = await request.json()
  if (!email || !type || !state) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  await supabase.from('pending_state').upsert({
    email: email.toLowerCase(),
    type,
    state,
    created_at: new Date().toISOString(),
  }, { onConflict: 'email' })

  return NextResponse.json({ saved: true })
}

// Retrieve and delete pending state (called after verification)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('pending_state')
    .select('type, state')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ found: false })
  }

  // Delete after reading (one-time use)
  await supabase.from('pending_state').delete().eq('email', email.toLowerCase())

  return NextResponse.json({ found: true, type: data.type, state: data.state })
}
