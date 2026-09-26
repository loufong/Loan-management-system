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

// Manager should see raw unmasked PII
const adminView = sanitizeBorrowerPII(sampleBorrower, UserRole.MANAGER, false);
if (adminView.idNumber !== 'STU-ID-8849201') throw new Error('Manager should see unmasked ID');
console.log('✅ Manager sees raw unmasked PII');

// Cashier should see masked PII
const cashierView = sanitizeBorrowerPII(sampleBorrower, UserRole.CASHIER, false);
if (cashierView.idNumber !== '***-**-9201') throw new Error('Cashier should see masked ID');
if (cashierView.phone !== '***-***-0201') throw new Error('Cashier should see masked phone');
console.log('✅ Cashier sees masked PII:', cashierView.idNumber, cashierView.phone);

// Borrower viewing their own profile should see unmasked PII (isOwner = true)
const ownerView = sanitizeBorrowerPII(sampleBorrower, UserRole.BORROWER, true);
if (ownerView.idNumber !== 'STU-ID-8849201') throw new Error('Owner should see unmasked ID');
console.log('✅ Borrower viewing own profile sees unmasked PII');

// Test 3: Permission Matrix
console.log('\n--- TEST 3: Role-to-Permission Matrix ---');
const borrowerPerms = getPermissionsForRole(UserRole.BORROWER);
console.log('Borrower permissions count:', borrowerPerms.length);
if (borrowerPerms.includes(Permission.APPLICATION_APPROVE)) {
  throw new Error('Borrower should NOT have approval permission');
}
if (!borrowerPerms.includes(Permission.APPLICATION_CREATE_OWN)) {
  throw new Error('Borrower should have APPLICATION_CREATE_OWN');
}

const managerPerms = getPermissionsForRole(UserRole.MANAGER);
if (!managerPerms.includes(Permission.APPLICATION_APPROVE)) {
  throw new Error('Manager should have APPLICATION_APPROVE');
}

const cashierPerms = getPermissionsForRole(UserRole.CASHIER);
if (!cashierPerms.includes(Permission.PAYMENT_COLLECT)) {
  throw new Error('Cashier should have PAYMENT_COLLECT');
}
if (!cashierPerms.includes(Permission.LOAN_DISBURSE)) {
  throw new Error('Cashier should have LOAN_DISBURSE');
}
if (cashierPerms.includes(Permission.APPLICATION_APPROVE)) {
  throw new Error('Cashier should NOT have APPLICATION_APPROVE');
}
console.log('✅ Permissions matrix verified for all roles!');

// Test 4: Express App Initialization
console.log('\n--- TEST 4: Express App Initialization ---');
const app = createApp();
console.log('✅ Express app with security middlewares, RBAC, and routers loaded successfully!');

console.log('\n🎉 ALL SECURITY & RBAC TESTS PASSED SUCCESSFULLY!');
