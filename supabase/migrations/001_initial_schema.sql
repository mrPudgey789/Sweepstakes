-- World Cup Sweepstakes - Initial Schema
-- Implements the data model from spec/data-model.md
-- The platform never holds, touches, or routes the entry-money pot.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE sweepstake_mode AS ENUM ('random', 'pick_your_own');
CREATE TYPE winner_structure AS ENUM ('single', 'top_three');
CREATE TYPE sweepstake_status AS ENUM ('draft', 'open', 'drawn', 'closed');
CREATE TYPE payment_state AS ENUM ('unpaid', 'marked_paid', 'confirmed');
CREATE TYPE match_stage AS ENUM ('group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished');
CREATE TYPE team_status AS ENUM ('active', 'eliminated');
CREATE TYPE result_source AS ENUM ('feed', 'manual_override');
CREATE TYPE stripe_payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE notification_type AS ENUM ('join_confirmation', 'payment_confirmed', 'knockout', 'standings_update');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed');
CREATE TYPE pricing_band AS ENUM ('1_10', '11_50', '50_plus');

-- ============================================================
-- TABLES
-- ============================================================

-- Tournament (one row for v1: the 2026 World Cup)
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  external_competition_ref TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL
);

-- Organiser (account holder who creates sweepstakes)
CREATE TABLE organisers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  auth_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  paypal_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Player (lighter participant, email required)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  auth_id UUID UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team (national team in the tournament)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  group_letter TEXT NOT NULL,
  crest_url TEXT,
  status team_status NOT NULL DEFAULT 'active',
  eliminated_at TIMESTAMPTZ,
  external_ref TEXT
);

-- Sweepstake (central configuration object)
CREATE TABLE sweepstakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organiser_id UUID NOT NULL REFERENCES organisers(id),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  name TEXT NOT NULL,
  mode sweepstake_mode NOT NULL,
  entry_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  winner_structure winner_structure NOT NULL DEFAULT 'single',
  paypal_link TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  share_slug TEXT NOT NULL UNIQUE,
  status sweepstake_status NOT NULL DEFAULT 'draft',
  max_players INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  drawn_at TIMESTAMPTZ
);

-- Entry (links player to sweepstake and team; holds payment STATE only)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sweepstake_id UUID NOT NULL REFERENCES sweepstakes(id),
  player_id UUID NOT NULL REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  payment_state payment_state NOT NULL DEFAULT 'unpaid',
  marked_paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  payment_proof_url TEXT,
  tc_accepted_at TIMESTAMPTZ NOT NULL,
  final_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sweepstake_id, player_id)
);

-- Match (fixture, global)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  stage match_stage NOT NULL,
  kickoff_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  status match_status NOT NULL DEFAULT 'scheduled',
  external_ref TEXT
);

-- Result (outcome of a match, separated for manual override)
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) UNIQUE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  winner_team_id UUID REFERENCES teams(id),
  source result_source NOT NULL DEFAULT 'feed',
  overridden_by UUID REFERENCES organisers(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Standing (derived ranking per sweepstake, materialised)
CREATE TABLE standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sweepstake_id UUID NOT NULL REFERENCES sweepstakes(id),
  entry_id UUID NOT NULL REFERENCES entries(id),
  rank INTEGER NOT NULL,
  team_stage match_stage NOT NULL DEFAULT 'group',
  is_eliminated BOOLEAN NOT NULL DEFAULT FALSE,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sweepstake_id, entry_id)
);

-- Notification (email record)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id),
  type notification_type NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status notification_status NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'
);

-- Payment (Stripe software fee ONLY - never the entry pot)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sweepstake_id UUID NOT NULL REFERENCES sweepstakes(id),
  organiser_id UUID NOT NULL REFERENCES organisers(id),
  stripe_payment_intent_id TEXT,
  band pricing_band NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  status stripe_payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_teams_tournament ON teams(tournament_id);
CREATE INDEX idx_sweepstakes_organiser ON sweepstakes(organiser_id);
CREATE INDEX idx_sweepstakes_join_code ON sweepstakes(join_code);
CREATE INDEX idx_sweepstakes_share_slug ON sweepstakes(share_slug);
CREATE INDEX idx_entries_sweepstake ON entries(sweepstake_id);
CREATE INDEX idx_entries_player ON entries(player_id);
CREATE INDEX idx_entries_team ON entries(team_id);
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_standings_sweepstake ON standings(sweepstake_id);
CREATE INDEX idx_notifications_entry ON notifications(entry_id);
CREATE INDEX idx_payments_sweepstake ON payments(sweepstake_id);

-- Unique constraint: one team per sweepstake in pick-your-own mode
-- (enforced at application level since it depends on mode)

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE organisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweepstakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Tournaments and teams: readable by everyone
CREATE POLICY "Tournaments are readable by all" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Teams are readable by all" ON teams FOR SELECT USING (true);
CREATE POLICY "Matches are readable by all" ON matches FOR SELECT USING (true);
CREATE POLICY "Results are readable by all" ON results FOR SELECT USING (true);

-- Organisers: can read/update own record
CREATE POLICY "Organisers can read own record" ON organisers
  FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Organisers can update own record" ON organisers
  FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "Organisers can insert own record" ON organisers
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Players: can read/update own record
CREATE POLICY "Players can read own record" ON players
  FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Players can update own record" ON players
  FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "Players can insert own record" ON players
  FOR INSERT WITH CHECK (true);

-- Sweepstakes: organiser can CRUD own; players can read joined
CREATE POLICY "Organiser can manage own sweepstakes" ON sweepstakes
  FOR ALL USING (
    organiser_id IN (SELECT id FROM organisers WHERE auth_id = auth.uid())
  );
CREATE POLICY "Anyone can read open sweepstakes" ON sweepstakes
  FOR SELECT USING (status != 'draft');

-- Entries: organiser of sweepstake can read all; player can read/manage own
CREATE POLICY "Players can read own entries" ON entries
  FOR SELECT USING (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );
CREATE POLICY "Players can insert entries" ON entries
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can update own entry payment state" ON entries
  FOR UPDATE USING (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );
CREATE POLICY "Organiser can read all entries in own sweepstake" ON entries
  FOR SELECT USING (
    sweepstake_id IN (
      SELECT s.id FROM sweepstakes s
      JOIN organisers o ON s.organiser_id = o.id
      WHERE o.auth_id = auth.uid()
    )
  );
CREATE POLICY "Organiser can update entries in own sweepstake" ON entries
  FOR UPDATE USING (
    sweepstake_id IN (
      SELECT s.id FROM sweepstakes s
      JOIN organisers o ON s.organiser_id = o.id
      WHERE o.auth_id = auth.uid()
    )
  );

-- Standings: readable by participants
CREATE POLICY "Standings are readable by participants" ON standings
  FOR SELECT USING (
    sweepstake_id IN (
      SELECT sweepstake_id FROM entries
      WHERE player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
    )
    OR
    sweepstake_id IN (
      SELECT s.id FROM sweepstakes s
      JOIN organisers o ON s.organiser_id = o.id
      WHERE o.auth_id = auth.uid()
    )
  );

-- Notifications: readable by the entry owner
CREATE POLICY "Players can read own notifications" ON notifications
  FOR SELECT USING (
    entry_id IN (
      SELECT id FROM entries
      WHERE player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
    )
  );

-- Payments: organiser can read own
CREATE POLICY "Organiser can read own payments" ON payments
  FOR SELECT USING (
    organiser_id IN (SELECT id FROM organisers WHERE auth_id = auth.uid())
  );
