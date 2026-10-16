import React from 'react';
import { Currency, LoanApplication, Borrower } from '../../types';
import { MoneyText } from '../common/MoneyText';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  UserCheck,
  ArrowRight
} from 'lucide-react';

export interface LoanOfficerDashboardProps {
  currency: Currency;
  onNavigate: (tab: string) => void;
  applications: LoanApplication[];
  borrowers: Borrower[];
}

export const LoanOfficerDashboard: React.FC<LoanOfficerDashboardProps> = ({
  currency,
  onNavigate,
  applications,
  borrowers
}) => {
  const pendingApps = applications.filter((a) => a.status === 'SUBMITTED').length;
  const underReviewApps = applications.filter((a) => a.status === 'UNDER_REVIEW').length;
  const approvedApps = applications.filter(
    (a) => a.status === 'APPROVED' || (a.status as any) === 'DISBURSED' || (a.status as any) === 'ACTIVE'
  ).length;
  const rejectedApps = applications.filter((a) => a.status === 'REJECTED').length;
  const totalAssigned = applications.length;

  // Workload estimate
  const activeWorkload = pendingApps + underReviewApps;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#CBD5E1]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Loan Officer Underwriting Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Loan application intake, borrower documentation verification, and credit underwriting triage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('credit_reviews')}
            className="px-3.5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Underwriting Queue</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Pending */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Pending Intake</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingApps}</div>
          <span className="text-[10px] text-[#64748B]">Awaiting verification</span>
        </div>

        {/* Under Review */}
        <div
          onClick={() => onNavigate('credit_reviews')}
          className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Under Review</span>
          <div className="text-2xl font-bold text-[#2563EB] mt-1">{underReviewApps}</div>
          <span className="text-[10px] text-[#64748B]">Active analysis</span>
        </div>

        {/* Approved */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 cursor-pointer hover:border-slate-400 transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Sanctioned</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{approvedApps}</div>
          <span className="text-[10px] text-[#64748B]">Passed committee</span>
        </div>

        {/* Rejected */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 cursor-pointer hover:border-slate-400 transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Declined</span>
          <div className="text-2xl font-bold text-red-600 mt-1">{rejectedApps}</div>
          <span className="text-[10px] text-[#64748B]">Non-compliant</span>
        </div>

        {/* Assigned */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 cursor-pointer hover:border-slate-400 transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Total Pipeline</span>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{totalAssigned}</div>
          <span className="text-[10px] text-[#64748B]">Assigned accounts</span>
        </div>

        {/* Workload */}
        <div
          onClick={() => onNavigate('credit_reviews')}
          className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 cursor-pointer hover:border-slate-400 transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Workload</span>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{activeWorkload} files</div>
          <span className="text-[10px] text-emerald-700 font-medium">Optimal capacity</span>
        </div>
      </div>

      {/* 3. Applications Queue Table */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] overflow-hidden">
        <div className="p-4 border-b border-[#CBD5E1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Underwriting Workload Queue
            </h3>
          </div>
          <button
            onClick={() => onNavigate('credit_reviews')}
            className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
          >
            Review All &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>App #</th>
                <th>Borrower</th>
                <th>Product</th>
                <th className="text-right">Amount</th>
                <th>DTI Ratio</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 6).map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="font-mono font-bold text-[#2563EB]">{app.applicationNo}</td>
                  <td className="font-semibold text-[#0F172A]">{app.borrowerName}</td>
                  <td className="text-[#64748B]">{app.productName}</td>
                  <td className="text-right font-bold text-[#0F172A]">
                    <MoneyText amount={app.requestedAmountUSD} currency={currency} />
                  </td>
                  <td className="font-mono text-[#0F172A]">{app.dtiRatio || 25}%</td>
                  <td>
                    <span
                      className={`badge ${
                        app.status === 'APPROVED'
                          ? 'badge-success'
                          : app.status === 'REJECTED'
                          ? 'badge-danger'
                          : app.status === 'UNDER_REVIEW'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => onNavigate('credit_reviews')}
                      className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
                    >
                      Assess &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
