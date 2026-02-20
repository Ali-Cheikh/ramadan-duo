import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { LanguageProvider } from '@/lib/language-context';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://ramadan-duo.vercel.app'),
  manifest: '/manifest.json',
  title: 'Ramadan Quest | Ramadan Habit Tracker',
  description: 'Mobile-first Ramadan habit tracker to build consistent spiritual routines with daily deeds, streaks, and leaderboards.',
  keywords: [
    'Ramadan',
    'habit tracker',
    'daily deeds',
    'streaks',
    'spiritual routines',
    'leaderboard',
  ],
  icons: {
    icon: '/ico.png',
    shortcut: '/ico.png',
    apple: '/ico.png',
  },
  openGraph: {
    title: 'Ramadan Quest | Ramadan Habit Tracker',
    description: 'Build consistent spiritual routines during Ramadan with daily deeds, streaks, and friendly rankings.',
    url: 'https://ramadan-duo.vercel.app',
    siteName: 'Ramadan Quest',
    images: [
      {
        url: '/cover.png',
        width: 1200,
        height: 630,
        alt: 'Ramadan Quest cover',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ramadan Quest | Ramadan Habit Tracker',
    description: 'Track daily deeds, build streaks, and grow spiritually during Ramadan.',
    images: ['/cover.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
