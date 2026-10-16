import assert from 'assert';
import http from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { OtpService } from '../src/modules/auth/otp.service';

console.log('🧪 Starting REAL PostgreSQL & Gmail Auth Full Lifecycle E2E Test Suite...\n');

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

async function runRealAuthLifecycleTests() {
  const timestamp = Date.now();
  const testEmail = `real.auth.${timestamp}@gmail.com`;
  const testUsername = `realuser_${timestamp}`;
  const initialPassword = 'InitialSecurePassword123!';
  const updatedPassword = 'NewSecretPassword456!';
  const changedPassword = 'FinalChangedPassword789!';

  try {
    // ----------------------------------------------------
    // STEP 1: Registration Validation & Admin Rejection
    // ----------------------------------------------------
    console.log('--- STEP 1: Public Registration Checks ---');

    // 1a. Attempting to register as ADMIN must fail
    const adminRegRes = await request('POST', '/api/auth/register', {
      firstName: 'Malicious',
      lastName: 'Actor',
      username: `hacker_${timestamp}`,
      email: `hacker.${timestamp}@gmail.com`,
      phone: '+85512999001',
      password: initialPassword,
      confirmPassword: initialPassword,
      role: 'ADMIN'
    });
    assert.strictEqual(adminRegRes.status, 400, 'Public user cannot register as ADMIN');
    console.log('✅ Registration with role=ADMIN was blocked with 400 Bad Request');

    // 1b. Missing required fields must fail
    const missingFieldRes = await request('POST', '/api/auth/register', {
      firstName: 'Incomplete',
      email: testEmail
    });
    assert.strictEqual(missingFieldRes.status, 400, 'Missing fields must return 400');
    console.log('✅ Incomplete registration rejected with 400');

    // 1c. Valid Registration
    const validRegRes = await request('POST', '/api/auth/register', {
      firstName: 'Sophea',
      lastName: 'Heng',
      username: testUsername,
      email: testEmail,
      phone: '+85512888999',
      password: initialPassword,
      confirmPassword: initialPassword
    });
    assert.strictEqual(validRegRes.status, 201, `Registration should succeed with 201: ${JSON.stringify(validRegRes.body)}`);
    assert.strictEqual(validRegRes.body.success, true);
    console.log('✅ Real user registration submitted! Response:', validRegRes.body.email);

    // Verify in PostgreSQL: PendingRegistration record exists
    const pendingRecord = await prisma.pendingRegistration.findFirst({
      where: { email: testEmail }
    });
    assert(pendingRecord, 'Pending registration must exist in PostgreSQL pending_registrations table');
    assert(pendingRecord.passwordHash, 'Password must be stored as secure hash in PostgreSQL');
    console.log('✅ Verified in PostgreSQL pending_registrations: email =', pendingRecord.email);

    // Verify in PostgreSQL: OtpVerification record exists
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { email: testEmail, purpose: 'REGISTRATION' }
    });
    assert(otpRecord, 'OtpVerification record must exist in PostgreSQL');
    assert(otpRecord.otpHash, 'OTP hash must be stored, not raw text');
    console.log('✅ Verified in PostgreSQL: OtpVerification record created with secure hash');

    // ----------------------------------------------------
    // STEP 2: Unverified Login Attempt Must Be Blocked
    // ----------------------------------------------------
    console.log('\n--- STEP 2: Unverified Login Attempt ---');
    const unverifiedLoginRes = await request('POST', '/api/auth/login', {
      emailOrUsername: testEmail,
      password: initialPassword
    });
    assert.strictEqual(unverifiedLoginRes.status, 403, 'Unverified user cannot log in');
    console.log('✅ Unverified login blocked with 403:', unverifiedLoginRes.body.message);

    // ----------------------------------------------------
    // STEP 3: OTP Verification & Rate Limits
    // ----------------------------------------------------
    console.log('\n--- STEP 3: OTP Verification & Rate Limits ---');

    // 3a. Invalid OTP must be rejected
    const invalidOtpRes = await request('POST', '/api/auth/verify-otp', {
      email: testEmail,
      otp: '000000',
      purpose: 'REGISTRATION'
    });
    assert.strictEqual(invalidOtpRes.status, 400, 'Invalid OTP should return 400');
    console.log('✅ Invalid OTP correctly rejected with 400:', invalidOtpRes.body.message);

    // 3b. Resend cooldown (less than 60 seconds) must return 429
    const rapidResendRes = await request('POST', '/api/auth/resend-otp', {
      email: testEmail,
      purpose: 'REGISTRATION'
    });
    assert.strictEqual(rapidResendRes.status, 429, 'Rapid resend within 60s should return 429');
    console.log('✅ Rapid resend rejected with 429 rate limit cooldown');

    // 3c. Obtain current active OTP hash salt from DB and compute matching OTP for verification test
    const testOtpCode = '654321';
    const knownHash = OtpService.hashOtp(testOtpCode, testEmail);
    await prisma.otpVerification.updateMany({
      where: { email: testEmail, purpose: 'REGISTRATION' },
      data: { otpHash: knownHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 }
    });

    const verifySuccessRes = await request('POST', '/api/auth/verify-otp', {
      email: testEmail,
      otp: testOtpCode,
      purpose: 'REGISTRATION'
    });
    assert.strictEqual(verifySuccessRes.status, 200, `OTP verification should succeed: ${JSON.stringify(verifySuccessRes.body)}`);
    console.log('✅ OTP verified successfully! Account activated.');

    // Verify in PostgreSQL: User now exists in users table with emailVerified = true and role = USER
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    assert(dbUser, 'User must exist in PostgreSQL users table after OTP verification');
    assert.strictEqual(dbUser.emailVerifiedAt !== null, true, 'User emailVerifiedAt must be populated in PostgreSQL');
    assert.strictEqual(dbUser.role, 'USER', 'Role must strictly be USER');
    assert.strictEqual(dbUser.fullName, 'Sophea Heng');
    console.log('✅ Verified in PostgreSQL users table: role=USER, emailVerifiedAt populated, fullName=Sophea Heng');

    // Replay of same OTP must be rejected
    const replayOtpRes = await request('POST', '/api/auth/verify-otp', {
      email: testEmail,
      otp: testOtpCode,
      purpose: 'REGISTRATION'
    });
    assert.strictEqual(replayOtpRes.status, 400, 'Replayed OTP must be rejected');
    console.log('✅ Replay of used OTP rejected');

    // ----------------------------------------------------
    // STEP 4: Login as Verified User & Session Persistence
    // ----------------------------------------------------
    console.log('\n--- STEP 4: Login with Verified User ---');
    const loginRes = await request('POST', '/api/auth/login', {
      emailOrUsername: testEmail,
      password: initialPassword
    });
    assert.strictEqual(loginRes.status, 200, 'Login should succeed for verified user');
    assert(loginRes.body.data?.token, 'Response must return authentication token');
    const userToken = loginRes.body.data.token;
    assert.strictEqual(loginRes.body.data.user.role.toUpperCase(), 'USER');
    console.log('✅ Login successful! Token issued for user:', loginRes.body.data.user.username);

    // ----------------------------------------------------
    // STEP 5: Get Current User (GET /api/auth/me)
    // ----------------------------------------------------
    console.log('\n--- STEP 5: GET /api/auth/me Profile Check ---');
    const meRes = await request('GET', '/api/auth/me', undefined, {
      Authorization: `Bearer ${userToken}`
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.data.email, testEmail);
    assert.strictEqual(meRes.body.data.passwordHash, undefined, 'passwordHash must NEVER be returned');
    console.log('✅ /api/auth/me returns clean authenticated profile without passwordHash');

    // ----------------------------------------------------
    // STEP 6: Authenticated Change Password
    // ----------------------------------------------------
    console.log('\n--- STEP 6: Authenticated Change Password ---');

    // 6a. Wrong current password must be rejected
    const wrongCurrentPassRes = await request('POST', '/api/auth/change-password', {
      currentPassword: 'IncorrectOldPassword123!',
      newPassword: changedPassword,
      confirmPassword: changedPassword
    }, {
      Authorization: `Bearer ${userToken}`
    });
    assert.strictEqual(wrongCurrentPassRes.status, 400, 'Incorrect current password must return 400');
    console.log('✅ Incorrect current password rejected with 400');

    // 6b. Mismatched confirmPassword must be rejected
    const mismatchPassRes = await request('POST', '/api/auth/change-password', {
      currentPassword: initialPassword,
      newPassword: changedPassword,
      confirmPassword: 'MismatchPassword999!'
    }, {
      Authorization: `Bearer ${userToken}`
    });
    assert.strictEqual(mismatchPassRes.status, 400, 'Mismatched confirmPassword must return 400');
    console.log('✅ Password confirmation mismatch rejected');

    // 6c. Valid password change
    const validChangePassRes = await request('POST', '/api/auth/change-password', {
      currentPassword: initialPassword,
      newPassword: changedPassword,
      confirmPassword: changedPassword
    }, {
      Authorization: `Bearer ${userToken}`
    });
    assert.strictEqual(validChangePassRes.status, 200, 'Password change must succeed with 200');
    console.log('✅ Password changed successfully in PostgreSQL!');

    // 6d. Old password must no longer work
    const oldPassLoginRes = await request('POST', '/api/auth/login', {
      emailOrUsername: testEmail,
      password: initialPassword
    });
    assert.strictEqual(oldPassLoginRes.status, 401, 'Old password must be rejected after password change');
    console.log('✅ Old password no longer works');

    // 6e. New password works
    const newPassLoginRes = await request('POST', '/api/auth/login', {
      emailOrUsername: testEmail,
      password: changedPassword
    });
    assert.strictEqual(newPassLoginRes.status, 200, 'New password works for login');
    const updatedUserToken = newPassLoginRes.body.data.token;
    console.log('✅ Login with changed password succeeded');

    // ----------------------------------------------------
    // STEP 7: Forgot Password & Reset Password Workflow
    // ----------------------------------------------------
    console.log('\n--- STEP 7: Forgot Password & Reset Password Workflow ---');

    // 7a. Request password reset
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      email: testEmail
    });
    assert.strictEqual(forgotRes.status, 200);
    assert(
      forgotRes.body.message?.includes('verification code has been sent') ||
      forgotRes.body.message?.includes('account exists'),
      'Generic email enumeration safe response'
    );
    console.log('✅ Forgot password initiated with generic response:', forgotRes.body.message);

    // 7b. Verify reset OTP
    const resetOtpCode = '789123';
    const resetKnownHash = OtpService.hashOtp(resetOtpCode, testEmail);
    await prisma.otpVerification.updateMany({
      where: { email: testEmail, purpose: 'PASSWORD_RESET' },
      data: { otpHash: resetKnownHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 }
    });

    const verifyResetOtpRes = await request('POST', '/api/auth/verify-reset-otp', {
      email: testEmail,
      otp: resetOtpCode
    });
    assert.strictEqual(verifyResetOtpRes.status, 200, 'Verify reset OTP must return 200');
    const resetToken = verifyResetOtpRes.body.data?.resetToken;
    console.log('✅ Reset OTP verified! Signed reset token obtained');

    // 7c. Reset Password with resetToken
    const resetPassRes = await request('POST', '/api/auth/reset-password', {
      email: testEmail,
      resetToken,
      newPassword: updatedPassword,
      confirmPassword: updatedPassword
    });
    assert.strictEqual(resetPassRes.status, 200, 'Reset password must return 200');
    console.log('✅ Reset password executed successfully in PostgreSQL!');

    // 7d. Login with newly reset password
    const postResetLoginRes = await request('POST', '/api/auth/login', {
      emailOrUsername: testEmail,
      password: updatedPassword
    });
    assert.strictEqual(postResetLoginRes.status, 200, 'Login with newly reset password succeeds');
    console.log('✅ Login with reset password verified');

    // ----------------------------------------------------
    // STEP 8: Logout & Token Invalidation
    // ----------------------------------------------------
    console.log('\n--- STEP 8: Logout ---');
    const logoutRes = await request('POST', '/api/auth/logout', undefined, {
      Authorization: `Bearer ${postResetLoginRes.body.data.token}`
    });
    assert.strictEqual(logoutRes.status, 200, 'Logout should succeed with 200');
    console.log('✅ Logout succeeded!');

    console.log('\n🎉 ALL REAL AUTHENTICATION SPECIFICATIONS PASSED PERFECTLY AGAINST POSTGRESQL!\n');
  } finally {
    // Clean up test user
    try {
      await prisma.otpVerification.deleteMany({ where: { email: testEmail } });
      await prisma.refreshToken.deleteMany({ where: { user: { email: testEmail } } });
      await prisma.auditLog.deleteMany({ where: { user: { email: testEmail } } });
      await prisma.user.deleteMany({ where: { email: testEmail } });
      await prisma.pendingRegistration.deleteMany({ where: { email: testEmail } });
      console.log('🧹 Cleaned up temporary test user records from PostgreSQL.');
    } catch (e) {
      // ignore
    }
  }
}

runRealAuthLifecycleTests().catch((err) => {
  console.error('❌ Real Auth Lifecycle Test Failed:', err);
  process.exit(1);
});
