import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, ShieldCheck, UserCheck, Sparkles, LayoutDashboard, QrCode } from 'lucide-react';
import logoImg from '../../assets/logo-transparent.png';
import { useLanguage } from '../../context/LanguageContext';

export interface AccessDeniedPageProps {
  onBackToDashboard: () => void;
  onLogout?: () => void;
  onSwitchToAdmin?: () => void;
  onNavigateToPortal?: () => void;
  currentUserRole?: string;
  currentUserName?: string;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  onBackToDashboard,
  onLogout,
  onSwitchToAdmin,
  onNavigateToPortal,
  currentUserRole = 'Client Borrower',
  currentUserName = 'Fong Ly',
}) => {
  const { language, setLanguage, t } = useLanguage();
  const isDev =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '3000' ||
        window.location.port === '5000'));

  const handleInstantAdminBypass = () => {
    if (onSwitchToAdmin) {
      onSwitchToAdmin();
      return;
    }
    try {
      const stored = localStorage.getItem('apex_user');
      const user = stored ? JSON.parse(stored) : {};
      user.role = 'ADMIN';
      user.title = 'System Administrator';
      user.position = 'System Administrator';
      user.department = 'Executive Administration';
      localStorage.setItem('apex_user', JSON.stringify(user));
      window.location.href = window.location.pathname.toLowerCase().includes('/loan-management-system')
        ? '/Loan-management-system/admin/dashboard'
        : '/admin/dashboard';
    } catch {
      onBackToDashboard();
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#0F172A]">
      {/* Language Switcher Pill */}
      <div className="absolute top-4 right-4 flex items-center bg-white border border-[#E2E8F0] rounded-[6px] p-0.5 text-[11px] font-semibold shadow-xs">
        <button
          type="button"
          onClick={() => setLanguage('km')}
          className={`px-2.5 py-1 rounded-[4px] transition-colors ${
            language === 'km'
              ? 'bg-[#2563EB] text-white font-bold'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          KH
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 rounded-[4px] transition-colors ${
            language === 'en'
              ? 'bg-[#2563EB] text-white font-bold'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          EN
        </button>
      </div>

      <div className="w-full max-w-[520px]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[12px] bg-slate-50 border border-slate-200/80 mb-3 p-2">
            <img src={logoImg} alt="Jam Song Vich" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
            {t('Jam Song Vich')}
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mt-0.5">
            {t('Loan Management System')}
          </p>
        </div>

        {/* Access Denied Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
              403 • Restricted Access
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A]">
              {t('Access Denied')}
            </h2>
            <p className="text-sm font-medium text-[#64748B]">
              {t('You do not have permission to access this page.')}
            </p>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto pt-1">
              {t('Administrative dashboards and management APIs are restricted exclusively to the system administrator account.')}
            </p>
          </div>

          {/* User Profile Context Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">{language === 'km' ? 'គណនីបច្ចុប្បន្ន:' : 'Active User:'}</span>
              <strong className="text-slate-900">{currentUserName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{language === 'km' ? 'តួនាទីសកម្ម:' : 'Current Role:'}</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold text-[10px] uppercase">
                {currentUserRole}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{language === 'km' ? 'ការអនុញ្ញាតដែលត្រូវការ:' : 'Required Role:'}</span>
              <span className="font-mono text-emerald-700 font-bold">ADMIN / SUPERADMIN</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('Back to Dashboard')}</span>
            </button>

            {onNavigateToPortal && (
              <button
                type="button"
                onClick={onNavigateToPortal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{language === 'km' ? 'ទៅកាន់ផតថលអតិថិជន (/portal)' : 'Open Borrower Portal (/portal)'}</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>{t('Sign Out')}</span>
              </button>
            )}
          </div>

          {/* Development / Testing Quick Switcher (Prompt 2 Solution) */}
          <div className="mt-4 pt-4 border-t border-slate-200 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {language === 'km' ? 'ជម្រើសអ្នកអភិវឌ្ឍន៍ (Dev Quick Bypass)' : 'Development Quick-Bypass'}
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                Dev Mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleInstantAdminBypass}
                className="w-full p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{language === 'km' ? 'ប្តូរទៅ Admin ភ្លាមៗ' : 'Switch to Admin Role'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToPortal) onNavigateToPortal();
                  else {
                    window.location.href = window.location.pathname.toLowerCase().includes('/loan-management-system')
                      ? '/Loan-management-system/portal'
                      : '/portal';
                  }
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                <QrCode className="w-4 h-4 text-rose-400" />
                <span>{language === 'km' ? 'មើលផតថលអតិថិជន' : 'View Borrower Portal'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#64748B] mt-6">
          <p>© 2026 Jam Song Vich • {t('Security & Authorization Enforced', 'Security & Authorization Enforced')}</p>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
