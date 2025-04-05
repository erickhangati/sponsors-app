import * as z from 'zod';

// Gender enum to match backend
export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
}

// Child status enum
export enum ChildStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

// Strong password pattern matching backend requirements
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"'<>.,?/~`\\|-])[^\s]{8,64}$/;

// Form schema for adding a child
export const childFormSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password cannot exceed 64 characters')
    .regex(
      passwordPattern,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and no spaces',
    ),
  email: z.string().email('Please enter a valid email address'),
  phone_number: z.string().min(10, 'Please enter a valid phone number'),
  date_of_birth: z.date(),
  gender: z.nativeEnum(Gender),
  background_info: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Form schema for editing a child (password is optional)
export const childEditSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password cannot exceed 64 characters')
    .regex(
      passwordPattern,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and no spaces',
    )
    .optional()
    .or(z.literal('')),
  email: z.string().email('Please enter a valid email address'),
  phone_number: z.string().min(10, 'Please enter a valid phone number'),
  date_of_birth: z.date().optional(),
  gender: z.nativeEnum(Gender).optional(),
  background_info: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type ChildFormValues = z.infer<typeof childFormSchema>;
export type ChildEditValues = z.infer<typeof childEditSchema>;
