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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

import { reportEditSchema, type ReportEditValues, ReportType, ReportStatus } from './schema';
import type { ChildReport } from './columns';

interface EditReportFormProps {
  report: ChildReport;
  onSuccess: () => void;
  onCancel: () => void;
  children: any[];
}

export function EditReportForm({ report, onSuccess, onCancel, children }: EditReportFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportDateCalendarOpen, setReportDateCalendarOpen] = useState(false);
  const [reportDateViewDate, setReportDateViewDate] = useState<Date>(
    report.report_date ? new Date(report.report_date) : new Date(),
  );

  // Initialize form with report values
  const form = useForm<ReportEditValues>({
    resolver: zodResolver(reportEditSchema),
    defaultValues: {
      report_date: report.report_date ? new Date(report.report_date) : new Date(),
      report_type: report.report_type,
      details: report.details,
      status: report.status,
    },
  });

  const onSubmit = async (data: ReportEditValues) => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Updating report...');

    try {
      // Prepare the data for the API
      const reportData = {
        ...data,
        report_date: format(data.report_date, 'yyyy-MM-dd'),
      };

      // Make the API request
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      await axios.patch(`${baseUrl}/reports/${report.id}`, reportData, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.dismiss(loadingToast);

      // Find child name for the success message
      const child = children.find((c) => c.id === report.child_id);
      const childName = child ? `${child.first_name} ${child.last_name}` : 'Child';

      toast.success('Report updated successfully', {
        description: `The ${data.report_type.toLowerCase()} report for ${childName} has been updated.`,
      });

      // Call the success callback to refresh the reports list
      onSuccess();
    } catch (error: any) {
      toast.dismiss(loadingToast);

      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to update report', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to update report', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }

      console.error('Error updating report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Child - Read-only */}
        <FormItem>
          <FormLabel>Child</FormLabel>
          <Input
            value={
              children.find((c) => c.id === report.child_id)
                ? `${children.find((c) => c.id === report.child_id)?.first_name} ${
                    children.find((c) => c.id === report.child_id)?.last_name
                  }`
                : `Child ID: ${report.child_id}`
            }
            disabled
          />
          <FormDescription>Child cannot be changed</FormDescription>
        </FormItem>

        {/* Report Date */}
        <FormField
          control={form.control}
          name="report_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Report Date *</FormLabel>
              <Popover open={reportDateCalendarOpen} onOpenChange={setReportDateCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal cursor-pointer',
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
                        setReportDateViewDate(date);
                      }
                      setReportDateCalendarOpen(false);
                    }}
                    month={reportDateViewDate}
                    onMonthChange={setReportDateViewDate}
                    initialFocus
                    className="cursor-pointer"
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Report Type */}
        <FormField
          control={form.control}
          name="report_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Report Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ReportType.ACADEMIC} className="cursor-pointer">
                    Academic
                  </SelectItem>
                  <SelectItem value={ReportType.HEALTH} className="cursor-pointer">
                    Health
                  </SelectItem>
                  <SelectItem value={ReportType.EDUCATION} className="cursor-pointer">
                    Education
                  </SelectItem>
                  <SelectItem value={ReportType.OTHER} className="cursor-pointer">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ReportStatus.READ} className="cursor-pointer">
                    Read
                  </SelectItem>
                  <SelectItem value={ReportStatus.UNREAD} className="cursor-pointer">
                    Unread
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Details */}
        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter detailed information about the child's progress or status..."
                  className="resize-none min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide comprehensive information about the child's progress, achievements, or
                challenges.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-blue hover:bg-brand-blue/80 cursor-pointer"
          >
            {isSubmitting ? 'Updating...' : 'Update Report'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
