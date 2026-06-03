#!/usr/bin/env node
/**
 * Visual replay of the 2022 World Cup through the Sweep or Weep pipeline.
 *
 * Feeds each match result into Supabase (scheduled -> finished), triggers
 * elimination detection, knockout notifications, and standings recomputation.
 *
 * Usage:
 *   node scripts/replay/run-replay.mjs                    # auto mode, 3s per match
 *   node scripts/replay/run-replay.mjs --delay=1000       # 1s per match
 *   node scripts/replay/run-replay.mjs --step             # wait for Enter between matches
 *   node scripts/replay/run-replay.mjs --matchday         # wait for Enter between matchdays
 *   node scripts/replay/run-replay.mjs --from=33          # start from match 33 (R16)
 *
 * Requires: seed-2022.mjs to have been run first.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

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
    process.env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
}
loadEnv()

const args = process.argv.slice(2)
const DELAY = parseInt(args.find(a => a.startsWith('--delay='))?.split('=')[1] || '3000')
const STEP_MODE = args.includes('--step')
const MATCHDAY_MODE = args.includes('--matchday')
const FROM_MATCH = parseInt(args.find(a => a.startsWith('--from='))?.split('=')[1] || '1')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

// Email allowlist: only these two get real sends
const EMAIL_ALLOWLIST = ['james.peel@xeneta.com', 'jimmyjopeel@gmail.com']

// ---------------------------------------------------------------------------
// Known 2022 elimination order (for correctness assertion)
// ---------------------------------------------------------------------------
const KNOWN_GROUP_ELIMINATED = [
  // Teams that exited at group stage (did not qualify for R16)
  'Qatar', 'Ecuador', 'Iran', 'Wales', 'Saudi Arabia', 'Mexico',
  'Denmark', 'Tunisia', 'Costa Rica', 'Germany', 'Belgium', 'Canada',
  'Serbia', 'Cameroon', 'Ghana', 'Uruguay',
]

const KNOWN_R16_ELIMINATED = ['USA', 'Australia', 'Poland', 'Senegal', 'Japan', 'Spain', 'South Korea', 'Switzerland']
const KNOWN_QF_ELIMINATED = ['Netherlands', 'England', 'Brazil', 'Portugal']
const KNOWN_SF_ELIMINATED = [] // SF losers play 3rd place
const KNOWN_THIRD_PLACE_LOSER = 'Morocco'
const KNOWN_FINALIST_LOSER = 'France'
const KNOWN_WINNER = 'Argentina'

const KNOWN_FINAL_ORDER = ['Argentina', 'France', 'Croatia'] // 1st, 2nd, 3rd

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function waitForEnter(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(r => rl.question(prompt, () => { rl.close(); r() }))
}

function determineWinner(match) {
  const score = match.score
  if (score.p) return score.p[0] > score.p[1] ? match.team1 : match.team2
  if (score.et && score.et[0] !== score.et[1]) return score.et[0] > score.et[1] ? match.team1 : match.team2
  if (score.ft[0] !== score.ft[1]) return score.ft[0] > score.ft[1] ? match.team1 : match.team2
  return null
}

function ftScore(match) {
  const s = match.score
  if (s.et) return `${s.et[0]}-${s.et[1]} AET`
  return `${s.ft[0]}-${s.ft[1]}`
}

// ---------------------------------------------------------------------------
// Pipeline steps
// ---------------------------------------------------------------------------

/** Insert result and mark match finished */
async function feedResult(dbMatchId, match, teamByName) {
  const homeTeam = teamByName[match.team1]
  const awayTeam = teamByName[match.team2]
  if (!homeTeam || !awayTeam) {
    console.error(`  Teams not found: ${match.team1} / ${match.team2}`)
    return null
  }

  const homeScore = match.score.ft[0]
  const awayScore = match.score.ft[1]
  const winnerName = determineWinner(match)
  const winnerId = winnerName ? teamByName[winnerName]?.id : null

  // Upsert result
  await supabase.from('results').upsert({
    match_id: dbMatchId,
    home_score: homeScore,
    away_score: awayScore,
    winner_team_id: winnerId,
    source: 'manual_override',
    recorded_at: new Date().toISOString(),
  }, { onConflict: 'match_id' })

  // Mark match finished
  await supabase.from('matches').update({ status: 'finished' }).eq('id', dbMatchId)

  return { winnerId, winnerName, homeScore, awayScore }
}

