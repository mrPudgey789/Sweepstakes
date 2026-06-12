import { describe, it, expect } from 'vitest'
import { mapStatus } from '../../src/lib/football-data'

describe('mapStatus', () => {
  it('maps SCHEDULED to scheduled', () => {
    expect(mapStatus('SCHEDULED')).toBe('scheduled')
  })

  it('maps TIMED to scheduled', () => {
    expect(mapStatus('TIMED')).toBe('scheduled')
  })

  it('maps IN_PLAY to live', () => {
    expect(mapStatus('IN_PLAY')).toBe('live')
  })

  it('maps PAUSED to live', () => {
    expect(mapStatus('PAUSED')).toBe('live')
  })

  it('maps LIVE to live', () => {
    expect(mapStatus('LIVE')).toBe('live')
  })

  it('maps FINISHED to finished', () => {
    expect(mapStatus('FINISHED')).toBe('finished')
  })

  it('maps AWARDED to finished', () => {
    expect(mapStatus('AWARDED')).toBe('finished')
  })

  it('maps POSTPONED to postponed', () => {
    expect(mapStatus('POSTPONED')).toBe('postponed')
  })

  it('maps SUSPENDED to suspended', () => {
    expect(mapStatus('SUSPENDED')).toBe('suspended')
  })

  it('maps CANCELLED to cancelled', () => {
    expect(mapStatus('CANCELLED')).toBe('cancelled')
  })

  it('maps unknown status to scheduled', () => {
    expect(mapStatus('UNKNOWN')).toBe('scheduled')
  })
})
