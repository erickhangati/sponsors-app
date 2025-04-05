'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SponsorDashboardStats } from '@/components/sponsor-dashboard/sponsor-dashboard-stats';
import { SponsorOverview } from '@/components/sponsor-dashboard/sponsor-overview';
import { SponsorRecentPayments } from '@/components/sponsor-dashboard/sponsor-recent-payments';
import { useEffect } from 'react';
import { toast } from 'sonner';

// Extend the Session type to include the error property
interface ExtendedSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
  accessToken?: string;
  error?: string;
}

export default function SponsorDashboard() {
  const { data: session, status } = useSession();
  const extendedSession = session as ExtendedSession | null;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  // Handle token refresh
  useEffect(() => {
    const refreshToken = async () => {
      if (extendedSession?.error === 'RefreshAccessTokenError') {
        toast.error('Your session has expired. Please log in again.');
        redirect('/login');
      }
    };

    refreshToken();
  }, [extendedSession]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-brand-purple">My Dashboard</h2>
      </div>

      <div className="space-y-4">
        <SponsorDashboardStats />

        <div className="grid gap-4 lg:grid-cols-7">
          <Card className="lg:col-span-4 w-full">
            <CardHeader>
              <CardTitle className="text-brand-purple">Overview</CardTitle>
              <CardDescription>
                Your sponsorship and payment activity for the current year
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <SponsorOverview />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 w-full">
            <CardHeader>
              <CardTitle className="text-brand-purple">Recent Payments</CardTitle>
              <CardDescription>Your most recent payments</CardDescription>
            </CardHeader>
            <CardContent>
              <SponsorRecentPayments />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
