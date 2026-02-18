-- ============================================================================
-- MOCK DATA (For Testing)
-- ============================================================================
-- 4 realistic Tunisian users with daily logs for 2/18/2026 (pre-Ramadan)
-- Using actual schema: profiles UUID, daily_logs with deeds jsonb, daily_stats

-- Insert auth.users first (required for profiles to reference)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES 
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    '3amik.sleh@ramadan.tn',
    '$2a$10$1234567890123456789012345678901234567890123456',
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"malek"}',  
    false,
    now(),
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bouhammed.twal@ramadan.tn',
    '$2a$10$1234567890123456789012345678901234567890123456',
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Bouhammed majd"}',  
    false,
    now(),
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'noura.zalga@ramadan.tn',
    '$2a$10$1234567890123456789012345678901234567890123456',
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Noura Zalga"}',
    false,
    now(),
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'meddeb.foufoute@ramadan.tn',
    '$2a$10$1234567890123456789012345678901234567890123456',
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"sidik lmeddeb"}',  
    false,
    now(),
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- User 1: 3amik Sleh (The Helpful Uncle) - 11/12 deeds
INSERT INTO profiles (id, display_name, region, avatar_color, avatar_icon, month_total_points, created_at, updated_at) 
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'malek',
  'Tunis',
  '#7c3aed',
  'star',
  11,
  NOW() - INTERVAL '45 minutes',
  NOW() - INTERVAL '45 minutes'
)
ON CONFLICT DO NOTHING;

-- User 2: Bouhammed Twal (Muhammad the Tall) - 6/12 deeds
INSERT INTO profiles (id, display_name, region, avatar_color, avatar_icon, month_total_points, created_at, updated_at) 
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Bouhammed majd',
  'Sfax',
  '#dc2626',
  'heart',
  6,
  NOW() - INTERVAL '35 minutes',
  NOW() - INTERVAL '35 minutes'
)
ON CONFLICT DO NOTHING;

-- User 3: Noura Zalga (Little Delicate One) - 2/12 deeds
INSERT INTO profiles (id, display_name, region, avatar_color, avatar_icon, month_total_points, created_at, updated_at) 
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Noura Zalga',
  'Sousse',
  '#f59e0b',
  'moon',
  2,
  NOW() - INTERVAL '25 minutes',
  NOW() - INTERVAL '25 minutes'
)
ON CONFLICT DO NOTHING;

-- User 4: Meddeb Foufoute (Bread Softie) - 0/12 deeds
INSERT INTO profiles (id, display_name, region, avatar_color, avatar_icon, month_total_points, created_at, updated_at) 
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'sidik lmeddeb',
  'Kairouan',
  '#8b5cf6',
  'zap',
  0,
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes'
)
ON CONFLICT DO NOTHING;

-- Add daily logs for today (2/18/2026)
DO $$
DECLARE
  today_date date := CURRENT_DATE;
BEGIN
  
  -- 3amik Sleh: 11/12 deeds (forgot charity)
  INSERT INTO daily_logs (user_id, log_date, deeds, points_earned, created_at, updated_at)
  VALUES (
    '33333333-3333-3333-3333-333333333333',
    today_date,
    '{
      "prayer_five": true,
      "prayer_fajr_masjid": true,
      "prayer_taraweeh": true,
      "iman_quran": true,
      "iman_dhikr": true,
      "iman_dua": true,
      "tummy_suhoor": true,
      "tummy_iftar": true,
      "tummy_fast": true,
      "social_charity": false,
      "social_family": true,
      "social_workout": true
    }'::jsonb,
    11,
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes'
  )
  ON CONFLICT (user_id, log_date) DO NOTHING;
  
  -- Bouhammed Twal: 6/12 deeds (lazy mood)
  INSERT INTO daily_logs (user_id, log_date, deeds, points_earned, created_at, updated_at)
  VALUES (
    '44444444-4444-4444-4444-444444444444',
    today_date,
    '{
      "prayer_five": true,
      "prayer_fajr_masjid": true,
      "prayer_taraweeh": false,
      "iman_quran": true,
      "iman_dhikr": false,
      "iman_dua": true,
      "tummy_suhoor": false,
      "tummy_iftar": true,
      "tummy_fast": true,
      "social_charity": false,
      "social_family": true,
      "social_workout": false
    }'::jsonb,
    6,
    NOW() - INTERVAL '20 minutes',
    NOW() - INTERVAL '20 minutes'
  )
  ON CONFLICT (user_id, log_date) DO NOTHING;
  
  -- Noura Zalga: 2/12 deeds (barely tried)
  INSERT INTO daily_logs (user_id, log_date, deeds, points_earned, created_at, updated_at)
  VALUES (
    '55555555-5555-5555-5555-555555555555',
    today_date,
    '{
      "prayer_five": false,
      "prayer_fajr_masjid": false,
      "prayer_taraweeh": false,
      "iman_quran": true,
      "iman_dhikr": false,
      "iman_dua": false,
      "tummy_suhoor": false,
      "tummy_iftar": true,
      "tummy_fast": false,
      "social_charity": false,
      "social_family": false,
      "social_workout": false
    }'::jsonb,
    2,
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '15 minutes'
  )
  ON CONFLICT (user_id, log_date) DO NOTHING;
  
  -- Meddeb Foufoute: 0/12 deeds (zero effort)
  INSERT INTO daily_logs (user_id, log_date, deeds, points_earned, created_at, updated_at)
  VALUES (
    '66666666-6666-6666-6666-666666666666',
    today_date,
    '{
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
    0,
    NOW() - INTERVAL '5 minutes',
    NOW() - INTERVAL '5 minutes'
  )
  ON CONFLICT (user_id, log_date) DO NOTHING;

  -- Insert daily_stats for leaderboard
  INSERT INTO daily_stats (user_id, date, points, created_at, updated_at)
  VALUES
    ('33333333-3333-3333-3333-333333333333', today_date, 11, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
    ('44444444-4444-4444-4444-444444444444', today_date, 6, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'),
    ('55555555-5555-5555-5555-555555555555', today_date, 2, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
    ('66666666-6666-6666-6666-666666666666', today_date, 0, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes')
  ON CONFLICT DO NOTHING;

END $$;
