import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { PRICING_BANDS, type PricingBand } from '@/lib/pricing'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const sweepstakeId = session.metadata?.sweepstake_id
    const organiserId = session.metadata?.organiser_id
    const type = session.metadata?.type

    if (sweepstakeId && organiserId) {
      const supabase = createAdminClient()

      if (type === 'upgrade') {
        // Upgrade flow: update max_players to the new band's max
        const newBand = session.metadata?.new_band as PricingBand | undefined
        if (newBand && newBand in PRICING_BANDS) {
          const newMax = PRICING_BANDS[newBand].max
          await supabase
            .from('sweepstakes')
            .update({ max_players: newMax })
            .eq('id', sweepstakeId)
        }
      } else {
        // Original creation flow: update payment record and open sweepstake
        await supabase
          .from('payments')
          .update({
            stripe_payment_intent_id: session.payment_intent as string,
            status: 'succeeded',
            paid_at: new Date().toISOString(),
          })
          .eq('sweepstake_id', sweepstakeId)

        await supabase
          .from('sweepstakes')
          .update({ status: 'open' })
          .eq('id', sweepstakeId)
          .eq('status', 'draft')
      }
    }
  }

  return NextResponse.json({ received: true })
}
