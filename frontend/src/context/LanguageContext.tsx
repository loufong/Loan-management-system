import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'km';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const ENGLISH_DICTIONARY: Record<string, string> = {
  // Brand & Header
  app_name: 'Jam Song Vich',
  app_subtitle: 'Loan Management System',
  app_full_title: 'Jam Song Vich Loan Management System',

  // Navigation Items
  nav_dashboard: 'Dashboard',
  nav_my_applications: 'My Applications',
  nav_my_loans: 'My Loans',
  nav_repayments: 'Repayment Schedule',
  nav_payments: 'Pay Installment',
  nav_applications: 'Applications',
  nav_loans: 'Loans',
  nav_borrowers: 'Borrowers',
  nav_products: 'Loan Products',
  nav_credit_reviews: 'Credit Reviews',
  nav_approvals: 'Approvals',
  nav_disbursements: 'Disbursements Queue',
  nav_overdue: 'Overdue Delinquency Watchlist',
  nav_reports: 'Reports & Analytics',
  nav_users: 'Users Management',
  nav_audit_logs: 'Audit Logs',
  nav_notifications: 'Notifications',
  nav_settings: 'Settings',
  nav_profile: 'My Profile',
  nav_logout: 'Sign Out',

  // Section Headers
  sec_loan_management: 'LOAN MANAGEMENT',
  sec_my_loans: 'MY LOANS',
  sec_management: 'MANAGEMENT',
  sec_system: 'SYSTEM',
  sec_account: 'ACCOUNT',

  // Common Actions & Buttons
  btn_pay_now: 'Pay Now',
  btn_make_payment: 'Make Payment',
  btn_collect_payment: 'Collect Payment',
  btn_apply_loan: 'Apply for Loan',
  btn_submit_application: 'Submit Application',
  btn_approve: 'Approve',
  btn_reject: 'Reject',
  btn_disburse: 'Disburse',
  btn_download_pdf: 'Download PDF',
  btn_export_csv: 'Export CSV',
  btn_print_receipt: 'Print Receipt',
  btn_save_draft: 'Save Draft',
  btn_cancel: 'Cancel',
  btn_close: 'Close',
  btn_refresh: 'Refresh',

  // Status Labels
  status_active: 'Active',
  status_pending: 'Pending',
  status_approved: 'Approved',
  status_rejected: 'Rejected',
  status_disbursed: 'Disbursed',
  status_completed: 'Completed',
  status_overdue: 'Overdue',
  status_settled: 'Settled',
  status_paid: 'Paid',
  status_due_soon: 'Due Soon',
};

export const TRANSLATIONS: Record<string, { en: string; km?: string }> = Object.fromEntries(
  Object.entries(ENGLISH_DICTIONARY).map(([k, v]) => [k, { en: v }])
);

export const PHRASE_TRANSLATIONS: Record<string, { en: string; km?: string }> = { ...TRANSLATIONS };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language] = useState<Language>('en');

  const setLanguage = (_lang: Language) => {
    localStorage.setItem('apex_language', 'en');
    document.documentElement.lang = 'en';
  };

  const toggleLanguage = () => {};

  useEffect(() => {
    localStorage.setItem('apex_language', 'en');
    document.documentElement.lang = 'en';
  }, []);

  const t = (key: string, fallback?: string): string => {
    const cleanKey = (key || '').trim();
    if (fallback !== undefined) return fallback;
    if (ENGLISH_DICTIONARY[cleanKey]) return ENGLISH_DICTIONARY[cleanKey];
    return cleanKey;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
