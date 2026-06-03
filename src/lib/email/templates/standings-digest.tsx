import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components'

export interface StandingEntry {
  rank: number
  playerName: string
  teamName: string
}

export interface StandingsDigestProps {
  playerName: string
  sweepstakeName: string
  standings: StandingEntry[]
  playerRank: number
  appUrl: string
  unsubscribeUrl: string
}

export default function StandingsDigest({
  playerName,
  sweepstakeName,
  standings,
  playerRank,
  appUrl,
  unsubscribeUrl,
}: StandingsDigestProps) {
  const topFive = standings.slice(0, 5)

  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={brandText}>SWEEP OR WEEP</Text>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Text style={eyebrow}>{sweepstakeName}</Text>
            <Text style={heading}>Standings update</Text>

            <Text style={paragraph}>Hi {playerName},</Text>
            <Text style={paragraph}>
              Here is the current top 5 for{' '}
              <strong>{sweepstakeName}</strong>.
              {playerRank > 5
                ? ` You are currently ranked ${playerRank}.`
                : ''}
            </Text>

            {/* Standings table */}
            <Section style={tableContainer}>
              {/* Table header */}
              <Section style={tableHeaderRow}>
                <Text style={tableHeaderRank}>Rank</Text>
                <Text style={tableHeaderPlayer}>Player</Text>
                <Text style={tableHeaderTeam}>Team</Text>
              </Section>

              {topFive.map((entry) => {
                const isPlayer = entry.rank === playerRank
                return (
                  <Section
                    key={entry.rank}
                    style={isPlayer ? highlightedRow : tableRow}
                  >
                    <Text style={isPlayer ? highlightedRankCell : rankCell}>
                      {entry.rank}
                    </Text>
                    <Text style={isPlayer ? highlightedCell : playerCell}>
                      {entry.playerName}
                      {isPlayer ? ' (you)' : ''}
                    </Text>
                    <Text style={isPlayer ? highlightedCell : teamCell}>
                      {entry.teamName}
                    </Text>
                  </Section>
                )
              })}

              {/* Show player's row outside top 5 if needed */}
              {playerRank > 5 && (
                <>
                  <Section style={ellipsisRow}>
                    <Text style={ellipsisCell}>...</Text>
                  </Section>
                  {standings.find((e) => e.rank === playerRank) && (
                    <Section style={highlightedRow}>
                      <Text style={highlightedRankCell}>{playerRank}</Text>
                      <Text style={highlightedCell}>
                        {
                          standings.find((e) => e.rank === playerRank)!
                            .playerName
                        }{' '}
                        (you)
                      </Text>
                      <Text style={highlightedCell}>
                        {standings.find((e) => e.rank === playerRank)!.teamName}
                      </Text>
                    </Section>
                  )}
                </>
              )}
            </Section>

            <Button style={button} href={appUrl}>
              View full standings
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              <strong>Sweep or Weep</strong> - World Cup 2026 Sweepstakes
            </Text>
            <Text style={disclaimer}>
              Sweep or Weep never holds, receives, or distributes any entry
              money. All payments are made directly between players and the
              organiser.
            </Text>
            <Text style={unsubscribeText}>
              You are receiving this because you opted in to standings updates.{' '}
              <a href={unsubscribeUrl} style={unsubscribeLink}>
                Unsubscribe
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const body: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '24px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  maxWidth: '600px',
  margin: '0 auto',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  backgroundColor: '#0A1628',
  padding: '24px 32px',
  textAlign: 'center',
}

const brandText: React.CSSProperties = {
  color: '#1A56DB',
  fontSize: '22px',
  fontWeight: '800',
  letterSpacing: '3px',
  margin: '0',
}

const content: React.CSSProperties = {
  padding: '32px',
}

const eyebrow: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  margin: '0 0 8px',
  textTransform: 'uppercase',
}

const heading: React.CSSProperties = {
  color: '#0A1628',
  fontSize: '26px',
  fontWeight: '700',
  margin: '0 0 20px',
}

const paragraph: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const tableContainer: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  margin: '20px 0',
  overflow: 'hidden',
}

const tableHeaderRow: React.CSSProperties = {
  backgroundColor: '#0A1628',
  display: 'flex',
  padding: '10px 16px',
}

const tableHeaderRank: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: '0',
  textTransform: 'uppercase',
  width: '15%',
}

const tableHeaderPlayer: React.CSSProperties = {
  ...tableHeaderRank,
  width: '45%',
}

const tableHeaderTeam: React.CSSProperties = {
  ...tableHeaderRank,
  width: '40%',
}

const tableRow: React.CSSProperties = {
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  padding: '11px 16px',
}

const highlightedRow: React.CSSProperties = {
  backgroundColor: '#eff6ff',
  borderLeft: '3px solid #1A56DB',
  borderTop: '1px solid #bfdbfe',
  display: 'flex',
  padding: '11px 16px',
}

const rankCell: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  width: '15%',
}

const playerCell: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
  width: '45%',
}

const teamCell: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
  width: '40%',
}

const highlightedRankCell: React.CSSProperties = {
  ...rankCell,
  color: '#1A56DB',
  fontWeight: '700',
}

const highlightedCell: React.CSSProperties = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  width: '45%',
}

const ellipsisRow: React.CSSProperties = {
  borderTop: '1px solid #e2e8f0',
  padding: '6px 16px',
}

const ellipsisCell: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '14px',
  margin: '0',
}

const button: React.CSSProperties = {
  backgroundColor: '#1A56DB',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  margin: '24px 0 0',
  padding: '12px 28px',
  textDecoration: 'none',
}

const divider: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '0',
}

const footer: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  padding: '24px 32px',
}

const footerText: React.CSSProperties = {
  color: '#374151',
  fontSize: '13px',
  margin: '0 0 8px',
  textAlign: 'center',
}

const disclaimer: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 12px',
  textAlign: 'center',
}

const unsubscribeText: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  margin: '0',
  textAlign: 'center',
}

const unsubscribeLink: React.CSSProperties = {
  color: '#9ca3af',
  textDecoration: 'underline',
}
