import { createClient } from '@supabase/supabase-js'

// Admin client for server-side operations that don't need auth context
// (cron jobs, webhooks, etc.)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
