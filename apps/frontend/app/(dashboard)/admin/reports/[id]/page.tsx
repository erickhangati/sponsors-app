'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditReportDialog } from '../edit-report-dialog';
import type { ChildReport } from '../columns';

// Function to get report type badge variant
const getReportTypeBadgeVariant = (type: string) => {
  switch (type.toLowerCase()) {
    case 'academic':
    case 'education':
      return 'blue';
    case 'health':
      return 'green';
    case 'social':
      return 'yellow';
    case 'behavioral':
      return 'orange';
    case 'financial':
      return 'purple';
    default:
      return 'default';
  }
};

export default function ReportDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ChildReport | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [children, setChildren] = useState<any[]>([]);

  // Fetch report data
  useEffect(() => {
    const fetchReportData = async () => {
      if (!session?.accessToken || !reportId) return;

      setIsLoading(true);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const headers = {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        // Fetch report and children data in parallel
        const [reportsResponse, childrenResponse] = await Promise.all([
          axios.get(`${baseUrl}/admin/child-reports`, { headers }),
          axios.get(`${baseUrl}/admin/children`, { headers }),
        ]);

        const reportsData = reportsResponse.data.data.child_reports || [];
        const childrenData = childrenResponse.data.data.children || [];

        // Find the specific report
        const foundReport = reportsData.find((r: any) => r.id === Number.parseInt(reportId));

        if (!foundReport) {
          toast.error('Report not found', {
            description: 'The requested report could not be found.',
          });
          router.push('/admin/reports');
          return;
        }

        // Store children for reference
        setChildren(childrenData);

        // Find the child associated with the report
        const child = childrenData.find((c: any) => c.id === foundReport.child_id);

        if (child) {
          setChildName(`${child.first_name} ${child.last_name}`);
        }

        setReport(foundReport);
      } catch (error) {
        console.error('Error fetching report data:', error);
        toast.error('Failed to load report', {
          description: 'There was an error fetching the report data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [session, reportId, router]);

  // Handle marking report as read
  const handleMarkAsRead = async () => {
    if (!session?.accessToken || !report) return;

    setIsMarkingAsRead(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      await axios.patch(
        `${baseUrl}/reports/${report.id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      toast.success('Report marked as read', {
        description: `The report has been marked as read.`,
      });

      // Update the local report state
      setReport({
        ...report,
        status: 'read',
      });

      // Dispatch a custom event to refresh the reports list if the user navigates back
      window.dispatchEvent(new CustomEvent('refreshReports'));
    } catch (error) {
      console.error('Error marking report as read:', error);
      toast.error('Failed to mark report as read', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // Handle delete report
  const handleDeleteReport = async () => {
    if (!session?.accessToken || !report) return;

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
        description: `The report has been deleted.`,
      });

      // Navigate back to the reports list
      router.push('/admin/reports');

      // Dispatch a custom event to refresh the reports list
      window.dispatchEvent(new CustomEvent('refreshReports'));
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report', {
        description: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  // Handle report update
  const handleReportUpdated = () => {
    // Refresh the report data
    const fetchUpdatedReport = async () => {
      if (!session?.accessToken || !reportId) return;

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const headers = {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        const reportsResponse = await axios.get(`${baseUrl}/admin/child-reports`, { headers });
        const reportsData = reportsResponse.data.data.child_reports || [];
        const foundReport = reportsData.find((r: any) => r.id === Number.parseInt(reportId));

        if (foundReport) {
          setReport(foundReport);
        }

        // Dispatch a custom event to refresh the reports list if the user navigates back
        window.dispatchEvent(new CustomEvent('refreshReports'));
      } catch (error) {
        console.error('Error fetching updated report:', error);
      }
    };

    fetchUpdatedReport();
  };

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
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Report Details</h2>
          <p className="text-muted-foreground">View and manage child report information</p>
        </div>
      </div>

      {/* Report details card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-brand-purple">Child Report</CardTitle>
          <CardDescription>Detailed information about this report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : report ? (
            <>
              {/* Four-column grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Child</h3>
                  <p className="text-lg font-semibold text-brand-blue">
                    {childName || `Child ID: ${report.child_id}`}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Report Type</h3>
                  <div>
                    <Badge
                      variant={getReportTypeBadgeVariant(report.report_type) as any}
                      className="text-sm"
                    >
                      {report.report_type}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Report Date</h3>
                  <p className="text-lg font-semibold">
                    {format(new Date(report.report_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div>
                    {report.status === 'read' ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-600 border-green-200"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" /> Read
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                        Unread
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Report Details</h3>
                <div className="bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
                  {report.details}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground">Report not found</p>
          )}
        </CardContent>
        {report && (
          <CardFooter className="flex justify-between border-t px-6 py-4">
            <div className="flex items-center gap-2">
              {report.status === 'unread' && (
                <Button
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 cursor-pointer"
                  onClick={handleMarkAsRead}
                  disabled={isMarkingAsRead}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isMarkingAsRead ? 'Marking as Read...' : 'Mark as Read'}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
                className="cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="cursor-pointer">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the report.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteReport}
                      className="bg-red-600 hover:bg-red-700 cursor-pointer"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Edit Report Dialog */}
      {report && (
        <EditReportDialog
          report={report}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onReportUpdated={handleReportUpdated}
          children={children}
        />
      )}
    </div>
  );
}
