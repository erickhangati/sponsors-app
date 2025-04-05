'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PaymentsColumns, type Payment } from './columns';
import { PaymentsToolbar } from './toolbar';
import { PaymentsStats } from './stats';
import { AddPaymentDialog } from './add-payment-dialog';
import { EditPaymentDialog } from './edit-payment-dialog';

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  // Add state for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Add state for edit dialog
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Inside the PaymentsPage component, add a new state for page size
  const [pageSize, setPageSize] = useState(10);

  // Function to validate token
  const validateToken = async () => {
    if (!session?.accessToken) return false;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      // Make a lightweight API call to validate the token
      await axios.get(`${baseUrl}/users/me`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      return true;
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        console.error('Token expired or invalid:', error);
        // Handle token expiration
        await signOut({ redirect: false });
        toast.error('Session expired', {
          description: 'Your session has expired. Please log in again.',
        });
        router.replace('/login');
        return false;
      }
      // For other errors, we'll assume the token is still valid
      return true;
    }
  };

  // Function to trigger a refresh of the payments data
  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle edit payment
  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setIsEditDialogOpen(true);
  };

  // Handle delete payment
  const handleDeletePayment = (payment: Payment) => {
    // After successful deletion, refresh the data
    refreshData();
  };

  // Function to export payments data to CSV
  const exportPaymentsData = () => {
    try {
      setIsExporting(true);

      // Define the CSV headers
      const headers = [
        'ID',
        'Sponsor',
        'Child',
        'Amount',
        'Currency',
        'Transaction ID',
        'Payment Method',
        'Status',
        'Payment Date',
      ];

      // Convert payments data to CSV rows
      const rows = filteredPayments.map((payment) => [
        payment.id,
        payment.sponsor_name,
        payment.child_name,
        payment.amount,
        payment.currency,
        payment.transaction_id,
        payment.payment_method,
        payment.status,
        payment.payment_date,
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => {
              // Handle cells that might contain commas by wrapping in quotes
              const cellStr = String(cell);
              return cellStr.includes(',') ? `"${cellStr}"` : cellStr;
            })
            .join(','),
        ),
      ].join('\n');

      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Create a download link and trigger the download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `payments_export_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: 'Payments data has been exported to CSV.',
      });
    } catch (error) {
      console.error('Error exporting payments data:', error);
      toast.error('Export failed', {
        description: 'There was an error exporting the payments data.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Check authentication and token validity
  useEffect(() => {
    const checkAuth = async () => {
      if (status === 'unauthenticated') {
        router.replace('/login');
      } else if (status === 'authenticated') {
        await validateToken();
      }
    };

    checkAuth();
  }, [status, router, session]);

  // Set up a periodic token validation
  useEffect(() => {
    if (status !== 'authenticated') return;

    // Check token validity every 5 minutes
    const intervalId = setInterval(
      () => {
        validateToken();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [status, session]);

  // Fetch payments, sponsors, and children data
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.accessToken) return;

      setIsLoading(true);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const headers = {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        // Fetch payments, sponsors, and children in parallel
        const [paymentsResponse, sponsorsResponse, childrenResponse] = await Promise.all([
          axios.get(`${baseUrl}/admin/payments`, { headers }),
          axios.get(`${baseUrl}/admin/sponsors`, { headers }),
          axios.get(`${baseUrl}/admin/children`, { headers }),
        ]);

        const paymentsData = paymentsResponse.data.data.payments || [];
        const sponsorsData = sponsorsResponse.data.data.sponsors || [];
        const childrenData = childrenResponse.data.data.children || [];

        // Store sponsors and children for reference
        setSponsors(sponsorsData);
        setChildren(childrenData);

        // Create maps for quick lookups
        const sponsorsMap = sponsorsData.reduce((acc: Record<number, any>, sponsor: any) => {
          acc[sponsor.id] = sponsor;
          return acc;
        }, {});

        const childrenMap = childrenData.reduce((acc: Record<number, any>, child: any) => {
          acc[child.id] = child;
          return acc;
        }, {});

        // Enhance payments with derived data
        const enhancedPayments = paymentsData.map((payment: any) => {
          const sponsor = sponsorsMap[payment.sponsor_id] || {};
          const child = childrenMap[payment.child_id] || {};

          return {
            ...payment,
            sponsor_name:
              sponsor.first_name && sponsor.last_name
                ? `${sponsor.first_name} ${sponsor.last_name}`
                : 'Unknown Sponsor',
            child_name:
              child.first_name && child.last_name
                ? `${child.first_name} ${child.last_name}`
                : 'Unknown Child',
          };
        });

        setPayments(enhancedPayments);
      } catch (error) {
        console.error('Error fetching payments data:', error);

        // Check if the error is due to an expired token
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          // Token has expired, sign out and redirect to login
          await signOut({ redirect: false });
          toast.error('Session expired', {
            description: 'Your session has expired. Please log in again.',
          });
          router.replace('/login');
        } else {
          // Other error
          toast.error('Failed to load payments', {
            description: 'There was an error fetching the payments data.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, refreshTrigger, router]);

  // Filter and search payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        if (payment.status !== statusFilter) return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const sponsorNameMatch = payment.sponsor_name
          ? payment.sponsor_name.toLowerCase().includes(searchLower)
          : false;
        const childNameMatch = payment.child_name
          ? payment.child_name.toLowerCase().includes(searchLower)
          : false;

        return (
          sponsorNameMatch ||
          childNameMatch ||
          payment.transaction_id.toLowerCase().includes(searchLower) ||
          payment.payment_method.toLowerCase().includes(searchLower) ||
          String(payment.amount).includes(searchLower) ||
          // Also search by IDs in case names are not available
          String(payment.sponsor_id).includes(searchLower) ||
          String(payment.child_id).includes(searchLower)
        );
      }

      return true;
    });
  }, [payments, statusFilter, searchTerm]);

  // Prevent UI flash while checking authentication
  if (status === 'loading') return null;

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.replace('/login');
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Payments</h2>
          <p className="text-muted-foreground">Manage payments from sponsors to children</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={exportPaymentsData}
            disabled={isExporting || isLoading || filteredPayments.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <AddPaymentDialog onPaymentAdded={refreshData} sponsors={sponsors} children={children} />
        </div>
      </div>

      {/* Stats cards */}
      <PaymentsStats />

      {/* Payments data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-brand-purple">Payments List</CardTitle>
          <CardDescription>View and manage all payments in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalResults={filteredPayments.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
          <DataTable
            columns={PaymentsColumns(handleEditPayment, handleDeletePayment)}
            data={filteredPayments}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
            pageSize={pageSize}
          />

          {/* Edit Payment Dialog */}
          <EditPaymentDialog
            payment={editingPayment}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onPaymentUpdated={refreshData}
            sponsors={sponsors}
            children={children}
          />
        </CardContent>
      </Card>
    </div>
  );
}
