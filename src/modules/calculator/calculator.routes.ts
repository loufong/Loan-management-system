import { Router } from 'express';
import { CalculatorController } from './calculator.controller';

export const calculatorRouter = Router();

// Public Standalone Calculator Endpoints
calculatorRouter.post('/', CalculatorController.calculate);
calculatorRouter.post('/preview', CalculatorController.calculate);
