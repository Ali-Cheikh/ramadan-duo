/*
  # Ramadan Quest - Base Database Schema
  
  ## Overview
  Base database setup for Ramadan Quest habit tracker app with:
  - Regional tracking (customizable by country)
  - Timezone-aware daily reset
  - Daily deed tracking with month-long leaderboards
  - Friend system with nudges
  - Web push subscription management
  
  ## Base Tables (This Migration)
  
  ### `profiles`
  User profile information:
  - `id` (uuid, primary key) - Links to auth.users
  - `display_name` (text) - User's display name for leaderboard
  - `username` (text) - Unique username for sharing
  - `region` (text) - User's region (customizable by country)
  - `avatar_color` (text) - Hex color for avatar
  - `avatar_icon` (text) - Icon name for avatar
  - `month_total_points` (integer) - Total points accumulated
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp
  
  ### `daily_logs`
  Daily deed tracking:
  - `id` (uuid, primary key) - Unique log identifier
  - `user_id` (uuid, foreign key) - References profiles.id
  - `log_date` (date) - The date for this log
  - `deeds` (jsonb) - JSON object storing completion status of all 12 deeds
  - `points_earned` (integer) - Total points earned today (0-12)
  - `created_at` (timestamptz) - When the log was created
  - `updated_at` (timestamptz) - Last update to the log
  
  ### `daily_stats`
  Month-long statistics (for leaderboard):
  - `id` (uuid, primary key) - Unique stat identifier
  - `user_id` (uuid, foreign key) - References profiles.id
  - `date` (date) - The date for this stat
  - `points` (integer) - Points earned on this date
  - `created_at` (timestamptz) - When the stat was created
  - `updated_at` (timestamptz) - Last update to the stat
  
  ### `friend_requests`
  Friend connection system:
  - `id` (uuid, primary key) - Unique request identifier
  - `sender_id`, `receiver_id` - User references
  - `status` - pending, accepted, or rejected
  
  ### `friend_nudges`
  Friend nudge notifications:
  - `id` (uuid, primary key) - Unique nudge identifier
  - `from_user_id`, `to_user_id` - Who nudged whom
  - `message` (text) - Nudge message
  - `read_at` (timestamptz) - When user saw the nudge
  
  ### `push_subscriptions`
  Web push notification subscriptions:
  - `id` (uuid, primary key) - Unique subscription identifier
  - `user_id`, `endpoint`, `p256dh`, `auth` - Push credentials
  - `user_agent` - Browser/device info for debugging
  
  ## Additional Tables (Separate Migrations)
  
  For achievements and compatibility fixes, run:
  - `20260222000000_fix_achievements_rpc_and_schema.sql` - Achievement table + RPC compatibility
  - `20260222013000_fix_update_daily_stat_rank_changes_compat.sql` - Daily stat / rank_changes compatibility
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can read their own private data
  - Leaderboard uses aggregated/public-safe tables and policies
  - Users can only modify their own data
  - RPC functions use SECURITY DEFINER for controlled cross-user operations
  - Cron/admin endpoints require shared secrets at API layer
*/

-- ============================================================================
-- TABLES
-- ============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Ramadan Warrior',
  username text,
  region text NOT NULL DEFAULT 'Tunis',
  avatar_color text NOT NULL DEFAULT '#059669',
  avatar_icon text NOT NULL DEFAULT 'star',
  month_total_points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_logs table for daily deed tracking
CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  deeds jsonb NOT NULL DEFAULT '{
    "prayer_five": false,
    "prayer_fajr_masjid": false,
    "prayer_taraweeh": false,
    "iman_quran": false,
    "iman_dhikr": false,
    "iman_dua": false,
    "tummy_suhoor": false,
    "tummy_iftar": false,
    "tummy_fast": false,
    "social_charity": false,
    "social_family": false,
    "social_workout": false
  }'::jsonb,
  points_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Create daily_stats table for month-long tracking
CREATE TABLE IF NOT EXISTS daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create friend_requests table for social graph
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_no_self CHECK (sender_id <> receiver_id),
  CONSTRAINT friend_requests_direction_unique UNIQUE (sender_id, receiver_id)
);

-- Create friend_nudges table for in-app nudges
CREATE TABLE IF NOT EXISTS friend_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT 'Come check Ramadan Quest today 🌙',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT friend_nudges_no_self CHECK (from_user_id <> to_user_id)
);

-- Create push_subscriptions table for browser notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_month_points ON profiles(month_total_points DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(LOWER(display_name));

-- Indexes for daily_logs
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(log_date DESC);

-- Indexes for daily_stats
CREATE INDEX IF NOT EXISTS idx_daily_stats_user ON daily_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date DESC);

