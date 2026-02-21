import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { applyRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

type AwardBody = {
  dailyStreak?: number;
  perfectStreak?: number;
};

type DailyLogForAwards = {
  log_date: string;
  points_earned: number;
  deeds: {
    social_charity?: boolean;
    iman_quran?: boolean;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
const rawVapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@ali-cheikh.com';
const vapidSubject = rawVapidSubject.replace(/\s+/g, '').replace('mailto:<', 'mailto:').replace('>', '');

const BADGE_LABELS: Record<string, string> = {
  streak_3: '3-Day Streak 🔥',
  streak_7: '7-Day Streak 🎯',
  streak_14: '2-Week Champion 👑',
  streak_30: '30-Day Legend ⭐',
  perfect_day: 'Perfect Day ✨',
  first_friend: 'Social Butterfly 🦋',
  charity_warrior: 'Charity Warrior 💝',
  quran_master: 'Quran Master 📖',
};

const toSafeNonNegative = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const calculateMaxDailyStreak = (logs: DailyLogForAwards[]) => {
  if (!logs.length) return 0;

  const logsByDate = new Map<string, DailyLogForAwards>();
  logs.forEach((log) => {
    if (!logsByDate.has(log.log_date)) {
      logsByDate.set(log.log_date, log);
    }
  });

  const sortedDates = Array.from(logsByDate.keys()).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  let maxStreak = 0;
  let currentStreak = 0;
  let previousActiveDate: Date | null = null;

  sortedDates.forEach((dateKey) => {
    const log = logsByDate.get(dateKey);
    if (!log || log.points_earned <= 0) {
      currentStreak = 0;
      previousActiveDate = null;
      return;
    }

    const currentDate = new Date(`${dateKey}T00:00:00Z`);
    if (!previousActiveDate) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round(
        (currentDate.getTime() - previousActiveDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
    }

    previousActiveDate = currentDate;
    maxStreak = Math.max(maxStreak, currentStreak);
  });

  return maxStreak;
};

const sendAchievementNotification = async (
  serviceClient: any,
  userId: string,
  badgeTypes: string[]
) => {
  if (!badgeTypes.length) {
    return { sent: false, sentCount: 0, subscriptionCount: 0, reason: 'no_badges' as const };
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return { sent: false, sentCount: 0, subscriptionCount: 0, reason: 'push_not_configured' as const };
  }

  const { data: subscriptions, error: subsError } = await serviceClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (subsError || !subscriptions || subscriptions.length === 0) {
    return {
      sent: false,
      sentCount: 0,
      subscriptionCount: subscriptions?.length || 0,
      reason: 'no_subscriptions' as const,
    };
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const badgeNames = badgeTypes.map((badgeType) => BADGE_LABELS[badgeType] || badgeType);
  const title = badgeTypes.length === 1 ? '🏅 New Achievement Unlocked!' : `🏅 ${badgeTypes.length} New Achievements!`;
  const body =
    badgeTypes.length === 1
      ? `You earned ${badgeNames[0]}`
      : `Unlocked: ${badgeNames.slice(0, 2).join(', ')}${badgeTypes.length > 2 ? '...' : ''}`;

  const payload = JSON.stringify({
    title,
    body,
    url: '/dashboard',
    tag: 'achievement-unlock',
  });

  let sentCount = 0;
  await Promise.all(
    subscriptions.map(async (subscription: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        sentCount += 1;
      } catch (error: any) {
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await serviceClient.from('push_subscriptions').delete().eq('id', subscription.id);
        }
      }
    })
  );

  return {
    sent: sentCount > 0,
    sentCount,
    subscriptionCount: subscriptions.length,
    reason: sentCount > 0 ? ('sent' as const) : ('delivery_failed' as const),
  };
};

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRate = applyRateLimit(`achievements:award:ip:${ip}`, 120, 60_000);
  if (!ipRate.allowed) {
    return rateLimitResponse(ipRate.retryAfterSec);
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server is not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResult, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userResult?.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userId = userResult.user.id;

  const body = (await request.json().catch(() => ({}))) as AwardBody;
  const dailyStreakInput = toSafeNonNegative(body.dailyStreak);
  const perfectStreakInput = toSafeNonNegative(body.perfectStreak);

  const { data: logs, error: logsError } = await serviceClient
    .from('daily_logs')
    .select('log_date, points_earned, deeds')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(400);

  if (logsError) {
    return NextResponse.json({ error: 'Failed to load logs' }, { status: 500 });
  }

  const castLogs = (logs || []) as DailyLogForAwards[];
  const maxDailyStreak = calculateMaxDailyStreak(castLogs);
  const charityCount = castLogs.filter((log) => log.deeds?.social_charity).length;
  const quranCount = castLogs.filter((log) => log.deeds?.iman_quran).length;
  const hasPerfectDay = castLogs.some((log) => log.points_earned === 12);

  const { count: friendCount, error: friendCountError } = await serviceClient
    .from('friend_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (friendCountError) {
    return NextResponse.json({ error: 'Failed to load friend stats' }, { status: 500 });
  }

  const effectiveDailyStreak = Math.max(dailyStreakInput, maxDailyStreak);
  const effectivePerfectStreak = hasPerfectDay ? Math.max(1, perfectStreakInput) : perfectStreakInput;

  const candidates: Array<{ badge_type: string; milestone_value: number }> = [];

  if (effectiveDailyStreak >= 3) candidates.push({ badge_type: 'streak_3', milestone_value: 3 });
  if (effectiveDailyStreak >= 7) candidates.push({ badge_type: 'streak_7', milestone_value: 7 });
  if (effectiveDailyStreak >= 14) candidates.push({ badge_type: 'streak_14', milestone_value: 14 });
  if (effectiveDailyStreak >= 30) candidates.push({ badge_type: 'streak_30', milestone_value: 30 });
  if (effectivePerfectStreak >= 1) candidates.push({ badge_type: 'perfect_day', milestone_value: effectivePerfectStreak });
  if (charityCount >= 5) candidates.push({ badge_type: 'charity_warrior', milestone_value: charityCount });
  if (quranCount >= 10) candidates.push({ badge_type: 'quran_master', milestone_value: quranCount });
  if ((friendCount || 0) >= 1) candidates.push({ badge_type: 'first_friend', milestone_value: 1 });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, earnedBadges: [], eligibleBadges: [] });
  }

  const badgeTypes = candidates.map((candidate) => candidate.badge_type);

  const { data: existingRows, error: existingError } = await serviceClient
    .from('achievements')
    .select('badge_type')
    .eq('user_id', userId)
    .in('badge_type', badgeTypes);

  if (existingError) {
    return NextResponse.json({ error: 'Failed to read existing achievements' }, { status: 500 });
  }

  const existing = new Set((existingRows || []).map((row: any) => row.badge_type));
  const missing = candidates.filter((candidate) => !existing.has(candidate.badge_type));
  let notification: {
    sent: boolean;
    sentCount: number;
    subscriptionCount: number;
    reason: 'not_attempted' | 'no_badges' | 'push_not_configured' | 'no_subscriptions' | 'delivery_failed' | 'sent';
  } = {
    sent: false,
    sentCount: 0,
    subscriptionCount: 0,
    reason: 'not_attempted',
  };

  if (missing.length > 0) {
    const { error: insertError } = await serviceClient.from('achievements').insert(
      missing.map((candidate) => ({
        user_id: userId,
        badge_type: candidate.badge_type,
        milestone_value: candidate.milestone_value,
      }))
    );

    if (insertError) {
      return NextResponse.json({ error: 'Failed to store achievements' }, { status: 500 });
    }

    const earnedBadgeTypes = missing.map((candidate) => candidate.badge_type);
    notification = await sendAchievementNotification(serviceClient, userId, earnedBadgeTypes);

    if (notification.sent) {
      await serviceClient
        .from('achievements')
        .update({ notified_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('badge_type', earnedBadgeTypes)
        .is('notified_at', null);
    }
  }

  return NextResponse.json({
    ok: true,
    earnedBadges: missing.map((candidate) => candidate.badge_type),
    eligibleBadges: badgeTypes,
    notification,
  });
}
