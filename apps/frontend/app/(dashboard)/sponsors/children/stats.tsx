'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type StatsData = {
  totalChildren: number;
  activeChildren: number;
  averageAge: number;
};

export function SponsorChildrenStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({
    totalChildren: 0,
    activeChildren: 0,
    averageAge: 0,
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
        const children = childrenData.children || [];

        // Calculate stats
        const totalChildren = childrenData.total_children || 0;

        // Count active children
        let activeChildren = 0;
        let totalAge = 0;

        if (children.length > 0) {
          children.forEach((child: any) => {
            if (child.is_active) {
              activeChildren++;
            }

            // Calculate age from date_of_birth
            if (child.date_of_birth) {
              const birthDate = new Date(child.date_of_birth);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();

              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }

              totalAge += age;
            }
          });
        }

        // Calculate average age
        const averageAge = children.length > 0 ? Math.round(totalAge / children.length) : 0;

        setStats({
          totalChildren,
          activeChildren,
          averageAge,
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
  }, [session]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <p className="text-xs text-muted-foreground">My sponsored children</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Active Children</CardTitle>
          <UserCheck className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.activeChildren}</div>
              <p className="text-xs text-muted-foreground">Children with active sponsorships</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-brand-blue">Average Age</CardTitle>
          <Calendar className="h-[20px] w-[20px] text-muted-foreground stroke-brand-blue" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.averageAge}</div>
              <p className="text-xs text-muted-foreground">Average age of sponsored children</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
