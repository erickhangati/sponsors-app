import * as z from 'zod';

// Report type enum
export enum ReportType {
  ACADEMIC = 'Academic',
  HEALTH = 'Health',
  FINANCIAL = 'Financial',
  OTHER = 'Other',
}

// Report status enum
export enum ReportStatus {
  READ = 'read',
  UNREAD = 'unread',
}

// Form schema for adding a report
export const reportFormSchema = z.object({
  child_id: z.number({
    required_error: 'Child is required',
    invalid_type_error: 'Child must be selected',
  }),
  report_date: z.date({
    required_error: 'Report date is required',
  }),
  report_type: z.string({
    required_error: 'Report type is required',
  }),
  details: z
    .string({
      required_error: 'Details are required',
    })
    .min(10, 'Details must be at least 10 characters'),
  status: z.string().default(ReportStatus.UNREAD),
});

// Form schema for editing a report
export const reportEditSchema = z.object({
  report_date: z.date({
    required_error: 'Report date is required',
  }),
  report_type: z.string({
    required_error: 'Report type is required',
  }),
  details: z
    .string({
      required_error: 'Details are required',
    })
    .min(10, 'Details must be at least 10 characters'),
  status: z.string().optional(),
});

export type ReportFormValues = z.infer<typeof reportFormSchema>;
export type ReportEditValues = z.infer<typeof reportEditSchema>;
