'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTodayDate } from '@/lib/deed-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TUNISIA_REGIONS = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Bizerte',
  'Nabeul',
  'Zaghouan',
  'Beja',
  'Jendouba',
  'Kef',
  'Siliana',
  'Kasserine',
  'Sidi Bouzid',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Gabes',
  'Mednine',
  'Tozeur',
  'Kebili',
  'Gafsa',
  'Tataouine',
  'Kairouan',
];

interface LeaderboardEntry {
  profile: Profile;
  points: number;
  rank: number;
}

export function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allLeaderboard, setAllLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'global' | 'region'>('global');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [userRegion, setUserRegion] = useState<string>('');
  const [displayCount, setDisplayCount] = useState(10);
  const [timeFilter, setTimeFilter] = useState<'today' | 'month'>('month');

  useEffect(() => {
    loadUserRegion();
    loadLeaderboard();
  }, []);

  useEffect(() => {
    filterLeaderboard();
  }, [filter, selectedRegion, allLeaderboard]);

  useEffect(() => {
    loadLeaderboard();
  }, [timeFilter]);

  useEffect(() => {
    // Reset display count when filter changes
    setDisplayCount(10);
  }, [filter, selectedRegion]);

  const loadUserRegion = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('region')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setUserRegion(data.region);
      setSelectedRegion(data.region);
    }
  };

  const filterLeaderboard = () => {
    if (filter === 'global') {
      setLeaderboard(allLeaderboard);
    } else {
      const regionToFilter = selectedRegion || userRegion;
      const filtered = allLeaderboard.filter(
        entry => entry.profile.region === regionToFilter
      );
      // Re-rank filtered results
      filtered.forEach((entry, index) => {
        entry.rank = index + 1;
      });
      setLeaderboard(filtered);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);

    if (timeFilter === 'today') {
      // Load today's rankings from daily_logs
      const today = getTodayDate();
      const { data: dailyLogs, error: logsError } = await supabase
        .from('daily_logs')
        .select('user_id, points_earned')
        .eq('log_date', today)
        .order('points_earned', { ascending: false });

      if (logsError || !dailyLogs) {
        setLoading(false);
        return;
      }

      // Get profiles for these users
      const userIds = dailyLogs.map(log => log.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError || !profiles) {
        setLoading(false);
        return;
      }

      // Combine data
      const leaderboardData: LeaderboardEntry[] = dailyLogs.map((log, index) => {
        const profile = profiles.find(p => p.id === log.user_id);
        return {
          profile: profile!,
          points: log.points_earned || 0,
          rank: index + 1,
        };
      }).filter(entry => entry.profile); // Filter out any missing profiles

      setAllLeaderboard(leaderboardData);
    } else {
      // Load monthly rankings from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('month_total_points', { ascending: false });

      if (profilesError || !profiles) {
        setLoading(false);
        return;
      }

      const leaderboardData: LeaderboardEntry[] = profiles.map((profile, index) => ({
        profile,
        points: profile.month_total_points || 0,
        rank: index + 1,
      }));

      setAllLeaderboard(leaderboardData);
    }

    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-amber-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="text-gray-600 font-bold text-lg">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Filter Toggle */}
      <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as 'today' | 'month')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Region Filter */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'global' | 'region')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">National</TabsTrigger>
          <TabsTrigger value="region">By Region</TabsTrigger>
        </TabsList>
      </Tabs>

      {filter === 'region' && (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="See other regions" />
            </SelectTrigger>
            <SelectContent>
              {TUNISIA_REGIONS.map((region) => (
                <SelectItem key={region} value={region}>
                  {region} {region === userRegion ? '(Your Region)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="text-xs text-gray-600 text-center">
          Showing {Math.min(displayCount, leaderboard.length)} of {leaderboard.length} users
          {filter === 'region' && selectedRegion && ` in ${selectedRegion}`}
        </div>
      )}

      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No entries yet. Be the first to start your journey!
          </div>
        ) : (
          <>
            {leaderboard.slice(0, displayCount).map((entry) => (
              <Card
                key={entry.profile.id}
                className={entry.rank <= 3 ? 'border-2 border-amber-300 bg-amber-50/50' : ''}
              >
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {entry.profile.display_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.profile.region}
                    </div>
                  </div>

                  <div className="flex gap-2 items-center flex-shrink-0">
                    <div className="text-center bg-gradient-to-br from-emerald-50 to-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-emerald-900 text-base">{entry.points}</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 font-medium">{timeFilter === 'today' ? 'Today' : 'Month'}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {displayCount < leaderboard.length && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setDisplayCount(prev => Math.min(prev + 10, leaderboard.length))}
                variant="outline"
                className="w-full max-w-xs"
              >
                Show More ({Math.min(10, leaderboard.length - displayCount)} more)
              </Button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
