'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { Toolbar } from './toolbar';
import { Stats } from './stats';
import { columns, type Payment } from './columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Define interfaces for API responses
interface PaymentResponse {
  message: string;
  data: {
    page: number;
    page_size: number;
    total_payments: number;
    total_pages: number;
    payments: Payment[];
  };
}

// Updated ChildInfo interface to match the actual API response
interface ChildInfo {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  background_info: string;
  profile_image: string | null;
  image_gallery: string | null;
  is_active: boolean;
}

interface ChildrenResponse {
  message: string;
  data: {
    page: number;
    page_size: number;
    total_children: number;
    total_pages: number;
    children: ChildInfo[];
  };
}

export default function PaymentsPage() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [tableKey, setTableKey] = useState(0); // Used to force re-render the table

  useEffect(() => {
    const fetchPayments = async () => {
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

        // Create a map to store child IDs and names
        const childrenMap = new Map<number, string>();

        // Fetch children data to get names
        try {
          const childrenResponse = await axios.get<ChildrenResponse>(
            `${baseUrl}/sponsors/children`,
            { headers },
          );

          console.log('Children response:', childrenResponse.data);

          if (childrenResponse.data?.data?.children) {
            // Create a map of child IDs to names
            childrenResponse.data.data.children.forEach((child) => {
              if (child.id) {
                // Combine first_name and last_name to get the full name
                const fullName = `${child.first_name} ${child.last_name}`;
                childrenMap.set(child.id, fullName);
                console.log(`Mapped child ID ${child.id} to name ${fullName}`);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching children data:', error);
        }

        // Fetch payments data
        const paymentsResponse = await axios.get<PaymentResponse>(`${baseUrl}/sponsors/payments`, {
          headers,
        });

        console.log('Payments response:', paymentsResponse.data);

        if (paymentsResponse.data?.data?.payments) {
          const fetchedPayments = paymentsResponse.data.data.payments;

          // Add child names to payments data
          const paymentsWithChildNames = fetchedPayments.map((payment) => {
            const childName = childrenMap.get(payment.child_id);
            console.log(`For payment with child_id ${payment.child_id}, found name: ${childName}`);

            return {
              ...payment,
              child_name: childName || `Child #${payment.child_id}`,
            };
          });

          console.log('Payments with child names:', paymentsWithChildNames);
          setPayments(paymentsWithChildNames);
        } else {
          setPayments([]);
        }
      } catch (error: any) {
        console.error('Error fetching payments:', error);
        setError(error.response?.data?.detail || 'Failed to load payments');
        toast.error('Failed to load payments', {
          description: 'There was an error fetching your payment data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [session?.accessToken]);

  // Filter payments based on search term and filters
  const filteredPayments = payments.filter((payment) => {
    // Apply status filter
    if (statusFilter && payment.status !== statusFilter) {
      return false;
    }

    // Apply payment method filter
    if (methodFilter && payment.payment_method !== methodFilter) {
      return false;
    }

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        payment.transaction_id.toLowerCase().includes(searchLower) ||
        (payment.child_name && payment.child_name.toLowerCase().includes(searchLower)) ||
        payment.payment_method.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Handle search and filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setTableKey((prev) => prev + 1); // Force table re-render
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value);
    setTableKey((prev) => prev + 1); // Force table re-render
  };

  const handleMethodFilterChange = (value: string | null) => {
    setMethodFilter(value);
    setTableKey((prev) => prev + 1); // Force table re-render
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Payments</h2>
        <p className="text-muted-foreground">View and manage your payment history.</p>
      </div>

      <Stats />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <Card className="flex flex-col space-y-6">
          <CardHeader>
            <CardTitle className="text-brand-purple">Payment History</CardTitle>
            <CardDescription>A list of all your payments for child sponsorships.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-6">
            <Toolbar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              methodFilter={methodFilter}
              onMethodFilterChange={handleMethodFilterChange}
            />
            <DataTable
              key={tableKey}
              columns={columns}
              data={filteredPayments}
              isLoading={isLoading}
              pageSize={10}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
