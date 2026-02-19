'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Mail, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/use-translation';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function SignupPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setTimeout(() => {
      setCooldownSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          display_name: displayName || 'Ramadan Warrior',
        },
      },
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('rate limit') || error.status === 429) {
        setError('Too many signup attempts. Please wait 60 seconds and try again.');
        setCooldownSeconds(60);
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      if (data?.session) {
        router.push('/dashboard');
        return;
      }

      setSuccessMessage('Account created. Check your email to confirm your account before logging in.');
      setLoading(false);
    }
  };

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
      <div className="md:hidden min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-emerald-700">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
              <Moon className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-emerald-900">Join Ramadan Quest</CardTitle>
            <CardDescription className="text-base">
              Create your account and start your journey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end mb-2">
              <LanguageSwitcher />
            </div>
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('common.displayName')}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder={t('common.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-md">
                  {successMessage}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                disabled={loading || cooldownSeconds > 0}
              >
                {loading
                  ? t('common.creatingAccount')
                  : cooldownSeconds > 0
                    ? `Try again in ${cooldownSeconds}s`
                    : t('common.signup')}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-600">
              {t('common.alreadyHaveAccount')}{' '}
              <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                {t('common.login')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
