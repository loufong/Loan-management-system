import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { JWT_ACCESS_SECRET } from '../src/middlewares/auth.middleware';
import { LoanStatus, UserRole, ApplicationStatus, RepaymentFrequency } from '@prisma/client';

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
            } catch {
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

async function runTests() {
  console.log('--- START: One Active Loan Per User & Super Admin Review Test Suite ---');
  const app = createApp();

  const superAdmin = {
    id: 'b1111111-1111-4111-8111-111111111111',
    username: 'superadmin_rev',
    email: 'superadmin_rev@jamsongvich.com',
    role: UserRole.SUPER_ADMIN,
    fullName: 'System Super Administrator'
  };
  const adminToken = makeToken(superAdmin);

  const testUser = {
    id: 'a1111111-1111-4111-8111-111111111111',
    username: 'borrower_active_test',
    email: 'borrower_active_test@jamsongvich.com',
    role: UserRole.USER,
    fullName: 'Sokha Active Borrower'
  };
  const userToken = makeToken(testUser);

  // Upsert test user in DB to satisfy foreign keys
  await prisma.user.upsert({
    where: { id: superAdmin.id },
    update: {},
    create: {
      id: superAdmin.id,
      username: superAdmin.username,
      email: superAdmin.email,
      passwordHash: 'hash',
      role: superAdmin.role,
      fullName: superAdmin.fullName,
      status: 'ACTIVE'
    }
  });

  await prisma.user.upsert({
    where: { id: testUser.id },
    update: {},
    create: {
      id: testUser.id,
      username: testUser.username,
      email: testUser.email,
      passwordHash: 'hash',
      role: testUser.role,
      fullName: testUser.fullName,
      status: 'ACTIVE'
    }
  });

  // Setup Borrower & Product in DB
  const testProduct = await prisma.loanProduct.upsert({
    where: { productName: 'Active Test Facility' },
    update: {},
    create: {
      productName: 'Active Test Facility',
      minAmount: 100,
      maxAmount: 10000,
      minTerm: 6,
      maxTerm: 36,
      interestRate: 8.5,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      description: 'Test facility for one active loan verification',
      status: 'ACTIVE'
    }
  });

  const testBorrower = await prisma.borrower.upsert({
    where: { borrowerId: 'BOR-TEST-9901' },
    update: { userId: testUser.id },
    create: {
      borrowerId: 'BOR-TEST-9901',
      userId: testUser.id,
      fullName: 'Sokha Active Borrower',
      gender: 'MALE',
      dob: new Date('1992-05-10'),
      phone: '+85512999888',
      email: 'borrower_active_test@jamsongvich.com',
      address: 'Building 12, St 2004, Phnom Penh',
      occupation: 'Tech Specialist',
      monthlyIncome: 2500,
      idNumber: 'ID-TEST-9901',
      status: 'ACTIVE'
    }
  });

  // Ensure clean slate for test borrower (child records first)
  await prisma.loan.deleteMany({
    where: { borrowerId: testBorrower.id }
  });
  await prisma.applicationApproval.deleteMany({
    where: { application: { borrowerId: testBorrower.id } }
  });
  await prisma.loanApplication.deleteMany({
    where: { borrowerId: testBorrower.id }
  });

  // 1. Borrower submits first loan application -> Should succeed (201)
  console.log('1. User without previous loan applies -> Expecting 201 Created');
  const app1Res = await request(
    app,
    'POST',
    '/api/v1/loan-applications',
    {
      borrowerId: testBorrower.id,
      productId: testProduct.id,
      requestedAmount: 5000,
      requestedTerm: 12,
      interestRate: 8.5,
      purpose: 'Home Improvement & Educational',
      monthlyIncome: 2500,
      employmentStatus: 'EMPLOYED',
      employerName: 'Phnom Penh Tech'
    },
    { Authorization: `Bearer ${userToken}` }
  );

  assert.strictEqual(app1Res.status, 201, `Failed to submit application: ${JSON.stringify(app1Res.body)}`);
  const app1Id = app1Res.body.data.id;
  console.log(`✓ Application submitted successfully: ${app1Id}`);

  // 2. Borrower attempts second application while first is PENDING/SUBMITTED -> Must be rejected (400)
  console.log('2. User with pending application attempts 2nd application -> Expecting 400 rejection');
  const app2Res = await request(
    app,
    'POST',
    '/api/v1/loan-applications',
    {
      borrowerId: testBorrower.id,
      productId: testProduct.id,
      requestedAmount: 3000,
      requestedTerm: 6,
      interestRate: 8.5,
      purpose: 'Second attempt'
    },
    { Authorization: `Bearer ${userToken}` }
  );

  assert.strictEqual(app2Res.status, 400, `Expected 400 for second application, got: ${app2Res.status}`);
  assert.ok(
    app2Res.body.message?.includes('active loan') ||
    app2Res.body.message?.includes('review') ||
    app2Res.body.code === 'PENDING_APPLICATION_EXISTS' ||
    app2Res.body.error?.code === 'PENDING_APPLICATION_EXISTS' ||
    app2Res.body.error?.code === 'ACTIVE_LOAN_EXISTS',
    `Expected active loan error message, got: ${JSON.stringify(app2Res.body)}`
  );
  console.log(`✓ Second application rejected with: "${app2Res.body.message}"`);

  // 3. Super Admin lists applications via review API
  console.log('3. Super Admin retrieves applications via /api/v1/loan-applications/admin/all');
  const listRes = await request(
    app,
    'GET',
    '/api/v1/loan-applications/admin/all?status=PENDING',
    undefined,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body.data?.items));
  assert.ok(listRes.body.data?.pendingCount >= 1);
  console.log(`✓ Super Admin application list returned ${listRes.body.data.items.length} records, pendingCount: ${listRes.body.data.pendingCount}`);

  // 4. Super Admin inspects complete 6-section dossier
  console.log('4. Super Admin requests dossier for application');
  const dossierRes = await request(
    app,
    'GET',
    `/api/v1/loan-applications/${app1Id}/dossier`,
    undefined,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(dossierRes.status, 200);
  assert.ok(dossierRes.body.data?.personalInfo);
  assert.ok(dossierRes.body.data?.loanInfo);
  assert.ok(dossierRes.body.data?.financialInfo);
  assert.ok(Array.isArray(dossierRes.body.data?.supportingDocuments));
  console.log('✓ Dossier retrieved with all required sections');

  // 5. Super Admin inspects audit history
  console.log('5. Super Admin requests audit history');
  const auditRes = await request(
    app,
    'GET',
    `/api/v1/loan-applications/${app1Id}/audit-history`,
    undefined,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(auditRes.status, 200);
  assert.ok(Array.isArray(auditRes.body.data));
  console.log(`✓ Audit history returned ${auditRes.body.data.length} entries`);

  // 6. Super Admin approves loan application
  console.log('6. Super Admin approves loan application');
  const approveRes = await request(
    app,
    'POST',
    `/api/v1/loan-applications/${app1Id}/approve`,
    {
      approvedAmount: 5000,
      approvedTerm: 12,
      interestRate: 8.5,
      notes: 'Approved by Executive Committee'
    },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.body.data.applicationStatus, 'APPROVED');
  console.log('✓ Application approved successfully');

  // 7. Borrower attempts application while first is APPROVED -> Must be rejected (400)
  console.log('7. User with APPROVED loan attempts application -> Expecting 400 rejection');
  const app3Res = await request(
    app,
    'POST',
    '/api/v1/loan-applications',
    {
      borrowerId: testBorrower.id,
      productId: testProduct.id,
      requestedAmount: 2000,
      requestedTerm: 6,
      interestRate: 8.5,
      purpose: 'Attempting another loan while first is approved'
    },
    { Authorization: `Bearer ${userToken}` }
  );
  assert.strictEqual(app3Res.status, 400);
  assert.ok(
    app3Res.body.message?.includes('active loan') ||
    app3Res.body.code === 'ACTIVE_LOAN_EXISTS' ||
    app3Res.body.error?.code === 'ACTIVE_LOAN_EXISTS'
  );
  console.log(`✓ Blocked because previous loan is approved: "${app3Res.body.message}"`);

  // 8. Update loan in DB to COMPLETED with 0 balance to verify borrower can borrow again
  console.log('8. Test loan transition to COMPLETED -> User can borrow again');
  await prisma.loan.updateMany({
    where: { borrowerId: testBorrower.id },
    data: {
      status: LoanStatus.COMPLETED,
      outstandingBalance: 0,
      totalPaid: 5425
    }
  });

  // Mark the application as DISBURSED
  await prisma.loanApplication.update({
    where: { id: app1Id },
    data: { status: ApplicationStatus.DISBURSED }
  });

  // 9. Borrower submits new application now that previous loan is COMPLETED -> Should succeed (201)!
  console.log('9. User with COMPLETED loan submits new application -> Expecting 201 Created');
  const app4Res = await request(
    app,
    'POST',
    '/api/v1/loan-applications',
    {
      borrowerId: testBorrower.id,
      productId: testProduct.id,
      requestedAmount: 7000,
      requestedTerm: 24,
      interestRate: 8.5,
      purpose: 'Business expansion'
    },
    { Authorization: `Bearer ${userToken}` }
  );
  assert.strictEqual(app4Res.status, 201, `Failed to apply after loan completion: ${JSON.stringify(app4Res.body)}`);
  const app4Id = app4Res.body.data.id;
  console.log(`✓ Successfully originated new loan after completion: ${app4Id}`);

  // 10. Super Admin rejects second application with reason
  console.log('10. Super Admin rejects application with mandatory reason');
  const rejectRes = await request(
    app,
    'POST',
    `/api/v1/loan-applications/${app4Id}/reject`,
    {
      rejectionReason: 'Debt-to-income ratio exceeds regulatory threshold.'
    },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(rejectRes.status, 200);
  assert.strictEqual(rejectRes.body.data.applicationStatus, 'REJECTED');
  console.log('✓ Application rejected with documented reason');

  // 11. User can apply again after rejection
  console.log('11. User can re-apply after rejection -> Expecting 201 Created');
  const app5Res = await request(
    app,
    'POST',
    '/api/v1/loan-applications',
    {
      borrowerId: testBorrower.id,
      productId: testProduct.id,
      requestedAmount: 3000,
      requestedTerm: 12,
      interestRate: 8.5,
      purpose: 'Revised smaller loan request'
    },
    { Authorization: `Bearer ${userToken}` }
  );
  assert.strictEqual(app5Res.status, 201);
  console.log('✓ Successfully applied again after rejection');

  // Clean up
  await prisma.loan.deleteMany({
    where: { borrowerId: testBorrower.id }
  });
  await prisma.applicationApproval.deleteMany({
    where: { application: { borrowerId: testBorrower.id } }
  });
  await prisma.loanApplication.deleteMany({
    where: { borrowerId: testBorrower.id }
  });

  console.log('=== ALL TESTS PASSED: One Active Loan Per User & Super Admin Review System ===');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
