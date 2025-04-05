'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Report {
  id: number;
  child_id: number;
  report_date: string;
  report_type: string;
  details: string;
  status: string;
}

interface Child {
  id: number;
  first_name: string;
  last_name: string;
  profile_image: string | null;
}

export default function ReportDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [report, setReport] = useState<Report | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportDetails = async () => {
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

        // Fetch report details
        const reportResponse = await axios.get(`${baseUrl}/sponsors/reports/${params.id}`, {
          headers,
        });

        if (reportResponse.data && reportResponse.data.data) {
          const reportData = reportResponse.data.data;
          setReport(reportData);

          // If report is unread, mark it as read
          if (reportData.status === 'unread') {
            try {
              await axios.patch(`${baseUrl}/reports/${params.id}/read`, {}, { headers });

              // Update local state
              setReport({ ...reportData, status: 'read' });

              // Notify user
              toast.success('Report marked as read', {
                description: 'This report has been marked as read.',
              });

              // Refresh the unread count in the sidebar
              if (typeof window !== 'undefined' && (window as any).refreshUnreadReportsCount) {
                (window as any).refreshUnreadReportsCount();
              }
            } catch (error) {
              console.error('Error marking report as read:', error);
            }
          }

          // Fetch child details
          try {
            const childrenResponse = await axios.get(`${baseUrl}/sponsors/children`, {
              headers,
            });

            if (childrenResponse.data?.data?.children) {
              const childData = childrenResponse.data.data.children.find(
                (c: any) => c.id === reportData.child_id,
              );
              if (childData) {
                setChild(childData);
              }
            }
          } catch (error) {
            console.error('Error fetching child data:', error);
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error: any) {
        console.error('Error fetching report details:', error);
        setError(error.response?.data?.detail || 'Failed to load report details');
        toast.error('Failed to load report details', {
          description: 'There was an error fetching the report data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportDetails();
  }, [session?.accessToken, params.id]);

  const goBack = () => {
    router.push('/sponsors/reports');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" onClick={goBack} className="cursor-pointer mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Button>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-32 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" onClick={goBack} className="cursor-pointer mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" onClick={goBack} className="cursor-pointer mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Report Not Found</AlertTitle>
          <AlertDescription>The requested report could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Format the date
  let formattedDate = report.report_date;
  try {
    formattedDate = format(parseISO(report.report_date), 'PPP');
  } catch (error) {
    console.error('Error parsing date:', error);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button variant="ghost" onClick={goBack} className="cursor-pointer mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Reports
      </Button>

      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-brand-purple">Report Details</h2>
        <p className="text-muted-foreground">
          Viewing {report.report_type} report from {formattedDate}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-brand-purple">{report.report_type} Report</CardTitle>
                  <CardDescription>Report ID: {report.id}</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={
                    report.status === 'read'
                      ? 'bg-green-50 text-green-600 border-green-200'
                      : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                  }
                >
                  {report.status === 'read' ? 'Read' : 'Unread'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Date</h3>
                <p className="text-base">{formattedDate}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Details</h3>
                <p className="text-base whitespace-pre-line">{report.details}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-purple">Child Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {child ? (
                <>
                  {child.profile_image ? (
                    <div className="flex justify-center">
                      <img
                        src={child.profile_image || '/placeholder.svg'}
                        alt={`${child.first_name} ${child.last_name}`}
                        className="rounded-full w-24 h-24 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <div className="rounded-full w-24 h-24 bg-muted flex items-center justify-center">
                        <User className="h-12 w-12 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="font-medium text-lg">
                      {child.first_name} {child.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">Child ID: {child.id}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={() => router.push(`/sponsors/children/${child.id}`)}
                  >
                    View Child Profile
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p>Child ID: {report.child_id}</p>
                  <p className="text-sm text-muted-foreground mt-2">Child details not available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
