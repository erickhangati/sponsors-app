'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type StatsData = {
  total: number;
  unread: number;
};

export function SponsorReportsStats() {
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
        const response = await axios.get(`${baseUrl}/sponsors/reports`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Extract data from the response
        const reportsData = response.data.data;

        // Calculate total and unread reports
        const total = reportsData.total_reports || 0;

        // Count unread reports
        let unread = 0;
        const reports = reportsData.reports || [];

        if (reports.length > 0) {
          unread = reports.filter((report: any) => report.status !== 'read').length;
        }

        setStats({
          total,
          unread,
        });
      } catch (error) {
        console.error('Error fetching reports stats:', error);
        setError('Failed to load reports statistics');
        toast.error('Failed to load reports statistics', {
          description: 'There was an error fetching the reports data.',
        });
        // Set default values if API fails
        setStats({
          total: 0,
          unread: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [session]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-brand-blue">Child Reports</CardTitle>
        <FileText className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">All reports</p>
              {stats?.unread ? (
                <p className="text-xs text-yellow-600 font-medium">
                  {stats.unread} unread {stats.unread === 1 ? 'report' : 'reports'}
                </p>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
