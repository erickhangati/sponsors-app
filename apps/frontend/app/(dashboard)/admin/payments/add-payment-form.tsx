'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { paymentFormSchema, type PaymentFormValues, PaymentStatus } from './schema';

interface AddPaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  sponsors: any[];
  children: any[];
}

export function AddPaymentForm({ onSuccess, onCancel, sponsors, children }: AddPaymentFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDateCalendarOpen, setPaymentDateCalendarOpen] = useState(false);
  const [paymentDateViewDate, setPaymentDateViewDate] = useState<Date>(new Date());
  const [openSponsor, setOpenSponsor] = useState(false);
  const [openChild, setOpenChild] = useState(false);
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [activeSponsorships, setActiveSponsorships] = useState<Record<string, boolean>>({});
  const [isLoadingSponsorships, setIsLoadingSponsorships] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize form with default values
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      sponsor_id: undefined,
      child_id: undefined,
      amount: 0, // Changed from undefined to 0
      currency: 'KSh', // Changed from KSh to KES to match backend
      transaction_id: '',
      payment_method: 'Mpesa',
      status: PaymentStatus.COMPLETED,
      payment_date: new Date(),
      notes: '',
    },
  });

  // Watch for changes to sponsor_id and child_id
  const sponsorId = form.watch('sponsor_id');
  const childId = form.watch('child_id');

  // Fetch active sponsorships when sponsor or child changes
  useEffect(() => {
    const fetchActiveSponsorships = async () => {
      if (!session?.accessToken || !sponsorId || !childId) return;

      setIsLoadingSponsorships(true);
      setValidationError(null);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await axios.get(`${baseUrl}/admin/sponsorships`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        const sponsorships = response.data.data.sponsorships || [];

        // Check if there's an active sponsorship between the selected sponsor and child
        const key = `${sponsorId}-${childId}`;
        const hasActiveSponsorship = sponsorships.some(
          (s: any) => s.sponsor_id === sponsorId && s.child_id === childId && s.status === 'active',
        );

        setActiveSponsorships((prev) => ({
          ...prev,
          [key]: hasActiveSponsorship,
        }));

        if (!hasActiveSponsorship) {
          setValidationError(
            'No active sponsorship found between the selected sponsor and child. Please create a sponsorship first.',
          );
        }
      } catch (error) {
        console.error('Error fetching sponsorships:', error);
      } finally {
        setIsLoadingSponsorships(false);
      }
    };

    if (sponsorId && childId) {
      fetchActiveSponsorships();
    }
  }, [sponsorId, childId, session]);

  const onSubmit = async (data: PaymentFormValues) => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    // Check if there's an active sponsorship
    const key = `${data.sponsor_id}-${data.child_id}`;
    if (!activeSponsorships[key]) {
      setValidationError(
        'No active sponsorship found between the selected sponsor and child. Please create a sponsorship first.',
      );
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating payment record...');

    try {
      // Prepare the data for the API
      const paymentData = {
        ...data,
        payment_date: format(data.payment_date, "yyyy-MM-dd'T'HH:mm:ss"), // Ensure correct ISO format
      };

      // Make the API request
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await axios.post(`${baseUrl}/payments`, paymentData, {
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

      toast.success('Payment recorded successfully', {
        description: `A payment of ${data.currency} ${data.amount} from ${sponsorName} for ${childName} has been recorded.`,
      });

      // Call the success callback to refresh the payments list
      onSuccess();
    } catch (error: any) {
      toast.dismiss(loadingToast);

      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        const errorMessage =
          typeof error.response?.data?.detail === 'string'
            ? error.response?.data?.detail
            : 'Validation error. Please check your input.';

        toast.error('Failed to record payment', {
          description: errorMessage,
        });

        // Set validation error for specific error cases
        if (error.response?.status === 422 || error.response?.status === 400) {
          setValidationError(errorMessage);
        }
      } else {
        toast.error('Failed to record payment', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }

      console.error('Error recording payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                sponsorSearch === '' ||
                                fullName.includes(sponsorSearch.toLowerCase())
                              );
                            })
                            .map((sponsor) => (
                              <CommandItem
                                key={sponsor.id}
                                value={`${sponsor.first_name} ${sponsor.last_name}`}
                                onSelect={() => {
                                  form.setValue('sponsor_id', sponsor.id);
                                  setOpenSponsor(false);
                                  setValidationError(null);
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
                              const fullName =
                                `${child.first_name} ${child.last_name}`.toLowerCase();
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
                                  setValidationError(null);
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="5000"
                    {...field}
                    value={field.value || ''} // Ensure value is never undefined
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Currency */}
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="KSh" className="cursor-pointer">
                      KSh (Kenyan Shilling)
                    </SelectItem>
                    <SelectItem value="USD" className="cursor-pointer">
                      USD (US Dollar)
                    </SelectItem>
                    <SelectItem value="EUR" className="cursor-pointer">
                      EUR (Euro)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Transaction ID */}
          <FormField
            control={form.control}
            name="transaction_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction ID *</FormLabel>
                <FormControl>
                  <Input placeholder="TXN123456" {...field} />
                </FormControl>
                <FormDescription>Unique identifier for this payment</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment Method */}
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Mpesa" className="cursor-pointer">
                      M-Pesa
                    </SelectItem>
                    <SelectItem value="Bank Transfer" className="cursor-pointer">
                      Bank Transfer
                    </SelectItem>
                    <SelectItem value="Credit Card" className="cursor-pointer">
                      Credit Card
                    </SelectItem>
                    <SelectItem value="Cash" className="cursor-pointer">
                      Cash
                    </SelectItem>
                    <SelectItem value="Other" className="cursor-pointer">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <SelectItem value={PaymentStatus.COMPLETED} className="cursor-pointer">
                      Completed
                    </SelectItem>
                    <SelectItem value={PaymentStatus.PENDING} className="cursor-pointer">
                      Pending
                    </SelectItem>
                    <SelectItem value={PaymentStatus.FAILED} className="cursor-pointer">
                      Failed
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment Date */}
          <FormField
            control={form.control}
            name="payment_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Payment Date *</FormLabel>
                <Popover open={paymentDateCalendarOpen} onOpenChange={setPaymentDateCalendarOpen}>
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
                          setPaymentDateViewDate(date);
                        }
                        setPaymentDateCalendarOpen(false);
                      }}
                      month={paymentDateViewDate}
                      onMonthChange={setPaymentDateViewDate}
                      initialFocus
                      className="cursor-pointer"
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
            disabled={isSubmitting || !!validationError}
            className="bg-brand-blue hover:bg-brand-blue/90 cursor-pointer"
          >
            {isSubmitting ? 'Creating...' : 'Create Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
