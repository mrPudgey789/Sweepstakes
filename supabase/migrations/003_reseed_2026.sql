-- ============================================================
-- Migration 003: Reseed FIFA World Cup 2026
-- Corrects groups, teams, aliases, and full match schedule (104 matches)
-- Idempotent: adds columns if not exists, deletes then re-inserts data
-- ============================================================

-- ============================================================
-- STEP 1: Add new columns (idempotent via IF NOT EXISTS)
-- ============================================================

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS slot_label TEXT;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_number INTEGER,
  ADD COLUMN IF NOT EXISTS home_slot TEXT,
  ADD COLUMN IF NOT EXISTS away_slot TEXT;

-- ============================================================
-- STEP 2: Delete all existing data (FK order)
-- ============================================================

DELETE FROM results;
DELETE FROM matches;
DELETE FROM teams;
DELETE FROM tournaments;

-- ============================================================
-- STEP 3: Insert tournament
-- ============================================================

INSERT INTO tournaments (name, external_competition_ref, starts_at, ends_at)
VALUES (
  'FIFA World Cup 2026',
  'WC',
  '2026-06-11T00:00:00Z',
  '2026-07-19T23:59:59Z'
);

-- ============================================================
-- STEP 4: Insert 48 teams (Groups A–L, 4 per group)
-- ============================================================

-- Group A
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Mexico',       'MEX', 'A', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'South Korea',  'KOR', 'A', ARRAY['Korea Republic']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Czech Republic','CZE','A', ARRAY['Czechia']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'South Africa', 'RSA', 'A', '{}');

-- Group B
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Canada',               'CAN', 'B', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Switzerland',          'SUI', 'B', ARRAY['Schweiz']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Qatar',                'QAT', 'B', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Bosnia & Herzegovina', 'BIH', 'B', ARRAY['Bosnia and Herzegovina','Bosnia-Herzegovina']);

-- Group C
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Brazil',   'BRA', 'C', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Morocco',  'MAR', 'C', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Scotland', 'SCO', 'C', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Haiti',    'HAI', 'C', '{}');

-- Group D
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'USA',       'USA', 'D', ARRAY['United States']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Turkey',    'TUR', 'D', ARRAY['Türkiye']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Paraguay',  'PAR', 'D', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Australia', 'AUS', 'D', '{}');

-- Group E
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Germany',     'GER', 'E', ARRAY['Deutschland']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Ecuador',     'ECU', 'E', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Ivory Coast', 'CIV', 'E', ARRAY['Côte d''Ivoire','Cote d''Ivoire']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Curaçao',     'CUW', 'E', ARRAY['Curacao']);

-- Group F
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Argentina', 'ARG', 'F', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Japan',     'JPN', 'F', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Algeria',   'ALG', 'F', ARRAY['Algérie']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Jordan',    'JOR', 'F', '{}');

-- Group G
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'England',     'ENG', 'G', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Netherlands', 'NED', 'G', ARRAY['Holland']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Iran',        'IRN', 'G', ARRAY['IR Iran']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Senegal',     'SEN', 'G', '{}');

-- Group H
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'France',     'FRA', 'H', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Colombia',   'COL', 'H', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Uzbekistan', 'UZB', 'H', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Uruguay',    'URU', 'H', '{}');

-- Group I
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Spain',       'ESP', 'I', ARRAY['España']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Norway',      'NOR', 'I', ARRAY['Norge']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'New Zealand', 'NZL', 'I', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Cape Verde',  'CPV', 'I', ARRAY['Cabo Verde']);

-- Group J
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Portugal', 'POR', 'J', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Croatia',  'CRO', 'J', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Panama',   'PAN', 'J', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'DR Congo', 'COD', 'J', ARRAY['Congo DR','Democratic Republic of Congo','Congo']);

-- Group K
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Belgium', 'BEL', 'K', ARRAY['Belgique']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Ghana',   'GHA', 'K', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Iraq',    'IRQ', 'K', '{}'),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Egypt',   'EGY', 'K', '{}');

