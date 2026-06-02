// football-data.org client
// Primary source for live fixtures and results
// Free tier: 10 requests/minute

const BASE_URL = 'https://api.football-data.org/v4'
const COMPETITION_ID = 'WC' // World Cup

interface FdMatch {
  id: number
  utcDate: string
  status: string // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, etc.
  stage: string
  homeTeam: { id: number; name: string; tla: string }
  awayTeam: { id: number; name: string; tla: string }
  score: {
    fullTime: { home: number | null; away: number | null }
    winner: string | null // HOME_TEAM, AWAY_TEAM, DRAW
  }
  venue: string | null
}

interface FdTeam {
  id: number
  name: string
  tla: string
  crest: string
}

async function fetchApi(path: string) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    console.warn('[football-data] No API key configured')
    return null
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 300 }, // Cache for 5 minutes
  })

  if (!res.ok) {
    console.error(`[football-data] ${res.status}: ${await res.text()}`)
    return null
  }

  return res.json()
}

export async function fetchTeams(): Promise<FdTeam[]> {
  const data = await fetchApi(`/competitions/${COMPETITION_ID}/teams`)
  return data?.teams || []
}

export async function fetchMatches(): Promise<FdMatch[]> {
  const data = await fetchApi(`/competitions/${COMPETITION_ID}/matches`)
  return data?.matches || []
}

export async function fetchLiveMatches(): Promise<FdMatch[]> {
  const all = await fetchMatches()
  return all.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')
}

// Map football-data.org stage names to our enum
export function mapStage(fdStage: string): string {
  const mapping: Record<string, string> = {
    'GROUP_STAGE': 'group',
    'ROUND_OF_32': 'round_of_32',
    'LAST_32': 'round_of_32',
    'LAST_16': 'round_of_16',
    'ROUND_OF_16': 'round_of_16',
    'QUARTER_FINALS': 'quarter',
    'SEMI_FINALS': 'semi',
    'THIRD_PLACE': 'third_place',
    'FINAL': 'final',
  }
  return mapping[fdStage] || 'group'
}

// Map football-data.org match status to our enum
export function mapStatus(fdStatus: string): string {
  if (fdStatus === 'FINISHED') return 'finished'
  if (fdStatus === 'IN_PLAY' || fdStatus === 'PAUSED') return 'live'
  return 'scheduled'
}
