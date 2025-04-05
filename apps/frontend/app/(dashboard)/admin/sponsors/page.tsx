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
import { SponsorsColumns, type Sponsor } from './columns';
import { SponsorsToolbar } from './toolbar';
import { SponsorsStats } from './stats';
import { AddSponsorDialog } from './add-sponsor-dialog';
import { EditSponsorDialog } from './edit-sponsor-dialog';

export default function SponsorsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);

  // Add state for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Add state for edit dialog
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Inside the SponsorsPage component, add a new state for page size
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

  // Function to trigger a refresh of the sponsors data
  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle edit sponsor
  const handleEditSponsor = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setIsEditDialogOpen(true);
  };

  // Handle delete sponsor
  const handleDeleteSponsor = (sponsor: Sponsor) => {
    // After successful deletion, refresh the data
    refreshData();
  };

  // Function to export sponsors data to CSV
  const exportSponsorsData = () => {
    try {
      setIsExporting(true);

      // Define the CSV headers
      const headers = [
        'ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone Number',
        'Username',
        'Status',
        'Date of Birth',
        'Gender',
        'Children Sponsored',
        'Background Info',
      ];

      // Convert sponsors data to CSV rows
      const rows = filteredSponsors.map((sponsor) => [
        sponsor.id,
        sponsor.first_name,
        sponsor.last_name,
        sponsor.email,
        sponsor.phone_number,
        sponsor.username,
        sponsor.status,
        sponsor.date_of_birth || '',
        sponsor.gender || '',
        sponsor.totalSponsored || 0,
        sponsor.background_info || '',
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
        `sponsors_export_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: 'Sponsors data has been exported to CSV.',
      });
    } catch (error) {
      console.error('Error exporting sponsors data:', error);
      toast.error('Export failed', {
        description: 'There was an error exporting the sponsors data.',
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

  // Fetch sponsors and sponsorships data
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

        // Fetch sponsors and sponsorships in parallel
        const [sponsorsResponse, sponsorshipsResponse] = await Promise.all([
          axios.get(`${baseUrl}/admin/sponsors`, { headers }),
          axios.get(`${baseUrl}/admin/sponsorships`, { headers }),
        ]);

        const sponsorsData = sponsorsResponse.data.data.sponsors || [];
        const sponsorshipsData = sponsorshipsResponse.data.data.sponsorships || [];

        // Process the data
        setSponsorships(sponsorshipsData);

        // Get active sponsor IDs (sponsors with at least one active sponsorship)
        const activeSponsorIds = new Set(
          sponsorshipsData.filter((s: any) => s.status === 'active').map((s: any) => s.sponsor_id),
        );

        // Count sponsorships per sponsor
        const sponsorshipCounts = sponsorshipsData.reduce((acc: Record<number, number>, s: any) => {
          acc[s.sponsor_id] = (acc[s.sponsor_id] || 0) + 1;
          return acc;
        }, {});

        // Enhance sponsors with derived data
        const enhancedSponsors = sponsorsData.map((sponsor: any) => ({
          ...sponsor,
          status: activeSponsorIds.has(sponsor.id) ? 'active' : 'inactive',
          totalSponsored: sponsorshipCounts[sponsor.id] || 0,
        }));

        setSponsors(enhancedSponsors);
      } catch (error) {
        console.error('Error fetching sponsors data:', error);

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
          toast.error('Failed to load sponsors', {
            description: 'There was an error fetching the sponsors data.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, refreshTrigger, router]);

  // Filter and search sponsors
  const filteredSponsors = useMemo(() => {
    return sponsors.filter((sponsor) => {
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        if (sponsor.status !== statusFilter) return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          sponsor.first_name.toLowerCase().includes(searchLower) ||
          sponsor.last_name.toLowerCase().includes(searchLower) ||
          sponsor.email.toLowerCase().includes(searchLower) ||
          sponsor.phone_number.toLowerCase().includes(searchLower) ||
          (sponsor.username && sponsor.username.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [sponsors, statusFilter, searchTerm]);

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
          <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Sponsors</h2>
          <p className="text-muted-foreground">Manage sponsor accounts and their sponsorships</p>
        </div>
        <div className="flex items-center gap-2">
          {/*<Button variant="outline" size="sm" className="h-9 cursor-pointer" onClick={refreshData}>*/}
          {/*  <RefreshCw className="mr-2 h-4 w-4" />*/}
          {/*  Refresh*/}
          {/*</Button>*/}
          <Button
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={exportSponsorsData}
            disabled={isExporting || isLoading || filteredSponsors.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <AddSponsorDialog onSponsorAdded={refreshData} />
        </div>
      </div>

      {/* Stats cards */}
      <SponsorsStats />

      {/* Sponsors data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-brand-purple">Sponsors List</CardTitle>
          <CardDescription>View and manage all sponsors in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <SponsorsToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalResults={filteredSponsors.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
          <DataTable
            columns={SponsorsColumns(handleEditSponsor, handleDeleteSponsor)}
            data={filteredSponsors}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
            pageSize={pageSize}
          />

          {/* Edit Sponsor Dialog */}
          <EditSponsorDialog
            sponsor={editingSponsor}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSponsorUpdated={refreshData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
