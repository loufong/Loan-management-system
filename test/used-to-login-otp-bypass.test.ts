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
    // Case A: Direct login without OTP (OTP removed per user request)
    console.log('--- TEST 1: Direct login without OTP ---');
    const firstLoginRes: any = await AuthService.login({
      usernameOrEmail: testEmail,
      password: testPassword,
    });

    assert.strictEqual(firstLoginRes.requireOtp, undefined, 'User must NOT require OTP');
    assert.ok(firstLoginRes.accessToken, 'Must return accessToken directly');
    assert.ok(firstLoginRes.user, 'Must return user object');
    assert.strictEqual(firstLoginRes.user.email, testEmail);
    console.log('✅ Direct login verified with accessToken returned immediately.');

    // Case B: Subsequent login -> continues to log in directly
    console.log('\n--- TEST 2: Subsequent login for user ---');
    const secondLoginRes: any = await AuthService.login({
      usernameOrEmail: testEmail,
      password: testPassword,
    });

    assert.strictEqual(secondLoginRes.requireOtp, undefined, 'Subsequent login must NOT require OTP');
    assert.ok(secondLoginRes.accessToken, 'Must return accessToken directly');
    assert.ok(secondLoginRes.user, 'Must return user object');
    assert.strictEqual(secondLoginRes.user.email, testEmail);
    console.log('✅ Subsequent login verified with accessToken returned directly.');

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
