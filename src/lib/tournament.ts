import { SupabaseClient } from '@supabase/supabase-js'

export const TOURNAMENT_NAME = 'FIFA World Cup 2026'

let cachedTournamentId: string | null = null

export async function getTournamentId(supabase: SupabaseClient): Promise<string | null> {
  if (cachedTournamentId) return cachedTournamentId

  const { data } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', TOURNAMENT_NAME)
    .maybeSingle()

  if (data) {
    cachedTournamentId = data.id
  }
  return data?.id || null
}
