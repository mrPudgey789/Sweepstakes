// Robust team matcher: resolves football-data.org team names/tla to our canonical teams
// Strategy: exact code match > alias match > normalised name match

interface TeamRecord {
  id: string
  name: string
  code: string
  aliases: string[]
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, '')       // strip punctuation/spaces
}

export function buildTeamIndex(teams: TeamRecord[]): {
  byCode: Map<string, TeamRecord>
  byAlias: Map<string, TeamRecord>
  byNormalised: Map<string, TeamRecord>
} {
  const byCode = new Map<string, TeamRecord>()
  const byAlias = new Map<string, TeamRecord>()
  const byNormalised = new Map<string, TeamRecord>()

  for (const t of teams) {
    byCode.set(t.code.toUpperCase(), t)
    byNormalised.set(normalise(t.name), t)

    // Also index code as alias
    byAlias.set(t.code.toUpperCase(), t)

    for (const alias of t.aliases || []) {
      byAlias.set(alias.toUpperCase(), t)
      byNormalised.set(normalise(alias), t)
    }
  }

  return { byCode, byAlias, byNormalised }
}

export function matchTeam(
  index: ReturnType<typeof buildTeamIndex>,
  tla: string | null,
  name: string
): TeamRecord | null {
  // 1. Exact code match
  if (tla) {
    const byCode = index.byCode.get(tla.toUpperCase())
    if (byCode) return byCode
  }

  // 2. Alias match (case-insensitive)
  if (tla) {
    const byAlias = index.byAlias.get(tla.toUpperCase())
    if (byAlias) return byAlias
  }
  const byAliasName = index.byAlias.get(name.toUpperCase())
  if (byAliasName) return byAliasName

  // 3. Normalised name match
  const norm = normalise(name)
  const byNorm = index.byNormalised.get(norm)
  if (byNorm) return byNorm

  return null
}

// Match a football-data fixture to our fixture by team pair + same calendar day
export function matchFixture(
  ourMatches: Array<{
    id: string
    home_team_id: string | null
    away_team_id: string | null
    kickoff_at: string
    external_ref: string | null
  }>,
  homeTeamId: string,
  awayTeamId: string,
  utcDate: string
): string | null {
  const fdDate = utcDate.slice(0, 10) // YYYY-MM-DD

  // First check if already matched by external_ref
  // Then match by team pair + date
  for (const m of ourMatches) {
    if (m.home_team_id === homeTeamId && m.away_team_id === awayTeamId) {
      const ourDate = m.kickoff_at.slice(0, 10)
      if (ourDate === fdDate) return m.id
    }
    // Also check reversed (home/away might be swapped)
    if (m.home_team_id === awayTeamId && m.away_team_id === homeTeamId) {
      const ourDate = m.kickoff_at.slice(0, 10)
      if (ourDate === fdDate) return m.id
    }
  }

  return null
}
