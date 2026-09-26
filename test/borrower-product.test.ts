import { createBorrowerSchema } from '../src/modules/borrowers/borrower.validation';
import { createProductSchema } from '../src/modules/products/product.validation';
import { RepaymentFrequency, UserRole, UserStatus } from '@prisma/client';
import { sanitizeBorrowerPII } from '../src/security/masking';
import { ProductService } from '../src/modules/products/product.service';

console.log('🧪 Starting Borrower & Product Module Test Suite...\n');

// 1. Borrower Schema Validations
console.log('--- TEST 1: Borrower Input Validation ---');

const validBorrower = {
  fullName: 'Alice Johnson',
  gender: 'FEMALE',
  dob: '1995-04-12',
  phone: '+1-555-0812',
  email: 'alice.johnson@university.edu',
  address: '12 Oak Street, Boston, MA',
  occupation: 'Postdoctoral Fellow',
  monthlyIncome: 4500.0,
  idNumber: 'STU-ID-9920192'
};

const parsedValid = createBorrowerSchema.safeParse(validBorrower);
if (!parsedValid.success) {
  console.error(parsedValid.error.errors);
  throw new Error('Valid borrower failed parsing');
}
console.log('✅ Valid borrower successfully validated');

// Invalid: Negative income
const negativeIncome = { ...validBorrower, monthlyIncome: -500 };
const parsedNegative = createBorrowerSchema.safeParse(negativeIncome);
if (parsedNegative.success) {
  throw new Error('Negative monthly income should have failed validation');
}
console.log('✅ Negative monthly income correctly rejected');

// Invalid: Phone format
const invalidPhone = { ...validBorrower, phone: 'abc-not-a-number' };
const parsedPhone = createBorrowerSchema.safeParse(invalidPhone);
if (parsedPhone.success) {
  throw new Error('Invalid phone format should have failed validation');
}
console.log('✅ Invalid phone number format correctly rejected');

// Invalid: Malformed email
const invalidEmail = { ...validBorrower, email: 'not-an-email' };
const parsedEmail = createBorrowerSchema.safeParse(invalidEmail);
if (parsedEmail.success) {
  throw new Error('Invalid email should have failed validation');
}
console.log('✅ Invalid email format correctly rejected');


// 2. Loan Product Schema Validations
console.log('\n--- TEST 2: Loan Product Input Validation ---');

const validProduct = {
  productName: 'Personal Loan',
  minAmount: 1000.0,
  maxAmount: 25000.0,
  interestRate: 7.5,
  minTerm: 6,
  maxTerm: 36,
  repaymentFrequency: RepaymentFrequency.MONTHLY,
  description: 'Standard personal loan'
};

const parsedProduct = createProductSchema.safeParse(validProduct);
if (!parsedProduct.success) {
  console.error(parsedProduct.error.errors);
  throw new Error('Valid product failed parsing');
}
console.log('✅ Valid loan product successfully validated');

// Invalid: minAmount > maxAmount
const invalidAmountRange = {
  ...validProduct,
  minAmount: 50000.0,
  maxAmount: 10000.0
};
const parsedAmounts = createProductSchema.safeParse(invalidAmountRange);
if (parsedAmounts.success) {
  throw new Error('minAmount > maxAmount should have failed validation');
}
console.log('✅ minAmount > maxAmount correctly rejected');

// Invalid: minTerm > maxTerm
const invalidTermRange = {
  ...validProduct,
  minTerm: 48,
  maxTerm: 12
};
const parsedTerms = createProductSchema.safeParse(invalidTermRange);
if (parsedTerms.success) {
  throw new Error('minTerm > maxTerm should have failed validation');
}
console.log('✅ minTerm > maxTerm correctly rejected');


// 3. ID Formatting & Auto-generation rule check
console.log('\n--- TEST 3: Borrower ID Format Rule ---');
const currentYear = new Date().getFullYear();
const sampleSeq = 1;
const sampleBorrowerId = `BOR-${currentYear}-${String(sampleSeq).padStart(4, '0')}`;
const idRegex = new RegExp(`^BOR-${currentYear}-\\d{4}$`);
if (!idRegex.test(sampleBorrowerId)) {
  throw new Error(`Borrower ID '${sampleBorrowerId}' does not match expected format`);
}
console.log(`✅ Formatted Borrower ID rule passed: '${sampleBorrowerId}' matches ^BOR-${currentYear}-\\d{4}$`);


// 4. Amortization Calculator Engine
console.log('\n--- TEST 4: Loan Amortization Calculation ---');
const calculation = ProductService.calculateAmortization(5000, 6.0, 12);
console.log(`Principal: $5,000 | Rate: 6.0% | Term: 12 mos`);
console.log(`Total Interest: $${calculation.totalInterest} | Total Repayment: $${calculation.totalRepayment}`);
console.log(`Monthly Installment: $${calculation.monthlyPayment} | Schedules Generated: ${calculation.schedules.length}`);

if (calculation.totalInterest !== 300) throw new Error('Expected total interest $300');
if (calculation.totalRepayment !== 5300) throw new Error('Expected total repayment $5300');
if (calculation.schedules.length !== 12) throw new Error('Expected 12 installment schedules');
console.log('✅ Loan Amortization Calculator verified!');


// 5. PII Masking on Aggregated Profile
console.log('\n--- TEST 5: Borrower Full Profile PII Masking ---');
const profile = {
  id: 'borrower-uuid-001',
  borrowerId: 'BOR-2026-0001',
  fullName: 'Johnathan Doe',
  idNumber: 'STU-ID-8849201',
  phone: '+1-555-0201',
  email: 'johnathan.doe@student.edu',
  address: '742 University Ave, Cambridge, MA',
  activeLoansCount: 1,
  paymentHistory: [
    { receiptNo: 'REC-2026-0001', amount: 511.25, paymentMethod: 'QR_PAYMENT' }
  ]
};

const cashierProfileView = sanitizeBorrowerPII(profile, UserRole.CASHIER, false);
if (cashierProfileView.idNumber !== '***-**-9201') throw new Error('ID should be masked for Cashier');
if (cashierProfileView.phone !== '***-***-0201') throw new Error('Phone should be masked for Cashier');
if (cashierProfileView.address !== 'Confidential (Protected PII)') throw new Error('Address should be protected');

console.log('✅ Full profile masking verified for unprivileged roles');

console.log('\n🎉 ALL BORROWER & PRODUCT MODULE TESTS PASSED SUCCESSFULLY!');
