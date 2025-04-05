import * as z from 'zod';

// Payment status enum
export enum PaymentStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  FAILED = 'failed',
}

// Form schema for adding a payment
export const paymentFormSchema = z.object({
  sponsor_id: z.number({
    required_error: 'Sponsor is required',
    invalid_type_error: 'Sponsor must be selected',
  }),
  child_id: z.number({
    required_error: 'Child is required',
    invalid_type_error: 'Child must be selected',
  }),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be positive'),
  currency: z.string().default('KSh'), // Use KSh for display, backend will handle conversion if needed
  transaction_id: z.string().min(3, 'Transaction ID must be at least 3 characters'),
  payment_method: z.string().min(1, 'Payment method is required'),
  status: z.nativeEnum(PaymentStatus, {
    required_error: 'Status is required',
  }),
  payment_date: z.date({
    required_error: 'Payment date is required',
  }),
  notes: z.string().optional(),
});

// Form schema for editing a payment
export const paymentEditSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be positive'),
  currency: z.string().default('KSh'), // Use KSh for display, backend will handle conversion if needed
  transaction_id: z.string().min(3, 'Transaction ID must be at least 3 characters'),
  payment_method: z.string().min(1, 'Payment method is required'),
  status: z.nativeEnum(PaymentStatus, {
    required_error: 'Status is required',
  }),
  payment_date: z.date({
    required_error: 'Payment date is required',
  }),
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
export type PaymentEditValues = z.infer<typeof paymentEditSchema>;
