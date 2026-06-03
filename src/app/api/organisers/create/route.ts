import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { email, auth_id, display_name } = await request.json()

    if (!email || !auth_id) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if organiser already exists
    const { data: existing } = await supabase
      .from('organisers')
      .select('id')
      .eq('auth_id', auth_id)
      .single()

    if (existing) {
      return NextResponse.json({ id: existing.id })
    }

    const { data, error } = await supabase
      .from('organisers')
      .insert({ email, auth_id, display_name: display_name || null })
      .select('id')
      .single()

    if (error) {
      console.error('Organiser create error:', error)
      return NextResponse.json({ error: 'Failed to create organiser.' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('Organiser create error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
