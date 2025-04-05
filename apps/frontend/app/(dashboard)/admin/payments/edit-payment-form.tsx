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

import { paymentEditSchema, type PaymentEditValues, PaymentStatus } from './schema';
import type { Payment } from './columns';

interface EditPaymentFormProps {
  payment: Payment;
  onSuccess: () => void;
  onCancel: () => void;
  sponsors: any[];
  children: any[];
}

export function EditPaymentForm({
  payment,
  onSuccess,
  onCancel,
  sponsors,
  children,
}: EditPaymentFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDateCalendarOpen, setPaymentDateCalendarOpen] = useState(false);
  const [paymentDateViewDate, setPaymentDateViewDate] = useState<Date>(
    payment.payment_date ? new Date(payment.payment_date) : new Date(),
  );

  // Initialize form with payment values
  const form = useForm<PaymentEditValues>({
    resolver: zodResolver(paymentEditSchema),
    defaultValues: {
      amount: payment.amount,
      currency: payment.currency,
      transaction_id: payment.transaction_id,
      payment_method: payment.payment_method,
      status: payment.status as PaymentStatus,
      payment_date: payment.payment_date ? new Date(payment.payment_date) : new Date(),
    },
  });

  const onSubmit = async (data: PaymentEditValues) => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Updating payment...');

    try {
      // Prepare the data for the API
      const paymentData = {
        ...data,
        payment_date: format(data.payment_date, "yyyy-MM-dd'T'HH:mm:ss"), // Ensure correct ISO format
      };

      // Make the API request
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      await axios.patch(`${baseUrl}/payments/${payment.id}`, paymentData, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.dismiss(loadingToast);
      toast.success('Payment updated successfully', {
        description: `The payment of ${data.currency} ${data.amount} has been updated.`,
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

        toast.error('Failed to update payment', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to update payment', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }

      console.error('Error updating payment:', error);
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
                sponsors.find((s) => s.id === payment.sponsor_id)
                  ? `${sponsors.find((s) => s.id === payment.sponsor_id)?.first_name} ${
                      sponsors.find((s) => s.id === payment.sponsor_id)?.last_name
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
                children.find((c) => c.id === payment.child_id)
                  ? `${children.find((c) => c.id === payment.child_id)?.first_name} ${
                      children.find((c) => c.id === payment.child_id)?.last_name
                    }`
                  : 'Unknown Child'
              }
              disabled
            />
            <FormDescription>Child cannot be changed</FormDescription>
          </FormItem>
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
            disabled={isSubmitting}
            className="bg-brand-blue hover:bg-brand-blue/90 cursor-pointer"
          >
            {isSubmitting ? 'Updating...' : 'Update Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
