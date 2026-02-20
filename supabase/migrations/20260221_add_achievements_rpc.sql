/*
  # Add check_and_award_achievements RPC function
  
  Checks streak milestones and awards achievements automatically
  Called whenever a user completes deeds and streaks are updated
*/

CREATE OR REPLACE FUNCTION check_and_award_achievements(
  p_user_id uuid,
  p_daily_streak integer,
  p_perfect_streak integer
)
RETURNS TABLE(
  badge_type text,
  newly_earned boolean
) AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Check 3-day streak
  IF p_daily_streak >= 3 THEN
    INSERT INTO achievements (user_id, badge_type, milestone_value, earned_at)
    VALUES (p_user_id, 'streak_3', 3, now())
    ON CONFLICT (user_id, badge_type, milestone_value) DO NOTHING;
    
    IF FOUND THEN
      RETURN QUERY SELECT 'streak_3'::text, true;
    END IF;
  END IF;

  -- Check 7-day streak
  IF p_daily_streak >= 7 THEN
    INSERT INTO achievements (user_id, badge_type, milestone_value, earned_at)
    VALUES (p_user_id, 'streak_7', 7, now())
    ON CONFLICT (user_id, badge_type, milestone_value) DO NOTHING;
    
    IF FOUND THEN
      RETURN QUERY SELECT 'streak_7'::text, true;
    END IF;
  END IF;

  -- Check 14-day streak
  IF p_daily_streak >= 14 THEN
    INSERT INTO achievements (user_id, badge_type, milestone_value, earned_at)
    VALUES (p_user_id, 'streak_14', 14, now())
    ON CONFLICT (user_id, badge_type, milestone_value) DO NOTHING;
    
    IF FOUND THEN
      RETURN QUERY SELECT 'streak_14'::text, true;
    END IF;
  END IF;

  -- Check 30-day streak
  IF p_daily_streak >= 30 THEN
    INSERT INTO achievements (user_id, badge_type, milestone_value, earned_at)
    VALUES (p_user_id, 'streak_30', 30, now())
    ON CONFLICT (user_id, badge_type, milestone_value) DO NOTHING;
    
    IF FOUND THEN
      RETURN QUERY SELECT 'streak_30'::text, true;
    END IF;
  END IF;

  -- Check perfect day (all 12 deeds)
  -- This is handled separately when deeds are saved

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_award_achievements(uuid, integer, integer) TO authenticated;
