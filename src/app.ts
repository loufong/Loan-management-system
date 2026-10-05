import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middlewares/error.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { borrowerRouter } from './modules/borrowers/borrower.routes';
import { productRouter } from './modules/products/product.routes';
import { applicationRouter } from './modules/applications/application.routes';
import { loanRouter } from './modules/loans/loan.routes';
import { paymentRouter } from './modules/payments/payment.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { calculatorRouter } from './modules/calculator/calculator.routes';
import { overdueRouter } from './modules/overdue/overdue.routes';
import { reportRouter } from './modules/reports/report.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { userRouter } from './modules/users/user.routes';
import { demoRouter } from './modules/demo/demo.routes';
import { sendError, sendSuccess } from './utils/response';

export function createApp(): Application {
  const app = express();

  // Security & Utility Middlewares (Permit CDN scripts for interactive frontend)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
  app.use(
    cors({
      origin: '*', // Adjust to specific frontend domain in production
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static Assets for Frontend SPA
  const publicDir = fs.existsSync(path.join(process.cwd(), 'public'))
    ? path.join(process.cwd(), 'public')
    : path.join(__dirname, '../public');

  app.use(express.static(publicDir));

  // Root & App Route: Return interactive SPA to browsers, JSON to API consumers
  app.get(['/', '/app'], (req: Request, res: Response) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (req.accepts('html') && fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return sendSuccess(res, {
      service: 'Academic Loan Management System (LMS) API',
      version: '1.0.0',
      docs: '/api/v1/health'
    });
  });

  app.get('/api/v1/health', (req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime()
    });
  });

  // 1. Authentication & RBAC
  app.use(['/api/auth', '/api/v1/auth'], authRouter);

  // 2. Borrower Management
  app.use(['/api/borrowers', '/api/v1/borrowers'], borrowerRouter);

  // 3. Loan Products
  app.use(['/api/products', '/api/v1/products', '/api/loan-products', '/api/v1/loan-products'], productRouter);

  // 4. Financial Calculation Engine
  app.use(['/api/calculator', '/api/v1/calculator'], calculatorRouter);

  // 5. Loan Applications & Workflow
  app.use(['/api/applications', '/api/v1/applications', '/api/loan-applications', '/api/v1/loan-applications'], applicationRouter);

  // 6. Loan Disbursement & Active Loans
  app.use(['/api/loans', '/api/v1/loans'], loanRouter);

  // 7. Payment Processing & Ledger
  app.use(['/api/payments', '/api/v1/payments'], paymentRouter);

  // 8. Overdue Engine
  app.use(['/api/overdue', '/api/v1/overdue'], overdueRouter);

  // 9. KPI Dashboard & Reports
  app.use(['/api/dashboard', '/api/v1/dashboard'], dashboardRouter);
  app.use(['/api/reports', '/api/v1/reports'], reportRouter);

  // 10. Notifications & Alerts
  app.use(['/api/notifications', '/api/v1/notifications'], notificationRouter);

  // 11. User & Role Management (Admin / Manager, Cashier, Borrower)
  app.use(['/api/users', '/api/v1/users'], userRouter);

  // 12. Live Fast-Forward Demo Trigger (Point 44)
  app.use(['/api/demo', '/api/v1/demo'], demoRouter);

  // 404 Route Handler
  app.use((req: Request, res: Response) => {
    sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
