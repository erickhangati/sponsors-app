'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardRouter() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    // User is authenticated, redirect based on role
    if (session?.user?.role) {
      const role = session.user.role.toLowerCase();

      if (role === 'admin') {
        router.replace('/admin');
      } else if (role === 'sponsor') {
        router.replace('/sponsors');
      } else {
        // Default fallback for unknown roles
        router.replace('/profile');
      }
    } else {
      // If no role is found, redirect to a default page
      router.replace('/profile');
    }
  }, [status, session, router]);

  // Show a loading state while redirecting
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
