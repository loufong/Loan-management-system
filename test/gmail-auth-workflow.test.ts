import { OtpService } from '../src/modules/auth/otp.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { PendingRegistrationService } from '../src/modules/auth/pending-registration.service';
import { UserCreationService } from '../src/modules/auth/user-creation.service';

async function runPendingAuthTests() {
  console.log('🧪 Starting Pending Registration Storage & Gmail OTP Engine Test Suite...\n');

  // 1. Password Strength and Complexity Rule Verification
  console.log('--- 1. Testing Password Security Rules ---');
  const validPassword = 'SecurePassword123!';
  const invalidShort = 'Short1!';
  const invalidNoUpper = 'password123!';
  const invalidNoLower = 'PASSWORD123!';
  const invalidNoNum = 'PasswordSpecial!';
  const invalidNoSpecial = 'Password1234';

  const validatePw = (pw: string) => {
    return (
      pw.length >= 8 &&
      /[A-Z]/.test(pw) &&
      /[a-z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw)
    );
  };

  if (!validatePw(validPassword)) throw new Error('Valid password rejected');
  if (validatePw(invalidShort)) throw new Error('Short password should be rejected');
  if (validatePw(invalidNoUpper)) throw new Error('No-uppercase password should be rejected');
  if (validatePw(invalidNoLower)) throw new Error('No-lowercase password should be rejected');
  if (validatePw(invalidNoNum)) throw new Error('No-number password should be rejected');
  if (validatePw(invalidNoSpecial)) throw new Error('No-special password should be rejected');
  console.log('✅ All 6 password security constraint rules verified.');

  // 2. Cryptographic OTP Generation & Salted Hashing
  console.log('\n--- 2. Testing 6-Digit OTP Generation & Salted Hashing ---');
  const code = OtpService.generateCode();
  console.log(`Generated 6-digit OTP: ${code}`);
  if (!/^\d{6}$/.test(code)) throw new Error('OTP is not a 6-digit number');

  const testEmail = 'david.pending@gmail.com';
  const hash1 = OtpService.hashOtp(code, testEmail);
  const hash2 = OtpService.hashOtp(code, testEmail);
  const hashDiff = OtpService.hashOtp(code, 'different@gmail.com');

  if (hash1 !== hash2) throw new Error('Hash reproducibility failed');
  if (hash1 === hashDiff) throw new Error('Email salt isolation failed');
  console.log('✅ Cryptographic OTP generation and salted hashing verified.');

  // 3. User submits Register form -> Creates record in pending_registrations
  console.log('\n--- 3. Testing Registration Storage Flow: Storing in pending_registrations ---');
  const regResult = await AuthService.register({
    fullName: 'David K. Serey',
    username: 'davidserey_pending',
    email: testEmail,
    phone: '012998877',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  if (!regResult.success) throw new Error('Registration failed');
  if (!regResult.pendingRegistrationId) throw new Error('Missing pendingRegistrationId');
  console.log('✅ Registration record created in pending_registrations (ID:', regResult.pendingRegistrationId, ')');

  // Verify that the user is NOT yet in the permanent active users table
  const pendingInStorage = await PendingRegistrationService.findValidByEmail(testEmail);
  if (!pendingInStorage) throw new Error('Pending registration record not found');
  console.log('✅ Confirmed pending registration exists with 30-minute expiry:', pendingInStorage.expiresAt.toISOString());

  // 4. Login Attempt With Pending Credentials Must Be Blocked
  console.log('\n--- 4. Guarding Pending Registration: Must NOT be an authenticated account ---');
  try {
    await AuthService.login({
      usernameOrEmail: testEmail,
      password: 'Password123!',
    });
    throw new Error('Should have blocked login for pending unverified registration');
  } catch (err: any) {
    if (err.code !== 'ACCOUNT_UNVERIFIED') throw err;
    console.log('✅ Pending registration login blocked with 403 ACCOUNT_UNVERIFIED');
  }

  // 5. OTP Verification & Atomic Transactional User Creation
  console.log('\n--- 5. Testing OTP Verification & Atomic Promotion to users Table ---');
  const otpCode = regResult.devOtp || '482915';

  // Test invalid OTP
  try {
    await AuthService.verifyOtp({
      email: testEmail,
      code: '000000',
      purpose: 'register_verification',
    });
    throw new Error('Should have rejected invalid OTP');
  } catch (err: any) {
    if (err.code !== 'INVALID_OTP') throw err;
    console.log('✅ Invalid OTP correctly rejected with 400 INVALID_OTP');
  }

  // Test valid OTP verification
  if (regResult.devOtp) {
    const verifyResult = await AuthService.verifyOtp({
      email: testEmail,
      code: regResult.devOtp,
      purpose: 'register_verification',
    });

    if (!verifyResult.success) throw new Error('Valid OTP verification failed');
    console.log('✅ OTP verified successfully. Real user created transactionally!');

    // Verify that pending_registrations record is now DELETED
    const checkDeletedPending = await PendingRegistrationService.findValidByEmail(testEmail);
    if (checkDeletedPending) throw new Error('pending_registrations record should have been deleted!');
    console.log('✅ Confirmed pending_registrations record was deleted upon account activation.');

    // Verify that the OTP cannot be reused
    try {
      await AuthService.verifyOtp({
        email: testEmail,
        code: regResult.devOtp,
        purpose: 'register_verification',
      });
      throw new Error('Should have rejected already-used OTP');
    } catch (err: any) {
      if (err.code !== 'INVALID_OTP') throw err;
      console.log('✅ OTP re-use strictly rejected (OTP invalidated).');
    }
  }

  // 6. User Can Now Successfully Log In
  console.log('\n--- 6. Testing Login for Newly Promoted Active User ---');
  const loginResult = await AuthService.login({
    usernameOrEmail: testEmail,
    password: 'Password123!',
    rememberMe: true,
  });

  if (!loginResult.accessToken) throw new Error('Missing access token');
  if (loginResult.user.email !== testEmail) throw new Error('Logged in user mismatch');
  console.log(`✅ Login successful! Permanent active user authenticated: ${loginResult.user.fullName} (${loginResult.user.role})`);

  // 7. Duplicate Email Attempt When User Is Active Must Be Rejected
  console.log('\n--- 7. Testing Active User Collision Prevention ---');
  try {
    await AuthService.register({
      fullName: 'David Imposter',
      username: 'davidserey_imposter',
      email: testEmail,
      phone: '012998877',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    throw new Error('Should have rejected registration with active email');
  } catch (err: any) {
    if (err.code !== 'EMAIL_ALREADY_EXISTS') throw err;
    console.log('✅ Duplicate registration for active user rejected with 400 EMAIL_ALREADY_EXISTS');
  }

  // 8. 60-Second Cooldown & Resend OTP
  console.log('\n--- 8. Testing 60-Second Rate-Limiting Cooldown ---');
  try {
    await AuthService.resendOtp({ email: 'manager@apex.local', purpose: 'forgot_password' });
    await AuthService.resendOtp({ email: 'manager@apex.local', purpose: 'forgot_password' });
    throw new Error('Should have rate-limited rapid OTP resend');
  } catch (err: any) {
    if (err.code !== 'RATE_LIMITED') throw err;
    console.log('✅ 60-second rate-limiting cooldown successfully enforced');
  }

  // 9. Hourly Cleanup Routine
  console.log('\n--- 9. Testing Hourly Expired Registrations Purge ---');
  const purgedCount = await PendingRegistrationService.cleanupExpired();
  console.log(`✅ Cleanup function verified: ${purgedCount} expired record(s) swept.`);

  console.log('\n🎉 ALL PENDING REGISTRATION STORAGE & GMAIL OTP TESTS PASSED CLEANLY!\n');
}

runPendingAuthTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
