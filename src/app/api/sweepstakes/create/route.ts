import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { PRICING_BANDS, type PricingBand } from '@/lib/pricing'
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
      organiser_plays,
      organiser_name,
      organiser_email,
    } = body

    if (!name || !mode || entry_amount === undefined || !paypal_link || !band || !organiser_id) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const bandConfig = PRICING_BANDS[band as PricingBand]
    if (!bandConfig) {
      return NextResponse.json({ error: 'Invalid pricing band.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const isFree = bandConfig.amount === 0

    const joinCode = generateJoinCode()
    const shareSlug = generateShareSlug()

    // Free tier goes straight to open; paid starts as draft
    const { data: sweepstake, error: insertError } = await supabase
      .from('sweepstakes')
      .insert({
        organiser_id: organiser_id,
        tournament_id: (await supabase.from('tournaments').select('id').eq('name', 'FIFA World Cup 2026').single()).data?.id,
        name,
        mode,
        entry_amount: parseFloat(entry_amount),
        currency: currency || 'GBP',
        winner_structure: winner_structure || 'single',
        paypal_link,
        join_code: joinCode,
        share_slug: shareSlug,
        status: isFree ? 'open' : 'draft',
        max_players: bandConfig.max,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Sweepstake insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create sweepstake.' }, { status: 500 })
    }

    // Create payment record
    await supabase
      .from('payments')
      .insert({
        sweepstake_id: sweepstake.id,
        organiser_id,
        band: band as PricingBand,
        amount: bandConfig.amount / 100,
        currency: 'GBP',
        status: isFree ? 'succeeded' : 'pending',
        paid_at: isFree ? new Date().toISOString() : null,
      })

    // Add organiser as player 1 if they opted in
    if (organiser_plays && organiser_email) {
      // Find or create the player record
      let { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('email', organiser_email)
        .single()

      if (!player) {
        const { data: newPlayer } = await supabase
          .from('players')
          .insert({ email: organiser_email, display_name: organiser_name || null })
          .select('id')
          .single()
        player = newPlayer
      }

      if (player) {
        await supabase
          .from('entries')
          .insert({
            sweepstake_id: sweepstake.id,
            player_id: player.id,
            tc_accepted_at: new Date().toISOString(),
            payment_state: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
      }
    }

    // Free tier: no Stripe, return immediately
    if (isFree) {
      return NextResponse.json({
        sweepstake_id: sweepstake.id,
        checkout_url: null,
      })
    }

    // Paid tier: create Stripe Checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Sweepstake software fee (${bandConfig.label})`,
              description: `Software fee for "${name}"`,
            },
            unit_amount: bandConfig.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/sweepstake/${sweepstake.id}?paid=1`,
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
