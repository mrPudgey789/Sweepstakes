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

export interface TeamKnockedOutProps {
  playerName: string
  teamName: string
  stage: string
  position?: number
  totalPlayers?: number
  sweepstakeName: string
  appUrl: string
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

export default function TeamKnockedOut({
  playerName,
  teamName,
  stage,
  position,
  totalPlayers,
  sweepstakeName,
  appUrl,
}: TeamKnockedOutProps) {
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
            <Text style={heading}>Bad news, {teamName} is out</Text>

            <Text style={paragraph}>Hi {playerName},</Text>
            <Text style={paragraph}>
              The dream is over. <strong>{teamName}</strong> bowed out at the{' '}
              <strong>{stage}</strong>. It was a good run while it lasted.
            </Text>

            {position != null && totalPlayers != null && (
              <Section style={positionBox}>
                <Text style={positionLabel}>Your final position</Text>
                <Text style={positionValue}>
                  {ordinal(position)} of {totalPlayers}
                </Text>
              </Section>
            )}

            <Text style={paragraph}>
              The tournament rolls on though. You can still follow how
              everyone else gets on and see how the standings shake out.
            </Text>

            <Button style={button} href={appUrl}>
              View standings
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

const positionBox: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center',
}

const positionLabel: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  margin: '0 0 6px',
  textTransform: 'uppercase',
}

const positionValue: React.CSSProperties = {
  color: '#0A1628',
  fontSize: '32px',
  fontWeight: '800',
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
  margin: '0',
  textAlign: 'center',
}
