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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { sponsorshipFormSchema, type SponsorshipFormValues, SponsorshipStatus } from './schema';

interface AddSponsorshipFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  sponsors: any[];
  children: any[];
}

export function AddSponsorshipForm({
  onSuccess,
  onCancel,
  sponsors,
  children,
}: AddSponsorshipFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDateCalendarOpen, setStartDateCalendarOpen] = useState(false);
  const [yearSelectOpen, setYearSelectOpen] = useState(false);
  const [startDateViewDate, setStartDateViewDate] = useState<Date>(new Date());
  const [openSponsor, setOpenSponsor] = useState(false);
  const [openChild, setOpenChild] = useState(false);
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [childSearch, setChildSearch] = useState('');

  // Get available children (those without active sponsorships)
  const availableChildren = children.filter(
    (child) => !child.sponsorship_status || child.sponsorship_status !== 'active',
  );

  // Initialize form with default values
  const form = useForm<SponsorshipFormValues>({
    resolver: zodResolver(sponsorshipFormSchema),
    defaultValues: {
      sponsor_id: undefined,
      child_id: undefined,
      status: SponsorshipStatus.ACTIVE,
      start_date: new Date(),
      currency: 'KSh',
    },
  });

  const onSubmit = async (data: SponsorshipFormValues) => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating sponsorship...');

    try {
      // Prepare the data for the API
      const sponsorshipData = {
        sponsor_id: data.sponsor_id,
        child_id: data.child_id,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        status: data.status || 'active', // Use default if not provided
      };

      // Make the API request to the correct endpoint
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await axios.post(`${baseUrl}/sponsorships`, sponsorshipData, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.dismiss(loadingToast);

      // Find sponsor and child names for the success message
      const sponsor = sponsors.find((s) => s.id === data.sponsor_id);
      const child = children.find((c) => c.id === data.child_id);
      const sponsorName = sponsor ? `${sponsor.first_name} ${sponsor.last_name}` : 'Sponsor';
      const childName = child ? `${child.first_name} ${child.last_name}` : 'Child';

      toast.success('Sponsorship created successfully', {
        description: `A new sponsorship between ${sponsorName} and ${childName} has been created.`,
      });

      // Call the success callback to refresh the sponsorships list
      onSuccess();
    } catch (error: any) {
      toast.dismiss(loadingToast);

      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to create sponsorship', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to create sponsorship', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }

      console.error('Error creating sponsorship:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Sponsor - Searchable */}
        <FormField
          control={form.control}
          name="sponsor_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Sponsor *</FormLabel>
              <Popover open={openSponsor} onOpenChange={setOpenSponsor}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openSponsor}
                      className={cn(
                        'w-full justify-between cursor-pointer',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      {field.value
                        ? sponsors.find((sponsor) => sponsor.id === field.value)
                          ? `${sponsors.find((sponsor) => sponsor.id === field.value)?.first_name} ${
                              sponsors.find((sponsor) => sponsor.id === field.value)?.last_name
                            }`
                          : 'Select sponsor'
                        : 'Select sponsor'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search sponsor..."
                      value={sponsorSearch}
                      onValueChange={setSponsorSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No sponsor found.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {sponsors
                          .filter((sponsor) => {
                            const fullName =
                              `${sponsor.first_name} ${sponsor.last_name}`.toLowerCase();
                            return (
                              sponsorSearch === '' || fullName.includes(sponsorSearch.toLowerCase())
                            );
                          })
                          .map((sponsor) => (
                            <CommandItem
                              key={sponsor.id}
                              value={`${sponsor.first_name} ${sponsor.last_name}`}
                              onSelect={() => {
                                form.setValue('sponsor_id', sponsor.id);
                                setOpenSponsor(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  field.value === sponsor.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {sponsor.first_name} {sponsor.last_name}
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
                              disabled={child.sponsorship_status === 'active'}
                              className={cn(
                                'cursor-pointer',
                                child.sponsorship_status === 'active' && 'opacity-50',
                              )}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  field.value === child.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {child.first_name} {child.last_name}
                              {child.sponsorship_status === 'active' && ' (Already Sponsored)'}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>Children who are already sponsored are disabled.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
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
                  <SelectItem value={SponsorshipStatus.ACTIVE} className="cursor-pointer">
                    Active
                  </SelectItem>
                  <SelectItem value={SponsorshipStatus.PENDING} className="cursor-pointer">
                    Pending
                  </SelectItem>
                  <SelectItem value={SponsorshipStatus.INACTIVE} className="cursor-pointer">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Defaults to Active if not specified.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Date */}
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => {
            const currentYear = new Date().getFullYear();
            const startYear = 2000;
            const years = Array.from(
              { length: currentYear - startYear + 1 },
              (_, i) => startYear + i,
            );

            return (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date *</FormLabel>
                <Popover open={startDateCalendarOpen} onOpenChange={setStartDateCalendarOpen}>
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
                    <div className="p-2 border-b flex justify-between items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setYearSelectOpen(!yearSelectOpen)}
                        className="cursor-pointer"
                      >
                        {yearSelectOpen
                          ? 'Back to Calendar'
                          : startDateViewDate
                            ? format(startDateViewDate, 'yyyy')
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
                              const newViewDate = new Date(startDateViewDate || new Date());
                              newViewDate.setFullYear(year);
                              setStartDateViewDate(newViewDate);
                              setYearSelectOpen(false);
                            }}
                            className={cn(
                              'justify-center cursor-pointer',
                              startDateViewDate &&
                                startDateViewDate.getFullYear() === year &&
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
                            setStartDateViewDate(date);
                          }
                          setStartDateCalendarOpen(false);
                        }}
                        month={startDateViewDate}
                        onMonthChange={setStartDateViewDate}
                        initialFocus
                        className="cursor-pointer"
                      />
                    )}
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
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
            {isSubmitting ? 'Creating...' : 'Create Sponsorship'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
