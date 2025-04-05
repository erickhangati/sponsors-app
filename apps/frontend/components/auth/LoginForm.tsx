'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

// Define form validation schema using Zod
const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password cannot exceed 64 characters')
    .regex(/[A-Z]/, 'Password must have at least one uppercase letter')
    .regex(/[a-z]/, 'Password must have at least one lowercase letter')
    .regex(/[0-9]/, 'Password must have at least one number')
    .regex(/[\W_]/, 'Password must have at least one special character')
    .regex(/^\S*$/, 'Password must not contain spaces'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  // React Hook Form Setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  // Login handler
  const onSubmit = async (data: LoginFormValues) => {
    // Show loading toast
    const loadingToast = toast.loading('Signing in...');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        username: data.username,
        password: data.password,
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (result?.error) {
        toast.error('Authentication failed', {
          description: 'Invalid username or password',
        });
      } else {
        toast.success('Signed in successfully', {
          description: 'Welcome back!',
        });
        router.replace('/');
      }
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      toast.error('Something went wrong', {
        description: 'Please try again later',
      });
    }
  };

  if (status === 'loading') return null;

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col items-center justify-center p-4">
        {/* Logo positioned above the form */}
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-lg shadow-sm p-8 space-y-6 border-t-[5px] border-brand-blue">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-brand-purple">Welcome Back</h1>
              <p className="text-muted-foreground">
                Enter your credentials to access your account.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" type="text" {...register('username')} />
                {errors.username && (
                  <p className="text-red-500 text-sm">{errors.username.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end">
                <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full bg-brand-blue hover:bg-brand-blue/80 cursor-pointer"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return null; // Prevents flashing if authenticated
};

export default LoginForm;
