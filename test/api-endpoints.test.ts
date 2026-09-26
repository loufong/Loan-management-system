import assert from 'assert';
import http from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

// Mock DB queries for testing endpoints when DB server is offline
prisma.loanProduct.count = (async () => 5) as any;
prisma.loanProduct.findMany = (async () => [
  {
    id: 'b1234567-89ab-cdef-0123-456789abcdef',
    productName: 'Personal Microloan',
    code: 'PERS-01',
    interestRate: 8.5,
    minAmount: 500,
    maxAmount: 10000,
    minTerm: 3,
    maxTerm: 24,
    repaymentFrequency: 'MONTHLY',
    status: 'ACTIVE'
  }
]) as any;

// Helper to make HTTP requests against express app
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
            if (res.headers['content-type']?.includes('application/json')) {
              try {
                parsedBody = JSON.parse(data);
              } catch (e) {
                // keep string
              }
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

async function runApiEndpointVerification() {
  console.log('\n🚀 Starting Complete LMS REST API Layer Verification Test Suite...\n');
  const app = createApp();

  // 1. Health & Response Envelope Check
  console.log('--- 1. Verification of Standard Response Format ---');
  const healthRes = await request(app, 'GET', '/api/v1/health');
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.body.success, true);
  assert.ok('data' in healthRes.body, 'Response must contain data key');
  assert.ok('meta' in healthRes.body, 'Response must contain meta key');
  console.log('✅ Standard Success Response Envelope verified: { success: true, data: ..., meta: ... }');

  // 2. Error Response Envelope Check (404 and 400 validation)
  const notFoundRes = await request(app, 'GET', '/api/invalid-route-for-testing');
  assert.strictEqual(notFoundRes.status, 404);
  assert.strictEqual(notFoundRes.body.success, false);
  assert.ok(notFoundRes.body.error, 'Response must contain error object');
  assert.strictEqual(notFoundRes.body.error.code, 'NOT_FOUND');
  assert.ok(Array.isArray(notFoundRes.body.error.details), 'Details must be an array');
  console.log('✅ Standard Error Response Envelope verified: { success: false, error: { code, message, details: [] } }');

  // 3. Auth Validation & RBAC Middleware Error Format
  console.log('\n--- 2. Authentication & RBAC Layer (/api/auth) ---');
  const emptyLoginRes = await request(app, 'POST', '/api/auth/login', {});
  assert.strictEqual(emptyLoginRes.status, 400);
  assert.strictEqual(emptyLoginRes.body.success, false);
  assert.strictEqual(emptyLoginRes.body.error.code, 'VALIDATION_ERROR');
  assert.ok(emptyLoginRes.body.error.details.length > 0, 'Validation details populated');
  console.log('✅ POST /api/auth/login validation and error schema verified');

  const unauthMeRes = await request(app, 'GET', '/api/auth/me');
  assert.strictEqual(unauthMeRes.status, 401);
  assert.strictEqual(unauthMeRes.body.error.code, 'UNAUTHORIZED');
  console.log('✅ GET /api/auth/me requireAuth guard verified');

  // 4. Financial Calculation Engine Preview (/api/calculator/preview)
  console.log('\n--- 3. Financial Calculation Engine Preview (/api/calculator) ---');
  // Simple interest preview
  const simpleCalcRes = await request(app, 'POST', '/api/calculator/preview', {
    principal: 10000,
    annualInterestRate: 12.0,
    termMonths: 12,
    frequency: 'MONTHLY',
    method: 'SIMPLE'
  });
  assert.strictEqual(simpleCalcRes.status, 200);
  assert.strictEqual(simpleCalcRes.body.success, true);
  assert.strictEqual(simpleCalcRes.body.data.method, 'SIMPLE');
  assert.strictEqual(simpleCalcRes.body.data.totalInterest, 1200);
  assert.strictEqual(simpleCalcRes.body.data.totalRepayment, 11200);
  assert.strictEqual(simpleCalcRes.body.data.schedules.length, 12);
  // Exact prompt payload test
  const promptPayloadRes = await request(app, 'POST', '/api/calculator/preview', {
    principal: 5000.00,
    annualInterestRate: 12.0,
    termMonths: 12,
    repaymentFrequency: 'MONTHLY',
    startDate: '2026-10-01',
    calculationMethod: 'SIMPLE'
  });
  assert.strictEqual(promptPayloadRes.status, 200);
  assert.strictEqual(promptPayloadRes.body.success, true);
  assert.strictEqual(promptPayloadRes.body.data.totalInterest, 600);
  assert.strictEqual(promptPayloadRes.body.data.totalRepayment, 5600);
  assert.strictEqual(promptPayloadRes.body.data.installmentAmount, 466.67);
  assert.strictEqual(promptPayloadRes.body.data.schedules.length, 12);
  console.log('✅ POST /api/calculator/preview (Exact Prompt Payload: $5,000, 12%, 12 mos) verified: Total Interest = $600, Total Repayment = $5,600, Installment = $466.67');

  console.log('✅ POST /api/calculator/preview (SIMPLE) verified: Total Interest = $1,200, Total Repayment = $11,200');

  // Amortized (reducing balance) preview
  const amortizedCalcRes = await request(app, 'POST', '/api/calculator/preview', {
    principal: 10000,
    annualInterestRate: 12.0,
    termMonths: 12,
    frequency: 'MONTHLY',
    method: 'AMORTIZED'
  });
  assert.strictEqual(amortizedCalcRes.status, 200);
  assert.strictEqual(amortizedCalcRes.body.success, true);
  assert.strictEqual(amortizedCalcRes.body.data.method, 'AMORTIZED');
  assert.strictEqual(amortizedCalcRes.body.data.installmentAmount, 888.49);
  assert.strictEqual(amortizedCalcRes.body.data.totalInterest, 661.86);
  assert.strictEqual(amortizedCalcRes.body.data.totalRepayment, 10661.86);
  assert.strictEqual(amortizedCalcRes.body.data.schedules.length, 12);
  console.log('✅ POST /api/calculator/preview (AMORTIZED) verified: Installment = $888.49, Total Interest = $661.86');

  // 5. Loan Products Public Endpoint (/api/products)
  console.log('\n--- 4. Loan Products Catalog (/api/products) ---');
  const productsRes = await request(app, 'GET', '/api/products');
  assert.strictEqual(productsRes.status, 200);
  assert.strictEqual(productsRes.body.success, true);
  assert.ok(Array.isArray(productsRes.body.data), 'Products data must be an array');
  console.log(`✅ GET /api/products verified: returned ${productsRes.body.data.length} products`);

  // Product calculate route
  const prodCalcRes = await request(app, 'POST', '/api/products/calculate', {
    principal: 5000,
    interestRate: 8.5,
    termMonths: 24,
    frequency: 'MONTHLY'
  });
  assert.strictEqual(prodCalcRes.status, 200);
  assert.strictEqual(prodCalcRes.body.success, true);
  assert.strictEqual(prodCalcRes.body.data.totalRepayment, 5850);
  console.log('✅ POST /api/products/calculate verified: Total Repayment = $5,850');

  // 6. Borrower Management Route Protection & Validation (/api/borrowers)
  console.log('\n--- 5. Borrower Management Protection (/api/borrowers) ---');
  const unauthBorrowerRes = await request(app, 'GET', '/api/borrowers');
  assert.strictEqual(unauthBorrowerRes.status, 401);
  console.log('✅ GET /api/borrowers requireAuth guard verified');

  // 7. Applications Route Protection (/api/applications)
  console.log('\n--- 6. Loan Applications Route Protection (/api/applications) ---');
  const unauthAppsRes = await request(app, 'GET', '/api/applications');
  assert.strictEqual(unauthAppsRes.status, 401);
  console.log('✅ GET /api/applications requireAuth guard verified');

  // 8. Loans & Disbursement Protection (/api/loans)
  console.log('\n--- 7. Loan Disbursement & Ledger Protection (/api/loans) ---');
  const unauthLoansRes = await request(app, 'GET', '/api/loans');
  assert.strictEqual(unauthLoansRes.status, 401);
  console.log('✅ GET /api/loans requireAuth guard verified');

  // 9. Payment Processing Route Protection (/api/payments)
  console.log('\n--- 8. Payment Processing Protection (/api/payments) ---');
  const unauthPaymentsRes = await request(app, 'GET', '/api/payments');
  assert.strictEqual(unauthPaymentsRes.status, 401);
  console.log('✅ GET /api/payments requireAuth guard verified');

  // 10. Overdue Engine Protection (/api/overdue)
  console.log('\n--- 9. Overdue Engine Protection (/api/overdue) ---');
  const unauthOverdueRes = await request(app, 'GET', '/api/overdue/loans');
  assert.strictEqual(unauthOverdueRes.status, 401);
  console.log('✅ GET /api/overdue/loans requireAuth guard verified');

  // 11. Dashboard & Reports Protection (/api/dashboard & /api/reports)
  console.log('\n--- 10. Dashboard & Reporting Protection (/api/dashboard & /api/reports) ---');
  const unauthKpisRes = await request(app, 'GET', '/api/dashboard/kpis');
  assert.strictEqual(unauthKpisRes.status, 401);
  console.log('✅ GET /api/dashboard/kpis requireAuth guard verified');

  const unauthReportRes = await request(app, 'GET', '/api/reports/active-loans');
  assert.strictEqual(unauthReportRes.status, 401);
  console.log('✅ GET /api/reports/active-loans requireAuth guard verified');

  console.log('\n🎉 ALL API ENDPOINT SPECIFICATIONS AND ROUTE ARCHITECTURE VERIFIED SUCCESSFULLY!\n');
}

runApiEndpointVerification().catch((err) => {
  console.error('❌ API Endpoint verification failed:', err);
  process.exit(1);
});
