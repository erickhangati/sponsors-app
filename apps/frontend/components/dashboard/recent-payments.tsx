'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

type Payment = {
  id: number;
  sponsor_id: number;
  child_id: number;
  amount: number;
  currency: string;
  transaction_id: string;
  payment_method: string;
  status: string;
  payment_date: string;
  child_name?: string;
};

type Child = {
  id: number;
  first_name: string;
  last_name: string;
  profile_image: string | null;
};

export function RecentPayments() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentPayments = async () => {
      if (!session?.accessToken) {
        setError('Authentication token not found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';

        // Fetch payments
        const paymentsResponse = await axios.get(`${baseUrl}/admin/payments?page=1&page_size=5`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Fetch children to get names
        const childrenResponse = await axios.get(`${baseUrl}/admin/children`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Extract data
        const paymentsData = paymentsResponse.data.data.payments || [];
        const childrenData = childrenResponse.data.data.children || [];

        // Create map for quick lookups
        const childrenMap: Record<number, Child> = {};
        childrenData.forEach((child: Child) => {
          childrenMap[child.id] = child;
        });

        // Enhance payments with names
        const enhancedPayments = paymentsData.map((payment: Payment) => {
          const child = childrenMap[payment.child_id];

          return {
            ...payment,
            child_name: child ? `${child.first_name} ${child.last_name}` : 'Unknown Child',
          };
        });

        setPayments(enhancedPayments);
      } catch (error) {
        console.error('Error fetching recent payments:', error);
        setError('Failed to load recent payments. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentPayments();
  }, [session]);

  // Function to get status text with appropriate colors
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs text-green-600">Completed</span>;
      case 'pending':
        return <span className="text-xs text-yellow-600">Pending</span>;
      case 'failed':
        return <span className="text-xs text-red-600">Failed</span>;
      default:
        return <span className="text-xs text-gray-600">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="ml-4 space-y-1">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
              <div className="ml-auto">
                <Skeleton className="h-4 w-[80px]" />
              </div>
            </div>
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[200px] w-full border border-dashed rounded-lg p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Failed to load payments</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] w-full border border-dashed rounded-lg p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-lg font-semibold">No payments found</h3>
          <p className="text-sm text-muted-foreground">No recent payments to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {payments.map((payment) => (
        <div key={payment.id} className="flex items-center">
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">For {payment.child_name}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(payment.payment_date).toLocaleDateString()}
            </p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <p className="text-sm font-medium">
              {payment.currency} {payment.amount.toLocaleString()}
            </p>
            {getStatusText(payment.status)}
          </div>
        </div>
      ))}
    </div>
  );
}