/** For knockout matches, mark the loser as eliminated */
async function handleKnockoutElimination(dbMatchId, match, teamByName, stage) {
  if (stage === 'group') return null

  const winnerName = determineWinner(match)
  if (!winnerName) return null

  const loserName = winnerName === match.team1 ? match.team2 : match.team1
  const loser = teamByName[loserName]
  if (!loser) return null

  // Semi-final losers are not eliminated yet (they play 3rd place)
  // Actually in our system we should still track them, but let's mark them eliminated
  // EXCEPT the semi losers who play the third-place match
  if (stage === 'semi') {
    // Don't eliminate yet, they play third place
    return null
  }

  await supabase.from('teams').update({
    status: 'eliminated',
    eliminated_at: new Date().toISOString(),
  }).eq('id', loser.id)

  return loserName
}

/** Send knockout notification for eliminated team's entries */
async function sendKnockoutNotifications(teamName, teamId, sweepstakeId, stage) {
  // Find entries with this team
  const { data: entries } = await supabase
    .from('entries')
    .select('id, player_id, players(email, display_name)')
    .eq('sweepstake_id', sweepstakeId)
    .eq('team_id', teamId)

  if (!entries || entries.length === 0) return 0

  const { data: sweep } = await supabase
    .from('sweepstakes')
    .select('name')
    .eq('id', sweepstakeId)
    .single()

  let sent = 0
  for (const entry of entries) {
    const player = entry.players
    if (!player) continue

    // Idempotency: check for existing knockout notification
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('entry_id', entry.id)
      .eq('type', 'knockout')
      .eq('status', 'sent')
      .maybeSingle()

    if (existing) {
      console.log(`    [skip] Knockout already sent for ${player.display_name}`)
      continue
    }

    const isAllowlisted = EMAIL_ALLOWLIST.includes(player.email?.toLowerCase())

    // Record notification
    await supabase.from('notifications').insert({
      entry_id: entry.id,
      type: 'knockout',
      status: isAllowlisted ? 'queued' : 'sent', // mark as sent for non-allowlisted (logged only)
      payload: { teamName, stage, playerEmail: player.email, playerName: player.display_name },
      sent_at: isAllowlisted ? null : new Date().toISOString(),
    })

    if (isAllowlisted) {
      // Send real email via the app's API
      try {
        const res = await fetch(`${APP_URL}/api/debug/test-email?to=${encodeURIComponent(player.email)}&type=knockout&team=${encodeURIComponent(teamName)}&stage=${encodeURIComponent(stage)}&sweep=${encodeURIComponent(sweep?.name || '')}&player=${encodeURIComponent(player.display_name || '')}`)
        if (res.ok) {
          await supabase.from('notifications').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          }).eq('entry_id', entry.id).eq('type', 'knockout')
          console.log(`    [EMAIL SENT] Knockout -> ${player.email}`)
        }
      } catch {
        console.log(`    [email failed] ${player.email} (will retry via reconciliation)`)
      }
    } else {
      console.log(`    [logged] Knockout for ${player.display_name} (${player.email})`)
    }
    sent++
  }
  return sent
}

