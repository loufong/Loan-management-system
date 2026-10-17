import { maskIdNumber, maskPhone, maskEmail, sanitizeBorrowerPII, hasPiiClearance } from '../src/security/masking';
import { Permission, getPermissionsForRole, roleHasPermission } from '../src/security/permissions';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';

console.log('🧪 Starting Security & RBAC Test Suite...\n');

// Test 1: Masking Functions
console.log('--- TEST 1: PII Data Masking ---');
const rawId = 'STU-ID-8849201';
const maskedId = maskIdNumber(rawId);
console.log(`maskIdNumber("${rawId}") => "${maskedId}"`);
if (maskedId !== '***-**-9201') throw new Error('Failed maskIdNumber assertion');

const rawPhone = '+1-555-0201';
const maskedPhone = maskPhone(rawPhone);
console.log(`maskPhone("${rawPhone}") => "${maskedPhone}"`);
if (maskedPhone !== '***-***-0201') throw new Error('Failed maskPhone assertion');

const rawEmail = 'johnathan.doe@student.edu';
const maskedEmail = maskEmail(rawEmail);
console.log(`maskEmail("${rawEmail}") => "${maskedEmail}"`);
if (maskedEmail !== 'j***e@student.edu') throw new Error('Failed maskEmail assertion');

console.log('✅ PII Masking test passed!\n');

// Test 2: Role Clearance & Dynamic Borrower Sanitization
console.log('--- TEST 2: Role Clearance & Data Sanitization ---');
const sampleBorrower = {
  id: 'uuid-1234',
  borrowerId: 'BOR-2026-0001',
  fullName: 'Johnathan Doe',
  idNumber: 'STU-ID-8849201',
  phone: '+1-555-0201',
  address: '742 University Ave, Cambridge, MA'
};

// Admin should see raw unmasked PII
const adminView = sanitizeBorrowerPII(sampleBorrower, UserRole.ADMIN, false);
if (adminView.idNumber !== 'STU-ID-8849201') throw new Error('Admin should see unmasked ID');
console.log('✅ Admin sees raw unmasked PII');

// Non-owner USER should see masked PII
const nonOwnerView = sanitizeBorrowerPII(sampleBorrower, UserRole.USER, false);
if (nonOwnerView.idNumber !== '***-**-9201') throw new Error('Non-owner USER should see masked ID');
if (nonOwnerView.phone !== '***-***-0201') throw new Error('Non-owner USER should see masked phone');
console.log('✅ Non-owner USER sees masked PII:', nonOwnerView.idNumber, nonOwnerView.phone);

// User viewing their own profile should see unmasked PII (isOwner = true)
const ownerView = sanitizeBorrowerPII(sampleBorrower, UserRole.USER, true);
if (ownerView.idNumber !== 'STU-ID-8849201') throw new Error('Owner should see unmasked ID');
console.log('✅ User viewing own profile sees unmasked PII');

// Test 3: Permission Matrix
console.log('\n--- TEST 3: Role-to-Permission Matrix ---');
const userPerms = getPermissionsForRole(UserRole.USER);
console.log('USER permissions count:', userPerms.length);
if (userPerms.includes(Permission.APPLICATION_APPROVE)) {
  throw new Error('USER should NOT have approval permission');
}
if (!userPerms.includes(Permission.APPLICATION_CREATE_OWN)) {
  throw new Error('USER should have APPLICATION_CREATE_OWN');
}

const adminPerms = getPermissionsForRole(UserRole.ADMIN);
if (!adminPerms.includes(Permission.APPLICATION_APPROVE)) {
  throw new Error('ADMIN should have APPLICATION_APPROVE');
}
if (!adminPerms.includes(Permission.PAYMENT_COLLECT)) {
  throw new Error('ADMIN should have PAYMENT_COLLECT');
}
if (!adminPerms.includes(Permission.LOAN_DISBURSE)) {
  throw new Error('ADMIN should have LOAN_DISBURSE');
}
console.log('✅ Permissions matrix verified for ADMIN and USER roles!');

// Test 4: Express App Initialization
console.log('\n--- TEST 4: Express App Initialization ---');
const app = createApp();
console.log('✅ Express app with security middlewares, RBAC, and routers loaded successfully!');

console.log('\n🎉 ALL SECURITY & RBAC TESTS PASSED SUCCESSFULLY!');
