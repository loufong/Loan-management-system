import assert from 'assert';
import { prisma } from '../src/config/prisma';
import { ensureDatabaseConnected } from '../src/config/db-keeper';
import { AuthService } from '../src/modules/auth/auth.service';
import { OtpService } from '../src/modules/auth/otp.service';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function testUsedToLoginOtpBypass() {
  console.log('🧪 Starting "Used to Login Already Bypasses OTP" Test Suite...\n');
  await ensureDatabaseConnected();

  const testEmail = `firsttime.${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  // 1. Create a user with lastLogin = null (has NEVER logged in before)
  const newUser = await prisma.user.create({
    data: {
      username: `firsttime_${Date.now()}`,
      email: testEmail,
      passwordHash,
      fullName: 'First Time Borrower',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      lastLogin: null, // Never logged in before
    },
  });

  try {
    // Case A: First-time login -> MUST require OTP
    console.log('--- TEST 1: First-time login for user with lastLogin: null ---');
    const firstLoginRes: any = await AuthService.login({
      usernameOrEmail: testEmail,
      password: testPassword,
    });

    assert.strictEqual(firstLoginRes.requireOtp, true, 'First-time user must require OTP');
    assert.strictEqual(firstLoginRes.email, testEmail);
    assert.strictEqual(firstLoginRes.purpose, 'login_verification');
    console.log('✅ First-time login correctly prompted for OTP (requireOtp: true)');

    // Case B: Verify Login OTP
    console.log('\n--- TEST 2: Complete OTP Verification for First-Time User ---');
    const testOtpCode = '888999';
    const otpHash = OtpService.hashOtp(testOtpCode, testEmail);

    await prisma.otpVerification.updateMany({
      where: { email: testEmail, purpose: 'LOGIN' },
      data: { otpHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 },
    });

    const verifyRes: any = await AuthService.verifyOtp({
      email: testEmail,
      code: testOtpCode,
      purpose: 'LOGIN',
    });

    assert.strictEqual(verifyRes.success, true);
    assert.ok(verifyRes.token, 'Must return token upon OTP verification');
    console.log('✅ Login OTP verified successfully! User has now completed their first login.');

    // Case C: Check PostgreSQL -> lastLogin is now set
    const userInDb = await prisma.user.findUnique({ where: { id: newUser.id } });
    assert.ok(userInDb?.lastLogin, 'user.lastLogin must now be populated in database');
    console.log('✅ Verified in database: user.lastLogin =', userInDb.lastLogin);

    // Case D: Second login -> Used to login already -> DO NOT require OTP anymore!
    console.log('\n--- TEST 3: Subsequent login for user that used to login already ---');
    const secondLoginRes: any = await AuthService.login({
      usernameOrEmail: testEmail,
      password: testPassword,
    });

    assert.strictEqual(secondLoginRes.requireOtp, undefined, 'User that used to login already must NOT require OTP');
    assert.ok(secondLoginRes.accessToken, 'Must return accessToken directly');
    assert.ok(secondLoginRes.user, 'Must return user object');
    assert.strictEqual(secondLoginRes.user.email, testEmail);
    console.log('✅ Subsequent login bypassed OTP successfully! Logged in directly with password.');

  } finally {
    // Cleanup
    await prisma.otpVerification.deleteMany({ where: { email: testEmail } });
    await prisma.refreshToken.deleteMany({ where: { userId: newUser.id } });
    await prisma.borrower.deleteMany({ where: { userId: newUser.id } });
    await prisma.user.deleteMany({ where: { id: newUser.id } });
  }

  console.log('\n🎉 ALL "USED TO LOGIN ALREADY BYPASSES OTP" TESTS PASSED 100%!');
}

testUsedToLoginOtpBypass()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
