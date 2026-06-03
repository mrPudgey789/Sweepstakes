import { createAdminClient } from '@/lib/supabase/admin'
import { Metadata } from 'next'
import { JoinFlow } from '@/components/join-flow'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()

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
      organisers!inner(display_name)
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
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 border-2 border-brand-blue/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-brand-blue/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="heading text-3xl text-brand-navy">Sweepstake closed</h1>
          <p className="text-brand-navy/60 text-sm leading-relaxed">
            {sweepstake.status === 'drawn'
              ? 'The draw has already happened, so joining is no longer possible.'
              : 'This sweepstake is no longer accepting new players.'}
          </p>
          <p className="text-brand-navy/30 text-xs">
            If you think this is a mistake, contact the organiser.
          </p>
        </div>
      </div>
    )
  }

  if (isFull) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 border-2 border-brand-blue/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-brand-blue/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="heading text-3xl text-brand-navy">Sweepstake full</h1>
          <p className="text-brand-navy/60 text-sm leading-relaxed">
            All places have been taken. The organiser can upgrade to add more spots.
          </p>
        </div>
      </div>
    )
  }

  const organiserName = (sweepstake as Record<string, unknown>).organisers
    ? ((sweepstake as Record<string, unknown>).organisers as { display_name: string | null }).display_name || 'the organiser'
    : 'the organiser'

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <div className="max-w-md mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-widest">
            You have been invited
          </p>
          <h1 className="heading text-4xl sm:text-5xl text-brand-navy leading-none">
            Join {sweepstake.name}
          </h1>
          <p className="text-brand-navy/50 text-sm">
            Organised by <span className="text-brand-navy font-semibold">{organiserName}</span>
          </p>
        </div>

        {/* Info */}
        <p className="text-center text-sm text-brand-navy/50 font-semibold">
          {sweepstake.mode === 'random' ? 'Random draw' : 'Pick your own'}
          {' \u00B7 '}
          {sweepstake.winner_structure === 'single' ? 'Single winner' : '1st, 2nd, 3rd'}
          {' \u00B7 '}
          {formatCurrency(sweepstake.entry_amount, sweepstake.currency)} entry
        </p>

        {/* Join flow card */}
        <JoinFlow
          sweepstakeId={sweepstake.id}
          sweepstakeName={sweepstake.name}
          mode={sweepstake.mode}
          entryAmount={sweepstake.entry_amount}
          currency={sweepstake.currency}
          paypalLink={sweepstake.paypal_link}
          organiserName={organiserName as string}
        />
      </div>
    </div>
  )
}
