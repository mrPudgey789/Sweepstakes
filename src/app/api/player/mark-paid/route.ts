import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { entry_id } = await request.json()

  if (!entry_id) {
    return NextResponse.json({ error: 'Missing entry_id' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('entries')
    .update({
      payment_state: 'marked_paid',
      marked_paid_at: new Date().toISOString(),
    })
    .eq('id', entry_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
