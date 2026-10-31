import { Router } from 'express';
import { BorrowerPortalController } from './borrower-portal.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const borrowerPortalRouter = Router();

// ==========================================
// 1. Webhook Endpoint (No JWT authentication required)
// ==========================================
borrowerPortalRouter.post('/webhooks/bakong', BorrowerPortalController.handleBakongWebhook);

// ==========================================
// 2. Public / Optional Auth Routes
// ==========================================
borrowerPortalRouter.get('/loans/:id/installments/:no/status', BorrowerPortalController.getInstallmentStatus);
borrowerPortalRouter.post('/loans/:id/installments/:no/khqr', BorrowerPortalController.generateInstallmentKhqr);
borrowerPortalRouter.post('/loans/:id/installments/:no/simulate-settlement', BorrowerPortalController.simulateSettlement);

// General Ledger (Public / Admin read)
borrowerPortalRouter.get('/general-ledger', BorrowerPortalController.listGeneralLedger);

// ==========================================
// 3. Authenticated Borrower Portal Routes
// ==========================================
borrowerPortalRouter.get('/borrower/loans/active', authenticate, BorrowerPortalController.getActiveLoan);
borrowerPortalRouter.get('/borrower/schedule', authenticate, BorrowerPortalController.getRepaymentSchedule);

