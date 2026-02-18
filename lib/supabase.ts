import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  display_name: string;
  region: string;
  avatar_color: string;
  avatar_icon: string;
  month_total_points?: number;
  created_at: string;
  updated_at: string;
};

export type DailyLog = {
  id: string;
  user_id: string;
  log_date: string;
  deeds: {
    prayer_five: boolean;
    prayer_fajr_masjid: boolean;
    prayer_taraweeh: boolean;
    iman_quran: boolean;
    iman_dhikr: boolean;
    iman_dua: boolean;
    tummy_suhoor: boolean;
    tummy_iftar: boolean;
    tummy_fast: boolean;
    social_charity: boolean;
    social_family: boolean;
    social_workout: boolean;
  };
  points_earned: number;
  created_at: string;
  updated_at: string;
};