-- Group L
INSERT INTO teams (tournament_id, name, code, group_letter, aliases) VALUES
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Austria',      'AUT', 'L', ARRAY['Österreich']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Sweden',       'SWE', 'L', ARRAY['Sverige']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Tunisia',      'TUN', 'L', ARRAY['Tunisie']),
  ((SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'), 'Saudi Arabia', 'KSA', 'L', '{}');

-- ============================================================
-- STEP 5: Insert all 104 matches
--
-- UTC conversion reference:
--   UTC-4 → add 4h   UTC-5 → add 5h   UTC-6 → add 6h   UTC-7 → add 7h
-- ============================================================

-- Helper CTE-style: we use a DO block to avoid repeating the tournament subquery
-- Actually just use inline subqueries for clarity and compatibility.

-- ----------------------------------------------------------------
-- GROUP STAGE (matches 1–72)
-- ----------------------------------------------------------------

-- GROUP A --

-- Match 1: Jun 11, 13:00 UTC-6 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  1, 'group',
  (SELECT id FROM teams WHERE code = 'MEX' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'RSA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-11T19:00:00Z',
  'Mexico City'
);

-- Match 2: Jun 11, 20:00 UTC-6 → 02:00 UTC Jun 12
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  2, 'group',
  (SELECT id FROM teams WHERE code = 'KOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CZE' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-12T02:00:00Z',
  'Guadalajara'
);

-- Match 13: Jun 18, 12:00 UTC-4 → 16:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  13, 'group',
  (SELECT id FROM teams WHERE code = 'CZE' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'RSA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-18T16:00:00Z',
  'Atlanta'
);

-- Match 14: Jun 18, 19:00 UTC-6 → 01:00 UTC Jun 19
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  14, 'group',
  (SELECT id FROM teams WHERE code = 'MEX' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'KOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-19T01:00:00Z',
  'Guadalajara'
);

-- Match 37: Jun 24, 19:00 UTC-6 → 01:00 UTC Jun 25
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  37, 'group',
  (SELECT id FROM teams WHERE code = 'CZE' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'MEX' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-25T01:00:00Z',
  'Mexico City'
);

-- Match 38: Jun 24, 19:00 UTC-6 → 01:00 UTC Jun 25
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  38, 'group',
  (SELECT id FROM teams WHERE code = 'RSA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'KOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-25T01:00:00Z',
  'Monterrey'
);

-- GROUP B --

-- Match 3: Jun 12, 15:00 UTC-4 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  3, 'group',
  (SELECT id FROM teams WHERE code = 'CAN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'BIH' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-12T19:00:00Z',
  'Toronto'
);

-- Match 7: Jun 13, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  7, 'group',
  (SELECT id FROM teams WHERE code = 'QAT' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'SUI' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-13T19:00:00Z',
  'Santa Clara'
);

-- Match 15: Jun 18, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  15, 'group',
  (SELECT id FROM teams WHERE code = 'SUI' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'BIH' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-18T19:00:00Z',
  'Los Angeles'
);

-- Match 16: Jun 18, 15:00 UTC-7 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  16, 'group',
  (SELECT id FROM teams WHERE code = 'CAN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'QAT' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-18T22:00:00Z',
  'Vancouver'
);

-- Match 39: Jun 24, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  39, 'group',
  (SELECT id FROM teams WHERE code = 'SUI' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CAN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-24T19:00:00Z',
  'Vancouver'
);

-- Match 40: Jun 24, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  40, 'group',
  (SELECT id FROM teams WHERE code = 'BIH' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'QAT' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-24T19:00:00Z',
  'Seattle'
);

-- GROUP C --

-- Match 5: Jun 13, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  5, 'group',
  (SELECT id FROM teams WHERE code = 'BRA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'MAR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-13T22:00:00Z',
  'East Rutherford'
);

-- Match 8: Jun 13, 21:00 UTC-4 → 01:00 UTC Jun 14
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  8, 'group',
  (SELECT id FROM teams WHERE code = 'HAI' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'SCO' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-14T01:00:00Z',
  'Boston'
);

-- Match 17: Jun 19, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  17, 'group',
  (SELECT id FROM teams WHERE code = 'SCO' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'MAR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-19T22:00:00Z',
  'Boston'
);

-- Match 18: Jun 19, 20:30 UTC-4 → 00:30 UTC Jun 20
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  18, 'group',
  (SELECT id FROM teams WHERE code = 'BRA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'HAI' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-20T00:30:00Z',
  'Philadelphia'
);

-- Match 41: Jun 24, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  41, 'group',
  (SELECT id FROM teams WHERE code = 'SCO' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'BRA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-24T22:00:00Z',
  'Miami'
);

-- Match 42: Jun 24, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  42, 'group',
  (SELECT id FROM teams WHERE code = 'MAR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'HAI' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-24T22:00:00Z',
  'Atlanta'
);

-- GROUP D --

-- Match 4: Jun 12, 18:00 UTC-7 → 01:00 UTC Jun 13
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  4, 'group',
  (SELECT id FROM teams WHERE code = 'USA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'PAR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-13T01:00:00Z',
  'Los Angeles'
);

-- Match 6: Jun 13, 21:00 UTC-7 → 04:00 UTC Jun 14
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  6, 'group',
  (SELECT id FROM teams WHERE code = 'AUS' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'TUR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-14T04:00:00Z',
  'Vancouver'
);

-- Match 19: Jun 19, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  19, 'group',
  (SELECT id FROM teams WHERE code = 'USA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'AUS' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-19T19:00:00Z',
  'Seattle'
);

-- Match 20: Jun 19, 20:00 UTC-7 → 03:00 UTC Jun 20
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  20, 'group',
  (SELECT id FROM teams WHERE code = 'TUR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'PAR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-20T03:00:00Z',
  'Santa Clara'
);

-- Match 43: Jun 25, 19:00 UTC-7 → 02:00 UTC Jun 26
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  43, 'group',
  (SELECT id FROM teams WHERE code = 'TUR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'USA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-26T02:00:00Z',
  'Los Angeles'
);

-- Match 44: Jun 25, 19:00 UTC-7 → 02:00 UTC Jun 26
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  44, 'group',
  (SELECT id FROM teams WHERE code = 'PAR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'AUS' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-26T02:00:00Z',
  'Santa Clara'
);

-- GROUP E --

-- Match 9: Jun 14, 12:00 UTC-5 → 17:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  9, 'group',
  (SELECT id FROM teams WHERE code = 'GER' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CUW' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-14T17:00:00Z',
  'Houston'
);

-- Match 10: Jun 14, 19:00 UTC-4 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  10, 'group',
  (SELECT id FROM teams WHERE code = 'CIV' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'ECU' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-14T23:00:00Z',
  'Philadelphia'
);

-- Match 21: Jun 20, 16:00 UTC-4 → 20:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  21, 'group',
  (SELECT id FROM teams WHERE code = 'GER' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CIV' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-20T20:00:00Z',
  'Toronto'
);

-- Match 22: Jun 20, 19:00 UTC-5 → 00:00 UTC Jun 21
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  22, 'group',
  (SELECT id FROM teams WHERE code = 'ECU' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CUW' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-21T00:00:00Z',
  'Kansas City'
);

-- Match 45: Jun 25, 19:00 UTC-4 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  45, 'group',
  (SELECT id FROM teams WHERE code = 'ECU' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'GER' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-25T23:00:00Z',
  'Philadelphia'
);

-- Match 46: Jun 25, 19:00 UTC-4 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  46, 'group',
  (SELECT id FROM teams WHERE code = 'CUW' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CIV' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-25T23:00:00Z',
  'Atlanta'
);

-- GROUP F --

-- Match 11: Jun 14, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  11, 'group',
  (SELECT id FROM teams WHERE code = 'ARG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'ALG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-14T19:00:00Z',
  'Seattle'
);

-- Match 12: Jun 14, 18:00 UTC-7 → 01:00 UTC Jun 15
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  12, 'group',
  (SELECT id FROM teams WHERE code = 'JPN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'JOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-15T01:00:00Z',
  'Los Angeles'
);

-- Match 23: Jun 20, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  23, 'group',
  (SELECT id FROM teams WHERE code = 'JOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'ALG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-20T19:00:00Z',
  'Santa Clara'
);

-- Match 24: Jun 20, 15:00 UTC-7 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  24, 'group',
  (SELECT id FROM teams WHERE code = 'ARG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'JPN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-20T22:00:00Z',
  'Seattle'
);

-- Match 47: Jun 25, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  47, 'group',
  (SELECT id FROM teams WHERE code = 'ALG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'JPN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-25T19:00:00Z',
  'San Francisco'
);

-- Match 48: Jun 25, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  48, 'group',
  (SELECT id FROM teams WHERE code = 'JOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'ARG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-25T19:00:00Z',
  'Los Angeles'
);

-- GROUP G --

-- Match 25: Jun 15, 12:00 UTC-5 → 17:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  25, 'group',
  (SELECT id FROM teams WHERE code = 'ENG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'SEN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-15T17:00:00Z',
  'Houston'
);

-- Match 26: Jun 15, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  26, 'group',
  (SELECT id FROM teams WHERE code = 'NED' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'IRN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-15T22:00:00Z',
  'Miami'
);

-- Match 27: Jun 21, 12:00 UTC-5 → 17:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  27, 'group',
  (SELECT id FROM teams WHERE code = 'IRN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'SEN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-21T17:00:00Z',
  'Houston'
);

-- Match 28: Jun 21, 19:00 UTC-4 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  28, 'group',
  (SELECT id FROM teams WHERE code = 'ENG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'NED' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-21T23:00:00Z',
  'Atlanta'
);

-- Match 49: Jun 26, 15:00 UTC-5 → 20:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  49, 'group',
  (SELECT id FROM teams WHERE code = 'IRN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'ENG' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-26T20:00:00Z',
  'Dallas'
);

-- Match 50: Jun 26, 15:00 UTC-5 → 20:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  50, 'group',
  (SELECT id FROM teams WHERE code = 'SEN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'NED' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-26T20:00:00Z',
  'Houston'
);

-- GROUP H --

-- Match 29: Jun 15, 20:00 UTC-4 → 00:00 UTC Jun 16
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  29, 'group',
  (SELECT id FROM teams WHERE code = 'FRA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'COL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-16T00:00:00Z',
  'New York/New Jersey'
);

-- Match 30: Jun 16, 12:00 UTC-5 → 17:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  30, 'group',
  (SELECT id FROM teams WHERE code = 'UZB' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'URU' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-16T17:00:00Z',
  'Dallas'
);

-- Match 31: Jun 21, 12:00 UTC-4 → 16:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  31, 'group',
  (SELECT id FROM teams WHERE code = 'URU' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'COL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-21T16:00:00Z',
  'New York/New Jersey'
);

-- Match 32: Jun 21, 18:00 UTC-5 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  32, 'group',
  (SELECT id FROM teams WHERE code = 'FRA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'UZB' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-21T23:00:00Z',
  'Kansas City'
);

-- Match 51: Jun 26, 19:00 UTC-4 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  51, 'group',
  (SELECT id FROM teams WHERE code = 'COL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'UZB' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-26T23:00:00Z',
  'Boston'
);

-- Match 52: Jun 26, 19:00 UTC-4 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  52, 'group',
  (SELECT id FROM teams WHERE code = 'URU' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'FRA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-26T23:00:00Z',
  'New York/New Jersey'
);

-- GROUP I --

-- Match 33: Jun 16, 15:00 UTC-7 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  33, 'group',
  (SELECT id FROM teams WHERE code = 'ESP' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'NZL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-16T22:00:00Z',
  'Vancouver'
);

-- Match 34: Jun 16, 18:00 UTC-7 → 01:00 UTC Jun 17
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  34, 'group',
  (SELECT id FROM teams WHERE code = 'NOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CPV' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-17T01:00:00Z',
  'San Francisco'
);

-- Match 35: Jun 22, 15:00 UTC-4 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  35, 'group',
  (SELECT id FROM teams WHERE code = 'NZL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CPV' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-22T19:00:00Z',
  'Toronto'
);

-- Match 36: Jun 22, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  36, 'group',
  (SELECT id FROM teams WHERE code = 'ESP' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'NOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-22T22:00:00Z',
  'Miami'
);

-- Match 53: Jun 26, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  53, 'group',
  (SELECT id FROM teams WHERE code = 'CPV' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'ESP' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-26T19:00:00Z',
  'Seattle'
);

-- Match 54: Jun 26, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  54, 'group',
  (SELECT id FROM teams WHERE code = 'NZL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'NOR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-26T19:00:00Z',
  'Vancouver'
);

-- GROUP J --

-- Match 55: Jun 16, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  55, 'group',
  (SELECT id FROM teams WHERE code = 'POR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'PAN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-16T22:00:00Z',
  'Miami'
);

-- Match 56: Jun 17, 12:00 UTC-5 → 17:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  56, 'group',
  (SELECT id FROM teams WHERE code = 'CRO' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'COD' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-17T17:00:00Z',
  'Dallas'
);

-- Match 57: Jun 22, 12:00 UTC-5 → 17:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  57, 'group',
  (SELECT id FROM teams WHERE code = 'PAN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'COD' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-22T17:00:00Z',
  'Houston'
);

-- Match 58: Jun 22, 18:00 UTC-5 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  58, 'group',
  (SELECT id FROM teams WHERE code = 'POR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CRO' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-22T23:00:00Z',
  'Dallas'
);

-- Match 59: Jun 27, 15:00 UTC-4 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  59, 'group',
  (SELECT id FROM teams WHERE code = 'COD' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'POR' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-27T19:00:00Z',
  'Philadelphia'
);

-- Match 60: Jun 27, 15:00 UTC-4 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  60, 'group',
  (SELECT id FROM teams WHERE code = 'PAN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'CRO' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-27T19:00:00Z',
  'Miami'
);

-- GROUP K --

-- Match 61: Jun 17, 15:00 UTC-4 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  61, 'group',
  (SELECT id FROM teams WHERE code = 'BEL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'EGY' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-17T19:00:00Z',
  'New York/New Jersey'
);

-- Match 62: Jun 17, 18:00 UTC-5 → 23:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  62, 'group',
  (SELECT id FROM teams WHERE code = 'GHA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'IRQ' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-17T23:00:00Z',
  'Kansas City'
);

-- Match 63: Jun 23, 15:00 UTC-4 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  63, 'group',
  (SELECT id FROM teams WHERE code = 'EGY' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'IRQ' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-23T19:00:00Z',
  'Boston'
);

-- Match 64: Jun 23, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  64, 'group',
  (SELECT id FROM teams WHERE code = 'BEL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'GHA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-23T22:00:00Z',
  'Philadelphia'
);

-- Match 65: Jun 27, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  65, 'group',
  (SELECT id FROM teams WHERE code = 'IRQ' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'BEL' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-27T22:00:00Z',
  'Atlanta'
);

-- Match 66: Jun 27, 18:00 UTC-4 → 22:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  66, 'group',
  (SELECT id FROM teams WHERE code = 'EGY' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'GHA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-27T22:00:00Z',
  'Boston'
);

-- GROUP L --

-- Match 67: Jun 17, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  67, 'group',
  (SELECT id FROM teams WHERE code = 'AUT' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'KSA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-17T19:00:00Z',
  'Los Angeles'
);

-- Match 68: Jun 18, 18:00 UTC-7 → 01:00 UTC Jun 19
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  68, 'group',
  (SELECT id FROM teams WHERE code = 'SWE' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'TUN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-19T01:00:00Z',
  'San Francisco'
);

-- Match 69: Jun 23, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  69, 'group',
  (SELECT id FROM teams WHERE code = 'KSA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'TUN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-23T19:00:00Z',
  'Seattle'
);

-- Match 70: Jun 23, 18:00 UTC-7 → 01:00 UTC Jun 24
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  70, 'group',
  (SELECT id FROM teams WHERE code = 'AUT' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'SWE' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-24T01:00:00Z',
  'Los Angeles'
);

-- Match 71: Jun 27, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  71, 'group',
  (SELECT id FROM teams WHERE code = 'TUN' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'AUT' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-27T19:00:00Z',
  'Vancouver'
);

-- Match 72: Jun 27, 12:00 UTC-7 → 19:00 UTC
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  72, 'group',
  (SELECT id FROM teams WHERE code = 'KSA' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  (SELECT id FROM teams WHERE code = 'SWE' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026')),
  '2026-06-27T19:00:00Z',
  'Santa Clara'
);

-- ----------------------------------------------------------------
-- ROUND OF 32 (matches 73–88)
-- All team IDs NULL; slots stored in home_slot / away_slot
-- ----------------------------------------------------------------

-- Match 73: Jun 28, 12:00 UTC-5 → 17:00 UTC, Dallas
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  73, 'round_of_32', NULL, NULL, '1A', '3D/E/I/J/L',
  '2026-06-28T17:00:00Z',
  'Dallas'
);

-- Match 74: Jun 28, 15:00 UTC-4 → 19:00 UTC, New York/New Jersey
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  74, 'round_of_32', NULL, NULL, '2C', '2D',
  '2026-06-28T19:00:00Z',
  'New York/New Jersey'
);

-- Match 75: Jun 28, 18:00 UTC-4 → 22:00 UTC, Philadelphia
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  75, 'round_of_32', NULL, NULL, '1B', '3A/C/G/K',
  '2026-06-28T22:00:00Z',
  'Philadelphia'
);

