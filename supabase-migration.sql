-- Poker Bankroll Tracker Database Schema
-- Based on gym-logger architecture

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: profiles
-- User profiles and settings
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User settings
  currency TEXT DEFAULT 'USD',
  default_game_type TEXT DEFAULT 'cash',
  default_variant TEXT DEFAULT 'nlhe',
  timezone TEXT DEFAULT 'UTC',

  -- Stats (auto-calculated)
  total_sessions INTEGER DEFAULT 0,
  total_profit DECIMAL(10, 2) DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  current_bankroll DECIMAL(10, 2) DEFAULT 0,
  last_session_date DATE,

  -- Public profile support
  is_public BOOLEAN DEFAULT FALSE,
  public_username TEXT UNIQUE,
  display_name TEXT,

  CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CNY')),
  CONSTRAINT valid_game_type CHECK (default_game_type IN ('cash', 'tournament', 'sng'))
);

-- =====================================================
-- TABLE: poker_sessions
-- Individual poker sessions
-- =====================================================
CREATE TABLE poker_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Session details
  session_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_hours DECIMAL(10, 2), -- Auto-calculated or manual

  -- Game information
  game_type TEXT NOT NULL, -- cash, tournament, sng
  variant TEXT NOT NULL, -- nlhe, plo, omaha, stud, mixed, etc.
  stakes TEXT, -- e.g., "1/2", "5/10", "$100 buy-in"

  -- Location
  location TEXT, -- e.g., "Bellagio", "Online - PokerStars", "Home Game"
  location_type TEXT DEFAULT 'live', -- live, online

  -- Financial
  buy_in DECIMAL(10, 2) NOT NULL,
  cash_out DECIMAL(10, 2) NOT NULL,
  profit DECIMAL(10, 2) GENERATED ALWAYS AS (cash_out - buy_in) STORED,

  -- Session stats
  hands_played INTEGER,

  -- Notes
  notes TEXT,
  session_name TEXT,

  -- Metadata
  is_ongoing BOOLEAN DEFAULT FALSE,

  CONSTRAINT valid_game_type CHECK (game_type IN ('cash', 'tournament', 'sng')),
  CONSTRAINT valid_location_type CHECK (location_type IN ('live', 'online')),
  CONSTRAINT valid_buy_in CHECK (buy_in >= 0),
  CONSTRAINT valid_cash_out CHECK (cash_out >= 0)
);

-- =====================================================
-- TABLE: game_variants
-- Master list of poker variants
-- =====================================================
CREATE TABLE game_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT, -- holdem, omaha, stud, mixed, other
  alternate_names TEXT[], -- For fuzzy matching

  CONSTRAINT valid_category CHECK (category IN ('holdem', 'omaha', 'stud', 'mixed', 'other'))
);

-- Insert common poker variants
INSERT INTO game_variants (canonical_name, display_name, category, alternate_names) VALUES
('nlhe', 'No-Limit Hold''em', 'holdem', ARRAY['texas holdem', 'holdem', 'texas', 'nlh']),
('lhe', 'Limit Hold''em', 'holdem', ARRAY['limit holdem', 'lh']),
('plo', 'Pot-Limit Omaha', 'omaha', ARRAY['omaha', 'plo', 'pot limit omaha']),
('plo5', 'Pot-Limit Omaha 5-card', 'omaha', ARRAY['5-card plo', 'plo5']),
('stud', '7-Card Stud', 'stud', ARRAY['7 stud', 'stud']),
('razz', 'Razz', 'stud', ARRAY['razz']),
('horse', 'HORSE', 'mixed', ARRAY['horse']),
('8game', '8-Game Mix', 'mixed', ARRAY['8-game', 'mixed games']);

-- =====================================================
-- TABLE: user_stats
-- Aggregated statistics per user
-- =====================================================
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Stats by game type
  game_type TEXT,
  variant TEXT,
  location_type TEXT,

  -- Aggregated data
  total_sessions INTEGER DEFAULT 0,
  total_profit DECIMAL(10, 2) DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  total_hands INTEGER DEFAULT 0,

  -- Derived metrics
  win_rate DECIMAL(10, 2), -- profit / hour
  roi DECIMAL(10, 4), -- (profit / total buy-in) * 100

  -- Tracking
  last_played DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_game_stat UNIQUE (user_id, game_type, variant, location_type)
);