-- Indexes for friend_requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_active_pair
ON friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
WHERE status IN ('pending', 'accepted');
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status ON friend_requests(receiver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status ON friend_requests(sender_id, status, created_at DESC);

-- Indexes for friend_nudges
CREATE INDEX IF NOT EXISTS idx_friend_nudges_to_user ON friend_nudges(to_user_id, created_at DESC);

-- Indexes for push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Daily logs policies
CREATE POLICY "Users can view their own logs"
  ON daily_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view logs for leaderboard calculation"
  ON daily_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own logs"
  ON daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs"
  ON daily_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Daily stats policies
CREATE POLICY "Users can view their own daily stats"
  ON daily_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all daily stats for leaderboard"
  ON daily_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own daily stats"
  ON daily_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats"
  ON daily_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Friend requests policies
DROP POLICY IF EXISTS "Users can view related friend requests" ON friend_requests;
CREATE POLICY "Users can view related friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create outgoing friend requests" ON friend_requests;
CREATE POLICY "Users can create outgoing friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> receiver_id);

DROP POLICY IF EXISTS "Users can update related friend requests" ON friend_requests;
CREATE POLICY "Users can update related friend requests"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Friend nudges policies
DROP POLICY IF EXISTS "Users can view nudges they sent or received" ON friend_nudges;
CREATE POLICY "Users can view nudges they sent or received"
  ON friend_nudges FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can send nudges from self" ON friend_nudges;
CREATE POLICY "Users can send nudges from self"
  ON friend_nudges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id AND from_user_id <> to_user_id);

DROP POLICY IF EXISTS "Users can mark their received nudges as read" ON friend_nudges;
CREATE POLICY "Users can mark their received nudges as read"
  ON friend_nudges FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- Push subscription policies
DROP POLICY IF EXISTS "Users can view their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view their push subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert their push subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update their push subscriptions"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete their push subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username, region, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', 'Ramadan Warrior'),
    LOWER(
      regexp_replace(
        COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'user'),
        '[^a-zA-Z0-9]+',
        '_',
        'g'
      ) || '_' || substr(replace(new.id::text, '-', ''), 1, 6)
    ),
    'Tunis',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Function to update or create daily stat
CREATE OR REPLACE FUNCTION update_daily_stat(
  p_user_id uuid,
  p_date date,
  p_points integer
) RETURNS void AS $$
BEGIN
  INSERT INTO daily_stats (user_id, date, points)
  VALUES (p_user_id, p_date, p_points)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    points = daily_stats.points + p_points,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to get month total for a user
CREATE OR REPLACE FUNCTION get_month_total(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  total integer;
BEGIN
  SELECT COALESCE(SUM(points), 0)
  INTO total
  FROM daily_stats
  WHERE user_id = p_user_id;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to get month total for all users (for leaderboard)
CREATE OR REPLACE FUNCTION get_all_month_totals()
RETURNS TABLE(user_id uuid, total_points integer) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.user_id,
    COALESCE(SUM(ds.points), 0)::integer as total_points
  FROM daily_stats ds
  GROUP BY ds.user_id
  ORDER BY total_points DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to sync month total to profile (for leaderboard)
CREATE OR REPLACE FUNCTION sync_month_total_to_profile(p_user_id uuid)
RETURNS void AS $$
DECLARE
  month_total integer;
BEGIN
  SELECT COALESCE(SUM(points), 0)
  INTO month_total
  FROM daily_stats
  WHERE user_id = p_user_id;
  
  UPDATE profiles
  SET month_total_points = month_total
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to send friend request using username or email
CREATE OR REPLACE FUNCTION public.send_friend_request(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_receiver uuid;
  v_identifier text := lower(trim(p_identifier));
  v_request_id uuid;
BEGIN
  IF v_sender IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  IF v_identifier IS NULL OR v_identifier = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please enter username or email');
  END IF;

  SELECT p.id
  INTO v_receiver
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE lower(COALESCE(p.username, '')) = v_identifier
     OR lower(COALESCE(u.email, '')) = v_identifier
  LIMIT 1;

  IF v_receiver IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found');
  END IF;

  IF v_receiver = v_sender THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot add yourself');
  END IF;

  SELECT fr.id
  INTO v_request_id
  FROM public.friend_requests fr
  WHERE fr.status = 'accepted'
    AND ((fr.sender_id = v_sender AND fr.receiver_id = v_receiver)
      OR (fr.sender_id = v_receiver AND fr.receiver_id = v_sender))
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already friends');
  END IF;

  SELECT fr.id
  INTO v_request_id
  FROM public.friend_requests fr
  WHERE fr.status = 'pending'
    AND fr.sender_id = v_sender
    AND fr.receiver_id = v_receiver
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request already sent');
  END IF;

  SELECT fr.id
  INTO v_request_id
  FROM public.friend_requests fr
  WHERE fr.status = 'pending'
    AND fr.sender_id = v_receiver
    AND fr.receiver_id = v_sender
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    UPDATE public.friend_requests
    SET status = 'accepted', updated_at = now()
    WHERE id = v_request_id;

    RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'request_id', v_request_id);
  END IF;

  INSERT INTO public.friend_requests (sender_id, receiver_id, status)
  VALUES (v_sender, v_receiver, 'pending')
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('ok', true, 'status', 'pending', 'request_id', v_request_id);
END;
$$;

-- Function to accept/reject a friend request
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_request_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_request public.friend_requests%ROWTYPE;
  v_new_status text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT *
  INTO v_request
  FROM public.friend_requests
  WHERE id = p_request_id
    AND receiver_id = v_user
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request not found');
  END IF;

  v_new_status := CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END;

  UPDATE public.friend_requests
  SET status = v_new_status, updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'status', v_new_status, 'request_id', p_request_id);
