#!/usr/bin/env node
/**
 * Clean up the 2022 replay data. Leaves 2026 data intact.
 *
 * Usage: node scripts/replay/cleanup-2022.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('=== Cleaning up 2022 replay data ===\n')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'FIFA World Cup 2022')
    .maybeSingle()

  if (!tournament) {
    console.log('No 2022 tournament found. Nothing to clean up.')
    return
  }

  const tid = tournament.id

  // Delete sweepstakes and related data
  const { data: sweeps } = await supabase
    .from('sweepstakes')
    .select('id')
    .eq('tournament_id', tid)

  for (const s of sweeps || []) {
    const { data: entries } = await supabase.from('entries').select('id').eq('sweepstake_id', s.id)
    const entryIds = entries?.map(e => e.id) || []
    if (entryIds.length > 0) {
      await supabase.from('notifications').delete().in('entry_id', entryIds)
    }
    await supabase.from('standings').delete().eq('sweepstake_id', s.id)
    await supabase.from('entries').delete().eq('sweepstake_id', s.id)
    console.log(`  Deleted entries/standings/notifications for sweepstake ${s.id}`)
  }
  await supabase.from('sweepstakes').delete().eq('tournament_id', tid)
  console.log('  Deleted sweepstakes')

  // Delete results, matches, teams
  const { data: matchIds } = await supabase.from('matches').select('id').eq('tournament_id', tid)
  if (matchIds?.length) {
    await supabase.from('results').delete().in('match_id', matchIds.map(m => m.id))
    console.log(`  Deleted ${matchIds.length} results`)
  }
  await supabase.from('matches').delete().eq('tournament_id', tid)
  console.log('  Deleted matches')
  await supabase.from('teams').delete().eq('tournament_id', tid)
  console.log('  Deleted teams')
  await supabase.from('tournaments').delete().eq('id', tid)
  console.log('  Deleted tournament')

  // Delete synthetic players
  const synthEmails = [
    'replay-alice@sweeporweep.dev', 'replay-bob@sweeporweep.dev',
    'replay-charlie@sweeporweep.dev', 'replay-diana@sweeporweep.dev',
    'replay-eddie@sweeporweep.dev', 'replay-fiona@sweeporweep.dev',
    'replay-greg@sweeporweep.dev',
  ]
  await supabase.from('players').delete().in('email', synthEmails)
  console.log('  Deleted synthetic players')

  // Verify 2026 data is intact
  const { count: teamCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', (await supabase.from('tournaments').select('id').eq('name', 'FIFA World Cup 2026').single()).data?.id || '')

  console.log(`\n  2026 teams intact: ${teamCount} (should be 48)`)
  console.log('\n=== Cleanup complete ===')
}

main().catch(console.error)