/** Recompute standings directly via Supabase (no HTTP needed) */
async function recomputeStandings(sweepstakeId, tournamentId) {
  // Get entries with teams
  const { data: entries } = await supabase
    .from('entries')
    .select('id, team_id, teams(id, status)')
    .eq('sweepstake_id', sweepstakeId)
    .not('team_id', 'is', null)

  if (!entries || entries.length === 0) return

  const STAGE_WEIGHT = { group: 1, round_of_16: 3, quarter: 4, semi: 5, third_place: 6, final: 7 }

  const entryStages = []
  for (const entry of entries) {
    const teamData = entry.teams
    if (!teamData) continue

    const { data: teamMatches } = await supabase
      .from('matches')
      .select('stage')
      .eq('tournament_id', tournamentId)
      .or(`home_team_id.eq.${entry.team_id},away_team_id.eq.${entry.team_id}`)
      .eq('status', 'finished')

    let bestStage = 'group'
    let bestWeight = 0
    for (const m of teamMatches || []) {
      const w = STAGE_WEIGHT[m.stage] || 0
      if (w > bestWeight) { bestWeight = w; bestStage = m.stage }
    }

    entryStages.push({
      entry_id: entry.id,
      team_id: entry.team_id,
      best_stage: bestStage,
      is_eliminated: teamData.status === 'eliminated',
      stage_weight: bestWeight,
    })
  }

  entryStages.sort((a, b) => {
    if (a.is_eliminated !== b.is_eliminated) return a.is_eliminated ? 1 : -1
    return b.stage_weight - a.stage_weight
  })

  await supabase.from('standings').delete().eq('sweepstake_id', sweepstakeId)
  const rows = entryStages.map((e, i) => ({
    sweepstake_id: sweepstakeId,
    entry_id: e.entry_id,
    rank: i + 1,
    team_stage: e.best_stage,
    is_eliminated: e.is_eliminated,
  }))
  if (rows.length > 0) await supabase.from('standings').insert(rows)
}