-- Match 76: Jun 28, 21:00 UTC-4 → 01:00 UTC Jun 29, Miami
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  76, 'round_of_32', NULL, NULL, '1C', '3B/F/H/L',
  '2026-06-29T01:00:00Z',
  'Miami'
);

-- Match 77: Jun 29, 12:00 UTC-5 → 17:00 UTC, Houston
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  77, 'round_of_32', NULL, NULL, '1E', '3A/B/G/H',
  '2026-06-29T17:00:00Z',
  'Houston'
);

-- Match 78: Jun 29, 15:00 UTC-7 → 22:00 UTC, Los Angeles
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  78, 'round_of_32', NULL, NULL, '2A', '2B',
  '2026-06-29T22:00:00Z',
  'Los Angeles'
);

-- Match 79: Jun 29, 18:00 UTC-7 → 01:00 UTC Jun 30, San Francisco
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  79, 'round_of_32', NULL, NULL, '1D', '3C/E/I/K',
  '2026-06-30T01:00:00Z',
  'San Francisco'
);

-- Match 80: Jun 29, 20:00 UTC-4 → 00:00 UTC Jun 30, Atlanta
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  80, 'round_of_32', NULL, NULL, '1F', '3D/F/J/L',
  '2026-06-30T00:00:00Z',
  'Atlanta'
);

