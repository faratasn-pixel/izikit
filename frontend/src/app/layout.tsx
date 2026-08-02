import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Headline font for the Banani "HABITATAFRIK EQUIPE" flow (login, signup, …).
const sora = Sora({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-sora',
  display: 'swap',
});

// Replace these with your app name + description per fork.
export const metadata: Metadata = {
  title: 'izi kit',
  description: 'Headless Next.js 16 starter — auth, payments, admin, webhooks, cron.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
