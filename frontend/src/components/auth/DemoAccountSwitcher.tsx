import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  ShieldCheck,
  FileText,
  CheckCircle2,
  CreditCard,
  X,
  ArrowRight,
  Loader2,
  Lock,
  User,
  Sparkles,
  Check,
  KeyRound
} from 'lucide-react';

export interface DemoRolePreset {
  id: string;
  name: string;
  role: 'ADMIN' | 'LOAN_OFFICER' | 'MANAGER' | 'CASHIER';
  badgeTitle: string;
  description: string;
  permissionsSummary: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cardBorder: string;
  hoverBorder: string;
  buttonGradient: string;
  capabilities: string[];
}

export const DEMO_ROLES: DemoRolePreset[] = [
  {
    id: 'admin',
    name: 'Admin',
    role: 'ADMIN',
    badgeTitle: 'System Administrator (Full access)',
    description: 'System Administrator with full organizational authority, master policy controls, and user directory.',
    permissionsSummary: 'Full access to all modules, underwriting rules, system audits, and institution settings.',
    email: 'admin@jamsongvich.com',
    password: 'Admin@123456',
    icon: ShieldCheck,
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-950/70',
    badgeBorder: 'border-purple-700/60',
    badgeText: 'text-purple-300',
    cardBorder: 'border-purple-900/40',
    hoverBorder: 'hover:border-purple-500/80',
    buttonGradient: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500',
    capabilities: ['Full System Access', 'User & Role Governance', 'Audit Trail Ledger', 'Product Catalog & Policies']
  },
  {
    id: 'loan_officer',
    name: 'Loan Officer',
    role: 'LOAN_OFFICER',
    badgeTitle: 'Maker (Can draft applications, view KYC)',
    description: 'Front-office credit maker authorized for borrower onboarding, KYC verification, and application origination.',
    permissionsSummary: 'Maker: Can draft applications, view KYC dossiers, evaluate DTI risks, and manage borrower profiles.',
    email: 'officer@jamsongvich.com',
    password: 'Admin@123456',
    icon: FileText,
    accentColor: 'text-sky-400',
    badgeBg: 'bg-sky-950/70',
    badgeBorder: 'border-sky-700/60',
    badgeText: 'text-sky-300',
    cardBorder: 'border-sky-900/40',
    hoverBorder: 'hover:border-sky-500/80',
    buttonGradient: 'from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500',
    capabilities: ['Maker Authority', 'Draft Applications', 'Borrower 360° Dossier', 'KYC & DTI Risk Workbench']
  },
  {
    id: 'checker',
    name: 'Branch Checker',
    role: 'MANAGER',
    badgeTitle: 'Manager (Approval & disbursement permissions)',
    description: 'Second-tier review officer with executive authority to approve loan facilities and authorize disbursements.',
    permissionsSummary: 'Manager: Two-eye approval sign-off, credit reviews oversight, and disbursements queue clearance.',
    email: 'checker@jamsongvich.com',
    password: 'Admin@123456',
    icon: CheckCircle2,
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/70',
    badgeBorder: 'border-emerald-700/60',
    badgeText: 'text-emerald-300',
    cardBorder: 'border-emerald-900/40',
    hoverBorder: 'hover:border-emerald-500/80',
    buttonGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    capabilities: ['Checker Authority', 'Credit Committee Sign-off', 'Facility Approvals Queue', 'Disbursements Authorization']
  },
  {
    id: 'cashier',
    name: 'Cashier / Teller',
    role: 'CASHIER',
    badgeTitle: 'Repayments & KHQR collection only',
    description: 'Branch teller desk dedicated to repayment collections, Bakong KHQR dynamic generation, and payment receipts.',
    permissionsSummary: 'Teller: Repayments & KHQR collection only, terminal cash desk, and printable payment receipts.',
    email: 'teller@jamsongvich.com',
    password: 'Admin@123456',
    icon: CreditCard,
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-950/70',
    badgeBorder: 'border-amber-700/60',
    badgeText: 'text-amber-300',
    cardBorder: 'border-amber-900/40',
    hoverBorder: 'hover:border-amber-500/80',
    buttonGradient: 'from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500',
    capabilities: ['Cash Counter Terminal', 'Bakong KHQR Generation', 'Issue Repayment Receipts', 'Repayments Collection Only']
  }
];

export interface DemoAccountSwitcherProps {
  onQuickLogin: (role: string, email: string, pass: string) => Promise<void> | void;
  onFillCredentials?: (email: string, pass: string) => void;
  currentEmail?: string;
  isAuthenticating?: boolean;
}

