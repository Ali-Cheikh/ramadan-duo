/*
  # Add Achievements/Badges Table

  Tracks user achievements and streak milestones
*/

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type text NOT NULL CHECK (badge_type IN (
    'streak_3',
    'streak_7',
    'streak_14',
    'streak_30',
    'perfect_day',
    'first_friend',
    'charity_warrior',
    'quran_master'
  )),
  milestone_value integer,
  earned_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type, milestone_value)
);

-- Add RLS policies for achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Users can read their own achievements
CREATE POLICY "Users can read own achievements"
  ON achievements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can update achievements
CREATE POLICY "Service role can update achievements"
  ON achievements
  USING (true)
  WITH CHECK (true);

-- Indexes for achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_badge_type ON achievements(badge_type);
CREATE INDEX IF NOT EXISTS idx_achievements_earned_at ON achievements(earned_at DESC);
