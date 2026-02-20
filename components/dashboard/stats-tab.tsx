'use client';

import { useEffect, useState } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Trophy, Flame, BookOpen, Users, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export interface Achievement {
  id: string;
  badge_type: string;
  milestone_value?: number;
  earned_at: string;
  notified_at?: string;
}

export const BADGE_CONFIG = {
  streak_3: {
    label: '3-Day Streak',
    description: 'Maintained a 3-day streak',
    icon: '🔥',
    color: 'bg-orange-100 text-orange-800',
    bgColor: 'bg-orange-50',
  },
  streak_7: {
    label: '7-Day Streak',
    description: 'Maintained a 7-day streak',
    icon: '🎯',
    color: 'bg-blue-100 text-blue-800',
    bgColor: 'bg-blue-50',
  },
  streak_14: {
    label: '2-Week Champion',
    description: 'Maintained a 14-day streak',
    icon: '👑',
    color: 'bg-purple-100 text-purple-800',
    bgColor: 'bg-purple-50',
  },
  streak_30: {
    label: '30-Day Legend',
    description: 'Maintained a 30-day streak',
    icon: '⭐',
    color: 'bg-yellow-100 text-yellow-800',
    bgColor: 'bg-yellow-50',
  },
  perfect_day: {
    label: 'Perfect Day',
    description: 'Completed all 12 deeds in one day',
    icon: '✨',
    color: 'bg-green-100 text-green-800',
    bgColor: 'bg-green-50',
  },
  first_friend: {
    label: 'Social Butterfly',
    description: 'Made your first friend',
    icon: '🦋',
    color: 'bg-pink-100 text-pink-800',
    bgColor: 'bg-pink-50',
  },
  charity_warrior: {
    label: 'Charity Warrior',
    description: 'Gave charity 5 times',
    icon: '💝',
    color: 'bg-red-100 text-red-800',
    bgColor: 'bg-red-50',
  },
  quran_master: {
    label: 'Quran Master',
    description: 'Read Quran 10 times',
    icon: '📖',
    color: 'bg-indigo-100 text-indigo-800',
    bgColor: 'bg-indigo-50',
  },
};

interface StatsTabProps {
  dailyStreak?: number;
  perfectStreak?: number;
  totalPoints?: number;
}

export function StatsTab({ dailyStreak = 0, perfectStreak = 0, totalPoints = 0 }: StatsTabProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
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
          .select('deeds, points_earned')
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
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, [user]);

  const streamlineAchievements = achievements.filter((a) => {
    const config = BADGE_CONFIG[a.badge_type as keyof typeof BADGE_CONFIG];
    return config;
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

  return (
    <div className="space-y-4 pb-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="text-center">
              <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{dailyStreak}</div>
              <div className="text-xs text-gray-500">Day Streak</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{perfectStreak}</div>
              <div className="text-xs text-gray-500">Perfect Days</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="text-center">
              <Trophy className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-xs text-gray-500">Total Points</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="text-center">
              <Heart className="w-8 h-8 text-pink-500 mx-auto mb-2" />
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
          {streamlineAchievements.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {streamlineAchievements.map((achievement) => {
                const config = BADGE_CONFIG[achievement.badge_type as keyof typeof BADGE_CONFIG];
                return (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg border-2 border-dashed text-center ${config.bgColor}`}
                  >
                    <div className="text-3xl mb-2">{config.icon}</div>
                    <div className={`text-sm font-bold ${config.color}`}>
                      {config.label}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(achievement.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No badges earned yet</p>
              <p className="text-xs text-gray-400 mt-1">Keep your streak alive to earn milestones!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievement Milestones Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            How to Earn Badges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg">🔥</span>
            <div>
              <div className="font-medium">3-Day Streak</div>
              <div className="text-gray-600 text-xs">Keep a 3-day streak alive</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">🎯</span>
            <div>
              <div className="font-medium">7-Day Streak</div>
              <div className="text-gray-600 text-xs">Maintain a full week</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">👑</span>
            <div>
              <div className="font-medium">2-Week Champion</div>
              <div className="text-gray-600 text-xs">Reach a 14-day streak</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">⭐</span>
            <div>
              <div className="font-medium">30-Day Legend</div>
              <div className="text-gray-600 text-xs">Last the entire Ramadan</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
