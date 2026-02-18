'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Moon, Trophy, Target, Flame } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-8">
              <Moon className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4">
            Ramadan Quest
          </h1>

          <p className="text-2xl md:text-3xl text-emerald-100 mb-8">
            Your Spiritual Journey, Gamified
          </p>

          <p className="text-lg text-emerald-200 max-w-2xl mx-auto mb-12">
            Track your daily deeds, build powerful streaks, and climb the spiritual leaderboard.
            Make this Ramadan your most consistent yet.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-700">
              <Target className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">12 Daily Deeds</h3>
              <p className="text-emerald-200">Track prayers, Quran, fasting, and more across 4 spiritual pillars</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-700">
              <Flame className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Build Streaks</h3>
              <p className="text-emerald-200">Maintain consistency with daily, perfect, and category-specific streaks</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-700">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Compete Spiritually</h3>
              <p className="text-emerald-200">Climb the leaderboard ranked by prayer streak and spiritual priorities</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white text-lg px-8 py-6 rounded-xl shadow-xl">
                Start Your Journey
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20 text-lg px-8 py-6 rounded-xl">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
