import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { entry_id } = await request.json()

  if (!entry_id) {
    return NextResponse.json({ error: 'Missing entry_id' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Verify the entry belongs to this user
  const { data: entry } = await admin
    .from('entries')
    .select('id, team_id, players!inner(email)')
    .eq('id', entry_id)
    .single()

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const playerEmail = (entry.players as unknown as { email: string }).email
  if (playerEmail.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'Not your entry' }, { status: 403 })
  }

  // Only allow leaving if no team assigned (draw hasn't happened)
  if (entry.team_id) {
    return NextResponse.json({ error: 'Cannot leave after teams have been assigned' }, { status: 400 })
  }

  // Delete the entry
  await admin.from('entries').delete().eq('id', entry_id)

  return NextResponse.json({ success: true })
}
