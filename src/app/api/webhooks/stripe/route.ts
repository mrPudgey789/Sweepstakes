import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
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

    if (sweepstakeId && organiserId) {
      const supabase = createAdminClient()

      // Update payment record
      await supabase
        .from('payments')
        .update({
          stripe_payment_intent_id: session.payment_intent as string,
          status: 'succeeded',
          paid_at: new Date().toISOString(),
        })
        .eq('sweepstake_id', sweepstakeId)

      // Move sweepstake from draft to open
      await supabase
        .from('sweepstakes')
        .update({ status: 'open' })
        .eq('id', sweepstakeId)
        .eq('status', 'draft')
    }
  }

  return NextResponse.json({ received: true })
}
