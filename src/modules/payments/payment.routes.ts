import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const paymentRouter = Router();

// ==========================================
// 1. Webhook Endpoint (External Bakong Network Callback)
// ==========================================
paymentRouter.post('/webhook', PaymentController.handleWebhook);

// All subsequent routes require user authentication & session validation
paymentRouter.use(authenticate);

// ==========================================
// 2. Bakong KHQR Initiation & Diagnostics
// ==========================================
paymentRouter.post('/khqr/initiate', PaymentController.initiateKhqr);
paymentRouter.post('/khqr/create', PaymentController.initiateKhqr);
paymentRouter.get('/khqr/diagnostics', PaymentController.getDiagnostics);

// ==========================================
// 3. Payment Creation & Recording
//    Supports both new KHQR initiation and teller/system reconciliation
// ==========================================
paymentRouter.post('/', PaymentController.record);
paymentRouter.post('/create', PaymentController.record);
paymentRouter.post('/record', PaymentController.record);

// ==========================================
// 4. Real-time Status Polling & Settlement Verification
// ==========================================
paymentRouter.get('/:id/status', PaymentController.getStatus);
paymentRouter.post('/:id/verify', PaymentController.verifyPayment);
paymentRouter.post('/verify', PaymentController.verifyPayment);

// ==========================================
// 5. Super Admin Payment Management & Aggregates
// ==========================================
paymentRouter.get('/admin/summary', PaymentController.getAdminSummary);
paymentRouter.get('/admin/all', PaymentController.listAdminPayments);
paymentRouter.get('/admin/user/:userId/history', PaymentController.getUserPaymentHistory);

// ==========================================
// 6. Payment Confirmation & Rejection Desk (Admin Action)
// ==========================================
paymentRouter.post('/:id/confirm', PaymentController.confirmPayment);
paymentRouter.post('/:id/reject', PaymentController.rejectPayment);
paymentRouter.get('/:id/audit-trail', PaymentController.getPaymentAuditTrail);

// ==========================================
// 7. Payment Directory & Loan History
// ==========================================
paymentRouter.get('/', PaymentController.list);
paymentRouter.get('/loan/:loanId', PaymentController.listByLoan);

// ==========================================
// 8. Payment Receipt & Details Retrieval
// ==========================================
paymentRouter.get('/:id/receipt', PaymentController.getReceipt);
paymentRouter.get('/receipt/:receiptNo', PaymentController.getReceipt);
paymentRouter.get('/:id', PaymentController.getById);
