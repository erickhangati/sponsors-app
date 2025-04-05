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
import { ReportsColumns, type ChildReport } from './columns';
import { ReportsToolbar } from './toolbar';
import { AddReportDialog } from './add-report-dialog';
import { EditReportDialog } from './edit-report-dialog';
import { ReportsStats } from './stats';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [reports, setReports] = useState<ChildReport[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  // Add state for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  // Add state for status filter
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Add state for edit dialog
  const [editingReport, setEditingReport] = useState<ChildReport | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Add state for page size
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalReports: 0,
  });

  const [isValidToken, setIsValidToken] = useState(false);

  // Function to validate token
  const validateToken = async () => {
    if (!session?.accessToken) {
      setIsValidToken(false);
      return false;
    }

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
      setIsValidToken(true);
      return true;
    } catch (error) {
      setIsValidToken(false);
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

  // Function to trigger a refresh of the reports data
  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle edit report
  const handleEditReport = (report: ChildReport) => {
    setEditingReport(report);
    setIsEditDialogOpen(true);
  };

  // Handle delete report
  const handleDeleteReport = async (report: ChildReport) => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      await axios.delete(`${baseUrl}/reports/${report.id}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.success('Report deleted', {
        description: `The report for ${report.child_name || 'the child'} has been deleted.`,
      });

      // Refresh the data
      refreshData();
    } catch (error) {
      console.error('Error deleting report:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to delete report', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to delete report', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    }
  };

  // Function to export reports data to CSV
  const exportReportsData = () => {
    try {
      setIsExporting(true);

      // Define the CSV headers
      const headers = ['ID', 'Child Name', 'Report Date', 'Report Type', 'Details'];

      // Convert reports data to CSV rows
      const rows = filteredReports.map((report) => [
        report.id,
        report.child_name || `Child ID: ${report.child_id}`,
        report.report_date,
        report.report_type,
        report.details,
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
        `child_reports_export_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: 'Child reports data has been exported to CSV.',
      });
    } catch (error) {
      console.error('Error exporting reports data:', error);
      toast.error('Export failed', {
        description: 'There was an error exporting the reports data.',
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
    let intervalId: NodeJS.Timeout | null = null;

    const startTokenValidation = () => {
      if (status === 'authenticated') {
        // Check token validity every 5 minutes
        intervalId = setInterval(
          () => {
            validateToken();
          },
          5 * 60 * 1000,
        );
      }
    };

    startTokenValidation();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status, session]);

  // Fetch reports and children data
  useEffect(() => {
    let shouldFetch = false;
    if (session?.accessToken) {
      shouldFetch = true;
    }

    const fetchData = async () => {
      if (!session?.accessToken) return;

      setIsLoading(true);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const token = session.accessToken; // Store token in a variable after null check

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        // Fetch reports and children in parallel
        const [reportsResponse, childrenResponse] = await Promise.all([
          axios.get(`${baseUrl}/admin/child-reports`, {
            params: {
              page: pagination.page,
              page_size: pagination.pageSize,
            },
            headers,
          }),
          axios.get(`${baseUrl}/admin/children`, { headers }),
        ]);

        const reportsData = reportsResponse.data.data.child_reports || [];
        const childrenData = childrenResponse.data.data.children || [];

        // Update pagination info
        setPagination({
          page: reportsResponse.data.data.page || 1,
          pageSize: reportsResponse.data.data.page_size || 10,
          totalPages: reportsResponse.data.data.total_pages || 1,
          totalReports: reportsResponse.data.data.total_child_reports || 0,
        });

        // Store children for reference
        setChildren(childrenData);

        // Create a map for quick lookups
        const childrenMap = childrenData.reduce((acc: Record<number, any>, child: any) => {
          acc[child.id] = child;
          return acc;
        }, {});

        // Enhance reports with child names
        const enhancedReports = reportsData.map((report: any) => {
          const child = childrenMap[report.child_id] || {};

          return {
            ...report,
            child_name:
              child.first_name && child.last_name
                ? `${child.first_name} ${child.last_name}`
                : undefined,
          };
        });

        setReports(enhancedReports);
      } catch (error) {
        console.error('Error fetching reports data:', error);

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
          toast.error('Failed to load reports', {
            description: 'There was an error fetching the reports data.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (shouldFetch) {
      fetchData();
    }
  }, [session, refreshTrigger, router, pagination.page, pagination.pageSize]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // Filter and search reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Apply type filter
      if (typeFilter && typeFilter !== 'all') {
        if (report.report_type !== typeFilter) return false;
      }

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        if (report.status !== statusFilter) return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          (report.child_name && report.child_name.toLowerCase().includes(searchLower)) ||
          report.report_type.toLowerCase().includes(searchLower) ||
          report.details.toLowerCase().includes(searchLower) ||
          String(report.child_id).includes(searchLower)
        );
      }

      return true;
    });
  }, [reports, typeFilter, statusFilter, searchTerm]);

  // Prevent UI flash while checking authentication
  if (status === 'loading') return null;

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.replace('/login');
    return null;
  }

  // Add handleViewDetails function
  const handleViewDetails = (report: ChildReport) => {
    router.push(`/admin/reports/${report.id}`);
  };

  // Add event listener for refreshing reports
  useEffect(() => {
    const handleRefreshReports = () => {
      refreshData();
    };

    window.addEventListener('refreshReports', handleRefreshReports);

    return () => {
      window.removeEventListener('refreshReports', handleRefreshReports);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Child Reports</h2>
          <p className="text-muted-foreground">Manage reports for children in the program</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={exportReportsData}
            disabled={isExporting || isLoading || filteredReports.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <AddReportDialog onReportAdded={refreshData} children={children} />
        </div>
      </div>

      {/* Stats cards */}
      <ReportsStats refreshTrigger={refreshTrigger} />

      {/* Reports data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-brand-purple">Reports List</CardTitle>
          <CardDescription>View and manage all child reports in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalResults={pagination.totalReports}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPagination((prev) => ({
                ...prev,
                pageSize: size,
                page: 1, // Reset to first page when changing page size
              }));
            }}
          />
          <DataTable
            columns={ReportsColumns(handleEditReport, handleDeleteReport, handleViewDetails)}
            data={filteredReports}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
            pageSize={pageSize}
            pagination={{
              currentPage: pagination.page,
              totalPages: pagination.totalPages,
              onPageChange: handlePageChange,
            }}
          />

          {/* Edit Report Dialog */}
          <EditReportDialog
            report={editingReport}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onReportUpdated={refreshData}
            children={children}
          />
        </CardContent>
      </Card>
    </div>
  );
}
