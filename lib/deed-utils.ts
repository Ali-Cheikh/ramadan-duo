import { DailyLog } from './supabase';

/**
 * TIMEZONE & RESET LOGIC
 * ======================
 * - All dates use GMT+1 timezone (Tunisia/Central European Time)
 * - Daily reset happens at 3:30 AM GMT+1
 * - This means if it's 12:00 AM - 3:29 AM, you're still in "yesterday"
 * - All streak calculations and date comparisons use this logic
 * 
 * Current time: If it's 11:50 PM on Feb 18, the app considers it Feb 18
 *               If it's 2:00 AM on Feb 19, the app considers it Feb 18 (still)
 *               If it's 3:30 AM on Feb 19, the app considers it Feb 19 (new day!)
 */

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
  // Convert to GMT+1 timezone
  const gmt1Time = new Date(now.getTime() + (60 * 60 * 1000));
  return gmt1Time.toISOString().split('T')[0];
}

// Get "today" considering 3:30 AM reset in GMT+1
// A "day" runs from 3:30 AM to 3:30 AM (next day)
export function getTodayDateWithReset(): string {
  const now = new Date();
  // Convert to GMT+1 timezone by adding 1 hour
  const gmt1Time = new Date(now.getTime() + (60 * 60 * 1000));
  
  const hour = gmt1Time.getUTCHours();
  const minutes = gmt1Time.getUTCMinutes();
  
  // If it's before 3:30 AM GMT+1, we're still in "yesterday"
  // Convert time to minutes for easier comparison
  const currentTimeMinutes = hour * 60 + minutes;
  const resetTimeMinutes = 3 * 60 + 30; // 3:30 AM = 210 minutes
  
  if (currentTimeMinutes < resetTimeMinutes) {
    gmt1Time.setUTCDate(gmt1Time.getUTCDate() - 1);
  }
  
  return gmt1Time.toISOString().split('T')[0];
}

// Get time range for "today" (from 3:30 AM to 3:30 AM next day in GMT+1)
export function getTodayTimeRange() {
  const now = new Date();
  // Convert to GMT+1 timezone
  const gmt1Time = new Date(now.getTime() + (60 * 60 * 1000));
  
  const hour = gmt1Time.getUTCHours();
  const minutes = gmt1Time.getUTCMinutes();
  const currentTimeMinutes = hour * 60 + minutes;
  const resetTimeMinutes = 3 * 60 + 30; // 3:30 AM
  
  // Create today's reset time (3:30 AM GMT+1)
  const todayStart = new Date(gmt1Time);
  todayStart.setUTCHours(3, 30, 0, 0);
  
  // If current time is before 3:30 AM, "today" started yesterday at 3:30 AM
  if (currentTimeMinutes < resetTimeMinutes) {
    todayStart.setUTCDate(todayStart.getUTCDate() - 1);
  }
  
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  
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

  // Sort logs by date descending (most recent first)
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

  // Track which streaks are still active
  let perfectStreakActive = true;
  let prayerStreakActive = true;
  let imanStreakActive = true;
  let tummyStreakActive = true;
  let socialStreakActive = true;

  // CRITICAL FIX: Use app's date logic (respects 3:30 AM reset)
  // Don't use browser's local date!
  const todayAppDate = getTodayDateWithReset(); // "2026-02-18" when before 3:30 AM
  let currentCheckDate = new Date(todayAppDate + 'T00:00:00Z');
  let logIndex = 0;

  // Check consecutive days going backwards
  while (logIndex < sortedLogs.length) {
    const log = sortedLogs[logIndex];
    const logDate = new Date(log.log_date + 'T00:00:00Z');
    
    const expectedDateStr = currentCheckDate.toISOString().split('T')[0];
    const logDateStr = log.log_date;

    // If this log matches the expected date
    if (logDateStr === expectedDateStr) {
      totalPoints += log.points_earned;

      // Daily streak: any points earned
      if (log.points_earned > 0) {
        dailyStreak++;
      } else {
        // No points on this day, break the streak
        break;
      }

      // Perfect streak: all 12 deeds
      if (perfectStreakActive) {
        if (log.points_earned === 12) {
          perfectStreak++;
        } else {
          perfectStreakActive = false;
        }
      }

      // Category streaks
      if (prayerStreakActive) {
        if (isCategoryComplete(log.deeds, 'prayer')) {
          prayerStreak++;
        } else {
          prayerStreakActive = false;
        }
      }

      if (imanStreakActive) {
        if (isCategoryComplete(log.deeds, 'iman')) {
          imanStreak++;
        } else {
          imanStreakActive = false;
        }
      }

      if (tummyStreakActive) {
        if (isCategoryComplete(log.deeds, 'tummy')) {
          tummyStreak++;
        } else {
          tummyStreakActive = false;
        }
      }

      if (socialStreakActive) {
        if (isCategoryComplete(log.deeds, 'social')) {
          socialStreak++;
        } else {
          socialStreakActive = false;
        }
      }

      // Move to the previous day
      currentCheckDate.setUTCDate(currentCheckDate.getUTCDate() - 1);
      logIndex++;
    } else if (logDate.getTime() < currentCheckDate.getTime()) {
      // Gap in logs - streak is broken
      break;
    } else {
      // Log is in the future? Skip it
      logIndex++;
    }
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
