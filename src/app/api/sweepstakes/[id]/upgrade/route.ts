import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { PRICING_BANDS, type PricingBand } from '@/lib/pricing'

const BAND_ORDER: PricingBand[] = ['free', '6_15', '16_32', '33_48']

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sweepstakeId = params.id

    // Authenticate the requesting user
    const serverClient = createServerSupabaseClient()
    const { data: { user }, error: authError } = await serverClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const body = await request.json()
    const { new_band } = body as { new_band: string }

    if (!new_band || !(new_band in PRICING_BANDS)) {
      return NextResponse.json({ error: 'Invalid band.' }, { status: 400 })
    }

    const newBand = new_band as PricingBand
    const newBandConfig = PRICING_BANDS[newBand]

    const admin = createAdminClient()

    // Fetch the sweepstake and verify ownership via organiser auth_id
    const { data: sweepstake, error: fetchError } = await admin
      .from('sweepstakes')
      .select('id, organiser_id, max_players, status, organisers!inner(auth_id)')
      .eq('id', sweepstakeId)
      .single()

    if (fetchError || !sweepstake) {
      return NextResponse.json({ error: 'Sweepstake not found.' }, { status: 404 })
    }

    const organiser = (sweepstake as Record<string, unknown>).organisers as { auth_id: string }
    if (organiser.auth_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    if (sweepstake.status === 'closed' || sweepstake.status === 'drawn') {
      return NextResponse.json({ error: 'Cannot upgrade a closed or drawn sweepstake.' }, { status: 400 })
    }

    // Determine the current band from max_players
    const currentBand = (Object.entries(PRICING_BANDS) as [PricingBand, typeof PRICING_BANDS[PricingBand]][])
      .find(([, cfg]) => cfg.max === sweepstake.max_players)?.[0] ?? 'free'

    const currentBandIndex = BAND_ORDER.indexOf(currentBand)
    const newBandIndex = BAND_ORDER.indexOf(newBand)

    if (newBandIndex <= currentBandIndex) {
      return NextResponse.json(
        { error: `New band must be higher than the current band (${currentBand}).` },
        { status: 400 }
      )
    }

    const currentBandConfig = PRICING_BANDS[currentBand]

    // Price difference: if upgrading from free, charge the full new-tier price
    const currentPaid = currentBand === 'free' ? 0 : currentBandConfig.amount
    const priceDifference = newBandConfig.amount - currentPaid

    if (priceDifference <= 0) {
      // Shouldn't happen given the band ordering, but be safe
      return NextResponse.json({ error: 'No payment required for this upgrade.' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Sweepstake upgrade (${newBandConfig.label})`,
              description: `Upgrade to ${newBandConfig.label} — ${newBandConfig.tagline}`,
            },
            unit_amount: priceDifference,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/sweepstake/${sweepstakeId}?upgraded=true`,
      cancel_url: `${appUrl}/sweepstake/${sweepstakeId}/upgrade?cancelled=true`,
      metadata: {
        type: 'upgrade',
        sweepstake_id: sweepstakeId,
        organiser_id: user.id,
        new_band: newBand,
      },
    })

    return NextResponse.json({ checkout_url: session.url })
  } catch (err) {
    console.error('Upgrade sweepstake error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
