import { describe, it, expect } from 'vitest'
import { getFlagUrl } from '@/lib/flags'

describe('getFlagUrl', () => {
  it('returns the correct URL for BRA', () => {
    expect(getFlagUrl('BRA')).toBe('https://flagcdn.com/w40/br.png')
  })

  it('returns the correct URL for USA', () => {
    expect(getFlagUrl('USA')).toBe('https://flagcdn.com/w40/us.png')
  })

  it('returns the correct URL for FRA', () => {
    expect(getFlagUrl('FRA')).toBe('https://flagcdn.com/w40/fr.png')
  })

  it('returns the correct URL for GER', () => {
    expect(getFlagUrl('GER')).toBe('https://flagcdn.com/w40/de.png')
  })

  it('returns empty string for an unknown FIFA code', () => {
    expect(getFlagUrl('ZZZ')).toBe('')
  })

  it('returns empty string for an empty string input', () => {
    expect(getFlagUrl('')).toBe('')
  })

  it('is case-insensitive (lowercase input)', () => {
    expect(getFlagUrl('bra')).toBe('https://flagcdn.com/w40/br.png')
  })

  it('is case-insensitive (mixed case input)', () => {
    expect(getFlagUrl('Usa')).toBe('https://flagcdn.com/w40/us.png')
  })

  describe('sub-nation codes', () => {
    it('maps ENG to gb-eng', () => {
      expect(getFlagUrl('ENG')).toBe('https://flagcdn.com/w40/gb-eng.png')
    })

    it('maps SCO to gb-sct', () => {
      expect(getFlagUrl('SCO')).toBe('https://flagcdn.com/w40/gb-sct.png')
    })

    it('maps WAL to gb-wls', () => {
      expect(getFlagUrl('WAL')).toBe('https://flagcdn.com/w40/gb-wls.png')
    })

    it('maps NIR to gb-nir', () => {
      expect(getFlagUrl('NIR')).toBe('https://flagcdn.com/w40/gb-nir.png')
    })
  })

  describe('size parameter', () => {
    it('defaults to w40 size', () => {
      expect(getFlagUrl('BRA')).toContain('/w40/')
    })

    it('uses w20 when specified', () => {
      expect(getFlagUrl('BRA', 'w20')).toBe('https://flagcdn.com/w20/br.png')
    })

    it('uses w80 when specified', () => {
      expect(getFlagUrl('BRA', 'w80')).toBe('https://flagcdn.com/w80/br.png')
    })

    it('uses w160 when specified', () => {
      expect(getFlagUrl('BRA', 'w160')).toBe('https://flagcdn.com/w160/br.png')
    })
  })
})
