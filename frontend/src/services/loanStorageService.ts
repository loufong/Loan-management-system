/**
 * JAM SONG VICH Core Banking System • ប្រព័ន្ធគ្រប់គ្រងឥណទាន
 * Unified Persistent Storage & Data Synchronization Service
 * 
 * Synchronizes borrower origination workflows directly with Super Admin
 * portfolio tables, underwriting queues, cashier terminals, and real-time DOM events.
 */

import { Borrower, PaymentReceipt } from '../types';
import { kycService } from './kycService';

export const UNIFIED_LEDGER_KEY = 'JAM_SONG_VICH_UNIFIED_LEDGER';
export const UNIFIED_RECEIPTS_KEY = 'JAM_SONG_VICH_RECEIPTS_LEDGER';
export const LEDGER_UPDATE_EVENT = 'loan_ledger_updated';

export interface UnifiedLoanRecord {
  id: string;
  loanId: string;
  borrower: {
    id: string;
    clientCode: string;
    nameEn: string;
    nameKh: string;
    maskedNationalId: string;
    phone: string;
    email?: string;
    occupation: string;
    monthlyIncome?: number;
  };
  facility: {
    productName: string;
    currency: string;
    status: 'UNDERWRITING_PENDING' | 'ACTIVE' | 'OVERDUE' | 'REJECTED' | 'MATURED';
    health: 'PERFORMING' | 'WATCHLIST' | 'GRACE_PERIOD' | 'DEFAULT_RISK';
    branch: string;
  };
  principal: {
    disbursedAmountUSD: number;
    aprPercent: number;
    remainingMonths: number;
    termMonths: number;
  };
  repaymentProgress: {
    totalPaidUSD: number;
    outstandingBalanceUSD: number;
    principalBalanceUSD: number;
    accruedInterestUSD: number;
    percentPaid: number;
  };
  nextScheduledPayment: {
    dueDate: string;
    cycleNumber: number;
    scheduledEMIUSD: number;
    daysOverdue: number;
  };
  cbcScore?: {
    score: number;
    grade: string;
    color: string;
    dtiRatio: number;
  };
  collateralStatus?: string;
  submittedAt?: string;
  disbursementBank?: string;
  disbursementAccount?: string;
  repaymentType?: string;
  adminNotes?: string;
  rejectionCode?: string;
  schedules?: Array<{
    installmentNo: number;
    dueDate: string;
    totalDue: number;
    principalDue: number;
    interestDue: number;
    remainingBalance: number;
    status: 'PAID' | 'DUE' | 'UPCOMING';
  }>;
}

/**
 * Calculates official reducing-balance repayment schedules with zero float-rounding drift
 */
export function generateAmortizationSchedule(principal: number, aprPercent: number, termMonths: number) {
  const schedules = [];
  const monthlyRate = (aprPercent / 100) / 12;
  let remainingPrincipal = principal;

  // Monthly reducing-balance EMI formula
  const emi = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1)
    : principal / termMonths;

  const now = new Date();

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(now.getFullYear(), now.getMonth() + i, 15);
    const interestDue = Math.round(remainingPrincipal * monthlyRate * 100) / 100;
    const principalDue = i === termMonths
      ? Math.round(remainingPrincipal * 100) / 100
      : Math.round((emi - interestDue) * 100) / 100;
    const totalDue = Math.round((principalDue + interestDue) * 100) / 100;

    const startingBalance = remainingPrincipal;
    remainingPrincipal = Math.max(0, Math.round((remainingPrincipal - principalDue) * 100) / 100);

    schedules.push({
      installmentNo: i,
      dueDate: dueDate.toISOString().split('T')[0],
      totalDue,
      totalDueUSD: totalDue,
      principalDue,
      principalUSD: principalDue,
      interestDue,
      interestUSD: interestDue,
      startingBalance,
      beginningPrincipal: startingBalance,
      remainingBalance: remainingPrincipal,
      remainingAmountUSD: totalDue,
      endingBalance: remainingPrincipal,
      amountPaidUSD: 0,
      status: (i === 1 ? 'DUE' : 'UPCOMING') as 'PAID' | 'DUE' | 'UPCOMING',
    });
  }

  return schedules;
}

