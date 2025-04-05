'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { reportFormSchema, type ReportFormValues, ReportType, ReportStatus } from './schema';

interface AddReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  children: any[];
}

export function AddReportForm({ onSuccess, onCancel, children }: AddReportFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportDateCalendarOpen, setReportDateCalendarOpen] = useState(false);
  const [reportDateViewDate, setReportDateViewDate] = useState<Date>(new Date());
  const [openChild, setOpenChild] = useState(false);
  const [childSearch, setChildSearch] = useState('');

  // Initialize form with default values
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      child_id: undefined,
      report_date: new Date(),
      report_type: ReportType.ACADEMIC,
      details: '',
    },
  });

  const onSubmit = async (data: ReportFormValues) => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating report...');

    try {
      // Prepare the data for the API
      const reportData = {
        ...data,
        report_date: format(data.report_date, 'yyyy-MM-dd'),
        status: ReportStatus.UNREAD, // Always set new reports as unread
      };

      // Make the API request
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await axios.post(`${baseUrl}/reports`, reportData, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.dismiss(loadingToast);

      // Find child name for the success message
      const child = children.find((c) => c.id === data.child_id);
      const childName = child ? `${child.first_name} ${child.last_name}` : 'Child';

      toast.success('Report created successfully', {
        description: `A new ${data.report_type.toLowerCase()} report for ${childName} has been created.`,
      });

      // Call the success callback to refresh the reports list
      onSuccess();
    } catch (error: any) {
      toast.dismiss(loadingToast);

      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to create report', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to create report', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }

      console.error('Error creating report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Child - Searchable */}
        <FormField
          control={form.control}
          name="child_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Child *</FormLabel>
              <Popover open={openChild} onOpenChange={setOpenChild}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openChild}
                      className={cn(
                        'w-full justify-between cursor-pointer',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      {field.value
                        ? children.find((child) => child.id === field.value)
                          ? `${children.find((child) => child.id === field.value)?.first_name} ${
                              children.find((child) => child.id === field.value)?.last_name
                            }`
                          : 'Select child'
                        : 'Select child'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search child..."
                      value={childSearch}
                      onValueChange={setChildSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No child found.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {children
                          .filter((child) => {
                            const fullName = `${child.first_name} ${child.last_name}`.toLowerCase();
                            return (
                              childSearch === '' || fullName.includes(childSearch.toLowerCase())
                            );
                          })
                          .map((child) => (
                            <CommandItem
                              key={child.id}
                              value={`${child.first_name} ${child.last_name}`}
                              onSelect={() => {
                                form.setValue('child_id', child.id);
                                setOpenChild(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  field.value === child.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {child.first_name} {child.last_name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  <SelectItem value={ReportType.FINANCIAL} className="cursor-pointer">
                    Financial
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
            className="bg-brand-blue hover:bg-brand-blue/90 cursor-pointer"
          >
            {isSubmitting ? 'Creating...' : 'Create Report'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
