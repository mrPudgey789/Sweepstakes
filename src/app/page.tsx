import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-4">
        World Cup Sweepstakes 2026
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
        Set up a sweepstake for your office or friend group in under five minutes.
        Share a link, get teams, follow the tournament.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/auth/signup"
          className="bg-green-700 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-green-800"
        >
          Create a sweepstake
        </Link>
        <Link
          href="/join"
          className="border border-gray-300 px-6 py-3 rounded-lg text-lg font-medium hover:bg-gray-100"
        >
          Join with a code
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-3xl mx-auto">
        <div>
          <h3 className="font-semibold text-lg mb-2">Quick setup</h3>
          <p className="text-gray-600 text-sm">
            Name your sweepstake, choose random draw or pick-your-own,
            set the entry amount, and share the link.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Live fixtures</h3>
          <p className="text-gray-600 text-sm">
            Follow every match of the 2026 World Cup with live scores,
            standings, and knockout notifications by email.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Fair and simple</h3>
          <p className="text-gray-600 text-sm">
            Entry money goes directly from players to the organiser.
            The platform charges a small software fee and never touches the pot.
          </p>
        </div>
      </div>
    </div>
  )
}
