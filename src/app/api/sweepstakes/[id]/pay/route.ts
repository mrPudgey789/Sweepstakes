import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { PRICING_BANDS, type PricingBand } from '@/lib/pricing'

export async function POST(
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

    const { data: sweepstake } = await supabase
      .from('sweepstakes')
      .select('id, name, status, max_players, organisers!inner(auth_id)')
      .eq('id', params.id)
      .single()

    if (!sweepstake) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const organiser = (sweepstake as Record<string, unknown>).organisers as { auth_id: string }
    if (organiser.auth_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (sweepstake.status !== 'draft') {
      return NextResponse.json({ error: 'Sweepstake is already live.' }, { status: 400 })
    }

    // Find the band from max_players
    const band = (Object.entries(PRICING_BANDS) as [PricingBand, typeof PRICING_BANDS[PricingBand]][])
      .find(([, cfg]) => cfg.max === sweepstake.max_players)

    if (!band) {
      return NextResponse.json({ error: 'Could not determine pricing band.' }, { status: 500 })
    }

    const [bandKey, bandConfig] = band

    if (bandConfig.amount === 0) {
      // Free tier - just open it
      await supabase
        .from('sweepstakes')
        .update({ status: 'open' })
        .eq('id', params.id)

      return NextResponse.json({ checkout_url: null, sweepstake_id: params.id })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Sweepstake software fee (${bandConfig.label})`,
              description: `Software fee for "${sweepstake.name}"`,
            },
            unit_amount: bandConfig.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/create/success?sweepstake_id=${params.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/sweepstake/${params.id}`,
      metadata: {
        sweepstake_id: params.id,
        organiser_id: user.id,
        band: bandKey,
      },
    })

    return NextResponse.json({ checkout_url: session.url })
  } catch (err) {
    console.error('Pay for draft error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
