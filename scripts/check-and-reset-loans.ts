import { prisma } from '../src/config/prisma';

async function main() {
  console.log('--- DATABASE STATUS BEFORE RESET ---');
  const userCount = await prisma.user.count().catch(() => 0);
  const loanCount = await prisma.loan.count().catch(() => 0);
  const appCount = await prisma.loanApplication.count().catch(() => 0);
  const paymentCount = await prisma.payment.count().catch(() => 0);
  const scheduleCount = await prisma.repaymentSchedule.count().catch(() => 0);
  const disbursementCount = await prisma.disbursement.count().catch(() => 0);
  const documentCount = await prisma.loanDocument.count().catch(() => 0);

  console.log({
    users: userCount,
    loans: loanCount,
    applications: appCount,
    payments: paymentCount,
    schedules: scheduleCount,
    disbursements: disbursementCount,
    loanDocuments: documentCount,
  });

  console.log('\n--- RESETTING ALL BORROWING & LOAN DATA ---');
  // 1. Delete payments
  try {
    const res = await prisma.payment.deleteMany();
    console.log(`Deleted ${res.count} payments.`);
  } catch (err: any) {
    console.log('Error deleting payments:', err?.message);
  }

  // 2. Delete repayment schedules
  try {
    const res = await prisma.repaymentSchedule.deleteMany();
    console.log(`Deleted ${res.count} repayment schedules.`);
  } catch (err: any) {
    console.log('Error deleting schedules:', err?.message);
  }

  // 3. Delete disbursements
  try {
    const res = await prisma.disbursement.deleteMany();
    console.log(`Deleted ${res.count} disbursements.`);
  } catch (err: any) {
    console.log('Error deleting disbursements:', err?.message);
  }

  // 4. Delete loan documents
  try {
    const res = await prisma.loanDocument.deleteMany();
    console.log(`Deleted ${res.count} loan documents.`);
  } catch (err: any) {
    console.log('Error deleting loan documents:', err?.message);
  }

  // 5. Delete loans
  try {
    const res = await prisma.loan.deleteMany();
    console.log(`Deleted ${res.count} loans.`);
  } catch (err: any) {
    console.log('Error deleting loans:', err?.message);
  }

  // 6. Delete application approvals, reviews, status history
  try {
    const res = await prisma.applicationApproval.deleteMany();
    console.log(`Deleted ${res.count} application approvals.`);
  } catch (err: any) {
    console.log('Error deleting approvals:', err?.message);
  }

  try {
    const res = await prisma.applicationReview.deleteMany();
    console.log(`Deleted ${res.count} application reviews.`);
  } catch (err: any) {
    console.log('Error deleting reviews:', err?.message);
  }

  try {
    const res = await prisma.applicationStatusHistory.deleteMany();
    console.log(`Deleted ${res.count} application status history records.`);
  } catch (err: any) {
    console.log('Error deleting status history:', err?.message);
  }

  // 7. Delete loan applications
  try {
    const res = await prisma.loanApplication.deleteMany();
    console.log(`Deleted ${res.count} loan applications.`);
  } catch (err: any) {
    console.log('Error deleting loan applications:', err?.message);
  }

  console.log('\n--- DATABASE STATUS AFTER RESET ---');
  const postLoanCount = await prisma.loan.count().catch(() => 0);
  const postAppCount = await prisma.loanApplication.count().catch(() => 0);
  const postPaymentCount = await prisma.payment.count().catch(() => 0);
  console.log({
    users: await prisma.user.count().catch(() => 0),
    loans: postLoanCount,
    applications: postAppCount,
    payments: postPaymentCount,
  });
}

main()
  .catch((e) => {
    console.error('Fatal error during reset:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

