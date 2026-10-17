import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { JWT_ACCESS_SECRET } from '../src/middlewares/auth.middleware';
import { LoanStatus, ScheduleStatus, UserRole, PaymentMethod, Prisma } from '@prisma/client';

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

function makeToken(user: { id: string; username: string; email: string; role: UserRole }) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: '2h' }
  );
}

async function runBorrowerPaymentTestSuite() {
  console.log('\n💳 ========================================================');
  console.log('💳 BORROWER / USER REAL PAYMENT INTEGRATION TEST SUITE');
  console.log('💳 ========================================================\n');

  const app = createApp();

  // Create clean isolated test users in database
  const timestamp = Date.now();
  const borrowerAUser = await prisma.user.create({
    data: {
      username: `borrower_a_${timestamp}`,
      email: `borrower_a_${timestamp}@student.edu`,
      passwordHash: 'dummy_hash',
      fullName: 'Borrower Alice',
      role: UserRole.USER,
      status: 'ACTIVE'
    }
  });

  const borrowerBUser = await prisma.user.create({
    data: {
      username: `borrower_b_${timestamp}`,
      email: `borrower_b_${timestamp}@student.edu`,
      passwordHash: 'dummy_hash',
      fullName: 'Borrower Bob',
      role: UserRole.USER,
      status: 'ACTIVE'
    }
  });

  const adminUser = await prisma.user.create({
    data: {
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@bank.lms`,
      passwordHash: 'dummy_hash',
      fullName: 'Admin Cashier',
      role: UserRole.ADMIN,
      status: 'ACTIVE'
    }
  });

  const borrowerA = await prisma.borrower.create({
    data: {
      borrowerId: `BOR-A-${timestamp.toString().slice(-4)}`,
      userId: borrowerAUser.id,
      fullName: 'Borrower Alice',
      gender: 'FEMALE',
      dob: new Date('1998-04-12'),
      phone: '+1-555-0199',
      email: borrowerAUser.email,
      address: '123 Campus Rd',
      occupation: 'Student Researcher',
      monthlyIncome: new Prisma.Decimal(2500),
      idNumber: `ID-A-${timestamp}`
    }
  });

  const borrowerB = await prisma.borrower.create({
    data: {
      borrowerId: `BOR-B-${timestamp.toString().slice(-4)}`,
      userId: borrowerBUser.id,
      fullName: 'Borrower Bob',
      gender: 'MALE',
      dob: new Date('1997-08-20'),
      phone: '+1-555-0198',
      email: borrowerBUser.email,
      address: '456 College Ave',
      occupation: 'Graduate Assistant',
      monthlyIncome: new Prisma.Decimal(3000),
      idNumber: `ID-B-${timestamp}`
    }
  });

  const product = await prisma.loanProduct.create({
    data: {
      productName: `Student Emergency Advance ${timestamp}`,
      minAmount: new Prisma.Decimal(500),
      maxAmount: new Prisma.Decimal(10000),
      interestRate: new Prisma.Decimal(5.0),
      minTerm: 1,
      maxTerm: 12,
      repaymentFrequency: 'MONTHLY',
      description: 'Test Facility'
    }
  });

  // Helper to create test loan with schedules
  async function createTestLoan(borrowerId: string, loanNumber: string, installments: number[], status = LoanStatus.ACTIVE) {
    const totalRepayment = installments.reduce((a, b) => a + b, 0);
    const application = await prisma.loanApplication.create({
      data: {
        applicationNo: `APP-${loanNumber}`,
        borrowerId,
        productId: product.id,
        requestedAmount: new Prisma.Decimal(totalRepayment),
        requestedTerm: installments.length,
        purpose: 'Academic expenses',
        monthlyIncome: new Prisma.Decimal(2500),
        status: 'DISBURSED',
        createdBy: adminUser.id
      }
    });

    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        applicationId: application.id,
        borrowerId,
        productId: product.id,
        principalAmount: new Prisma.Decimal(totalRepayment),
        interestRate: new Prisma.Decimal(5.0),
        termMonths: installments.length,
        repaymentFrequency: 'MONTHLY',
        totalInterest: new Prisma.Decimal(0),
        totalRepayment: new Prisma.Decimal(totalRepayment),
        totalPaid: new Prisma.Decimal(0),
        outstandingBalance: new Prisma.Decimal(totalRepayment),
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-01'),
        status
      }
    });

    for (let i = 0; i < installments.length; i++) {
      const amt = installments[i];
      const dueDate = new Date('2026-01-15');
      dueDate.setMonth(dueDate.getMonth() + i);

      await prisma.repaymentSchedule.create({
        data: {
          loanId: loan.id,
          installmentNo: i + 1,
          dueDate,
          principalAmount: new Prisma.Decimal(amt),
          interestAmount: new Prisma.Decimal(0),
          totalDue: new Prisma.Decimal(amt),
          amountPaid: new Prisma.Decimal(0),
          remainingAmount: new Prisma.Decimal(amt),
          status: ScheduleStatus.UNPAID
        }
      });
    }

    return loan;
  }

  const tokenA = makeToken(borrowerAUser);
  const tokenB = makeToken(borrowerBUser);
  const tokenAdmin = makeToken(adminUser);

  try {
    // -------------------------------------------------------------
    // Test 1: Full Payment
    // Due = $500, Pay = $500 -> Installment = PAID, Outstanding decreases by $500
    // -------------------------------------------------------------
    console.log('▶ Test 1: Full Payment of Exact Installment ($500 on $500 due)');
    const loan1 = await createTestLoan(borrowerA.id, `LN-TEST1-${timestamp}`, [500, 500]);
    const res1 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan1.loanNumber,
      amount: 500,
      paymentMethod: 'BANK_TRANSFER'
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res1.status, 201, 'Full payment must succeed with status 201');
    assert.strictEqual(res1.body.data.amount, 500);
    assert.strictEqual(res1.body.data.remainingBalance, 500);
    assert(res1.body.data.reference.startsWith('PAY-'), 'Reference must follow PAY- format');

    const schedule1 = await prisma.repaymentSchedule.findFirst({
      where: { loanId: loan1.id, installmentNo: 1 }
    });
    assert.strictEqual(schedule1?.status, ScheduleStatus.PAID);
    assert.strictEqual(Number(schedule1?.remainingAmount), 0);
    console.log('  ✓ Installment 1 marked PAID, loan outstanding decreased by $500');

    // -------------------------------------------------------------
    // Test 2: Partial Payment
    // Due = $500, Pay = $200 -> Installment = PARTIALLY_PAID, Remaining = $300
    // -------------------------------------------------------------
    console.log('\n▶ Test 2: Partial Payment ($200 on $500 due)');
    const loan2 = await createTestLoan(borrowerA.id, `LN-TEST2-${timestamp}`, [500]);
    const res2 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan2.loanNumber,
      amount: 200,
      paymentMethod: 'QR_PAYMENT'
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.body.data.remainingBalance, 300);

    const schedule2 = await prisma.repaymentSchedule.findFirst({
      where: { loanId: loan2.id, installmentNo: 1 }
    });
    assert.strictEqual(schedule2?.status, ScheduleStatus.PARTIAL);
    assert.strictEqual(Number(schedule2?.amountPaid), 200);
    assert.strictEqual(Number(schedule2?.remainingAmount), 300);
    console.log('  ✓ Installment marked PARTIALLY_PAID (paid $200, remaining $300)');

    // -------------------------------------------------------------
    // Test 3: Complete Partial Payment
    // Existing remaining = $300, Pay = $300 -> Installment = PAID, Remaining = $0, Loan COMPLETED
    // -------------------------------------------------------------
    console.log('\n▶ Test 3: Complete Partial Payment ($300 remaining on loan2)');
    const res3 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan2.loanNumber,
      amount: 300,
      paymentMethod: 'CASH'
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res3.status, 201);
    assert.strictEqual(res3.body.data.remainingBalance, 0);
    assert.strictEqual(res3.body.data.isCompleted, true);

    const schedule3 = await prisma.repaymentSchedule.findFirst({
      where: { loanId: loan2.id, installmentNo: 1 }
    });
    assert.strictEqual(schedule3?.status, ScheduleStatus.PAID);
    assert.strictEqual(Number(schedule3?.remainingAmount), 0);

    const updatedLoan2 = await prisma.loan.findUnique({ where: { id: loan2.id } });
    assert.strictEqual(updatedLoan2?.status, LoanStatus.COMPLETED);
    console.log('  ✓ Remaining $300 cleared, installment PAID, loan status updated to COMPLETED');

    // -------------------------------------------------------------
    // Test 4: Multiple Installments Waterfall Allocation
    // Installment 1 = $300, Installment 2 = $400, Pay = $500
    // Expected: Installment 1 = PAID, Installment 2 = PARTIAL (remaining $200)
    // -------------------------------------------------------------
    console.log('\n▶ Test 4: Multiple Installments Waterfall ($500 paid across $300 & $400)');
    const loan4 = await createTestLoan(borrowerA.id, `LN-TEST4-${timestamp}`, [300, 400]);
    const res4 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan4.loanNumber,
      amount: 500,
      paymentMethod: 'BANK_TRANSFER'
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res4.status, 201);
    assert.strictEqual(res4.body.data.remainingBalance, 200);

    const s4_1 = await prisma.repaymentSchedule.findFirst({ where: { loanId: loan4.id, installmentNo: 1 } });
    const s4_2 = await prisma.repaymentSchedule.findFirst({ where: { loanId: loan4.id, installmentNo: 2 } });

    assert.strictEqual(s4_1?.status, ScheduleStatus.PAID);
    assert.strictEqual(Number(s4_1?.remainingAmount), 0);

    assert.strictEqual(s4_2?.status, ScheduleStatus.PARTIAL);
    assert.strictEqual(Number(s4_2?.amountPaid), 200);
    assert.strictEqual(Number(s4_2?.remainingAmount), 200);
    console.log('  ✓ Waterfall allocation: Installment #1 fully settled ($300), Installment #2 partial ($200 paid, $200 remaining)');

    // -------------------------------------------------------------
    // Test 5: Unauthorized Payment
    // USER B tries to pay USER A's loan -> 403 Forbidden
    // -------------------------------------------------------------
    console.log("\n▶ Test 5: Unauthorized Payment (USER B attempts to pay USER A's loan)");
    const res5 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan1.loanNumber,
      amount: 100,
      paymentMethod: 'BANK_TRANSFER'
    }, { Authorization: `Bearer ${tokenB}` });

    assert.strictEqual(res5.status, 403, 'Must return 403 Forbidden for cross-account payment');
    assert.strictEqual(res5.body.error.code, 'FORBIDDEN_OWNERSHIP');
    console.log('  ✓ Cross-borrower unauthorized payment rejected with 403 FORBIDDEN');

    // -------------------------------------------------------------
    // Test 6: Completed Loan Rejected
    // Loan status = COMPLETED -> Payment rejected
    // -------------------------------------------------------------
    console.log('\n▶ Test 6: Completed Loan Payment Rejection');
    const res6 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan2.loanNumber,
      amount: 50,
      paymentMethod: 'CASH'
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res6.status, 400);
    assert.strictEqual(res6.body.error.code, 'LOAN_ALREADY_COMPLETED');
    assert.strictEqual(res6.body.error.message, 'Loan is already completed.');
    console.log('  ✓ Payment on COMPLETED loan rejected with 400 (Loan is already completed.)');

    // -------------------------------------------------------------
    // Test 7: Duplicate Request / Idempotency Key
    // Send same Idempotency-Key twice -> Only ONE payment created, replayed successfully
    // -------------------------------------------------------------
    console.log('\n▶ Test 7: Idempotency Protection (Same Idempotency-Key twice)');
    const loan7 = await createTestLoan(borrowerA.id, `LN-TEST7-${timestamp}`, [500]);
    const idempotencyKey = `IDEMP-${timestamp}-KEY-999`;

    const res7_first = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan7.loanNumber,
      amount: 250,
      paymentMethod: 'BANK_TRANSFER',
      idempotencyKey
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res7_first.status, 201);
    const originalPaymentId = res7_first.body.data.paymentId;

    const res7_second = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan7.loanNumber,
      amount: 250,
      paymentMethod: 'BANK_TRANSFER',
      idempotencyKey
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res7_second.status, 201);
    assert.strictEqual(res7_second.body.data.paymentId, originalPaymentId);
    assert.strictEqual(res7_second.body.data.replayed, true);

    const paymentCount = await prisma.payment.count({ where: { idempotencyKey } });
    assert.strictEqual(paymentCount, 1, 'Exactly one payment record must exist in DB for idempotency key');
    console.log('  ✓ Idempotency protected: duplicate request safely replayed original payment, exactly 1 payment record in DB');

    // -------------------------------------------------------------
    // Test 8: Zero Amount Validation Error
    // amount = 0 -> 400 Validation Error
    // -------------------------------------------------------------
    console.log('\n▶ Test 8: Zero Amount Validation ($0)');
    const res8 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan1.loanNumber,
      amount: 0,
      paymentMethod: 'CASH'
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res8.status, 400);
    console.log('  ✓ Zero amount rejected with 400 Validation Error');

    // -------------------------------------------------------------
    // Test 9: Negative Amount Validation Error
    // amount = -100 -> 400 Validation Error
    // -------------------------------------------------------------
    console.log('\n▶ Test 9: Negative Amount Validation (-$100)');
    const res9 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan1.loanNumber,
      amount: -100,
      paymentMethod: 'CASH'
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res9.status, 400);
    console.log('  ✓ Negative amount rejected with 400 Validation Error');

    // -------------------------------------------------------------
    // Test 10: Overpayment Validation
    // Remaining = $500, Payment = $600 -> Rejected with 400
    // -------------------------------------------------------------
    console.log('\n▶ Test 10: Overpayment Validation (Attempting $600 when $500 remaining)');
    const res10 = await request(app, 'POST', '/api/v1/payments', {
      loanId: loan1.loanNumber,
      amount: 600,
      paymentMethod: 'BANK_TRANSFER'
    }, { Authorization: `Bearer ${tokenA}` });

    assert.strictEqual(res10.status, 400);
    assert.strictEqual(res10.body.error.code, 'EXCEEDS_REMAINING_AMOUNT');
    assert.strictEqual(res10.body.error.message, 'Payment amount exceeds the remaining payable amount.');
    console.log('  ✓ Overpayment rejected with 400 (Payment amount exceeds the remaining payable amount.)');

    // -------------------------------------------------------------
    // Verification of Endpoints: User Payment History & Loan Payments
    // -------------------------------------------------------------
    console.log('\n▶ Verification of Payment History Endpoints');
    const myPaymentsRes = await request(app, 'GET', '/api/v1/users/me/payments', undefined, {
      Authorization: `Bearer ${tokenA}`
    });
    assert.strictEqual(myPaymentsRes.status, 200);
    assert(myPaymentsRes.body.data.length >= 3, 'User A should retrieve own payments');

    const loanPaymentsRes = await request(app, 'GET', `/api/v1/loans/${loan1.id}/payments`, undefined, {
      Authorization: `Bearer ${tokenA}`
    });
    assert.strictEqual(loanPaymentsRes.status, 200);
    assert.strictEqual(loanPaymentsRes.body.data.length, 1);

    // Cross-user loan payment history check
    const crossLoanPaymentsRes = await request(app, 'GET', `/api/v1/loans/${loan1.id}/payments`, undefined, {
      Authorization: `Bearer ${tokenB}`
    });
    assert.strictEqual(crossLoanPaymentsRes.status, 403);
    console.log('  ✓ Payment history endpoints strictly scoped to authenticated loan owner');

    console.log('\n🎉 ALL 10 BORROWER / USER REAL PAYMENT TEST CASES PASSED SUCCESSFULLY!\n');
  } finally {
    // Cleanup created test records
    await prisma.notification.deleteMany({ where: { userId: { in: [borrowerAUser.id, borrowerBUser.id, adminUser.id] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: [borrowerAUser.id, borrowerBUser.id, adminUser.id] } } });
    await prisma.payment.deleteMany({ where: { receivedBy: { in: [borrowerAUser.id, borrowerBUser.id, adminUser.id] } } });
    await prisma.repaymentSchedule.deleteMany({ where: { loan: { borrowerId: { in: [borrowerA.id, borrowerB.id] } } } });
    await prisma.loan.deleteMany({ where: { borrowerId: { in: [borrowerA.id, borrowerB.id] } } });
    await prisma.loanApplication.deleteMany({ where: { borrowerId: { in: [borrowerA.id, borrowerB.id] } } });
    await prisma.loanProduct.deleteMany({ where: { id: product.id } });
    await prisma.borrower.deleteMany({ where: { id: { in: [borrowerA.id, borrowerB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [borrowerAUser.id, borrowerBUser.id, adminUser.id] } } });
    await prisma.$disconnect();
  }
}

runBorrowerPaymentTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
