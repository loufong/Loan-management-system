const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllUsers() {
  console.log('🗑️  Initiating complete user purge from database...');
  try {
    // 1. Delete dependent user logs & notifications
    const deletedAuditLogs = await prisma.auditLog.deleteMany({});
    console.log(` - Deleted ${deletedAuditLogs.count} audit logs.`);

    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(` - Deleted ${deletedNotifications.count} notifications.`);

    // 2. Delete loan documents & payments
    const deletedDocs = await prisma.loanDocument.deleteMany({});
    console.log(` - Deleted ${deletedDocs.count} loan documents.`);

    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(` - Deleted ${deletedPayments.count} payments.`);

    const deletedSchedules = await prisma.repaymentSchedule.deleteMany({});
    console.log(` - Deleted ${deletedSchedules.count} repayment schedules.`);

    const deletedDisbursements = await prisma.disbursement.deleteMany({});
    console.log(` - Deleted ${deletedDisbursements.count} disbursements.`);

    const deletedLoans = await prisma.loan.deleteMany({});
    console.log(` - Deleted ${deletedLoans.count} loans.`);

    // 3. Delete application reviews, approvals, and applications
    const deletedApprovals = await prisma.applicationApproval.deleteMany({});
    console.log(` - Deleted ${deletedApprovals.count} application approvals.`);

    const deletedReviews = await prisma.applicationReview.deleteMany({});
    console.log(` - Deleted ${deletedReviews.count} application reviews.`);

    const deletedHistory = await prisma.applicationStatusHistory.deleteMany({});
    console.log(` - Deleted ${deletedHistory.count} status histories.`);

    const deletedApplications = await prisma.loanApplication.deleteMany({});
    console.log(` - Deleted ${deletedApplications.count} loan applications.`);

    // 4. Delete borrowers
    const deletedBorrowers = await prisma.borrower.deleteMany({});
    console.log(` - Deleted ${deletedBorrowers.count} borrowers.`);

    // 5. Delete authentication tokens, OTPs, password resets, and settings
    const deletedTokens = await prisma.refreshToken.deleteMany({});
    console.log(` - Deleted ${deletedTokens.count} refresh tokens.`);

    const deletedOtps = await prisma.otp.deleteMany({});
    console.log(` - Deleted ${deletedOtps.count} OTP records.`);

    const deletedOtpVerifications = await prisma.otpVerification.deleteMany({});
    console.log(` - Deleted ${deletedOtpVerifications.count} OTP verifications.`);

    const deletedPasswordResets = await prisma.passwordReset.deleteMany({});
    console.log(` - Deleted ${deletedPasswordResets.count} password resets.`);

    const deletedPending = await prisma.pendingRegistration.deleteMany({});
    console.log(` - Deleted ${deletedPending.count} pending registrations.`);

    const deletedSettings = await prisma.userSetting.deleteMany({});
    console.log(` - Deleted ${deletedSettings.count} user settings.`);

    // 6. Delete all general ledger entries if any
    try {
      const deletedGL = await prisma.generalLedger.deleteMany({});
      console.log(` - Deleted ${deletedGL.count} general ledger entries.`);
    } catch {}

    // 7. Delete ALL users in database
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ Successfully deleted ALL ${deletedUsers.count} users from the database.`);

    // Verify user count is now 0
    const remainingUsers = await prisma.user.count();
    console.log(`Remaining users count in DB: ${remainingUsers}`);

    return { success: true, deletedCount: deletedUsers.count, remainingUsers };
  } catch (error) {
    console.error('❌ Error clearing users from database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllUsers();

