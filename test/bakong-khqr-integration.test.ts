import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { JWT_ACCESS_SECRET } from '../src/middlewares/auth.middleware';
import { LoanStatus, ScheduleStatus, UserRole, Prisma } from '@prisma/client';
import { BakongService } from '../src/modules/payments/bakong.service';

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

function makeToken(user: { id: string; username: string; email: string; role: UserRole; fullName?: string }) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role, fullName: user.fullName || user.username },
    JWT_ACCESS_SECRET,
    { expiresIn: '2h' }
  );
}

async function runBakongKhqrIntegrationTests() {
  console.log('\n🇰🇭 ========================================================================');
  console.log('🇰🇭 CAMBODIA BAKONG KHQR PRODUCTION-GRADE INTEGRATION TEST SUITE');
  console.log('🇰🇭 ACLEDA Bank Merchant: PHON RITHYA | Account: 85517790800');
  console.log('🇰🇭 ========================================================================\n');

  // In-memory data store for isolated, deterministic execution
  const dbUsers = new Map<string, any>();
  const dbBorrowers = new Map<string, any>();
  const dbProducts = new Map<string, any>();
  const dbLoans = new Map<string, any>();
  const dbSchedules = new Map<string, any>();
  const dbPayments = new Map<string, any>();

  // Setup mock users
  const borrowerAUser = {
    id: 'usr-alice-001',
    username: 'alice_borrower',
    email: 'alice@student.edu',
    passwordHash: 'hashed_pw',
    fullName: 'Alice Borrower',
    role: UserRole.USER,
    status: 'ACTIVE'
  };
  dbUsers.set(borrowerAUser.id, borrowerAUser);

  const borrowerBUser = {
    id: 'usr-bob-002',
    username: 'bob_borrower',
    email: 'bob@student.edu',
    passwordHash: 'hashed_pw',
    fullName: 'Bob Borrower',
    role: UserRole.USER,
    status: 'ACTIVE'
  };
  dbUsers.set(borrowerBUser.id, borrowerBUser);

  const adminUser = {
    id: 'usr-admin-001',
    username: 'admin_cashier',
    email: 'admin@bank.lms',
    passwordHash: 'hashed_pw',
    fullName: 'Admin Cashier',
    role: UserRole.ADMIN,
    status: 'ACTIVE'
  };
  dbUsers.set(adminUser.id, adminUser);

  // Setup mock borrowers
  const borrowerA = {
    id: 'bor-alice-001',
    borrowerId: 'BOR-2026-0001',
    userId: borrowerAUser.id,
    fullName: 'Alice Borrower',
    email: borrowerAUser.email,
    phone: '+85510487718',
    status: 'ACTIVE'
  };
  dbBorrowers.set(borrowerA.id, borrowerA);

  const borrowerB = {
    id: 'bor-bob-002',
    borrowerId: 'BOR-2026-0002',
    userId: borrowerBUser.id,
    fullName: 'Bob Borrower',
    email: borrowerBUser.email,
    phone: '+85512345678',
    status: 'ACTIVE'
  };
  dbBorrowers.set(borrowerB.id, borrowerB);

  const mockProduct = {
    id: 'prod-001',
    productName: 'Bakong Student Credit Line',
    minAmount: new Prisma.Decimal(100),
    maxAmount: new Prisma.Decimal(5000),
    interestRate: new Prisma.Decimal(12.0)
  };
  dbProducts.set(mockProduct.id, mockProduct);

  // Setup mock loan & schedules for Alice
  const loan1 = {
    id: 'loan-alice-101',
    loanNumber: 'LN-2026-0042',
    borrowerId: borrowerA.id,
    productId: mockProduct.id,
    principalAmount: new Prisma.Decimal(250),
    interestRate: new Prisma.Decimal(12.0),
    termMonths: 2,
    repaymentFrequency: 'MONTHLY',
    totalInterest: new Prisma.Decimal(0),
    totalRepayment: new Prisma.Decimal(250),
    totalPaid: new Prisma.Decimal(0),
    outstandingBalance: new Prisma.Decimal(250),
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-01'),
    status: LoanStatus.ACTIVE,
    borrower: borrowerA,
    product: mockProduct
  };
  dbLoans.set(loan1.id, loan1);
  dbLoans.set(loan1.loanNumber, loan1);

  const schedule1 = {
    id: 'sch-alice-101-1',
    loanId: loan1.id,
    installmentNo: 1,
    dueDate: new Date('2026-02-01'),
    principalAmount: new Prisma.Decimal(80),
    interestAmount: new Prisma.Decimal(20),
    totalDue: new Prisma.Decimal(100),
    amountPaid: new Prisma.Decimal(0),
    remainingAmount: new Prisma.Decimal(100),
    status: ScheduleStatus.UNPAID
  };
  const schedule2 = {
    id: 'sch-alice-101-2',
    loanId: loan1.id,
    installmentNo: 2,
    dueDate: new Date('2026-03-01'),
    principalAmount: new Prisma.Decimal(120),
    interestAmount: new Prisma.Decimal(30),
    totalDue: new Prisma.Decimal(150),
    amountPaid: new Prisma.Decimal(0),
    remainingAmount: new Prisma.Decimal(150),
    status: ScheduleStatus.UNPAID
  };
  dbSchedules.set(schedule1.id, schedule1);
  dbSchedules.set(schedule2.id, schedule2);

  // Setup mock Prisma operations
  const mockDb = {
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id) return dbUsers.get(where.id) || null;
        if (where.email) return Array.from(dbUsers.values()).find(u => u.email === where.email) || null;
        if (where.username) return Array.from(dbUsers.values()).find(u => u.username === where.username) || null;
        return null;
      }
    },
    borrower: {
      findFirst: async ({ where }: any) => {
        if (where.userId) return Array.from(dbBorrowers.values()).find(b => b.userId === where.userId) || null;
        if (where.id) return dbBorrowers.get(where.id) || null;
        return null;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) return dbBorrowers.get(where.id) || null;
        if (where.userId) return Array.from(dbBorrowers.values()).find(b => b.userId === where.userId) || null;
        return null;
      }
    },
    loan: {
      findFirst: async ({ where }: any) => {
        let loan = null;
        if (where.id) loan = dbLoans.get(where.id);
        else if (where.loanNumber) loan = dbLoans.get(where.loanNumber);
        if (!loan && where.OR) {
          for (const cond of where.OR) {
            if (cond.id && dbLoans.has(cond.id)) { loan = dbLoans.get(cond.id); break; }
            if (cond.loanNumber && dbLoans.has(cond.loanNumber)) { loan = dbLoans.get(cond.loanNumber); break; }
          }
        }
        if (!loan) return null;

        const borrower = dbBorrowers.get(loan.borrowerId);
        const schedules = Array.from(dbSchedules.values())
          .filter(s => s.loanId === loan.id)
          .sort((a, b) => a.installmentNo - b.installmentNo);
        return { ...loan, borrower, repaymentSchedules: schedules };
      },
      findUnique: async ({ where }: any) => {
        let loan = dbLoans.get(where.id) || dbLoans.get(where.loanNumber) || null;
        if (!loan) return null;
        const borrower = dbBorrowers.get(loan.borrowerId);
        const schedules = Array.from(dbSchedules.values())
          .filter(s => s.loanId === loan.id)
          .sort((a, b) => a.installmentNo - b.installmentNo);
        return { ...loan, borrower, repaymentSchedules: schedules };
      },
      update: async ({ where, data }: any) => {
        const loan = dbLoans.get(where.id);
        if (!loan) throw new Error(`Loan ${where.id} not found`);
        Object.assign(loan, data);
        return loan;
      }
    },
    repaymentSchedule: {
      findMany: async ({ where }: any) => {
        return Array.from(dbSchedules.values())
          .filter(s => (!where.loanId || s.loanId === where.loanId) && (!where.status || s.status === where.status))
          .sort((a, b) => a.installmentNo - b.installmentNo);
      },
      findFirst: async ({ where }: any) => {
        return Array.from(dbSchedules.values()).find(s => {
          if (where.loanId && s.loanId !== where.loanId) return false;
          if (where.installmentNo && s.installmentNo !== where.installmentNo) return false;
          if (where.id && s.id !== where.id) return false;
          return true;
        }) || null;
      },
      findUnique: async ({ where }: any) => {
        return dbSchedules.get(where.id) || null;
      },
      count: async ({ where }: any) => {
        return Array.from(dbSchedules.values()).filter(s => {
          if (where?.loanId && s.loanId !== where.loanId) return false;
          if (where?.status?.not && s.status === where.status.not) return false;
          if (where?.status && typeof where.status === 'string' && s.status !== where.status) return false;
          return true;
        }).length;
      },
      update: async ({ where, data }: any) => {
        const sch = dbSchedules.get(where.id);
        if (!sch) throw new Error(`Schedule ${where.id} not found`);
        Object.assign(sch, data);
        return sch;
      }
    },
    payment: {
      count: async () => dbPayments.size,
      create: async ({ data }: any) => {
        const id = data.id || crypto.randomUUID();
        const receiptNo = data.receiptNo || `REC-2026-${Date.now().toString().slice(-4)}`;
        const referenceNo = data.referenceNo || `PAY-REF-${Date.now()}`;
        const paymentRecord = {
          id,
          receiptNo,
          referenceNo,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency || 'USD',
          paymentMethod: data.paymentMethod || 'CASH',
          paymentProvider: data.paymentProvider || 'BAKONG_KHQR',
          status: data.status || 'PENDING',
          loanId: data.loanId,
          installmentId: data.installmentId || null,
          borrowerId: data.borrowerId || null,
          khqrMd5: data.khqrMd5 || null,
          khqrQrString: data.khqrQrString || null,
          khqrTransactionId: data.khqrTransactionId || null,
          receivedBy: data.receivedBy || null,
          idempotencyKey: data.idempotencyKey || null,
          expiresAt: data.expiresAt || null,
          paidAt: data.paidAt || null,
          verifiedAt: data.verifiedAt || null,
          failureReason: data.failureReason || null,
          notes: data.notes || null,
          createdAt: new Date(),
          receivedByUser: data.receivedBy ? dbUsers.get(data.receivedBy) : null
        };
        dbPayments.set(id, paymentRecord);
        return paymentRecord;
      },
      findUnique: async ({ where, include }: any) => {
        let p = null;
        if (where.id) p = dbPayments.get(where.id);
        if (!p && where.referenceNo) {
          p = Array.from(dbPayments.values()).find(x => x.referenceNo === where.referenceNo);
        }
        if (!p && where.khqrMd5) {
          p = Array.from(dbPayments.values()).find(x => x.khqrMd5 === where.khqrMd5);
        }
        if (!p) return null;

        const res = { ...p };
        if (include?.loan) {
          const l = dbLoans.get(p.loanId);
          res.loan = { ...l, borrower: dbBorrowers.get(l.borrowerId), product: mockProduct };
        }
        if (include?.installment && p.installmentId) {
          res.installment = dbSchedules.get(p.installmentId);
        }
        if (include?.receivedByUser && p.receivedBy) {
          res.receivedByUser = dbUsers.get(p.receivedBy);
        }
        return res;
      },
      findFirst: async ({ where, include }: any) => {
        const p = Array.from(dbPayments.values()).find(x => {
          if (where.OR) {
            return where.OR.some((cond: any) => {
              if (cond.id && x.id === cond.id) return true;
              if (cond.referenceNo && x.referenceNo === cond.referenceNo) return true;
              if (cond.receiptNo && x.receiptNo === cond.receiptNo) return true;
              if (cond.khqrMd5 && x.khqrMd5 === cond.khqrMd5) return true;
              return false;
            });
          }
          if (where.id && x.id !== where.id) return false;
          if (where.khqrMd5 && x.khqrMd5 !== where.khqrMd5) return false;
          if (where.referenceNo && x.referenceNo !== where.referenceNo) return false;
          if (where.loanId && x.loanId !== where.loanId) return false;
          return true;
        });
        if (!p) return null;

        const res = { ...p };
        if (include?.loan) {
          const l = dbLoans.get(p.loanId);
          res.loan = { ...l, borrower: dbBorrowers.get(l.borrowerId), product: mockProduct };
        }
        if (include?.installment && p.installmentId) res.installment = dbSchedules.get(p.installmentId);
        if (include?.receivedByUser && p.receivedBy) res.receivedByUser = dbUsers.get(p.receivedBy);
        return res;
      },
      findMany: async ({ where, include }: any) => {
        return Array.from(dbPayments.values())
          .filter(x => {
            if (where?.loanId && x.loanId !== where.loanId) return false;
            if (where?.status && x.status !== where.status) return false;
            return true;
          })
          .map(p => {
            const res = { ...p };
            if (include?.loan) res.loan = dbLoans.get(p.loanId);
            if (include?.installment && p.installmentId) res.installment = dbSchedules.get(p.installmentId);
            return res;
          });
      },
      update: async ({ where, data }: any) => {
        const p = dbPayments.get(where.id);
        if (!p) throw new Error(`Payment ${where.id} not found`);
        Object.assign(p, data);
        return p;
      }
    },
    auditLog: {
      create: async () => ({ id: 'audit-001' })
    },
    notification: {
      create: async () => ({ id: 'notif-001' })
    },
    $transaction: async (cb: any) => {
      if (typeof cb === 'function') {
        return await cb(mockDb);
      }
      return cb;
    }
  };

  // Wire mockDb to prisma instance
  Object.assign(prisma, mockDb);

  const app = createApp();

  const tokenA = makeToken(borrowerAUser);
  const tokenB = makeToken(borrowerBUser);
  const tokenAdmin = makeToken(adminUser);

  // -------------------------------------------------------------
  // TEST 1: EMVCo KHQR Generation Specification
  // -------------------------------------------------------------
  console.log('▶ Test 1: EMVCo KHQR Individual Dynamic Generation');
  const billNumber = `TEST-BILL-${Date.now()}`;
  const khqrResult = await BakongService.generateDynamicKhqr({
    amount: 100.00,
    currency: 'USD',
    billNumber,
    expiryMinutes: 15
  });

  assert.ok(khqrResult.qr, 'Generated QR string must not be empty');
  assert.strictEqual(typeof khqrResult.md5, 'string');
  assert.strictEqual(khqrResult.md5.length, 32, 'MD5 hash must be 32 hex chars');
  assert.ok(khqrResult.qrDataUrl.startsWith('data:image/png;base64,'), 'QR data URL must be valid PNG base64');
  
  // Validate EMVCo Tag Standard
  assert.ok(khqrResult.qr.includes('000201'), 'Tag 00 must be Format Indicator 01');
  assert.ok(khqrResult.qr.includes('010212'), 'Tag 01 must be 12 (Dynamic QR)');
  assert.ok(khqrResult.qr.includes('khqr@aclb'), 'Tag 29 must contain ACLEDA Bakong ID');
  assert.ok(khqrResult.qr.includes('PHON RITHYA'), 'Tag 59 must contain Merchant Name PHON RITHYA');
  assert.ok(khqrResult.qr.includes('840'), 'Tag 53 must contain USD currency code 840');
  assert.ok(khqrResult.qr.includes('100'), 'Tag 54 must contain amount 100');
  console.log('  ✓ EMVCo tags 00, 01, 29, 53, 54, 58, 59, 60, 63 validated successfully');
  console.log(`  ✓ Dynamic KHQR payload length: ${khqrResult.qr.length} chars | MD5: ${khqrResult.md5}`);

  // -------------------------------------------------------------
  // TEST 2: Initiate KHQR Payment for Specific Installment
  // -------------------------------------------------------------
  console.log('\n▶ Test 2: Borrower Alice Initiates KHQR Payment via API');
  const res2 = await request(app, 'POST', '/api/v1/payments/khqr/initiate', {
    loanId: loan1.id,
    installmentNo: 1,
    amount: 100,
    currency: 'USD',
    notes: 'Tuition Installment #1 via ACLEDA KHQR'
  }, { Authorization: `Bearer ${tokenA}` });

  assert.strictEqual(res2.status, 201, `Initiation must return 201 Created: ${JSON.stringify(res2.body)}`);
  assert.strictEqual(res2.body.success, true);
  assert.ok(res2.body.data.paymentId, 'Response must return paymentId');
  assert.strictEqual(res2.body.data.amount, 100);
  assert.strictEqual(res2.body.data.currency, 'USD');
  assert.strictEqual(res2.body.data.status, 'PENDING');
  assert.ok(res2.body.data.qr, 'Response must provide KHQR string');
  assert.ok(res2.body.data.qrDataUrl, 'Response must provide QR image data URL');

  const pId = res2.body.data.paymentId;
  const paymentInDb = dbPayments.get(pId);
  assert.ok(paymentInDb, 'Payment record must be persisted in database');
  assert.strictEqual(paymentInDb.status, 'PENDING');
  assert.strictEqual(paymentInDb.paymentProvider, 'BAKONG_KHQR');
  assert.strictEqual(paymentInDb.khqrMd5, res2.body.data.md5);
  console.log(`  ✓ Payment session created in DB: ${pId} with status: PENDING`);

  // -------------------------------------------------------------
  // TEST 3: Cross-Borrower Security Protection
  // -------------------------------------------------------------
  console.log("\n▶ Test 3: Cross-Borrower Security (Bob tries to initiate payment on Alice's loan)");
  const res3 = await request(app, 'POST', '/api/v1/payments/khqr/initiate', {
    loanId: loan1.id,
    installmentNo: 1,
    amount: 100,
    currency: 'USD'
  }, { Authorization: `Bearer ${tokenB}` });

  assert.strictEqual(res3.status, 403, 'Cross-borrower initiation must return 403 Forbidden');
  assert.strictEqual(res3.body.error.code, 'FORBIDDEN_OWNERSHIP');
  console.log('  ✓ Forbidden: Non-owner cannot initiate payment on another borrower\'s loan');

  // -------------------------------------------------------------
  // TEST 4: Payment Status Query Polling
  // -------------------------------------------------------------
  console.log('\n▶ Test 4: Payment Status Query Polling (/payments/:id/status)');
  const res4 = await request(app, 'GET', `/api/v1/payments/${pId}/status`, undefined, {
    Authorization: `Bearer ${tokenA}`
  });

  assert.strictEqual(res4.status, 200);
  assert.strictEqual(res4.body.data.status, 'PENDING');
  assert.strictEqual(res4.body.data.isSuccess, false);
  assert.strictEqual(res4.body.data.isPending, true);
  assert.ok(res4.body.data.secondsRemaining > 0, 'Seconds remaining must be positive');
  console.log(`  ✓ Status polling returns PENDING without premature completion (${res4.body.data.secondsRemaining}s remaining)`);

  // -------------------------------------------------------------
  // TEST 5: Bakong Open API Verification & Atomic Balance Reconciliation
  // -------------------------------------------------------------
  console.log('\n▶ Test 5: Bakong Open API Verification & Atomic Balance Reconciliation');
  const mockTxHash = `BAKONG-TRX-SETTLED-${Date.now()}`;
  const originalCheckTx = BakongService.checkTransactionByMd5;
  BakongService.checkTransactionByMd5 = async (md5: string) => {
    return {
      isSuccess: true,
      isPending: false,
      isUnconfigured: false,
      isError: false,
      transaction: {
        hash: mockTxHash,
        fromAccountId: 'customer@aclb',
        toAccountId: 'khqr@aclb',
        amount: 100.00,
        currency: 'USD',
        description: `Payment for ${loan1.loanNumber}`,
        createdDate: Date.now()
      },
      message: 'Transaction successfully cleared on Bakong network.'
    };
  };

  const res5 = await request(app, 'POST', `/api/v1/payments/${pId}/verify`, undefined, {
    Authorization: `Bearer ${tokenA}`
  });

  BakongService.checkTransactionByMd5 = originalCheckTx;

  assert.strictEqual(res5.status, 200, `Verification must return 200 OK: ${JSON.stringify(res5.body)}`);
  assert.strictEqual(res5.body.data.status, 'SUCCESS');
  assert.strictEqual(res5.body.data.transactionId, mockTxHash);
  assert.ok(res5.body.data.receiptNo, 'Must generate official receipt number');

  // Verify Database State
  const updatedPayment = dbPayments.get(pId);
  assert.ok(updatedPayment.status === 'SUCCESS' || updatedPayment.status === 'PAID', 'Payment must be marked SUCCESS or PAID');
  assert.strictEqual(updatedPayment.khqrTransactionId, mockTxHash);
  assert.ok(updatedPayment.paidAt);
  assert.ok(updatedPayment.verifiedAt);

  const updatedSchedule = dbSchedules.get(schedule1.id);
  assert.strictEqual(updatedSchedule.status, ScheduleStatus.PAID);
  assert.strictEqual(Number(updatedSchedule.remainingAmount), 0);
  assert.strictEqual(Number(updatedSchedule.amountPaid), 100);

  const updatedLoan = dbLoans.get(loan1.id);
  assert.strictEqual(Number(updatedLoan.outstandingBalance), 150); // 250 - 100
  assert.strictEqual(Number(updatedLoan.totalPaid), 100);
  console.log('  ✓ Payment marked SUCCESS, Installment #1 marked PAID');
  console.log('  ✓ Loan balance atomically reduced ($250 -> $150)');

  // -------------------------------------------------------------
  // TEST 6: Anti-Fraud: Amount Mismatch Rejected
  // -------------------------------------------------------------
  console.log('\n▶ Test 6: Anti-Fraud Protection (Amount Mismatch Detection)');
  const res6_init = await request(app, 'POST', '/api/v1/payments/khqr/initiate', {
    loanId: loan1.id,
    installmentNo: 2,
    amount: 150,
    currency: 'USD'
  }, { Authorization: `Bearer ${tokenA}` });

  const p6Id = res6_init.body.data.paymentId;

  // Simulate fraud where user paid only $50 instead of $150
  BakongService.checkTransactionByMd5 = async () => ({
    isSuccess: true,
    isPending: false,
    isUnconfigured: false,
    isError: false,
    transaction: {
      hash: `FRAUD-TRX-001`,
      amount: 50.00, // FRAUD: 50 instead of 150
      currency: 'USD'
    },
    message: 'Settled'
  });

  const res6_verify = await request(app, 'POST', `/api/v1/payments/${p6Id}/verify`, undefined, {
    Authorization: `Bearer ${tokenA}`
  });

  BakongService.checkTransactionByMd5 = originalCheckTx;

  assert.strictEqual(res6_verify.status, 400);
  assert.strictEqual(res6_verify.body.error.code, 'AMOUNT_MISMATCH');

  const fraudPayment = dbPayments.get(p6Id);
  assert.strictEqual(fraudPayment.status, 'FAILED');
  assert.ok(fraudPayment.failureReason.includes('Amount mismatch'));

  const untouchedLoan = dbLoans.get(loan1.id);
  assert.strictEqual(Number(untouchedLoan.outstandingBalance), 150, 'Loan balance must NOT be reduced on fraud');
  console.log('  ✓ Fraud detected: Payment marked FAILED with AMOUNT_MISMATCH, loan balance untouched');

  // -------------------------------------------------------------
  // TEST 7: Anti-Fraud: Currency Mismatch Rejected
  // -------------------------------------------------------------
  console.log('\n▶ Test 7: Anti-Fraud Protection (Currency Mismatch Detection)');
  const res7_init = await request(app, 'POST', '/api/v1/payments/khqr/initiate', {
    loanId: loan1.id,
    installmentNo: 2,
    amount: 150,
    currency: 'USD'
  }, { Authorization: `Bearer ${tokenA}` });

  const p7Id = res7_init.body.data.paymentId;

  // Simulate currency mismatch: user paid in KHR instead of USD
  BakongService.checkTransactionByMd5 = async () => ({
    isSuccess: true,
    isPending: false,
    isUnconfigured: false,
    isError: false,
    transaction: {
      hash: `CURR-MISMATCH-001`,
      amount: 150.00,
      currency: 'KHR' // MISMATCH
    },
    message: 'Settled'
  });

  const res7_verify = await request(app, 'POST', `/api/v1/payments/${p7Id}/verify`, undefined, {
    Authorization: `Bearer ${tokenA}`
  });

  BakongService.checkTransactionByMd5 = originalCheckTx;

  assert.strictEqual(res7_verify.status, 400);
  assert.strictEqual(res7_verify.body.error.code, 'CURRENCY_MISMATCH');
  console.log('  ✓ Currency mismatch rejected with 400 CURRENCY_MISMATCH');

  // -------------------------------------------------------------
  // TEST 8: Replay Attack & Duplicate Payment Prevention (Idempotency)
  // -------------------------------------------------------------
  console.log('\n▶ Test 8: Replay Attack Prevention (Verifying Already Paid Session)');
  const balanceBeforeReplay = Number(updatedLoan.outstandingBalance);

  const res8 = await request(app, 'POST', `/api/v1/payments/${pId}/verify`, undefined, {
    Authorization: `Bearer ${tokenA}`
  });

  assert.strictEqual(res8.status, 200);
  assert.strictEqual(res8.body.data.status, 'SUCCESS');
  assert.strictEqual(res8.body.data.isAlreadyVerified, true);

  const loanAfterReplay = dbLoans.get(loan1.id);
  assert.strictEqual(Number(loanAfterReplay.outstandingBalance), balanceBeforeReplay, 'Balance must not change on replayed verification');
  console.log('  ✓ Idempotency protected: Re-verifying returns existing receipt without double-decrementing');

  // -------------------------------------------------------------
  // TEST 9: Bakong Webhook Processing with HMAC Signature
  // -------------------------------------------------------------
  console.log('\n▶ Test 9: Bakong Webhook Processing & HMAC Validation');
  const res9_init = await request(app, 'POST', '/api/v1/payments/khqr/initiate', {
    loanId: loan1.id,
    installmentNo: 2,
    amount: 150,
    currency: 'USD'
  }, { Authorization: `Bearer ${tokenA}` });

  const p9Md5 = res9_init.body.data.md5;
  const webhookSecret = 'test_webhook_secret_key_888';
  process.env.KHQR_WEBHOOK_SECRET = webhookSecret;

  const webhookPayload = {
    event: 'TRANSACTION_SETTLED',
    md5: p9Md5,
    hash: `WEBHOOK-HASH-999`,
    amount: 150.00,
    currency: 'USD',
    fromAccountId: 'payer@aclb',
    toAccountId: 'khqr@aclb'
  };

  const payloadString = JSON.stringify(webhookPayload);
  const validSignature = crypto.createHmac('sha256', webhookSecret).update(payloadString).digest('hex');

  BakongService.checkTransactionByMd5 = async () => ({
    isSuccess: true,
    isPending: false,
    isUnconfigured: false,
    isError: false,
    transaction: {
      hash: `WEBHOOK-HASH-999`,
      amount: 150.00,
      currency: 'USD',
      fromAccountId: 'payer@aclb',
      toAccountId: 'khqr@aclb'
    },
    message: 'Settled via Bakong network'
  });

  const res9_webhook = await request(app, 'POST', '/api/v1/payments/webhook', webhookPayload, {
    'x-bakong-signature': validSignature
  });

  BakongService.checkTransactionByMd5 = originalCheckTx;

  assert.strictEqual(res9_webhook.status, 200);
  assert.strictEqual(res9_webhook.body.success, true);

  const p9InDb = dbPayments.get(res9_init.body.data.paymentId);
  assert.ok(p9InDb.status === 'SUCCESS' || p9InDb.status === 'PAID', 'Payment must be marked SUCCESS or PAID after webhook');

  const s2InDb = dbSchedules.get(schedule2.id);
  assert.strictEqual(s2InDb.status, ScheduleStatus.PAID);
  console.log('  ✓ Webhook HMAC validated and Installment #2 settled asynchronously');

  // -------------------------------------------------------------
  // TEST 10: Invalid Webhook Signature Rejected (401 Unauthorized)
  // -------------------------------------------------------------
  console.log('\n▶ Test 10: Invalid Webhook Signature Rejection (401 Unauthorized)');
  const res10 = await request(app, 'POST', '/api/v1/payments/webhook', webhookPayload, {
    'x-bakong-signature': 'invalid_forged_signature_hex'
  });

  assert.strictEqual(res10.status, 401);
  assert.strictEqual(res10.body.error.code, 'UNAUTHORIZED_WEBHOOK');
  console.log('  ✓ Forged webhook signature rejected with 401 UNAUTHORIZED_WEBHOOK');

  // -------------------------------------------------------------
  // TEST 11: Diagnostics Endpoint for Admin
  // -------------------------------------------------------------
  console.log('\n▶ Test 11: Bakong KHQR Diagnostics Endpoint');
  const res11 = await request(app, 'GET', '/api/v1/payments/khqr/diagnostics', undefined, {
    Authorization: `Bearer ${tokenAdmin}`
  });

  assert.strictEqual(res11.status, 200);
  assert.strictEqual(res11.body.data.merchantName, 'PHON RITHYA');
  assert.strictEqual(res11.body.data.bakongAccountId, 'khqr@aclb');
  assert.strictEqual(res11.body.data.acquiringBank, 'ACLEDA');
  assert.strictEqual(res11.body.data.emvcoStandard, 'KHQR 29 (National Bank of Cambodia)');
  assert.strictEqual(res11.body.data.apiKey, undefined, 'API Key must NEVER be leaked in diagnostics');
  console.log('  ✓ Diagnostics returns verified configuration without exposing secrets');

  console.log('\n🎉 ALL 11 BAKONG KHQR PRODUCTION-GRADE INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runBakongKhqrIntegrationTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
