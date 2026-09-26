import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductService } from './product.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import {
  createProductSchema,
  queryProductSchema,
  toggleProductStatusSchema,
  updateProductSchema
} from './product.validation';

const calculateLoanSchema = z
  .object({
    principal: z.number().positive('Principal amount must be positive'),
    annualInterestRate: z.number().nonnegative('Interest rate cannot be negative').optional(),
    interestRate: z.number().nonnegative('Interest rate cannot be negative').optional(),
    termMonths: z.number().int().positive('Term must be at least 1 month').optional(),
    term: z.number().int().positive('Term must be at least 1 month').optional()
  })
  .transform((data) => ({
    principal: data.principal,
    annualInterestRate: (data.annualInterestRate !== undefined ? data.annualInterestRate : data.interestRate)!,
    termMonths: (data.termMonths !== undefined ? data.termMonths : data.term)!
  }))
  .refine((data) => data.annualInterestRate !== undefined, {
    message: 'annualInterestRate or interestRate is required',
    path: ['annualInterestRate']
  })
  .refine((data) => data.termMonths !== undefined, {
    message: 'termMonths or term is required',
    path: ['termMonths']
  });

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = queryProductSchema.parse(req.query);
      const result = await ProductService.listProducts(validatedQuery);
      sendSuccess(res, result.items, 'Loan products retrieved successfully', 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.getProductById(req.params.id);
      sendSuccess(res, product, 'Loan product details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createProductSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const product = await ProductService.createProduct(
        validated,
        req.user!.id,
        ipAddress
      );
      sendSuccess(res, product, 'Loan product created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProductSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const product = await ProductService.updateProduct(
        req.params.id,
        validated,
        req.user!.id,
        ipAddress
      );
      sendSuccess(res, product, 'Loan product updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async toggleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = toggleProductStatusSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await ProductService.toggleProductStatus(
        req.params.id,
        validated.status,
        req.user!.id,
        ipAddress
      );
      sendSuccess(res, result.product, result.message);
    } catch (err) {
      next(err);
    }
  }

  static async calculateAmortization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { principal, annualInterestRate, termMonths } = calculateLoanSchema.parse(req.body);
      const calculation = ProductService.calculateAmortization(
        principal,
        annualInterestRate,
        termMonths
      );
      sendSuccess(res, calculation, 'Loan amortization calculation successful');
    } catch (err) {
      next(err);
    }
  }
}