-- =====================================================
-- TABLE: session_tags
-- Tags for categorizing sessions
-- =====================================================
CREATE TABLE session_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,

  CONSTRAINT unique_session_tag UNIQUE (session_id, tag)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_poker_sessions_user_id ON poker_sessions(user_id);
CREATE INDEX idx_poker_sessions_date ON poker_sessions(session_date DESC);
CREATE INDEX idx_poker_sessions_game_type ON poker_sessions(game_type);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_session_tags_session_id ON session_tags(session_id);
CREATE INDEX idx_profiles_public_username ON profiles(public_username) WHERE public_username IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_variants ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles viewable by all" ON profiles
  FOR SELECT USING (is_public = TRUE);

-- Poker sessions policies
CREATE POLICY "Users can view own sessions" ON poker_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON poker_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON poker_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON poker_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Session tags policies
CREATE POLICY "Users can view tags for own sessions" ON session_tags
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM poker_sessions WHERE id = session_tags.session_id
    )
  );

CREATE POLICY "Users can insert tags for own sessions" ON session_tags
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM poker_sessions WHERE id = session_tags.session_id
    )
  );

CREATE POLICY "Users can delete tags for own sessions" ON session_tags
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM poker_sessions WHERE id = session_tags.session_id
    )
  );

-- Game variants (public read)
CREATE POLICY "Anyone can view game variants" ON game_variants
  FOR SELECT USING (TRUE);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Update profile stats after session insert/update/delete
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    total_sessions = (
      SELECT COUNT(*) FROM poker_sessions WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    total_profit = (
      SELECT COALESCE(SUM(profit), 0) FROM poker_sessions WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    total_hours = (
      SELECT COALESCE(SUM(duration_hours), 0) FROM poker_sessions WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    last_session_date = (
      SELECT MAX(session_date) FROM poker_sessions WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update user stats after session changes
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user_stats for this game type/variant combo
  INSERT INTO user_stats (user_id, game_type, variant, location_type, total_sessions, total_profit, total_hours, total_hands, last_played, updated_at)
  SELECT
    user_id,
    game_type,
    variant,
    location_type,
    COUNT(*) as total_sessions,
    SUM(profit) as total_profit,
    SUM(duration_hours) as total_hours,
    SUM(hands_played) as total_hands,
    MAX(session_date) as last_played,
    NOW() as updated_at
  FROM poker_sessions
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND game_type = COALESCE(NEW.game_type, OLD.game_type)
    AND variant = COALESCE(NEW.variant, OLD.variant)
    AND location_type = COALESCE(NEW.location_type, OLD.location_type)
  GROUP BY user_id, game_type, variant, location_type
  ON CONFLICT (user_id, game_type, variant, location_type)
  DO UPDATE SET
    total_sessions = EXCLUDED.total_sessions,
    total_profit = EXCLUDED.total_profit,
    total_hours = EXCLUDED.total_hours,
    total_hands = EXCLUDED.total_hands,
    last_played = EXCLUDED.last_played,
    updated_at = EXCLUDED.updated_at,
    win_rate = CASE WHEN EXCLUDED.total_hours > 0 THEN EXCLUDED.total_profit / EXCLUDED.total_hours ELSE 0 END,
    roi = CASE
      WHEN (SELECT SUM(buy_in) FROM poker_sessions WHERE user_id = EXCLUDED.user_id) > 0
      THEN (EXCLUDED.total_profit / (SELECT SUM(buy_in) FROM poker_sessions WHERE user_id = EXCLUDED.user_id)) * 100
      ELSE 0
    END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, created_at)
  VALUES (NEW.id, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON poker_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Profile stats triggers
CREATE TRIGGER update_profile_stats_insert
  AFTER INSERT ON poker_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats();

CREATE TRIGGER update_profile_stats_update
  AFTER UPDATE ON poker_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats();

CREATE TRIGGER update_profile_stats_delete
  AFTER DELETE ON poker_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats();

-- User stats triggers
CREATE TRIGGER update_user_stats_insert
  AFTER INSERT ON poker_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER update_user_stats_update
  AFTER UPDATE ON poker_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER update_user_stats_delete
  AFTER DELETE ON poker_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
