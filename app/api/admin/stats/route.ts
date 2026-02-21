import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use service role key for admin queries
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRate = applyRateLimit(`admin:stats:${ip}`, 60, 60_000);
  if (!ipRate.allowed) {
    return rateLimitResponse(ipRate.retryAfterSec);
  }

  // Verify admin secret
  const adminSecret = request.headers.get('x-admin-secret');
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Total users count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. Active today (users with deeds logged today)
    const today = new Date().toISOString().split('T')[0];
    const { data: activeTodayData } = await supabase
      .from('daily_logs')
      .select('user_id')
      .eq('log_date', today);
    // Get unique user count
    const uniqueUsers = new Set(activeTodayData?.map(d => d.user_id) || []);
    const activeToday = uniqueUsers.size;

    // 3. Total deeds completed today
    const { data: todayDeeds } = await supabase
      .from('daily_logs')
      .select('points_earned')
      .eq('log_date', today);
    const totalDeedsCompletedToday = todayDeeds?.reduce((sum, log) => sum + (log.points_earned || 0), 0) || 0;

    // 4. Pending reminders (not yet sent)
    const { count: pendingReminders } = await supabase
      .from('reminder_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('notification_sent', false);

    // 5. Delivered reminders (already sent)
    const { count: deliveredReminders } = await supabase
      .from('reminder_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('notification_sent', true);

    // 6. Overdue reminders (past scheduled time, not sent)
    const now = new Date().toISOString();
    const { count: overtueReminders } = await supabase
      .from('reminder_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('notification_sent', false)
      .lt('scheduled_for', now);

    // 7. Push subscriptions count
    const { count: pushSubscriptions } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });

    // 8. Achievements earned count
    const { count: achievementsEarned } = await supabase
      .from('achievements')
      .select('*', { count: 'exact', head: true });

    // 9. Top user by month points
    const { data: topUserData } = await supabase
      .from('profiles')
      .select('display_name, month_total_points')
      .order('month_total_points', { ascending: false })
      .limit(1);

    const topUser = topUserData?.[0] || null;

    // 10. Users by streak achievement
    const { data: streakData } = await supabase
      .from('achievements')
      .select('badge_type')
      .in('badge_type', ['streak_3', 'streak_7', 'streak_14', 'streak_30']);

    const usersByStreak = {
      streak_3: streakData?.filter(a => a.badge_type === 'streak_3').length || 0,
      streak_7: streakData?.filter(a => a.badge_type === 'streak_7').length || 0,
      streak_14: streakData?.filter(a => a.badge_type === 'streak_14').length || 0,
      streak_30: streakData?.filter(a => a.badge_type === 'streak_30').length || 0,
    };

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeToday,
      totalDeedsCompletedToday,
      pendingReminders: pendingReminders || 0,
      deliveredReminders: deliveredReminders || 0,
      overtueReminders: overtueReminders || 0,
      pushSubscriptions: pushSubscriptions || 0,
      achievementsEarned: achievementsEarned || 0,
      topUser,
      usersByStreak,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
