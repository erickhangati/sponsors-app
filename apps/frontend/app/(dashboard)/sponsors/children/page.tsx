'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { columns, type SponsoredChild } from './columns';
import { ChildrenToolbar } from './toolbar';
import { SponsorChildrenStats } from './stats';

export default function ChildrenPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [children, setChildren] = useState<SponsoredChild[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add state for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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
        redirect('/login');
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

  // Check authentication and token validity
  useEffect(() => {
    const checkAuth = async () => {
      if (status === 'unauthenticated') {
        redirect('/login');
      } else if (status === 'authenticated') {
        await validateToken();
      }
    };

    checkAuth();
  }, [status, session]);

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

  // Fetch children data
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

        // Fetch children data
        const response = await axios.get(`${baseUrl}/sponsors/children`, {
          headers,
          params: {
            page: currentPage,
            page_size: pageSize,
          },
        });

        const childrenData = response.data.data.children || [];
        setChildren(childrenData);
        setTotalResults(response.data.data.total_children || 0);
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
          redirect('/login');
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
  }, [session, refreshTrigger, currentPage, pageSize]);

  // Filter and search children
  const filteredChildren = useMemo(() => {
    return children.filter((child) => {
      // Apply gender filter
      if (genderFilter && child.gender !== genderFilter) {
        return false;
      }

      // Apply status filter
      if (statusFilter) {
        const isActive = child.is_active;
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          child.first_name.toLowerCase().includes(searchLower) ||
          child.last_name.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [children, genderFilter, statusFilter, searchTerm]);

  // Prevent UI flash while checking authentication
  if (status === 'loading') return null;

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/login');
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-brand-purple">My Children</h2>
        <p className="text-muted-foreground">View and manage your sponsored children</p>
      </div>

      {/* Stats cards */}
      <SponsorChildrenStats />

      {/* Children data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-brand-purple">My Children List</CardTitle>
          <CardDescription>View details of all your sponsored children</CardDescription>
        </CardHeader>
        <CardContent>
          <ChildrenToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            genderFilter={genderFilter}
            onGenderFilterChange={setGenderFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalResults={filteredChildren.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
          <DataTable
            columns={columns}
            data={filteredChildren}
            isLoading={isLoading}
            pageSize={pageSize}
            pagination={{
              currentPage: currentPage,
              totalPages: Math.ceil(totalResults / pageSize),
              onPageChange: (page) => setCurrentPage(page),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
