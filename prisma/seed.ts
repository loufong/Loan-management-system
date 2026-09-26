import {
  PrismaClient,
  UserRole,
  UserStatus,
  RepaymentFrequency,
  ApplicationStatus,
  ReviewRecommendation,
  ApprovalDecision,
  LoanStatus,
  DisbursementMethod,
  DisbursementStatus,
  ScheduleStatus,
  PaymentMethod,
  PaymentStatus,
  EntityType,
  DocumentType,
  VerificationStatus,
  Prisma
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Academic Loan Management System database seed...');

  // 1. Clean up existing records in reverse dependency order
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.loanDocument.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.repaymentSchedule.deleteMany({});
  await prisma.disbursement.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.applicationApproval.deleteMany({});
  await prisma.applicationReview.deleteMany({});
  await prisma.applicationStatusHistory.deleteMany({});
  await prisma.loanApplication.deleteMany({});
  await prisma.loanProduct.deleteMany({});
  await prisma.borrower.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // ==========================================
  // 2. SEED USERS (All 6 Roles)
  // ==========================================
  console.log('👤 Seeding System Users...');

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@loansystem.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Alexander Wright',
      phone: '+1-555-0100',
      position: 'Chief Information Officer & LMS Administrator',
      department: 'IT & Systems Governance',
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE
    }
  });

  const managerUser = await prisma.user.create({
    data: {
      username: 'm.vance',
      email: 'marcus.vance@loansystem.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Marcus Vance, MBA',
      phone: '+1-555-0101',
      position: 'Head of Financial Aid & Lending',
      department: 'Credit & Financial Affairs',
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE
    }
  });

  const creditOfficerUser = await prisma.user.create({
    data: {
      username: 's.chen',
      email: 'sarah.chen@loansystem.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Sarah Chen',
      phone: '+1-555-0102',
      position: 'Senior Credit Risk Analyst',
      department: 'Risk Management',
      role: UserRole.LOAN_OFFICER,
      status: UserStatus.ACTIVE
    }
  });

  const loanOfficerUser = await prisma.user.create({
    data: {
      username: 'd.miller',
      email: 'david.miller@loansystem.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'David Miller',
      phone: '+1-555-0103',
      position: 'Senior Loan Origination Officer',
      department: 'Student Financial Services',
      role: UserRole.LOAN_OFFICER,
      status: UserStatus.ACTIVE
    }
  });

  const cashierUser = await prisma.user.create({
    data: {
      username: 'e.ross',
      email: 'emily.ross@loansystem.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Emily Ross',
      phone: '+1-555-0104',
      position: 'University Bursar & Lead Cashier',
      department: 'Disbursement & Treasury',
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE
    }
  });

  const borrowerUser1 = await prisma.user.create({
    data: {
      username: 'j.doe',
      email: 'johnathan.doe@student.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Johnathan Doe',
      phone: '+1-555-0201',
      position: 'Graduate Research Assistant',
      department: 'School of Computer Science',
      role: UserRole.BORROWER,
      status: UserStatus.ACTIVE
    }
  });

  const borrowerUser2 = await prisma.user.create({
    data: {
      username: 'm.garcia',
      email: 'maria.garcia@student.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Maria Garcia',
      phone: '+1-555-0202',
      position: 'Undergraduate Senior',
      department: 'Faculty of Engineering',
      role: UserRole.BORROWER,
      status: UserStatus.ACTIVE
    }
  });

  // ==========================================
  // 3. SEED LOAN PRODUCTS (5 Core Standard Products)
  // ==========================================
  console.log('📦 Seeding Loan Products...');

  const academicMicroloan = await prisma.loanProduct.create({
    data: {
      productName: 'Education Loan',
      minAmount: new Prisma.Decimal('500.00'),
      maxAmount: new Prisma.Decimal('10000.00'),
      interestRate: new Prisma.Decimal('4.50'), // 4.5% annual
      minTerm: 3,
      maxTerm: 24,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      description: 'Low-interest credit designed for tuition, semester registration, and academic thesis fees.',
      status: UserStatus.ACTIVE
    }
  });

  const emergencyReliefLoan = await prisma.loanProduct.create({
    data: {
      productName: 'Emergency Loan',
      minAmount: new Prisma.Decimal('100.00'),
      maxAmount: new Prisma.Decimal('2000.00'),
      interestRate: new Prisma.Decimal('2.00'), // 2.0% subsidized annual
      minTerm: 1,
      maxTerm: 6,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      description: 'Rapid emergency relief financing for student housing, food stipends, medical emergencies, or textbook grants.',
      status: UserStatus.ACTIVE
    }
  });

  const facultyPersonalLoan = await prisma.loanProduct.create({
    data: {
      productName: 'Personal Loan',
      minAmount: new Prisma.Decimal('1000.00'),
      maxAmount: new Prisma.Decimal('30000.00'),
      interestRate: new Prisma.Decimal('8.25'), // 8.25% annual
      minTerm: 6,
      maxTerm: 60,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      description: 'Flexible personal financing tailored for research staff, professors, and university personnel.',
      status: UserStatus.ACTIVE
    }
  });

  const businessLoan = await prisma.loanProduct.create({
    data: {
      productName: 'Business Loan',
      minAmount: new Prisma.Decimal('5000.00'),
      maxAmount: new Prisma.Decimal('100000.00'),
      interestRate: new Prisma.Decimal('9.50'), // 9.5% annual
      minTerm: 12,
      maxTerm: 84,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      description: 'Capital financing for academic spin-offs, faculty commercialization ventures, and research laboratories.',
      status: UserStatus.ACTIVE
    }
  });

  const vehicleLoan = await prisma.loanProduct.create({
    data: {
      productName: 'Vehicle Loan',
      minAmount: new Prisma.Decimal('3000.00'),
      maxAmount: new Prisma.Decimal('40000.00'),
      interestRate: new Prisma.Decimal('6.25'), // 6.25% annual
      minTerm: 12,
      maxTerm: 72,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      description: 'Secured vehicle financing with competitive annual interest rates for campus commuters and staff.',
      status: UserStatus.ACTIVE
    }
  });

  const researchEquipmentLoan = businessLoan; // Backward-compatible alias for app4

  // ==========================================
  // 4. SEED BORROWERS
  // ==========================================
  console.log('🎓 Seeding Borrowers...');

  const borrower1 = await prisma.borrower.create({
    data: {
      borrowerId: 'BOR-2026-0001',
      userId: borrowerUser1.id,
      fullName: 'Johnathan Doe',
      gender: 'MALE',
      dob: new Date('1998-05-14'),
      phone: '+1-555-0201',
      email: 'johnathan.doe@student.edu',
      address: '742 University Ave, Apt 4B, Cambridge, MA 02138',
      occupation: 'Graduate Teaching Assistant',
      monthlyIncome: new Prisma.Decimal('2800.00'),
      idNumber: 'STU-ID-8849201',
      status: UserStatus.ACTIVE
    }
  });

  const borrower2 = await prisma.borrower.create({
    data: {
      borrowerId: 'BOR-2026-0002',
      userId: borrowerUser2.id,
      fullName: 'Maria Garcia',
      gender: 'FEMALE',
      dob: new Date('2002-11-23'),
      phone: '+1-555-0202',
      email: 'maria.garcia@student.edu',
      address: '105 College Hall, Campus East, Cambridge, MA 02138',
      occupation: 'Work-Study Student Assistant',
      monthlyIncome: new Prisma.Decimal('1400.00'),
      idNumber: 'STU-ID-9102431',
      status: UserStatus.ACTIVE
    }
  });

  const borrower3 = await prisma.borrower.create({
    data: {
      borrowerId: 'BOR-2026-0003',
      userId: null,
      fullName: 'Dr. Robert Taylor',
      gender: 'MALE',
      dob: new Date('1984-03-08'),
      phone: '+1-555-0303',
      email: 'robert.taylor@faculty.edu',
      address: '18 Highland Street, Somerville, MA 02143',
      occupation: 'Associate Professor of Biochemistry',
      monthlyIncome: new Prisma.Decimal('7500.00'),
      idNumber: 'FAC-ID-4402199',
      status: UserStatus.ACTIVE
    }
  });

  const borrower4 = await prisma.borrower.create({
    data: {
      borrowerId: 'BOR-2026-0004',
      userId: null,
      fullName: 'Aaliyah Patel',
      gender: 'FEMALE',
      dob: new Date('1996-09-30'),
      phone: '+1-555-0404',
      email: 'aaliyah.patel@postgrad.edu',
      address: '32 Beacon St, Suite 501, Boston, MA 02108',
      occupation: 'Medical Sciences Fellow',
      monthlyIncome: new Prisma.Decimal('4200.00'),
      idNumber: 'STU-ID-7730192',
      status: UserStatus.ACTIVE
    }
  });

  const borrower5 = await prisma.borrower.create({
    data: {
      borrowerId: 'BOR-2026-0005',
      userId: null,
      fullName: 'Kenji Sato',
      gender: 'MALE',
      dob: new Date('1999-07-19'),
      phone: '+1-555-0505',
      email: 'kenji.sato@student.edu',
      address: '88 Massachusetts Avenue, Cambridge, MA 02139',
      occupation: 'Robotics Research Intern',
      monthlyIncome: new Prisma.Decimal('3100.00'),
      idNumber: 'STU-ID-6601429',
      status: UserStatus.ACTIVE
    }
  });

  // ==========================================
  // 5. SEED LOAN APPLICATIONS & LIFECYCLE
  // ==========================================
  console.log('📝 Seeding Loan Applications & Approvals...');

  // Application 1: Fully Approved & Active Loan (Johnathan Doe)
  const app1 = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0001',
      borrowerId: borrower1.id,
      productId: academicMicroloan.id,
      requestedAmount: new Prisma.Decimal('3000.00'),
      requestedTerm: 6, // 6 months
      purpose: 'Payment of Final Semester Lab Fees and Thesis Defense Registration',
      monthlyIncome: new Prisma.Decimal('2800.00'),
      supportingInfo: 'Enrolled in 5th year PhD program. Holds active GTA stipend through May 2027.',
      status: ApplicationStatus.APPROVED,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-08-15T09:30:00Z')
    }
  });

  // Application 1 Status History
  await prisma.applicationStatusHistory.createMany({
    data: [
      {
        applicationId: app1.id,
        previousStatus: null,
        newStatus: ApplicationStatus.DRAFT,
        changedBy: loanOfficerUser.id,
        note: 'Application initiated via front desk intake.',
        createdAt: new Date('2026-08-15T09:30:00Z')
      },
      {
        applicationId: app1.id,
        previousStatus: ApplicationStatus.DRAFT,
        newStatus: ApplicationStatus.SUBMITTED,
        changedBy: loanOfficerUser.id,
        note: 'Completed student documents verified and submitted for credit assessment.',
        createdAt: new Date('2026-08-15T14:00:00Z')
      },
      {
        applicationId: app1.id,
        previousStatus: ApplicationStatus.SUBMITTED,
        newStatus: ApplicationStatus.UNDER_REVIEW,
        changedBy: creditOfficerUser.id,
        note: 'Credit underwriting in progress; verifying stipend continuity.',
        createdAt: new Date('2026-08-16T10:15:00Z')
      },
      {
        applicationId: app1.id,
        previousStatus: ApplicationStatus.UNDER_REVIEW,
        newStatus: ApplicationStatus.APPROVED,
        changedBy: managerUser.id,
        note: 'Credit committee approved terms without conditions.',
        createdAt: new Date('2026-08-18T16:00:00Z')
      }
    ]
  });

  // Application 1 Review
  await prisma.applicationReview.create({
    data: {
      applicationId: app1.id,
      reviewerId: creditOfficerUser.id,
      recommendation: ReviewRecommendation.RECOMMEND_APPROVAL,
      notes: 'Debt-to-Income (DTI) ratio is 18.2%, well below the 35% cap. Strong GPA (3.92) and documented institutional stipend.',
      createdAt: new Date('2026-08-17T11:30:00Z')
    }
  });

  // Application 1 Approval Record
  await prisma.applicationApproval.create({
    data: {
      applicationId: app1.id,
      approverId: managerUser.id,
      decision: ApprovalDecision.APPROVED,
      approvedAmount: new Prisma.Decimal('3000.00'),
      approvedTerm: 6,
      approvedInterestRate: new Prisma.Decimal('4.50'),
      decisionDate: new Date('2026-08-18T16:00:00Z'),
      createdAt: new Date('2026-08-18T16:00:00Z')
    }
  });

  // Application 2: Under Review (Maria Garcia)
  const app2 = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0002',
      borrowerId: borrower2.id,
      productId: emergencyReliefLoan.id,
      requestedAmount: new Prisma.Decimal('1000.00'),
      requestedTerm: 4,
      purpose: 'Emergency laptop replacement following hardware failure during exam period',
      monthlyIncome: new Prisma.Decimal('1400.00'),
      supportingInfo: 'Senior capstone deadline approaching in 3 weeks.',
      status: ApplicationStatus.UNDER_REVIEW,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-09-02T11:00:00Z')
    }
  });

  await prisma.applicationStatusHistory.create({
    data: {
      applicationId: app2.id,
      previousStatus: ApplicationStatus.SUBMITTED,
      newStatus: ApplicationStatus.UNDER_REVIEW,
      changedBy: creditOfficerUser.id,
      note: 'Evaluating proof of enrollment and departmental recommendation.',
      createdAt: new Date('2026-09-03T09:00:00Z')
    }
  });

  await prisma.applicationReview.create({
    data: {
      applicationId: app2.id,
      reviewerId: creditOfficerUser.id,
      recommendation: ReviewRecommendation.NEED_MORE_INFO,
      notes: 'Request department confirmation of enrollment status and student employment hours for current term.',
      createdAt: new Date('2026-09-04T14:30:00Z')
    }
  });

  // Application 3: Approved Faculty Loan (Dr. Robert Taylor)
  const app3 = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0003',
      borrowerId: borrower3.id,
      productId: facultyPersonalLoan.id,
      requestedAmount: new Prisma.Decimal('15000.00'),
      requestedTerm: 24,
      purpose: 'Relocation assistance and research sabbatical travel',
      monthlyIncome: new Prisma.Decimal('7500.00'),
      supportingInfo: 'Tenured faculty appointment; 8+ years of university service.',
      status: ApplicationStatus.APPROVED,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-09-10T10:00:00Z')
    }
  });

  await prisma.applicationApproval.create({
    data: {
      applicationId: app3.id,
      approverId: managerUser.id,
      decision: ApprovalDecision.APPROVED,
      approvedAmount: new Prisma.Decimal('15000.00'),
      approvedTerm: 24,
      approvedInterestRate: new Prisma.Decimal('8.25'),
      decisionDate: new Date('2026-09-12T15:00:00Z'),
      createdAt: new Date('2026-09-12T15:00:00Z')
    }
  });

  // Application 4: Submitted (Aaliyah Patel)
  await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0004',
      borrowerId: borrower4.id,
      productId: researchEquipmentLoan.id,
      requestedAmount: new Prisma.Decimal('6000.00'),
      requestedTerm: 12,
      purpose: 'GPU compute cluster node for neural network clinical analysis',
      monthlyIncome: new Prisma.Decimal('4200.00'),
      supportingInfo: 'Grant matching program covers 40% of hardware total.',
      status: ApplicationStatus.SUBMITTED,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-09-15T08:45:00Z')
    }
  });

  // Application 5: Draft (Kenji Sato)
  const app5 = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0005',
      borrowerId: borrower5.id,
      productId: academicMicroloan.id,
      requestedAmount: new Prisma.Decimal('2500.00'),
      requestedTerm: 6,
      purpose: 'Conference attendance and publication index fees',
      monthlyIncome: new Prisma.Decimal('3100.00'),
      status: ApplicationStatus.DRAFT,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-09-19T16:20:00Z')
    }
  });

  // Application 6: Rejected Application (Kenji Sato)
  const app6 = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0006',
      borrowerId: borrower5.id,
      productId: businessLoan.id,
      requestedAmount: new Prisma.Decimal('50000.00'),
      requestedTerm: 24,
      purpose: 'Speculative cryptocurrency and high-density GPU mining cluster',
      monthlyIncome: new Prisma.Decimal('3100.00'),
      supportingInfo: 'Unofficial side venture outside academic research scope.',
      status: ApplicationStatus.REJECTED,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-08-01T10:00:00Z')
    }
  });

  await prisma.applicationStatusHistory.createMany({
    data: [
      {
        applicationId: app6.id,
        previousStatus: null,
        newStatus: ApplicationStatus.DRAFT,
        changedBy: loanOfficerUser.id,
        note: 'Intake initiated.',
        createdAt: new Date('2026-08-01T10:00:00Z')
      },
      {
        applicationId: app6.id,
        previousStatus: ApplicationStatus.DRAFT,
        newStatus: ApplicationStatus.SUBMITTED,
        changedBy: loanOfficerUser.id,
        note: 'Submitted for committee review.',
        createdAt: new Date('2026-08-01T14:30:00Z')
      },
      {
        applicationId: app6.id,
        previousStatus: ApplicationStatus.SUBMITTED,
        newStatus: ApplicationStatus.UNDER_REVIEW,
        changedBy: creditOfficerUser.id,
        note: 'Underwriting risk simulation underway.',
        createdAt: new Date('2026-08-02T09:00:00Z')
      },
      {
        applicationId: app6.id,
        previousStatus: ApplicationStatus.UNDER_REVIEW,
        newStatus: ApplicationStatus.REJECTED,
        changedBy: managerUser.id,
        note: 'Application rejected due to high DTI risk (>70%) and speculative non-academic purpose.',
        createdAt: new Date('2026-08-03T16:00:00Z')
      }
    ]
  });

  await prisma.applicationReview.create({
    data: {
      applicationId: app6.id,
      reviewerId: creditOfficerUser.id,
      recommendation: ReviewRecommendation.RECOMMEND_REJECTION,
      notes: 'Estimated monthly installment of $2,296.88 against monthly income of $3,100 results in a DTI of 74.1%. Far exceeds 40% maximum threshold.',
      createdAt: new Date('2026-08-02T15:00:00Z')
    }
  });

  await prisma.applicationApproval.create({
    data: {
      applicationId: app6.id,
      approverId: managerUser.id,
      decision: ApprovalDecision.REJECTED,
      rejectionReason: 'Debt-to-Income (DTI) ratio (74.1%) significantly exceeds maximum institutional risk threshold (40.0%).',
      decisionDate: new Date('2026-08-03T16:00:00Z'),
      createdAt: new Date('2026-08-03T16:00:00Z')
    }
  });

  // Application 7: Cancelled Application (Maria Garcia)
  const app7 = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0007',
      borrowerId: borrower2.id,
      productId: emergencyReliefLoan.id,
      requestedAmount: new Prisma.Decimal('800.00'),
      requestedTerm: 2,
      purpose: 'Emergency dental expense (withdrawn after departmental emergency fund granted)',
      monthlyIncome: new Prisma.Decimal('1400.00'),
      status: ApplicationStatus.CANCELLED,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-09-05T09:00:00Z')
    }
  });

  await prisma.applicationStatusHistory.createMany({
    data: [
      {
        applicationId: app7.id,
        previousStatus: null,
        newStatus: ApplicationStatus.DRAFT,
        changedBy: loanOfficerUser.id,
        note: 'Draft initiated.',
        createdAt: new Date('2026-09-05T09:00:00Z')
      },
      {
        applicationId: app7.id,
        previousStatus: ApplicationStatus.DRAFT,
        newStatus: ApplicationStatus.CANCELLED,
        changedBy: loanOfficerUser.id,
        note: 'Borrower requested cancellation; university grant was awarded.',
        createdAt: new Date('2026-09-06T10:00:00Z')
      }
    ]
  });

  // Application 8: For Overdue Loan (Aaliyah Patel)
  const app8 = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0008',
      borrowerId: borrower4.id,
      productId: emergencyReliefLoan.id,
      requestedAmount: new Prisma.Decimal('1200.00'),
      requestedTerm: 4,
      purpose: 'Clinical fellowship lab materials and diagnostic kit',
      monthlyIncome: new Prisma.Decimal('4200.00'),
      status: ApplicationStatus.APPROVED,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-05-20T10:00:00Z')
    }
  });

  await prisma.applicationApproval.create({
    data: {
      applicationId: app8.id,
      approverId: managerUser.id,
      decision: ApprovalDecision.APPROVED,
      approvedAmount: new Prisma.Decimal('1200.00'),
      approvedTerm: 4,
      approvedInterestRate: new Prisma.Decimal('2.00'),
      decisionDate: new Date('2026-05-25T11:00:00Z'),
      createdAt: new Date('2026-05-25T11:00:00Z')
    }
  });

  // Application 9: For Completed Loan (Dr. Robert Taylor)
  const app9 = await prisma.loanApplication.create({
    data: {
      applicationNo: 'APP-2026-0009',
      borrowerId: borrower3.id,
      productId: emergencyReliefLoan.id,
      requestedAmount: new Prisma.Decimal('1000.00'),
      requestedTerm: 2,
      purpose: 'Short-term departmental bridge loan for research symposium registration',
      monthlyIncome: new Prisma.Decimal('7500.00'),
      status: ApplicationStatus.APPROVED,
      createdBy: loanOfficerUser.id,
      createdAt: new Date('2026-03-15T09:00:00Z')
    }
  });

  await prisma.applicationApproval.create({
    data: {
      applicationId: app9.id,
      approverId: managerUser.id,
      decision: ApprovalDecision.APPROVED,
      approvedAmount: new Prisma.Decimal('1000.00'),
      approvedTerm: 2,
      approvedInterestRate: new Prisma.Decimal('2.00'),
      decisionDate: new Date('2026-03-20T14:00:00Z'),
      createdAt: new Date('2026-03-20T14:00:00Z')
    }
  });

  // ==========================================
  // 6. SEED ACTIVE LOAN, DISBURSEMENT & SCHEDULES
  // ==========================================
  console.log('💰 Seeding Active Loan, Disbursement & Repayment Schedules...');

  // Create Loan for Johnathan Doe (from app1)
  // Principal: $3000, 6 months, 4.5% annual interest
  // Total Interest = 3000 * 0.045 * (6 / 12) = $67.50
  // Total Repayment = $3067.50
  // Monthly Installment = $511.25 (Principal: $500.00, Interest: $11.25)
  const loan1 = await prisma.loan.create({
    data: {
      loanNumber: 'LN-2026-0001',
      applicationId: app1.id,
      borrowerId: borrower1.id,
      productId: academicMicroloan.id,
      principalAmount: new Prisma.Decimal('3000.00'),
      interestRate: new Prisma.Decimal('4.50'),
      termMonths: 6,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      totalInterest: new Prisma.Decimal('67.50'),
      totalRepayment: new Prisma.Decimal('3067.50'),
      totalPaid: new Prisma.Decimal('761.25'), // Paid installment 1 ($511.25) + partial installment 2 ($250.00)
      outstandingBalance: new Prisma.Decimal('2306.25'),
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-03-01'),
      status: LoanStatus.ACTIVE
    }
  });

  // Disbursement for Loan 1
  await prisma.disbursement.create({
    data: {
      loanId: loan1.id,
      disbursementDate: new Date('2026-09-01T10:00:00Z'),
      amount: new Prisma.Decimal('3000.00'),
      paymentMethod: DisbursementMethod.BANK_TRANSFER,
      referenceNo: 'ACH-TRX-20260901-99201',
      disbursedBy: cashierUser.id,
      status: DisbursementStatus.DISBURSED,
      notes: 'Direct ACH electronic transfer into student account ending in *4892.'
    }
  });

  // Repayment Schedule Installments (6 Months)
  const scheduleData = [
    {
      installmentNo: 1,
      dueDate: new Date('2026-10-01'),
      principalAmount: new Prisma.Decimal('500.00'),
      interestAmount: new Prisma.Decimal('11.25'),
      totalDue: new Prisma.Decimal('511.25'),
      amountPaid: new Prisma.Decimal('511.25'),
      remainingAmount: new Prisma.Decimal('0.00'),
      status: ScheduleStatus.PAID
    },
    {
      installmentNo: 2,
      dueDate: new Date('2026-11-01'),
      principalAmount: new Prisma.Decimal('500.00'),
      interestAmount: new Prisma.Decimal('11.25'),
      totalDue: new Prisma.Decimal('511.25'),
      amountPaid: new Prisma.Decimal('250.00'),
      remainingAmount: new Prisma.Decimal('261.25'),
      status: ScheduleStatus.PARTIAL
    },
    {
      installmentNo: 3,
      dueDate: new Date('2026-12-01'),
      principalAmount: new Prisma.Decimal('500.00'),
      interestAmount: new Prisma.Decimal('11.25'),
      totalDue: new Prisma.Decimal('511.25'),
      amountPaid: new Prisma.Decimal('0.00'),
      remainingAmount: new Prisma.Decimal('511.25'),
      status: ScheduleStatus.UPCOMING
    },
    {
      installmentNo: 4,
      dueDate: new Date('2027-01-01'),
      principalAmount: new Prisma.Decimal('500.00'),
      interestAmount: new Prisma.Decimal('11.25'),
      totalDue: new Prisma.Decimal('511.25'),
      amountPaid: new Prisma.Decimal('0.00'),
      remainingAmount: new Prisma.Decimal('511.25'),
      status: ScheduleStatus.UPCOMING
    },
    {
      installmentNo: 5,
      dueDate: new Date('2027-02-01'),
      principalAmount: new Prisma.Decimal('500.00'),
      interestAmount: new Prisma.Decimal('11.25'),
      totalDue: new Prisma.Decimal('511.25'),
      amountPaid: new Prisma.Decimal('0.00'),
      remainingAmount: new Prisma.Decimal('511.25'),
      status: ScheduleStatus.UPCOMING
    },
    {
      installmentNo: 6,
      dueDate: new Date('2027-03-01'),
      principalAmount: new Prisma.Decimal('500.00'),
      interestAmount: new Prisma.Decimal('11.25'),
      totalDue: new Prisma.Decimal('511.25'),
      amountPaid: new Prisma.Decimal('0.00'),
      remainingAmount: new Prisma.Decimal('511.25'),
      status: ScheduleStatus.UPCOMING
    }
  ];

  const createdSchedules = [];
  for (const s of scheduleData) {
    const created = await prisma.repaymentSchedule.create({
      data: {
        loanId: loan1.id,
        ...s
      }
    });
    createdSchedules.push(created);
  }

  // ==========================================
  // 7. SEED PAYMENTS
  // ==========================================
  console.log('💳 Seeding Repayment Transactions...');

  // Payment 1: Fully settles Installment 1
  await prisma.payment.create({
    data: {
      receiptNo: 'REC-2026-0001',
      loanId: loan1.id,
      installmentId: createdSchedules[0].id,
      paymentDate: new Date('2026-09-28T14:15:00Z'),
      amount: new Prisma.Decimal('511.25'),
      paymentMethod: PaymentMethod.QR_PAYMENT,
      referenceNo: 'QR-PROMPT-PAY-88291039',
      receivedBy: cashierUser.id,
      status: PaymentStatus.PAID,
      notes: 'Early payment cleared via Bursar Student Portal QR Gateway.'
    }
  });

  // Payment 2: Partial payment on Installment 2
  await prisma.payment.create({
    data: {
      receiptNo: 'REC-2026-0002',
      loanId: loan1.id,
      installmentId: createdSchedules[1].id,
      paymentDate: new Date('2026-10-15T11:00:00Z'),
      amount: new Prisma.Decimal('250.00'),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNo: 'WIRE-CONF-20261015-7712',
      receivedBy: cashierUser.id,
      status: PaymentStatus.PARTIAL,
      notes: 'Partial early payment. Balance of $261.25 due on 2026-11-01.'
    }
  });

  // ==========================================
  // 6B. SEED OVERDUE LOAN (LN-2026-0002) - Aaliyah Patel
  // ==========================================
  console.log('⚠️ Seeding Overdue Loan & Past-Due Schedules...');
  const loan2 = await prisma.loan.create({
    data: {
      loanNumber: 'LN-2026-0002',
      applicationId: app8.id,
      borrowerId: borrower4.id,
      productId: emergencyReliefLoan.id,
      principalAmount: new Prisma.Decimal('1200.00'),
      interestRate: new Prisma.Decimal('2.00'),
      termMonths: 4,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      totalInterest: new Prisma.Decimal('8.00'),
      totalRepayment: new Prisma.Decimal('1208.00'),
      totalPaid: new Prisma.Decimal('302.00'), // Paid 1st installment only
      outstandingBalance: new Prisma.Decimal('906.00'),
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-10-01'),
      status: LoanStatus.OVERDUE
    }
  });

  await prisma.disbursement.create({
    data: {
      loanId: loan2.id,
      disbursementDate: new Date('2026-06-01T11:00:00Z'),
      amount: new Prisma.Decimal('1200.00'),
      paymentMethod: DisbursementMethod.BANK_TRANSFER,
      referenceNo: 'ACH-TRX-20260601-88120',
      disbursedBy: cashierUser.id,
      status: DisbursementStatus.DISBURSED,
      notes: 'Fellowship laboratory materials disbursement.'
    }
  });

  const scheduleData2 = [
    {
      installmentNo: 1,
      dueDate: new Date('2026-07-01'),
      principalAmount: new Prisma.Decimal('300.00'),
      interestAmount: new Prisma.Decimal('2.00'),
      totalDue: new Prisma.Decimal('302.00'),
      amountPaid: new Prisma.Decimal('302.00'),
      remainingAmount: new Prisma.Decimal('0.00'),
      status: ScheduleStatus.PAID
    },
    {
      installmentNo: 2,
      dueDate: new Date('2026-08-01'), // 50 days overdue as of 2026-09-20
      principalAmount: new Prisma.Decimal('300.00'),
      interestAmount: new Prisma.Decimal('2.00'),
      totalDue: new Prisma.Decimal('302.00'),
      amountPaid: new Prisma.Decimal('0.00'),
      remainingAmount: new Prisma.Decimal('302.00'),
      status: ScheduleStatus.OVERDUE
    },
    {
      installmentNo: 3,
      dueDate: new Date('2026-09-01'), // 19 days overdue
      principalAmount: new Prisma.Decimal('300.00'),
      interestAmount: new Prisma.Decimal('2.00'),
      totalDue: new Prisma.Decimal('302.00'),
      amountPaid: new Prisma.Decimal('0.00'),
      remainingAmount: new Prisma.Decimal('302.00'),
      status: ScheduleStatus.OVERDUE
    },
    {
      installmentNo: 4,
      dueDate: new Date('2026-10-01'),
      principalAmount: new Prisma.Decimal('300.00'),
      interestAmount: new Prisma.Decimal('2.00'),
      totalDue: new Prisma.Decimal('302.00'),
      amountPaid: new Prisma.Decimal('0.00'),
      remainingAmount: new Prisma.Decimal('302.00'),
      status: ScheduleStatus.UPCOMING
    }
  ];

  const createdSchedules2 = [];
  for (const s of scheduleData2) {
    const created = await prisma.repaymentSchedule.create({
      data: {
        loanId: loan2.id,
        ...s
      }
    });
    createdSchedules2.push(created);
  }

  // Payment 3: Settle Installment 1 of Loan 2
  await prisma.payment.create({
    data: {
      receiptNo: 'REC-2026-0003',
      loanId: loan2.id,
      installmentId: createdSchedules2[0].id,
      paymentDate: new Date('2026-06-29T16:00:00Z'),
      amount: new Prisma.Decimal('302.00'),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNo: 'WIRE-TRX-20260629-3319',
      receivedBy: cashierUser.id,
      status: PaymentStatus.PAID,
      notes: 'First installment cleared on time.'
    }
  });

  // ==========================================
  // 6C. SEED COMPLETED LOAN (LN-2026-0003) - Dr. Robert Taylor
  // ==========================================
  console.log('🎉 Seeding Fully Repaid / Completed Loan...');
  const loan3 = await prisma.loan.create({
    data: {
      loanNumber: 'LN-2026-0003',
      applicationId: app9.id,
      borrowerId: borrower3.id,
      productId: emergencyReliefLoan.id,
      principalAmount: new Prisma.Decimal('1000.00'),
      interestRate: new Prisma.Decimal('2.00'),
      termMonths: 2,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      totalInterest: new Prisma.Decimal('3.33'),
      totalRepayment: new Prisma.Decimal('1003.33'),
      totalPaid: new Prisma.Decimal('1003.33'), // 100% Repaid
      outstandingBalance: new Prisma.Decimal('0.00'), // Zero Balance
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-01'),
      status: LoanStatus.COMPLETED
    }
  });

  await prisma.disbursement.create({
    data: {
      loanId: loan3.id,
      disbursementDate: new Date('2026-04-01T09:30:00Z'),
      amount: new Prisma.Decimal('1000.00'),
      paymentMethod: DisbursementMethod.BANK_TRANSFER,
      referenceNo: 'ACH-TRX-20260401-11928',
      disbursedBy: cashierUser.id,
      status: DisbursementStatus.DISBURSED,
      notes: 'Faculty symposium registration bridge funding.'
    }
  });

  const scheduleData3 = [
    {
      installmentNo: 1,
      dueDate: new Date('2026-05-01'),
      principalAmount: new Prisma.Decimal('500.00'),
      interestAmount: new Prisma.Decimal('1.66'),
      totalDue: new Prisma.Decimal('501.66'),
      amountPaid: new Prisma.Decimal('501.66'),
      remainingAmount: new Prisma.Decimal('0.00'),
      status: ScheduleStatus.PAID
    },
    {
      installmentNo: 2,
      dueDate: new Date('2026-06-01'),
      principalAmount: new Prisma.Decimal('500.00'),
      interestAmount: new Prisma.Decimal('1.67'),
      totalDue: new Prisma.Decimal('501.67'),
      amountPaid: new Prisma.Decimal('501.67'),
      remainingAmount: new Prisma.Decimal('0.00'),
      status: ScheduleStatus.PAID
    }
  ];

  const createdSchedules3 = [];
  for (const s of scheduleData3) {
    const created = await prisma.repaymentSchedule.create({
      data: {
        loanId: loan3.id,
        ...s
      }
    });
    createdSchedules3.push(created);
  }

  // Payment 4: Settle Installment 1 of Loan 3
  await prisma.payment.create({
    data: {
      receiptNo: 'REC-2026-0004',
      loanId: loan3.id,
      installmentId: createdSchedules3[0].id,
      paymentDate: new Date('2026-04-28T14:00:00Z'),
      amount: new Prisma.Decimal('501.66'),
      paymentMethod: PaymentMethod.QR_PAYMENT,
      referenceNo: 'QR-PROMPT-PAY-1199201',
      receivedBy: cashierUser.id,
      status: PaymentStatus.PAID,
      notes: 'Installment 1 settled in full.'
    }
  });

  // Payment 5: Settle Installment 2 of Loan 3 (Clears loan to 0 balance)
  await prisma.payment.create({
    data: {
      receiptNo: 'REC-2026-0005',
      loanId: loan3.id,
      installmentId: createdSchedules3[1].id,
      paymentDate: new Date('2026-05-30T10:15:00Z'),
      amount: new Prisma.Decimal('501.67'),
      paymentMethod: PaymentMethod.QR_PAYMENT,
      referenceNo: 'QR-PROMPT-PAY-1199304',
      receivedBy: cashierUser.id,
      status: PaymentStatus.PAID,
      notes: 'Final installment payment. Loan marked as COMPLETED.'
    }
  });

  // ==========================================
  // 8. SEED LOAN DOCUMENTS
  // ==========================================
  console.log('📄 Seeding Loan Documents...');

  await prisma.loanDocument.createMany({
    data: [
      {
        entityType: EntityType.BORROWER,
        entityId: borrower1.id,
        documentType: DocumentType.ID_CARD,
        fileName: 'johnathan_doe_national_id.pdf',
        fileUrl: 'https://storage.loansystem.edu/kyc/borrowers/bor-2026-0001/national_id.pdf',
        verificationStatus: VerificationStatus.VERIFIED,
        uploadedBy: loanOfficerUser.id,
        uploadedAt: new Date('2026-08-15T09:40:00Z')
      },
      {
        entityType: EntityType.BORROWER,
        entityId: borrower1.id,
        documentType: DocumentType.EMPLOYMENT_PROOF,
        fileName: 'gta_appointment_letter_fall_2026.pdf',
        fileUrl: 'https://storage.loansystem.edu/kyc/borrowers/bor-2026-0001/gta_appointment.pdf',
        verificationStatus: VerificationStatus.VERIFIED,
        uploadedBy: loanOfficerUser.id,
        uploadedAt: new Date('2026-08-15T09:42:00Z')
      },
      {
        entityType: EntityType.APPLICATION,
        entityId: app1.id,
        documentType: DocumentType.AGREEMENT,
        fileName: 'signed_promissory_note_ln_2026_0001.pdf',
        fileUrl: 'https://storage.loansystem.edu/contracts/app-2026-0001/promissory_note.pdf',
        verificationStatus: VerificationStatus.VERIFIED,
        uploadedBy: loanOfficerUser.id,
        uploadedAt: new Date('2026-08-20T11:00:00Z')
      },
      {
        entityType: EntityType.APPLICATION,
        entityId: app2.id,
        documentType: DocumentType.INCOME_PROOF,
        fileName: 'maria_garcia_work_study_timesheet.pdf',
        fileUrl: 'https://storage.loansystem.edu/kyc/applications/app-2026-0002/income_proof.pdf',
        verificationStatus: VerificationStatus.PENDING,
        uploadedBy: loanOfficerUser.id,
        uploadedAt: new Date('2026-09-02T11:10:00Z')
      }
    ]
  });

  // ==========================================
  // 9. SEED NOTIFICATIONS
  // ==========================================
  console.log('🔔 Seeding System Notifications...');

  await prisma.notification.createMany({
    data: [
      {
        userId: borrowerUser1.id,
        title: 'Loan Application Approved',
        message: 'Congratulations! Your loan application APP-2026-0001 has been approved for $3,000.00 at 4.50% APR.',
        isRead: true,
        type: 'APPROVAL',
        createdAt: new Date('2026-08-18T16:05:00Z')
      },
      {
        userId: borrowerUser1.id,
        title: 'Funds Disbursed',
        message: 'Disbursement of $3,000.00 has been sent to your bank account via ACH transfer (Ref: ACH-TRX-20260901-99201).',
        isRead: true,
        type: 'DISBURSEMENT',
        createdAt: new Date('2026-09-01T10:05:00Z')
      },
      {
        userId: borrowerUser1.id,
        title: 'Payment Confirmation: REC-2026-0001',
        message: 'We have received your installment payment of $511.25. Thank you!',
        isRead: false,
        type: 'PAYMENT',
        createdAt: new Date('2026-09-28T14:16:00Z')
      },
      {
        userId: loanOfficerUser.id,
        title: 'New Emergency Application Submitted',
        message: 'Borrower Maria Garcia submitted application APP-2026-0002 for emergency relief.',
        isRead: true,
        type: 'APPLICATION',
        createdAt: new Date('2026-09-02T11:05:00Z')
      }
    ]
  });

  // ==========================================
  // 10. SEED AUDIT LOGS
  // ==========================================
  console.log('🛡️ Seeding Audit Trail Logs...');

  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'SYSTEM_INITIALIZATION',
        entityName: 'System',
        entityId: 'ROOT',
        details: { description: 'Database seeded with core loan products and administrative roles.' },
        ipAddress: '127.0.0.1',
        timestamp: new Date('2026-08-01T08:00:00Z')
      },
      {
        userId: loanOfficerUser.id,
        action: 'CREATE_LOAN_APPLICATION',
        entityName: 'LoanApplication',
        entityId: app1.id,
        details: { applicationNo: 'APP-2026-0001', borrowerId: borrower1.id, requestedAmount: 3000 },
        ipAddress: '192.168.10.45',
        timestamp: new Date('2026-08-15T09:30:00Z')
      },
      {
        userId: creditOfficerUser.id,
        action: 'SUBMIT_CREDIT_REVIEW',
        entityName: 'ApplicationReview',
        entityId: app1.id,
        details: { recommendation: 'RECOMMEND_APPROVAL', score: 'LowRisk' },
        ipAddress: '192.168.10.12',
        timestamp: new Date('2026-08-17T11:30:00Z')
      },
      {
        userId: managerUser.id,
        action: 'APPROVE_LOAN_APPLICATION',
        entityName: 'ApplicationApproval',
        entityId: app1.id,
        details: { decision: 'APPROVED', approvedAmount: 3000, approvedTerm: 6, rate: 4.5 },
        ipAddress: '192.168.10.2',
        timestamp: new Date('2026-08-18T16:00:00Z')
      },
      {
        userId: cashierUser.id,
        action: 'EXECUTE_DISBURSEMENT',
        entityName: 'Disbursement',
        entityId: loan1.id,
        details: { loanNumber: 'LN-2026-0001', amount: 3000, method: 'BANK_TRANSFER' },
        ipAddress: '192.168.10.88',
        timestamp: new Date('2026-09-01T10:00:00Z')
      },
      {
        userId: cashierUser.id,
        action: 'RECORD_PAYMENT',
        entityName: 'Payment',
        entityId: 'REC-2026-0001',
        details: { receiptNo: 'REC-2026-0001', amount: 511.25, method: 'QR_PAYMENT' },
        ipAddress: '192.168.10.88',
        timestamp: new Date('2026-09-28T14:15:00Z')
      }
    ]
  });

  console.log('✅ Academic Loan Management System seed completed successfully!');
  console.log(`
    📊 Multi-State Seeded Summary:
    -------------------------------------------
    - System Users       : 7 (Admin, Manager, Credit Officer, Loan Officer, Cashier, 2 Borrowers)
    - Loan Products      : 5 (Education, Emergency, Personal, Business, Vehicle)
    - Borrowers          : 5 (with formatted IDs BOR-2026-0001..0005)
    - Loan Applications  : 9 (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CANCELLED)
    - Loans (All States) : 3 (LN-2026-0001 ACTIVE, LN-2026-0002 OVERDUE, LN-2026-0003 COMPLETED)
    - Disbursements      : 3 Completed Electronic Disbursements
    - Repayment Schedules: 12 Amortization Installments (PAID, PARTIAL, OVERDUE, UPCOMING)
    - Payment Receipts   : 5 (REC-2026-0001..0005)
    - KYC Documents      : 4 Uploaded Documents
    - Notifications      : 4 System Notifications
    - Audit Trail Logs   : 6 Security Audit Events
    -------------------------------------------
    🔑 Default password for seeded users: Password123!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
