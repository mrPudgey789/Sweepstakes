import { sendEmailAsync } from '@/lib/email/send'
import { buildPaypalLink } from '@/lib/utils'

interface NotificationPayload {
  type: 'join_confirmation' | 'payment_confirmed' | 'knockout' | 'standings_update' | 'organiser_winner' | 'team_drawn'
  entryId: string
  email: string
  data: Record<string, unknown>
}

export async function sendNotification(payload: NotificationPayload) {
  const { type, entryId, email, data } = payload
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  switch (type) {
    case 'join_confirmation': {
      const JoinConfirmation = (await import('@/lib/email/templates/join-confirmation')).default
      sendEmailAsync({
        to: email,
        subject: `You have joined ${data.sweepstakeName}`,
        template: JoinConfirmation,
        props: {
          playerName: data.playerName || 'there',
          sweepstakeName: data.sweepstakeName,
          teamName: data.teamName || null,
          entryAmount: Number(data.entryAmount) || 0,
          currency: data.currency,
          paypalLink: data.paypalLink && data.paypalLink !== 'manual'
            ? buildPaypalLink(data.paypalLink as string, Number(data.entryAmount) || 0)
            : null,
          organiserName: data.organiserName || 'the organiser',
          mode: data.mode,
          appUrl,
        },
        entryId,
        notificationType: type,
      })
      break
    }

    case 'payment_confirmed': {
      const PaymentConfirmed = (await import('@/lib/email/templates/payment-confirmed')).default
      sendEmailAsync({
        to: email,
        subject: `Payment confirmed for ${data.sweepstakeName}`,
        template: PaymentConfirmed,
        props: {
          playerName: data.playerName || 'there',
          sweepstakeName: data.sweepstakeName,
          appUrl,
        },
        entryId,
        notificationType: type,
      })
      break
    }

    case 'knockout': {
      const TeamKnockedOut = (await import('@/lib/email/templates/team-knocked-out')).default
      sendEmailAsync({
        to: email,
        subject: `Bad news: ${data.teamName} is out`,
        template: TeamKnockedOut,
        props: {
          playerName: data.playerName || 'there',
          teamName: data.teamName,
          stage: (data.stage as string).replace(/_/g, ' '),
          position: data.position || null,
          totalPlayers: data.totalPlayers || null,
          sweepstakeName: data.sweepstakeName,
          appUrl,
        },
        entryId,
        notificationType: type,
      })
      break
    }

    case 'organiser_winner': {
      const OrganiserWinnerSummary = (await import('@/lib/email/templates/organiser-winner-summary')).default
      sendEmailAsync({
        to: email,
        subject: `The final whistle: ${data.sweepstakeName}`,
        template: OrganiserWinnerSummary,
        props: {
          organiserName: data.organiserName || 'Organiser',
          sweepstakeName: data.sweepstakeName,
          winners: data.winners,
          totalPot: data.totalPot,
          appUrl,
        },
        entryId,
        notificationType: type,
      })
      break
    }

    case 'standings_update': {
      const StandingsDigest = (await import('@/lib/email/templates/standings-digest')).default
      sendEmailAsync({
        to: email,
        subject: `Standings update: ${data.sweepstakeName}`,
        template: StandingsDigest,
        props: {
          playerName: data.playerName || 'there',
          sweepstakeName: data.sweepstakeName,
          standings: data.standings || [],
          playerRank: data.playerRank || null,
          appUrl,
          unsubscribeUrl: `${appUrl}/unsubscribe?entry=${entryId}`,
        },
        entryId,
        notificationType: type,
      })
      break
    }

    case 'team_drawn': {
      const TeamDrawn = (await import('@/lib/email/templates/team-drawn')).default
      sendEmailAsync({
        to: email,
        subject: `You got ${data.teamName}! 🏆`,
        template: TeamDrawn,
        props: {
          playerName: data.playerName || 'there',
          teamName: data.teamName,
          teamCode: data.teamCode,
          sweepstakeName: data.sweepstakeName,
          appUrl,
          sweepstakeId: data.sweepstakeId,
        },
        entryId,
        notificationType: type,
      })
      break
    }
  }
}
