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
    <>
      {/* Screen Size Restriction - Only allow mobile/tablet */}
      <div className="hidden md:flex h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-3xl font-bold text-white mb-4">Mobile Only</h1>
          <p className="text-lg text-emerald-200 mb-2">Ramadan Quest is designed for mobile devices.</p>
          <p className="text-emerald-300">Please open this app on your phone or tablet for the best experience.</p>
        </div>
      </div>

      {/* Mobile/Tablet View */}
      <div className="md:hidden min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800">
      <div className="container mx-auto px-6 py-12 flex flex-col justify-center min-h-screen">
        <div className="text-center space-y-6">
          {/* Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-2xl mx-auto">
            <Moon className="w-10 h-10 text-white" />
          </div>

          {/* Title & Tagline */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">
              Ramadan Quest
            </h1>
            <p className="text-lg text-emerald-200">
              Track deeds. Build streaks. Grow spiritually.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 py-8 max-w-md mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Target className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-xs text-emerald-200 font-medium">12 Daily<br/>Deeds</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Flame className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-xs text-emerald-200 font-medium">Streak<br/>Tracking</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-xs text-emerald-200 font-medium">Leaderboard<br/>Ranks</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 pt-4 max-w-sm mx-auto">
            <Link href="/signup" className="w-full">
              <Button size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-white text-base font-semibold py-6 rounded-xl shadow-lg">
                Start Your Journey
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button size="lg" variant="outline" className="w-full bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 text-base font-semibold py-6 rounded-xl">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
