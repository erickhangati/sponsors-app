'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';

interface ReportsContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!session?.accessToken) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await axios.get(`${baseUrl}/sponsors/reports`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: {
          status: 'unread',
        },
      });

      if (response.data?.data?.reports) {
        setUnreadCount(response.data.data.reports.length);
      }
    } catch (error) {
      console.error('Error fetching unread reports count:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();

    // Set up periodic refresh (every 60 seconds)
    const intervalId = setInterval(fetchUnreadCount, 60000);

    return () => clearInterval(intervalId);
  }, [session?.accessToken]);

  const refreshUnreadCount = async () => {
    await fetchUnreadCount();
  };

  return (
    <ReportsContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}
