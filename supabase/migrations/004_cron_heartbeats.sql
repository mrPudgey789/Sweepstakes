-- Cron heartbeat table for dead-man's switch monitoring
CREATE TABLE IF NOT EXISTS cron_heartbeats (
  job_name TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unknown',
  details TEXT,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow service role full access (no RLS needed, admin only)
ALTER TABLE cron_heartbeats ENABLE ROW LEVEL SECURITY;
