export const PRICING_BANDS = {
  'free': { min: 1, max: 5, amount: 0, label: '1-5 players', display: '0.00', tagline: 'Perfect for a small group' },
  '6_15': { min: 6, max: 15, amount: 500, label: '6-15 players', display: '5.00', tagline: 'Most office sweepstakes' },
  '16_32': { min: 16, max: 32, amount: 1000, label: '16-32 players', display: '10.00', tagline: 'A big group' },
  '33_48': { min: 33, max: 48, amount: 2000, label: '33-48 players', display: '20.00', tagline: 'Full tournament coverage' },
} as const

export type PricingBand = keyof typeof PRICING_BANDS
