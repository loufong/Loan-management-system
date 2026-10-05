import { Router } from 'express';
import { DemoController } from './demo.controller';

export const demoRouter = Router();

// Endpoint: POST /api/demo/simulate-overdue/:loanId
demoRouter.post('/simulate-overdue/:loanId', DemoController.simulateOverdue);
