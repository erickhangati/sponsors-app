'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle, AlertCircle, Files } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

type StatsData = {
  totalReports: number;
  readReports: number;
  unreadReports: number;
  recentReports: number;
};

interface ReportsStatsProps {
  refreshTrigger?: number;
}

export function ReportsStats({ refreshTrigger = 0 }: ReportsStatsProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({
    totalReports: 0,
    readReports: 0,
    unreadReports: 0,
    recentReports: 0,
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

        const token = session.accessToken; // Store token in a variable after null check
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        // Use the correct endpoint and parameters
        // The API might be expecting 'per_page' instead of 'page_size'
        // Also, let's use a smaller value for page size to avoid issues
        const reportsResponse = await axios.get(`${baseUrl}/admin/child-reports`, {
          params: {
            page: 1,
            page_size: 100, // Use a smaller value
          },
          headers,
        });

        // Correctly access the reports data from the response
        const reports = reportsResponse.data.data.child_reports || [];

        // Calculate stats
        const totalReports = reports.length;
        const readReports = reports.filter((r: any) => r.status === 'read').length;
        const unreadReports = reports.filter((r: any) => r.status === 'unread').length;

        // Calculate recent reports (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentReports = reports.filter((r: any) => {
          const reportDate = new Date(r.report_date);
          return reportDate >= thirtyDaysAgo;
        }).length;

        setStats({
          totalReports,
          readReports,
          unreadReports,
          recentReports,
        });

        console.log('Calculated stats:', {
          totalReports,
          readReports,
          unreadReports,
          recentReports,
        });
      } catch (error) {
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
  }, [session?.accessToken, refreshTrigger]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Total Reports</CardTitle>
          <Files className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.totalReports}</div>
              <p className="text-xs text-muted-foreground">All child reports in the system</p>
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
              <p className="text-xs text-muted-foreground">Reports that have been reviewed</p>
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
              <p className="text-xs text-muted-foreground">Reports pending review</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Recent Reports</CardTitle>
          <FileText className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.recentReports}</div>
              <p className="text-xs text-muted-foreground">Reports from the last 30 days</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
