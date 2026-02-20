/*
  # Add retention notification scheduling
  
  Tracks when to send retention reminders (hourly nudges, evening "last chance")
*/

-- Create reminder_schedules table for tracking when to send reminders
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('hourly', 'evening_last_chance')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  notification_sent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add RLS policies for reminder_schedules
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;

-- Users can read their own reminders
CREATE POLICY "Users can read own reminder schedules"
  ON reminder_schedules
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage reminders
CREATE POLICY "Service role manages reminder schedules"
  ON reminder_schedules
  USING (true)
  WITH CHECK (true);

-- Indexes for reminder_schedules
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_scheduled FOR ON reminder_schedules(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_user_type ON reminder_schedules(user_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_not_sent ON reminder_schedules(reminder_type, scheduled_for) WHERE NOT notification_sent;

-- Create function to create hourly reminder for a user
CREATE OR REPLACE FUNCTION schedule_hourly_reminder(p_user_id uuid)
RETURNS TABLE(
  reminder_id uuid,
  scheduled_for timestamptz
) AS $$
BEGIN
  INSERT INTO reminder_schedules (user_id, reminder_type, scheduled_for)
  VALUES (p_user_id, 'hourly', now() + interval '1 hour')
  RETURNING id, scheduled_for;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION schedule_hourly_reminder(uuid) TO authenticated;

-- Create function to create evening "last chance" reminder
CREATE OR REPLACE FUNCTION schedule_evening_reminder(p_user_id uuid)
RETURNS TABLE(
  reminder_id uuid,
  scheduled_for timestamptz
) AS $$
DECLARE
  v_evening_time timestamptz;
BEGIN
  -- Schedule for 3 AM GMT+1 (the "last chance" before daily reset at 3:30 AM)
  -- Calculate next occurrence
  v_evening_time := date_trunc('day', now() AT TIME ZONE 'Africa/Tunis') 
                    + interval '3 hours'
                    AT TIME ZONE 'Africa/Tunis' AT TIME ZONE 'UTC';
  
  -- If it's already past 3 AM, schedule for tomorrow
  IF v_evening_time < now() THEN
    v_evening_time := v_evening_time + interval '1 day';
  END IF;
  
  INSERT INTO reminder_schedules (user_id, reminder_type, scheduled_for)
  VALUES (p_user_id, 'evening_last_chance', v_evening_time)
  ON CONFLICT DO NOTHING
  RETURNING id, scheduled_for;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION schedule_evening_reminder(uuid) TO authenticated;
