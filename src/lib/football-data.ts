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
  const MAX_RETRIES = 3
  const TIMEOUT_MS = 10000

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const res = await fetch(url, {
        headers: { 'X-Auth-Token': apiKey },
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeout)

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

      return await res.json()
    } catch (err) {
      console.error(`[football-data] Attempt ${attempt}/${MAX_RETRIES} failed: ${err}`)
      if (attempt < MAX_RETRIES) {
        // Backoff: 1s, 2s
        await new Promise(r => setTimeout(r, attempt * 1000))
      }
    }
  }

  console.error(`[football-data] All ${MAX_RETRIES} attempts failed for ${path}`)
  return null
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
  switch (fdStatus) {
    case 'FINISHED':
    case 'AWARDED':
      return 'finished'
    case 'IN_PLAY':
    case 'PAUSED':
    case 'LIVE':
      return 'live'
    case 'POSTPONED':
      return 'postponed'
    case 'SUSPENDED':
      return 'suspended'
    case 'CANCELLED':
      return 'cancelled'
    default: // SCHEDULED, TIMED
      return 'scheduled'
  }
}
