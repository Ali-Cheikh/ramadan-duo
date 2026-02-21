'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Trophy, Flame, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export interface Achievement {
  id: string;
  badge_type: string;
  milestone_value?: number;
  earned_at: string;
  notified_at?: string;
}

interface DailyStatRow {
  log_date: string;
  points_earned: number;
}

export const BADGE_CONFIG = {
  streak_3: {
    label: '3-Day Streak',
    requirement: '3 day streak',
    icon: '🔥',
    color: 'text-orange-800',
    bgColor: 'bg-orange-50',
  },
  streak_7: {
    label: '7-Day Streak',
    requirement: '7 day streak',
    icon: '🎯',
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
  },
  streak_14: {
    label: '2-Week Champion',
    requirement: '14 day streak',
    icon: '👑',
    color: 'text-purple-800',
    bgColor: 'bg-purple-50',
  },
  streak_30: {
    label: '30-Day Legend',
    requirement: '30 day streak',
    icon: '⭐',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
  },
  perfect_day: {
    label: 'Perfect Day',
    requirement: 'All 12 deeds in one day',
    icon: '✨',
    color: 'text-green-800',
    bgColor: 'bg-green-50',
  },
  first_friend: {
    label: 'Social Butterfly',
    requirement: 'Add your first friend',
    icon: '🦋',
    color: 'text-pink-800',
    bgColor: 'bg-pink-50',
  },
  charity_warrior: {
    label: 'Charity Warrior',
    requirement: '5 charity deeds',
    icon: '💝',
    color: 'text-red-800',
    bgColor: 'bg-red-50',
  },
  quran_master: {
    label: 'Quran Master',
    requirement: '10 Quran deeds',
    icon: '📖',
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-50',
  },
};

interface StatsTabProps {
  dailyStreak?: number;
  perfectStreak?: number;
  totalPoints?: number;
  refreshKey?: number;
}

export function StatsTab({ dailyStreak = 0, perfectStreak = 0, totalPoints = 0, refreshKey = 0 }: StatsTabProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentDailyStats, setRecentDailyStats] = useState<DailyStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDaysCompleted: 0,
    avgPointsPerDay: 0,
    charityCount: 0,
    quranCount: 0,
  });

  useEffect(() => {
    if (!user) return;

    const loadAchievements = async () => {
      try {
        // Load achievements
        const { data: achievementsData, error: achievementsError } = await supabase
          .from('achievements')
          .select('*')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false });

        if (achievementsError) throw achievementsError;
        setAchievements(achievementsData || []);

        // Load stats
        const { data: statsData, error: statsError } = await supabase
          .from('daily_logs')
          .select('log_date, deeds, points_earned')
          .eq('user_id', user.id)
          .order('log_date', { ascending: false });

        if (statsError) throw statsError;

        // Calculate stats
        const totalDaysCompleted = statsData?.filter((log: any) => log.points_earned > 0).length || 0;
        const avgPointsPerDay = totalDaysCompleted > 0 
          ? Math.round((statsData?.reduce((sum: number, log: any) => sum + log.points_earned, 0) || 0) / totalDaysCompleted)
          : 0;

        let charityCount = 0;
        let quranCount = 0;
        
        statsData?.forEach((log: any) => {
          if (log.deeds?.social_charity) charityCount++;
          if (log.deeds?.iman_quran) quranCount++;
        });

        setStats({
          totalDaysCompleted,
          avgPointsPerDay,
          charityCount,
          quranCount,
        });

        setRecentDailyStats(
          (statsData || [])
            .slice(0, 14)
            .map((log: any) => ({
              log_date: log.log_date,
              points_earned: log.points_earned || 0,
            }))
        );
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, [user, refreshKey]);

  const earnedByType = new Map(
    achievements
      .filter((achievement) => BADGE_CONFIG[achievement.badge_type as keyof typeof BADGE_CONFIG])
      .map((achievement) => [achievement.badge_type, achievement])
  );

  const allBadges = (Object.keys(BADGE_CONFIG) as Array<keyof typeof BADGE_CONFIG>)
    .map((badgeType) => ({
      badgeType,
      config: BADGE_CONFIG[badgeType],
      earned: earnedByType.get(badgeType),
    }))
    .sort((a, b) => {
      if (a.earned && !b.earned) return -1;
      if (!a.earned && b.earned) return 1;
      if (a.earned && b.earned) {
        return new Date(b.earned.earned_at).getTime() - new Date(a.earned.earned_at).getTime();
      }
      return 0;
    });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-500" />
            Stats & Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading achievements...
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDayLabel = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) return 'Today';
    if (target.getTime() === yesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getDayStatus = (points: number) => {
    if (points >= 12) return { label: 'Perfect', color: 'text-emerald-700 bg-emerald-100' };
    if (points >= 8) return { label: 'Great', color: 'text-blue-700 bg-blue-100' };
    if (points >= 4) return { label: 'Good', color: 'text-amber-700 bg-amber-100' };
    if (points > 0) return { label: 'Started', color: 'text-orange-700 bg-orange-100' };
    return { label: 'Missed', color: 'text-gray-600 bg-gray-100' };
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-center">
              <Flame className="w-7 h-7 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{dailyStreak}</div>
              <div className="text-xs text-gray-500">Day Streak</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-center">
              <Sparkles className="w-7 h-7 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{perfectStreak}</div>
              <div className="text-xs text-gray-500">Perfect Days</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-center">
              <Trophy className="w-7 h-7 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-xs text-gray-500">Total Points</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-center">
              <Heart className="w-7 h-7 text-pink-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalDaysCompleted}</div>
              <div className="text-xs text-gray-500">Days Committed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Badges & Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-gray-500">Earned first • Locked badges are grayed out</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {allBadges.map(({ badgeType, config, earned }) => {
              const locked = !earned;
              return (
                <div
                  key={badgeType}
                  className={`p-3 sm:p-4 rounded-lg border text-center ${locked ? 'bg-gray-100 border-gray-200' : config.bgColor}`}
                >
                  <div className={`text-3xl mb-2 ${locked ? 'grayscale opacity-70' : ''}`}>{config.icon}</div>
                  <div className={`text-sm font-bold ${locked ? 'text-gray-600' : config.color}`}>
                    {config.label}
                  </div>
                  <div className={`text-xs mt-1 ${locked ? 'text-gray-400' : 'text-gray-500'}`}>
                    {earned ? `Earned ${new Date(earned.earned_at).toLocaleDateString()}` : config.requirement}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Daily Breakdown
          </CardTitle>
          <p className="text-xs text-gray-500">Last 14 days • quick daily snapshot</p>
        </CardHeader>
        <CardContent>
          {recentDailyStats.length === 0 ? (
            <p className="text-sm text-gray-500">No daily stats yet.</p>
          ) : (
            <div className="space-y-2">
              {recentDailyStats.map((dayStat) => (
                (() => {
                  const percentage = Math.max(0, Math.min(100, Math.round((dayStat.points_earned / 12) * 100)));
                  const status = getDayStatus(dayStat.points_earned);

                  return (
                    <div
                      key={dayStat.log_date}
                      className="rounded-lg border border-gray-200 bg-white/80 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-sm font-semibold text-gray-700">{formatDayLabel(dayStat.log_date)}</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-sm font-bold text-emerald-700">{dayStat.points_earned}/12</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">{percentage}% complete</div>
                    </div>
                  );
                })()
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
