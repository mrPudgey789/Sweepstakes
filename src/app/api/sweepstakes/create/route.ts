import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, PRICING_BANDS, type PricingBand } from '@/lib/stripe'
import { generateJoinCode, generateShareSlug } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      mode,
      entry_amount,
      currency,
      winner_structure,
      paypal_link,
      band,
      organiser_id,
    } = body

    if (!name || !mode || !entry_amount || !paypal_link || !band || !organiser_id) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const bandConfig = PRICING_BANDS[band as PricingBand]
    if (!bandConfig) {
      return NextResponse.json({ error: 'Invalid pricing band.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate unique join code and share slug
    const joinCode = generateJoinCode()
    const shareSlug = generateShareSlug()

    // Create the sweepstake in draft status
    const { data: sweepstake, error: insertError } = await supabase
      .from('sweepstakes')
      .insert({
        organiser_id: organiser_id,
        tournament_id: '00000000-0000-0000-0000-000000002026',
        name,
        mode,
        entry_amount: parseFloat(entry_amount),
        currency: currency || 'GBP',
        winner_structure: winner_structure || 'single',
        paypal_link,
        join_code: joinCode,
        share_slug: shareSlug,
        status: 'draft',
        max_players: bandConfig.max,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Sweepstake insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create sweepstake.' }, { status: 500 })
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        sweepstake_id: sweepstake.id,
        organiser_id,
        band: band as PricingBand,
        amount: bandConfig.amount / 100,
        currency: 'GBP',
        status: 'pending',
      })

    if (paymentError) {
      console.error('Payment insert error:', paymentError)
    }

    // Create Stripe Checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Sweepstake software fee (${bandConfig.label})`,
              description: `Software fee for "${name}" - this is NOT the entry pot`,
            },
            unit_amount: bandConfig.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/create/success?sweepstake_id=${sweepstake.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/create?cancelled=true`,
      metadata: {
        sweepstake_id: sweepstake.id,
        organiser_id,
        band,
      },
    })

    return NextResponse.json({
      sweepstake_id: sweepstake.id,
      checkout_url: session.url,
    })
  } catch (err) {
    console.error('Create sweepstake error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
