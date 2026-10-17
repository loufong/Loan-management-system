import React from 'react';
import { UserProfile } from '../../types';
import { User, Mail, Shield, Building, KeyRound, CheckCircle, Calendar, Hash } from 'lucide-react';

export interface UserProfileViewProps {
  currentUser: UserProfile;
  onChangePassword?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  onChangePassword,
}) => {
  const role = (currentUser.role || 'USER').toUpperCase();
  const isAdmin = role === 'ADMIN';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-xl font-bold text-[#0F172A] shrink-0">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                {currentUser.name || currentUser.fullName || 'User Profile'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isAdmin ? 'System Administrator • Full Platform Governance' : 'Institutional Client Borrower'}
            </p>
          </div>
        </div>

        {onChangePassword && (
          <button
            type="button"
            onClick={onChangePassword}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-[6px] transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </button>
        )}
      </div>

      {/* 2. Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#E2E8F0] pb-2">
            Account Information
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Full Name
              </span>
              <span className="font-semibold text-[#0F172A]">{currentUser.name || currentUser.fullName}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                Username
              </span>
              <span className="font-mono text-[#0F172A]">{currentUser.username || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Email Address
              </span>
              <span className="text-[#0F172A]">{currentUser.email || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Assigned Role
              </span>
              <span className="font-semibold text-[#2563EB]">{isAdmin ? 'ADMIN' : 'USER'}</span>
            </div>
          </div>
        </div>

        {/* Institutional & Branch Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#E2E8F0] pb-2">
            Institutional Assignment
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] flex items-center gap-2">
                <Building className="w-3.5 h-3.5" />
                Branch Location
              </span>
              <span className="text-[#0F172A]">{currentUser.branch || 'Phnom Penh Main Branch'}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] flex items-center gap-2">
                <Building className="w-3.5 h-3.5" />
                Department
              </span>
              <span className="text-[#0F172A]">{currentUser.department || (isAdmin ? 'Risk & Governance' : 'Client Retail')}</span>
            </div>

            {currentUser.borrowerId && (
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  Borrower ID
                </span>
                <span className="font-mono text-[#2563EB]">{currentUser.borrowerId}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Last Login
              </span>
              <span className="text-[#64748B]">
                {currentUser.lastLogin
                  ? new Date(currentUser.lastLogin).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Active session'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
