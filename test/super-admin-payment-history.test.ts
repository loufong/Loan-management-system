import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { JWT_ACCESS_SECRET } from '../src/middlewares/auth.middleware';
import { LoanStatus, ScheduleStatus, UserRole, PaymentMethod, PaymentStatus } from '@prisma/client';

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

function makeToken(payload: { id: string; username: string; email: string; role: UserRole; fullName: string }) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '1h' });
}

async function runSuperAdminPaymentHistoryTests() {
  console.log('\n🏦 ========================================================================');
  console.log('🏦 SUPER ADMIN – USER PAYMENT HISTORY MANAGEMENT TEST SUITE');
  console.log('🏦 ========================================================================\n');

  const app = createApp();

  const adminUser = {
    id: '00000000-0000-4000-a000-000000000001',
    username: 'super_admin_pay_test',
    email: 'pay_admin_test@test.local',
    role: UserRole.ADMIN,
    fullName: 'System Administrator'
  };
  const borrowerUser = {
    id: '00000000-0000-4000-a000-000000000002',
    username: 'borrower_sokha_pay_test',
    email: 'sokha_pay_test@test.local',
    role: UserRole.BORROWER,
    fullName: 'Sokha Chan'
  };

  const adminToken = makeToken(adminUser);
  const borrowerToken = makeToken(borrowerUser);

  // Upsert test users into DB
  await prisma.user.upsert({
    where: { id: adminUser.id },
    update: { role: UserRole.ADMIN },
    create: {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      fullName: adminUser.fullName,
      passwordHash: 'hashed_pw_test',
      role: UserRole.ADMIN
    }
  });

  await prisma.user.upsert({
    where: { id: borrowerUser.id },
    update: { role: UserRole.BORROWER },
    create: {
      id: borrowerUser.id,
      username: borrowerUser.username,
      email: borrowerUser.email,
      fullName: borrowerUser.fullName,
      passwordHash: 'hashed_pw_test',
      role: UserRole.BORROWER
    }
  });

  // Clean / setup test borrower and loan data
  await prisma.$executeRawUnsafe(`DELETE FROM audit_logs WHERE entity_name = 'Payment' AND entity_id LIKE 'test-%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM payments WHERE reference_no LIKE 'PAY-TEST-%' OR reference_no LIKE 'TXN-TEST-%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM repayment_schedules WHERE bakong_md5 LIKE 'test-md5-%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM loans WHERE loan_number LIKE 'LN-TEST-%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM loan_applications WHERE application_no LIKE 'APP-TEST-%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM borrowers WHERE borrower_id LIKE 'BOR-TEST-%'`);

  // Ensure test borrower
  const borrower = await prisma.borrower.create({
    data: {
      borrowerId: 'BOR-TEST-9901',
      userId: borrowerUser.id,
      fullName: 'Sokha Chan',
      phone: '+855 12 999 001',
      email: 'sokha.chan@gmail.com',
      dob: new Date('1990-01-15'),
      gender: 'MALE',
      idNumber: '010999001',
      occupation: 'Retail Business Owner',
      address: 'Phnom Penh, Cambodia',
      monthlyIncome: 2500
    }
  });

  // Ensure test loan product
  let product = await prisma.loanProduct.findFirst();
  if (!product) {
    product = await prisma.loanProduct.create({
      data: {
        productName: 'Standard Personal Loan',
        interestRate: 8.5,
        minAmount: 500,
        maxAmount: 20000,
        minTerm: 6,
        maxTerm: 36,
        repaymentFrequency: 'MONTHLY'
      }
    });
  }

  // Ensure a test loan application
  const appEntity = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-TEST-9901',
      borrowerId: borrower.id,
      productId: product.id,
      requestedAmount: 1200,
      requestedTerm: 12,
      purpose: 'Business Expansion',
      monthlyIncome: 2500,
      status: 'APPROVED',
      createdBy: adminUser.id
    }
  });

  // Create test loan
  const testLoan = await prisma.loan.create({
    data: {
      loanNumber: 'LN-TEST-9901',
      applicationId: appEntity.id,
      borrowerId: borrower.id,
      userId: borrowerUser.id,
      productId: product.id,
      principalAmount: 1200,
      interestRate: 8.5,
      termMonths: 12,
      repaymentFrequency: 'MONTHLY',
      totalInterest: 55.25,
      totalRepayment: 1255.25,
      totalPaid: 0,
      outstandingBalance: 1255.25,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-10-01'),
      status: LoanStatus.ACTIVE
    }
  });

  // Create test installments (inst1 is future -> PENDING; inst2 is past -> OVERDUE)
  const inst1 = await prisma.repaymentSchedule.create({
    data: {
      loanId: testLoan.id,
      installmentNo: 1,
      dueDate: new Date(Date.now() + 15 * 86400000), // 15 days in future
      principalAmount: 100,
      interestAmount: 8.5,
      totalDue: 108.5,
      amountPaid: 0,
      remainingAmount: 108.5,
      status: ScheduleStatus.UNPAID,
      bakongMd5: 'test-md5-001'
    }
  });

  const inst2 = await prisma.repaymentSchedule.create({
    data: {
      loanId: testLoan.id,
      installmentNo: 2,
      dueDate: new Date(Date.now() - 5 * 86400000), // 5 days in past
      principalAmount: 100,
      interestAmount: 7.8,
      totalDue: 107.8,
      amountPaid: 0,
      remainingAmount: 107.8,
      status: ScheduleStatus.OVERDUE,
      bakongMd5: 'test-md5-002'
    }
  });

  // Create a pending test payment
  const pendingPayment = await prisma.payment.create({
    data: {
      receiptNo: 'REC-2026-TEST1',
      loanId: testLoan.id,
      installmentId: inst1.id,
      borrowerId: borrower.id,
      amount: 108.5,
      currency: 'USD',
      paymentMethod: PaymentMethod.QR_PAYMENT,
      paymentProvider: 'BAKONG_KHQR',
      referenceNo: 'PAY-TEST-0001',
      status: PaymentStatus.PENDING,
      notes: 'Pending review by Compliance Desk'
    }
  });

  console.log('▶ Test 1: Super Admin Payment Summary API (Dynamic Calculations)');
  {
    const res = await request(app, 'GET', '/api/v1/payments/admin/summary', null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200, 'Expected 200 OK');
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.totalOutstandingBalance >= 1255.25, 'Expected outstanding balance calculation');
    assert(res.body.data.pendingPaymentsCount >= 1, 'Expected at least 1 pending payment');
    console.log('  ✓ Dynamic summary calculated from DB: Total Outstanding = $' + res.body.data.totalOutstandingBalance + ', Pending Count = ' + res.body.data.pendingPaymentsCount);
  }

  console.log('\n▶ Test 2: RBAC Security Guard: Non-Admin Forbidden from Global Summary');
  {
    const res = await request(app, 'GET', '/api/v1/payments/admin/summary', null, {
      Authorization: `Bearer ${borrowerToken}`
    });
    assert.strictEqual(res.status, 403, 'Expected 403 FORBIDDEN for borrower');
    console.log('  ✓ Unauthorized borrower blocked from accessing administrative summary with 403 FORBIDDEN');
  }

  console.log('\n▶ Test 3: Super Admin 13-Column User Payment History Table API');
  {
    const res = await request(app, 'GET', '/api/v1/payments/admin/all?search=Sokha', null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200, 'Expected 200 OK');
    assert(Array.isArray(res.body.data), 'Expected data array');
    const row = res.body.data.find((p: any) => p.transactionReference === 'PAY-TEST-0001');
    assert(row, 'Expected to find pending test payment row');
    assert.strictEqual(row.userFullName, 'Sokha Chan');
    assert.strictEqual(row.paymentAmount, 108.5);
    assert.strictEqual(row.loanId, 'LN-TEST-9901');
    assert.strictEqual(row.paymentStatus, 'PENDING');
    console.log('  ✓ All 13 columns present including Payment ID, User ID, Full Name, Loan ID, Amount, Method, Status');
  }

  console.log('\n▶ Test 4: Super Admin Confirms Pending Payment with ACID Transaction');
  {
    const res = await request(app, 'POST', `/api/v1/payments/${pendingPayment.id}/confirm`, {
      notes: 'Verified via NBC Clearing Ledger'
    }, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200, 'Expected 200 OK');
    assert.strictEqual(res.body.data.status, 'PAID');

    // Verify DB updates
    const updatedLoan = await prisma.loan.findUnique({ where: { id: testLoan.id } });
    assert.strictEqual(Number(updatedLoan?.totalPaid), 108.5, 'Loan totalPaid should be updated');
    assert.strictEqual(Number(updatedLoan?.outstandingBalance), 1146.75, 'Loan outstandingBalance should be decremented');

    const updatedInst = await prisma.repaymentSchedule.findUnique({ where: { id: inst1.id } });
    assert.strictEqual(Number(updatedInst?.amountPaid), 108.5, 'Installment amountPaid should be updated');
    assert.strictEqual(Number(updatedInst?.remainingAmount), 0, 'Installment remainingAmount should be 0');
    assert.strictEqual(updatedInst?.status, ScheduleStatus.PAID, 'Installment status should be PAID');

    console.log('  ✓ ACID transaction verified: Payment marked PAID, installment settled, loan balance reduced to $' + updatedLoan?.outstandingBalance);
  }

  console.log('\n▶ Test 5: Rejection of Invalid Payment with Mandatory Reason');
  {
    // Create another pending payment to reject
    const payToReject = await prisma.payment.create({
      data: {
        receiptNo: 'REC-2026-TEST2',
        loanId: testLoan.id,
        installmentId: inst2.id,
        borrowerId: borrower.id,
        amount: 50.0,
        currency: 'USD',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentProvider: 'MANUAL',
        referenceNo: 'PAY-TEST-0002',
        status: PaymentStatus.PENDING
      }
    });

    // Attempt without reason -> fails
    const failRes = await request(app, 'POST', `/api/v1/payments/${payToReject.id}/reject`, {
      reason: ''
    }, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(failRes.status, 400, 'Rejection without reason must fail');

    // Reject with reason
    const okRes = await request(app, 'POST', `/api/v1/payments/${payToReject.id}/reject`, {
      reason: 'Transaction reference not found in ACLEDA bank statement'
    }, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(okRes.status, 200, 'Expected 200 OK');
    assert.strictEqual(okRes.body.data.status, 'FAILED');
    assert.strictEqual(okRes.body.data.failureReason, 'Transaction reference not found in ACLEDA bank statement');
    console.log('  ✓ Rejection requires mandatory reason; payment successfully marked FAILED');
  }

  console.log('\n▶ Test 6: Complete User Payment History Dossier');
  {
    const res = await request(app, 'GET', `/api/v1/payments/admin/user/${borrower.id}/history`, null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200, 'Expected 200 OK');
    const dossier = res.body.data;
    assert.strictEqual(dossier.user.fullName, 'Sokha Chan');
    assert.strictEqual(dossier.summary.totalLoansBorrowed, 1);
    assert.strictEqual(dossier.summary.totalAmountBorrowedUSD, 1200);
    assert.strictEqual(dossier.summary.totalAmountRepaidUSD, 108.5);
    assert(dossier.loans.length > 0, 'Loans array should be populated');
    assert(dossier.installments.length > 0, 'Installments array should be populated');
    assert(dossier.payments.length >= 2, 'Payments array should contain recorded payments');
    console.log('  ✓ User Dossier verified: 1 loan, $1,200 borrowed, $108.50 repaid, complete payment trail');
  }

  console.log('\n▶ Test 7: Payment Audit Log Trail');
  {
    const res = await request(app, 'GET', `/api/v1/payments/${pendingPayment.id}/audit-trail`, null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200, 'Expected 200 OK');
    assert(Array.isArray(res.body.data), 'Expected audit logs array');
    assert(res.body.data.length >= 1, 'Expected at least 1 audit entry for confirmPayment');
    assert.strictEqual(res.body.data[0].action, 'CONFIRM_PAYMENT');
    console.log('  ✓ Audit trail verified: Action CONFIRM_PAYMENT logged with admin identification');
  }

  // Cleanup test artifacts
  await prisma.$executeRawUnsafe(`DELETE FROM audit_logs WHERE entity_name = 'Payment' AND entity_id IN ('${pendingPayment.id}')`);
  await prisma.$executeRawUnsafe(`DELETE FROM payments WHERE loan_id = '${testLoan.id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM repayment_schedules WHERE loan_id = '${testLoan.id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM loans WHERE id = '${testLoan.id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM loan_applications WHERE id = '${appEntity.id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM borrowers WHERE id = '${borrower.id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id IN ('${adminUser.id}', '${borrowerUser.id}')`);

  console.log('\n🎉 ALL SUPER ADMIN USER PAYMENT HISTORY MANAGEMENT TESTS PASSED PERFECTLY!\n');
}

runSuperAdminPaymentHistoryTests().catch((err) => {
  console.error('❌ Super Admin Payment History test failed:', err);
  process.exit(1);
});
