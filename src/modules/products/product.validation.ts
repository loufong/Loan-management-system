import { z } from 'zod';
import { RepaymentFrequency, UserStatus } from '@prisma/client';

export const createProductSchema = z
  .object({
    productName: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(2, 'Product name must be at least 2 characters')
      .max(100, 'Product name cannot exceed 100 characters'),
    minAmount: z
      .number({ required_error: 'Minimum amount is required' })
      .positive('Minimum amount must be greater than 0'),
    maxAmount: z
      .number({ required_error: 'Maximum amount is required' })
      .positive('Maximum amount must be greater than 0'),
    interestRate: z
      .number({ required_error: 'Annual interest rate is required' })
      .nonnegative('Interest rate cannot be negative')
      .max(100, 'Interest rate cannot exceed 100%'),
    minTerm: z
      .number({ required_error: 'Minimum term is required' })
      .int('Term must be a whole number of months')
      .positive('Minimum term must be at least 1 month'),
    maxTerm: z
      .number({ required_error: 'Maximum term is required' })
      .int('Term must be a whole number of months')
      .positive('Maximum term must be at least 1 month'),
    repaymentFrequency: z
      .nativeEnum(RepaymentFrequency)
      .default(RepaymentFrequency.MONTHLY),
    description: z.string().trim().optional(),
    status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE)
  })
  .refine((data) => data.maxAmount >= data.minAmount, {
    message: 'Maximum amount must be greater than or equal to minimum amount',
    path: ['maxAmount']
  })
  .refine((data) => data.maxTerm >= data.minTerm, {
    message: 'Maximum term must be greater than or equal to minimum term',
    path: ['maxTerm']
  });

export const updateProductSchema = z
  .object({
    productName: z.string().trim().min(2).max(100).optional(),
    minAmount: z.number().positive().optional(),
    maxAmount: z.number().positive().optional(),
    interestRate: z.number().nonnegative().max(100).optional(),
    minTerm: z.number().int().positive().optional(),
    maxTerm: z.number().int().positive().optional(),
    repaymentFrequency: z.nativeEnum(RepaymentFrequency).optional(),
    description: z.string().trim().optional(),
    status: z.nativeEnum(UserStatus).optional()
  })
  .refine(
    (data) => {
      if (data.minAmount !== undefined && data.maxAmount !== undefined) {
        return data.maxAmount >= data.minAmount;
      }
      return true;
    },
    {
      message: 'Maximum amount must be greater than or equal to minimum amount',
      path: ['maxAmount']
    }
  )
  .refine(
    (data) => {
      if (data.minTerm !== undefined && data.maxTerm !== undefined) {
        return data.maxTerm >= data.minTerm;
      }
      return true;
    },
    {
      message: 'Maximum term must be greater than or equal to minimum term',
      path: ['maxTerm']
    }
  );

export const queryProductSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  productName: z.string().trim().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  minInterestRate: z.coerce.number().optional(),
  maxInterestRate: z.coerce.number().optional(),
  term: z.coerce.number().int().optional(),
  repaymentFrequency: z.nativeEnum(RepaymentFrequency).optional(),
  status: z.nativeEnum(UserStatus).optional()
});

export const toggleProductStatusSchema = z
  .object({
    status: z.nativeEnum(UserStatus).optional()
  })
  .default({});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type QueryProductInput = z.infer<typeof queryProductSchema>;
