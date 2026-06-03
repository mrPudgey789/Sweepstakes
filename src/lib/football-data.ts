// football-data.org client
// Primary source for live fixtures and results
// Free tier: 10 requests/minute
// ALWAYS scope to season=2026 for the FIFA World Cup

const BASE_URL = 'https://api.football-data.org/v4'
const COMPETITION_ID = 'WC'
const SEASON = 2026

export interface FdMatch {
  id: number
  utcDate: string
  status: string // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED, CANCELLED
  matchday: number | null
  stage: string
  group: string | null
  homeTeam: { id: number; name: string; tla: string; crest: string }
  awayTeam: { id: number; name: string; tla: string; crest: string }
  score: {
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
    winner: string | null // HOME_TEAM, AWAY_TEAM, DRAW
  }
  venue: string | null
  minute?: string | null
}

export interface FdTeam {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

let lastRateLimit: RateLimitInfo | null = null

export function getLastRateLimit(): RateLimitInfo | null {
  return lastRateLimit
}

async function fetchApi(path: string) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    console.warn('[football-data] No API key configured')
    return null
  }

  const url = `${BASE_URL}${path}`
  console.log(`[football-data] GET ${url}`)

  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  })

  // Track rate limit headers
  const limit = res.headers.get('X-Requests-Available-Minute')
  const counter = res.headers.get('X-RequestCounter-Reset')
  if (limit) {
    lastRateLimit = {
      limit: 10,
      remaining: parseInt(limit, 10),
      reset: counter ? parseInt(counter, 10) : 60,
    }
  }

  if (!res.ok) {
    const body = await res.text()
    console.error(`[football-data] ${res.status}: ${body}`)
    return null
  }

  return res.json()
}

export async function fetchTeams(): Promise<FdTeam[]> {
  const data = await fetchApi(`/competitions/${COMPETITION_ID}/teams?season=${SEASON}`)
  return data?.teams || []
}

export async function fetchMatches(status?: string): Promise<FdMatch[]> {
  let path = `/competitions/${COMPETITION_ID}/matches?season=${SEASON}`
  if (status) path += `&status=${status}`
  const data = await fetchApi(path)
  return data?.matches || []
}

export async function fetchLiveMatches(): Promise<FdMatch[]> {
  // Fetch IN_PLAY and PAUSED matches
  const live = await fetchMatches('LIVE')
  return live
}

export async function fetchFinishedMatches(): Promise<FdMatch[]> {
  return fetchMatches('FINISHED')
}

// Map football-data.org stage names to our enum
export function mapStage(fdStage: string): string {
  const mapping: Record<string, string> = {
    GROUP_STAGE: 'group',
    ROUND_OF_32: 'round_of_32',
    LAST_32: 'round_of_32',
    LAST_16: 'round_of_16',
    ROUND_OF_16: 'round_of_16',
    QUARTER_FINALS: 'quarter',
    SEMI_FINALS: 'semi',
    THIRD_PLACE: 'third_place',
    FINAL: 'final',
  }
  return mapping[fdStage] || 'group'
}

// Map football-data.org match status to our enum
export function mapStatus(fdStatus: string): string {
  if (fdStatus === 'FINISHED') return 'finished'
  if (fdStatus === 'IN_PLAY' || fdStatus === 'PAUSED' || fdStatus === 'LIVE') return 'live'
  return 'scheduled'
}
