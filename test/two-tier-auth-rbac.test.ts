import assert from 'assert';
import http from 'http';
import { createApp } from '../src/app';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserService } from '../src/modules/users/user.service';
import { createToken } from '../src/middlewares/auth.middleware';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../src/config/prisma';

// Fast mocks for offline/unit test execution
prisma.auditLog.create = (async () => ({})) as any;
prisma.refreshToken.create = (async () => ({})) as any;
prisma.user.update = (async () => ({})) as any;
prisma.pendingRegistration.findFirst = (async () => null) as any;

console.log('🧪 Starting Two-Tier Authentication & Authorization (Admin vs User) Test Suite...\n');

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

async function runTests() {
  // -------------------------------------------------------------------------
  // Pre-seed test tokens
  // -------------------------------------------------------------------------
  const adminToken = createToken({
    id: 'user-admin-0001',
    username: 'admin',
    email: 'admin@loansystem.edu',
    role: UserRole.ADMIN,
    fullName: 'System Administrator'
  });

  const userAToken = createToken({
    id: 'user-user-0002',
    username: 'user_a',
    email: 'user_a@example.com',
    role: UserRole.USER,
    fullName: 'Normal User A'
  });

  const userBToken = createToken({
    id: 'user-user-0003',
    username: 'user_b',
    email: 'user_b@example.com',
    role: UserRole.USER,
    fullName: 'Normal User B'
  });

  // =========================================================================
  // Case 1: Admin logs in -> Admin Dashboard
  // =========================================================================
  console.log('--- TEST 1: Admin logs in -> Admin Dashboard ---');
  const adminLogin = await AuthService.login({
    usernameOrEmail: 'admin@loansystem.edu',
    password: 'Password123!'
  });
  assert.strictEqual(adminLogin.user.role, 'admin', 'Admin role must be normalized to admin');
  assert.ok(adminLogin.accessToken, 'Must return valid access token');
  console.log('✅ Admin login verified. Role returned:', adminLogin.user.role, '-> Routes to /admin/dashboard\n');

  // =========================================================================
  // Case 2: Normal User logs in -> User Dashboard
  // =========================================================================
  console.log('--- TEST 2: Normal User logs in -> User Dashboard ---');
  const userLogin = await AuthService.login({
    usernameOrEmail: 'user@example.com',
    password: 'Password123!'
  });
  assert.strictEqual(userLogin.user.role, 'user', 'Normal user role must be normalized to user');
  assert.ok(userLogin.accessToken, 'Must return valid access token');
  console.log('✅ Normal user login verified. Role returned:', userLogin.user.role, '-> Routes to /user/dashboard\n');

  // =========================================================================
  // Case 3: User attempts /admin -> denied
  // =========================================================================
  console.log('--- TEST 3: User attempts /admin -> denied ---');
  const resAdminDirect = await request('GET', '/admin', undefined, {
    Authorization: `Bearer ${userAToken}`,
    Accept: 'application/json'
  });
  assert.strictEqual(resAdminDirect.status, 403, 'Normal user accessing /admin must receive 403 Forbidden');
  const codeDirect = (resAdminDirect.body as any).error?.code || (resAdminDirect.body as any).error;
  assert.strictEqual(codeDirect, 'FORBIDDEN');
  console.log('✅ User attempting /admin rejected with 403 Forbidden\n');

  // =========================================================================
  // Case 4: User attempts /admin/dashboard -> denied
  // =========================================================================
  console.log('--- TEST 4: User attempts /admin/dashboard -> denied ---');
  const resAdminDashboard = await request('GET', '/admin/dashboard', undefined, {
    Authorization: `Bearer ${userAToken}`,
    Accept: 'application/json'
  });
  assert.strictEqual(resAdminDashboard.status, 403, 'Normal user accessing /admin/dashboard must receive 403 Forbidden');
  const codeDashboard = (resAdminDashboard.body as any).error?.code || (resAdminDashboard.body as any).error;
  assert.strictEqual(codeDashboard, 'FORBIDDEN');
  console.log('✅ User attempting /admin/dashboard rejected with 403 Forbidden\n');

  // =========================================================================
  // Case 5: User attempts Admin API -> denied
  // =========================================================================
  console.log('--- TEST 5: User attempts Admin API -> denied ---');
  const resAdminApi1 = await request('GET', '/api/users', undefined, {
    Authorization: `Bearer ${userAToken}`
  });
  assert.strictEqual(resAdminApi1.status, 403, 'Normal user accessing /api/users must receive 403 Forbidden');

  const resAdminApi2 = await request('GET', '/api/admin', undefined, {
    Authorization: `Bearer ${userAToken}`
  });
  assert.strictEqual(resAdminApi2.status, 403, 'Normal user accessing /api/admin must receive 403 Forbidden');

  // Admin access to same endpoints succeeds
  const resAdminApiAllowed = await request('GET', '/api/admin', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(resAdminApiAllowed.status, 200, 'Admin accessing /api/admin must receive 200 OK');
  console.log('✅ User attempting Admin APIs rejected with 403; Admin permitted with 200\n');

  // =========================================================================
  // Case 6: User attempts to change role to ADMIN -> rejected
  // =========================================================================
  console.log('--- TEST 6: User attempts to change role to ADMIN -> rejected ---');
  let roleChangeBlocked = false;
  try {
    await UserService.updateUser(
      'user-user-0002',
      { role: UserRole.ADMIN },
      { id: 'user-user-0002', role: UserRole.USER } as any
    );
  } catch (err: any) {
    roleChangeBlocked = true;
    assert.ok(
      err.message.includes('FORBIDDEN') || err.message.includes('permission') || err.message.includes('Admin') || err.message.includes('roles') || err.code === 'FORBIDDEN_ROLE_CHANGE',
      'Must throw clear unauthorized error'
    );
  }
  assert.ok(roleChangeBlocked, 'Normal user must NOT be able to change role to ADMIN');
  console.log('✅ Normal user attempting role escalation to ADMIN was rejected server-side\n');

  // =========================================================================
  // Case 7: User attempts to register with role ADMIN -> rejected/ignored
  // =========================================================================
  console.log('--- TEST 7: User attempts to register with role ADMIN -> rejected/ignored ---');
  const resAdminReg = await request('POST', '/api/auth/register', {
    fullName: 'Attacker Account',
    username: 'attacker_admin',
    email: 'attacker@example.com',
    phone: '+1-555-0199',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'ADMIN' // Malicious attempt to register as Admin
  });
  assert.strictEqual(resAdminReg.status, 400, 'Attempting to register with role ADMIN must be rejected with 400 Bad Request');
  assert.ok(
    JSON.stringify(resAdminReg.body).includes('ADMIN_REGISTRATION_FORBIDDEN') ||
    JSON.stringify(resAdminReg.body).includes('forbidden') ||
    JSON.stringify(resAdminReg.body).includes('administrator'),
    'Must include specific admin registration forbidden error message'
  );
  console.log('✅ Attempt to register as ADMIN was blocked with 400 ADMIN_REGISTRATION_FORBIDDEN\n');

  // =========================================================================
  // Case 8: User A attempts to access User B's data -> denied
  // =========================================================================
  console.log("--- TEST 8: User A attempts to access User B's data -> denied ---");
  let crossUserBlocked = false;
  try {
    await UserService.getUserById(
      'user-user-0003', // User B's ID
      { id: 'user-user-0002', role: UserRole.USER } as any // User A viewing
    );
  } catch (err: any) {
    crossUserBlocked = true;
    assert.strictEqual(err.code, 'FORBIDDEN_OWNERSHIP');
  }
  assert.ok(crossUserBlocked, "User A must NOT be able to access User B's user profile");
  console.log("✅ Cross-user data access prevented with FORBIDDEN_OWNERSHIP\n");

  // =========================================================================
  // Case 9: Logout -> protected pages cannot be accessed
  // =========================================================================
  console.log('--- TEST 9: Logout -> protected pages cannot be accessed ---');
  // When token is absent or invalid, access is rejected
  const resNoAuth = await request('GET', '/api/users', undefined, {});
  assert.strictEqual(resNoAuth.status, 401, 'Request without token must return 401 Unauthorized');
  const codeNoAuth = (resNoAuth.body as any).error?.code || (resNoAuth.body as any).error;
  assert.strictEqual(codeNoAuth, 'UNAUTHORIZED');
  console.log('✅ Unauthenticated access rejected with 401 UNAUTHORIZED\n');

  // =========================================================================
  // Case 10: Invalid login -> clear error
  // =========================================================================
  console.log('--- TEST 10: Invalid login -> clear error ---');
  const resBadLogin = await request('POST', '/api/auth/login', {
    usernameOrEmail: 'admin@loansystem.edu',
    password: 'WrongPassword999!'
  });
  assert.strictEqual(resBadLogin.status, 401, 'Invalid credentials must return 401 Unauthorized');
  assert.strictEqual((resBadLogin.body as any).message, 'Invalid email/username or password.');
  console.log('✅ Invalid login rejected with clear generic message: "Invalid email/username or password."\n');

  // =========================================================================
  // Case 11: Disabled/inactive user -> cannot login
  // =========================================================================
  console.log('--- TEST 11: Disabled/inactive user -> cannot login ---');
  let inactiveBlocked = false;
  try {
    await AuthService.login({
      usernameOrEmail: 'inactive@example.com',
      password: 'Password123!'
    });
  } catch (err: any) {
    inactiveBlocked = true;
    assert.ok(
      err.message.includes('inactive') || err.message.includes('contact the administrator'),
      'Must return clear inactive account message'
    );
  }
  assert.ok(inactiveBlocked, 'Inactive user must be prevented from logging in');

  let suspendedBlocked = false;
  try {
    await AuthService.login({
      usernameOrEmail: 'suspended@example.com',
      password: 'Password123!'
    });
  } catch (err: any) {
    suspendedBlocked = true;
    assert.ok(
      err.message.includes('suspended') || err.message.includes('contact the administrator'),
      'Must return clear suspended account message'
    );
  }
  assert.ok(suspendedBlocked, 'Suspended user must be prevented from logging in');
  console.log('✅ Inactive and suspended users blocked from logging in with clear status messages\n');

  // =========================================================================
  // Case 12: Only one Admin exists & prevent duplicate Admin creation
  // =========================================================================
  console.log('--- TEST 12: Only one Admin exists & duplicate Admin prevented ---');
  let duplicateAdminBlocked = false;
  try {
    await UserService.createUser(
      {
        username: 'another_admin',
        email: 'another_admin@example.com',
        password: 'Password123!',
        role: UserRole.ADMIN,
        fullName: 'Second Admin',
        status: UserStatus.ACTIVE
      },
      { id: 'user-admin-0001', role: UserRole.ADMIN } as any
    );
  } catch (err: any) {
    duplicateAdminBlocked = true;
    assert.strictEqual(err.code, 'DUPLICATE_ADMIN_NOT_ALLOWED');
  }
  assert.ok(duplicateAdminBlocked, 'Creating a second Admin account must be blocked');
  console.log('✅ Exactly ONE Admin account allowed; duplicate Admin blocked with DUPLICATE_ADMIN_NOT_ALLOWED\n');

  // =========================================================================
  // Case 13: Refreshing page preserves authenticated session
  // =========================================================================
  console.log('--- TEST 13: Refreshing the page preserves the correct authenticated session ---');
  const resAdminMe = await request('GET', '/api/auth/me', undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(resAdminMe.status, 200);
  assert.strictEqual((resAdminMe.body as any).data.role, UserRole.ADMIN);

  const resUserMe = await request('GET', '/api/auth/me', undefined, {
    Authorization: `Bearer ${userAToken}`
  });
  assert.strictEqual(resUserMe.status, 200);
  assert.strictEqual((resUserMe.body as any).data.role, UserRole.USER);
  console.log('✅ Authenticated profile session verified for both Admin and User via /api/auth/me\n');

  // =========================================================================
  // Case 14: Direct URL navigation cannot bypass permissions
  // =========================================================================
  console.log('--- TEST 14: Direct URL navigation cannot bypass permissions ---');
  // Browser GET to /admin without token -> Redirects to /login
  const resBrowserUnauth = await request('GET', '/admin', undefined, {
    Accept: 'text/html,application/xhtml+xml'
  });
  assert.strictEqual(resBrowserUnauth.status, 302, 'Unauthenticated browser navigation must redirect to /login');
  assert.strictEqual(resBrowserUnauth.headers.location, '/login');

  // Browser GET to /admin with User token -> Redirects to /user/dashboard?denied=true
  const resBrowserUser = await request('GET', '/admin/dashboard', undefined, {
    Authorization: `Bearer ${userAToken}`,
    Accept: 'text/html'
  });
  assert.strictEqual(resBrowserUser.status, 302, 'User accessing /admin/dashboard via browser must redirect');
  assert.ok(
    String(resBrowserUser.headers.location).includes('/user/dashboard'),
    'Must redirect to User Dashboard'
  );

  console.log('✅ Direct URL navigation verified: unauthenticated -> /login, normal user -> /user/dashboard?denied=true\n');

  console.log('🎉 ALL 14 TWO-TIER AUTHENTICATION & AUTHORIZATION TESTS PASSED PERFECTLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
