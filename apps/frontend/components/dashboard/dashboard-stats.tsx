'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, FileText, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import axios from 'axios';

type DashboardStats = {
  totalSponsors: number;
  totalChildren: number;
  totalPayments: number;
  totalAmount: number;
};

export const DashboardStats = () => {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalSponsors: 0,
    totalChildren: 0,
    totalPayments: 0,
    totalAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get token from session
      const token = session?.accessToken;

      if (!token) {
        throw new Error('No authentication token found in session');
      }

      // Make API request with axios
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL}/admin/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      // Extract data from the response
      const dashboardData = response.data.data;

      setStats({
        totalSponsors: dashboardData.total_sponsors,
        totalChildren: dashboardData.total_children,
        totalPayments: dashboardData.total_payments,
        totalAmount: dashboardData.total_amount,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        setError(errorMessage);
        toast.error('Failed to load dashboard statistics', {
          description: errorMessage,
        });
      } else {
        setError(error instanceof Error ? error.message : 'Unknown error');
        toast.error('Failed to load dashboard statistics', {
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when session changes
  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      fetchStats();
    }
  }, [status, session?.accessToken]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4">
          <h3 className="font-semibold">Error loading dashboard data</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-blue">Total Sponsors</CardTitle>
            <UserPlus className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalSponsors}</div>
                <p className="text-xs text-muted-foreground">Active sponsors in the program</p>
              </>
            )}
          </CardContent>
        </Card>

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
                <p className="text-xs text-muted-foreground">Children in the sponsorship program</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-blue">Total Payments</CardTitle>
            <FileText className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalPayments}</div>
                <p className="text-xs text-muted-foreground">Payments processed to date</p>
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
                  KSh. {stats.totalAmount.toFixed().toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total amount raised</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
