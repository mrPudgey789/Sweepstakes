import { describe, it, expect } from 'vitest'
import {
  buildPaypalLink,
  normalisePaypalHandle,
  formatCurrency,
  generateJoinCode,
  generateShareSlug,
} from '@/lib/utils'

const JOIN_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

describe('buildPaypalLink', () => {
  it('returns empty string for "manual"', () => {
    expect(buildPaypalLink('manual')).toBe('')
  })

  it('returns empty string for empty handle', () => {
    expect(buildPaypalLink('')).toBe('')
  })

  it('builds a correct paypal.me URL from a handle', () => {
    expect(buildPaypalLink('johndoe')).toBe('https://paypal.me/johndoe')
  })

  it('does not double-wrap a full URL', () => {
    expect(buildPaypalLink('https://paypal.me/johndoe')).toBe('https://paypal.me/johndoe')
  })

  it('appends amount to a handle-based URL', () => {
    expect(buildPaypalLink('johndoe', 10)).toBe('https://paypal.me/johndoe/10')
  })

  it('appends amount to a full paypal.me URL', () => {
    expect(buildPaypalLink('https://paypal.me/johndoe', 25)).toBe('https://paypal.me/johndoe/25')
  })

  it('strips trailing slash before appending amount', () => {
    expect(buildPaypalLink('https://paypal.me/johndoe/', 15)).toBe('https://paypal.me/johndoe/15')
  })

  it('does not append amount when amount is 0 (falsy)', () => {
    expect(buildPaypalLink('johndoe', 0)).toBe('https://paypal.me/johndoe')
  })
})

describe('normalisePaypalHandle', () => {
  it('extracts the handle from a full paypal.me URL', () => {
    expect(normalisePaypalHandle('https://paypal.me/johndoe')).toBe('johndoe')
  })

  it('extracts the handle from a URL with a trailing path', () => {
    expect(normalisePaypalHandle('https://paypal.me/johndoe/10')).toBe('johndoe')
  })

  it('strips non-alphanumeric characters from a plain string', () => {
    expect(normalisePaypalHandle('john.doe!')).toBe('johndoe')
  })

  it('returns a plain alphanumeric handle unchanged', () => {
    expect(normalisePaypalHandle('johndoe')).toBe('johndoe')
  })

  it('strips hyphens and spaces from a non-URL input', () => {
    expect(normalisePaypalHandle('john-doe 123')).toBe('johndoe123')
  })
})

describe('formatCurrency', () => {
  it('formats a whole number in GBP with pound sign and two decimals', () => {
    expect(formatCurrency(10)).toBe('£10.00')
  })

  it('formats a decimal amount in GBP correctly', () => {
    expect(formatCurrency(4.5)).toBe('£4.50')
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('£0.00')
  })

  it('formats a larger amount correctly', () => {
    expect(formatCurrency(1234.56)).toBe('£1,234.56')
  })
})

describe('generateJoinCode', () => {
  it('returns a string of the default length (6)', () => {
    const code = generateJoinCode()
    expect(code).toHaveLength(6)
  })

  it('returns a string of a custom length', () => {
    const code = generateJoinCode(8)
    expect(code).toHaveLength(8)
  })

  it('only contains characters from the allowed set', () => {
    const allowed = new Set(JOIN_CODE_CHARS)
    for (let i = 0; i < 50; i++) {
      const code = generateJoinCode()
      for (const char of code) {
        expect(allowed.has(char)).toBe(true)
      }
    }
  })

  it('never contains ambiguous characters I, L, O, 0, 1', () => {
    const ambiguous = new Set(['I', 'L', 'O', '0', '1'])
    for (let i = 0; i < 50; i++) {
      const code = generateJoinCode()
      for (const char of code) {
        expect(ambiguous.has(char)).toBe(false)
      }
    }
  })
})

describe('generateShareSlug', () => {
  it('returns a string of the default length (10)', () => {
    const slug = generateShareSlug()
    expect(slug).toHaveLength(10)
  })

  it('returns a string of a custom length', () => {
    const slug = generateShareSlug(16)
    expect(slug).toHaveLength(16)
  })

  it('only contains alphanumeric characters', () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateShareSlug()
      expect(slug).toMatch(/^[A-Za-z0-9]+$/)
    }
  })
})
