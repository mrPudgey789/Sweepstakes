import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authClient = createServerSupabaseClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Verify the user owns this sweepstake
    const { data: sweepstake } = await supabase
      .from('sweepstakes')
      .select('id, organiser_id, organisers!inner(auth_id, display_name, email)')
      .eq('id', params.id)
      .single()

    if (!sweepstake) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const organiser = (sweepstake as Record<string, unknown>).organisers as { auth_id: string; display_name: string | null; email: string }
    if (organiser.auth_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }
    const organiserName = organiser.display_name || organiser.email

    // Fetch entries with player and team data (admin bypasses RLS)
    const { data: entries } = await supabase
      .from('entries')
      .select('id, payment_state, created_at, team_id, players(email, display_name), teams(name, code, status)')
      .eq('sweepstake_id', params.id)
      .order('created_at')

    return NextResponse.json({ entries: entries || [], organiser_name: organiserName })
  } catch (err) {
    console.error('Entries fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