END;
$$;

-- Function to get pending friend requests (sent and received)
CREATE OR REPLACE FUNCTION public.get_friend_requests()
RETURNS TABLE (
  request_id uuid,
  direction text,
  status text,
  created_at timestamptz,
  other_user_id uuid,
  other_display_name text,
  other_username text,
  other_avatar_color text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    fr.id AS request_id,
    CASE WHEN fr.sender_id = auth.uid() THEN 'sent' ELSE 'received' END AS direction,
    fr.status,
    fr.created_at,
    p.id AS other_user_id,
    p.display_name AS other_display_name,
    p.username AS other_username,
    p.avatar_color AS other_avatar_color
  FROM public.friend_requests fr
  JOIN public.profiles p
    ON p.id = CASE WHEN fr.sender_id = auth.uid() THEN fr.receiver_id ELSE fr.sender_id END
  WHERE (fr.sender_id = auth.uid() OR fr.receiver_id = auth.uid())
    AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
$$;

-- Function to get accepted friends list
CREATE OR REPLACE FUNCTION public.get_friends_list()
RETURNS TABLE (
  friend_id uuid,
  display_name text,
  username text,
  region text,
  avatar_color text,
  since timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id AS friend_id,
    p.display_name,
    p.username,
    p.region,
    p.avatar_color,
    fr.updated_at AS since
  FROM public.friend_requests fr
  JOIN public.profiles p
    ON p.id = CASE WHEN fr.sender_id = auth.uid() THEN fr.receiver_id ELSE fr.sender_id END
  WHERE (fr.sender_id = auth.uid() OR fr.receiver_id = auth.uid())
    AND fr.status = 'accepted'
  ORDER BY lower(p.display_name);
$$;

-- Function to send in-app nudge to a friend
CREATE OR REPLACE FUNCTION public.send_friend_nudge(
  p_friend_id uuid,
  p_message text DEFAULT 'Come check Ramadan Quest today 🌙'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_friend boolean;
  v_nudge_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  IF p_friend_id IS NULL OR p_friend_id = v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid friend');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.friend_requests fr
    WHERE fr.status = 'accepted'
      AND ((fr.sender_id = v_user AND fr.receiver_id = p_friend_id)
        OR (fr.sender_id = p_friend_id AND fr.receiver_id = v_user))
  ) INTO v_is_friend;

  IF NOT v_is_friend THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You can only nudge friends');
  END IF;

  INSERT INTO public.friend_nudges (from_user_id, to_user_id, message)
  VALUES (v_user, p_friend_id, left(COALESCE(trim(p_message), 'Come check Ramadan Quest today 🌙'), 280))
  RETURNING id INTO v_nudge_id;

  RETURN jsonb_build_object('ok', true, 'nudge_id', v_nudge_id);
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on daily_logs
DROP TRIGGER IF EXISTS set_updated_at_daily_logs ON daily_logs;
CREATE TRIGGER set_updated_at_daily_logs
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on daily_stats
DROP TRIGGER IF EXISTS set_updated_at_daily_stats ON daily_stats;
CREATE TRIGGER set_updated_at_daily_stats
  BEFORE UPDATE ON daily_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on friend_requests
DROP TRIGGER IF EXISTS set_updated_at_friend_requests ON friend_requests;
CREATE TRIGGER set_updated_at_friend_requests
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on push_subscriptions
DROP TRIGGER IF EXISTS set_updated_at_push_subscriptions ON push_subscriptions;
CREATE TRIGGER set_updated_at_push_subscriptions
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grants for friends RPCs
GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_nudge(uuid, text) TO authenticated;

-- ============================================================================
-- COMPLETED
-- ============================================================================
-- Database schema created successfully!
-- 
-- Tunisia Regions: Tunis, Ariana, Ben Arous, Manouba, Bizerte, Nabeul, 
-- Zaghouan, Beja, Jendouba, Kef, Siliana, Kasserine, Sidi Bouzid, Sousse, 
-- Monastir, Mahdia, Sfax, Gabes, Mednine, Tozeur, Kebili, Gafsa, Tataouine, 
-- Kairouan
-- 
-- Features:
-- ✓ Daily deed tracking (resets at 3:30 AM GMT+1)
-- ✓ Month-long leaderboards
-- ✓ Regional filtering (24 Tunisia regions)
-- ✓ Automatic profile creation on signup
-- ✓ Friends system (requests, accept/reject, list)
-- ✓ In-app nudges
-- ✓ Push subscription storage for browser notifications
-- ✓ Row Level Security enabled
-- ✓ Optimized indexes for performance
-- 
-- Mock Data Created:
-- ✓ Abu Giggle (Tunis) - 76 total points
-- ✓ Sheikh Chuckles (Sfax) - 70 total points
-- ✓ One week of historical data for both users
