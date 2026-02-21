'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useTranslation } from '@/lib/use-translation';
import { supabase, DailyLog, Profile } from '@/lib/supabase';
import { ProgressRing } from '@/components/dashboard/progress-ring';
import { DeedButton } from '@/components/dashboard/deed-button';
import { Leaderboard } from '@/components/dashboard/leaderboard';
import { FriendsSystem } from '@/components/dashboard/friends-system';
import { ProfileSettings } from '@/components/dashboard/profile-settings';
import { StatsTab } from '@/components/dashboard/stats-tab';
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
import { Flame, Trophy, User, Sparkles, Target, Home, Users, Share2, ArrowLeft, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

type PushCapableServiceWorkerRegistration = ServiceWorkerRegistration & {
  pushManager: PushManager;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPushSubscribing, setIsPushSubscribing] = useState(false);
  const [loadingDeed, setLoadingDeed] = useState<DeedKey | null>(null);
  const [achievementsRefreshKey, setAchievementsRefreshKey] = useState(0);

  const usernameLabel = profile?.username ? `@${profile.username}` : '';

  const copyUsername = async () => {
    if (!usernameLabel) return;
    try {
      await navigator.clipboard.writeText(profile?.username || '');
      toast.success('Username copied');
    } catch {
      toast.error('Failed to copy username');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ramadan Quest',
          text: `Join me on Ramadan Quest! I've completed ${countCompletedDeeds(deeds)} deeds today.`,
          url: window.location.origin,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.origin);
      alert('Link copied to clipboard!');
    }
  };

  // Translation helpers for deed categories and labels
  const getCategoryName = (category: DeedCategory): string => {
    const categoryMap: Record<DeedCategory, string> = {
      prayer: t('deeds.prayer'),
      iman: t('deeds.iman'),
      tummy: t('deeds.tummy'),
      social: t('deeds.social'),
    };
    return categoryMap[category];
  };

  const getDeedLabel = (deedKey: DeedKey): string => {
    const deedMap: Record<DeedKey, string> = {
      prayer_five: t('deeds.prayerFive'),
      prayer_fajr_masjid: t('deeds.prayerFajrMasjid'),
      prayer_taraweeh: t('deeds.prayerTaraweeh'),
      iman_quran: t('deeds.imanQuran'),
      iman_dhikr: t('deeds.imanDhikr'),
      iman_dua: t('deeds.imanDua'),
      tummy_suhoor: t('deeds.tummySuhoor'),
      tummy_iftar: t('deeds.tummyIftar'),
      tummy_fast: t('deeds.tummyFast'),
      social_charity: t('deeds.socialCharity'),
      social_family: t('deeds.socialFamily'),
      social_workout: t('deeds.socialWorkout'),
    };
    return deedMap[deedKey];
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadProfile();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!user || authLoading || isInstalled) return;

    const timer = setTimeout(() => {
      if (deferredInstallPrompt) {
        setShowInstallPrompt(true);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [user, authLoading, isInstalled, deferredInstallPrompt]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let index = 0; index < rawData.length; ++index) {
      outputArray[index] = rawData.charCodeAt(index);
    }

    return outputArray;
  };

  const subscribeUserToPush = async () => {
    if (!user || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    setIsPushSubscribing(true);
    try {
      const keyResponse = await fetch('/api/push/public-key');
      const keyResult = await keyResponse.json();
      const vapidPublicKey = keyResult?.publicKey as string | undefined;

      if (!keyResponse.ok || !vapidPublicKey) {
        setIsPushSubscribing(false);
        return;
      }

      const registration = (await navigator.serviceWorker.register('/sw.js')) as PushCapableServiceWorkerRegistration;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const subscriptionJson = subscription.toJSON();
      const { endpoint, keys } = subscriptionJson;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        setIsPushSubscribing(false);
        return;
      }

      await supabase.rpc('register_push_subscription', {
        p_endpoint: endpoint,
        p_p256dh: keys.p256dh,
        p_auth: keys.auth,
        p_user_agent: navigator.userAgent,
      });
    } catch {
      // keep silent to avoid noisy prompts
    }
    setIsPushSubscribing(false);
  };

  const requestNotificationAfterFirstValue = async () => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      await subscribeUserToPush();
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notifications enabled');
      await subscribeUserToPush();
    }
  };

  useEffect(() => {
    if (!user) return;
    if (streaks.dailyStreak > 0 && !isPushSubscribing) {
      requestNotificationAfterFirstValue();
    }
  }, [streaks.dailyStreak, user]);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;

    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredInstallPrompt(null);
      toast.success('App installed successfully');
    } else {
      setShowInstallPrompt(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadProfile();
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

    if (error) {
      console.error('Error loading streaks:', error);
      return;
    }

    if (data) {
      const calculatedStreaks = calculateStreaks(data as DailyLog[]);
      setStreaks(calculatedStreaks);
    }
  };

  const getLifetimeMilestones = (logs: DailyLog[]) => {
    if (!logs.length) {
      return {
        maxDailyStreak: 0,
        hasPerfectDay: false,
      };
    }

    const logsByDate = new Map<string, DailyLog>();
    logs.forEach((log) => {
      if (!logsByDate.has(log.log_date)) {
        logsByDate.set(log.log_date, log);
      }
    });

    const sortedDatesAsc = Array.from(logsByDate.keys()).sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    );

    let maxDailyStreak = 0;
    let currentRun = 0;
    let previousActiveDate: Date | null = null;

    sortedDatesAsc.forEach((dateKey) => {
      const log = logsByDate.get(dateKey);
      if (!log || log.points_earned <= 0) {
        currentRun = 0;
        previousActiveDate = null;
        return;
      }

      const currentDate = new Date(`${dateKey}T00:00:00Z`);
      if (!previousActiveDate) {
        currentRun = 1;
      } else {
        const diffDays = Math.round(
          (currentDate.getTime() - previousActiveDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        currentRun = diffDays === 1 ? currentRun + 1 : 1;
      }

      previousActiveDate = currentDate;
      maxDailyStreak = Math.max(maxDailyStreak, currentRun);
    });

    const hasPerfectDay = logs.some((log) => log.points_earned === 12);

    return {
      maxDailyStreak,
      hasPerfectDay,
    };
  };

  const awardAchievementsFallback = async (latestLogs: DailyLog[], dailyStreak: number, perfectStreak: number) => {
    if (!user) return [] as string[];

    const milestoneCandidates: Array<{ badge_type: string; milestone_value: number | null }> = [];

    if (dailyStreak >= 3) milestoneCandidates.push({ badge_type: 'streak_3', milestone_value: 3 });
    if (dailyStreak >= 7) milestoneCandidates.push({ badge_type: 'streak_7', milestone_value: 7 });
    if (dailyStreak >= 14) milestoneCandidates.push({ badge_type: 'streak_14', milestone_value: 14 });
    if (dailyStreak >= 30) milestoneCandidates.push({ badge_type: 'streak_30', milestone_value: 30 });
    if (perfectStreak >= 1) milestoneCandidates.push({ badge_type: 'perfect_day', milestone_value: 1 });

    const charityCount = latestLogs.filter((log) => log.deeds?.social_charity).length;
    if (charityCount >= 5) {
      milestoneCandidates.push({ badge_type: 'charity_warrior', milestone_value: charityCount });
    }

    const quranCount = latestLogs.filter((log) => log.deeds?.iman_quran).length;
    if (quranCount >= 10) {
      milestoneCandidates.push({ badge_type: 'quran_master', milestone_value: quranCount });
    }

    const { count: friendCount, error: friendCountError } = await supabase
      .from('friend_requests')
      .select('id', { count: 'exact', head: true })
      .or(`and(sender_id.eq.${user.id},status.eq.accepted),and(receiver_id.eq.${user.id},status.eq.accepted)`);

    if (!friendCountError && (friendCount ?? 0) > 0) {
      milestoneCandidates.push({ badge_type: 'first_friend', milestone_value: 1 });
    }

    if (milestoneCandidates.length === 0) return [];

    const badgeTypes = milestoneCandidates.map((candidate) => candidate.badge_type);
    const { data: existingBadges, error: existingError } = await supabase
      .from('achievements')
      .select('badge_type')
      .eq('user_id', user.id)
      .in('badge_type', badgeTypes);

    if (existingError) {
      console.error('Error loading existing achievements:', existingError);
      return [];
    }

    const existingBadgeSet = new Set((existingBadges || []).map((achievement: any) => achievement.badge_type));
    const missingMilestones = milestoneCandidates.filter((candidate) => !existingBadgeSet.has(candidate.badge_type));

    if (missingMilestones.length === 0) return [];

    const { error: insertError } = await supabase.from('achievements').insert(
      missingMilestones.map((candidate) => ({
        user_id: user.id,
        badge_type: candidate.badge_type,
        milestone_value: candidate.milestone_value,
      }))
    );

    if (insertError) {
      console.error('Error inserting fallback achievements:', insertError);
      return [];
    }

    return missingMilestones.map((candidate) => candidate.badge_type);
  };

  const awardAchievementsViaApi = async (dailyStreak: number, perfectStreak: number) => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      return { earnedBadges: [] as string[], error: 'Missing session token' };
    }

    const response = await fetch('/api/achievements/award', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ dailyStreak, perfectStreak }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        earnedBadges: [] as string[],
        error: result?.error || 'Award API failed',
        notification: null as { reason?: string; sent?: boolean; sentCount?: number; subscriptionCount?: number } | null,
      };
    }

    const earnedBadges = Array.isArray(result?.earnedBadges) ? result.earnedBadges : [];
    return {
      earnedBadges,
      error: null as string | null,
      notification: result?.notification as { reason?: string; sent?: boolean; sentCount?: number; subscriptionCount?: number } | null,
    };
  };

  const toggleDeed = async (deedKey: DeedKey) => {
    if (!user || loadingDeed) return; // Prevent spam clicks

    setLoadingDeed(deedKey); // Lock this deed button

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
      setLoadingDeed(null); // Unlock button on error
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

    // Unlock button immediately - still processing in background
    setLoadingDeed(null);

    // Check for achievements after streak update
    setTimeout(async () => {
      const { data: latestLogs, error: logsFetchError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(100);

      if (!logsFetchError && latestLogs) {
        const updatedStreaks = calculateStreaks(latestLogs as DailyLog[]);
        const milestones = getLifetimeMilestones(latestLogs as DailyLog[]);
        const streakForAwards = Math.max(updatedStreaks.dailyStreak, milestones.maxDailyStreak);
        const perfectForAwards = milestones.hasPerfectDay ? 1 : updatedStreaks.perfectStreak;
        
        const badgeMessages: Record<string, string> = {
          streak_3: '🔥 3-Day Streak! Keep it going!',
          streak_7: '🎯 7-Day Streak! Amazing!',
          streak_14: '👑 2-Week Champion! Incredible!',
          streak_30: '⭐ 30-Day Legend! You are unstoppable!',
          perfect_day: '✨ Perfect Day! All deeds completed!',
          first_friend: '🦋 Social Butterfly! First friend connected!',
          charity_warrior: '💝 Charity Warrior unlocked!',
          quran_master: '📖 Quran Master unlocked!',
        };

        const apiAward = await awardAchievementsViaApi(streakForAwards, perfectForAwards);

        if (apiAward.error) {
          console.error('Achievement award API error:', apiAward.error);
          const fallbackEarnedBadges = await awardAchievementsFallback(
            latestLogs as DailyLog[],
            streakForAwards,
            perfectForAwards
          );

          fallbackEarnedBadges.forEach((badgeType) => {
            if (badgeMessages[badgeType]) {
              toast.success(badgeMessages[badgeType]);
            }
          });
          if (fallbackEarnedBadges.length > 0) {
            setAchievementsRefreshKey((current) => current + 1);
          }
        } else {
          apiAward.earnedBadges.forEach((badgeType: string) => {
            if (badgeMessages[badgeType]) {
              toast.success(badgeMessages[badgeType]);
            }
          });

          if (apiAward.earnedBadges.length > 0) {
            const reason = apiAward.notification?.reason;
            if (reason === 'no_subscriptions') {
              toast.info('Badge earned, but push is off on this device. Enable notifications to receive achievement alerts.');
            } else if (reason === 'push_not_configured') {
              toast.info('Badge earned, but push server is not configured yet.');
            } else if (reason === 'delivery_failed') {
              toast.info('Badge earned, but notification delivery failed on your current subscription.');
            }
          }

          if (apiAward.earnedBadges.length > 0) {
            setAchievementsRefreshKey((current) => current + 1);
          }
        }

        // Schedule retention reminders after successful deed completion
        if (pointsEarned > 0) {
          try {
            // Schedule hourly reminder
            await supabase.rpc('schedule_hourly_reminder', { p_user_id: user.id });
            
            // Schedule evening last-chance reminder
            await supabase.rpc('schedule_evening_reminder', { p_user_id: user.id });
          } catch (error) {
            console.error('Error scheduling reminders:', error);
          }
        }
      }
    }, 500);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        <div className="text-emerald-900 text-2xl">Loading your journey...</div>
      </div>
    );
  }

  const completedCount = countCompletedDeeds(deeds);
  const deedsByCategory = {
    prayer: DEEDS.filter(d => d.category === 'prayer'),
    iman: DEEDS.filter(d => d.category === 'iman'),
    tummy: DEEDS.filter(d => d.category === 'tummy'),
    social: DEEDS.filter(d => d.category === 'social'),
  };

  return (
    <>
      {/* Screen Size Restriction - Only allow mobile/tablet */}
      <div className="hidden md:flex h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-3xl font-bold text-emerald-900 mb-4">Mobile Only</h1>
          <p className="text-lg text-emerald-700 mb-2">Ramadan Quest is designed for mobile devices.</p>
          <p className="text-emerald-600">Please open this app on your phone or tablet for the best experience.</p>
        </div>
      </div>

      {/* Mobile/Tablet View */}
      <div className="md:hidden h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-emerald-100">
        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="container mx-auto px-4 py-4">
            {/* Top Action Buttons - Always Visible */}
            <div className="relative flex items-center justify-between mb-4">
              {/* Left Button: Share on Tracker, Back on other tabs */}
              <Button
                variant="ghost"
                size="icon"
                onClick={activeTab === 'tracker' ? handleShare : () => setActiveTab('tracker')}
                className="rounded-full"
              >
                {activeTab === 'tracker' ? (
                  <Share2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowLeft className="w-5 h-5 text-emerald-600" />
                )}
              </Button>

              {usernameLabel && (
                <button
                  onClick={copyUsername}
                  className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/65 px-2 py-1 rounded-full border border-white/70 text-xs text-emerald-800"
                >
                  <span className="truncate max-w-[120px]">{usernameLabel}</span>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              
              {/* Profile Button with Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <Avatar className="w-9 h-9">
                    <AvatarFallback 
                      style={{ backgroundColor: profile?.avatar_color || '#059669' }}
                      className="text-white font-bold text-sm"
                    >
                      {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
                
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                    >
                      <User className="w-4 h-4" />
                      {t('dashboard.profileSettings')}
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                    >
                      🌐 {language === 'en' ? 'العربية' : 'English'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {showInstallPrompt && !isInstalled && (
              <Card className="mb-4 border-emerald-200 bg-white/80 backdrop-blur-sm">
                <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Install Ramadan Quest</p>
                    <p className="text-xs text-emerald-700">Get app-like experience and better notifications.</p>
                  </div>
                  <Button onClick={handleInstallApp} className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3">
                    <Download className="w-4 h-4 mr-1" />
                    Install
                  </Button>
                </CardContent>
              </Card>
            )}

          {/* Tracker View */}
          {activeTab === 'tracker' && (
            <div className="space-y-4">
              <div className="flex justify-center counter-spacing">
                <ProgressRing progress={completedCount} total={12} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2">
                      <Flame className="w-6 h-6 text-amber-600" />
                      <div>
                        <div className="text-xs text-amber-700 font-medium">{t('dashboard.dailyStreak')}</div>
                        <div className="text-xl font-bold text-amber-900">{streaks.dailyStreak} {t('dashboard.days')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-emerald-600" />
                      <div>
                        <div className="text-xs text-emerald-700 font-medium">{t('dashboard.perfectStreak')}</div>
                        <div className="text-xl font-bold text-emerald-900">{streaks.perfectStreak} {t('dashboard.days')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {Object.entries(deedsByCategory).map(([category, categoryDeeds]) => (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{CATEGORY_INFO[category as DeedCategory].icon}</span>
                      <span>{getCategoryName(category as DeedCategory)}</span>
                      <span className="ml-auto text-xs font-normal text-gray-500">
                        {categoryDeeds.filter(d => deeds[d.key]).length}/3
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-3">
                    {categoryDeeds.map(deed => (
                      <DeedButton
                        key={deed.key}
                        label={getDeedLabel(deed.key)}
                        emoji={deed.icon}
                        completed={deeds[deed.key]}
                        onClick={() => toggleDeed(deed.key)}
                        category={deed.category}
                        loading={loadingDeed === deed.key}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Leaderboard View */}
          {activeTab === 'leaderboard' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  {t('dashboard.leaderboard')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Leaderboard />
              </CardContent>
            </Card>
          )}

          {/* Friends View */}
          {activeTab === 'friends' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-500" />
                  {t('dashboard.friends')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FriendsSystem />
              </CardContent>
            </Card>
          )}

          {/* Dashboard View - Placeholder */}
          {activeTab === 'dashboard' && (
            <StatsTab 
              dailyStreak={streaks.dailyStreak}
              perfectStreak={streaks.perfectStreak}
              totalPoints={streaks.totalPoints}
              refreshKey={achievementsRefreshKey}
            />
          )}

          {/* Profile View */}
          {activeTab === 'profile' && (
            <ProfileSettings />
          )}
        </div>
        </div>

        {/* Bottom Navigation Bar - Fixed */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-20">
          <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'tracker'
                ? 'text-emerald-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Target className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{t('dashboard.tracker')}</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'leaderboard'
                ? 'text-emerald-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Trophy className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{t('dashboard.ranks')}</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'friends'
                ? 'text-emerald-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{t('dashboard.friends')}</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'dashboard'
                ? 'text-emerald-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{t('dashboard.stats')}</span>
          </button>
          </div>
        </div>
      </div>
    </>
  );
}