-- Match 81: Jul 1, 12:00 UTC-4 → 16:00 UTC, Toronto
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  81, 'round_of_32', NULL, NULL, '1G', '2L',
  '2026-07-01T16:00:00Z',
  'Toronto'
);

-- Match 82: Jul 1, 15:00 UTC-5 → 20:00 UTC, Kansas City
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  82, 'round_of_32', NULL, NULL, '1I', '2J',
  '2026-07-01T20:00:00Z',
  'Kansas City'
);

-- Match 83: Jul 1, 18:00 UTC-4 → 22:00 UTC, Boston
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  83, 'round_of_32', NULL, NULL, '1H', '2G',
  '2026-07-01T22:00:00Z',
  'Boston'
);

-- Match 84: Jul 1, 20:00 UTC-4 → 00:00 UTC Jul 2, Philadelphia
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  84, 'round_of_32', NULL, NULL, '1J', '2I',
  '2026-07-02T00:00:00Z',
  'Philadelphia'
);

-- Match 85: Jul 2, 12:00 UTC-7 → 19:00 UTC, Seattle
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  85, 'round_of_32', NULL, NULL, '1K', '2H',
  '2026-07-02T19:00:00Z',
  'Seattle'
);

-- Match 86: Jul 2, 15:00 UTC-7 → 22:00 UTC, Vancouver
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  86, 'round_of_32', NULL, NULL, '1L', '2K',
  '2026-07-02T22:00:00Z',
  'Vancouver'
);

