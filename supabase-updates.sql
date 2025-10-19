-- Additional schema for live session tracking
-- Run this after the main migration

-- =====================================================
-- TABLE: session_updates
-- Track all updates during a live session
-- =====================================================
CREATE TABLE IF NOT EXISTS session_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Update type
  update_type TEXT NOT NULL, -- 'rebuy', 'addon', 'chip_spend', 'balance_check', 'note'

  -- Financial tracking
  amount DECIMAL(10, 2), -- For rebuys, addons, chip spends
  current_stack DECIMAL(10, 2), -- Current chip count/balance at time of update

  -- Notes
  notes TEXT,

  CONSTRAINT valid_update_type CHECK (update_type IN ('rebuy', 'addon', 'chip_spend', 'balance_check', 'note', 'break'))
);

-- Add index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_session_updates_session_id ON session_updates(session_id);
CREATE INDEX IF NOT EXISTS idx_session_updates_created_at ON session_updates(created_at DESC);

-- =====================================================
-- Update poker_sessions to better support live tracking
-- =====================================================

-- Add columns for live session tracking if they don't exist
ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_rebuys DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rebuy_count INTEGER DEFAULT 0;

-- Update the profit calculation to include rebuys
-- First drop the old generated column
ALTER TABLE poker_sessions DROP COLUMN IF EXISTS profit;

-- Add it back with the correct calculation
ALTER TABLE poker_sessions
  ADD COLUMN profit DECIMAL(10, 2) GENERATED ALWAYS AS (cash_out - (buy_in + total_rebuys)) STORED;

-- =====================================================
-- RLS Policies for session_updates
-- =====================================================

ALTER TABLE session_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view updates for own sessions" ON session_updates
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM poker_sessions WHERE id = session_updates.session_id
    )
  );

CREATE POLICY "Users can insert updates for own sessions" ON session_updates
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM poker_sessions WHERE id = session_updates.session_id
    )
  );

CREATE POLICY "Users can update own session updates" ON session_updates
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM poker_sessions WHERE id = session_updates.session_id
    )
  );

CREATE POLICY "Users can delete own session updates" ON session_updates
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM poker_sessions WHERE id = session_updates.session_id
    )
  );

-- =====================================================
-- Function to calculate total rebuys from session_updates
-- =====================================================
CREATE OR REPLACE FUNCTION update_session_rebuys()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE poker_sessions
  SET
    total_rebuys = (
      SELECT COALESCE(SUM(amount), 0)
      FROM session_updates
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        AND update_type IN ('rebuy', 'addon')
    ),
    rebuy_count = (
      SELECT COUNT(*)
      FROM session_updates
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        AND update_type = 'rebuy'
    )
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update rebuys when session_updates change
DROP TRIGGER IF EXISTS update_rebuys_on_session_update ON session_updates;
CREATE TRIGGER update_rebuys_on_session_update
  AFTER INSERT OR UPDATE OR DELETE ON session_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_session_rebuys();
