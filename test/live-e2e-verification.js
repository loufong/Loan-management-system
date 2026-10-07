const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Full End-to-End Live Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Health check
  console.log('1. Health Check:');
  const health = await request('GET', '/api/v1/health');
  assert(health.statusCode === 200, `Health check returned 200 (Got ${health.statusCode})`);

  // 2. Loan products endpoint (Prisma DB query test)
  console.log('\n2. Loan Products Query:');
  const products = await request('GET', '/api/v1/loan-products');
  assert(products.statusCode === 200, `GET /api/v1/loan-products returned 200 (Got ${products.statusCode})`);
  assert(products.body?.data?.length > 0 || Array.isArray(products.body?.data), `Returned products list from database`);

  // 3. User Dashboard SPA routes (Previously returned 404)
  console.log('\n3. SPA Routes (Checking 404 fix):');
  const userDash = await request('GET', '/user/dashboard');
  assert(userDash.statusCode === 200 && typeof userDash.body === 'string' && userDash.body.includes('<!DOCTYPE html>'), `GET /user/dashboard returns 200 SPA HTML`);

  const userLoans = await request('GET', '/user/my_loans');
  assert(userLoans.statusCode === 200 && typeof userLoans.body === 'string' && userLoans.body.includes('<!DOCTYPE html>'), `GET /user/my_loans returns 200 SPA HTML`);

  const loginRoute = await request('GET', '/login');
  assert(loginRoute.statusCode === 200 && typeof loginRoute.body === 'string' && loginRoute.body.includes('<!DOCTYPE html>'), `GET /login returns 200 SPA HTML`);

  // 4. Admin route guard on frontend paths
  console.log('\n4. Admin Path Route Guard:');
  const adminGuard = await request('GET', '/admin');
  assert(adminGuard.statusCode === 302 || adminGuard.statusCode === 403, `GET /admin without auth redirects or denies (Got ${adminGuard.statusCode})`);

  // 5. Auth: Invalid Login
  console.log('\n5. Invalid Credentials:');
  const badLogin = await request('POST', '/api/v1/auth/login', {
    usernameOrEmail: 'admin@loansystem.edu',
    password: 'WrongPassword123!',
  });
  assert(badLogin.statusCode === 401, `Invalid login returned 401 (Got ${badLogin.statusCode})`);
  assert(badLogin.body?.message === 'Invalid email/username or password.', `Returns clear error message`);

  // 6. Auth: Admin Login
  console.log('\n6. Admin Login:');
  const adminLogin = await request('POST', '/api/v1/auth/login', {
    usernameOrEmail: 'admin@loansystem.edu',
    password: 'Password123!',
  });
  assert(adminLogin.statusCode === 200, `Admin login returned 200`);
  assert(adminLogin.body?.data?.user?.role === 'admin', `Admin role normalized to 'admin'`);
  const adminToken = adminLogin.body?.data?.token || adminLogin.body?.data?.accessToken;
  assert(!!adminToken, `Admin token received`);

  // 7. Auth: Normal User Login
  console.log('\n7. Normal User Login:');
  const userLogin = await request('POST', '/api/v1/auth/login', {
    usernameOrEmail: 'johnathan.doe@student.edu',
    password: 'Password123!',
  });
  assert(userLogin.statusCode === 200, `Normal user login returned 200`);
  const userRole = userLogin.body?.user?.role || userLogin.body?.data?.user?.role;
  assert(userRole === 'user', `Normal user role is 'user' (Got ${userRole})`);
  const userToken = userLogin.body?.token || userLogin.body?.accessToken || userLogin.body?.data?.token;
  assert(!!userToken, `User token received`);

  // 8. Public Registration: Role=ADMIN injection attempt
  console.log('\n8. Admin Role Injection Prevention:');
  const adminInjection = await request('POST', '/api/v1/auth/register', {
    fullName: 'Hacker User',
    username: 'hacker_01',
    email: 'hacker@malicious.com',
    phone: '+1-555-9999',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'ADMIN',
  });
  assert(adminInjection.statusCode === 400, `Admin registration attempt rejected with 400 (Got ${adminInjection.statusCode})`);

  // 9. Public Registration: Invalid Username
  console.log('\n9. Registration Validation:');
  const invalidUser = await request('POST', '/api/v1/auth/register', {
    fullName: 'Invalid User',
    username: 'user with spaces!',
    email: 'test@example.com',
    phone: '+1-555-1234',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  assert(invalidUser.statusCode === 400, `Invalid username format rejected with 400`);

  // 10. Role Protection: Normal User calling Admin API
  console.log('\n10. Role Protection (Admin APIs):');
  const adminUsersCallByUser = await request('GET', '/api/v1/users', null, userToken);
  assert(adminUsersCallByUser.statusCode === 403, `Normal user calling /api/v1/users returned 403 Forbidden (Got ${adminUsersCallByUser.statusCode})`);

  const adminUsersCallByAdmin = await request('GET', '/api/v1/users', null, adminToken);
  assert(adminUsersCallByAdmin.statusCode === 200, `Admin calling /api/v1/users returned 200 OK`);

  // 11. Unauthenticated Requests (Checking 401s)
  console.log('\n11. Unauthenticated Protection:');
  const unauthBorrowers = await request('GET', '/api/v1/borrowers');
  assert(unauthBorrowers.statusCode === 401, `GET /api/v1/borrowers without token returns 401 (Got ${unauthBorrowers.statusCode})`);

  const unauthLoans = await request('GET', '/api/v1/loans');
  assert(unauthLoans.statusCode === 401, `GET /api/v1/loans without token returns 401 (Got ${unauthLoans.statusCode})`);

  // 12. Authenticated Data Scoping
  console.log('\n12. Data Scoping & Privacy:');
  const userLoansData = await request('GET', '/api/v1/loans', null, userToken);
  assert(userLoansData.statusCode === 200, `User can query their own loans (200 OK)`);

  console.log(`\n========================================`);
  console.log(`Final Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