-- Match 87: Jul 2, 18:00 UTC-5 → 23:00 UTC, Dallas
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  87, 'round_of_32', NULL, NULL, '2E', '2F',
  '2026-07-02T23:00:00Z',
  'Dallas'
);

-- Match 88: Jul 2, 18:00 UTC-5 → 23:00 UTC (same slot as 87, different venue per schedule)
-- Per openfootball: 2G vs 2H
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  88, 'round_of_32', NULL, NULL, '2G', '2H',
  '2026-07-03T01:00:00Z',
  'Kansas City'
);

-- ----------------------------------------------------------------
-- ROUND OF 16 (matches 89–96)
-- Dates/times per openfootball schedule (approx Jul 5–8)
-- Using slot labels derived from R32 winners; kickoffs TBC / placeholder
-- ----------------------------------------------------------------

-- Match 89: W73 vs W74, Jul 5
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  89, 'round_of_16', NULL, NULL, 'W73', 'W74',
  '2026-07-05T17:00:00Z',
  'TBD'
);

-- Match 90: W75 vs W76, Jul 5
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  90, 'round_of_16', NULL, NULL, 'W75', 'W76',
  '2026-07-05T21:00:00Z',
  'TBD'
);

-- Match 91: W77 vs W78, Jul 6
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  91, 'round_of_16', NULL, NULL, 'W77', 'W78',
  '2026-07-06T17:00:00Z',
  'TBD'
);

