-- Store wizard/join state across devices during email verification
-- Keyed by email, cleaned up after use
CREATE TABLE IF NOT EXISTS pending_state (
  email TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'create_wizard' or 'join_intent'
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed, accessed via service role only
ALTER TABLE pending_state ENABLE ROW LEVEL SECURITY;
