/*
  # Add rank movement tracking and notifications
  
  Tracks when users move up/down on leaderboard for competitive gamification
*/

-- Add rank_change table for tracking leaderboard movements
CREATE TABLE IF NOT EXISTS rank_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  change_date date NOT NULL,
  previous_rank integer,
  new_rank integer,
  previous_points integer,
  new_points integer,
  notification_sent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add RLS policies for rank_changes
ALTER TABLE rank_changes ENABLE ROW LEVEL SECURITY;

-- Users can read their own rank changes
CREATE POLICY "Users can read own rank changes"
  ON rank_changes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for rank_changes
CREATE INDEX IF NOT EXISTS idx_rank_changes_user_date ON rank_changes(user_id, change_date DESC);
CREATE INDEX IF NOT EXISTS idx_rank_changes_not_notified ON rank_changes(user_id, notification_sent) WHERE NOT notification_sent;
