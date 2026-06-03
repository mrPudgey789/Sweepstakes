import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Img,
} from '@react-email/components'

export interface Winner {
  position: number
  playerName: string
  teamName: string
}

export interface OrganiserWinnerSummaryProps {
  organiserName: string
  sweepstakeName: string
  winners: Winner[]
  totalPot: number
  currency?: string
  appUrl: string
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

export default function OrganiserWinnerSummary({
  organiserName,
  sweepstakeName,
  winners,
  totalPot,
  currency = 'GBP',
  appUrl,
}: OrganiserWinnerSummaryProps) {
  const formattedPot = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(totalPot)

  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={{
            backgroundColor: '#1A56DB',
            padding: '24px 0',
            textAlign: 'center' as const,
            borderRadius: '8px 8px 0 0',
          }}>
            <Img
              src="https://sweeporweep.com/Sweep%20or%20weep%20white.svg"
              alt="Sweep or Weep"
              width="200"
              height="auto"
              style={{ margin: '0 auto' }}
            />
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Text style={eyebrow}>{sweepstakeName}</Text>
            <Text style={heading}>The final whistle</Text>

            <Text style={paragraph}>Hi {organiserName},</Text>
            <Text style={paragraph}>
              Your sweepstake has reached its conclusion. Here is a summary of
              the winners for <strong>{sweepstakeName}</strong>.
            </Text>

            {/* Winners table */}
            <Section style={tableContainer}>
              <Section style={tableHeader}>
                <Text style={tableHeaderCell}>Position</Text>
                <Text style={tableHeaderCell}>Player</Text>
                <Text style={tableHeaderCell}>Team</Text>
              </Section>
              {winners.map((winner) => (
                <Section key={winner.position} style={tableRow}>
                  <Text style={tableCell}>
                    <strong>{ordinal(winner.position)}</strong>
                  </Text>
                  <Text style={tableCell}>{winner.playerName}</Text>
                  <Text style={tableCell}>{winner.teamName}</Text>
                </Section>
              ))}
            </Section>

            {/* Total pot */}
            <Section style={potBox}>
              <Text style={potLabel}>Total entry pot</Text>
              <Text style={potValue}>{formattedPot}</Text>
            </Section>

            {/* Organiser notice */}
            <Section style={noticeBox}>
              <Text style={noticeText}>
                As the organiser, you distribute any winnings directly to the
                winners. Sweep or Weep has not held or handled any of the entry
                pot.
              </Text>
            </Section>

            <Button style={button} href={appUrl}>
              View sweepstake
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              <strong>Sweep or Weep</strong> - World Cup 2026 Sweepstakes
            </Text>
            <Text style={disclaimer}>
              The platform provides software only. Entry money is paid directly
              between players and the organiser.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const body: React.CSSProperties = {
  backgroundColor: '#f0f5ff',
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
  boxShadow: '0 4px 24px rgba(26, 86, 219, 0.08)',
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

const tableHeader: React.CSSProperties = {
  backgroundColor: '#0A1628',
  display: 'flex',
  padding: '10px 16px',
}

const tableHeaderCell: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: '0',
  textTransform: 'uppercase',
  width: '33.33%',
}

const tableRow: React.CSSProperties = {
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  padding: '12px 16px',
}

const tableCell: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
  width: '33.33%',
}

const potBox: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center',
}

const potLabel: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  margin: '0 0 6px',
  textTransform: 'uppercase',
}

const potValue: React.CSSProperties = {
  color: '#0A1628',
  fontSize: '32px',
  fontWeight: '800',
  margin: '0',
}

const noticeBox: React.CSSProperties = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '20px 0',
}

const noticeText: React.CSSProperties = {
  color: '#1e40af',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0',
}

const button: React.CSSProperties = {
  backgroundColor: '#65FF47',
  color: '#0A1628',
  fontWeight: 'bold',
  padding: '14px 28px',
  borderRadius: '9999px',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '14px',
  textAlign: 'center' as const,
}

const divider: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '0',
}

const footer: React.CSSProperties = {
  backgroundColor: '#f0f5ff',
  padding: '20px 24px',
  borderRadius: '0 0 8px 8px',
  textAlign: 'center' as const,
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
  margin: '0',
  textAlign: 'center',
}
