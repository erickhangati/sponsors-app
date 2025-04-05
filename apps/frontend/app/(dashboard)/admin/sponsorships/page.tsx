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
import { SponsorshipsColumns, type Sponsorship } from './columns';
import { SponsorshipsToolbar } from './toolbar';
import { SponsorshipsStats } from './stats';
import { AddSponsorshipDialog } from './add-sponsorship-dialog';
import { EditSponsorshipDialog } from './edit-sponsorship-dialog';

export default function SponsorshipsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  // Add state for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Add state for edit dialog
  const [editingSponsorship, setEditingSponsorship] = useState<Sponsorship | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Add state for page size
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

  // Function to trigger a refresh of the sponsorships data
  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle edit sponsorship
  const handleEditSponsorship = (sponsorship: Sponsorship) => {
    setEditingSponsorship(sponsorship);
    setIsEditDialogOpen(true);
  };

  // Handle delete sponsorship
  const handleDeleteSponsorship = (sponsorship: Sponsorship) => {
    // After successful deletion, refresh the data
    refreshData();
  };

  // Function to export sponsorships data to CSV
  const exportSponsorshipsData = () => {
    try {
      setIsExporting(true);

      // Define the CSV headers
      const headers = [
        'ID',
        'Sponsor',
        'Child',
        'Status',
        'Start Date',
        'End Date',
        'Monthly Amount',
        'Currency',
        'Total Payments',
        'Total Amount',
      ];

      // Convert sponsorships data to CSV rows
      const rows = filteredSponsorships.map((sponsorship) => [
        sponsorship.id,
        sponsorship.sponsor_name,
        sponsorship.child_name,
        sponsorship.status,
        sponsorship.start_date,
        sponsorship.end_date || '',
        sponsorship.monthly_amount,
        sponsorship.currency,
        sponsorship.payment_count || 0,
        sponsorship.total_amount || 0,
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
        `sponsorships_export_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: 'Sponsorships data has been exported to CSV.',
      });
    } catch (error) {
      console.error('Error exporting sponsorships data:', error);
      toast.error('Export failed', {
        description: 'There was an error exporting the sponsorships data.',
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

  // Fetch sponsorships, sponsors, children, and payments data
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

        // Fetch sponsorships, sponsors, children, and payments in parallel
        const [sponsorshipsResponse, sponsorsResponse, childrenResponse, paymentsResponse] =
          await Promise.all([
            axios.get(`${baseUrl}/admin/sponsorships`, { headers }),
            axios.get(`${baseUrl}/admin/sponsors`, { headers }),
            axios.get(`${baseUrl}/admin/children`, { headers }),
            axios.get(`${baseUrl}/admin/payments`, { headers }),
          ]);

        // Extract data
        const sponsorshipsData = sponsorshipsResponse.data.data.sponsorships || [];
        const sponsorsData = sponsorsResponse.data.data.sponsors || [];
        const childrenData = childrenResponse.data.data.children || [];
        const paymentsData = paymentsResponse.data.data.payments || [];

        console.log('Fetched payments data:', paymentsData);

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

        // Create a map of sponsorships by sponsor_id and child_id combination
        // This will help us match payments to sponsorships
        const sponsorshipsByPair: Record<string, any> = {};

        sponsorshipsData.forEach((sponsorship: any) => {
          const key = `${sponsorship.sponsor_id}-${sponsorship.child_id}`;
          sponsorshipsByPair[key] = sponsorship;
        });

        console.log('Sponsorships by sponsor-child pair:', sponsorshipsByPair);

        // Calculate payment counts and amounts per sponsorship
        const sponsorshipPayments: Record<
          number,
          {
            count: number;
            total: number;
            currency: string;
          }
        > = {};

        paymentsData.forEach((payment: any) => {
          // Create a key using sponsor_id and child_id
          const pairKey = `${payment.sponsor_id}-${payment.child_id}`;
          const sponsorship = sponsorshipsByPair[pairKey];

          if (sponsorship) {
            const sponsorshipId = sponsorship.id;

            if (!sponsorshipPayments[sponsorshipId]) {
              sponsorshipPayments[sponsorshipId] = {
                count: 0,
                total: 0,
                currency: payment.currency || 'KSh',
              };
            }

            if (payment.status === 'completed') {
              sponsorshipPayments[sponsorshipId].count += 1;
              sponsorshipPayments[sponsorshipId].total += payment.amount || 0;
            }
          } else {
            console.log(
              `No sponsorship found for payment with sponsor_id=${payment.sponsor_id} and child_id=${payment.child_id}`,
            );
          }
        });

        console.log('Processed sponsorship payments:', sponsorshipPayments);

        // Enhance sponsorships with derived data
        const enhancedSponsorships = sponsorshipsData.map((sponsorship: any) => {
          const sponsor = sponsorsMap[sponsorship.sponsor_id] || {};
          const child = childrenMap[sponsorship.child_id] || {};

          const paymentInfo = sponsorshipPayments[sponsorship.id] || {
            count: 0,
            total: 0,
            currency: 'KSh',
          };

          console.log(`Sponsorship ID: ${sponsorship.id}, Payment info:`, paymentInfo);

          return {
            ...sponsorship,
            sponsor_name:
              sponsor.first_name && sponsor.last_name
                ? `${sponsor.first_name} ${sponsor.last_name}`
                : 'Unknown Sponsor',
            child_name:
              child.first_name && child.last_name
                ? `${child.first_name} ${child.last_name}`
                : 'Unknown Child',
            payment_count: paymentInfo.count,
            total_amount: paymentInfo.total,
            currency: sponsorship.currency || paymentInfo.currency,
            monthly_amount: sponsorship.monthly_amount || 0, // Ensure monthly_amount has a default value
          };
        });

        setSponsorships(enhancedSponsorships);
      } catch (error) {
        console.error('Error fetching sponsorships data:', error);

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
          toast.error('Failed to load sponsorships', {
            description: 'There was an error fetching the sponsorships data.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, refreshTrigger, router]);

  // Filter and search sponsorships
  const filteredSponsorships = useMemo(() => {
    return sponsorships.filter((sponsorship) => {
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        if (sponsorship.status !== statusFilter) return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          sponsorship.sponsor_name.toLowerCase().includes(searchLower) ||
          sponsorship.child_name.toLowerCase().includes(searchLower) ||
          String(sponsorship.id).includes(searchLower)
        );
      }

      return true;
    });
  }, [sponsorships, statusFilter, searchTerm]);

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
          <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Sponsorships</h2>
          <p className="text-muted-foreground">
            Manage sponsorship relationships between sponsors and children
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={exportSponsorshipsData}
            disabled={isExporting || isLoading || filteredSponsorships.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <AddSponsorshipDialog
            onSponsorshipAdded={refreshData}
            sponsors={sponsors}
            children={children}
          />
        </div>
      </div>

      {/* Stats cards */}
      <SponsorshipsStats />

      {/* Sponsorships data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-brand-purple">Sponsorships List</CardTitle>
          <CardDescription>View and manage all sponsorships in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <SponsorshipsToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalResults={filteredSponsorships.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
          <DataTable
            columns={SponsorshipsColumns(handleEditSponsorship, handleDeleteSponsorship)}
            data={filteredSponsorships}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
            pageSize={pageSize}
          />

          {/* Edit Sponsorship Dialog */}
          <EditSponsorshipDialog
            sponsorship={editingSponsorship}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSponsorshipUpdated={refreshData}
            sponsors={sponsors}
            children={children}
          />
        </CardContent>
      </Card>
    </div>
  );
}
