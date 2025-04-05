'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

// Custom colors as specified in the admin dashboard
const COLORS = {
  sponsorships: '#1CB4B8', // brand-teal
  payments: '#FFD100', // brand-yellow
};

type MonthlyData = {
  name: string;
  sponsorships: number;
  payments: number;
};

export function SponsorOverview() {
  const { data: session } = useSession();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.accessToken) {
        setError('Authentication token not found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const token = session.accessToken;
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';

        // Fetch payments
        const paymentsResponse = await axios.get(`${baseUrl}/sponsors/payments`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Get children data to determine sponsorships
        const childrenResponse = await axios.get(`${baseUrl}/sponsors/children`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Process the data
        const payments = paymentsResponse.data.data.payments || [];
        const childrenData = childrenResponse.data.data || {};

        // Create monthly data
        const monthlyData = processDataByMonth(childrenData.children || [], payments);
        setData(monthlyData);
      } catch (error) {
        console.error('Error fetching overview data:', error);
        setError('Failed to load chart data. Please try again later.');
        toast.error('Failed to load chart data', {
          description: 'There was an error fetching the overview data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session]);

  // Process data to group by month
  const processDataByMonth = (children: any[], payments: any[]): MonthlyData[] => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Initialize monthly data
    const monthlyData: MonthlyData[] = months.map((name) => ({
      name,
      sponsorships: 0,
      payments: 0,
    }));

    // Get current year
    const currentYear = new Date().getFullYear();

    // For demo purposes, distribute children across months
    // In a real app, you'd use actual sponsorship start dates
    if (children.length > 0) {
      // Just put all sponsorships in the current month for demo
      const currentMonth = new Date().getMonth();
      monthlyData[currentMonth].sponsorships = children.length;
    }

    // Process payments
    payments.forEach((payment) => {
      const date = new Date(payment.payment_date);
      // Only count payments from the current year
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        monthlyData[month].payments += 1;
      }
    });

    return monthlyData;
  };

  // Custom tooltip formatter to show colors matching the bars
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-md shadow-sm">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium">{entry.name}:</span>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[350px] w-full border border-dashed rounded-lg p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Failed to load chart data</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={310}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: 15 }} align="center" />
        <Bar
          name="Sponsorships"
          dataKey="sponsorships"
          fill={COLORS.sponsorships}
          radius={[4, 4, 0, 0]}
          barSize={30}
        />
        <Bar
          name="Payments"
          dataKey="payments"
          fill={COLORS.payments}
          radius={[4, 4, 0, 0]}
          barSize={30}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
