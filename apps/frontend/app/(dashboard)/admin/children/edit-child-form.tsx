'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

import { childEditSchema, type ChildEditValues, Gender } from './schema';
import type { Child } from './columns';

interface EditChildFormProps {
  child: Child;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditChildForm({ child, onSuccess, onCancel }: EditChildFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [yearSelectOpen, setYearSelectOpen] = useState(false);
  const [dobViewDate, setDobViewDate] = useState<Date>(
    child.date_of_birth ? new Date(child.date_of_birth) : new Date(),
  );

  // Initialize form with child values
  const form = useForm<ChildEditValues>({
    resolver: zodResolver(childEditSchema),
    defaultValues: {
      first_name: child.first_name,
      last_name: child.last_name,
      username: (child as any).username || '',
      password: '', // Empty password field
      email: (child as any).email || '',
      phone_number: (child as any).phone_number || '',
      date_of_birth: child.date_of_birth ? new Date(child.date_of_birth) : undefined,
      gender: child.gender as Gender | undefined,
      background_info: child.background_info || '',
      is_active: true,
    },
  });

  const onSubmit = async (data: ChildEditValues) => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Updating child profile...');

    try {
      // Prepare the data for the API
      const childData = {
        ...data,
        role: 'child',
        // Format date to ISO string if it exists
        date_of_birth: data.date_of_birth ? format(data.date_of_birth, 'yyyy-MM-dd') : undefined,
        // Only include password if it was changed
        ...(data.password ? { password: data.password } : {}),
      };

      console.log('Sending data to API:', childData);

      // Make the API request
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      await axios.put(`${baseUrl}/users/${child.id}`, childData, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.dismiss(loadingToast);
      toast.success('Child profile updated successfully', {
        description: `${data.first_name} ${data.last_name}'s information has been updated.`,
      });

      // Call the success callback to refresh the children list
      onSuccess();
    } catch (error: any) {
      toast.dismiss(loadingToast);

      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        console.error('API Error Response:', error.response?.data);
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to update child profile', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to update child profile', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }

      console.error('Error updating child profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* First Name */}
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Last Name */}
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Username */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="johndoe" {...field} />
                </FormControl>
                <FormDescription>
                  Must be unique and contain only letters, numbers, and underscores.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john.doe@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Password (leave blank to keep current)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} {...field} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {showPassword ? 'Hide password' : 'Show password'}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  Must be 8-64 characters with at least one uppercase letter, lowercase letter,
                  number, and special character.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Phone Number */}
          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+254700123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date of Birth */}
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => {
              const currentYear = new Date().getFullYear();
              const startYear = 1900;
              const years = Array.from(
                { length: currentYear - startYear + 1 },
                (_, i) => currentYear - i,
              );

              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth</FormLabel>
                  <div className="relative">
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground',
                              'cursor-pointer',
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-2 border-b flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setYearSelectOpen(!yearSelectOpen)}
                          >
                            {yearSelectOpen
                              ? 'Back to Calendar'
                              : dobViewDate
                                ? format(dobViewDate, 'yyyy')
                                : format(new Date(), 'yyyy')}
                          </Button>
                        </div>
                        {yearSelectOpen ? (
                          <div className="h-[280px] overflow-y-auto p-2 grid grid-cols-4 gap-1">
                            {years.map((year) => (
                              <Button
                                key={year}
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newViewDate = new Date(dobViewDate || new Date());
                                  newViewDate.setFullYear(year);

                                  setDobViewDate(newViewDate);

                                  setYearSelectOpen(false);
                                }}
                                className={cn(
                                  'justify-center',
                                  dobViewDate &&
                                    dobViewDate.getFullYear() === year &&
                                    'bg-primary text-primary-foreground',
                                )}
                              >
                                {year}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              if (date) {
                                setDobViewDate(date);
                              }
                              setCalendarOpen(false);
                            }}
                            month={dobViewDate}
                            onMonthChange={setDobViewDate}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        {/* Gender */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value={Gender.MALE}>
                    Male
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value={Gender.FEMALE}>
                    Female
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Background Info */}
        <FormField
          control={form.control}
          name="background_info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Background Information</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional information about the child..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Active Status */}
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  className="cursor-pointer"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Set the child as active to allow them to be sponsored.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            className="cursor-pointer"
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="cursor-pointer bg-brand-blue hover:bg-brand-blue/80"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Child Profile'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
