'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type StatsData = {
  total_count: number;
  total_amount: number;
  currency: string;
};

export function SponsorPaymentsStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData | null>(null);
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

        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await axios.get(`${baseUrl}/sponsors/payments`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Extract data from the response
        const paymentsData = response.data.data;

        // Calculate total amount
        let totalAmount = 0;
        const payments = paymentsData.payments || [];

        if (payments.length > 0) {
          totalAmount = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
        }

        setStats({
          total_count: paymentsData.total_payments || 0,
          total_amount: totalAmount,
          currency: payments.length > 0 ? payments[0].currency : 'KSh',
        });
      } catch (error) {
        console.error('Error fetching payment stats:', error);
        setError('Failed to load payment statistics');
        toast.error('Failed to load payment statistics', {
          description: 'There was an error fetching the payment data.',
        });
        // Set default values if API fails
        setStats({
          total_count: 0,
          total_amount: 0,
          currency: 'KSh',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [session]);

  const formatCurrency = (amount: number, currency: string) => {
    const currencySymbol = currency === 'KES' || currency === 'KSH' ? 'KSh' : currency;
    return `${currencySymbol} ${amount.toLocaleString()}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-brand-blue">Total Payments</CardTitle>
        <CreditCard className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_amount || 0, stats?.currency || 'KSh')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_count || 0} payment{stats?.total_count !== 1 ? 's' : ''} made
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
