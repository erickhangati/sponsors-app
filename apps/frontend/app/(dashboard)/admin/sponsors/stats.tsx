'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Users, Banknote, UserCheck } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

type StatsData = {
  totalSponsors: number;
  activeSponsors: number;
  totalDonated: number;
  newThisMonth: number;
  currency: string;
};

type ApiUser = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  // other fields omitted
};

type ApiSponsorship = {
  id: number;
  sponsor_id: number;
  child_id: number;
  start_date: string;
  status: string;
};

type ApiPayment = {
  id: number;
  sponsor_id: number;
  child_id: number;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
  // other fields omitted
};

export function SponsorsStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({
    totalSponsors: 0,
    activeSponsors: 0,
    totalDonated: 0,
    newThisMonth: 0,
    currency: 'KSh',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const token = session.accessToken;
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        // Fetch all data in parallel
        const [sponsorsResponse, sponsorshipsResponse, paymentsResponse] = await Promise.all([
          axios.get(`${baseUrl}/users?role=sponsor`, { headers }),
          axios.get(`${baseUrl}/admin/sponsorships`, { headers }),
          axios.get(`${baseUrl}/admin/payments`, { headers }),
        ]);

        // Process total sponsors
        const sponsors: ApiUser[] = sponsorsResponse.data.data.users || [];
        const totalSponsors = sponsorsResponse.data.data.filtered_user_count || sponsors.length;

        // Process active sponsors (count unique sponsor_ids with active status)
        const sponsorships: ApiSponsorship[] = sponsorshipsResponse.data.data.sponsorships || [];
        const activeSponsorsSet = new Set<number>();
        sponsorships.forEach((sponsorship) => {
          if (sponsorship.status === 'active') {
            activeSponsorsSet.add(sponsorship.sponsor_id);
          }
        });
        const activeSponsors = activeSponsorsSet.size;

        // Process total donated
        const payments: ApiPayment[] = paymentsResponse.data.data.payments || [];
        let totalDonated = 0;
        let currency = 'KSh';

        payments.forEach((payment) => {
          if (payment.status === 'completed') {
            totalDonated += payment.amount;
            // Use the currency from the first payment (assuming all payments use the same currency)
            if (!currency && payment.currency) {
              currency = payment.currency;
            }
          }
        });

        // Process new sponsors this month
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const newSponsorsThisMonth = new Set<number>();
        sponsorships.forEach((sponsorship) => {
          const startDate = new Date(sponsorship.start_date);
          if (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) {
            newSponsorsThisMonth.add(sponsorship.sponsor_id);
          }
        });

        setStats({
          totalSponsors,
          activeSponsors,
          totalDonated,
          newThisMonth: newSponsorsThisMonth.size,
          currency,
        });
      } catch (error) {
        console.error('Error fetching sponsor stats:', error);
        setError('Failed to load sponsor statistics');
        toast.error('Failed to load sponsor statistics', {
          description: 'There was an error fetching the sponsor data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [session?.accessToken]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Total Sponsors</CardTitle>
          <Users className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.totalSponsors}</div>
              <p className="text-xs text-muted-foreground">All sponsors in the program</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Active Sponsors</CardTitle>
          <UserCheck className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.activeSponsors}</div>
              <p className="text-xs text-muted-foreground">Sponsors with active sponsorships</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Total Donated</CardTitle>
          <Banknote className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {stats.currency} {stats.totalDonated.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Amount donated in total</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">New This Month</CardTitle>
          <UserPlus className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.newThisMonth}</div>
              <p className="text-xs text-muted-foreground">Active sponsors joined this month</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