// ---------------------------------------------------------------------------
// Main replay loop
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== 2022 World Cup Visual Replay ===\n')

  // Load replay metadata
  let meta
  try {
    meta = JSON.parse(readFileSync(resolve(__dirname, 'replay-meta.json'), 'utf8'))
  } catch {
    console.error('No replay-meta.json found. Run seed-2022.mjs first.')
    process.exit(1)
  }

  const { tournament_id, sweepstake_id } = meta

  // Build team lookup from DB
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, code, group_letter')
    .eq('tournament_id', tournament_id)

  const teamByName = {}
  const teamById = {}
  teams.forEach(t => { teamByName[t.name] = t; teamById[t.id] = t })

  // Load match data from openfootball
  const rawData = JSON.parse(readFileSync(resolve(__dirname, 'wc2022.json'), 'utf8'))

  // Get DB matches in order
  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, match_number, stage, status, home_team_id, away_team_id')
    .eq('tournament_id', tournament_id)
    .order('match_number')

  console.log(`Loaded ${rawData.matches.length} matches, DB has ${dbMatches.length}`)
  console.log(`Sweepstake: ${sweepstake_id}`)
  console.log(`Mode: ${STEP_MODE ? 'step (press Enter)' : MATCHDAY_MODE ? 'matchday (press Enter between days)' : `auto (${DELAY}ms delay)`}\n`)

  const eliminated = new Set()
  let prevRound = ''

  for (let i = 0; i < rawData.matches.length; i++) {
    const match = rawData.matches[i]
    const dbMatch = dbMatches[i]
    const matchNum = i + 1

    if (matchNum < FROM_MATCH) {
      // Fast-forward: still feed the result but skip the delay
      if (dbMatch.status !== 'finished') {
        await feedResult(dbMatch.id, match, teamByName)
        const stage = dbMatch.stage
        if (stage !== 'group' && stage !== 'semi') {
          const loser = determineWinner(match) === match.team1 ? match.team2 : match.team1
          if (loser && teamByName[loser]) {
            await supabase.from('teams').update({ status: 'eliminated', eliminated_at: new Date().toISOString() }).eq('id', teamByName[loser].id)
            eliminated.add(loser)
          }
        }
      }
      continue
    }

    // Matchday boundary
    if (MATCHDAY_MODE && match.round !== prevRound && prevRound) {
      await waitForEnter(`\n--- End of ${prevRound}. Press Enter for ${match.round} ---\n`)
    }
    prevRound = match.round

    // Step mode
    if (STEP_MODE) {
      await waitForEnter(`[${matchNum}/64] ${match.team1} vs ${match.team2} (${match.round}) - Press Enter to play...`)
    }

    // Feed result
    console.log(`[${matchNum}/64] ${match.team1} ${ftScore(match)} ${match.team2}  (${match.round})`)
    const result = await feedResult(dbMatch.id, match, teamByName)
    if (!result) continue

    const stage = dbMatch.stage

    // Handle knockout elimination
    if (stage !== 'group') {
      const loserName = await handleKnockoutElimination(dbMatch.id, match, teamByName, stage)
      if (loserName) {
        eliminated.add(loserName)
        console.log(`  -> ${loserName} ELIMINATED at ${stage}`)
        const notifications = await sendKnockoutNotifications(
          loserName, teamByName[loserName].id, sweepstake_id, stage
        )
        if (notifications > 0) console.log(`  -> ${notifications} notification(s) sent`)
      }
    }

    // Check group stage eliminations after all group matches for a group are done
    if (stage === 'group') {
      await checkGroupEliminations(tournament_id, sweepstake_id, teamByName, eliminated, i, rawData.matches, dbMatches)
    }

    // Recompute standings
    await recomputeStandings(sweepstake_id, tournament_id)

    // Delay
    if (!STEP_MODE && !MATCHDAY_MODE) {
      await sleep(DELAY)
    }
  }

  // After third-place match, eliminate the loser
  // (semi losers were deferred)
  // Find the third-place match result
  const thirdPlaceMatch = rawData.matches.find(m => m.round === 'Match for third place')
  if (thirdPlaceMatch) {
    const loserName = determineWinner(thirdPlaceMatch) === thirdPlaceMatch.team1 ? thirdPlaceMatch.team2 : thirdPlaceMatch.team1
    if (loserName && !eliminated.has(loserName)) {
      eliminated.add(loserName)
      // The third-place loser was already handled in the loop above
    }
    // Also eliminate semi-final losers properly
    const semiMatches = rawData.matches.filter(m => m.round === 'Semi-finals')
    for (const sm of semiMatches) {
      const loser = determineWinner(sm) === sm.team1 ? sm.team2 : sm.team1
      if (loser && !eliminated.has(loser) && teamByName[loser]) {
        // Mark as eliminated (they lost in semis, then either won or lost 3rd place)
        eliminated.add(loser)
      }
    }
  }

  // Final standings recompute
  await recomputeStandings()

  console.log('\n=== Replay complete ===')
  console.log(`\nEliminated teams (${eliminated.size}):`)
  eliminated.forEach(t => console.log(`  ${t}`))

  // ---------------------------------------------------------------------------
  // Correctness assertion
  // ---------------------------------------------------------------------------
  console.log('\n=== Correctness check ===')
  const { data: finalStandings } = await supabase
    .from('entries')
    .select('id, players(display_name), teams(name, status)')
    .eq('sweepstake_id', sweepstake_id)

  // Check standings via API
  const standingsRes = await fetch(`${APP_URL}/api/sweepstakes/standings?sweepstake_id=${sweepstake_id}`)
  const standings = await standingsRes.json()

  console.log('\nFinal standings:')
  standings.forEach(s => {
    console.log(`  ${s.rank}. ${s.player_name} (${s.team_name}) - ${s.stage_reached} ${s.is_eliminated ? '[OUT]' : '[IN]'}`)
  })

  // Assert top 3
  const top3 = standings.slice(0, 3).map(s => s.team_name)
  let pass = true

  if (top3[0] === KNOWN_FINAL_ORDER[0] && top3[1] === KNOWN_FINAL_ORDER[1] && top3[2] === KNOWN_FINAL_ORDER[2]) {
    console.log('\n  PASS: Top 3 matches real 2022 result (Argentina, France, Croatia)')
  } else {
    console.log(`\n  FAIL: Top 3 is [${top3.join(', ')}], expected [${KNOWN_FINAL_ORDER.join(', ')}]`)
    pass = false
  }

  // Check Qatar (James) is last or near last
  const qatarStanding = standings.find(s => s.team_name === 'Qatar')
  if (qatarStanding?.rank === standings.length) {
    console.log('  PASS: Qatar (James P) is last place')
  } else {
    console.log(`  WARN: Qatar is rank ${qatarStanding?.rank}, expected ${standings.length}`)
  }

  // Check knockout notifications sent
  const { count: knockoutCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'knockout')
    .in('entry_id', finalStandings.map(e => e.id))

  console.log(`  Knockout notifications sent: ${knockoutCount}`)

  if (pass) {
    console.log('\n  === ALL ASSERTIONS PASSED ===')
  } else {
    console.log('\n  === SOME ASSERTIONS FAILED ===')
    process.exit(1)
  }
}

