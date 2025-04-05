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
import { ChildrenColumns, type Child } from './columns';
import { ChildrenToolbar } from './toolbar';
import { ChildrenStats } from './stats';
import { AddChildDialog } from './add-child-dialog';
import { EditChildDialog } from './edit-child-dialog';

export default function ChildrenPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [children, setChildren] = useState<Child[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);

  // Add state for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Add state for edit dialog
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Inside the ChildrenPage component, add a new state for page size
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

  // Function to trigger a refresh of the children data
  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle edit child
  const handleEditChild = (child: Child) => {
    setEditingChild(child);
    setIsEditDialogOpen(true);
  };

  // Handle delete child
  const handleDeleteChild = (child: Child) => {
    // After successful deletion, refresh the data
    refreshData();
  };

  // Update the exportChildrenData function to include the requested fields
  const exportChildrenData = () => {
    try {
      setIsExporting(true);

      // Define the CSV headers with the requested fields
      const headers = [
        'ID',
        'First Name',
        'Last Name',
        'Username',
        'Date of Birth',
        'Gender',
        'Sponsorship',
        'Sponsor',
        'Payments',
        'Amount',
      ];

      // Convert children data to CSV rows with the requested fields
      const rows = filteredChildren.map((child) => [
        child.id,
        child.first_name,
        child.last_name,
        (child as any).username || 'N/A',
        child.date_of_birth || '',
        child.gender || '',
        child.sponsorship_status === 'active' ? 'Active' : 'Inactive',
        child.sponsor_name || 'N/A',
        child.payment_count || 0,
        child.total_amount || 0, // Just the raw number without currency or formatting
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
        `children_export_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: 'Children data has been exported to CSV.',
      });
    } catch (error) {
      console.error('Error exporting children data:', error);
      toast.error('Export failed', {
        description: 'There was an error exporting the children data.',
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

  // Update the fetchData function to include sponsor and payment information

  // Fetch children and sponsorships data
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

        // Fetch children, sponsorships, payments, and sponsors in parallel
        const [childrenResponse, sponsorshipsResponse, paymentsResponse, sponsorsResponse] =
          await Promise.all([
            axios.get(`${baseUrl}/admin/children`, { headers }),
            axios.get(`${baseUrl}/admin/sponsorships`, { headers }),
            axios.get(`${baseUrl}/admin/payments`, { headers }),
            axios.get(`${baseUrl}/admin/sponsors`, { headers }),
          ]);

        const childrenData = childrenResponse.data.data.children || [];
        const sponsorshipsData = sponsorshipsResponse.data.data.sponsorships || [];
        const paymentsData = paymentsResponse.data.data.payments || [];
        const sponsorsData = sponsorsResponse.data.data.sponsors || [];

        // Process the data
        setSponsorships(sponsorshipsData);

        // Create a map of sponsor IDs to sponsor names
        const sponsorsMap = sponsorsData.reduce((acc: Record<number, string>, sponsor: any) => {
          acc[sponsor.id] = `${sponsor.first_name} ${sponsor.last_name}`;
          return acc;
        }, {});

        // Get sponsored child IDs and their status
        const sponsoredChildrenMap = sponsorshipsData.reduce((acc: Record<number, any>, s: any) => {
          acc[s.child_id] = {
            status: s.status,
            sponsor_id: s.sponsor_id,
            sponsor_name: sponsorsMap[s.sponsor_id] || 'Unknown Sponsor',
          };
          return acc;
        }, {});

        // Calculate payment counts and amounts per child
        const childPayments = paymentsData.reduce((acc: Record<number, any>, payment: any) => {
          if (!acc[payment.child_id]) {
            acc[payment.child_id] = {
              count: 0,
              total: 0,
              currency: payment.currency || 'KSh',
            };
          }

          if (payment.status === 'completed') {
            acc[payment.child_id].count += 1;
            acc[payment.child_id].total += payment.amount;
          }

          return acc;
        }, {});

        // Enhance children with derived data
        const enhancedChildren = childrenData.map((child: any) => {
          const sponsorInfo = sponsoredChildrenMap[child.id] || {};
          const paymentInfo = childPayments[child.id] || {
            count: 0,
            total: 0,
            currency: 'KSh',
          };

          return {
            ...child,
            sponsorship_status: sponsorInfo.status || 'Not Sponsored',
            sponsor_id: sponsorInfo.sponsor_id,
            sponsor_name: sponsorInfo.sponsor_name,
            payment_count: paymentInfo.count,
            total_amount: paymentInfo.total,
            currency: paymentInfo.currency,
          };
        });

        setChildren(enhancedChildren);
      } catch (error) {
        console.error('Error fetching children data:', error);

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
          toast.error('Failed to load children', {
            description: 'There was an error fetching the children data.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, refreshTrigger, router]);

  // Filter and search children
  const filteredChildren = useMemo(() => {
    return children.filter((child) => {
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        if (child.sponsorship_status !== statusFilter) return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          child.first_name.toLowerCase().includes(searchLower) ||
          child.last_name.toLowerCase().includes(searchLower) ||
          (child.school && child.school.toLowerCase().includes(searchLower)) ||
          (child.location && child.location.toLowerCase().includes(searchLower)) ||
          (child.guardian_name && child.guardian_name.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [children, statusFilter, searchTerm]);

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
          <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Children</h2>
          <p className="text-muted-foreground">Manage children profiles and their sponsorships</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={exportChildrenData}
            disabled={isExporting || isLoading || filteredChildren.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <AddChildDialog onChildAdded={refreshData} />
        </div>
      </div>

      {/* Stats cards */}
      <ChildrenStats />

      {/* Children data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-brand-purple">Children List</CardTitle>
          <CardDescription>View and manage all children in the program</CardDescription>
        </CardHeader>
        <CardContent>
          <ChildrenToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalResults={filteredChildren.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
          <DataTable
            columns={ChildrenColumns(handleEditChild, handleDeleteChild)}
            data={filteredChildren}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
            pageSize={pageSize}
          />

          {/* Edit Child Dialog */}
          <EditChildDialog
            child={editingChild}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onChildUpdated={refreshData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
