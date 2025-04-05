'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type StatsData = {
  total: number;
  active: number;
  pending: number;
};

export function SponsorChildrenStats() {
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
        const response = await axios.get(`${baseUrl}/sponsors/children`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Extract data from the response
        const childrenData = response.data.data;

        // Calculate stats
        const total = childrenData.total_children || 0;

        // Count active and pending children
        let active = 0;
        let pending = 0;

        if (childrenData.children && childrenData.children.length > 0) {
          childrenData.children.forEach((child: any) => {
            if (child.is_active) {
              active++;
            } else {
              pending++;
            }
          });
        }

        setStats({
          total,
          active,
          pending,
        });
      } catch (error) {
        console.error('Error fetching children stats:', error);
        setError('Failed to load children statistics');
        toast.error('Failed to load children statistics', {
          description: 'There was an error fetching the children data.',
        });
        // Set default values if API fails
        setStats({
          total: 0,
          active: 0,
          pending: 0,
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
        <CardTitle className="text-sm font-medium text-brand-blue">Sponsored Children</CardTitle>
        <Users className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">My sponsored children</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
