'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

// Custom colors as specified
const COLORS = {
  sponsorships: '#1CB4B8', // Teal
  payments: '#FFD100', // Yellow
};

type MonthlyData = {
  name: string;
  sponsorships: number;
  payments: number;
};

type Sponsorship = {
  id: number;
  sponsor_id: number;
  child_id: number;
  start_date: string;
  status: string;
};

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
};

export const Overview = () => {
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

        // Fetch sponsorships
        const sponsorshipsResponse = await axios.get(`${baseUrl}/admin/sponsorships`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Fetch payments
        const paymentsResponse = await axios.get(`${baseUrl}/admin/payments`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        // Process the data
        const sponsorships: Sponsorship[] = sponsorshipsResponse.data.data.sponsorships || [];
        const payments: Payment[] = paymentsResponse.data.data.payments || [];

        // Create monthly data
        const monthlyData = processDataByMonth(sponsorships, payments);
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
  const processDataByMonth = (sponsorships: Sponsorship[], payments: Payment[]): MonthlyData[] => {
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

    // Process sponsorships
    sponsorships.forEach((sponsorship) => {
      const date = new Date(sponsorship.start_date);
      // Only count sponsorships from the current year
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        monthlyData[month].sponsorships += 1;
      }
    });

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
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: 15 }} />
        <Bar
          name="Sponsorships"
          dataKey="sponsorships"
          fill={COLORS.sponsorships}
          radius={[4, 4, 0, 0]}
        />
        <Bar name="Payments" dataKey="payments" fill={COLORS.payments} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
