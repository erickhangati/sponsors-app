'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

import { sponsorshipEditSchema, type SponsorshipEditValues, SponsorshipStatus } from './schema';
import type { Sponsorship } from './columns';

interface EditSponsorshipFormProps {
  sponsorship: Sponsorship;
  onSuccess: () => void;
  onCancel: () => void;
  sponsors: any[];
  children: any[];
}

export function EditSponsorshipForm({
  sponsorship,
  onSuccess,
  onCancel,
  sponsors,
  children,
}: EditSponsorshipFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDateCalendarOpen, setStartDateCalendarOpen] = useState(false);
  const [startDateViewDate, setStartDateViewDate] = useState<Date>(
    sponsorship.start_date ? new Date(sponsorship.start_date) : new Date(),
  );

  // Initialize form with sponsorship values - only include fields that can be updated
  const form = useForm<SponsorshipEditValues>({
    resolver: zodResolver(sponsorshipEditSchema),
    defaultValues: {
      start_date: sponsorship.start_date ? new Date(sponsorship.start_date) : new Date(),
      status: sponsorship.status as SponsorshipStatus,
    },
  });

  const onSubmit = async (data: SponsorshipEditValues) => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Updating sponsorship...');

    try {
      // Prepare the data for the API - only include fields that can be updated
      const sponsorshipData: Record<string, any> = {
        status: data.status,
      };

      // Only include start_date if it's defined
      if (data.start_date) {
        sponsorshipData.start_date = format(data.start_date, 'yyyy-MM-dd');
      }

      // Make the API request using PATCH method to the correct endpoint
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      await axios.patch(`${baseUrl}/sponsorships/${sponsorship.id}`, sponsorshipData, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.dismiss(loadingToast);
      toast.success('Sponsorship updated successfully', {
        description: `The sponsorship between ${sponsorship.sponsor_name} and ${sponsorship.child_name} has been updated.`,
      });

      // Call the success callback to refresh the sponsorships list
      onSuccess();
    } catch (error: any) {
      toast.dismiss(loadingToast);

      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to update sponsorship', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to update sponsorship', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }

      console.error('Error updating sponsorship:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Sponsor - Read-only */}
          <FormItem>
            <FormLabel>Sponsor</FormLabel>
            <Input
              value={
                sponsors.find((s) => s.id === sponsorship.sponsor_id)
                  ? `${sponsors.find((s) => s.id === sponsorship.sponsor_id)?.first_name} ${
                      sponsors.find((s) => s.id === sponsorship.sponsor_id)?.last_name
                    }`
                  : 'Unknown Sponsor'
              }
              disabled
            />
            <FormDescription>Sponsor cannot be changed</FormDescription>
          </FormItem>

          {/* Child - Read-only */}
          <FormItem>
            <FormLabel>Child</FormLabel>
            <Input
              value={
                children.find((c) => c.id === sponsorship.child_id)
                  ? `${children.find((c) => c.id === sponsorship.child_id)?.first_name} ${
                      children.find((c) => c.id === sponsorship.child_id)?.last_name
                    }`
                  : 'Unknown Child'
              }
              disabled
            />
            <FormDescription>Child cannot be changed</FormDescription>
          </FormItem>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem className="cursor-pointer" value={SponsorshipStatus.ACTIVE}>
                      Active
                    </SelectItem>
                    <SelectItem className="cursor-pointer" value={SponsorshipStatus.PENDING}>
                      Pending
                    </SelectItem>
                    <SelectItem className="cursor-pointer" value={SponsorshipStatus.INACTIVE}>
                      Inactive
                    </SelectItem>
                    <SelectItem className="cursor-pointer" value={SponsorshipStatus.TERMINATED}>
                      Terminated
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Date */}
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date *</FormLabel>
                <Popover open={startDateCalendarOpen} onOpenChange={setStartDateCalendarOpen}>
                  <PopoverTrigger className="cursor-pointer" asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        if (date) {
                          setStartDateViewDate(date);
                        }
                        setStartDateCalendarOpen(false);
                      }}
                      month={startDateViewDate}
                      onMonthChange={setStartDateViewDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
            {isSubmitting ? 'Updating...' : 'Update Sponsorship'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
