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

export interface PaymentConfirmedProps {
  playerName: string
  sweepstakeName: string
  appUrl: string
}

export default function PaymentConfirmed({
  playerName,
  sweepstakeName,
  appUrl,
}: PaymentConfirmedProps) {
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
            <Section style={badgeWrapper}>
              <Text style={badge}>CONFIRMED</Text>
            </Section>

            <Text style={heading}>You are in!</Text>
            <Text style={paragraph}>Hi {playerName},</Text>
            <Text style={paragraph}>
              The organiser has confirmed your entry payment for{' '}
              <strong>{sweepstakeName}</strong>. You are officially in the draw.
            </Text>

            <Section style={noticeBox}>
              <Text style={noticeText}>
                The organiser confirmed receipt directly. The platform did not
                handle this money.
              </Text>
            </Section>

            <Text style={paragraph}>
              Good luck! Keep an eye on your sweepstake as the tournament
              progresses.
            </Text>

            <Button style={button} href={appUrl}>
              View your sweepstake
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

const badgeWrapper: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '8px',
}

const badge: React.CSSProperties = {
  backgroundColor: '#65FF47',
  borderRadius: '20px',
  color: '#0A1628',
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '1.5px',
  margin: '0 auto 16px',
  padding: '4px 14px',
}

const heading: React.CSSProperties = {
  color: '#0A1628',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 20px',
}

const paragraph: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const noticeBox: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '20px 0',
}

const noticeText: React.CSSProperties = {
  color: '#166534',
  fontSize: '13px',
  lineHeight: '1.5',
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