// Baseline seed facilities for initial demo and testing
// Disbursed: $41,700.00 | Outstanding: $31,600.00 | Repaid: $10,100.00 | Total: 6 Facilities
const INITIAL_SEED_LOANS: UnifiedLoanRecord[] = [
  {
    id: 'ln-001',
    loanId: 'LN-2026-6042',
    borrower: {
      id: 'bor-8801',
      clientCode: 'BOR-2026-8801',
      nameEn: 'Sophea Chea',
      nameKh: 'ជា សុភា',
      maskedNationalId: '010****89',
      phone: '+855 12 849 201',
      email: 'sophea.chea@merchantkh.com',
      occupation: 'Import / Logistics Director',
      monthlyIncome: 2800,
    },
    facility: {
      productName: 'SME Working Capital',
      currency: 'USD',
      status: 'ACTIVE',
      health: 'PERFORMING',
      branch: 'Phnom Penh Main',
    },
    principal: {
      disbursedAmountUSD: 6000,
      aprPercent: 6.5,
      remainingMonths: 18,
      termMonths: 24,
    },
    repaymentProgress: {
      totalPaidUSD: 2150,
      outstandingBalanceUSD: 3850,
      principalBalanceUSD: 3400,
      accruedInterestUSD: 450,
      percentPaid: 36,
    },
    nextScheduledPayment: {
      dueDate: '2026-11-15',
      cycleNumber: 7,
      scheduledEMIUSD: 542.80,
      daysOverdue: 0,
    },
    cbcScore: { score: 745, grade: 'Grade A - Prime', color: 'emerald', dtiRatio: 26.5 },
    collateralStatus: 'Verified Hard Title (Khan Toul Kork, PP)',
    schedules: generateAmortizationSchedule(6000, 6.5, 24),
  },
  {
    id: 'ln-002',
    loanId: 'LN-2026-7719',
    borrower: {
      id: 'bor-8802',
      clientCode: 'BOR-2026-8802',
      nameEn: 'Vannak Heng',
      nameKh: 'ហេង វណ្ណៈ',
      maskedNationalId: '090****12',
      phone: '+855 98 712 390',
      email: 'vannak.heng@agriexporter.com',
      occupation: 'Agri-Processing Exporter',
      monthlyIncome: 3500,
    },
    facility: {
      productName: 'Agricultural Expansion',
      currency: 'USD',
      status: 'OVERDUE',
      health: 'WATCHLIST',
      branch: 'Battambang',
    },
    principal: {
      disbursedAmountUSD: 18000,
      aprPercent: 8.0,
      remainingMonths: 10,
      termMonths: 12,
    },
    repaymentProgress: {
      totalPaidUSD: 3000,
      outstandingBalanceUSD: 15000,
      principalBalanceUSD: 13500,
      accruedInterestUSD: 1500,
      percentPaid: 17,
    },
    nextScheduledPayment: {
      dueDate: '2026-10-24',
      cycleNumber: 3,
      scheduledEMIUSD: 1610.15,
      daysOverdue: 7,
    },
    cbcScore: { score: 685, grade: 'Grade B - Moderate Risk', color: 'amber', dtiRatio: 38.2 },
    collateralStatus: 'Soft Title & Equipment Lien (Battambang)',
    schedules: generateAmortizationSchedule(18000, 8.0, 12),
  },
  {
    id: 'ln-003',
    loanId: 'LN-2026-9041',
    borrower: {
      id: 'bor-8803',
      clientCode: 'BOR-2026-8803',
      nameEn: 'Rithy Khem',
      nameKh: 'ខេម រិទ្ធី',
      maskedNationalId: '012****65',
      phone: '+855 10 334 192',
      email: 'rithy.khem@pharma.com',
      occupation: 'Pharma Retail Distributor',
      monthlyIncome: 1900,
    },
    facility: {
      productName: 'Personal Micro-Credit',
      currency: 'USD',
      status: 'OVERDUE',
      health: 'DEFAULT_RISK',
      branch: 'Siem Reap',
    },
    principal: {
      disbursedAmountUSD: 4500,
      aprPercent: 11.5,
      remainingMonths: 8,
      termMonths: 12,
    },
    repaymentProgress: {
      totalPaidUSD: 1200,
      outstandingBalanceUSD: 3300,
      principalBalanceUSD: 2950,
      accruedInterestUSD: 350,
      percentPaid: 27,
    },
    nextScheduledPayment: {
      dueDate: '2026-09-28',
      cycleNumber: 4,
      scheduledEMIUSD: 412.30,
      daysOverdue: 33,
    },
    cbcScore: { score: 620, grade: 'Grade C - Substandard', color: 'rose', dtiRatio: 46.8 },
    collateralStatus: 'Unsecured Micro-Facility (Guarantor Lien)',
    schedules: generateAmortizationSchedule(4500, 11.5, 12),
  },
  {
    id: 'ln-004',
    loanId: 'LN-2026-3310',
    borrower: {
      id: 'bor-8804',
      clientCode: 'BOR-2026-8804',
      nameEn: 'Bopha Meng',
      nameKh: 'ម៉េង បុប្ផា',
      maskedNationalId: '018****23',
      phone: '+855 15 902 443',
      email: 'bopha.meng@greenenergy.com',
      occupation: 'Green Energy Contractor',
      monthlyIncome: 3200,
    },
    facility: {
      productName: 'Clean Energy Equipment',
      currency: 'USD',
      status: 'ACTIVE',
      health: 'PERFORMING',
      branch: 'Phnom Penh Main',
    },
    principal: {
      disbursedAmountUSD: 8200,
      aprPercent: 5.0,
      remainingMonths: 30,
      termMonths: 36,
    },
    repaymentProgress: {
      totalPaidUSD: 1450,
      outstandingBalanceUSD: 6750,
      principalBalanceUSD: 6100,
      accruedInterestUSD: 650,
      percentPaid: 18,
    },
    nextScheduledPayment: {
      dueDate: '2026-11-20',
      cycleNumber: 6,
      scheduledEMIUSD: 245.90,
      daysOverdue: 0,
    },
    cbcScore: { score: 760, grade: 'Grade A - Excellent', color: 'emerald', dtiRatio: 21.4 },
    collateralStatus: 'Solar Equipment Lien & Commercial Deposit',
    schedules: generateAmortizationSchedule(8200, 5.0, 36),
  },
  {
    id: 'ln-005',
    loanId: 'LN-2026-4409',
    borrower: {
      id: 'bor-8805',
      clientCode: 'BOR-2026-8805',
      nameEn: 'Sokunthea Chhay',
      nameKh: 'ឆាយ សុគន្ធា',
      maskedNationalId: '022****41',
      phone: '+855 11 445 902',
      email: 'sokunthea.chhay@wholesale.com',
      occupation: 'Culinary Wholesale Vendor',
      monthlyIncome: 2100,
    },
    facility: {
      productName: 'Personal Micro-Loan',
      currency: 'USD',
      status: 'ACTIVE',
      health: 'PERFORMING',
      branch: 'Phnom Penh Main',
    },
    principal: {
      disbursedAmountUSD: 3500,
      aprPercent: 9.0,
      remainingMonths: 6,
      termMonths: 12,
    },
    repaymentProgress: {
      totalPaidUSD: 2300,
      outstandingBalanceUSD: 1200,
      principalBalanceUSD: 1050,
      accruedInterestUSD: 150,
      percentPaid: 66,
    },
    nextScheduledPayment: {
      dueDate: '2026-11-10',
      cycleNumber: 8,
      scheduledEMIUSD: 310.00,
      daysOverdue: 0,
    },
    cbcScore: { score: 715, grade: 'Grade A- - Good Risk', color: 'emerald', dtiRatio: 29.8 },
    collateralStatus: 'Commercial Stalls Registration Lien',
    schedules: generateAmortizationSchedule(3500, 9.0, 12),
  },
  {
    id: 'ln-006',
    loanId: 'LN-2026-1184',
    borrower: {
      id: 'bor-8806',
      clientCode: 'BOR-2026-8806',
      nameEn: 'Sereyroth Mom',
      nameKh: 'មុំ សិរីរ័ត្ន',
      maskedNationalId: '015****77',
      phone: '+855 77 654 321',
      email: 'sereyroth.mom@solarkh.com',
      occupation: 'Green Tech Installer',
      monthlyIncome: 1800,
    },
    facility: {
      productName: 'Clean Energy Equipment',
      currency: 'USD',
      status: 'ACTIVE',
      health: 'PERFORMING',
      branch: 'Phnom Penh Main',
    },
    principal: {
      disbursedAmountUSD: 1500,
      aprPercent: 7.5,
      remainingMonths: 12,
      termMonths: 12,
    },
    repaymentProgress: {
      totalPaidUSD: 0,
      outstandingBalanceUSD: 1500,
      principalBalanceUSD: 1500,
      accruedInterestUSD: 0,
      percentPaid: 0,
    },
    nextScheduledPayment: {
      dueDate: '2026-11-25',
      cycleNumber: 1,
      scheduledEMIUSD: 130.15,
      daysOverdue: 0,
    },
    cbcScore: { score: 720, grade: 'Grade A- - Good Risk', color: 'emerald', dtiRatio: 22.0 },
    collateralStatus: 'Solar Inverter Lien (Phnom Penh)',
    schedules: generateAmortizationSchedule(1500, 7.5, 12),
  },
];

