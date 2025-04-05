'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';

/**
 * Login Page Component
 * - Redirects authenticated users to the dashboard
 * - Shows login form for unauthenticated users
 */
const LoginPage: React.FC = () => {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status === 'loading') return null;
  return <LoginForm />;
};

export default LoginPage;
