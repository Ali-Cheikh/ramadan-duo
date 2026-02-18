'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Moon, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/use-translation';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetSuccess(false);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/dashboard`,
    });

    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess(true);
      setTimeout(() => {
        setIsResetDialogOpen(false);
        setResetEmail('');
        setResetSuccess(false);
      }, 3000);
    }
    setResetLoading(false);
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
          <CardTitle className="text-3xl font-bold text-emerald-900">Ramadan Quest</CardTitle>
          <CardDescription className="text-base">
            Begin your journey this Ramadan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end pg-2">
            <LanguageSwitcher />
          </div>
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
                  placeholder={t('common.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? t('common.signingIn') : t('common.login')}
            </Button>
          </form>

          <div className="text-center">
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <DialogTrigger asChild>
                <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  {t('common.forgotPassword')}
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('common.resetPassword')}</DialogTitle>
                  <DialogDescription>
                    {t('common.resetPassword')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        placeholder={t('common.email')}
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>
                  {resetError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                      {resetError}
                    </div>
                  )}
                  {resetSuccess && (
                    <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-md">
                      {t('common.passwordResetEmailSent')}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={resetLoading}
                  >
                    {resetLoading ? t('common.sending') : t('common.sendResetLink')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>



          <div className="text-center text-sm text-gray-600">
            {t('common.dontHaveAccount')}{' '}
            <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 font-semibold">
              {t('common.signup')}
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
