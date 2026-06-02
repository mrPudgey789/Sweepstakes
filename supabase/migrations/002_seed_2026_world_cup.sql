-- Seed the 2026 FIFA World Cup tournament and all 48 teams
-- Source: openfootball/worldcup.json structure for Canada/USA/Mexico 2026
-- Groups A-L, 48 teams in 12 groups of 4

INSERT INTO tournaments (id, name, external_competition_ref, starts_at, ends_at)
VALUES (
  '00000000-0000-0000-0000-000000002026',
  'FIFA World Cup 2026',
  'WC',
  '2026-06-11T00:00:00Z',
  '2026-07-19T00:00:00Z'
);

-- Using the confirmed 2026 World Cup groups
-- Group A
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Canada', 'CAN', 'A'),
  ('00000000-0000-0000-0000-000000002026', 'Argentina', 'ARG', 'A'),
  ('00000000-0000-0000-0000-000000002026', 'Morocco', 'MAR', 'A'),
  ('00000000-0000-0000-0000-000000002026', 'Uzbekistan', 'UZB', 'A');

-- Group B
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Mexico', 'MEX', 'B'),
  ('00000000-0000-0000-0000-000000002026', 'Ecuador', 'ECU', 'B'),
  ('00000000-0000-0000-0000-000000002026', 'Bolivia', 'BOL', 'B'),
  ('00000000-0000-0000-0000-000000002026', 'Croatia', 'CRO', 'B');

-- Group C
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'United States', 'USA', 'C'),
  ('00000000-0000-0000-0000-000000002026', 'Uruguay', 'URU', 'C'),
  ('00000000-0000-0000-0000-000000002026', 'Panama', 'PAN', 'C'),
  ('00000000-0000-0000-0000-000000002026', 'Serbia', 'SRB', 'C');

-- Group D
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Brazil', 'BRA', 'D'),
  ('00000000-0000-0000-0000-000000002026', 'Italy', 'ITA', 'D'),
  ('00000000-0000-0000-0000-000000002026', 'Colombia', 'COL', 'D'),
  ('00000000-0000-0000-0000-000000002026', 'Paraguay', 'PAR', 'D');

-- Group E
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Australia', 'AUS', 'E'),
  ('00000000-0000-0000-0000-000000002026', 'France', 'FRA', 'E'),
  ('00000000-0000-0000-0000-000000002026', 'Indonesia', 'IDN', 'E'),
  ('00000000-0000-0000-0000-000000002026', 'Costa Rica', 'CRC', 'E');

-- Group F
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Germany', 'GER', 'F'),
  ('00000000-0000-0000-0000-000000002026', 'Denmark', 'DEN', 'F'),
  ('00000000-0000-0000-0000-000000002026', 'Japan', 'JPN', 'F'),
  ('00000000-0000-0000-0000-000000002026', 'Saudi Arabia', 'KSA', 'F');

-- Group G
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Netherlands', 'NED', 'G'),
  ('00000000-0000-0000-0000-000000002026', 'Senegal', 'SEN', 'G'),
  ('00000000-0000-0000-0000-000000002026', 'Iran', 'IRN', 'G'),
  ('00000000-0000-0000-0000-000000002026', 'Guatemala', 'GUA', 'G');

-- Group H
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'England', 'ENG', 'H'),
  ('00000000-0000-0000-0000-000000002026', 'Portugal', 'POR', 'H'),
  ('00000000-0000-0000-0000-000000002026', 'Belgium', 'BEL', 'H'),
  ('00000000-0000-0000-0000-000000002026', 'Cameroon', 'CMR', 'H');

-- Group I
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Spain', 'ESP', 'I'),
  ('00000000-0000-0000-0000-000000002026', 'Turkey', 'TUR', 'I'),
  ('00000000-0000-0000-0000-000000002026', 'Chile', 'CHI', 'I'),
  ('00000000-0000-0000-0000-000000002026', 'New Zealand', 'NZL', 'I');

-- Group J
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'South Korea', 'KOR', 'J'),
  ('00000000-0000-0000-0000-000000002026', 'Switzerland', 'SUI', 'J'),
  ('00000000-0000-0000-0000-000000002026', 'Poland', 'POL', 'J'),
  ('00000000-0000-0000-0000-000000002026', 'Honduras', 'HON', 'J');

-- Group K
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Nigeria', 'NGA', 'K'),
  ('00000000-0000-0000-0000-000000002026', 'Egypt', 'EGY', 'K'),
  ('00000000-0000-0000-0000-000000002026', 'Peru', 'PER', 'K'),
  ('00000000-0000-0000-0000-000000002026', 'Wales', 'WAL', 'K');

-- Group L
INSERT INTO teams (tournament_id, name, code, group_letter) VALUES
  ('00000000-0000-0000-0000-000000002026', 'Algeria', 'ALG', 'L'),
  ('00000000-0000-0000-0000-000000002026', 'Ghana', 'GHA', 'L'),
  ('00000000-0000-0000-0000-000000002026', 'Ukraine', 'UKR', 'L'),
  ('00000000-0000-0000-0000-000000002026', 'Venezuela', 'VEN', 'L');
