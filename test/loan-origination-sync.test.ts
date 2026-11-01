import assert from 'assert';
import http from 'http';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import { createToken } from '../src/middlewares/auth.middleware';

console.log('🧪 Starting Loan Origination to Underwriting Queue & Portfolio Sync Test Suite...\n');

// Mock browser localStorage and CustomEvent for node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

(global as any).localStorage = new MockLocalStorage();
let lastDispatchedEvent = '';
(global as any).window = {
  dispatchEvent: (event: any) => {
    lastDispatchedEvent = event.type || event;
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};
(global as any).Event = class {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

const app = createApp();

function request(method: string, url: string, body?: any, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
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
            if (res.headers['content-type']?.includes('application/json')) {
              try {
                parsedBody = JSON.parse(data);
              } catch (e) {}
            }
            resolve({ status: res.statusCode || 500, body: parsedBody, headers: res.headers });
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

async function runTests() {
  const {
    loanStorageService,
    generateAmortizationSchedule,
    UNIFIED_LEDGER_KEY,
    LEDGER_UPDATE_EVENT,
  } = await import('../src/services/loanStorageService');

  // =========================================================================
  // Case 1: Amortization Schedule Calculation
  // =========================================================================
  console.log('--- TEST 1: Reducing-Balance Amortization Schedule Engine ---');
  const schedules = generateAmortizationSchedule(5000, 6.5, 12);
  assert.strictEqual(schedules.length, 12, 'Must generate exactly 12 monthly cycles');
  assert.strictEqual(schedules[0].installmentNo, 1);
  assert.strictEqual(schedules[11].installmentNo, 12);
  assert.strictEqual(schedules[11].remainingBalance, 0, 'Final remaining balance must reach 0 with zero float drift');
  console.log(`✅ 12-month reducing-balance schedule generated. Monthly EMI: $${schedules[0].totalDue}, Final Balance: $${schedules[11].remainingBalance}\n`);

  // =========================================================================
  // Case 2: Borrower Loan Origination Submission (submitLoanApplication)
  // =========================================================================
  console.log('--- TEST 2: Borrower Submits Loan Application (#/apply) ---');
  const loanPayload = {
    borrowerId: 'BOR-2026-8801',
    borrowerName: 'Kanha Srun',
    borrowerEmail: 'kanha.srun@example.com',
    borrowerPhone: '+855 12 778 991',
    productType: 'SME Working Capital',
    principalAmount: 5000,
    annualInterestRate: 6.5,
    tenureMonths: 12,
    repaymentType: 'REDUCING_BALANCE',
    disbursementBank: 'ACLEDA Bank Plc.',
    disbursementAccount: '****2023',
    collateralStatus: 'Verified Hard Title Lien',
  };

  const newLoan = await loanStorageService.submitLoanApplication(loanPayload);
  assert.ok(newLoan.loanId.startsWith('LN-2026-'), 'Must generate Loan ID with LN-2026- prefix');
  assert.strictEqual(newLoan.facility.status, 'UNDERWRITING_PENDING', 'Initial status must be UNDERWRITING_PENDING');
  assert.strictEqual(newLoan.principal.disbursedAmountUSD, 5000);
  assert.strictEqual(newLoan.cbcScore?.score, 740);
  assert.strictEqual(lastDispatchedEvent, LEDGER_UPDATE_EVENT, 'Must dispatch loan_ledger_updated event');
  console.log(`✅ Loan application submitted: ${newLoan.loanId} with status ${newLoan.facility.status} and DOM update dispatched\n`);

  // =========================================================================
  // Case 3: Super Admin Retrieves Master Portfolio Ledger
  // =========================================================================
  console.log('--- TEST 3: Super Admin Master Portfolio Retrieval ---');
  const allLoans = await loanStorageService.getAllLoansForAdmin();
  assert.ok(allLoans.length >= 6, 'Must contain seed loans plus newly applied loan');
  const foundAppliedLoan = allLoans.find((l) => l.loanId === newLoan.loanId);
  assert.ok(foundAppliedLoan, 'Submitted loan must be present in master portfolio array');
  assert.strictEqual(foundAppliedLoan.borrower.nameEn, 'Kanha Srun');
  console.log(`✅ Master portfolio retrieved: ${allLoans.length} total loans, newly applied loan found in ledger\n`);

  // =========================================================================
  // Case 4: Underwriting Queue Filter
  // =========================================================================
  console.log('--- TEST 4: Underwriting Review Queue Reflection ---');
  const uwQueue = await loanStorageService.getUnderwritingQueue();
  assert.ok(uwQueue.length >= 1, 'Underwriting queue must have at least 1 pending application');
  const queueItem = uwQueue.find((q) => q.applicationNumber === newLoan.loanId);
  assert.ok(queueItem, 'Submitted application must appear in underwriting queue');
  assert.strictEqual(queueItem.requestedAmountUSD, 5000);
  assert.strictEqual(queueItem.status, 'UNDERWRITING_PENDING');
  console.log(`✅ Underwriting queue verified: ${uwQueue.length} pending items, target ${queueItem.applicationNumber} active\n`);

  // =========================================================================
  // Case 5: Super Admin Approves & Disburses Loan (updateLoanStatus -> ACTIVE)
  // =========================================================================
  console.log('--- TEST 5: Super Admin Approves & Disburses Facility ---');
  const approvedLoan = await loanStorageService.updateLoanStatus(
    newLoan.loanId,
    'ACTIVE',
    'Super Admin secondary 2FA approval sign-off'
  );
  assert.ok(approvedLoan);
  assert.strictEqual(approvedLoan.facility.status, 'ACTIVE');
  assert.strictEqual(approvedLoan.facility.health, 'PERFORMING');
  assert.ok(approvedLoan.schedules && approvedLoan.schedules.length === 12, 'Must generate official 12-month schedule');
  assert.strictEqual(approvedLoan.repaymentProgress.outstandingBalanceUSD, 5000);
  assert.strictEqual(lastDispatchedEvent, LEDGER_UPDATE_EVENT, 'Must emit loan_ledger_updated upon approval');
  console.log(`✅ Loan approved and disbursed: status ${approvedLoan.facility.status}, 12 schedules generated\n`);

  // =========================================================================
  // Case 6: Super Admin Rejects Application (updateLoanStatus -> REJECTED)
  // =========================================================================
  console.log('--- TEST 6: Super Admin Rejection with Regulatory NBC Code ---');
  const secondLoan = await loanStorageService.submitLoanApplication({
    ...loanPayload,
    borrowerName: 'Dara Test',
    principalAmount: 12000,
  });
  const rejectedLoan = await loanStorageService.updateLoanStatus(
    secondLoan.loanId,
    'REJECTED',
    'NBC-REJ-01: Debt service ratio exceeded (> 50%)'
  );
  assert.ok(rejectedLoan);
  assert.strictEqual(rejectedLoan.facility.status, 'REJECTED');
  assert.strictEqual(rejectedLoan.rejectionCode, 'NBC-REJ-01: Debt service ratio exceeded (> 50%)');
  console.log(`✅ Loan rejection verified: status ${rejectedLoan.facility.status}, NBC rejection code recorded\n`);

  // =========================================================================
  // Case 7: Backend API POST /api/v1/loans/apply (Online Mode RBAC)
  // =========================================================================
  console.log('--- TEST 7: Backend API POST /api/v1/loans/apply (Online Mode) ---');
  const userToken = createToken({
    id: '00000000-0000-4000-8000-000000000002',
    email: 'johnathan.doe@student.edu',
    username: 'johnathan.doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  });

  const resBackendApply = await request(
    'POST',
    '/api/v1/loans/apply',
    {
      productType: 'SME Working Capital',
      principalAmount: 5000,
      tenureMonths: 12,
      annualInterestRate: 6.5,
    },
    {
      Authorization: `Bearer ${userToken}`,
    }
  );

  assert.strictEqual(resBackendApply.status, 201, 'Backend submission must return 201 Created');
  assert.strictEqual((resBackendApply.body as any).data?.status, 'UNDERWRITING_PENDING');
  assert.ok((resBackendApply.body as any).data?.loanId?.startsWith('LN-2026-'));
  console.log(`✅ Backend API /api/v1/loans/apply verified: 201 Created, reference ${(resBackendApply.body as any).data?.loanId}\n`);

  console.log('🎉 ALL 7 LOAN ORIGINATION & UNDERWRITING SYNC TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
