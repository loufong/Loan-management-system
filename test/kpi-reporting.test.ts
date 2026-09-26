import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { JWT_ACCESS_SECRET } from '../src/middlewares/auth.middleware';
import { ApplicationStatus, LoanStatus, ScheduleStatus, UserRole, PaymentMethod } from '@prisma/client';
import { formatCsvCell, generateCsv } from '../src/utils/csv';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';

function request(app: any, method: string, url: string, body?: any, headers: Record<string, string> = {}) {
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
            try {
              parsedBody = JSON.parse(data);
            } catch (e) {
              // raw data for csv or non-json
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

async function runKpiReportingTests() {
  console.log('\n📊 Starting KPI Metrics & Reporting Engine Test Suite...\n');

  const app = createApp();

  // 1. Mock Users & Auth Tokens
  const mockUsers: Record<string, any> = {
    'user-admin': { id: 'user-admin', username: 'admin', email: 'admin@lms.bank', role: UserRole.MANAGER, status: 'ACTIVE', fullName: 'Chief Financial Officer' },
    'user-manager': { id: 'user-manager', username: 'manager', email: 'manager@lms.bank', role: UserRole.MANAGER, status: 'ACTIVE', fullName: 'Risk Manager' },
    'user-officer': { id: 'user-officer', username: 'officer', email: 'officer@lms.bank', role: UserRole.LOAN_OFFICER, status: 'ACTIVE', fullName: 'Loan Underwriter' },
    'user-cashier': { id: 'user-cashier', username: 'cashier', email: 'cashier@lms.bank', role: UserRole.CASHIER, status: 'ACTIVE', fullName: 'Desk Cashier' },
    'user-borrower': { id: 'user-borrower', username: 'borrower', email: 'borrower@lms.bank', role: UserRole.BORROWER, status: 'ACTIVE', fullName: 'Retail Client' }
  };

  prisma.user.findUnique = (async ({ where }: any) => {
    return mockUsers[where.id] || null;
  }) as any;

  function makeToken(role: UserRole, userId: string) {
    return jwt.sign({ id: userId, username: mockUsers[userId].username, email: mockUsers[userId].email, role }, JWT_ACCESS_SECRET, { expiresIn: '1h' });
  }

  const adminToken = makeToken(UserRole.MANAGER, 'user-admin');
  const managerToken = makeToken(UserRole.MANAGER, 'user-manager');
  const borrowerToken = makeToken(UserRole.BORROWER, 'user-borrower');

  // --- Hermetic Mocks for SQL Aggregations & Reporting ---
  prisma.loanApplication.count = (async (args?: any) => {
    if (!args || !args.where) return 100; // totalApplications
    if (args.where.status === ApplicationStatus.APPROVED) return 80;
    if (args.where.status === ApplicationStatus.REJECTED) return 10;
    if (args.where.status?.in) return 90; // submittedApplications
    return 10;
  }) as any;

  prisma.loan.count = (async (args?: any) => {
    if (!args || !args.where) return 75;
    if (args.where.status === LoanStatus.ACTIVE) return 60;
    if (args.where.status === LoanStatus.OVERDUE) return 10;
    if (args.where.status === LoanStatus.COMPLETED) return 5;
    return 0;
  }) as any;

  prisma.loan.aggregate = (async () => ({
    _sum: {
      principalAmount: 500000.00,
      totalRepayment: 560000.00,
      totalPaid: 200000.00,
      outstandingBalance: 360000.00
    }
  })) as any;

  prisma.payment.aggregate = (async () => ({
    _sum: { amount: 200000.00 },
    _count: { id: 450 }
  })) as any;

  prisma.repaymentSchedule.aggregate = (async (args?: any) => {
    if (args?.where?.status?.not === ScheduleStatus.PAID) {
      // Overdue amount
      return { _sum: { remainingAmount: 36000.00 } };
    }
    // Total due to date
    return { _sum: { totalDue: 250000.00 } };
  }) as any;

  prisma.loanProduct.findMany = (async () => [
    {
      id: 'prod-sme',
      productName: 'SME Working Capital',
      minAmount: 1000,
      maxAmount: 50000,
      interestRate: 12.0,
      loans: [
        { principalAmount: 200000, outstandingBalance: 150000, totalRepayment: 224000 },
        { principalAmount: 100000, outstandingBalance: 80000, totalRepayment: 112000 }
      ]
    },
    {
      id: 'prod-micro',
      productName: 'Personal Microloan',
      minAmount: 200,
      maxAmount: 5000,
      interestRate: 18.0,
      loans: [
        { principalAmount: 50000, outstandingBalance: 40000, totalRepayment: 59000 }
      ]
    }
  ]) as any;

  // Mock historical records for charts
  const testDate = new Date();
  prisma.disbursement.findMany = (async () => [
    { amount: 50000, disbursementDate: testDate },
    { amount: 35000, disbursementDate: new Date(testDate.getFullYear(), testDate.getMonth() - 1, 15) }
  ]) as any;

  prisma.payment.findMany = (async () => [
    {
      id: 'pay-1',
      amount: 466.67,
      paymentMethod: PaymentMethod.CASH,
      paymentDate: testDate,
      receivedBy: 'user-cashier',
      receivedByUser: { id: 'user-cashier', fullName: 'Desk Cashier', username: 'cashier' }
    },
    {
      id: 'pay-2',
      amount: 1200.00,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDate: testDate,
      receivedBy: 'user-cashier',
      receivedByUser: { id: 'user-cashier', fullName: 'Desk Cashier', username: 'cashier' }
    }
  ]) as any;

  // Mock report datasets
  prisma.loanApplication.findMany = (async () => [
    {
      applicationNo: 'APP-2026-0001',
      requestedAmount: 5000.00,
      requestedTerm: 12,
      status: ApplicationStatus.APPROVED,
      createdAt: testDate,
      borrower: { borrowerId: 'BOR-2026-0001', fullName: 'Sokha Chan', phone: '012345678' },
      product: { productName: 'SME Working Capital' }
    }
  ]) as any;

  prisma.loan.findMany = (async () => [
    {
      loanNumber: 'LN-2026-0001',
      principalAmount: 5000.00,
      totalRepayment: 5600.00,
      totalPaid: 466.67,
      outstandingBalance: 5133.33,
      status: LoanStatus.ACTIVE,
      borrower: { borrowerId: 'BOR-2026-0001', fullName: 'Sokha Chan', phone: '012345678', email: 'sokha@bank.lms' },
      product: { productName: 'SME Working Capital' },
      repaymentSchedules: [
        { dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), remainingAmount: 466.67 }
      ]
    }
  ]) as any;

  prisma.repaymentSchedule.findMany = (async () => [
    {
      installmentNo: 1,
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      remainingAmount: 466.67,
      loan: {
        loanNumber: 'LN-2026-0001',
        borrower: { borrowerId: 'BOR-2026-0001', fullName: 'Sokha Chan', phone: '012345678', email: 'sokha@bank.lms' },
        product: { productName: 'SME Working Capital' }
      }
    }
  ]) as any;

  // =========================================================================
  // TEST 1: CSV Utility Engine (RFC 4180 Escaping & Formula Injection Defense)
  // =========================================================================
  console.log('--- 1. CSV Utility: Cell Sanitization & RFC 4180 Compliance ---');
  // Formula injection defense
  const unsafeFormula = '=SUM(A1:A10)';
  const safeCell = formatCsvCell(unsafeFormula);
  assert.strictEqual(safeCell, `"'=SUM(A1:A10)"`, 'Leading = must be prefixed with apostrophe');
  console.log(`✅ CSV formula injection defense verified: ${unsafeFormula} -> ${safeCell}`);

  // Quotes and commas escaping
  const complexText = 'Chan, Sokha "VIP Client"';
  const escapedText = formatCsvCell(complexText);
  assert.strictEqual(escapedText, `"Chan, Sokha ""VIP Client"""`);
  console.log(`✅ CSV quote doubling verified: ${complexText} -> ${escapedText}`);

  // Multi-column CSV generator
  const sampleData = [
    { id: 1, name: 'Sokha', amount: 500 },
    { id: 2, name: 'Dara', amount: 1200 }
  ];
  const generated = generateCsv(['id', 'name', 'amount'], sampleData);
  assert.ok(generated.includes('"id","name","amount"'));
  assert.ok(generated.includes('"1","Sokha","500"'));
  assert.ok(generated.includes('"2","Dara","1200"'));
  console.log('✅ RFC 4180 compliant CSV stream generation verified');

  // =========================================================================
  // TEST 2: Dashboard KPI Endpoint (GET /api/dashboard/kpis)
  // =========================================================================
  console.log('\n--- 2. Dashboard KPI Endpoint: GET /api/dashboard/kpis ---');

  // RBAC guard: Borrower cannot access executive KPIs
  const borrowerRes = await request(app, 'GET', '/api/dashboard/kpis', undefined, {
    Authorization: `Bearer ${borrowerToken}`
  });
  assert.strictEqual(borrowerRes.status, 403, 'Borrower must receive 403 FORBIDDEN');
  console.log('✅ GET /api/dashboard/kpis RBAC: BORROWER blocked with 403 FORBIDDEN');

  // Staff access: ADMIN receives all 13 requested metrics
  const kpiRes = await request(app, 'GET', '/api/dashboard/kpis', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(kpiRes.status, 200);
  assert.strictEqual(kpiRes.body.success, true);
  const data = kpiRes.body.data;

  // Verify all exact prompt requested fields exist
  assert.strictEqual(data.totalApplications, 100);
  assert.strictEqual(data.approvedApplications, 80);
  assert.strictEqual(data.rejectedApplications, 10);
  assert.strictEqual(data.activeLoansCount, 60);
  assert.strictEqual(data.overdueLoansCount, 10);
  assert.strictEqual(data.completedLoansCount, 5);
  assert.strictEqual(data.totalDisbursedAmount, 500000.00);
  assert.strictEqual(data.totalOutstandingBalance, 360000.00);
  assert.strictEqual(data.totalCollectedAmount, 200000.00);
  assert.strictEqual(data.totalOverdueAmount, 36000.00);

  // Mathematical formula verifications
  // approvalRate = (80 / 90) * 100 = 88.89%
  assert.strictEqual(data.approvalRate, 88.89);
  // repaymentRate = (200000 / 250000) * 100 = 80.00%
  assert.strictEqual(data.repaymentRate, 80.00);
  // overdueRate = (36000 / 360000) * 100 = 10.00%
  assert.strictEqual(data.overdueRate, 10.00);

  console.log('✅ All 13 KPI metrics and formula aggregations verified:');
  console.log(`   * Total Applications: ${data.totalApplications} (Approved: ${data.approvedApplications}, Rejected: ${data.rejectedApplications})`);
  console.log(`   * Loan Counts: Active: ${data.activeLoansCount}, Overdue: ${data.overdueLoansCount}, Completed: ${data.completedLoansCount}`);
  console.log(`   * Financials: Disbursed: $${data.totalDisbursedAmount}, Outstanding: $${data.totalOutstandingBalance}, Collected: $${data.totalCollectedAmount}, Overdue: $${data.totalOverdueAmount}`);
  console.log(`   * Ratios: Approval Rate: ${data.approvalRate}%, Repayment Rate: ${data.repaymentRate}%, Overdue Rate: ${data.overdueRate}%`);

  // =========================================================================
  // TEST 3: Analytics Trend Endpoints
  // =========================================================================
  console.log('\n--- 3. Analytics Trend Endpoints ---');

  // A. GET /api/dashboard/charts/disbursement-vs-collection
  const trendRes = await request(app, 'GET', '/api/dashboard/charts/disbursement-vs-collection', undefined, {
    Authorization: `Bearer ${managerToken}`
  });
  assert.strictEqual(trendRes.status, 200);
  assert.strictEqual(trendRes.body.success, true);
  assert.strictEqual(trendRes.body.data.length, 6, 'Must return exactly last 6 months');
  const sampleMonth = trendRes.body.data[trendRes.body.data.length - 1];
  assert.ok('month' in sampleMonth);
  assert.ok('disbursed' in sampleMonth);
  assert.ok('collected' in sampleMonth);
  assert.ok('netCashFlow' in sampleMonth);
  console.log(`✅ GET /api/dashboard/charts/disbursement-vs-collection returned 6-month continuous series`);

  // B. GET /api/dashboard/charts/portfolio-by-product
  const productChartRes = await request(app, 'GET', '/api/dashboard/charts/portfolio-by-product', undefined, {
    Authorization: `Bearer ${managerToken}`
  });
  assert.strictEqual(productChartRes.status, 200);
  assert.strictEqual(productChartRes.body.success, true);
  assert.ok(Array.isArray(productChartRes.body.data));
  assert.ok(productChartRes.body.data.length > 0);
  const pSample = productChartRes.body.data[0];
  assert.ok('productName' in pSample);
  assert.ok('activeLoanValue' in pSample);
  assert.ok('percentage' in pSample);
  console.log(`✅ GET /api/dashboard/charts/portfolio-by-product returned product breakdown with percentages`);

  // =========================================================================
  // TEST 4: Reporting Endpoints (JSON + ?export=csv)
  // =========================================================================
  console.log('\n--- 4. Reporting Endpoints & CSV Export ---');

  // A. Applications Report
  const appsJsonRes = await request(app, 'GET', '/api/reports/applications?status=APPROVED', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(appsJsonRes.status, 200);
  assert.strictEqual(appsJsonRes.body.success, true);
  assert.ok(appsJsonRes.body.data.length > 0);
  assert.strictEqual(appsJsonRes.body.data[0].applicationNo, 'APP-2026-0001');
  console.log('✅ GET /api/reports/applications returned filtered records');

  const appsCsvRes = await request(app, 'GET', '/api/reports/applications?export=csv', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(appsCsvRes.status, 200);
  assert.strictEqual(appsCsvRes.headers['content-type'], 'text/csv; charset=utf-8');
  assert.ok(String(appsCsvRes.headers['content-disposition']).includes('attachment; filename='));
  assert.ok(String(appsCsvRes.body).includes('"applicationNo"'));
  console.log('✅ GET /api/reports/applications?export=csv returned valid CSV stream');

  // B. Active Loans Report
  const activeLoansJson = await request(app, 'GET', '/api/reports/active-loans', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(activeLoansJson.status, 200);
  assert.strictEqual(activeLoansJson.body.success, true);
  assert.ok('remainingBalance' in activeLoansJson.body.data[0]);
  assert.ok('nextDueDate' in activeLoansJson.body.data[0]);
  console.log('✅ GET /api/reports/active-loans returned active loan ledger metrics');

  const activeLoansCsv = await request(app, 'GET', '/api/reports/active-loans?export=csv', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(activeLoansCsv.status, 200);
  assert.strictEqual(activeLoansCsv.headers['content-type'], 'text/csv; charset=utf-8');
  assert.ok(String(activeLoansCsv.body).includes('"remainingBalance"'));
  console.log('✅ GET /api/reports/active-loans?export=csv returned valid CSV stream');

  // C. Overdue Loans Report
  const overdueLoansJson = await request(app, 'GET', '/api/reports/overdue-loans', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(overdueLoansJson.status, 200);
  assert.strictEqual(overdueLoansJson.body.success, true);
  assert.ok('borrowerContact' in overdueLoansJson.body.data[0]);
  assert.ok('daysLate' in overdueLoansJson.body.data[0]);
  assert.ok('overdueAmount' in overdueLoansJson.body.data[0]);
  console.log('✅ GET /api/reports/overdue-loans returned delinquent loan details');

  const overdueLoansCsv = await request(app, 'GET', '/api/reports/overdue-loans?export=csv', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(overdueLoansCsv.status, 200);
  assert.strictEqual(overdueLoansCsv.headers['content-type'], 'text/csv; charset=utf-8');
  assert.ok(String(overdueLoansCsv.body).includes('"daysLate"'));
  console.log('✅ GET /api/reports/overdue-loans?export=csv returned valid CSV stream');

  // D. Daily Collections Report (Grouped by date, payment method, and cashier)
  const dailyColJson = await request(app, 'GET', '/api/reports/daily-collections', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(dailyColJson.status, 200);
  assert.strictEqual(dailyColJson.body.success, true);
  assert.ok(Array.isArray(dailyColJson.body.data));
  assert.ok(dailyColJson.body.data.length > 0);
  const colGroup = dailyColJson.body.data[0];
  assert.ok('date' in colGroup, 'Must have date');
  assert.ok('paymentMethod' in colGroup, 'Must have paymentMethod');
  assert.ok('cashierName' in colGroup, 'Must have cashierName');
  assert.ok('totalCollected' in colGroup, 'Must have totalCollected');
  assert.ok('transactionCount' in colGroup, 'Must have transactionCount');
  console.log('✅ GET /api/reports/daily-collections correctly grouped collections by date, method, and cashier');

  const dailyColCsv = await request(app, 'GET', '/api/reports/daily-collections?export=csv', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(dailyColCsv.status, 200);
  assert.strictEqual(dailyColCsv.headers['content-type'], 'text/csv; charset=utf-8');
  assert.ok(String(dailyColCsv.body).includes('"totalCollected"'));
  console.log('✅ GET /api/reports/daily-collections?export=csv returned grouped collections CSV');

  console.log('\n🎉 ALL KPI METRICS, ANALYTICS TRENDS & REPORTING TESTS PASSED CLEANLY!\n');
}

runKpiReportingTests().catch((err) => {
  console.error('❌ KPI and Reporting test failed:', err);
  process.exit(1);
});