export const DemoAccountSwitcher: React.FC<DemoAccountSwitcherProps> = ({
  onQuickLogin,
  onFillCredentials,
  currentEmail,
  isAuthenticating = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeSigningId, setActiveSigningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle 1-click preset login
  const handleSelectPreset = async (preset: DemoRolePreset, autoSignIn = true) => {
    // 1. Visually auto-fill fields immediately
    if (onFillCredentials) {
      onFillCredentials(preset.email, preset.password);
    }

    if (!autoSignIn) {
      setCopiedId(preset.id);
      setTimeout(() => setCopiedId(null), 2000);
      return;
    }

    // 2. Immediate 1-click Sign In
    setActiveSigningId(preset.id);
    try {
      await onQuickLogin(preset.role, preset.email, preset.password);
    } catch (err) {
      console.error('Quick login failed:', err);
    } finally {
      setActiveSigningId(null);
    }
  };

  return (
    <>
      {/* 1. Floating Pill in the bottom-left corner labeled '⚡ Demo Roles' */}
      <div className="fixed bottom-4 left-4 z-40 print:hidden select-none">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label="Toggle Demo Roles Quick Switcher"
          className={`group flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-xl backdrop-blur-xl border cursor-pointer active:scale-95 ${
            isOpen
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border-amber-500/40 hover:border-amber-400 shadow-slate-950/60'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>

          <span className="flex items-center gap-1 font-mono tracking-wide">
            <Zap className={`w-3.5 h-3.5 ${isOpen ? 'text-slate-950 fill-slate-950' : 'text-amber-400 fill-amber-400'}`} />
            <span>⚡ Demo Roles</span>
          </span>

          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
            isOpen ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {isOpen ? 'Close' : '1-Click'}
          </span>
        </button>
      </div>

      {/* 2. Backdrop Overlay when Drawer is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* 3. Bottom Sheet / Side Panel with 1-Click Preset Logins */}
      {isOpen && (
        <aside
          ref={panelRef}
          role="dialog"
          aria-label="Demo Testing Roles Panel"
          className="fixed bottom-16 left-4 z-50 w-full max-w-md sm:max-w-lg bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 flex flex-col max-h-[85vh]"
        >
          {/* Top ambient colored light border */}
          <div className="h-1 bg-gradient-to-r from-purple-500 via-sky-400 to-amber-400" />

          {/* Panel Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-start justify-between gap-3 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <Zap className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-wider uppercase">
                    Demo Role Switcher
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    DEV & QA
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Click any role below to auto-fill credentials and immediately sign in.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
              title="Close panel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Role Cards List (Scrollable) */}
          <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
            {DEMO_ROLES.map((preset) => {
              const IconComponent = preset.icon;
              const isSigningThis = activeSigningId === preset.id || (isAuthenticating && currentEmail === preset.email);
              const isCurrentlySelected = currentEmail?.toLowerCase() === preset.email.toLowerCase();

              return (
                <div
                  key={preset.id}
                  className={`group relative rounded-2xl p-3.5 transition-all duration-200 border bg-slate-950/60 ${preset.cardBorder} ${preset.hoverBorder} hover:bg-slate-950/90 hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Role Icon and Information */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${preset.badgeBg} ${preset.badgeBorder} ${preset.accentColor}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                            {preset.name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${preset.badgeBg} ${preset.badgeBorder} ${preset.badgeText}`}>
                            {preset.badgeTitle}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {preset.description}
                        </p>

                        {/* Capabilities pills */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {preset.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-900 border border-slate-800 text-slate-400"
                            >
                              • {cap}
                            </span>
                          ))}
                        </div>

                        {/* Credentials indicator */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                          <span className="text-slate-400 truncate">{preset.email}</span>
                          <span>•</span>
                          <span className="text-slate-500">••••••••••••</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(preset, false)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition cursor-pointer flex items-center gap-1"
                      title="Only fill inputs without signing in"
                    >
                      {copiedId === preset.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Filled!</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3 h-3 text-slate-400" />
                          <span>Fill Only</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSigningThis}
                      onClick={() => handleSelectPreset(preset, true)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 bg-gradient-to-r ${preset.buttonGradient} disabled:opacity-50`}
                    >
                      {isSigningThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In as {preset.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel Footer */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Core Banking Role Switcher</span>
            </span>
            <span className="font-mono text-[10px] text-slate-600">v1.4.2 DEV</span>
          </div>
        </aside>
      )}
    </>
  );
};

export default DemoAccountSwitcher;
