import * as z from 'zod';

// Sponsorship status enum
export enum SponsorshipStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
}

// Form schema for adding a sponsorship
export const sponsorshipFormSchema = z.object({
  sponsor_id: z.number({
    required_error: 'Sponsor is required',
    invalid_type_error: 'Sponsor must be selected',
  }),
  child_id: z.number({
    required_error: 'Child is required',
    invalid_type_error: 'Child must be selected',
  }),
  status: z
    .nativeEnum(SponsorshipStatus, {
      required_error: 'Status is required',
    })
    .default(SponsorshipStatus.ACTIVE),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date().optional(),
  currency: z.string().default('KSh').optional(),
  monthly_amount: z.number().optional(),
  notes: z.string().optional(),
});

// Form schema for editing a sponsorship - only include fields that can be updated
// This matches the SponsorshipUpdate Pydantic model exactly
export const sponsorshipEditSchema = z.object({
  start_date: z.date().optional(),
  status: z.nativeEnum(SponsorshipStatus).optional(),
});

export type SponsorshipFormValues = z.infer<typeof sponsorshipFormSchema>;
export type SponsorshipEditValues = z.infer<typeof sponsorshipEditSchema>;
