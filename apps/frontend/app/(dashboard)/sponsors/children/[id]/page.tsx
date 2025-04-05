'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Calendar, Clock, CreditCard, FileText, User } from 'lucide-react';

// Define types based on the API response
interface ChildDetails {
  personal_info: {
    profile_image: string | null;
    full_name: string;
    age: number;
    gender: string;
    status: string;
    background_info: string | null;
  };
  sponsorship_details: {
    status: string;
    start_date: string;
    duration_months: number;
  };
  payment_history: {
    total_contributed: number;
    payments: Payment[];
  };
  child_reports: ChildReport[];
  image_gallery: string[];
}

interface Payment {
  amount: number;
  currency: string;
  transaction_id: string;
  payment_method: string;
  status: string;
  payment_date: string;
}

interface ChildReport {
  id: number;
  report_date: string;
  report_type: string;
  status: string;
  details: string;
}

// Extended Session type to include error property
interface ExtendedSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
  accessToken?: string;
  error?: string;
}

export default function ChildDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const extendedSession = session as ExtendedSession | null;

  const [childDetails, setChildDetails] = useState<ChildDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refreshToken = async () => {
      if (extendedSession?.error === 'RefreshAccessTokenError') {
        toast.error('Your session has expired. Please log in again.');
        router.push('/login');
      }
    };

    refreshToken();
  }, [extendedSession, router]);

  useEffect(() => {
    const fetchChildDetails = async () => {
      if (!session?.accessToken) return;

      try {
        setIsLoading(true);
        setError(null);

        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await axios.get(`${baseUrl}/sponsors/children/${params.id}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        if (response.data && response.data.data) {
          setChildDetails(response.data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error: any) {
        console.error('Error fetching child details:', error);
        setError(error.response?.data?.detail || 'Failed to load child details');
        toast.error('Failed to load child details', {
          description: 'There was an error fetching the child details.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildDetails();
  }, [session?.accessToken, params.id]);

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'PPP');
    } catch (e) {
      // Handle date strings that might be in a different format (like just YYYY-MM-DD)
      try {
        return format(new Date(dateString), 'PPP');
      } catch (e) {
        return dateString;
      }
    }
  };

  // Helper function to get status badge with appropriate colors
  const getStatusBadge = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'active' || lowerStatus === 'completed') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
          {status}
        </Badge>
      );
    } else if (lowerStatus === 'pending') {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
          {status}
        </Badge>
      );
    } else if (lowerStatus === 'inactive' || lowerStatus === 'failed') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
          {status}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
          {status}
        </Badge>
      );
    }
  };

  // Helper function to get report status badge
  const getReportStatusBadge = (status: string) => {
    if (status.toLowerCase() === 'read') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
          Read
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
          Unread
        </Badge>
      );
    }
  };

  // Helper function to get placeholder image based on gender
  const getPlaceholderImage = (gender: string) => {
    return gender.toLowerCase() === 'female' ? '/female.jpg' : '/male.jpg';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 cursor-pointer">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Children
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : childDetails ? (
        <>
          <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-brand-purple">
              {childDetails.personal_info.full_name}
            </h2>
            <p className="text-muted-foreground">Child Profile</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview" className="cursor-pointer text-brand-blue">
                Overview
              </TabsTrigger>
              <TabsTrigger value="payments" className="cursor-pointer text-brand-blue">
                Payments
              </TabsTrigger>
              <TabsTrigger value="reports" className="cursor-pointer text-brand-blue">
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Personal Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-brand-purple">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage
                          src={
                            childDetails.personal_info.profile_image ||
                            getPlaceholderImage(childDetails.personal_info.gender)
                          }
                          alt={childDetails.personal_info.full_name}
                        />
                        <AvatarFallback className="text-lg">
                          {childDetails.personal_info.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold">
                          {childDetails.personal_info.full_name}
                        </h3>
                        <div className="mt-1">
                          {getStatusBadge(childDetails.personal_info.status)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Gender</p>
                          <p className="text-sm text-muted-foreground">
                            {childDetails.personal_info.gender}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Age</p>
                          <p className="text-sm text-muted-foreground">
                            {childDetails.personal_info.age} years
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Background Information</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {childDetails.personal_info.background_info ||
                          'No background information available.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Sponsorship Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-brand-purple">Sponsorship Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Status</p>
                      {getStatusBadge(childDetails.sponsorship_details.status)}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Start Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(childDetails.sponsorship_details.start_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="text-sm text-muted-foreground">
                          {childDetails.sponsorship_details.duration_months} months
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-4">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Total Contributed</p>
                        <p className="text-lg font-bold text-brand-blue">
                          KSh {childDetails.payment_history.total_contributed.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Reports Summary Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-brand-purple">Recent Reports</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {childDetails.child_reports.length > 0 ? (
                      <div className="space-y-4">
                        {childDetails.child_reports.slice(0, 3).map((report) => (
                          <div key={report.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{report.report_type} Report</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(report.report_date)}
                              </p>
                            </div>
                            {getReportStatusBadge(report.status)}
                          </div>
                        ))}
                        {childDetails.child_reports.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 cursor-pointer"
                            onClick={() =>
                              (
                                document.querySelector(
                                  '[data-value="reports"]',
                                ) as HTMLButtonElement
                              )?.click()
                            }
                          >
                            View all reports
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No reports available.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Payments Summary Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-brand-purple">Recent Payments</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {childDetails.payment_history.payments.length > 0 ? (
                      <div className="space-y-4">
                        {childDetails.payment_history.payments.slice(0, 3).map((payment, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {payment.currency} {payment.amount.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(payment.payment_date)}
                              </p>
                            </div>
                            <div className="text-xs">
                              {payment.status === 'completed' ? (
                                <span className="text-green-600">Completed</span>
                              ) : payment.status === 'pending' ? (
                                <span className="text-yellow-600">Pending</span>
                              ) : (
                                <span className="text-red-600">Failed</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {childDetails.payment_history.payments.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 cursor-pointer"
                            onClick={() =>
                              (
                                document.querySelector(
                                  '[data-value="payments"]',
                                ) as HTMLButtonElement
                              )?.click()
                            }
                          >
                            View all payments
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No payment history available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle className="text-brand-purple">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {childDetails.payment_history.payments.length > 0 ? (
                    <div className="space-y-6">
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Date
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Amount
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Method
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Transaction ID
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {childDetails.payment_history.payments.map((payment, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(payment.payment_date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {payment.currency} {payment.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {payment.payment_method}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {payment.transaction_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {payment.status === 'completed' ? (
                                    <span className="text-xs text-green-600">Completed</span>
                                  ) : payment.status === 'pending' ? (
                                    <span className="text-xs text-yellow-600">Pending</span>
                                  ) : (
                                    <span className="text-xs text-red-600">Failed</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium">Total Contributed</p>
                        <p className="text-lg font-bold text-brand-blue">
                          KSh {childDetails.payment_history.total_contributed.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No payment history available.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle className="text-brand-purple">Child Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {childDetails.child_reports.length > 0 ? (
                    <div className="space-y-4">
                      {childDetails.child_reports.map((report) => (
                        <div key={report.id} className="border border-gray-200 rounded-md p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-brand-blue">
                              {report.report_type} Report
                            </h3>
                            {getReportStatusBadge(report.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            <Calendar className="inline-block mr-2 h-4 w-4" />
                            {formatDate(report.report_date)}
                          </p>
                          {/* Added report details preview */}
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {report.details || 'No details available for this report.'}
                          </p>
                          <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => router.push(`/sponsors/reports/${report.id}`)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View Full Report
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No reports available for this child.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>Child information could not be found.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
