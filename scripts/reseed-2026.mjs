#!/usr/bin/env node
/**
 * Re-seed 2026 World Cup fixtures from openfootball canonical data.
 * Preserves team IDs (live sweepstakes reference them).
 * Wipes and rebuilds all 104 match fixtures.
 *
 * Usage: node scripts/reseed-2026.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const lines = readFileSync(resolve(__dirname, '../.env.local'), 'utf8').split('\n')
  for (const line of lines) {
    if (line.startsWith('#') || !line.includes('=')) continue
    const idx = line.indexOf('=')
    process.env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Map openfootball team names to our DB names (handle any differences)
const NAME_MAP = {
  'Curaçao': 'Curaçao',
  'Ivory Coast': 'Ivory Coast',
  'DR Congo': 'DR Congo',
  'Bosnia & Herzegovina': 'Bosnia & Herzegovina',
  'Cape Verde': 'Cape Verde',
  'South Korea': 'South Korea',
  'South Africa': 'South Africa',
  'Czech Republic': 'Czech Republic',
  'New Zealand': 'New Zealand',
  'Saudi Arabia': 'Saudi Arabia',
}

// Map openfootball round names to our stage enum
function mapStage(round, group) {
  if (group) return 'group'
  if (round === 'Round of 32') return 'round_of_32'
  if (round === 'Round of 16') return 'round_of_16'
  if (round === 'Quarter-final') return 'quarter'
  if (round === 'Semi-final') return 'semi'
  if (round === 'Match for third place') return 'third_place'
  if (round === 'Final') return 'final'
  if (round.startsWith('Matchday')) return 'group'
  return 'group'
}

// Parse openfootball time format like "15:00 UTC-5" to UTC
function parseToUTC(dateStr, timeStr) {
  if (!timeStr) return new Date(`${dateStr}T18:00:00Z`)

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d+)/)
  if (!match) {
    const simple = timeStr.match(/(\d{1,2}):(\d{2})/)
    if (simple) return new Date(`${dateStr}T${simple[1].padStart(2,'0')}:${simple[2]}:00Z`)
    return new Date(`${dateStr}T18:00:00Z`)
  }

  const hours = parseInt(match[1])
  const mins = parseInt(match[2])
  const offset = parseInt(match[3])

  // Build a Date using the local time, then adjust by offset
  // offset is e.g. -5 meaning UTC-5, so UTC = local - offset = local + 5
  const localMs = new Date(`${dateStr}T${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:00Z`).getTime()
  const utcMs = localMs - (offset * 60 * 60 * 1000)
  return new Date(utcMs)
}

async function main() {
  console.log('=== Re-seeding 2026 World Cup from openfootball ===\n')

  // Load openfootball data
  const raw = JSON.parse(readFileSync(resolve(__dirname, 'replay/wc2026-openfootball.json'), 'utf8'))
  const ofMatches = raw.matches
  console.log(`Loaded ${ofMatches.length} matches from openfootball`)

  // Get tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'FIFA World Cup 2026')
    .single()

  if (!tournament) { console.error('No 2026 tournament found!'); return }
  const TID = tournament.id
  console.log(`Tournament ID: ${TID}`)

  // Get existing teams
  const { data: existingTeams } = await supabase
    .from('teams')
    .select('id, name, code, group_letter, aliases')
    .eq('tournament_id', TID)

  console.log(`Existing teams: ${existingTeams.length}`)

  // Build name-to-team lookup (try name, then aliases)
  const teamByName = {}
  for (const t of existingTeams) {
    teamByName[t.name] = t
    if (t.aliases) {
      for (const alias of t.aliases) {
        teamByName[alias] = t
      }
    }
  }

  // Build correct groups from openfootball
  const correctGroups = {}
  for (const m of ofMatches) {
    if (!m.group) continue
    const g = m.group.replace('Group ', '')
    for (const name of [m.team1, m.team2]) {
      const mapped = NAME_MAP[name] || name
      correctGroups[mapped] = g
    }
  }

  // Step 1: Update team group assignments
  console.log('\n--- Updating team groups ---')
  let groupChanges = 0
  for (const [teamName, correctGroup] of Object.entries(correctGroups)) {
    const team = teamByName[teamName]
    if (!team) {
      console.log(`  WARNING: Team not found in DB: ${teamName}`)
      continue
    }
    if (team.group_letter !== correctGroup) {
      console.log(`  ${teamName}: ${team.group_letter} -> ${correctGroup}`)
      await supabase.from('teams').update({ group_letter: correctGroup }).eq('id', team.id)
      groupChanges++
    }
  }
  console.log(`Changed ${groupChanges} team group assignments`)

  // Step 2: Delete all existing matches and results for this tournament
  console.log('\n--- Wiping existing fixtures ---')
  const { data: oldMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', TID)

  if (oldMatches.length > 0) {
    // Delete results first (FK)
    await supabase.from('results').delete().in('match_id', oldMatches.map(m => m.id))
    await supabase.from('matches').delete().eq('tournament_id', TID)
    console.log(`Deleted ${oldMatches.length} old matches`)
  }

  // Step 3: Insert all 104 matches from openfootball
  console.log('\n--- Inserting fixtures from openfootball ---')
  let matchNumber = 1
  const matchRows = []

  for (const m of ofMatches) {
    const stage = mapStage(m.round, m.group)
    const kickoff = parseToUTC(m.date, m.time)

    // For group matches, look up team IDs
    let homeTeamId = null
    let awayTeamId = null
    let homeSlot = null
    let awaySlot = null

    if (m.group) {
      const homeName = NAME_MAP[m.team1] || m.team1
      const awayName = NAME_MAP[m.team2] || m.team2
      const homeTeam = teamByName[homeName]
      const awayTeam = teamByName[awayName]
      if (!homeTeam) console.log(`  WARNING: Home team not found: ${m.team1} (${homeName})`)
      if (!awayTeam) console.log(`  WARNING: Away team not found: ${m.team2} (${awayName})`)
      homeTeamId = homeTeam?.id || null
      awayTeamId = awayTeam?.id || null
    } else {
      // Knockout: store slot labels (e.g. "1A", "W73")
      homeSlot = m.team1
      awaySlot = m.team2
    }

    matchRows.push({
      tournament_id: TID,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_slot: homeSlot,
      away_slot: awaySlot,
      stage,
      kickoff_at: kickoff.toISOString(),
      venue: m.ground || null,
      status: 'scheduled',
      match_number: matchNumber++,
    })
  }

  // Insert in batches
  for (let i = 0; i < matchRows.length; i += 50) {
    const batch = matchRows.slice(i, i + 50)
    const { error } = await supabase.from('matches').insert(batch)
    if (error) console.error(`Insert error at batch ${i}:`, error.message)
  }
  console.log(`Inserted ${matchRows.length} matches`)

  // Step 4: Verification
  console.log('\n=== VERIFICATION ===')

  // Re-fetch teams with updated groups
  const { data: updatedTeams } = await supabase
    .from('teams')
    .select('id, name, code, group_letter')
    .eq('tournament_id', TID)

  const teamById = {}
  updatedTeams.forEach(t => { teamById[t.id] = t })

  // Re-fetch matches
  const { data: newMatches } = await supabase
    .from('matches')
    .select('id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue')
    .eq('tournament_id', TID)
    .order('match_number')

  console.log(`\nTotal matches in DB: ${newMatches.length}`)

  // Check: no cross-group group-stage fixtures
  let crossGroupCount = 0
  for (const m of newMatches) {
    if (m.stage !== 'group') continue
    const home = teamById[m.home_team_id]
    const away = teamById[m.away_team_id]
    if (home && away && home.group_letter !== away.group_letter) {
      console.log(`  CROSS-GROUP BUG: ${home.name} (${home.group_letter}) vs ${away.name} (${away.group_letter})`)
      crossGroupCount++
    }
  }
  console.log(`Cross-group group-stage fixtures: ${crossGroupCount}`)

  // Spot checks
  const groupMatches = newMatches.filter(m => m.stage === 'group')

  function findMatch(team1, team2) {
    return groupMatches.find(m => {
      const h = teamById[m.home_team_id]?.name
      const a = teamById[m.away_team_id]?.name
      return (h === team1 && a === team2) || (h === team2 && a === team1)
    })
  }

  // England v Croatia
  const engCro = findMatch('England', 'Croatia')
  console.log(`\nEngland v Croatia: ${engCro ? engCro.kickoff_at.slice(0,10) + ' at ' + engCro.venue : 'NOT FOUND'}`)

  // France v Senegal
  const fraSen = findMatch('France', 'Senegal')
  console.log(`France v Senegal: ${fraSen ? fraSen.kickoff_at.slice(0,10) + ' at ' + fraSen.venue : 'NOT FOUND'}`)

  // Ecuador in Group E
  const ecuTeam = updatedTeams.find(t => t.name === 'Ecuador')
  console.log(`Ecuador group: ${ecuTeam?.group_letter} (expected: E)`)

  // England full fixtures
  console.log('\nEngland group fixtures:')
  for (const m of groupMatches) {
    const h = teamById[m.home_team_id]
    const a = teamById[m.away_team_id]
    if (h?.name === 'England' || a?.name === 'England') {
      console.log(`  ${h?.name} vs ${a?.name} - ${m.kickoff_at} - ${m.venue}`)
    }
  }

  // France full fixtures
  console.log('\nFrance group fixtures:')
  for (const m of groupMatches) {
    const h = teamById[m.home_team_id]
    const a = teamById[m.away_team_id]
    if (h?.name === 'France' || a?.name === 'France') {
      console.log(`  ${h?.name} vs ${a?.name} - ${m.kickoff_at} - ${m.venue}`)
    }
  }

  // Groups summary
  console.log('\nGroups after re-seed:')
  const groupSummary = {}
  updatedTeams.forEach(t => {
    if (!groupSummary[t.group_letter]) groupSummary[t.group_letter] = []
    groupSummary[t.group_letter].push(t.name)
  })
  Object.entries(groupSummary).sort().forEach(([g, ts]) => {
    console.log(`  Group ${g}: ${ts.sort().join(', ')}`)
  })

  if (crossGroupCount === 0) {
    console.log('\n=== ALL CHECKS PASSED ===')
  } else {
    console.log('\n=== VERIFICATION FAILED ===')
    process.exit(1)
  }
}

main().catch(console.error)
