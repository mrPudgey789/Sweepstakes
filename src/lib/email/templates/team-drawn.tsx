import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
} from '@react-email/components'

interface TeamDrawnProps {
  playerName: string
  teamName: string
  teamCode: string
  sweepstakeName: string
  appUrl: string
  sweepstakeId: string
}

export default function TeamDrawn({
  playerName,
  teamName,
  teamCode,
  sweepstakeName,
  appUrl,
  sweepstakeId,
}: TeamDrawnProps) {
  // Map FIFA code to ISO for flag URL
  const flagUrl = `https://flagcdn.com/w160/${(teamCode || '').toLowerCase().slice(0, 2)}.png`

  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: '#f0f5ff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '40px 0' }}>

          {/* Header */}
          <Section style={{ backgroundColor: '#1A56DB', padding: '24px 0', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }}>
            <Img
              src="https://sweeporweep.com/Sweep%20or%20weep%20white.svg"
              alt="Sweep or Weep"
              width="200"
              style={{ margin: '0 auto', display: 'block' }}
            />
          </Section>

          {/* Content */}
          <Section style={{ backgroundColor: '#ffffff', padding: '32px 24px', borderRadius: '0 0 8px 8px' }}>
            <Text style={{ color: '#0A1628', fontSize: 24, fontWeight: 800, margin: '0 0 8px', textAlign: 'center' as const }}>
              The draw is in!
            </Text>
            <Text style={{ color: '#374151', fontSize: 14, lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }}>
              Hi {playerName}, the teams have been drawn for <strong>{sweepstakeName}</strong>.
            </Text>

            {/* Team card */}
            <Section style={{ backgroundColor: '#1A56DB', borderRadius: 16, padding: '32px 24px', textAlign: 'center' as const, margin: '0 0 24px' }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 2, margin: '0 0 12px' }}>
                Your team
              </Text>
              <Img
                src={flagUrl}
                alt={teamName}
                width="64"
                height="48"
                style={{ margin: '0 auto 12px', display: 'block', borderRadius: 4 }}
              />
              <Text style={{ color: '#ffffff', fontSize: 36, fontWeight: 900, margin: '0 0 4px', lineHeight: 1.1 }}>
                {teamName}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700, margin: 0 }}>
                {teamCode}
              </Text>
            </Section>

            <Text style={{ color: '#374151', fontSize: 14, lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }}>
              Good luck! Follow your team&apos;s progress in the app.
            </Text>

            <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
              <Button
                href={`${appUrl}/sweepstake/${sweepstakeId}/player`}
                style={{
                  backgroundColor: '#65FF47',
                  color: '#0A1628',
                  fontWeight: 'bold',
                  padding: '14px 28px',
                  borderRadius: 9999,
                  textDecoration: 'none',
                  display: 'inline-block',
                  fontSize: 14,
                }}
              >
                View your sweepstake
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: '20px 24px', textAlign: 'center' as const }}>
            <Text style={{ color: '#6B7280', fontSize: 11, margin: 0 }}>
              Sweep or Weep - World Cup 2026 Sweepstakes
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
