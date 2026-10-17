import React from 'react';
import { Currency, LoanApplication, Borrower } from '../../types';
import { MoneyText } from '../common/MoneyText';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

export interface CreditOfficerDashboardProps {
  currency: Currency;
  onNavigate: (tab: string) => void;
  applications: LoanApplication[];
  borrowers: Borrower[];
}

export const CreditOfficerDashboard: React.FC<CreditOfficerDashboardProps> = ({
  currency,
  onNavigate,
  applications,
  borrowers
}) => {
  const pendingAssessments = applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;
  const completedAssessments = applications.filter(
    (a) => a.status === 'APPROVED' || a.status === 'REJECTED' || (a as any).creditOfficerReview
  ).length;

  // Real risk distribution derived from applications' DTI and credit scores
  const highRisk = applications.filter((a) => (a.dtiRatio && a.dtiRatio > 45) || a.riskTier === 'HIGH RISK').length;
  const mediumRisk = applications.filter(
    (a) => (a.dtiRatio && a.dtiRatio > 35 && a.dtiRatio <= 45) || a.riskTier === 'MEDIUM RISK'
  ).length;
  const lowRisk = applications.filter(
    (a) => (!a.dtiRatio || a.dtiRatio <= 35) && a.riskTier !== 'HIGH RISK' && a.riskTier !== 'MEDIUM RISK'
  ).length;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Credit Risk Officer Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Credit score analytics, debt-to-income (DTI) ratio stress testing, and risk tier governance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('credit_reviews')}
            className="px-3.5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Open DTI Workbench</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Pending */}
        <div
          onClick={() => onNavigate('credit_reviews')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Pending Assessment</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingAssessments}</div>
          <span className="text-[10px] text-[#64748B]">Awaiting risk check</span>
        </div>

        {/* Completed */}
        <div
          onClick={() => onNavigate('credit_reviews')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Assessed</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{completedAssessments}</div>
          <span className="text-[10px] text-[#64748B]">Signed &amp; scored</span>
        </div>

        {/* High Risk */}
        <div
          onClick={() => onNavigate('credit_reviews')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 cursor-pointer hover:border-red-400 transition-colors"
        >
          <span className="text-[11px] font-bold text-red-600 uppercase">High Risk (DTI &gt; 45%)</span>
          <div className="text-2xl font-bold text-red-600 mt-1">{highRisk}</div>
          <span className="text-[10px] text-red-700">Strict scrutiny</span>
        </div>

        {/* Medium Risk */}
        <div
          onClick={() => onNavigate('credit_reviews')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 cursor-pointer hover:border-amber-400 transition-colors"
        >
          <span className="text-[11px] font-bold text-amber-600 uppercase">Medium Risk (35-45%)</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{mediumRisk}</div>
          <span className="text-[10px] text-[#64748B]">Mitigants required</span>
        </div>

        {/* Low Risk */}
        <div
          onClick={() => onNavigate('credit_reviews')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 cursor-pointer hover:border-emerald-400 transition-colors"
        >
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Low Risk (DTI &lt; 35%)</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{lowRisk}</div>
          <span className="text-[10px] text-emerald-700">Prime borrower</span>
        </div>
      </div>

      {/* 3. Risk Assessment Workbench Queue */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Underwriting Risk Assessment Queue
            </h3>
          </div>
          <button
            onClick={() => onNavigate('credit_reviews')}
            className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
          >
            All Risk Files &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>App #</th>
                <th>Borrower</th>
                <th>Monthly Income</th>
                <th className="text-right">Requested</th>
                <th>DTI Ratio</th>
                <th>Calculated Risk</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 6).map((app) => {
                const dti = app.dtiRatio || 25;
                const riskLevel = dti > 45 ? 'HIGH RISK' : dti > 35 ? 'MEDIUM RISK' : 'LOW RISK';
                return (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="font-mono font-bold text-[#2563EB]">{app.applicationNo}</td>
                    <td className="font-semibold text-[#0F172A]">{app.borrowerName}</td>
                    <td className="font-medium text-[#0F172A]">
                      <MoneyText amount={app.borrowerIncomeUSD || 1500} currency={currency} />
                    </td>
                    <td className="text-right font-bold text-[#0F172A]">
                      <MoneyText amount={app.requestedAmountUSD} currency={currency} />
                    </td>
                    <td className="font-mono font-bold text-[#0F172A]">{dti}%</td>
                    <td>
                      <span
                        className={`badge ${
                          riskLevel === 'HIGH RISK'
                            ? 'badge-danger'
                            : riskLevel === 'MEDIUM RISK'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                      >
                        {riskLevel}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => onNavigate('credit_reviews')}
                        className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
                      >
                        Evaluate DTI &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
