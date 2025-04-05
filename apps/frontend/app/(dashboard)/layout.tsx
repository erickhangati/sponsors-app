import React, { FC, ReactNode } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';

interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default Layout;
