-- Add draw_pool column to sweepstakes
-- 'all' = draw from all 48 teams (default)
-- 'top_ranked' = draw from top-ranked teams only (matching player count)
ALTER TABLE sweepstakes ADD COLUMN IF NOT EXISTS draw_pool TEXT NOT NULL DEFAULT 'all';
