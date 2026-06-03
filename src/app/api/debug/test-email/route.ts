import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/send'

// Sends test emails. Dev only.
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')
  if (!to) {
    return NextResponse.json({ error: 'Pass ?to=you@example.com' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const results: Record<string, unknown> = {}

  // We'll import templates dynamically once they exist
  try {
    const { default: JoinConfirmation } = await import('@/lib/email/templates/join-confirmation')
    const r1 = await sendEmail({
      to,
      subject: 'Test: You have joined Office Sweepstake',
      template: JoinConfirmation,
      props: {
        playerName: 'James',
        sweepstakeName: 'Office Sweepstake',
        teamName: 'England',
        entryAmount: '10.00',
        currency: 'GBP',
        paypalLink: 'https://paypal.me/testorganiser/10',
        organiserName: 'Sarah',
        mode: 'random',
        appUrl,
      },
    })
    results.join_confirmation = r1

    const { default: PaymentConfirmed } = await import('@/lib/email/templates/payment-confirmed')
    const r2 = await sendEmail({
      to,
      subject: 'Test: Payment confirmed',
      template: PaymentConfirmed,
      props: { playerName: 'James', sweepstakeName: 'Office Sweepstake', appUrl },
    })
    results.payment_confirmed = r2

    const { default: TeamKnockedOut } = await import('@/lib/email/templates/team-knocked-out')
    const r3 = await sendEmail({
      to,
      subject: 'Test: Bad news, England is out',
      template: TeamKnockedOut,
      props: {
        playerName: 'James',
        teamName: 'England',
        stage: 'Quarter-Finals',
        position: 5,
        totalPlayers: 12,
        sweepstakeName: 'Office Sweepstake',
        appUrl,
      },
    })
    results.team_knocked_out = r3

    const { default: OrganiserWinnerSummary } = await import('@/lib/email/templates/organiser-winner-summary')
    const r4 = await sendEmail({
      to,
      subject: 'Test: The final whistle',
      template: OrganiserWinnerSummary,
      props: {
        organiserName: 'Sarah',
        sweepstakeName: 'Office Sweepstake',
        winners: [
          { position: 1, playerName: 'James', teamName: 'Argentina' },
        ],
        totalPot: '120.00',
        appUrl,
      },
    })
    results.organiser_winner_summary = r4

    const { default: StandingsDigest } = await import('@/lib/email/templates/standings-digest')
    const r5 = await sendEmail({
      to,
      subject: 'Test: Standings update',
      template: StandingsDigest,
      props: {
        playerName: 'James',
        sweepstakeName: 'Office Sweepstake',
        standings: [
          { rank: 1, playerName: 'Alice', teamName: 'Brazil' },
          { rank: 2, playerName: 'Bob', teamName: 'France' },
          { rank: 3, playerName: 'James', teamName: 'England' },
        ],
        playerRank: 3,
        appUrl,
        unsubscribeUrl: `${appUrl}/unsubscribe?token=test`,
      },
    })
    results.standings_digest = r5
  } catch (err) {
    results.error = String(err)
  }

  return NextResponse.json(results)
}
