export const PRICING_BANDS = {
  '1_10': { min: 1, max: 10, amount: 500, label: '1-10 players', display: '5.00' },
  '11_50': { min: 11, max: 50, amount: 1000, label: '11-50 players', display: '10.00' },
  '50_plus': { min: 51, max: 999, amount: 2000, label: '50+ players', display: '20.00' },
} as const

export type PricingBand = keyof typeof PRICING_BANDS
