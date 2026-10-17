import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const paymentRouter = Router();

paymentRouter.use(authenticate);

// 1. List payments with search by receipt #, date range, payment method (ADMIN: all; USER: own)
paymentRouter.get('/', PaymentController.list);

// 2. Record payment & execute waterfall reconciliation (USER pays own loan; ADMIN records payments)
paymentRouter.post('/', PaymentController.record);

// 3. Loan payment history
paymentRouter.get('/loan/:loanId', PaymentController.listByLoan);

// 4. Retrieve official payment receipt
paymentRouter.get('/:id/receipt', PaymentController.getReceipt);
paymentRouter.get('/receipt/:receiptNo', PaymentController.getReceipt);

// 5. Retrieve payment details
paymentRouter.get('/:id', PaymentController.getById);
