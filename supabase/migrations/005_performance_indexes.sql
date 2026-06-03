-- Performance indexes for hot read paths at scale

-- Entries: queried by sweepstake_id on every standings/player load
CREATE INDEX IF NOT EXISTS idx_entries_sweepstake_id ON entries(sweepstake_id);

-- Entries: queried by team_id for knockout notifications
CREATE INDEX IF NOT EXISTS idx_entries_team_id ON entries(team_id);

-- Entries: queried by player_id for dashboard
CREATE INDEX IF NOT EXISTS idx_entries_player_id ON entries(player_id);

-- Standings: queried by sweepstake_id on every standings read
CREATE INDEX IF NOT EXISTS idx_standings_sweepstake_id ON standings(sweepstake_id);

-- Standings: deleted by entry_id when removing players
CREATE INDEX IF NOT EXISTS idx_standings_entry_id ON standings(entry_id);

-- Notifications: queried by status for the drain worker
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status) WHERE status = 'queued';

-- Notifications: idempotency check by entry_id + type
CREATE INDEX IF NOT EXISTS idx_notifications_entry_type ON notifications(entry_id, type);

-- Matches: queried by tournament_id + status for results polling
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON matches(tournament_id, status);

-- Matches: queried by external_ref for feed matching
CREATE INDEX IF NOT EXISTS idx_matches_external_ref ON matches(external_ref) WHERE external_ref IS NOT NULL;
