import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Building2 } from 'lucide-react';

interface AccessDeniedPageProps {
  onBackToDashboard: () => void;
  onLogout?: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  onBackToDashboard,
  onLogout,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#0F172A]">
      <div className="w-full max-w-[480px]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[8px] bg-[#0F172A] text-white mb-3">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
            APEX LMS
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mt-0.5">
            Enterprise Loan Management System
          </p>
        </div>

        {/* Access Denied Card */}
        <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-6 sm:p-8 space-y-6 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#0F172A]">
              Access Denied
            </h2>
            <p className="text-sm font-medium text-[#64748B]">
              You do not have permission to access this page.
            </p>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto pt-1">
              Administrative dashboards and management APIs are restricted exclusively to the system administrator account.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#64748B] mt-6">
          <p>© 2026 Apex LMS • Security & Authorization Enforced</p>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
