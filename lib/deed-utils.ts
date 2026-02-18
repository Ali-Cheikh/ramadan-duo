import { DailyLog } from './supabase';

export type DeedKey =
  | 'prayer_five'
  | 'prayer_fajr_masjid'
  | 'prayer_taraweeh'
  | 'iman_quran'
  | 'iman_dhikr'
  | 'iman_dua'
  | 'tummy_suhoor'
  | 'tummy_iftar'
  | 'tummy_fast'
  | 'social_charity'
  | 'social_family'
  | 'social_workout';

export type DeedCategory = 'prayer' | 'iman' | 'tummy' | 'social';

export interface Deed {
  key: DeedKey;
  label: string;
  category: DeedCategory;
  icon: string;
}

export const DEEDS: Deed[] = [
  { key: 'prayer_five', label: '5 Daily Prayers', category: 'prayer', icon: '🕌' },
  { key: 'prayer_fajr_masjid', label: 'Fajr in Masjid', category: 'prayer', icon: '🌅' },
  { key: 'prayer_taraweeh', label: 'Taraweeh', category: 'prayer', icon: '🌙' },
  { key: 'iman_quran', label: 'Read Quran', category: 'iman', icon: '📖' },
  { key: 'iman_dhikr', label: 'Morning/Evening Dhikr', category: 'iman', icon: '📿' },
  { key: 'iman_dua', label: 'Personal Dua', category: 'iman', icon: '🤲' },
  { key: 'tummy_suhoor', label: 'Eat Suhoor', category: 'tummy', icon: '🌅' },
  { key: 'tummy_iftar', label: 'Iftar on Time', category: 'tummy', icon: '🥗' },
  { key: 'tummy_fast', label: 'Completed Fast', category: 'tummy', icon: '✨' },
  { key: 'social_charity', label: 'Give Charity', category: 'social', icon: '💝' },
  { key: 'social_family', label: 'Quality Family Time', category: 'social', icon: '👨‍👩‍👧‍👦' },
  { key: 'social_workout', label: 'Physical Workout', category: 'social', icon: '💪' },
];

export const CATEGORY_INFO = {
  prayer: { name: 'Prayer', color: 'emerald', icon: '🕌' },
  iman: { name: 'Iman', color: 'blue', icon: '📖' },
  tummy: { name: 'Tummy', color: 'amber', icon: '🍽️' },
  social: { name: 'Social & Wellness', color: 'purple', icon: '🤝' },
};

// Get current date in GMT+1 (Tunisia timezone)
export function getCurrentDateGMT1(): string {
  const now = new Date();
  // Add 1 hour for GMT+1
  const gmt1Time = new Date(now.getTime() + (60 * 60 * 1000));
  return gmt1Time.toISOString().split('T')[0];
}

// Get "today" considering 2 AM reset in GMT+1
// A "day" runs from 2 AM to 2 AM (next day)
export function getTodayDateWithReset(): string {
  const now = new Date();
  const gmt1Time = new Date(now.getTime() + (60 * 60 * 1000));
  
  const hour = gmt1Time.getHours();
  
  // If it's before 2 AM, we're still in "yesterday"
  if (hour < 2) {
    const yesterday = new Date(gmt1Time);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  
  return gmt1Time.toISOString().split('T')[0];
}

// Get time range for "today" (from 2 AM to 2 AM next day in GMT+1)
export function getTodayTimeRange() {
  const now = new Date();
  const gmt1Time = new Date(now.getTime() + (60 * 60 * 1000));
  
  const todayStart = new Date(gmt1Time);
  todayStart.setHours(2, 0, 0, 0);
  
  // If current time is before 2 AM, "today" started yesterday at 2 AM
  if (gmt1Time.getHours() < 2) {
    todayStart.setDate(todayStart.getDate() - 1);
  }
  
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  
  return {
    start: todayStart.toISOString(),
    end: todayEnd.toISOString(),
  };
}

export function getTodayDate(): string {
  return getTodayDateWithReset();
}

export function countCompletedDeeds(deeds: Record<DeedKey, boolean>): number {
  return Object.values(deeds).filter(Boolean).length;
}

export function isCategoryComplete(deeds: Record<DeedKey, boolean>, category: DeedCategory): boolean {
  const categoryDeeds = DEEDS.filter(d => d.category === category);
  return categoryDeeds.every(deed => deeds[deed.key]);
}

export function calculateStreaks(logs: DailyLog[]): {
  dailyStreak: number;
  perfectStreak: number;
  prayerStreak: number;
  imanStreak: number;
  tummyStreak: number;
  socialStreak: number;
  totalPoints: number;
} {
  if (logs.length === 0) {
    return {
      dailyStreak: 0,
      perfectStreak: 0,
      prayerStreak: 0,
      imanStreak: 0,
      tummyStreak: 0,
      socialStreak: 0,
      totalPoints: 0,
    };
  }

  const sortedLogs = [...logs].sort((a, b) =>
    new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
  );

  let dailyStreak = 0;
  let perfectStreak = 0;
  let prayerStreak = 0;
  let imanStreak = 0;
  let tummyStreak = 0;
  let socialStreak = 0;
  let totalPoints = 0;

  const today = getTodayDate();
  let expectedDate = new Date(today);

  for (const log of sortedLogs) {
    const logDate = new Date(log.log_date);
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    const logDateStr = log.log_date;

    if (logDateStr !== expectedDateStr) {
      break;
    }

    totalPoints += log.points_earned;

    if (log.points_earned > 0) {
      dailyStreak++;
    } else {
      break;
    }

    if (log.points_earned === 12) {
      perfectStreak++;
    } else if (perfectStreak === 0) {
      perfectStreak = 0;
    }

    if (isCategoryComplete(log.deeds, 'prayer')) {
      prayerStreak++;
    } else if (prayerStreak === 0) {
      prayerStreak = 0;
    }

    if (isCategoryComplete(log.deeds, 'iman')) {
      imanStreak++;
    } else if (imanStreak === 0) {
      imanStreak = 0;
    }

    if (isCategoryComplete(log.deeds, 'tummy')) {
      tummyStreak++;
    } else if (tummyStreak === 0) {
      tummyStreak = 0;
    }

    if (isCategoryComplete(log.deeds, 'social')) {
      socialStreak++;
    } else if (socialStreak === 0) {
      socialStreak = 0;
    }

    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  return {
    dailyStreak,
    perfectStreak,
    prayerStreak,
    imanStreak,
    tummyStreak,
    socialStreak,
    totalPoints,
  };
}
