'use client';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/hooks/use-auth';
import { SonnerProvider } from '@/components/providers/sonner-provider';
import { ReportsProvider } from '@/contexts/reports-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <SessionProvider>
        <AuthProvider>
          <ReportsProvider>
            {/* Wrap with AuthProvider */}
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
              {children}
              <SonnerProvider />
            </body>
          </ReportsProvider>
        </AuthProvider>
      </SessionProvider>
    </html>
  );
}
