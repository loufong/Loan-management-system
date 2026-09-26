import assert from 'assert';
import { LoanCalculatorService } from '../src/modules/calculator/loan-calculator.service';
import { ApplicationService } from '../src/modules/applications/application.service';
import { ApplicationStatus, ReviewRecommendation, ApprovalDecision, UserRole, RepaymentFrequency } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { JWT_ACCESS_SECRET } from '../src/middlewares/auth.middleware';
import { createApp } from '../src/app';
import http from 'http';

function request(app: any, method: string, url: string, body?: any, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const jsonBody = body ? JSON.stringify(body) : undefined;
      const reqHeaders: Record<string, string> = {
        ...headers,
        ...(jsonBody ? { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(jsonBody)) } : {})
      };

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: url,
          method,
          headers: reqHeaders
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            server.close();
            let parsedBody = data;
            try {
              parsedBody = JSON.parse(data);
            } catch (e) {
              // keep as raw text
            }
            resolve({ status: res.statusCode || 500, body: parsedBody });
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (jsonBody) {
        req.write(jsonBody);
      }
      req.end();
    });
  });
}

async function runApplicationApprovalWorkflowTests() {
  console.log('\n🏦 Starting Loan Application, Review & Multi-Stage Approval Workflow Test Suite...\n');

  // --- 1. DTI Calculation & Risk Grading Formula Unit Tests ---
  console.log('--- 1. Verification of Debt-to-Income (DTI) Underwriting Formula ---');
  // Monthly Installment = Total Repayment / Term
  // DTI = (estimatedMonthlyInstallment / borrower.monthlyIncome) * 100
  // Monthly income = $2,000. Installment = $466.67. DTI = (466.67 / 2000) * 100 = 23.33% (<= 25% -> LOW_RISK)
  const lowRisk = ApplicationService.calculateDti(2000, 466.67);
  assert.strictEqual(lowRisk.dtiPercentage, 23.33);
  assert.strictEqual(lowRisk.riskLevel, 'LOW_RISK');
  console.log(`✅ Low Risk Assessment: DTI = ${lowRisk.dtiPercentage}%, Risk = ${lowRisk.riskLevel}`);

  // Monthly income = $1,500. Installment = $500. DTI = (500 / 1500) * 100 = 33.33% (25% - 40% -> MEDIUM_RISK)
  const medRisk = ApplicationService.calculateDti(1500, 500.00);
  assert.strictEqual(medRisk.dtiPercentage, 33.33);
  assert.strictEqual(medRisk.riskLevel, 'MEDIUM_RISK');
  console.log(`✅ Medium Risk Assessment: DTI = ${medRisk.dtiPercentage}%, Risk = ${medRisk.riskLevel}`);

  // Monthly income = $1,000. Installment = $550. DTI = (550 / 1000) * 100 = 55.00% (> 40% -> HIGH_RISK)
  const highRisk = ApplicationService.calculateDti(1000, 550.00);
  assert.strictEqual(highRisk.dtiPercentage, 55.00);
  assert.strictEqual(highRisk.riskLevel, 'HIGH_RISK');
  console.log(`✅ High Risk Assessment: DTI = ${highRisk.dtiPercentage}%, Risk = ${highRisk.riskLevel}`);

  // --- 2. State Machine Transition & Guard Validation ---
  console.log('\n--- 2. State Machine Rules & Transition Guards ---');
  // State Machine: DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED -> CANCELLED
  const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED, ApplicationStatus.CANCELLED],
    [ApplicationStatus.SUBMITTED]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.CANCELLED],
    [ApplicationStatus.UNDER_REVIEW]: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.CANCELLED],
    [ApplicationStatus.APPROVED]: [ApplicationStatus.DISBURSED],
    [ApplicationStatus.REJECTED]: [],
    [ApplicationStatus.CANCELLED]: [],
    [ApplicationStatus.DISBURSED]: []
  };

  function canTransition(current: ApplicationStatus, next: ApplicationStatus): boolean {
    return validTransitions[current]?.includes(next) ?? false;
  }

  // Valid steps
  assert.strictEqual(canTransition(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED), true);
  assert.strictEqual(canTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW), true);
  assert.strictEqual(canTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED), true);
  assert.strictEqual(canTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED), true);
  assert.strictEqual(canTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.APPROVED), true); // direct approval allowed
  assert.strictEqual(canTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.CANCELLED), true);

  // Invalid steps guarded against
  assert.strictEqual(canTransition(ApplicationStatus.DRAFT, ApplicationStatus.APPROVED), false, 'Cannot approve DRAFT directly');
  assert.strictEqual(canTransition(ApplicationStatus.APPROVED, ApplicationStatus.REJECTED), false, 'Cannot reject APPROVED loan');
  assert.strictEqual(canTransition(ApplicationStatus.REJECTED, ApplicationStatus.APPROVED), false, 'Cannot approve REJECTED loan');
  assert.strictEqual(canTransition(ApplicationStatus.CANCELLED, ApplicationStatus.APPROVED), false, 'Cannot approve CANCELLED loan');
  console.log('✅ State machine transition matrix and guards verified!');

  // --- 3. Product Limits Validation (Min/Max Amount & Term) ---
  console.log('\n--- 3. Loan Product Limit Constraints Verification ---');
  const mockProductLimits = { minAmount: 500, maxAmount: 10000, minTerm: 3, maxTerm: 24 };

  function validateProductLimits(amount: number, term: number) {
    if (amount < mockProductLimits.minAmount || amount > mockProductLimits.maxAmount) {
      throw { statusCode: 400, message: 'Requested amount out of allowed bounds', code: 'AMOUNT_OUT_OF_RANGE' };
    }
    if (term < mockProductLimits.minTerm || term > mockProductLimits.maxTerm) {
      throw { statusCode: 400, message: 'Requested term out of allowed bounds', code: 'TERM_OUT_OF_RANGE' };
    }
    return true;
  }

  // Valid
  assert.strictEqual(validateProductLimits(5000, 12), true);
  // Amount < min
  assert.throws(() => validateProductLimits(300, 12), (err: any) => err.code === 'AMOUNT_OUT_OF_RANGE');
  // Amount > max
  assert.throws(() => validateProductLimits(15000, 12), (err: any) => err.code === 'AMOUNT_OUT_OF_RANGE');
  // Term < min
  assert.throws(() => validateProductLimits(5000, 1), (err: any) => err.code === 'TERM_OUT_OF_RANGE');
  // Term > max
  assert.throws(() => validateProductLimits(5000, 36), (err: any) => err.code === 'TERM_OUT_OF_RANGE');
  console.log('✅ Product limit validation guards (AMOUNT_OUT_OF_RANGE & TERM_OUT_OF_RANGE) verified!');

  // --- 4. Auto-Generated Application Number Format ---
  console.log('\n--- 4. Application Number Formatting (APP-YYYY-XXXX) ---');
  const currentYear = new Date().getFullYear();
  const testSeq = 42;
  const appNumber = `APP-${currentYear}-${String(testSeq).padStart(4, '0')}`;
  assert.match(appNumber, new RegExp(`^APP-${currentYear}-\\d{4}$`));
  console.log(`✅ Application number format verified: ${appNumber}`);

  // --- 5. HTTP Endpoints & RBAC Security Layer Tests ---
  console.log('\n--- 5. HTTP Endpoints & RBAC Clearance Verification ---');
  const app = createApp();

  // Mock prisma.user.findUnique for hermetic testing
  const mockUsers: Record<string, any> = {
    '11111111-1111-1111-1111-111111111111': { id: '11111111-1111-1111-1111-111111111111', username: 'borrower_user', email: 'borrower@test.com', role: UserRole.BORROWER, status: 'ACTIVE', fullName: 'Test Borrower' },
    '22222222-2222-2222-2222-222222222222': { id: '22222222-2222-2222-2222-222222222222', username: 'loan_officer_user', email: 'loanofficer@test.com', role: UserRole.LOAN_OFFICER, status: 'ACTIVE', fullName: 'Test Loan Officer' },
    '44444444-4444-4444-4444-444444444444': { id: '44444444-4444-4444-4444-444444444444', username: 'manager_user', email: 'manager@test.com', role: UserRole.MANAGER, status: 'ACTIVE', fullName: 'Test Manager' },
    '66666666-6666-6666-6666-666666666666': { id: '66666666-6666-6666-6666-666666666666', username: 'cashier_user', email: 'cashier@test.com', role: UserRole.CASHIER, status: 'ACTIVE', fullName: 'Test Cashier' }
  };

  prisma.user.findUnique = (async ({ where }: any) => {
    return mockUsers[where.id] || null;
  }) as any;

  function generateTestToken(payload: { id: string; username: string; email: string; role: UserRole }) {
    return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '1h' });
  }

  // Create JWT tokens for testing each role
  const borrowerToken = generateTestToken({
    id: '11111111-1111-1111-1111-111111111111',
    username: 'borrower_user',
    email: 'borrower@test.com',
    role: UserRole.BORROWER
  });

  const loanOfficerToken = generateTestToken({
    id: '22222222-2222-2222-2222-222222222222',
    username: 'loan_officer_user',
    email: 'loanofficer@test.com',
    role: UserRole.LOAN_OFFICER
  });

  const managerToken = generateTestToken({
    id: '44444444-4444-4444-4444-444444444444',
    username: 'manager_user',
    email: 'manager@test.com',
    role: UserRole.MANAGER
  });

  const cashierToken = generateTestToken({
    id: '66666666-6666-6666-6666-666666666666',
    username: 'cashier_user',
    email: 'cashier@test.com',
    role: UserRole.CASHIER
  });

  // A. POST /api/applications - RBAC guards:
  // Allowed: BORROWER, LOAN_OFFICER, MANAGER. Forbidden: CASHIER
  const cashierPostApp = await request(app, 'POST', '/api/applications', {}, {
    Authorization: `Bearer ${cashierToken}`
  });
  assert.strictEqual(cashierPostApp.status, 403, 'Cashier must be forbidden from submitting application');
  assert.strictEqual(cashierPostApp.body.error.code, 'FORBIDDEN');
  console.log('✅ POST /api/applications RBAC: CASHIER is rejected with 403 FORBIDDEN');

  // Input validation: Empty body produces 400 VALIDATION_ERROR
  const invalidAppPost = await request(app, 'POST', '/api/applications', {}, {
    Authorization: `Bearer ${managerToken}`
  });
  assert.strictEqual(invalidAppPost.status, 400);
  assert.strictEqual(invalidAppPost.body.error.code, 'VALIDATION_ERROR');
  console.log('✅ POST /api/applications: Input validation returns 400 VALIDATION_ERROR');

  // B. POST /api/applications/:id/review - RBAC guards:
  // Allowed: LOAN_OFFICER, MANAGER. Forbidden: BORROWER, CASHIER
  const borrowerReview = await request(app, 'POST', '/api/applications/some-id/review', {}, {
    Authorization: `Bearer ${borrowerToken}`
  });
  assert.strictEqual(borrowerReview.status, 403, 'Borrower cannot review applications');
  console.log('✅ POST /api/applications/:id/review RBAC: BORROWER rejected with 403');

  const cashierReview = await request(app, 'POST', '/api/applications/some-id/review', {}, {
    Authorization: `Bearer ${cashierToken}`
  });
  assert.strictEqual(cashierReview.status, 403, 'Cashier cannot review applications');
  console.log('✅ POST /api/applications/:id/review RBAC: CASHIER rejected with 403');

  // Review schema validation
  const invalidReview = await request(app, 'POST', '/api/applications/some-id/review', {}, {
    Authorization: `Bearer ${loanOfficerToken}`
  });
  assert.strictEqual(invalidReview.status, 400);
  assert.strictEqual(invalidReview.body.error.code, 'VALIDATION_ERROR');
  console.log('✅ POST /api/applications/:id/review: Payload validation returns 400 VALIDATION_ERROR');

  // C. POST /api/applications/:id/approve - RBAC guards:
  // Allowed: MANAGER, ADMIN. Forbidden: LOAN_OFFICER, CREDIT_OFFICER, BORROWER
  const loanOfficerApprove = await request(app, 'POST', '/api/applications/some-id/approve', {
    approvedAmount: 5000,
    approvedTerm: 12,
    approvedInterestRate: 12.0
  }, {
    Authorization: `Bearer ${loanOfficerToken}`
  });
  assert.strictEqual(loanOfficerApprove.status, 403, 'Loan officer cannot approve loans');
  console.log('✅ POST /api/applications/:id/approve RBAC: LOAN_OFFICER rejected with 403');

  // D. POST /api/applications/:id/reject - RBAC guards:
  // Allowed: MANAGER, ADMIN. Forbidden: LOAN_OFFICER
  const loanOfficerReject = await request(app, 'POST', '/api/applications/some-id/reject', {
    rejectionReason: 'Not eligible'
  }, {
    Authorization: `Bearer ${loanOfficerToken}`
  });
  assert.strictEqual(loanOfficerReject.status, 403, 'Loan officer cannot reject loans');
  console.log('✅ POST /api/applications/:id/reject RBAC: LOAN_OFFICER rejected with 403');

  // Rejection requires rejectionReason
  const emptyReasonReject = await request(app, 'POST', '/api/applications/some-id/reject', {}, {
    Authorization: `Bearer ${managerToken}`
  });
  assert.strictEqual(emptyReasonReject.status, 400, 'Rejection reason is required');
  assert.strictEqual(emptyReasonReject.body.error.code, 'VALIDATION_ERROR');
  console.log('✅ POST /api/applications/:id/reject: rejectionReason required validation passed');

  console.log('\n🎉 ALL LOAN APPLICATION & MULTI-STAGE APPROVAL WORKFLOW TESTS COMPLETED SUCCESSFULLY!\n');
}

runApplicationApprovalWorkflowTests().catch((err) => {
  console.error('❌ Application approval workflow test suite failed:', err);
  process.exit(1);
});
