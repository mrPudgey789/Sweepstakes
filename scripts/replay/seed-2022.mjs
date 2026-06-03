#!/usr/bin/env node
/**
 * Seed a 2022 World Cup tournament, sweepstake, and players for the visual replay.
 *
 * Usage: node scripts/replay/seed-2022.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadEnv() {
  const envPath = resolve(__dirname, '../../.env.local')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    if (line.startsWith('#') || !line.includes('=')) continue
    const idx = line.indexOf('=')
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim()
    process.env[key] = val
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ---------------------------------------------------------------------------
// 2022 FIFA code mapping (openfootball name -> FIFA code + ISO)
// ---------------------------------------------------------------------------
const TEAM_META = {
  'Qatar': { code: 'QAT', group: 'A' },
  'Ecuador': { code: 'ECU', group: 'A' },
  'Senegal': { code: 'SEN', group: 'A' },
  'Netherlands': { code: 'NED', group: 'A' },
  'England': { code: 'ENG', group: 'B' },
  'Iran': { code: 'IRN', group: 'B' },
  'USA': { code: 'USA', group: 'B' },
  'Wales': { code: 'WAL', group: 'B' },
  'Argentina': { code: 'ARG', group: 'C' },
  'Saudi Arabia': { code: 'KSA', group: 'C' },
  'Mexico': { code: 'MEX', group: 'C' },
  'Poland': { code: 'POL', group: 'C' },
  'France': { code: 'FRA', group: 'D' },
  'Australia': { code: 'AUS', group: 'D' },
  'Denmark': { code: 'DEN', group: 'D' },
  'Tunisia': { code: 'TUN', group: 'D' },
  'Spain': { code: 'ESP', group: 'E' },
  'Costa Rica': { code: 'CRC', group: 'E' },
  'Germany': { code: 'GER', group: 'E' },
  'Japan': { code: 'JPN', group: 'E' },
  'Belgium': { code: 'BEL', group: 'F' },
  'Canada': { code: 'CAN', group: 'F' },
  'Morocco': { code: 'MAR', group: 'F' },
  'Croatia': { code: 'CRO', group: 'F' },
  'Brazil': { code: 'BRA', group: 'G' },
  'Serbia': { code: 'SRB', group: 'G' },
  'Switzerland': { code: 'SUI', group: 'G' },
  'Cameroon': { code: 'CMR', group: 'G' },
  'Portugal': { code: 'POR', group: 'H' },
  'Ghana': { code: 'GHA', group: 'H' },
  'Uruguay': { code: 'URU', group: 'H' },
  'South Korea': { code: 'KOR', group: 'H' },
}

// Map openfootball round names to our stage enum
function mapStage(round, group) {
  if (group && group !== 'N/A') return 'group'
  if (round === 'Round of 16') return 'round_of_16'
  if (round === 'Quarter-finals') return 'quarter'
  if (round === 'Semi-finals') return 'semi'
  if (round === 'Match for third place') return 'third_place'
  if (round === 'Final') return 'final'
  // Matchday N with a group => group stage
  if (round.startsWith('Matchday')) return 'group'
  return 'group'
}

// Determine winner for knockout matches (handles extra time and penalties)
function determineWinner(match) {
  const score = match.score
  // Penalty shootout decides
  if (score.p) {
    return score.p[0] > score.p[1] ? match.team1 : match.team2
  }
  // Extra time decides
  if (score.et) {
    if (score.et[0] !== score.et[1]) {
      return score.et[0] > score.et[1] ? match.team1 : match.team2
    }
  }
  // Full time
  if (score.ft[0] !== score.ft[1]) {
    return score.ft[0] > score.ft[1] ? match.team1 : match.team2
  }
  return null // draw (group stage only)
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Seeding 2022 World Cup for visual replay ===\n')

  // 1. Create the 2022 tournament
  const { data: existingTournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'FIFA World Cup 2022')
    .maybeSingle()

  if (existingTournament) {
    console.log('Tournament already exists, cleaning up first...')
    await cleanup(existingTournament.id)
  }

  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      name: 'FIFA World Cup 2022',
      starts_at: '2022-11-20T19:00:00Z',
      ends_at: '2022-12-18T18:00:00Z',
    })
    .select('id')
    .single()

  if (tErr) { console.error('Tournament error:', tErr); return }
  console.log('Tournament created:', tournament.id)

  // 2. Insert 32 teams
  const teamRows = Object.entries(TEAM_META).map(([name, meta]) => ({
    tournament_id: tournament.id,
    name,
    code: meta.code,
    group_letter: meta.group,
    status: 'active',
  }))

  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .insert(teamRows)
    .select('id, name, code, group_letter')

  if (teamsErr) { console.error('Teams error:', teamsErr); return }
  console.log(`Inserted ${teams.length} teams`)

  // Build lookup maps
  const teamByName = {}
  const teamById = {}
  teams.forEach(t => {
    teamByName[t.name] = t
    teamById[t.id] = t
  })

  // 3. Insert 64 matches (all as 'scheduled', results will be fed during replay)
  const rawData = JSON.parse(readFileSync(resolve(__dirname, 'wc2022.json'), 'utf8'))
  let matchNumber = 1

  const matchRows = rawData.matches.map(m => {
    const homeTeam = teamByName[m.team1]
    const awayTeam = teamByName[m.team2]
    const stage = mapStage(m.round, m.group)
    const kickoff = new Date(`${m.date}T${m.time || '15:00'}:00Z`)

    return {
      tournament_id: tournament.id,
      home_team_id: homeTeam?.id || null,
      away_team_id: awayTeam?.id || null,
      stage,
      kickoff_at: kickoff.toISOString(),
      venue: m.ground || null,
      status: 'scheduled',
      match_number: matchNumber++,
    }
  })

  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .insert(matchRows)
    .select('id, match_number, home_team_id, away_team_id, stage')

  if (mErr) { console.error('Matches error:', mErr); return }
  console.log(`Inserted ${matches.length} matches`)

  // 4. Create the sweepstake
  const { data: organiser } = await supabase
    .from('organisers')
    .select('id')
    .eq('email', 'jimmyjopeel@gmail.com')
    .single()

  if (!organiser) { console.error('Organiser jimmyjopeel@gmail.com not found'); return }

  const { data: sweep, error: sErr } = await supabase
    .from('sweepstakes')
    .insert({
      name: 'REPLAY - World Cup 2022',
      mode: 'random',
      status: 'drawn',
      drawn_at: new Date().toISOString(),
      entry_amount: 5.00,
      currency: 'GBP',
      winner_structure: 'top_three',
      paypal_link: 'manual',
      join_code: 'REPLAY22',
      share_slug: 'replay-2022',
      max_players: 8,
      organiser_id: organiser.id,
      tournament_id: tournament.id,
    })
    .select('id')
    .single()

  if (sErr) { console.error('Sweepstake error:', sErr); return }
  console.log('Sweepstake created:', sweep.id)

  // 5. Create players and entries
  // james.peel@xeneta.com gets Qatar (Group A bottom, out in group stage)
  // Synthetic players covering key 2022 teams
  const playerDefs = [
    { email: 'james.peel@xeneta.com', name: 'James P', team: 'Qatar' },
    { email: 'replay-alice@sweeporweep.dev', name: 'Alice', team: 'Argentina' },
    { email: 'replay-bob@sweeporweep.dev', name: 'Bob', team: 'France' },
    { email: 'replay-charlie@sweeporweep.dev', name: 'Charlie', team: 'Croatia' },
    { email: 'replay-diana@sweeporweep.dev', name: 'Diana', team: 'Morocco' },
    { email: 'replay-eddie@sweeporweep.dev', name: 'Eddie', team: 'Brazil' },
    { email: 'replay-fiona@sweeporweep.dev', name: 'Fiona', team: 'England' },
    { email: 'replay-greg@sweeporweep.dev', name: 'Greg', team: 'Germany' },
  ]

  for (const pd of playerDefs) {
    const team = teamByName[pd.team]
    if (!team) { console.error('Team not found:', pd.team); continue }

    // Find or create player
    let { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('email', pd.email)
      .maybeSingle()

    if (!player) {
      const { data: newP, error: pErr } = await supabase
        .from('players')
        .insert({ email: pd.email, display_name: pd.name })
        .select('id')
        .single()
      if (pErr) { console.error('Player error:', pd.email, pErr); continue }
      player = newP
    } else {
      await supabase.from('players').update({ display_name: pd.name }).eq('id', player.id)
    }

    const { error: eErr } = await supabase.from('entries').insert({
      sweepstake_id: sweep.id,
      player_id: player.id,
      team_id: team.id,
      payment_state: 'confirmed',
      confirmed_at: new Date().toISOString(),
      tc_accepted_at: new Date().toISOString(),
    })
    if (eErr) { console.error('Entry error:', pd.email, eErr); continue }
    console.log(`  ${pd.name} -> ${pd.team} (${team.code})`)
  }

  // 6. Save replay metadata
  const meta = {
    tournament_id: tournament.id,
    sweepstake_id: sweep.id,
    team_map: teamByName,
    matches: matches.sort((a, b) => a.match_number - b.match_number),
  }
  const { writeFileSync } = await import('fs')
  writeFileSync(resolve(__dirname, 'replay-meta.json'), JSON.stringify(meta, null, 2))
  console.log('\nReplay metadata saved to scripts/replay/replay-meta.json')

  // 7. Print summary
  console.log('\n=== Seed complete ===')
  console.log(`Tournament: ${tournament.id}`)
  console.log(`Sweepstake: ${sweep.id}`)
  console.log(`Teams: ${teams.length}`)
  console.log(`Matches: ${matches.length}`)
  console.log(`Players: ${playerDefs.length}`)
  console.log('\nKnown 2022 outcomes:')
  console.log('  1st: Argentina (Alice)')
  console.log('  2nd: France (Bob)')
  console.log('  3rd: Croatia (Charlie)')
  console.log('  Group stage exit: Qatar (James P)')
  console.log('\nRun the replay: node scripts/replay/run-replay.mjs')
}

async function cleanup(tournamentId) {
  // Delete sweepstakes for this tournament
  const { data: sweeps } = await supabase
    .from('sweepstakes')
    .select('id')
    .eq('tournament_id', tournamentId)

  for (const s of sweeps || []) {
    await supabase.from('notifications').delete().in(
      'entry_id',
      (await supabase.from('entries').select('id').eq('sweepstake_id', s.id)).data?.map(e => e.id) || []
    )
    await supabase.from('standings').delete().eq('sweepstake_id', s.id)
    await supabase.from('entries').delete().eq('sweepstake_id', s.id)
  }
  await supabase.from('sweepstakes').delete().eq('tournament_id', tournamentId)

  // Delete match results, then matches, then teams, then tournament
  const { data: matchIds } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId)
  if (matchIds?.length) {
    await supabase.from('results').delete().in('match_id', matchIds.map(m => m.id))
  }
  await supabase.from('matches').delete().eq('tournament_id', tournamentId)
  await supabase.from('teams').delete().eq('tournament_id', tournamentId)
  await supabase.from('tournaments').delete().eq('id', tournamentId)

  // Delete synthetic players
  const synthEmails = [
    'replay-alice@sweeporweep.dev', 'replay-bob@sweeporweep.dev',
    'replay-charlie@sweeporweep.dev', 'replay-diana@sweeporweep.dev',
    'replay-eddie@sweeporweep.dev', 'replay-fiona@sweeporweep.dev',
    'replay-greg@sweeporweep.dev',
  ]
  await supabase.from('players').delete().in('email', synthEmails)
  console.log('Cleanup complete')
}

main().catch(console.error)
