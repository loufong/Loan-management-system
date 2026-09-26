import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const paymentRouter = Router();

paymentRouter.use(authenticate);

// 1. List payments with search by receipt #, date range, payment method
paymentRouter.get('/', PaymentController.list);

// 2. Record payment & execute waterfall reconciliation (CASHIER, MANAGER)
paymentRouter.post(
  '/',
  authorize(UserRole.CASHIER, UserRole.MANAGER),
  PaymentController.record
);

// 3. Retrieve official payment receipt
paymentRouter.get('/:id/receipt', PaymentController.getReceipt);
paymentRouter.get('/receipt/:receiptNo', PaymentController.getReceipt);