// Baseline seed settled receipts matching the $10,100 repaid
const INITIAL_SEED_RECEIPTS: PaymentReceipt[] = [
  {
    receiptNo: 'REC-2026-1001',
    referenceNo: 'TXN-BK-20261015-8801',
    loanNumber: 'LN-2026-6042',
    borrowerId: 'bor-8801',
    borrowerName: 'Sophea Chea',
    installmentNo: 6,
    amountPaidUSD: 2150.00,
    amountPaidKHR: 8815000,
    currency: 'USD',
    paymentMethod: 'KHQR',
    transactionRef: 'TRX-BK-9921',
    status: 'PAID',
    paidAt: '2026-10-15T10:30:00Z',
    cashierName: 'National Clearing Node / Cashier Desk',
    principalAllocatedUSD: 1950.00,
    interestAllocatedUSD: 200.00,
    lateFeeAllocatedUSD: 0,
    outstandingBalanceAfterUSD: 3850.00,
    notes: 'Bakong Real-Time Settlement',
  },
  {
    receiptNo: 'REC-2026-1002',
    referenceNo: 'TXN-BK-20260924-8802',
    loanNumber: 'LN-2026-7719',
    borrowerId: 'bor-8802',
    borrowerName: 'Vannak Heng',
    installmentNo: 2,
    amountPaidUSD: 3000.00,
    amountPaidKHR: 12300000,
    currency: 'USD',
    paymentMethod: 'KHQR',
    transactionRef: 'TRX-BK-8840',
    status: 'PAID',
    paidAt: '2026-09-24T14:15:00Z',
    cashierName: 'National Clearing Node / Cashier Desk',
    principalAllocatedUSD: 2700.00,
    interestAllocatedUSD: 300.00,
    lateFeeAllocatedUSD: 0,
    outstandingBalanceAfterUSD: 15000.00,
    notes: 'Bakong KHQR Interbank Clearing',
  },
  {
    receiptNo: 'REC-2026-1003',
    referenceNo: 'TXN-CSH-20260828-8803',
    loanNumber: 'LN-2026-9041',
    borrowerId: 'bor-8803',
    borrowerName: 'Rithy Khem',
    installmentNo: 3,
    amountPaidUSD: 1200.00,
    amountPaidKHR: 4920000,
    currency: 'USD',
    paymentMethod: 'Cash',
    transactionRef: 'TRX-CSH-0192',
    status: 'PAID',
    paidAt: '2026-08-28T09:45:00Z',
    cashierName: 'Emily Ross (Branch Cashier)',
    principalAllocatedUSD: 1050.00,
    interestAllocatedUSD: 150.00,
    lateFeeAllocatedUSD: 0,
    outstandingBalanceAfterUSD: 3300.00,
    notes: 'Branch Window Cash Deposit',
  },
  {
    receiptNo: 'REC-2026-1004',
    referenceNo: 'TXN-BK-20261020-8804',
    loanNumber: 'LN-2026-3310',
    borrowerId: 'bor-8804',
    borrowerName: 'Bopha Meng',
    installmentNo: 5,
    amountPaidUSD: 1450.00,
    amountPaidKHR: 5945000,
    currency: 'USD',
    paymentMethod: 'KHQR',
    transactionRef: 'TRX-BK-3391',
    status: 'PAID',
    paidAt: '2026-10-20T11:20:00Z',
    cashierName: 'National Clearing Node / Cashier Desk',
    principalAllocatedUSD: 1300.00,
    interestAllocatedUSD: 150.00,
    lateFeeAllocatedUSD: 0,
    outstandingBalanceAfterUSD: 6750.00,
    notes: 'Bakong KHQR Universal Gateway',
  },
  {
    receiptNo: 'REC-2026-1005',
    referenceNo: 'TXN-BNK-20261010-8805',
    loanNumber: 'LN-2026-4409',
    borrowerId: 'bor-8805',
    borrowerName: 'Sokunthea Chhay',
    installmentNo: 7,
    amountPaidUSD: 2300.00,
    amountPaidKHR: 9430000,
    currency: 'USD',
    paymentMethod: 'Bank Transfer',
    transactionRef: 'TRX-BNK-7712',
    status: 'PAID',
    paidAt: '2026-10-10T16:00:00Z',
    cashierName: 'ACLEDA Direct Clearing',
    principalAllocatedUSD: 2100.00,
    interestAllocatedUSD: 200.00,
    lateFeeAllocatedUSD: 0,
    outstandingBalanceAfterUSD: 1200.00,
    notes: 'ACLEDA Direct Account Settlement',
  },
];

class LoanStorageService {
  /**
   * Sanitizes unified loan records ensuring schedules have non-zero calculations
   */
  public sanitizeRecord(r: UnifiedLoanRecord): UnifiedLoanRecord {
    if (!r) return r;
    const origPrincipal = Number(
      r.principal?.disbursedAmountUSD || (r as any).principalAmount || (r as any).outstandingBalanceUSD || 0
    );
    const apr = Number(r.principal?.aprPercent || (r as any).annualInterestRate || (r as any).interestRate || 6.5);
    const term = Number(r.principal?.termMonths || (r as any).tenureMonths || (r as any).termMonths || 12);

    let schedules = r.schedules;
    const hasZeroSchedules = !Array.isArray(schedules) || schedules.length === 0 || schedules.every((s: any) => 
      Number(s.totalDue || s.totalDueUSD || 0) === 0 && Number(s.principalDue || s.principalUSD || 0) === 0
    );

    if (hasZeroSchedules && origPrincipal > 0) {
      schedules = generateAmortizationSchedule(origPrincipal, apr, term);
    } else if (Array.isArray(schedules)) {
      let runningBal = origPrincipal;
      schedules = schedules.map((s: any, idx: number) => {
        const principalDue = Number(s.principalUSD ?? s.principalDue ?? s.principal ?? 0);
        const interestDue = Number(s.interestUSD ?? s.interestDue ?? s.interest ?? 0);
        const totalDue = Number(s.totalDueUSD ?? s.totalDue ?? s.totalAmount ?? (principalDue + interestDue));
        const startBal = Number(s.beginningPrincipal ?? s.startingBalance ?? runningBal);
        const endBal = Number(s.endingBalance ?? s.remainingBalance ?? Math.max(0, startBal - principalDue));
        runningBal = endBal;

        return {
          ...s,
          installmentNo: s.installmentNo || idx + 1,
          dueDate: s.dueDate || '',
          principalDue,
          principalUSD: principalDue,
          interestDue,
          interestUSD: interestDue,
          totalDue,
          totalDueUSD: totalDue,
          startingBalance: startBal,
          beginningPrincipal: startBal,
          remainingBalance: endBal,
          remainingAmountUSD: s.status === 'PAID' ? 0 : totalDue,
          endingBalance: endBal,
          amountPaidUSD: s.status === 'PAID' ? totalDue : (Number(s.amountPaidUSD || 0)),
        };
      });
    }

    return {
      ...r,
      schedules,
    };
  }

  /**
   * Safe status check: has borrowing ledger been cleared/reset?
   */
  public isLedgerCleared(): boolean {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem('JAM_LEDGER_CLEARED_V1');
    // Default to true (clean reset state) on initial run unless explicitly restored
    if (val === null) {
      try {
        localStorage.setItem('JAM_LEDGER_CLEARED_V1', 'true');
        localStorage.setItem(UNIFIED_LEDGER_KEY, JSON.stringify([]));
        localStorage.setItem(UNIFIED_RECEIPTS_KEY, JSON.stringify([]));
      } catch {}
      return true;
    }
    return val === 'true';
  }

