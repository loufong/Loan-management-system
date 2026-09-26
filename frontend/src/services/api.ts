import {
  Borrower,
  LoanProduct,
  LoanAccount,
  LoanApplication,
  PaymentReceipt,
  UserProfile,
  UserRole,
} from '../types';
import {
  MOCK_BORROWERS,
  MOCK_PRODUCTS,
  MOCK_LOANS,
  MOCK_APPLICATIONS,
  MOCK_RECEIPTS,
  USER_PROFILES,
} from '../data/mockData';

const BASE_URL = '/api/v1';

class ApiService {
  private token: string | null = localStorage.getItem('apex_token');

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('apex_token', token);
    } else {
      localStorage.removeItem('apex_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `Request failed with status ${response.status}`);
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  // --- AUTHENTICATION ---
  public async login(username: string, role: UserRole): Promise<{ token: string; user: UserProfile }> {
    try {
      const res = await this.request<{ accessToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password: 'Password123!' }),
      });
      this.setToken(res.accessToken);
      return {
        token: res.accessToken,
        user: USER_PROFILES[role] || USER_PROFILES.MANAGER,
      };
    } catch {
      // Fallback in mock / offline mode
      const user = USER_PROFILES[role] || USER_PROFILES.MANAGER;
      return { token: 'mock-jwt-token-2026', user };
    }
  }

  // --- BORROWERS ---
  public async getBorrowers(): Promise<Borrower[]> {
    try {
      const data = await this.request<{ items: Borrower[] }>('/borrowers');
      return data.items || data as any;
    } catch {
      return MOCK_BORROWERS;
    }
  }

  // --- PRODUCTS ---
  public async getProducts(): Promise<LoanProduct[]> {
    try {
      const data = await this.request<{ items: LoanProduct[] }>('/loan-products');
      return data.items || data as any;
    } catch {
      return MOCK_PRODUCTS;
    }
  }

  // --- LOAN APPLICATIONS ---
  public async getApplications(): Promise<LoanApplication[]> {
    try {
      const data = await this.request<{ items: LoanApplication[] }>('/loan-applications');
      return data.items || data as any;
    } catch {
      return MOCK_APPLICATIONS;
    }
  }

  public async submitApplication(applicationData: Partial<LoanApplication>): Promise<LoanApplication> {
    try {
      return await this.request<LoanApplication>('/loan-applications', {
        method: 'POST',
        body: JSON.stringify(applicationData),
      });
    } catch {
      const newApp: LoanApplication = {
        id: `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        applicationNo: `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        borrowerId: applicationData.borrowerId || 'BOR-2026-0001',
        borrowerName: applicationData.borrowerName || 'Sokha Chan',
        borrowerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        borrowerIncomeUSD: 1450,
        productId: applicationData.productId || 'PROD-001',
        productName: applicationData.productName || 'Graduate Academic Advance',
        requestedAmountUSD: applicationData.requestedAmountUSD || 3000,
        requestedTermMonths: applicationData.requestedTermMonths || 12,
        frequency: applicationData.frequency || 'MONTHLY',
        purpose: applicationData.purpose || 'Academic Loan',
        dtiRatio: 26.5,
        riskTier: 'LOW RISK',
        status: 'SUBMITTED',
        createdAt: new Date().toISOString().split('T')[0],
        documents: [],
      };
      return newApp;
    }
  }

  // --- LOANS ---
  public async getLoans(): Promise<LoanAccount[]> {
    try {
      const data = await this.request<{ items: LoanAccount[] }>('/loans');
      return data.items || data as any;
    } catch {
      return MOCK_LOANS;
    }
  }

  // --- PAYMENTS ---
  public async getReceipts(): Promise<PaymentReceipt[]> {
    return MOCK_RECEIPTS;
  }

  public async recordPayment(payload: any): Promise<PaymentReceipt> {
    try {
      return await this.request<PaymentReceipt>('/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      const newReceipt: PaymentReceipt = {
        receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        loanNumber: payload.loanId || payload.loanNumber || 'LN-2026-0042',
        borrowerId: 'BOR-2026-0001',
        borrowerName: 'Sokha Chan',
        installmentNo: 5,
        amountPaidUSD: payload.amountUSD || 511.25,
        amountPaidKHR: Math.round((payload.amountUSD || 511.25) * 4100),
        paymentMethod: payload.method || 'Dynamic QR Code',
        transactionRef: `KHQR-${Date.now().toString().slice(-8)}`,
        paidAt: new Date().toLocaleString(),
        cashierName: payload.cashierName || 'Emily Ross',
        principalAllocatedUSD: (payload.amountUSD || 511.25) * 0.9,
        interestAllocatedUSD: (payload.amountUSD || 511.25) * 0.1,
        lateFeeAllocatedUSD: 0,
        outstandingBalanceAfterUSD: Math.max(0, 3850 - (payload.amountUSD || 511.25)),
        notes: payload.notes || 'Recorded via Cashier POS Terminal',
      };
      return newReceipt;
    }
  }
}

export const api = new ApiService();
export default api;
