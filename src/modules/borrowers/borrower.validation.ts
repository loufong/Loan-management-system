import { z } from 'zod';
import { UserStatus } from '@prisma/client';

const phoneRegex = /^\+?[0-9\s\-().]{7,25}$/;

export const createBorrowerSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  gender: z
    .string({ required_error: 'Gender is required' })
    .trim()
    .min(1, 'Gender is required'),
  dob: z
    .string({ required_error: 'Date of birth is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format for date of birth (YYYY-MM-DD expected)'
    }),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(phoneRegex, 'Invalid phone number format (e.g., +1-555-0199 or 0812345678)'),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Invalid email address format')
    .max(255, 'Email cannot exceed 255 characters'),
  address: z
    .string({ required_error: 'Residential address is required' })
    .trim()
    .min(5, 'Address must be at least 5 characters'),
  occupation: z
    .string({ required_error: 'Occupation is required' })
    .trim()
    .min(2, 'Occupation must be at least 2 characters')
    .max(100, 'Occupation cannot exceed 100 characters'),
  monthlyIncome: z
    .number({ required_error: 'Monthly income is required' })
    .nonnegative('Monthly income cannot be negative'),
  idNumber: z
    .string({ required_error: 'National/Student ID number is required' })
    .trim()
    .min(3, 'ID number must be at least 3 characters')
    .max(50, 'ID number cannot exceed 50 characters'),
  userId: z.string().uuid('Invalid user UUID').optional()
});

export const updateBorrowerSchema = createBorrowerSchema.partial();

export const queryBorrowerSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().optional(),
    borrowerId: z.string().trim().optional(),
    fullName: z.string().trim().optional(),
    name: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().optional(),
    idNumber: z.string().trim().optional(),
    id_number: z.string().trim().optional(),
    status: z.nativeEnum(UserStatus).optional(),
    sortBy: z.enum(['createdAt', 'fullName', 'monthlyIncome', 'borrowerId']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .transform((data) => ({
    ...data,
    fullName: data.fullName || data.name,
    idNumber: data.idNumber || data.id_number
  }));

export type CreateBorrowerInput = z.infer<typeof createBorrowerSchema>;
export type UpdateBorrowerInput = z.infer<typeof updateBorrowerSchema>;
export type QueryBorrowerInput = z.infer<typeof queryBorrowerSchema>;
