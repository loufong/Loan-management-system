import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  ShieldAlert,
  Download,
  Calendar,
  Filter,
  Coins,
  TrendingDown,
  Building,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReports, ReportItem } from '../hooks/useReports';

export const ReportsView: React.FC = () => {
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const role = (currentUser?.role || '').toLowerCase();
  const isAllowed = ['admin', 'manager', 'accountant', 'loan_officer', 'teller'].includes(role);

  // Access Guard: If not staff, redirect
  useEffect(() => {
    if (!isAllowed && typeof window !== 'undefined') {
      window.location.replace('/my-loans');
    }
  }, [isAllowed]);

  const [reportType, setReportType] = useState<
    'Active Loan Portfolio' | 'Overdue & Aging Analysis (PAR 30/60/90)' | 'Daily Cashier Collection Sheet'
  >('Active Loan Portfolio');

  const { reports, isLoading, error } = useReports({ reportType });

  // Summary Metrics
  const disbursedUSD = 500000;
  const disbursedKHR = 2050000000;
  const collectedUSD = 200000;
  const collectedKHR = 820000000;
  const outstandingUSD = 360000;
  const outstandingKHR = 1476000000;
  const overdueRiskUSD = 36000;
  const overdueRiskKHR = 147600000;

  // CSV Export Utility
  const handleExportCSV = () => {
    if (!reports || reports.length === 0) return;
    const headers = ['Reference No', 'Borrower Name', 'Product', 'Disbursed ($)', 'Collected ($)', 'Outstanding ($)', 'Status', 'Date'];
    const rows = reports.map((r) => [
      `"${r.referenceNo}"`,
      `"${r.borrowerName}"`,
      `"${r.productName}"`,
      r.disbursedAmountUSD,
      r.collectedAmountUSD,
      r.outstandingAmountUSD,
      `"${r.status}"`,
      `"${r.date}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAllowed) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
        <h2 className="text-lg font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Administrative reports are restricted to authorized bank officers. Redirecting to your portal...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-100 space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Portfolio Reports & BI Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cambodian microfinance portfolio reporting, aging analysis, and regulatory exports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 cursor-pointer shadow"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Banner (USD & KHR Dual-Currency Totals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Disbursed */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Disbursed
          </span>
          <div className="text-2xl font-black text-white font-mono">
            ${disbursedUSD.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            ៛ {disbursedKHR.toLocaleString()} KHR
          </div>
        </div>

        {/* Collected */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Principal Collected
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ${collectedUSD.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            ៛ {collectedKHR.toLocaleString()} KHR
          </div>
        </div>

        {/* Outstanding */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Outstanding Balance
          </span>
          <div className="text-2xl font-black text-sky-400 font-mono">
            ${outstandingUSD.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            ៛ {outstandingKHR.toLocaleString()} KHR
          </div>
        </div>

        {/* Overdue Risk */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Overdue Risk (PAR)
          </span>
          <div className="text-2xl font-black text-rose-400 font-mono">
            ${overdueRiskUSD.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            ៛ {overdueRiskKHR.toLocaleString()} KHR
          </div>
        </div>
      </div>

      {/* 3. Report Type Selector */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          'Active Loan Portfolio',
          'Overdue & Aging Analysis (PAR 30/60/90)',
          'Daily Cashier Collection Sheet'
        ].map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              reportType === type
                ? 'bg-slate-800 text-white shadow border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* 4. Report Data Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Reference No</th>
                <th className="py-3.5 px-4">Borrower Name</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Disbursed ($)</th>
                <th className="py-3.5 px-4">Collected ($)</th>
                <th className="py-3.5 px-4">Outstanding ($)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Value Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {reports.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-6 font-bold text-white">{row.referenceNo}</td>
                  <td className="py-3.5 px-4 font-sans text-white">{row.borrowerName}</td>
                  <td className="py-3.5 px-4 font-sans text-slate-400">{row.productName}</td>
                  <td className="py-3.5 px-4 text-white">${row.disbursedAmountUSD.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-emerald-400">${row.collectedAmountUSD.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-bold text-white">${row.outstandingAmountUSD.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-sans">
                    {row.status === 'OVERDUE' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold">
                        Overdue
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-400">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