-- Match 92: W79 vs W80, Jul 6
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  92, 'round_of_16', NULL, NULL, 'W79', 'W80',
  '2026-07-06T21:00:00Z',
  'TBD'
);

-- Match 93: W81 vs W82, Jul 7
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  93, 'round_of_16', NULL, NULL, 'W81', 'W82',
  '2026-07-07T17:00:00Z',
  'TBD'
);

-- Match 94: W83 vs W84, Jul 7
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  94, 'round_of_16', NULL, NULL, 'W83', 'W84',
  '2026-07-07T21:00:00Z',
  'TBD'
);

-- Match 95: W85 vs W86, Jul 8
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  95, 'round_of_16', NULL, NULL, 'W85', 'W86',
  '2026-07-08T17:00:00Z',
  'TBD'
);

-- Match 96: W87 vs W88, Jul 8
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  96, 'round_of_16', NULL, NULL, 'W87', 'W88',
  '2026-07-08T21:00:00Z',
  'TBD'
);

-- ----------------------------------------------------------------
-- QUARTER-FINALS (matches 97–100)
-- Approx Jul 11–12
-- ----------------------------------------------------------------

-- Match 97: W89 vs W90, Jul 11
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  97, 'quarter', NULL, NULL, 'W89', 'W90',
  '2026-07-11T17:00:00Z',
  'TBD'
);

