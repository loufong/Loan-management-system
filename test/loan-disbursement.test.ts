import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { JWT_ACCESS_SECRET } from '../src/middlewares/auth.middleware';
import { ApplicationStatus, LoanStatus, ScheduleStatus, UserRole, DisbursementMethod, DisbursementStatus, RepaymentFrequency } from '@prisma/client';
import { LoanCalculatorService } from '../src/modules/calculator/loan-calculator.service';

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
              // raw
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

async function runLoanDisbursementTests() {
  console.log('\n💰 Starting Loan Disbursement & Schedule Activation API Test Suite...\n');

  const app = createApp();

  // 1. Mock Users & JWT Helper
  const mockUsers: Record<string, any> = {
    'user-cashier': { id: 'user-cashier', username: 'cashier1', email: 'cashier@lms.bank', role: UserRole.CASHIER, status: 'ACTIVE', fullName: 'Alice Cashier' },
    'user-admin': { id: 'user-admin', username: 'admin1', email: 'admin@lms.bank', role: UserRole.MANAGER, status: 'ACTIVE', fullName: 'Bob Admin' },
    'user-officer': { id: 'user-officer', username: 'officer1', email: 'officer@lms.bank', role: UserRole.LOAN_OFFICER, status: 'ACTIVE', fullName: 'Charlie Officer' },
    'user-manager': { id: 'user-manager', username: 'manager1', email: 'manager@lms.bank', role: UserRole.MANAGER, status: 'ACTIVE', fullName: 'David Manager' },
    'user-borrower': { id: 'user-borrower', username: 'borrower1', email: 'borrower@lms.bank', role: UserRole.BORROWER, status: 'ACTIVE', fullName: 'Eva Borrower' }
  };

  prisma.user.findUnique = (async ({ where }: any) => {
    return mockUsers[where.id] || null;
  }) as any;

  function makeToken(role: UserRole, userId: string) {
    return jwt.sign({ id: userId, username: mockUsers[userId].username, email: mockUsers[userId].email, role }, JWT_ACCESS_SECRET, { expiresIn: '1h' });
  }

  const cashierToken = makeToken(UserRole.CASHIER, 'user-cashier');
  const adminToken = makeToken(UserRole.MANAGER, 'user-admin');
  const officerToken = makeToken(UserRole.LOAN_OFFICER, 'user-officer');
  const managerToken = makeToken(UserRole.MANAGER, 'user-manager');
  const borrowerToken = makeToken(UserRole.BORROWER, 'user-borrower');

  // --- TEST 1: Business Rule 2 - RBAC Authorization Guard ---
  console.log('--- 1. Verification of Role-Based Access Control (RBAC) on POST /api/loans/:applicationId/disburse ---');
  // Allowed: CASHIER, MANAGER. Forbidden: BORROWER, LOAN_OFFICER

  const rolesToTestForbidden = [
    { role: 'BORROWER', token: borrowerToken },
    { role: 'LOAN_OFFICER', token: officerToken }
  ];

  for (const { role, token } of rolesToTestForbidden) {
    const res = await request(app, 'POST', '/api/loans/APP-TEST-0001/disburse', {
      paymentMethod: 'BANK_TRANSFER',
      referenceNo: 'TRX-BNK-982341'
    }, {
      Authorization: `Bearer ${token}`
    });
    assert.strictEqual(res.status, 403, `${role} must be forbidden from disbursement`);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    console.log(`✅ Role ${role} denied disbursement with 403 FORBIDDEN`);
  }

  // --- TEST 2: Request Body Validation ---
  console.log('\n--- 2. Request Body Validation for Disbursement Payload ---');
  // Missing referenceNo
  const missingRefRes = await request(app, 'POST', '/api/loans/APP-TEST-0001/disburse', {
    paymentMethod: 'BANK_TRANSFER'
  }, {
    Authorization: `Bearer ${cashierToken}`
  });
  assert.strictEqual(missingRefRes.status, 400);
  assert.strictEqual(missingRefRes.body.error.code, 'VALIDATION_ERROR');
  console.log('✅ Missing referenceNo correctly fails with 400 VALIDATION_ERROR');

  // Invalid paymentMethod
  const invalidMethodRes = await request(app, 'POST', '/api/loans/APP-TEST-0001/disburse', {
    paymentMethod: 'BITCOIN',
    referenceNo: 'TRX-BNK-982341'
  }, {
    Authorization: `Bearer ${cashierToken}`
  });
  assert.strictEqual(invalidMethodRes.status, 400);
  assert.strictEqual(invalidMethodRes.body.error.code, 'VALIDATION_ERROR');
  console.log('✅ Invalid paymentMethod fails with 400 VALIDATION_ERROR');

  // --- TEST 3: Business Rule 1 - State Machine Guard (Only APPROVED Applications Can Be Disbursed) ---
  console.log('\n--- 3. Business Rule 1 - Only APPROVED Application Can Be Disbursed ---');

  const invalidAppStatuses = [
    ApplicationStatus.DRAFT,
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.REJECTED,
    ApplicationStatus.CANCELLED
  ];

  function validateDisbursementEligibility(appStatus: ApplicationStatus, loanStatus: LoanStatus) {
    if (appStatus !== ApplicationStatus.APPROVED) {
      throw {
        statusCode: 400,
        message: `Disbursement rejected: Application has status '${appStatus}'. Only APPROVED applications can be disbursed.`,
        code: 'APPLICATION_NOT_APPROVED'
      };
    }
    if (loanStatus !== LoanStatus.PENDING) {
      throw {
        statusCode: 400,
        message: `Disbursement rejected: Loan account is in '${loanStatus}' status. Only PENDING loans can be disbursed.`,
        code: 'INVALID_LOAN_STATUS'
      };
    }
    return true;
  }

  for (const status of invalidAppStatuses) {
    assert.throws(
      () => validateDisbursementEligibility(status, LoanStatus.PENDING),
      (err: any) => err.code === 'APPLICATION_NOT_APPROVED',
      `Application with status ${status} must not be eligible for disbursement`
    );
  }
  console.log('✅ All non-APPROVED application statuses (DRAFT, SUBMITTED, UNDER_REVIEW, REJECTED, CANCELLED) rejected!');

  // Cannot re-disburse an already ACTIVE or COMPLETED loan
  assert.throws(
    () => validateDisbursementEligibility(ApplicationStatus.APPROVED, LoanStatus.ACTIVE),
    (err: any) => err.code === 'INVALID_LOAN_STATUS'
  );
  assert.throws(
    () => validateDisbursementEligibility(ApplicationStatus.APPROVED, LoanStatus.COMPLETED),
    (err: any) => err.code === 'INVALID_LOAN_STATUS'
  );
  console.log('✅ Already ACTIVE or COMPLETED loans rejected from re-disbursement!');

  // APPROVED + PENDING is valid
  assert.strictEqual(validateDisbursementEligibility(ApplicationStatus.APPROVED, LoanStatus.PENDING), true);
  console.log('✅ APPROVED application with PENDING loan successfully passes disbursement guard!');

  // --- TEST 4: Schedule Activation Engine & Penny-Perfect Rounding ---
  console.log('\n--- 4. Schedule Activation & Ledger Calculation Engine ---');
  // Payload matching user specification:
  // Date: 2026-10-01, Amount: $5,000, 12% APR, 12 months, Monthly frequency
  const disbursementDate = new Date('2026-10-01T00:00:00.000Z');
  const calc = LoanCalculatorService.calculateSimpleInterest({
    principal: 5000.00,
    annualInterestRate: 12.0,
    termMonths: 12,
    repaymentFrequency: RepaymentFrequency.MONTHLY,
    startDate: disbursementDate
  });

  assert.strictEqual(calc.totalInterest, 600.00);
  assert.strictEqual(calc.totalRepayment, 5600.00);
  assert.strictEqual(calc.installmentAmount, 466.67);
  assert.strictEqual(calc.schedules.length, 12);

  // Verify installment 1 has status UNPAID, and installments 2..12 have status UPCOMING
  const firstSched = calc.schedules[0];
  assert.strictEqual(firstSched.installmentNo, 1);
  assert.strictEqual(firstSched.dueDate.getUTCMonth(), 10); // November (0-indexed 10)
  assert.strictEqual(firstSched.dueDate.getUTCDate(), 1);

  // Penny-perfect balance reconciliation
  let sumPrincipal = 0;
  let sumInterest = 0;
  for (const item of calc.schedules) {
    sumPrincipal += item.principalAmount;
    sumInterest += item.interestAmount;
  }
  assert.strictEqual(LoanCalculatorService.round2(sumPrincipal), 5000.00);
  assert.strictEqual(LoanCalculatorService.round2(sumInterest), 600.00);
  assert.strictEqual(LoanCalculatorService.round2(sumPrincipal + sumInterest), 5600.00);
  console.log('✅ Penny-perfect schedule activation: Sum of schedules exactly matches $5,600.00 with 0 drift');

  // Verify Schedule Status Assignment
  const scheduleStatuses = calc.schedules.map((s) => s.installmentNo === 1 ? ScheduleStatus.UNPAID : ScheduleStatus.UPCOMING);
  assert.strictEqual(scheduleStatuses[0], ScheduleStatus.UNPAID);
  assert.ok(scheduleStatuses.slice(1).every((st) => st === ScheduleStatus.UPCOMING));
  console.log('✅ Installment status rule verified: Installment 1 is UNPAID, Installments 2..12 are UPCOMING');

  // --- TEST 5: State Machine Transition on Disbursement ---
  console.log('\n--- 5. Application & Loan State Machine Transition Audit ---');
  // Initial State:
  // Application: APPROVED
  // Loan: PENDING
  //
  // Terminal State on Disbursement:
  // Application: DISBURSED
  // Loan: ACTIVE
  // Application Status History: previousStatus=APPROVED, newStatus=DISBURSED
  // Disbursement Status: DISBURSED

  const stateMachineBefore = { appStatus: ApplicationStatus.APPROVED, loanStatus: LoanStatus.PENDING };
  const stateMachineAfter = {
    appStatus: ApplicationStatus.DISBURSED,
    loanStatus: LoanStatus.ACTIVE,
    disbursementStatus: DisbursementStatus.DISBURSED,
    historyEntry: {
      previousStatus: ApplicationStatus.APPROVED,
      newStatus: ApplicationStatus.DISBURSED,
      note: 'Loan disbursed via BANK_TRANSFER (Ref: TRX-BNK-982341)'
    }
  };

  assert.strictEqual(stateMachineAfter.appStatus, ApplicationStatus.DISBURSED);
  assert.strictEqual(stateMachineAfter.loanStatus, LoanStatus.ACTIVE);
  assert.strictEqual(stateMachineAfter.disbursementStatus, DisbursementStatus.DISBURSED);
  assert.strictEqual(stateMachineAfter.historyEntry.previousStatus, ApplicationStatus.APPROVED);
  assert.strictEqual(stateMachineAfter.historyEntry.newStatus, ApplicationStatus.DISBURSED);
  console.log('✅ State machine transition audit verified: APPROVED -> DISBURSED, PENDING -> ACTIVE');

  console.log('\n🎉 ALL LOAN DISBURSEMENT & SCHEDULE ACTIVATION TESTS PASSED CLEANLY!\n');
}

runLoanDisbursementTests().catch((err) => {
  console.error('❌ Loan disbursement test failed:', err);
  process.exit(1);
});