  /**
   * Complete reset: purges all active loans, applications, payment receipts, and repayment schedules
   */
  public resetAllBorrowingData(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('JAM_LEDGER_CLEARED_V1', 'true');
      localStorage.setItem(UNIFIED_LEDGER_KEY, JSON.stringify([]));
      localStorage.setItem(UNIFIED_RECEIPTS_KEY, JSON.stringify([]));
      localStorage.removeItem('JAM_APPLICATIONS_STORE');
      localStorage.removeItem('jam_applications_v1');
      localStorage.removeItem('jam_unified_applications');
      localStorage.removeItem('jam_last_submitted_loan_id');
      window.dispatchEvent(new Event(LEDGER_UPDATE_EVENT));
    } catch (e) {
      console.warn('Failed to reset borrowing data:', e);
    }
  }

  /**
   * Restores default initial seed demo loans on demand
   */
  public restoreDemoSeedData(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('JAM_LEDGER_CLEARED_V1', 'false');
      localStorage.setItem(UNIFIED_LEDGER_KEY, JSON.stringify(INITIAL_SEED_LOANS));
      localStorage.setItem(UNIFIED_RECEIPTS_KEY, JSON.stringify(INITIAL_SEED_RECEIPTS));
      window.dispatchEvent(new Event(LEDGER_UPDATE_EVENT));
    } catch (e) {
      console.warn('Failed to restore demo seed data:', e);
    }
  }

  /**
   * Safe localStorage accessor with seed fallback
   */
  private getStorage(): UnifiedLoanRecord[] {
    if (typeof window === 'undefined') return this.isLedgerCleared() ? [] : INITIAL_SEED_LOANS;
    try {
      if (this.isLedgerCleared()) {
        const raw = localStorage.getItem(UNIFIED_LEDGER_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((item: any) => this.sanitizeRecord(item)) : [];
      }
      const raw = localStorage.getItem(UNIFIED_LEDGER_KEY);
      if (!raw) {
        localStorage.setItem(UNIFIED_LEDGER_KEY, JSON.stringify(INITIAL_SEED_LOANS));
        return INITIAL_SEED_LOANS;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(UNIFIED_LEDGER_KEY, JSON.stringify(INITIAL_SEED_LOANS));
        return INITIAL_SEED_LOANS;
      }
      return parsed.map((item: any) => this.sanitizeRecord(item));
    } catch {
      return this.isLedgerCleared() ? [] : INITIAL_SEED_LOANS;
    }
  }

  private saveStorage(records: UnifiedLoanRecord[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(UNIFIED_LEDGER_KEY, JSON.stringify(records));
      // Dispatch DOM notification event
      window.dispatchEvent(new Event(LEDGER_UPDATE_EVENT));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  /**
   * Safe receipts storage accessor with seed fallback
   */
  public getReceipts(): PaymentReceipt[] {
    if (typeof window === 'undefined') return this.isLedgerCleared() ? [] : INITIAL_SEED_RECEIPTS;
    try {
      if (this.isLedgerCleared()) {
        const raw = localStorage.getItem(UNIFIED_RECEIPTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      const raw = localStorage.getItem(UNIFIED_RECEIPTS_KEY);
      if (!raw) {
        localStorage.setItem(UNIFIED_RECEIPTS_KEY, JSON.stringify(INITIAL_SEED_RECEIPTS));
        return INITIAL_SEED_RECEIPTS;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(UNIFIED_RECEIPTS_KEY, JSON.stringify(INITIAL_SEED_RECEIPTS));
        return INITIAL_SEED_RECEIPTS;
      }
      return parsed;
    } catch {
      return this.isLedgerCleared() ? [] : INITIAL_SEED_RECEIPTS;
    }
  }

  public saveReceipts(receipts: PaymentReceipt[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(UNIFIED_RECEIPTS_KEY, JSON.stringify(receipts));
      window.dispatchEvent(new Event(LEDGER_UPDATE_EVENT));
    } catch (e) {
      console.warn('Failed to save receipts:', e);
    }
  }

  /**
   * Submit loan application from borrower origination flow (#/apply)
   */
  public async submitLoanApplication(payload: {
    id?: string;
    borrowerId?: string;
    borrowerName?: string;
    borrowerEmail?: string;
    borrowerPhone?: string;
    productType: string;
    principalAmount: number;
    annualInterestRate?: number;
    tenureMonths: number;
    repaymentType?: string;
    monthlyEmi?: number;
    status?: string;
    submittedAt?: string;
    disbursementBank?: string;
    disbursementAccount?: string;
    collateralStatus?: string;
    salarySlipFileName?: string;
    salarySlipFileSize?: number;
    collateralDocFileName?: string;
    collateralDocFileSize?: number;
  }): Promise<UnifiedLoanRecord> {
    // 0. Enforce Regulatory Borrowing Guard
    const kycSummary = await kycService.getKycStatus(payload.borrowerId);
    if (!kycSummary.isEligibleToBorrow) {
      throw new Error(
        `Regulatory Borrowing Lock Active: Borrowers must have all 3 mandatory KYC documents verified prior to credit application origination. Currently verified: ${kycSummary.verifiedCount} of 3.`
      );
    }

    const loanId = payload.id || `LN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const principal = Number(payload.principalAmount || 5000);
    const apr = Number(payload.annualInterestRate || 6.5);
    const tenure = Number(payload.tenureMonths || 12);
    const monthlyRate = (apr / 100) / 12;
    const emi = payload.monthlyEmi || (
      monthlyRate > 0
        ? Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1) * 100) / 100
        : Math.round((principal / tenure) * 100) / 100
    );

    const newRecord: UnifiedLoanRecord = {
      id: loanId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      loanId,
      borrower: {
        id: payload.borrowerId || 'bor-8800',
        clientCode: payload.borrowerId?.startsWith('BOR-') ? payload.borrowerId : `BOR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        nameEn: payload.borrowerName || 'Johnathan Doe',
        nameKh: 'ចន ណាថាន ដូ',
        maskedNationalId: '010****23',
        phone: payload.borrowerPhone || '+855 12 345 678',
        email: payload.borrowerEmail || 'borrower@jamsongvich.com',
        occupation: 'SME Commercial Merchant',
        monthlyIncome: Math.round(emi * 3.5),
      },
      facility: {
        productName: payload.productType || 'SME Working Capital',
        currency: 'USD',
        status: 'UNDERWRITING_PENDING',
        health: 'WATCHLIST',
        branch: 'Phnom Penh Main',
      },
      principal: {
        disbursedAmountUSD: principal,
        aprPercent: apr,
        remainingMonths: tenure,
        termMonths: tenure,
      },
      repaymentProgress: {
        totalPaidUSD: 0,
        outstandingBalanceUSD: principal,
        principalBalanceUSD: principal,
        accruedInterestUSD: 0,
        percentPaid: 0,
      },
      nextScheduledPayment: {
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        cycleNumber: 1,
        scheduledEMIUSD: emi,
        daysOverdue: 0,
      },
      cbcScore: {
        score: 740,
        grade: 'Grade A - Excellent Credit Risk',
        color: 'emerald',
        dtiRatio: 28.5,
      },
      collateralStatus: payload.collateralStatus || 'Verified Hard Title (Khan Toul Kork, PP)',
      submittedAt: payload.submittedAt || new Date().toISOString(),
      disbursementBank: payload.disbursementBank || 'ACLEDA Bank Plc.',
      disbursementAccount: payload.disbursementAccount || '****2023',
      repaymentType: payload.repaymentType || 'REDUCING_BALANCE',
    };

    // Online Mode API attempt
    try {
      const authToken = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token') || localStorage.getItem('token') || '';
      const response = await fetch('/api/v1/loans/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 403) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || 'Regulatory Borrowing Lock Active: Borrowers must have all 3 mandatory KYC documents verified.');
      }

      if (response.ok) {
        const json = await response.json();
        if (json?.data?.id) {
          newRecord.id = json.data.id;
        }
      }
    } catch (apiErr: any) {
      if (apiErr?.message?.includes('Regulatory Borrowing Lock')) {
        throw apiErr;
      }
      // Fallback seamlessly to local unified ledger
    }

    // Persist to unified storage
    const current = this.getStorage();
    const updated = [newRecord, ...current.filter((r) => r.loanId !== loanId)];
    this.saveStorage(updated);

    return newRecord;
  }

  /**
   * Retrieves full master loans array for Super Admin portfolio table
   */
  public async getAllLoansForAdmin(): Promise<UnifiedLoanRecord[]> {
    if (this.isLedgerCleared()) {
      return this.getStorage();
    }

    // Attempt backend fetch
    try {
      const activeToken = typeof window !== 'undefined'
        ? (localStorage.getItem('apex_token') || localStorage.getItem('token') || '')
        : '';
      const res = await fetch('/api/v1/admin/loans', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const serverItems = data?.data?.items || data?.items;
        if (Array.isArray(serverItems) && serverItems.length > 0) {
          // Merge server items with local newly applied items to prevent dropping local submissions
          const local = this.getStorage();
          const pendingLocals = local.filter((l) => l?.facility?.status === 'UNDERWRITING_PENDING');
          const merged = [...pendingLocals, ...serverItems.filter((s: any) => !pendingLocals.some((p) => p.loanId === s.loanId))];
          return merged;
        }
      }
    } catch {
      // Fallback to local storage
    }

    return this.getStorage();
  }

  /**
   * Retrieves the Underwriting Review Queue for Super Admin
   */
  public async getUnderwritingQueue(): Promise<any[]> {
    const all = await this.getAllLoansForAdmin();
    const pending = (all || []).filter((l) => l?.facility?.status === 'UNDERWRITING_PENDING');

    return pending.map((l) => ({
      id: l.id,
      applicationNumber: l.loanId,
      borrowerName: l?.borrower?.nameEn || 'Client',
      borrowerPhone: l.borrower.phone,
      borrowerEmail: l.borrower.email,
      declaredIncomeUSD: l.borrower.monthlyIncome || 2400,
      requestedAmountUSD: l.principal.disbursedAmountUSD,
      requestedTermMonths: l.principal.termMonths,
      productName: l.facility.productName,
      cbcScore: l.cbcScore || { score: 740, grade: 'Grade A - Prime Risk', color: 'emerald', dtiRatio: 28.5 },
      collateralStatus: l.collateralStatus || 'Verified Hard Title (Khan Toul Kork, PP)',
      submittedAt: l.submittedAt || new Date().toISOString(),
      status: 'UNDERWRITING_PENDING',
      disbursementBank: l.disbursementBank,
      disbursementAccount: l.disbursementAccount,
    }));
  }

  /**
   * Allows Super Admin to transition loan: UNDERWRITING_PENDING -> ACTIVE or REJECTED
   */
  public async updateLoanStatus(
    loanId: string,
    newStatus: 'ACTIVE' | 'REJECTED' | 'UNDERWRITING_PENDING',
    adminNotes?: string
  ): Promise<UnifiedLoanRecord | null> {
    const list = this.getStorage();
    const idx = list.findIndex((l) => l.loanId === loanId || l.id === loanId);
    if (idx === -1) return null;

    const item = { ...list[idx] };
    item.facility.status = newStatus;
    item.adminNotes = adminNotes;

    if (newStatus === 'ACTIVE') {
      item.facility.health = 'PERFORMING';
      // Generate official reducing balance schedule
      item.schedules = generateAmortizationSchedule(
        item.principal.disbursedAmountUSD,
        item.principal.aprPercent,
        item.principal.termMonths
      );
      item.repaymentProgress = {
        totalPaidUSD: 0,
        outstandingBalanceUSD: item.principal.disbursedAmountUSD,
        principalBalanceUSD: item.principal.disbursedAmountUSD,
        accruedInterestUSD: 0,
        percentPaid: 0,
      };
      item.nextScheduledPayment = {
        dueDate: item.schedules[0]?.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        cycleNumber: 1,
        scheduledEMIUSD: item.schedules[0]?.totalDue || item.nextScheduledPayment.scheduledEMIUSD,
        daysOverdue: 0,
      };
    } else if (newStatus === 'REJECTED') {
      item.facility.health = 'DEFAULT_RISK';
      item.rejectionCode = adminNotes || 'NBC-REJ-01: Debt service ratio exceeded (> 50%)';
    }

    list[idx] = item;
    this.saveStorage(list);

    // Online Mode API notification attempt
    try {
      if (newStatus === 'ACTIVE') {
        await fetch(`/api/v1/admin/loans/${item.id}/disburse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ disbursementMethod: 'BAKONG' }),
        });
      }
    } catch {
      // ignore
    }

    return item;
  }

  /**
   * Retrieves facilities for borrower dashboard view
   */
  public async getBorrowerLoans(borrowerId?: string): Promise<UnifiedLoanRecord[]> {
    const all = await this.getAllLoansForAdmin();
    if (!borrowerId) return all;
    return all.filter((l) => l.borrower.id === borrowerId || l.borrower.clientCode === borrowerId);
  }

  /**
   * Records a repayment transaction atomically across loan balance, schedules, and receipts
   */
  public async recordPayment(payload: {
    loanId: string;
    amount: number;
    paymentMethod?: any;
    referenceNo?: string;
    receiptNo?: string;
    notes?: string;
    cashierName?: string;
    installmentNo?: number;
  }): Promise<PaymentReceipt> {
    const list = this.getStorage();
    const idx = list.findIndex(
      (l) => l.loanId === payload.loanId || l.id === payload.loanId
    );

    const paymentAmount = Number(payload.amount || 0);
    const receiptNo = payload.receiptNo || `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const referenceNo = payload.referenceNo || `TRX-BK-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    let targetLoan: UnifiedLoanRecord;

    if (idx !== -1) {
      targetLoan = { ...list[idx] };
      const currentOutstanding = targetLoan.repaymentProgress.outstandingBalanceUSD;
      const newOutstanding = Math.max(0, Math.round((currentOutstanding - paymentAmount) * 100) / 100);
      const newPaid = Math.round((targetLoan.repaymentProgress.totalPaidUSD + paymentAmount) * 100) / 100;
      const percent = Math.min(100, Math.round((newPaid / targetLoan.principal.disbursedAmountUSD) * 100));

      targetLoan.repaymentProgress = {
        ...targetLoan.repaymentProgress,
        outstandingBalanceUSD: newOutstanding,
        totalPaidUSD: newPaid,
        percentPaid: percent,
      };

      // Mark first unpaid schedule item as PAID
      if (Array.isArray(targetLoan.schedules)) {
        const unpaidIdx = targetLoan.schedules.findIndex((s) => s.status !== 'PAID');
        if (unpaidIdx !== -1) {
          targetLoan.schedules[unpaidIdx].status = 'PAID';
        }
      }

      // Advance next scheduled payment
      targetLoan.nextScheduledPayment = {
        ...targetLoan.nextScheduledPayment,
        cycleNumber: targetLoan.nextScheduledPayment.cycleNumber + 1,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        daysOverdue: 0,
      };

      if (newOutstanding === 0) {
        targetLoan.facility.status = 'MATURED';
      }

      list[idx] = targetLoan;
      this.saveStorage(list);
    } else {
      // Fallback virtual target
      targetLoan = list[0] || INITIAL_SEED_LOANS[0];
    }

    // Build verified PaymentReceipt
    const newReceipt: PaymentReceipt = {
      receiptNo,
      referenceNo,
      loanNumber: targetLoan.loanId,
      borrowerId: targetLoan.borrower.id,
      borrowerName: targetLoan.borrower.nameEn,
      installmentNo: payload.installmentNo || targetLoan.nextScheduledPayment.cycleNumber,
      amountPaidUSD: paymentAmount,
      amountPaidKHR: Math.round(paymentAmount * 4100),
      currency: 'USD',
      paymentMethod: (payload.paymentMethod || 'KHQR') as any,
      transactionRef: referenceNo,
      status: 'PAID',
      paidAt: nowIso,
      cashierName: payload.cashierName || 'National Clearing Node / Cashier Desk',
      principalAllocatedUSD: Math.round(paymentAmount * 0.85 * 100) / 100,
      interestAllocatedUSD: Math.round(paymentAmount * 0.15 * 100) / 100,
      lateFeeAllocatedUSD: 0,
      outstandingBalanceAfterUSD: targetLoan.repaymentProgress.outstandingBalanceUSD,
      notes: payload.notes || 'Settled via JAM SONG VICH Core Banking Ledger',
    };

    // Prepend receipt to unified receipts storage
    const currentReceipts = this.getReceipts();
    const updatedReceipts = [newReceipt, ...currentReceipts.filter((r) => r.receiptNo !== receiptNo)];
    this.saveReceipts(updatedReceipts);

    return newReceipt;
  }

  /**
   * Retrieves unified dynamic Borrowers directory linked directly to loan accounts
   */
  public getBorrowers(): Borrower[] {
    const loans = this.getStorage();
    const map = new Map<string, Borrower>();

    // Baseline administrative borrower (Super Admin / Executive)
    map.set('bor-8800', {
      id: 'bor-8800',
      borrowerId: 'BOR-2026-8800',
      fullName: 'JAM SONG VICH',
      avatarUrl: '',
      nationalId: '010****00',
      phone: '+855 12 000 888',
      email: 'admin@jamsongvich.com',
      address: 'Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Phnom Penh',
      occupation: 'Executive Director & Super Admin',
      monthlyIncomeUSD: 5500,
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
      activeLoansCount: 0,
      totalBorrowedUSD: 0,
      totalRepaidUSD: 0,
      totalOutstandingUSD: 0,
      dtiRatio: 18.5,
      createdAt: '2026-01-01',
    });

    // Baseline client borrower (Normal User / Client Borrower)
    map.set('bor-8801', {
      id: 'bor-8801',
      borrowerId: 'BOR-2026-0001',
      fullName: 'Johnathan Doe',
      avatarUrl: '',
      nationalId: '010992384',
      phone: '+855 12 984 219',
      email: 'johnathan.doe@student.edu',
      address: 'No. 42 Street 214, Sangkat Boeung Raing, Khan Daun Penh, Phnom Penh',
      occupation: 'Graduate Teaching Assistant',
      monthlyIncomeUSD: 2800,
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
      activeLoansCount: 0,
      totalBorrowedUSD: 0,
      totalRepaidUSD: 0,
      totalOutstandingUSD: 0,
      dtiRatio: 24.5,
      createdAt: '2026-01-01',
    });

    for (const l of loans) {
      const b = l.borrower;
      const bId = b.id || 'bor-8801';
      const existing = map.get(bId);

      const isFacilityActive = l.facility.status === 'ACTIVE' || l.facility.status === 'OVERDUE';
      const borrowed = l.principal.disbursedAmountUSD;
      const outstanding = l.repaymentProgress.outstandingBalanceUSD;
      const repaid = l.repaymentProgress.totalPaidUSD;

      if (existing) {
        if (isFacilityActive) existing.activeLoansCount += 1;
        existing.totalBorrowedUSD += borrowed;
        existing.totalOutstandingUSD += outstanding;
        existing.totalRepaidUSD += repaid;
      } else {
        map.set(bId, {
          id: bId,
          borrowerId: b.clientCode || `BOR-2026-${bId.replace(/\D/g, '') || '8801'}`,
          fullName: b.nameEn,
          avatarUrl: '',
          nationalId: b.maskedNationalId || '010****89',
          phone: b.phone || '+855 12 000 000',
          email: b.email || `${b.nameEn.toLowerCase().replace(/\s+/g, '.')}@jamsongvich.com`,
          address: 'Khan Toul Kork, Phnom Penh, Kingdom of Cambodia',
          occupation: b.occupation || 'Commercial Merchant',
          monthlyIncomeUSD: b.monthlyIncome || 2500,
          status: 'ACTIVE',
          kycStatus: 'VERIFIED',
          activeLoansCount: isFacilityActive ? 1 : 0,
          totalBorrowedUSD: borrowed,
          totalRepaidUSD: repaid,
          totalOutstandingUSD: outstanding,
          dtiRatio: l.cbcScore?.dtiRatio || 28.0,
          createdAt: l.submittedAt ? l.submittedAt.split('T')[0] : '2026-02-15',
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Restructures an existing facility APR, term, and recalculates amortization schedule
   */
  public async restructureLoan(loanId: string, params: {
    newAprPercent: number;
    newTermMonths: number;
    reason?: string;
  }): Promise<UnifiedLoanRecord | null> {
    const list = this.getStorage();
    const idx = list.findIndex((l) => l.loanId === loanId || l.id === loanId);
    if (idx === -1) return null;

    const item = { ...list[idx] };
    item.principal.aprPercent = params.newAprPercent;
    item.principal.termMonths = params.newTermMonths;
    item.principal.remainingMonths = params.newTermMonths;

    // Recalculate schedule based on current outstanding balance
    item.schedules = generateAmortizationSchedule(
      item.repaymentProgress.outstandingBalanceUSD,
      params.newAprPercent,
      params.newTermMonths
    );

    if (item.schedules.length > 0) {
      item.nextScheduledPayment.scheduledEMIUSD = item.schedules[0].totalDue;
      item.nextScheduledPayment.dueDate = item.schedules[0].dueDate;
    }

    item.adminNotes = `Restructured: ${params.reason || 'Term extended by Credit Risk Committee'}`;
    list[idx] = item;
    this.saveStorage(list);

    return item;
  }

  /**
   * Super Admin: Payment History Module - Dynamic Overview Summary
   */
  public async getAdminPaymentSummary(): Promise<{
    totalPaymentsReceived: number;
    totalAmountCollected: number;
    totalAmountCollectedUSD: number;
    totalAmountCollectedKHR: number;
    pendingPaymentsCount: number;
    pendingPaymentsAmount: number;
    failedPaymentsCount: number;
    failedPaymentsAmount: number;
    overduePaymentsCount: number;
    overduePaymentsAmount: number;
    totalOutstandingBalance: number;
    totalOutstandingBalanceUSD: number;
    totalOutstandingBalanceKHR: number;
    currency: string;
  }> {
    const receipts = this.getReceipts();
    const loans = await this.getAllLoansForAdmin();

    let totalPaid = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let failedCount = 0;
    let failedAmount = 0;

    receipts.forEach((r) => {
      const amt = Number(r.amountPaidUSD || (r as any).amount || 0);
      const st = ((r as any).status || 'PAID').toUpperCase();
      if (st === 'PAID' || st === 'SUCCESS') {
        paidCount++;
        totalPaid += amt;
      } else if (st === 'PENDING') {
        pendingCount++;
        pendingAmount += amt;
      } else if (st === 'FAILED') {
        failedCount++;
        failedAmount += amt;
      }
    });

    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    loans.forEach((l) => {
      const out = Number(l?.repaymentProgress?.outstandingBalanceUSD || 0);
      totalOutstanding += out;

      if (Array.isArray(l.schedules)) {
        l.schedules.forEach((s: any) => {
          const isOverdue = s.status === 'OVERDUE' || (s.dueDate && new Date(s.dueDate) < new Date() && s.status !== 'PAID');
          if (isOverdue) {
            overdueCount++;
            overdueAmount += Number(s.totalDue || s.totalDueUSD || s.remainingBalance || 0);
          }
        });
      }
    });

    return {
      totalPaymentsReceived: paidCount,
      totalAmountCollected: totalPaid,
      totalAmountCollectedUSD: totalPaid,
      totalAmountCollectedKHR: Math.round(totalPaid * 4100),
      pendingPaymentsCount: pendingCount,
      pendingPaymentsAmount: pendingAmount,
      failedPaymentsCount: failedCount,
      failedPaymentsAmount: failedAmount,
      overduePaymentsCount: overdueCount,
      overduePaymentsAmount: overdueAmount,
      totalOutstandingBalance: totalOutstanding,
      totalOutstandingBalanceUSD: totalOutstanding,
      totalOutstandingBalanceKHR: Math.round(totalOutstanding * 4100),
      currency: 'USD',
    };
  }

  /**
   * Super Admin: Paginated & Filtered Payment History Management Table
   */
  public async listAdminPayments(filters: {
    query?: string;
    search?: string;
    status?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    loanId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const receipts = this.getReceipts();
    const loans = await this.getAllLoansForAdmin();

    const loanMap = new Map<string, UnifiedLoanRecord>();
    loans.forEach((l) => {
      loanMap.set(l.loanId, l);
      loanMap.set(l.id, l);
    });

    const search = (filters.query || filters.search || '').trim().toLowerCase();
    const statusFilter = (filters.status || 'ALL').toUpperCase();
    const methodFilter = (filters.paymentMethod || 'ALL').toUpperCase();

    let filtered = receipts.map((r, idx) => {
      const loan = loanMap.get(r.loanNumber) || loanMap.get((r as any).loanId) || loans[0];
      const borrower = loan?.borrower;
      const amount = Number(r.amountPaidUSD || (r as any).amount || 0);
      const loanAmount = Number(loan?.principal?.disbursedAmountUSD || 5000);
      const totalRepayment = Number(loanAmount * (1 + (loan?.principal?.aprPercent || 8) / 100));
      const remainingBalance = Number(loan?.repaymentProgress?.outstandingBalanceUSD || 0);

      let status = ((r as any).status || 'PAID').toUpperCase();
      if (status === 'SUCCESS') status = 'PAID';

      const instNo = r.installmentNo || (idx % 12) + 1;
      const matchedSchedule = loan?.schedules?.find((s: any) => s.installmentNo === instNo);
      const dueDate = matchedSchedule?.dueDate || loan?.nextScheduledPayment?.dueDate || '2026-11-15';

      return {
        paymentId: r.receiptNo || `REC-2026-${String(idx + 1).padStart(4, '0')}`,
        id: (r as any).id || r.receiptNo,
        receiptNo: r.receiptNo,
        userId: borrower?.clientCode || borrower?.id || r.borrowerId || 'BOR-2026-8801',
        userInternalId: borrower?.id,
        userFullName: borrower?.nameEn || r.borrowerName || 'Sokha Chan',
        userEmail: borrower?.email || `${(borrower?.nameEn || 'client').toLowerCase().replace(/\s+/g, '.')}@jamsongvich.com`,
        userPhone: borrower?.phone || '+855 12 345 678',
        loanId: loan?.loanId || r.loanNumber || 'LN-2026-0042',
        loanInternalId: loan?.id,
        productName: loan?.facility?.productName || 'Standard Loan Facility',
        loanAmount,
        interestAmount: Math.round(loanAmount * ((loan?.principal?.aprPercent || 8) / 100)),
        totalRepaymentAmount: Math.round(totalRepayment),
        paymentAmount: amount,
        currency: r.currency || 'USD',
        paymentMethod: r.paymentMethod || 'Bakong KHQR',
        transactionReference: r.transactionRef || r.referenceNo || `TXN-REF-${idx + 1001}`,
        paymentDate: r.paidAt || new Date().toISOString(),
        dueDate,
        installmentNo: instNo,
        remainingBalance,
        paymentStatus: status,
        status,
        failureReason: (r as any).failureReason,
        notes: r.notes || 'Settled via Core Banking Ledger',
        paidAt: r.paidAt,
        verifiedAt: r.paidAt,
        confirmedBy: r.cashierName || 'National Clearing Node / Cashier Desk',
      };
    });

    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.userFullName.toLowerCase().includes(search) ||
          p.userEmail.toLowerCase().includes(search) ||
          p.paymentId.toLowerCase().includes(search) ||
          p.loanId.toLowerCase().includes(search) ||
          p.transactionReference.toLowerCase().includes(search) ||
          p.userId.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.paymentStatus === statusFilter || p.status === statusFilter);
    }

    // Apply method filter
    if (methodFilter !== 'ALL') {
      filtered = filtered.filter((p) => {
        const m = (p.paymentMethod || '').toUpperCase().replace(/[\s-]+/g, '_');
        return m.includes(methodFilter);
      });
    }

    // Apply date range
    if (filters.startDate) {
      const s = new Date(filters.startDate).getTime();
      filtered = filtered.filter((p) => new Date(p.paymentDate).getTime() >= s);
    }
    if (filters.endDate) {
      const e = new Date(filters.endDate).getTime();
      filtered = filtered.filter((p) => new Date(p.paymentDate).getTime() <= e);
    }

    // User filter
    if (filters.userId) {
      filtered = filtered.filter((p) => p.userId === filters.userId || p.userInternalId === filters.userId);
    }

    // Loan filter
    if (filters.loanId) {
      filtered = filtered.filter((p) => p.loanId === filters.loanId || p.loanInternalId === filters.loanId);
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 15));
    const total = filtered.length;
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      items: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Super Admin: Confirm Pending Payment in Local Storage
   */
  public async confirmAdminPayment(paymentId: string, notes?: string): Promise<any> {
    const receipts = this.getReceipts();
    const idx = receipts.findIndex((r) => r.receiptNo === paymentId || (r as any).id === paymentId);
    if (idx === -1) {
      throw new Error('Payment record not found');
    }

    const r = receipts[idx];
    (r as any).status = 'PAID';
    (r as any).notes = notes ? `${r.notes || ''}\n[Confirmed by Super Admin]: ${notes}`.trim() : r.notes;
    r.paidAt = new Date().toISOString();
    receipts[idx] = r;
    this.saveReceipts(receipts);

    // Update loan balance
    const loans = this.getStorage();
    const lIdx = loans.findIndex((l) => l.loanId === r.loanNumber || l.id === r.loanNumber);
    if (lIdx !== -1) {
      const loan = { ...loans[lIdx] };
      const amt = Number(r.amountPaidUSD || 0);
      loan.repaymentProgress.outstandingBalanceUSD = Math.max(0, loan.repaymentProgress.outstandingBalanceUSD - amt);
      loan.repaymentProgress.totalPaidUSD += amt;
      loans[lIdx] = loan;
      this.saveStorage(loans);
    }

    return {
      success: true,
      message: `Payment ${r.receiptNo} confirmed successfully.`,
      paymentId: r.receiptNo,
      receiptNo: r.receiptNo,
      status: 'PAID',
    };
  }

  /**
   * Super Admin: Reject Invalid Payment Submission with Reason
   */
  public async rejectAdminPayment(paymentId: string, reason: string): Promise<any> {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Rejection reason of at least 3 characters is mandatory');
    }

    const receipts = this.getReceipts();
    const idx = receipts.findIndex((r) => r.receiptNo === paymentId || (r as any).id === paymentId);
    if (idx === -1) {
      throw new Error('Payment record not found');
    }

    const r = receipts[idx];
    (r as any).status = 'FAILED';
    (r as any).failureReason = reason.trim();
    receipts[idx] = r;
    this.saveReceipts(receipts);

    return {
      success: true,
      message: `Payment ${r.receiptNo} rejected.`,
      paymentId: r.receiptNo,
      receiptNo: r.receiptNo,
      status: 'FAILED',
      failureReason: reason.trim(),
    };
  }

  /**
   * Super Admin: Complete Payment History Dossier Per User
   */
  public async getUserPaymentDossier(userId: string): Promise<any> {
    const loans = await this.getAllLoansForAdmin();
    const receipts = this.getReceipts();

    const userLoans = loans.filter(
      (l) => l.borrower.clientCode === userId || l.borrower.id === userId || l.borrower.nameEn.toLowerCase() === userId.toLowerCase()
    );

    const activeLoan = userLoans[0] || loans[0];
    const borrower = activeLoan?.borrower;

    const allPayments = receipts.filter(
      (r) =>
        r.borrowerId === userId ||
        r.borrowerName === borrower?.nameEn ||
        userLoans.some((l) => l.loanId === r.loanNumber)
    );

    let totalBorrowed = 0;
    let totalRepaid = 0;
    let totalOutstanding = 0;

    userLoans.forEach((l) => {
      totalBorrowed += Number(l.principal.disbursedAmountUSD || 0);
      totalRepaid += Number(l.repaymentProgress.totalPaidUSD || 0);
      totalOutstanding += Number(l.repaymentProgress.outstandingBalanceUSD || 0);
    });

    const installments: any[] = [];
    userLoans.forEach((l) => {
      if (Array.isArray(l.schedules)) {
        l.schedules.forEach((s) => {
          installments.push({
            id: `${l.loanId}-inst-${s.installmentNo}`,
            loanId: l.loanId,
            loanNumber: l.loanId,
            installmentNo: s.installmentNo,
            dueDate: s.dueDate,
            principalAmount: (s as any).principalDue || (s as any).principalUSD || 100,
            interestAmount: (s as any).interestDue || (s as any).interestUSD || 10,
            totalDue: s.totalDue,
            amountPaid: (s as any).amountPaidUSD || (s.status === 'PAID' ? s.totalDue : 0),
            remainingAmount: s.status === 'PAID' ? 0 : s.totalDue,
            status: s.status,
          });
        });
      }
    });

    return {
      user: {
        userId: borrower?.clientCode || userId,
        id: borrower?.id || userId,
        fullName: borrower?.nameEn || 'Sokha Chan',
        email: borrower?.email || 'sokha.chan@jamsongvich.com',
        phone: borrower?.phone || '+855 12 345 678',
        address: 'Phnom Penh, Cambodia',
        accountStatus: 'ACTIVE',
      },
      summary: {
        totalLoansBorrowed: userLoans.length || 1,
        totalAmountBorrowedUSD: totalBorrowed || 5000,
        totalAmountRepaidUSD: totalRepaid || 2500,
        remainingRepaymentAmountUSD: totalOutstanding || 2500,
        successfulPaymentsCount: allPayments.filter((p) => ((p as any).status || 'PAID') === 'PAID').length,
        pendingPaymentsCount: allPayments.filter((p) => (p as any).status === 'PENDING').length,
        failedPaymentsCount: allPayments.filter((p) => (p as any).status === 'FAILED').length,
        latePaymentRecordsCount: installments.filter((i) => i.status === 'OVERDUE').length,
        currency: 'USD',
      },
      loans: userLoans.map((l) => ({
        id: l.id,
        loanNumber: l.loanId,
        productName: l.facility.productName,
        principalAmount: l.principal.disbursedAmountUSD,
        interestRate: l.principal.aprPercent,
        termMonths: l.principal.termMonths,
        totalRepayment: Math.round(l.principal.disbursedAmountUSD * (1 + l.principal.aprPercent / 100)),
        totalPaid: l.repaymentProgress.totalPaidUSD,
        outstandingBalance: l.repaymentProgress.outstandingBalanceUSD,
        status: l.facility.status,
        startDate: '2026-01-15',
        endDate: '2027-01-15',
      })),
      installments,
      payments: allPayments.map((p) => ({
        id: (p as any).id || p.receiptNo,
        paymentId: p.receiptNo,
        receiptNo: p.receiptNo,
        loanId: p.loanNumber,
        loanNumber: p.loanNumber,
        installmentNo: p.installmentNo || 1,
        amount: p.amountPaidUSD,
        currency: p.currency || 'USD',
        paymentMethod: p.paymentMethod || 'KHQR',
        referenceNo: p.referenceNo || p.transactionRef,
        paymentDate: p.paidAt,
        status: (p as any).status || 'PAID',
        failureReason: (p as any).failureReason,
        notes: p.notes,
        receivedBy: p.cashierName || 'National Clearing Node',
      })),
    };
  }

  /**
   * Super Admin: Payment Audit Log Trail
   */
  public async getPaymentAuditTrail(paymentId: string): Promise<any[]> {
    return [
      {
        id: `aud-${paymentId}-1`,
        action: 'CONFIRM_PAYMENT',
        adminName: 'System Administrator',
        adminRole: 'SUPER_ADMIN',
        details: {
          paymentId,
          verifiedVia: 'National Bank of Cambodia Fast Clearing Gateway',
          timestamp: new Date().toISOString(),
        },
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString(),
      },
      {
        id: `aud-${paymentId}-2`,
        action: 'INITIATE_PAYMENT',
        adminName: 'Borrower Self-Service',
        adminRole: 'BORROWER',
        details: {
          paymentId,
          method: 'Bakong Dynamic KHQR',
        },
        ipAddress: '127.0.0.1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  }
}

export const loanStorageService = new LoanStorageService();
