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

export interface JoinConfirmationProps {
  playerName: string
  sweepstakeName: string
  teamName?: string
  entryAmount: number | string
  currency: string
  paypalLink?: string
  organiserName: string
  mode: 'random' | 'pick'
  appUrl: string
}

export default function JoinConfirmation({
  playerName,
  sweepstakeName,
  teamName,
  entryAmount,
  currency,
  paypalLink,
  organiserName,
  mode,
  appUrl,
}: JoinConfirmationProps) {
  const amountNum = typeof entryAmount === 'string' ? parseFloat(entryAmount.replace(/[^0-9.]/g, '')) : entryAmount
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency ?? 'GBP',
  }).format(amountNum || 0)

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
            <Text style={heading}>You have joined {sweepstakeName}</Text>
            <Text style={paragraph}>Hi {playerName},</Text>
            <Text style={paragraph}>
              Welcome to <strong>{sweepstakeName}</strong>. Your entry has been
              registered successfully.
            </Text>

            {/* Team info */}
            <Section style={infoBox}>
              <Text style={infoLabel}>Your team</Text>
              <Text style={infoValue}>
                {mode === 'random' && !teamName
                  ? 'Your team will be assigned soon'
                  : teamName ?? 'To be confirmed'}
              </Text>
              <Hr style={infoHr} />
              <Text style={infoLabel}>Entry amount</Text>
              <Text style={infoValue}>{formattedAmount}</Text>
            </Section>

            {/* Payment instructions */}
            <Text style={subheading}>Payment</Text>
            {paypalLink ? (
              <Text style={paragraph}>
                Please pay <strong>{organiserName}</strong> directly via PayPal:{' '}
                <a href={paypalLink} style={link}>
                  {paypalLink}
                </a>
              </Text>
            ) : (
              <Text style={paragraph}>
                Please pay <strong>{organiserName}</strong> directly using the
                method they have shared with you.
              </Text>
            )}

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

const heading: React.CSSProperties = {
  color: '#0A1628',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 20px',
}

const subheading: React.CSSProperties = {
  color: '#0A1628',
  fontSize: '16px',
  fontWeight: '700',
  margin: '24px 0 8px',
}

const paragraph: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const infoBox: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
}

const infoLabel: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  margin: '0 0 4px',
  textTransform: 'uppercase',
}

const infoValue: React.CSSProperties = {
  color: '#0A1628',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
}

const infoHr: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '14px 0',
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

const link: React.CSSProperties = {
  color: '#1A56DB',
  textDecoration: 'underline',
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
