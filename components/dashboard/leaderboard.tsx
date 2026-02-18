'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  monthTotalPoints: number;
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

  useEffect(() => {
    loadUserRegion();
    loadLeaderboard();
  }, []);

  useEffect(() => {
    filterLeaderboard();
  }, [filter, selectedRegion, allLeaderboard]);

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
      monthTotalPoints: profile.month_total_points || 0,
      rank: index + 1,
    }));

    setAllLeaderboard(leaderboardData);
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
        <div className="text-sm text-gray-600 text-center">
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
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: entry.profile.avatar_color }}
                  >
                    {entry.profile.display_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {entry.profile.display_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {entry.profile.region}
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="text-center bg-gradient-to-br from-emerald-50 to-emerald-100 px-4 py-2 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-emerald-900 text-lg">{entry.monthTotalPoints}</span>
                      </div>
                      <div className="text-xs text-emerald-600 font-medium">Month Points</div>
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
