import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import { JoinFlow } from '@/components/join-flow'
import { notFound } from 'next/navigation'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data: sweepstake } = await supabase
    .from('sweepstakes')
    .select('name, entry_amount, currency, mode')
    .eq('share_slug', params.slug)
    .single()

  if (!sweepstake) {
    return { title: 'Sweepstake not found' }
  }

  const description = `World Cup sweepstake. ${sweepstake.mode === 'random' ? 'Random draw' : 'Pick your own team'}. Tap to join and get your team.`

  return {
    title: `Join ${sweepstake.name}`,
    description,
    openGraph: {
      title: `Join ${sweepstake.name}`,
      description,
      type: 'website',
    },
  }
}

export default async function JoinPage({ params }: Props) {
  const supabase = createServerSupabaseClient()

  const { data: sweepstake } = await supabase
    .from('sweepstakes')
    .select(`
      id,
      name,
      mode,
      entry_amount,
      currency,
      winner_structure,
      paypal_link,
      status,
      max_players,
      organiser_id,
      organisers!inner(display_name, email)
    `)
    .eq('share_slug', params.slug)
    .single()

  if (!sweepstake) notFound()

  // Count current entries
  const { count } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('sweepstake_id', sweepstake.id)

  const isFull = sweepstake.max_players ? (count || 0) >= sweepstake.max_players : false
  const isClosed = sweepstake.status === 'closed' || sweepstake.status === 'drawn'

  if (isClosed) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h1 className="text-xl font-bold mb-2">This sweepstake is closed</h1>
        <p className="text-gray-600">
          {sweepstake.status === 'drawn'
            ? 'The draw has already happened, so joining is closed.'
            : 'This sweepstake is no longer accepting new players.'}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          If you think this is a mistake, ask the organiser.
        </p>
      </div>
    )
  }

  if (isFull) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h1 className="text-xl font-bold mb-2">This sweepstake is full</h1>
        <p className="text-gray-600">
          All places have been taken. The organiser can upgrade to add more.
        </p>
      </div>
    )
  }

  const organiserName = (sweepstake as Record<string, unknown>).organisers
    ? ((sweepstake as Record<string, unknown>).organisers as { display_name: string | null; email: string }).display_name ||
      ((sweepstake as Record<string, unknown>).organisers as { display_name: string | null; email: string }).email
    : 'the organiser'

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Join {sweepstake.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Organised by {organiserName} &middot;{' '}
        {sweepstake.mode === 'random' ? 'Random draw' : 'Pick your own'} &middot;{' '}
        {sweepstake.winner_structure === 'single' ? 'Single winner' : '1st, 2nd, 3rd'}
      </p>

      <JoinFlow
        sweepstakeId={sweepstake.id}
        sweepstakeName={sweepstake.name}
        mode={sweepstake.mode}
        entryAmount={sweepstake.entry_amount}
        currency={sweepstake.currency}
        paypalLink={sweepstake.paypal_link}
      />
    </div>
  )
}
