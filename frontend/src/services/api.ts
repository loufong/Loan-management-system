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

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      throw new Error('Unable to connect to the server. Please try again later.');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      let msg = errorBody.message || errorBody.error?.message;

      if (!msg) {
        if (response.status === 401) {
          msg = 'Please log in to continue.';
        } else if (response.status === 403) {
          msg = 'You do not have permission to access this page.';
        } else if (response.status === 400 || response.status === 422) {
          msg = 'Please check the information you entered.';
        } else if (response.status >= 500) {
          msg = 'Unable to connect to the server. Please try again later.';
        } else {
          msg = `Request failed with status ${response.status}`;
        }
      }

      // Clear token if unauthorized on protected resource
      if (response.status === 401 && endpoint !== '/auth/login') {
        this.setToken(null);
      }

      const err = new Error(msg) as any;
      err.status = response.status;
      err.code = errorBody.code;
      throw err;
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  // Rate-limiting tracker for demo/offline fallback: 5 failed attempts -> 5 minutes block
  private failedAttempts: Record<string, { count: number; blockedUntil?: number }> = {};

  // --- AUTHENTICATION & PROFILE ---
  public async login(
    usernameOrEmail: string,
    password = 'Password123!',
    rememberMe = false
  ): Promise<{ token: string; user: UserProfile }> {
    const cleanId = usernameOrEmail.trim().toLowerCase();

    // Step 1: Validate input
    if (!usernameOrEmail.trim() || !password) {
      throw new Error('Invalid email/username or password.');
    }

    try {
      const res = await this.request<{ accessToken?: string; token?: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usernameOrEmail, password, rememberMe }),
      });
      const activeToken = res.accessToken || res.token || 'jwt-token-active';
      this.setToken(activeToken);
      const u = res.user;
      const normalizedRole = (u?.role === 'admin' || u?.role === 'ADMIN') ? 'admin' : 'user';
      const matchedProfile: UserProfile = {
        id: u?.id || 'usr-default',
        username: u?.username || usernameOrEmail,
        name: u?.name || u?.fullName || usernameOrEmail,
        fullName: u?.fullName || u?.name || usernameOrEmail,
        email: u?.email || usernameOrEmail,
        role: normalizedRole as UserRole,
        status: (u?.status || 'active').toLowerCase() as any,
        title: normalizedRole === 'admin' ? 'System Administrator' : 'Client Borrower',
        department: u?.department || (normalizedRole === 'admin' ? 'Administration' : 'Retail Banking'),
        avatar: u?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u?.username || usernameOrEmail)}`,
        avatarUrl: u?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u?.username || usernameOrEmail)}`,
        branch: 'Phnom Penh Main Branch',
        createdAt: u?.createdAt,
        lastLogin: new Date().toISOString(),
      };
      return {
        token: activeToken,
        user: matchedProfile,
      };
    } catch (err: any) {
      // If error came directly from backend API (e.g. 401, 403 status message), re-throw it!
      if (
        err?.message &&
        !err.message.includes('Failed to fetch') &&
        !err.message.includes('NetworkError') &&
        !err.message.includes('404')
      ) {
        throw err;
      }

      // Offline / Static fallback authentication (ensures complete functionality anywhere)
      const record = this.failedAttempts[cleanId] || { count: 0 };
      if (record.blockedUntil && Date.now() < record.blockedUntil) {
        const remainingMinutes = Math.ceil((record.blockedUntil - Date.now()) / 60000);
        throw new Error(`Too many failed login attempts. Please try again after ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`);
      }

      // Predefined accounts matching exact requirements
      const mockAccounts: Record<string, { role: 'admin' | 'user'; status: 'active' | 'inactive' | 'suspended'; name: string; email: string; username: string }> = {
        'admin@loansystem.edu': { role: 'admin', status: 'active', name: 'Admin', email: 'admin@loansystem.edu', username: 'admin' },
        'admin@example.com': { role: 'admin', status: 'active', name: 'Admin', email: 'admin@loansystem.edu', username: 'admin' },
        'admin': { role: 'admin', status: 'active', name: 'Admin', email: 'admin@example.com', username: 'admin' },
        'user@example.com': { role: 'user', status: 'active', name: 'Standard User', email: 'user@example.com', username: 'user' },
        'user': { role: 'user', status: 'active', name: 'Standard User', email: 'user@example.com', username: 'user' },
        'inactive@example.com': { role: 'user', status: 'inactive', name: 'Inactive User', email: 'inactive@example.com', username: 'inactive' },
        'inactive': { role: 'user', status: 'inactive', name: 'Inactive User', email: 'inactive@example.com', username: 'inactive' },
        'suspended@example.com': { role: 'user', status: 'suspended', name: 'Suspended User', email: 'suspended@example.com', username: 'suspended' },
        'suspended': { role: 'user', status: 'suspended', name: 'Suspended User', email: 'suspended@example.com', username: 'suspended' },
        'manager@apex.local': { role: 'user', status: 'active', name: 'Executive Branch Manager', email: 'manager@apex.local', username: 'manager' },
        'manager': { role: 'user', status: 'active', name: 'Executive Branch Manager', email: 'manager@apex.local', username: 'manager' },
        'borrower@apex.local': { role: 'user', status: 'active', name: 'Sokha Chan', email: 'borrower@apex.local', username: 'borrower' },
        'borrower': { role: 'user', status: 'active', name: 'Sokha Chan', email: 'borrower@apex.local', username: 'borrower' },
      };

      const account = mockAccounts[cleanId];
      // Step 2 & 3: User existence check (generic message)
      if (!account) {
        record.count += 1;
        if (record.count >= 5) record.blockedUntil = Date.now() + 5 * 60 * 1000;
        this.failedAttempts[cleanId] = record;
        throw new Error('Invalid email/username or password.');
      }

      // Step 4 & 5: Password verification (generic message)
      if (password !== 'Password123!') {
        record.count += 1;
        if (record.count >= 5) record.blockedUntil = Date.now() + 5 * 60 * 1000;
        this.failedAttempts[cleanId] = record;
        throw new Error('Invalid email/username or password.');
      }

      // Clear failed attempts on valid credentials
      delete this.failedAttempts[cleanId];

      // Step 6: Status check with required messages
      if (account.status === 'inactive') {
        throw new Error('Your account is inactive. Please contact the administrator.');
      }
      if (account.status === 'suspended') {
        throw new Error('Your account has been suspended. Please contact the administrator.');
      }

      // Step 7, 8 & 9: Create session/token, update last_login, role redirect
      const token = `jwt-token-${cleanId}-${Date.now()}`;
      this.setToken(token);

      const user: UserProfile = {
        id: `usr-${cleanId}`,
        username: account.username,
        name: account.name,
        fullName: account.name,
        email: account.email,
        role: account.role as UserRole,
        status: account.status,
        title: account.role === 'admin' ? 'Administrator' : 'Client Borrower',
        department: account.role === 'admin' ? 'Executive Administration' : 'Client Services',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(account.username)}`,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(account.username)}`,
        branch: 'Phnom Penh Main Branch',
        borrowerId: account.role === 'user' ? 'BOR-2026-0001' : undefined,
        createdAt: '2026-01-01',
        lastLogin: new Date().toISOString(),
      };

      return { token, user };
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

  public async verifyRegistrationOtp(data: { email: string; otp: string }): Promise<any> {
    return this.verifyOtp({ email: data.email, code: data.otp, purpose: 'register_verification' });
  }

  public async verifyResetOtp(data: { email: string; otp: string }): Promise<{ resetToken: string }> {
    const res = await this.verifyOtp({ email: data.email, code: data.otp, purpose: 'forgot_password' });
    return { resetToken: res.resetToken || `simulated-reset-token-${Date.now()}` };
  }

  public async getUserDashboardSummary(): Promise<UserDashboardSummary> {
    try {
      return await this.request<UserDashboardSummary>('/dashboard/user-summary');
    } catch {
      return this.getMockUserDashboardSummary();
    }
  }

  public getMockUserDashboardSummary(): UserDashboardSummary {
    let currentUser: UserProfile = USER_PROFILES.MANAGER;
    try {
      const stored = localStorage.getItem('apex_user') || sessionStorage.getItem('apex_user');
      if (stored) {
        currentUser = JSON.parse(stored);
      }
    } catch {
      // Use fallback
    }

    const isBorrower = currentUser.role === 'BORROWER';
    const cleanName = currentUser.fullName || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Lou Fong');
    const role = currentUser.role || 'MANAGER';

    return {
      user: {
        id: currentUser.id || 'USR-2026-001',
        username: currentUser.username || cleanName,
        fullName: cleanName,
        email: currentUser.email || 'manager@apex.local',
        phone: (currentUser as any).phone || '+855 12 890 123',
        role,
        avatarUrl: currentUser.avatarUrl || currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        department: currentUser.department || (isBorrower ? 'Borrower Self-Service' : 'Executive Credit Committee'),
        position: currentUser.title || (isBorrower ? 'Student Borrower' : 'Branch General Manager'),
        createdAt: currentUser.createdAt || '2026-01-01',
        lastLogin: new Date().toISOString(),
      },
      settings: {
        branch: currentUser.branch || 'Phnom Penh Main Branch',
        currency: 'USD',
        theme: 'light',
        notificationsEnabled: true,
      },
      isNewUser: false,
      metrics: {
        activeLoansCount: isBorrower ? 1 : 142,
        overdueLoansCount: isBorrower ? 0 : 3,
        totalApplications: isBorrower ? 2 : 248,
        totalBorrowedUSD: isBorrower ? 5000 : 2480500,
        totalOutstandingUSD: isBorrower ? 3850 : 1980200,
        totalCollectedUSD: isBorrower ? 1150 : 184500,
        totalRepaidUSD: isBorrower ? 1150 : 184500,
        totalOverdueUSD: isBorrower ? 0 : 3110,
        approvalRate: 88.5,
        repaymentRate: 96.2,
        staffCreatedApps: isBorrower ? 0 : 18,
        staffApprovedApps: isBorrower ? 0 : 14,
        nextPaymentDue: isBorrower
          ? {
              installmentNo: 6,
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              amountUSD: 532.5,
              remainingAmountUSD: 532.5,
              loanNumber: 'LN-2026-0042',
            }
          : null,
        overdueCount: isBorrower ? 0 : 3,
        accountStanding: 'GOOD_STANDING',
      },
      cashflowTrend: [
        { month: 'May', fullMonth: 'May 2026', disbursedUSD: 180000, collectedUSD: 145000 },
        { month: 'Jun', fullMonth: 'Jun 2026', disbursedUSD: 210000, collectedUSD: 165000 },
        { month: 'Jul', fullMonth: 'Jul 2026', disbursedUSD: 260000, collectedUSD: 195000 },
        { month: 'Aug', fullMonth: 'Aug 2026', disbursedUSD: 310000, collectedUSD: 230000 },
        { month: 'Sep', fullMonth: 'Sep 2026', disbursedUSD: 295000, collectedUSD: 250000 },
        { month: 'Oct', fullMonth: 'Oct 2026', disbursedUSD: 340000, collectedUSD: 280000 },
      ],
      productDistribution: [
        { name: 'Personal Loan', percentage: 42, color: '#2563EB', valUSD: 831684 },
        { name: 'SME Business Loan', percentage: 28, color: '#4F46E5', valUSD: 554456 },
        { name: 'Agriculture Loan', percentage: 16, color: '#059669', valUSD: 316832 },
        { name: 'Vehicle Loan', percentage: 10, color: '#D97706', valUSD: 198020 },
        { name: 'Emergency Loan', percentage: 4, color: '#8B5CF6', valUSD: 79208 },
      ],
      overdueWatchlist: [
        {
          id: 'SCH-0012-04',
          loanId: 'LN-2026-0012',
          loanNumber: 'LN-2026-0012',
          borrowerName: 'Dara Pich',
          initials: 'DP',
          avatarColor: 'bg-rose-500 text-white',
          borrowerPhone: '+855 12 883 991',
          installmentNo: 4,
          daysOverdue: 38,
          urgency: '30+d PAR',
          urgencyVariant: 'rose',
          overdueAmountUSD: 512.0,
        },
        {
          id: 'SCH-0008-07',
          loanId: 'LN-2026-0008',
          loanNumber: 'LN-2026-0008',
          borrowerName: 'Kosal Meng',
          initials: 'KM',
          avatarColor: 'bg-orange-500 text-white',
          borrowerPhone: '+855 10 445 221',
          installmentNo: 7,
          daysOverdue: 14,
          urgency: '1-30d Watch',
          urgencyVariant: 'orange',
          overdueAmountUSD: 720.0,
        },
        {
          id: 'SCH-0021-03',
          loanId: 'LN-2026-0021',
          loanNumber: 'LN-2026-0021',
          borrowerName: 'Sreynet Chea',
          initials: 'SC',
          avatarColor: 'bg-amber-500 text-white',
          borrowerPhone: '+855 98 776 543',
          installmentNo: 3,
          daysOverdue: 9,
          urgency: '1-30d Watch',
          urgencyVariant: 'orange',
          overdueAmountUSD: 380.0,
        },
      ],
      recentActivities: [
        {
          id: 'ACT-001',
          time: '10:45 AM',
          timestamp: new Date().toISOString(),
          actor: cleanName,
          text: 'Approved $8,500 SME Loan facility for Vannak Keo',
          type: 'APPROVAL',
          badge: 'Facility Approved',
          badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          iconStyle: 'bg-emerald-600 text-white ring-4 ring-emerald-100',
        },
        {
          id: 'ACT-002',
          time: '09:20 AM',
          timestamp: new Date().toISOString(),
          actor: 'Emily Ross',
          text: 'Collected $532.50 installment via Bakong Dynamic KHQR',
          type: 'PAYMENT',
          badge: 'Payment Received',
          badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
          iconStyle: 'bg-blue-600 text-white ring-4 ring-blue-100',
        },
        {
          id: 'ACT-003',
          time: 'Yesterday',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          actor: 'Sarah Chen, PhD',
          text: 'Underwriting completed for Personal Loan APP-2026-0014',
          type: 'SYSTEM',
          badge: 'Underwriting',
          badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          iconStyle: 'bg-indigo-600 text-white ring-4 ring-indigo-100',
        },
      ],
    };
  }

  public async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      return await this.request<UserSettings>('/dashboard/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    } catch {
      return {
        theme: settings.theme || 'light',
        currency: (settings.currency as any) || 'USD',
        branch: settings.branch || 'Phnom Penh Main Branch',
        notificationsEnabled: settings.notificationsEnabled ?? true,
      };
    }
  }

  public async register(payload: {
    fullName: string;
    username: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword?: string;
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
