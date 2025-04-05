'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle, AlertCircle, Users } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

type StatsData = {
  totalReports: number;
  readReports: number;
  unreadReports: number;
  childrenWithReports: number;
};

export function Stats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({
    totalReports: 0,
    readReports: 0,
    unreadReports: 0,
    childrenWithReports: 0,
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

        // Fetch reports data
        const reportsResponse = await axios.get(`${baseUrl}/sponsors/reports`, { headers });

        if (
          reportsResponse.data &&
          reportsResponse.data.data &&
          reportsResponse.data.data.reports
        ) {
          const reports = reportsResponse.data.data.reports;

          // Calculate stats
          const totalReports = reports.length;
          const readReports = reports.filter((r: any) => r.status === 'read').length;
          const unreadReports = reports.filter((r: any) => r.status === 'unread').length;

          // Track unique child IDs
          const uniqueChildIds = new Set<number>();
          reports.forEach((report: any) => {
            uniqueChildIds.add(report.child_id);
          });
          const childrenWithReports = uniqueChildIds.size;

          setStats({
            totalReports,
            readReports,
            unreadReports,
            childrenWithReports,
          });
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error: any) {
        console.error('Error fetching report stats:', error);
        setError('Failed to load report statistics');
        toast.error('Failed to load report statistics', {
          description: 'There was an error fetching the report data.',
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
          <CardTitle className="text-sm font-medium text-brand-blue">Total Reports</CardTitle>
          <FileText className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.totalReports}</div>
              <p className="text-xs text-muted-foreground">
                All reports from your sponsored children
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Read Reports</CardTitle>
          <CheckCircle className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.readReports}</div>
              <p className="text-xs text-muted-foreground">Reports you have already read</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Unread Reports</CardTitle>
          <AlertCircle className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.unreadReports}</div>
              <p className="text-xs text-muted-foreground">Reports you haven't read yet</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">
            Children With Reports
          </CardTitle>
          <Users className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.childrenWithReports}</div>
              <p className="text-xs text-muted-foreground">Number of children with reports</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
