import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: Request, { params }: { params: any }) {
  const { id } = params instanceof Promise ? await params : params
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

  // Verify the caller is the organiser of this sweepstake
  const { data: sweep } = await admin
    .from('sweepstakes')
    .select('id, status, organisers!inner(auth_id)')
    .eq('id', id)
    .single()

  if (!sweep) {
    return NextResponse.json({ error: 'Sweepstake not found' }, { status: 404 })
  }

  const organiserAuthId = (sweep.organisers as unknown as { auth_id: string }).auth_id
  if (organiserAuthId !== user.id) {
    return NextResponse.json({ error: 'Not the organiser' }, { status: 403 })
  }

  if (sweep.status === 'drawn' || sweep.status === 'closed') {
    return NextResponse.json({ error: 'Cannot remove players after draw' }, { status: 400 })
  }

  // Verify entry belongs to this sweepstake
  const { data: entry } = await admin
    .from('entries')
    .select('id, sweepstake_id')
    .eq('id', entry_id)
    .eq('sweepstake_id', id)
    .single()

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found in this sweepstake' }, { status: 404 })
  }

  // Get player_id before deleting
  const { data: entryWithPlayer } = await admin
    .from('entries')
    .select('id, player_id')
    .eq('id', entry_id)
    .single()

  // Delete notifications referencing this entry first (FK constraint)
  await admin.from('notifications').delete().eq('entry_id', entry_id)

  // Delete the entry
  const { error: deleteError } = await admin
    .from('entries')
    .delete()
    .eq('id', entry_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Clean up the player record
  if (entryWithPlayer?.player_id) {
    await admin.from('players').delete().eq('id', entryWithPlayer.player_id)
  }

  return NextResponse.json({ success: true })
}
