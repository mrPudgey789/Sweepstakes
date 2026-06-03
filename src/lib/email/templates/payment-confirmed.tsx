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
  color: '#1a7a00',
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
