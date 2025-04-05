'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, Banknote, UserX } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

type StatsData = {
  totalChildren: number;
  sponsoredChildren: number;
  needingSponsors: number;
  totalAmount: number;
  currency: string;
};

export function ChildrenStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({
    totalChildren: 0,
    sponsoredChildren: 0,
    needingSponsors: 0,
    totalAmount: 0,
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
        const [childrenResponse, sponsorshipsResponse, paymentsResponse] = await Promise.all([
          axios.get(`${baseUrl}/admin/children`, { headers }),
          axios.get(`${baseUrl}/admin/sponsorships`, { headers }),
          axios.get(`${baseUrl}/admin/payments`, { headers }),
        ]);

        // Process children data
        const children = childrenResponse.data.data.children || [];
        const totalChildren = children.length;

        // Process sponsorships data
        const sponsorships = sponsorshipsResponse.data.data.sponsorships || [];

        // Get active sponsorships
        const activeSponsorship = sponsorships.filter((s: any) => s.status === 'active');

        // Get unique sponsored child IDs
        const sponsoredChildrenIds = new Set(activeSponsorship.map((s: any) => s.child_id));
        const sponsoredChildren = sponsoredChildrenIds.size;

        // Children needing sponsors
        const needingSponsors = totalChildren - sponsoredChildren;

        // Process payments data to get total amount
        const payments = paymentsResponse.data.data.payments || [];
        let totalAmount = 0;
        let currency = 'KSh';

        payments.forEach((payment: any) => {
          if (payment.status === 'completed') {
            totalAmount += payment.amount;
            // Use the currency from the first payment (assuming all payments use the same currency)
            if (!currency && payment.currency) {
              currency = payment.currency;
            }
          }
        });

        setStats({
          totalChildren,
          sponsoredChildren,
          needingSponsors,
          totalAmount,
          currency,
        });
      } catch (error) {
        console.error('Error fetching children stats:', error);
        setError('Failed to load children statistics');
        toast.error('Failed to load children statistics', {
          description: 'There was an error fetching the children data.',
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
          <CardTitle className="text-sm font-medium text-brand-blue">Total Children</CardTitle>
          <Users className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.totalChildren}</div>
              <p className="text-xs text-muted-foreground">All children in the program</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Sponsored Children</CardTitle>
          <UserCheck className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.sponsoredChildren}</div>
              <p className="text-xs text-muted-foreground">Children with active sponsors</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Needing Sponsors</CardTitle>
          <UserX className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.needingSponsors}</div>
              <p className="text-xs text-muted-foreground">Children waiting for sponsorship</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Total Amount</CardTitle>
          <Banknote className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {stats.currency} {stats.totalAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total amount contributed</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
