import { describe, it, expect } from 'vitest'
import { PRICING_BANDS } from '@/lib/pricing'

describe('PRICING_BANDS', () => {
  it('defines exactly four tiers: free, 6_15, 16_32, 33_48', () => {
    const keys = Object.keys(PRICING_BANDS)
    expect(keys).toHaveLength(4)
    expect(keys).toContain('free')
    expect(keys).toContain('6_15')
    expect(keys).toContain('16_32')
    expect(keys).toContain('33_48')
  })

  describe('free tier', () => {
    it('has amount of 0 (no charge)', () => {
      expect(PRICING_BANDS.free.amount).toBe(0)
    })

    it('has a minimum of 1 player', () => {
      expect(PRICING_BANDS.free.min).toBe(1)
    })

    it('has a maximum of 5 players', () => {
      expect(PRICING_BANDS.free.max).toBe(5)
    })

    it('displays as 0.00', () => {
      expect(PRICING_BANDS.free.display).toBe('0.00')
    })
  })

  describe('small tier (6_15)', () => {
    it('starts at 6 players', () => {
      expect(PRICING_BANDS['6_15'].min).toBe(6)
    })

    it('ends at 15 players', () => {
      expect(PRICING_BANDS['6_15'].max).toBe(15)
    })

    it('costs 500 pence (£5.00)', () => {
      expect(PRICING_BANDS['6_15'].amount).toBe(500)
    })

    it('displays as 5.00', () => {
      expect(PRICING_BANDS['6_15'].display).toBe('5.00')
    })
  })

  describe('medium tier (16_32)', () => {
    it('starts at 16 players', () => {
      expect(PRICING_BANDS['16_32'].min).toBe(16)
    })

    it('ends at 32 players', () => {
      expect(PRICING_BANDS['16_32'].max).toBe(32)
    })

    it('costs 1000 pence (£10.00)', () => {
      expect(PRICING_BANDS['16_32'].amount).toBe(1000)
    })

    it('displays as 10.00', () => {
      expect(PRICING_BANDS['16_32'].display).toBe('10.00')
    })
  })

  describe('large tier (33_48)', () => {
    it('starts at 33 players', () => {
      expect(PRICING_BANDS['33_48'].min).toBe(33)
    })

    it('ends at 48 players', () => {
      expect(PRICING_BANDS['33_48'].max).toBe(48)
    })

    it('costs 2000 pence (£20.00)', () => {
      expect(PRICING_BANDS['33_48'].amount).toBe(2000)
    })

    it('displays as 20.00 (the £20 tier)', () => {
      expect(PRICING_BANDS['33_48'].display).toBe('20.00')
    })
  })

  it('each tier has a non-empty label', () => {
    for (const band of Object.values(PRICING_BANDS)) {
      expect(band.label.length).toBeGreaterThan(0)
    }
  })

  it('each tier has a non-empty tagline', () => {
    for (const band of Object.values(PRICING_BANDS)) {
      expect(band.tagline.length).toBeGreaterThan(0)
    }
  })

  it('tiers are contiguous — each tier min follows the previous tier max + 1', () => {
    const tiers = Object.values(PRICING_BANDS)
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].min).toBe(tiers[i - 1].max + 1)
    }
  })
})
