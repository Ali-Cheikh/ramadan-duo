'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, DailyLog } from '@/lib/supabase';
import { ProgressRing } from '@/components/dashboard/progress-ring';
import { DeedButton } from '@/components/dashboard/deed-button';
import { Leaderboard } from '@/components/dashboard/leaderboard';
import { ProfileSettings } from '@/components/dashboard/profile-settings';
import {
  DEEDS,
  CATEGORY_INFO,
  getTodayDate,
  getTodayDateWithReset,
  countCompletedDeeds,
  calculateStreaks,
  DeedKey,
  DeedCategory,
} from '@/lib/deed-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, Trophy, User, Sparkles, Target } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [deeds, setDeeds] = useState<Record<DeedKey, boolean>>({
    prayer_five: false,
    prayer_fajr_masjid: false,
    prayer_taraweeh: false,
    iman_quran: false,
    iman_dhikr: false,
    iman_dua: false,
    tummy_suhoor: false,
    tummy_iftar: false,
    tummy_fast: false,
    social_charity: false,
    social_family: false,
    social_workout: false,
  });
  const [streaks, setStreaks] = useState({
    dailyStreak: 0,
    perfectStreak: 0,
    prayerStreak: 0,
    imanStreak: 0,
    tummyStreak: 0,
    socialStreak: 0,
    totalPoints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tracker');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadTodayLog();
      loadStreaks();
    }
  }, [user, authLoading, router]);

  const loadTodayLog = async () => {
    if (!user) return;

    const today = getTodayDate();
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle();

    if (data) {
      setDeeds(data.deeds);
    }
    setLoading(false);
  };

  const loadStreaks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(100);

    if (data) {
      const calculatedStreaks = calculateStreaks(data as DailyLog[]);
      setStreaks(calculatedStreaks);
    }
  };

  const toggleDeed = async (deedKey: DeedKey) => {
    if (!user) return;

    const wasCompleted = deeds[deedKey];
    const newDeeds = { ...deeds, [deedKey]: !deeds[deedKey] };
    setDeeds(newDeeds);

    const pointsEarned = countCompletedDeeds(newDeeds);
    const today = getTodayDate();
    const currentDate = getTodayDateWithReset();

    // Update daily_logs for tracking
    const { error: logError } = await supabase.from('daily_logs').upsert(
      {
        user_id: user.id,
        log_date: today,
        deeds: newDeeds,
        points_earned: pointsEarned,
      },
      {
        onConflict: 'user_id,log_date',
      }
    );

    if (logError) {
      console.error('Error updating daily log:', logError);
      return;
    }

    // Update daily_stats for month totals
    // Add 1 point if deed was just completed, subtract 1 if uncompleted
    const pointsDelta = wasCompleted ? -1 : 1;
    
    const { error: statsError } = await supabase.rpc('update_daily_stat', {
      p_user_id: user.id,
      p_date: currentDate,
      p_points: pointsDelta,
    });

    if (statsError) {
      console.error('Error updating daily stats:', statsError);
    }

    // Sync month total to profile for leaderboard
    const { error: syncError } = await supabase.rpc('sync_month_total_to_profile', {
      p_user_id: user.id,
    });

    if (syncError) {
      console.error('Error syncing month total:', syncError);
    }

    // Refresh streaks
    loadStreaks();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        <div className="text-emerald-900 text-2xl">Loading your journey...</div>
      </div>
    );
  }

  const completedCount = countCompletedDeeds(deeds);

  const deedsByCategory = DEEDS.reduce((acc, deed) => {
    if (!acc[deed.category]) {
      acc[deed.category] = [];
    }
    acc[deed.category].push(deed);
    return acc;
  }, {} as Record<DeedCategory, typeof DEEDS>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="tracker" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Tracker
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracker" className="space-y-6">
            <div className="flex justify-center mb-8">
              <ProgressRing progress={completedCount} total={12} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Flame className="w-8 h-8 text-amber-600" />
                    <div>
                      <div className="text-sm text-amber-700 font-medium">Daily Streak</div>
                      <div className="text-2xl font-bold text-amber-900">{streaks.dailyStreak} days</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-emerald-600" />
                    <div>
                      <div className="text-sm text-emerald-700 font-medium">Prayer Streak</div>
                      <div className="text-2xl font-bold text-emerald-900">{streaks.prayerStreak} days</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {Object.entries(deedsByCategory).map(([category, categoryDeeds]) => (
              <Card key={category} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{CATEGORY_INFO[category as DeedCategory].icon}</span>
                    <span>{CATEGORY_INFO[category as DeedCategory].name}</span>
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      {categoryDeeds.filter(d => deeds[d.key]).length}/3
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryDeeds.map(deed => (
                    <DeedButton
                      key={deed.key}
                      label={deed.label}
                      emoji={deed.icon}
                      completed={deeds[deed.key]}
                      onClick={() => toggleDeed(deed.key)}
                      category={deed.category}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  Spiritual Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Leaderboard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