-- Match 98: W91 vs W92, Jul 11
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  98, 'quarter', NULL, NULL, 'W91', 'W92',
  '2026-07-11T21:00:00Z',
  'TBD'
);

-- Match 99: W93 vs W94, Jul 12
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  99, 'quarter', NULL, NULL, 'W93', 'W94',
  '2026-07-12T17:00:00Z',
  'TBD'
);

-- Match 100: W95 vs W96, Jul 12
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  100, 'quarter', NULL, NULL, 'W95', 'W96',
  '2026-07-12T21:00:00Z',
  'TBD'
);

-- ----------------------------------------------------------------
-- SEMI-FINALS (matches 101–102)
-- Approx Jul 15–16
-- ----------------------------------------------------------------

-- Match 101: W97 vs W98, Jul 15
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  101, 'semi', NULL, NULL, 'W97', 'W98',
  '2026-07-15T21:00:00Z',
  'TBD'
);

-- Match 102: W99 vs W100, Jul 16
INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  102, 'semi', NULL, NULL, 'W99', 'W100',
  '2026-07-16T21:00:00Z',
  'TBD'
);

-- ----------------------------------------------------------------
-- THIRD PLACE (match 103)
-- Jul 18, 15:00 UTC-4 → 19:00 UTC, New York/New Jersey
-- ----------------------------------------------------------------

INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  103, 'third_place', NULL, NULL, 'L101', 'L102',
  '2026-07-18T19:00:00Z',
  'New York/New Jersey'
);

-- ----------------------------------------------------------------
-- FINAL (match 104)
-- Jul 19, 15:00 UTC-4 → 19:00 UTC, New York/New Jersey
-- ----------------------------------------------------------------

INSERT INTO matches (tournament_id, match_number, stage, home_team_id, away_team_id, home_slot, away_slot, kickoff_at, venue)
VALUES (
  (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  104, 'final', NULL, NULL, 'W101', 'W102',
  '2026-07-19T19:00:00Z',
  'New York/New Jersey'
);
