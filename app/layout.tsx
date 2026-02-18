import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ramadan Quest - Spiritual Habit Tracker',
  description: 'Gamified habit tracker for Ramadan. Build your spiritual streaks and compete on the leaderboard.',
  openGraph: {
    images: [
      {
        url: '',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: '',
      },
    ],
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
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