/** Check if any group is complete and eliminate bottom teams */
async function checkGroupEliminations(tournamentId, sweepstakeId, teamByName, eliminated, currentIdx, allMatches, dbMatches) {
  // Find which groups have all 6 matches finished
  const groups = {}
  for (let i = 0; i <= currentIdx; i++) {
    const m = allMatches[i]
    const dbm = dbMatches[i]
    if (dbm.stage !== 'group') continue
    const group = m.group?.replace('Group ', '')
    if (!group) continue
    if (!groups[group]) groups[group] = 0
    groups[group]++
  }

  for (const [group, count] of Object.entries(groups)) {
    if (count < 6) continue // group not complete yet

    // Get group table
    const groupTeams = Object.values(teamByName).filter(t => t.group_letter === group)

    // Compute group standings from results
    const stats = {}
    groupTeams.forEach(t => {
      stats[t.id] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
    })

    for (let i = 0; i <= currentIdx; i++) {
      const m = allMatches[i]
      const dbm = dbMatches[i]
      if (dbm.stage !== 'group') continue
      if (m.group?.replace('Group ', '') !== group) continue

      const home = teamByName[m.team1]
      const away = teamByName[m.team2]
      if (!home || !away || !stats[home.id] || !stats[away.id]) continue

      const hs = m.score.ft[0], as_ = m.score.ft[1]
      stats[home.id].played++; stats[away.id].played++
      stats[home.id].gf += hs; stats[home.id].ga += as_
      stats[away.id].gf += as_; stats[away.id].ga += hs

      if (hs > as_) { stats[home.id].won++; stats[away.id].lost++; stats[home.id].pts += 3 }
      else if (hs < as_) { stats[away.id].won++; stats[home.id].lost++; stats[away.id].pts += 3 }
      else { stats[home.id].drawn++; stats[away.id].drawn++; stats[home.id].pts += 1; stats[away.id].pts += 1 }
    }

    // Sort
    const sorted = Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const gdA = a.gf - a.ga, gdB = b.gf - b.ga
      if (gdB !== gdA) return gdB - gdA
      return b.gf - a.gf
    })

    sorted.forEach(s => { s.gd = s.gf - s.ga })

    // Bottom 2 are eliminated (2022 format: top 2 per group advance)
    const bottom2 = sorted.slice(2)
    for (const s of bottom2) {
      if (eliminated.has(s.team.name)) continue
      eliminated.add(s.team.name)
      console.log(`  -> ${s.team.name} ELIMINATED (Group ${group}, ${s.pts}pts GD:${s.gd})`)

      await supabase.from('teams').update({
        status: 'eliminated',
        eliminated_at: new Date().toISOString(),
      }).eq('id', s.team.id)

      const notifications = await sendKnockoutNotifications(
        s.team.name, s.team.id, sweepstakeId, `Group ${group}`
      )
      if (notifications > 0) console.log(`    -> ${notifications} notification(s)`)
    }
  }
}

main().catch(console.error)
