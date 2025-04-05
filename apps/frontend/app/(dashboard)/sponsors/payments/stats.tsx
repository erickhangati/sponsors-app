'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, CreditCard, CheckCircle, Users } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

type StatsData = {
  totalPayments: number;
  completedPayments: number;
  childrenSponsored: number;
  totalAmount: number;
  currency: string;
  recentPaymentAmount: number;
};

export function Stats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({
    totalPayments: 0,
    completedPayments: 0,
    childrenSponsored: 0,
    totalAmount: 0,
    currency: 'KSh',
    recentPaymentAmount: 0,
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

        // Fetch payments data
        const paymentsResponse = await axios.get(`${baseUrl}/sponsors/payments`, { headers });

        if (
          paymentsResponse.data &&
          paymentsResponse.data.data &&
          paymentsResponse.data.data.payments
        ) {
          const payments = paymentsResponse.data.data.payments;

          // Calculate stats
          const totalPayments = payments.length;
          const completedPayments = payments.filter((p: any) => p.status === 'completed').length;

          // Calculate total amount from completed payments
          let totalAmount = 0;
          let currency = 'KSh';
          let recentPaymentAmount = 0;
          let recentPaymentDate = new Date(0); // Initialize with oldest possible date

          // Track unique child IDs
          const uniqueChildIds = new Set<number>();

          payments.forEach((payment: any) => {
            // Add child ID to set
            uniqueChildIds.add(payment.child_id);

            if (payment.status === 'completed') {
              totalAmount += payment.amount;

              // Use the currency from the first payment (assuming all payments use the same currency)
              if (!currency && payment.currency) {
                currency = payment.currency;
              }

              // Check if this is the most recent payment
              const paymentDate = new Date(payment.payment_date);
              if (paymentDate > recentPaymentDate) {
                recentPaymentDate = paymentDate;
                recentPaymentAmount = payment.amount;
              }
            }
          });

          const childrenSponsored = uniqueChildIds.size;

          setStats({
            totalPayments,
            completedPayments,
            childrenSponsored,
            totalAmount,
            currency,
            recentPaymentAmount,
          });
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error: any) {
        console.error('Error fetching payment stats:', error);
        setError('Failed to load payment statistics');
        toast.error('Failed to load payment statistics', {
          description: 'There was an error fetching the payment data.',
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
          <CardTitle className="text-sm font-medium text-brand-blue">Total Payments</CardTitle>
          <CreditCard className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
              <p className="text-xs text-muted-foreground">All your payments</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Completed</CardTitle>
          <CheckCircle className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.completedPayments}</div>
              <p className="text-xs text-muted-foreground">Successfully completed payments</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Children Sponsored</CardTitle>
          <Users className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.childrenSponsored}</div>
              <p className="text-xs text-muted-foreground">Number of children you support</p>
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
              <p className="text-xs text-muted-foreground">Total amount from completed payments</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
