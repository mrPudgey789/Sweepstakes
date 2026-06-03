import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white font-sans">

      {/* ── Hero ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 bg-brand-blue overflow-hidden"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 28px,
              rgba(255,255,255,0.04) 28px,
              rgba(255,255,255,0.04) 30px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 28px,
              rgba(255,255,255,0.04) 28px,
              rgba(255,255,255,0.04) 30px
            )
          `,
        }}
      >
        {/* Label */}
        <span className="heading inline-block mb-6 text-white text-2xl sm:text-3xl">
          World Cup 2026
        </span>

        {/* Logo */}
        <div className="mb-6 w-full max-w-[260px] sm:max-w-xs md:max-w-sm">
          <img
            src="/Sweep or weep white.svg"
            alt="Sweep or Weep"
            className="w-full h-auto"
          />
        </div>

        {/* Tagline */}
        <p className="text-white/80 text-lg sm:text-xl md:text-2xl font-medium max-w-xl mb-10">
          The easiest way to run a World Cup sweepstake
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link href="/create" className="btn-primary !text-lg">
            Create a sweepstake
          </Link>
          <Link href="/join" className="btn-light !text-lg">
            Join with a code
          </Link>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center heading text-3xl sm:text-4xl md:text-5xl text-brand-navy mb-4">
            How it works
          </h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-xl mx-auto">
            Up and running in under five minutes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Create your sweepstake',
                desc: 'Name it, choose random draw or pick-your-own, set your entry fee and customise the rules.',
              },
              {
                step: '2',
                title: 'Invite your group',
                desc: 'Share a unique link or code with friends, family or colleagues. Everyone joins in seconds.',
              },
              {
                step: '3',
                title: 'Follow the tournament',
                desc: 'Live scores, standings and knockout alerts keep everyone engaged all the way to the final.',
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="flex flex-col items-start p-8 rounded-3xl bg-gray-50 border border-gray-100"
              >
                <div className="w-14 h-14 rounded-full bg-brand-green flex items-center justify-center mb-6 shrink-0">
                  <span className="text-brand-navy font-extrabold text-xl">{step}</span>
                </div>
                <h3 className="heading text-brand-navy text-xl mb-3">{title}</h3>
                <p className="text-gray-500 text-base leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center heading text-3xl sm:text-4xl md:text-5xl text-brand-navy mb-4">
            Simple, fair pricing
          </h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-xl mx-auto">
            Pay once per sweepstake. No subscriptions, no hidden charges.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free tier — highlighted */}
            <div className="relative flex flex-col items-center p-8 rounded-3xl bg-brand-blue text-white shadow-xl ring-4 ring-brand-green">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-green text-brand-navy text-xs font-bold px-4 py-1 rounded-full tracking-wide uppercase">
                Free
              </span>
              <div className="mt-4 mb-1 text-4xl font-extrabold">£0</div>
              <div className="text-brand-ice text-sm mb-6">per sweepstake</div>
              <div className="text-white font-semibold text-lg mb-1">1 to 5 players</div>
              <p className="text-brand-ice/80 text-sm text-center">
                Perfect for a small group of friends or family.
              </p>
            </div>

            {[
              { price: '£5', range: '6 to 15 players', desc: 'Great for a small office or close friend group.' },
              { price: '£10', range: '16 to 32 players', desc: 'Ideal for a full office floor or large group.' },
              { price: '£20', range: '33 to 48 players', desc: 'For the biggest sweepstakes with the full 48-team draw.' },
            ].map(({ price, range, desc }) => (
              <div
                key={price}
                className="flex flex-col items-center p-8 rounded-3xl bg-white border border-gray-200 shadow-sm"
              >
                <div className="mb-1 text-4xl font-extrabold text-brand-navy">{price}</div>
                <div className="text-gray-400 text-sm mb-6">per sweepstake</div>
                <div className="text-brand-navy font-semibold text-lg mb-1">{range}</div>
                <p className="text-gray-500 text-sm text-center">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-brand-blue px-6 py-24 text-center">
        <h2 className="heading text-3xl sm:text-4xl md:text-5xl text-white mb-4">
          Ready to start?
        </h2>
        <p className="text-brand-ice/80 text-lg mb-10 max-w-lg mx-auto">
          Set up your sweepstake now and share it before the tournament kicks off.
        </p>
        <Link href="/create" className="btn-primary !text-xl !px-14 !py-5">
          Create a sweepstake
        </Link>
      </section>

    </main>
  )
}
