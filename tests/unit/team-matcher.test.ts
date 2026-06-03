import { describe, it, expect } from 'vitest'
import { buildTeamIndex, matchTeam } from '@/lib/team-matcher'

const sampleTeams = [
  { id: '1', name: 'Brazil', code: 'BRA', aliases: ['Brasil'] },
  { id: '2', name: 'England', code: 'ENG', aliases: ['Three Lions'] },
  { id: '3', name: 'Côte d\'Ivoire', code: 'CIV', aliases: ['Ivory Coast'] },
  { id: '4', name: 'United States', code: 'USA', aliases: ['USMNT', 'United States of America'] },
]

describe('buildTeamIndex', () => {
  it('returns byCode, byAlias, and byNormalised maps', () => {
    const index = buildTeamIndex(sampleTeams)
    expect(index.byCode).toBeInstanceOf(Map)
    expect(index.byAlias).toBeInstanceOf(Map)
    expect(index.byNormalised).toBeInstanceOf(Map)
  })

  it('indexes teams by uppercased code', () => {
    const index = buildTeamIndex(sampleTeams)
    expect(index.byCode.get('BRA')).toEqual(sampleTeams[0])
    expect(index.byCode.get('ENG')).toEqual(sampleTeams[1])
    expect(index.byCode.get('CIV')).toEqual(sampleTeams[2])
  })

  it('indexes aliases by uppercased alias string', () => {
    const index = buildTeamIndex(sampleTeams)
    expect(index.byAlias.get('BRASIL')).toEqual(sampleTeams[0])
    expect(index.byAlias.get('THREE LIONS')).toEqual(sampleTeams[1])
    expect(index.byAlias.get('IVORY COAST')).toEqual(sampleTeams[2])
  })

  it('indexes teams by normalised name (lowercased, accent-stripped)', () => {
    const index = buildTeamIndex(sampleTeams)
    // "Côte d'Ivoire" → "cotedivoire"
    expect(index.byNormalised.get('cotedivoire')).toEqual(sampleTeams[2])
    expect(index.byNormalised.get('brazil')).toEqual(sampleTeams[0])
    expect(index.byNormalised.get('england')).toEqual(sampleTeams[1])
  })

  it('also indexes the code itself in byAlias', () => {
    const index = buildTeamIndex(sampleTeams)
    expect(index.byAlias.get('BRA')).toEqual(sampleTeams[0])
  })

  it('handles teams with no aliases without throwing', () => {
    const teams = [{ id: '99', name: 'Germany', code: 'GER', aliases: [] }]
    expect(() => buildTeamIndex(teams)).not.toThrow()
    const index = buildTeamIndex(teams)
    expect(index.byCode.get('GER')).toEqual(teams[0])
  })
})

describe('matchTeam', () => {
  const index = buildTeamIndex(sampleTeams)

  it('matches by exact TLA code', () => {
    expect(matchTeam(index, 'BRA', 'Brazil')).toEqual(sampleTeams[0])
    expect(matchTeam(index, 'ENG', 'England')).toEqual(sampleTeams[1])
  })

  it('matches by TLA code case-insensitively', () => {
    expect(matchTeam(index, 'bra', 'Brazil')).toEqual(sampleTeams[0])
    expect(matchTeam(index, 'eng', 'England')).toEqual(sampleTeams[1])
  })

  it('matches by alias when TLA is null', () => {
    // "Three Lions" is an alias for England
    expect(matchTeam(index, null, 'Three Lions')).toEqual(sampleTeams[1])
  })

  it('matches by alias via tla parameter', () => {
    // "BRASIL" is an alias for Brazil
    expect(matchTeam(index, 'BRASIL', 'something')).toEqual(sampleTeams[0])
  })

  it('matches by normalised name stripping accents', () => {
    // Pass a null TLA and a name with accents that normalises to "cotedivoire"
    expect(matchTeam(index, null, 'Côte d\'Ivoire')).toEqual(sampleTeams[2])
  })

  it('matches by normalised name with no accents', () => {
    expect(matchTeam(index, null, 'England')).toEqual(sampleTeams[1])
  })

  it('returns null for completely unknown team', () => {
    expect(matchTeam(index, 'ZZZ', 'Neverland')).toBeNull()
  })

  it('returns null when tla is null and name is unknown', () => {
    expect(matchTeam(index, null, 'Neverland')).toBeNull()
  })
})
