/**
 * JAM SONG VICH Core Banking System • ប្រព័ន្ធគ្រប់គ្រងឥណទាន
 * Unified Persistent Storage & Data Synchronization Service
 * 
 * Synchronizes borrower origination workflows directly with Super Admin
 * portfolio tables, underwriting queues, and real-time DOM events.
 */

export const UNIFIED_LEDGER_KEY = 'JAM_SONG_VICH_UNIFIED_LEDGER';
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

// Baseline seed facilities for initial demo and testing
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
  },
];

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

    remainingPrincipal = Math.max(0, Math.round((remainingPrincipal - principalDue) * 100) / 100);

    schedules.push({
      installmentNo: i,
      dueDate: dueDate.toISOString().split('T')[0],
      totalDue,
      principalDue,
      interestDue,
      remainingBalance: remainingPrincipal,
      status: (i === 1 ? 'DUE' : 'UPCOMING') as 'PAID' | 'DUE' | 'UPCOMING',
    });
  }

  return schedules;
}

class LoanStorageService {
  /**
   * Safe localStorage accessor with seed fallback
   */
  private getStorage(): UnifiedLoanRecord[] {
    if (typeof window === 'undefined') return INITIAL_SEED_LOANS;
    try {
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
      return parsed;
    } catch {
      return INITIAL_SEED_LOANS;
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
  }): Promise<UnifiedLoanRecord> {
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
        id: payload.borrowerId || 'BOR-2026-8801',
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
      const response = await fetch('/api/v1/loans/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.data?.id) {
          newRecord.id = json.data.id;
        }
      }
    } catch {
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
      // Generate official 12-month reducing balance schedule
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
}

export const loanStorageService = new LoanStorageService();

