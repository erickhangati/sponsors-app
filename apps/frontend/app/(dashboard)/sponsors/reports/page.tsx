'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { ReportsToolbar } from './toolbar';
import { Stats } from './stats';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Define interfaces for API responses
interface ReportResponse {
  message: string;
  data: {
    page: number;
    page_size: number;
    total_reports: number;
    total_pages: number;
    reports: Report[];
  };
}

interface Report {
  id: number;
  child_id: number;
  report_date: string;
  report_type: string;
  details: string;
  status: string;
  child_name?: string; // Added after mapping
}

// Interface for child data
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

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableKey, setTableKey] = useState(0);

  // Stats data
  const [totalReports, setTotalReports] = useState(0);
  const [unreadReports, setUnreadReports] = useState(0);
  const [readReports, setReadReports] = useState(0);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
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

          if (childrenResponse.data?.data?.children) {
            // Create a map of child IDs to names
            childrenResponse.data.data.children.forEach((child) => {
              if (child.id) {
                const fullName = `${child.first_name} ${child.last_name}`;
                childrenMap.set(child.id, fullName);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching children data:', error);
        }

        // Fetch reports data
        const reportsResponse = await axios.get<ReportResponse>(`${baseUrl}/sponsors/reports`, {
          headers,
        });

        if (reportsResponse.data?.data?.reports) {
          const fetchedReports = reportsResponse.data.data.reports;

          // Calculate stats
          setTotalReports(reportsResponse.data.data.total_reports);
          setUnreadReports(fetchedReports.filter((report) => report.status === 'unread').length);
          setReadReports(fetchedReports.filter((report) => report.status === 'read').length);

          // Add child names to reports data
          const reportsWithChildNames = fetchedReports.map((report) => {
            const childName = childrenMap.get(report.child_id);
            return {
              ...report,
              child_name: childName || `Child #${report.child_id}`,
            };
          });

          setReports(reportsWithChildNames);
        } else {
          setReports([]);
        }
      } catch (error: any) {
        console.error('Error fetching reports:', error);
        setError(error.response?.data?.detail || 'Failed to load reports');
        toast.error('Failed to load reports', {
          description: 'There was an error fetching your report data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [session?.accessToken]);

  // Filter reports based on search term and filters
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Apply type filter
      if (typeFilter && report.report_type !== typeFilter) {
        return false;
      }

      // Apply status filter
      if (statusFilter && report.status !== statusFilter) {
        return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          report.report_type.toLowerCase().includes(searchLower) ||
          (report.child_name && report.child_name.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [reports, typeFilter, statusFilter, searchTerm]);

  // Force table re-render when filters change
  useEffect(() => {
    setTableKey((prev) => prev + 1);
  }, [searchTerm, typeFilter, statusFilter]);

  // Get unique report types for filter options
  const reportTypes = useMemo(() => {
    const types = new Set<string>();
    reports.forEach((report) => {
      if (report.report_type) {
        types.add(report.report_type);
      }
    });
    return Array.from(types);
  }, [reports]);

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Reports</h2>
        <p className="text-muted-foreground">View and manage your child reports.</p>
      </div>

      <Stats totalReports={totalReports} unreadReports={unreadReports} readReports={readReports} />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-brand-purple">Report History</CardTitle>
            <CardDescription>A list of all reports for your sponsored children.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReportsToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              reportTypes={reportTypes}
            />
            <DataTable
              key={tableKey}
              columns={columns}
              data={filteredReports}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
