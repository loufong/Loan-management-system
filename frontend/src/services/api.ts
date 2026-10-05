import {
  Borrower,
  LoanProduct,
  LoanAccount,
  LoanApplication,
  PaymentReceipt,
  UserProfile,
  UserRole,
  UserDashboardSummary,
  UserSettings,
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
  private token: string | null = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('apex_token', token);
    } else {
      localStorage.removeItem('apex_token');
      sessionStorage.removeItem('apex_token');
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

  // --- AUTHENTICATION & PROFILE ---
  public async login(
    usernameOrEmail: string,
    roleOrPassword?: UserRole | string,
    rememberMe = false,
    roleOverride?: UserRole
  ): Promise<{ token: string; user: UserProfile }> {
    const password = typeof roleOrPassword === 'string' && roleOrPassword.length > 5 && !['MANAGER', 'LOAN_OFFICER', 'CASHIER', 'BORROWER'].includes(roleOrPassword)
      ? roleOrPassword
      : 'Password123!';
    const roleHint = typeof roleOrPassword === 'string' && ['MANAGER', 'LOAN_OFFICER', 'CASHIER', 'BORROWER'].includes(roleOrPassword)
      ? (roleOrPassword as UserRole)
      : roleOverride;

    try {
      const res = await this.request<{ accessToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usernameOrEmail, password, rememberMe }),
      });
      this.setToken(res.accessToken);
      const u = res.user;
      const userRole = (u?.role || roleHint || 'MANAGER') as UserRole;
      const matchedProfile: UserProfile = {
        id: u?.id || 'usr-default',
        username: u?.username || usernameOrEmail,
        name: u?.fullName || usernameOrEmail,
        fullName: u?.fullName || usernameOrEmail,
        email: u?.email || usernameOrEmail,
        role: userRole,
        title: u?.position || (userRole === 'MANAGER' ? 'Executive Branch Manager' : userRole === 'CASHIER' ? 'Desk Cashier' : userRole === 'LOAN_OFFICER' ? 'Senior Underwriter' : 'Retail Client'),
        department: u?.department || 'Banking Operations',
        avatar: u?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u?.username || usernameOrEmail)}`,
        avatarUrl: u?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u?.username || usernameOrEmail)}`,
        branch: 'Phnom Penh Main Branch',
        createdAt: u?.createdAt,
        lastLogin: u?.lastLogin,
      };
      return {
        token: res.accessToken,
        user: matchedProfile,
      };
    } catch {
      // Fallback in mock / offline mode
      const userRole = roleHint || (usernameOrEmail.includes('officer') ? 'LOAN_OFFICER' : usernameOrEmail.includes('cashier') ? 'CASHIER' : usernameOrEmail.includes('borrower') ? 'BORROWER' : 'MANAGER');
      const base = USER_PROFILES[userRole] || USER_PROFILES.MANAGER;
      const user: UserProfile = {
        ...base,
        name: usernameOrEmail,
        fullName: usernameOrEmail,
        email: usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@apex.local`,
        avatarUrl: base.avatar,
        lastLogin: new Date().toISOString(),
        createdAt: '2026-01-01',
      };
      return { token: 'mock-jwt-token-2026', user };
    }
  }

  public async getMe(): Promise<UserProfile> {
    try {
      const res = await this.request<any>('/auth/me');
      const u = res.user || res;
      return {
        id: u.id,
        username: u.username,
        name: u.fullName,
        fullName: u.fullName,
        email: u.email,
        role: u.role as UserRole,
        title: u.position || (u.role === 'MANAGER' ? 'Executive Branch Manager' : u.role === 'CASHIER' ? 'Desk Cashier' : u.role === 'LOAN_OFFICER' ? 'Senior Underwriter' : 'Retail Client'),
        department: u.department || 'Banking Operations',
        avatar: u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username)}`,
        avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username)}`,
        branch: u.userSetting?.branch || 'Phnom Penh Main Branch',
        borrowerId: u.borrowers?.[0]?.borrowerId,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
      };
    } catch {
      // Return cached user profile if offline
      const stored = localStorage.getItem('apex_user') || sessionStorage.getItem('apex_user');
      if (stored) return JSON.parse(stored);
      return USER_PROFILES.MANAGER;
    }
  }

  public async getUserDashboardSummary(): Promise<UserDashboardSummary> {
    return await this.request<UserDashboardSummary>('/dashboard/user-summary');
  }

  public async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return await this.request<UserSettings>('/dashboard/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  public async register(payload: {
    fullName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    role?: UserRole;
  }): Promise<{ success: boolean; message: string; email: string; devOtp?: string }> {
    try {
      return await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        success: true,
        message: 'Account created successfully. A verification code has been sent to your Gmail.',
        email: payload.email,
        devOtp: '482915',
      };
    }
  }

  public async verifyOtp(payload: {
    email: string;
    code: string;
    purpose: 'register_verification' | 'forgot_password' | 'email_verification';
  }): Promise<{ success: boolean; message: string; resetToken?: string }> {
    try {
      return await this.request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (payload.code.length === 6) {
        return {
          success: true,
          message: payload.purpose === 'register_verification' ? 'Email verified successfully. Your account is now active!' : 'OTP verified successfully.',
          resetToken: payload.purpose === 'forgot_password' ? `simulated-reset-token-${Date.now()}` : undefined,
        };
      }
      throw new Error(err?.message || 'Invalid verification code');
    }
  }

  public async resendOtp(payload: {
    email: string;
    purpose: 'register_verification' | 'forgot_password' | 'email_verification';
  }): Promise<{ success: boolean; message: string; expiresInSeconds: number; devOtp?: string }> {
    try {
      return await this.request('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        success: true,
        message: 'A fresh 6-digit verification code has been dispatched to your Gmail.',
        expiresInSeconds: 300,
        devOtp: '482915',
      };
    }
  }

  public async forgotPassword(payload: { email: string }): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.',
      };
    }
  }

  public async resetPassword(payload: {
    email: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        success: true,
        message: 'Your password has been successfully reset. Please log in with your new credentials.',
      };
    }
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      this.setToken(null);
      localStorage.removeItem('apex_token');
      localStorage.removeItem('apex_user');
      sessionStorage.removeItem('apex_token');
      sessionStorage.removeItem('apex_user');
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

  // --- LIVE DEMO FAST-FORWARD OVERDUE TRIGGER (POINT 44) ---
  public async simulateOverdue(loanId: string): Promise<any> {
    try {
      return await this.request<any>(`/demo/simulate-overdue/${loanId}`, {
        method: 'POST',
      });
    } catch {
      // Offline fallback: update in-memory loan
      const targetLoan = MOCK_LOANS.find((l) => l.id === loanId || l.loanNumber === loanId);
      if (targetLoan && targetLoan.schedules && targetLoan.schedules.length > 0) {
        const openSched = targetLoan.schedules.find((s) => s.status !== 'PAID');
        if (openSched) {
          const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          openSched.dueDate = fiveDaysAgo;
          openSched.status = 'OVERDUE';
          (openSched as any).daysLate = 5;
          targetLoan.status = 'OVERDUE';
          targetLoan.daysOverdue = 5;
          targetLoan.lateFeeAccruedUSD = Math.round(openSched.remainingAmountUSD * 0.001 * 5 * 100) / 100;
        }
      }
      return {
        success: true,
        message: 'Live demo fast-forward complete: installment set to 5 days overdue and penalty accrued.',
      };
    }
  }
}

export const api = new ApiService();
export default api;
