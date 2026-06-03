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

export interface JoinConfirmationProps {
  playerName: string
  sweepstakeName: string
  teamName?: string
  entryAmount: number
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
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency ?? 'GBP',
  }).format(entryAmount)

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
              This is a personal payment between you and the organiser. Sweep or
              Weep never holds, receives, or distributes any entry money.
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

const link: React.CSSProperties = {
  color: '#1A56DB',
  textDecoration: 'underline',
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
