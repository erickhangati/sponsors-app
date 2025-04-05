'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Home,
  CreditCard,
  FileText,
  UserPlus,
  LogOut,
  User,
  Award,
  Loader2,
} from 'lucide-react';

import { useSession, signOut } from 'next-auth/react';
import axios from 'axios';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { toast } from 'sonner';

// Define user profile type
type UserProfile = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  email: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  background_info?: string;
  profile_image?: string | null;
  is_active: boolean;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to refresh unread reports count
  const refreshUnreadCount = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Make refreshUnreadCount available globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshUnreadReportsCount = refreshUnreadCount;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).refreshUnreadReportsCount;
      }
    };
  }, []);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.accessToken) return;

      try {
        setIsLoadingProfile(true);
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await axios.get(`${baseUrl}/users/me`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        setUserProfile(response.data.data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load user profile');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (status === 'authenticated') {
      fetchUserProfile();
    }
  }, [session, status]);

  // Fetch unread reports count for sponsors
  useEffect(() => {
    const fetchUnreadReportsCount = async () => {
      if (!session?.accessToken || userProfile?.role !== 'sponsor') {
        return;
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await axios.get(`${baseUrl}/sponsors/reports`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        if (response.data?.data?.reports) {
          const unreadCount = response.data.data.reports.filter(
            (report: any) => report.status === 'unread',
          ).length;
          setUnreadReportsCount(unreadCount);
        }
      } catch (error) {
        console.error('Error fetching unread reports count:', error);
      }
    };

    if (userProfile?.role === 'sponsor') {
      fetchUnreadReportsCount();

      // Set up interval to refresh the count every minute
      const intervalId = setInterval(fetchUnreadReportsCount, 60000);
      return () => clearInterval(intervalId);
    }
  }, [session?.accessToken, userProfile, refreshTrigger]);

  // Show loading state
  if (status === 'loading' || (status === 'authenticated' && isLoadingProfile)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Get profile image based on gender or use placeholder
  const getProfileImage = () => {
    if (userProfile?.profile_image) {
      return userProfile.profile_image;
    }

    // Use gender-specific placeholder
    if (userProfile?.gender === 'Male') {
      return '/male.jpg';
    } else if (userProfile?.gender === 'Female') {
      return '/female.jpg';
    }

    // Default placeholder
    return '/placeholder.svg?height=40&width=40';
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name.charAt(0)}${userProfile.last_name.charAt(0)}`;
    }
    return userProfile?.username?.charAt(0) || 'U';
  };

  // Define navigation based on user role
  const getNavigation = () => {
    const role = userProfile?.role || session?.user?.role;

    if (role === 'admin') {
      return [
        { name: 'Dashboard', href: '/admin', icon: Home },
        { name: 'Sponsors', href: '/admin/sponsors', icon: UserPlus },
        { name: 'Children', href: '/admin/children', icon: Users },
        {
          name: 'Sponsorships',
          href: '/admin/sponsorships',
          icon: Award,
        },
        { name: 'Payments', href: '/admin/payments', icon: CreditCard },
        { name: 'Reports', href: '/admin/reports', icon: FileText },
      ];
    } else if (role === 'sponsor') {
      return [
        { name: 'Dashboard', href: '/sponsors', icon: Home },
        { name: 'My Children', href: '/sponsors/children', icon: Users },
        {
          name: 'Payments',
          href: '/sponsors/payments',
          icon: CreditCard,
        },
        { name: 'Reports', href: '/sponsors/reports', icon: FileText },
      ];
    } else {
      return [{ name: 'Profile', href: '/profile', icon: User }];
    }
  };

  const navigation = getNavigation();

  // Find the active navigation item
  const findActiveNavItem = () => {
    // Sort navigation items by href length (descending) so more specific routes are checked first
    const sortedNavItems = [...navigation].sort((a, b) => b.href.length - a.href.length);

    // Find the first item where pathname matches or starts with the href
    const activeItem = sortedNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
    );

    return activeItem?.href || '';
  };

  const activeNavHref = findActiveNavItem();

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <Sidebar>
          <SidebarHeader className="flex h-14 items-start border-b px-6">
            <Link href="/" className="flex flex-col">
              <h1 className="font-medium text-brand-blue">Mision ID</h1>
              <p className="text-xs text-muted-foreground">Heart for Africa</p>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu className="gap-2">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.href === activeNavHref}
                    tooltip={item.name}
                  >
                    <Link href={item.href} className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <item.icon
                          className={`h-5 w-5 mr-3 ${item.href === activeNavHref ? 'text-brand-blue' : 'text-muted-foreground'}`}
                        />
                        <span
                          className={`text-base ${
                            item.href === activeNavHref
                              ? 'text-brand-blue font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                      {item.name === 'Reports' &&
                        userProfile?.role === 'sponsor' &&
                        unreadReportsCount > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                            {unreadReportsCount}
                          </span>
                        )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={getProfileImage()} alt={userProfile?.first_name || 'User'} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">
                  {userProfile?.first_name || session?.user?.name || 'User'}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {userProfile?.role || session?.user?.role || 'User'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="ml-auto cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
            <SidebarTrigger />
            <div className="flex-1" />
            <SettingsDialog />
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
