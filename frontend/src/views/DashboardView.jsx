import React, { useState } from 'react';
import {
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Coins
} from 'lucide-react';
import { MOCK_LOANS, MOCK_BORROWERS, MOCK_RECEIPTS } from '../data/mockData';
import { CleanPaymentModal } from '../components/loans/CleanPaymentModal';

export const DashboardView: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const [selectedCollectLoan, setSelectedCollectLoan] = useState<any>(null);

  // Top Metrics Calculation
  const totalOutstandingUSD = 1845200;
  const totalOutstandingKHR = 7565320000;
  const activeBorrowersCount = MOCK_BORROWERS.length || 148;
  const todayExpectedUSD = 12500;
  const todayCollectedUSD = 9840;
  const par30Percentage = 3.8;

  // Due Today List
  const installmentsDueToday = [
    {
      id: 'inst-1',
      loanId: 'loan-1',
      loanCode: 'LN-2026-0042',
      borrowerName: 'Sokha Chan',
      phone: '012 884 920',
      amountUSD: 450.0,
      currency: 'USD',
      installmentNo: 4,
      status: 'DUE_TODAY'
    },
    {
      id: 'inst-2',
      loanId: 'loan-2',
      loanCode: 'LN-2026-0012',
      borrowerName: 'Dara Pich',
      phone: '010 339 214',
      amountUSD: 320.0,
      currency: 'USD',
      installmentNo: 2,
      status: 'OVERDUE'
    },
    {
      id: 'inst-3',
      loanId: 'loan-3',
      loanCode: 'LN-2026-0088',
      borrowerName: 'Vannak Keo',
      phone: '098 776 541',
      amountUSD: 650.0,
      currency: 'USD',
      installmentNo: 6,
      status: 'DUE_TODAY'
    },
    {
      id: 'inst-4',
      loanId: 'loan-4',
      loanCode: 'LN-2026-0004',
      borrowerName: 'Sokha Chea',
      phone: '017 443 219',
      amountUSD: 850.0,
      currency: 'USD',
      installmentNo: 5,
      status: 'OVERDUE'
    }
  ];

  // Recent Transaction Feed
  const recentTransactions = MOCK_RECEIPTS.slice(0, 5).map((r, i) => ({
    id: r.id || `tx-${i}`,
    receiptNo: r.receiptNumber || `REC-2026-000${i + 1}`,
    borrowerName: r.borrowerName || 'Client Account',
    amountUSD: r.amountUSD || 450,
    method: r.paymentMethod || 'KHQR',
    time: 'Today, 10:45 AM',
    status: 'CONFIRMED'
  }));

  const handleQuickCollect = (item: any) => {
    setSelectedCollectLoan({
      id: item.loanId || item.id,
      loanCode: item.loanCode,
      borrowerName: item.borrowerName,
      currency: item.currency || 'USD',
      schedules: [
        {
          id: item.id,
          installmentNo: item.installmentNo,
          dueDate: new Date().toISOString().split('T')[0],
          totalDue: item.amountUSD,
          status: item.status
        }
      ]
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-100">
      {/* 1. Header Greeting & Date Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Core Banking Operations Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time portfolio management & liquidity monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>System Date: {new Date().toISOString().split('T')[0]}</span>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Outstanding Portfolio (USD & KHR) */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              $
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-mono">
              ${totalOutstandingUSD.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              ៛ {totalOutstandingKHR.toLocaleString()} KHR
            </div>
          </div>
        </div>

        {/* Metric 2: Active Borrowers */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Borrowers
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {activeBorrowersCount.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +8 registered this week
            </div>
          </div>
        </div>

        {/* Metric 3: Today's Expected vs Collected */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's Collections
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              ${todayCollectedUSD.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Target: ${todayExpectedUSD.toLocaleString()} ({Math.round((todayCollectedUSD / todayExpectedUSD) * 100)}%)
            </div>
          </div>
        </div>

        {/* Metric 4: Portfolio at Risk (PAR 30+) */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              PAR 30+ Risk
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              HEALTHY
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">
              {par30Percentage}%
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              NBC regulatory threshold: 5.0%
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Operational Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Installments Due Today */}
        <div className="lg:col-span-2 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Installments Due Today</h3>
              <p className="text-xs text-slate-400">Scheduled repayments requiring cashier collection</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
              {installmentsDueToday.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-6">Loan & Borrower</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4">Due Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {installmentsDueToday.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-white">{row.borrowerName}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{row.loanCode} • {row.phone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      Installment #{row.installmentNo}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      ${row.amountUSD.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      {row.status === 'OVERDUE' ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                          Due Today
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleQuickCollect(row)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow cursor-pointer"
                      >
                        1-Click Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 Col): Quick Actions & Recent Transactions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate && onNavigate('new-loan')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-white text-xs font-bold transition text-left cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>New Loan Application</span>
              </button>
              <button
                onClick={() => onNavigate && onNavigate('borrowers')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-white text-xs font-bold transition text-left cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-sky-400" />
                <span>Register Borrower</span>
              </button>
              <button
                onClick={() => onNavigate && onNavigate('reports')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-white text-xs font-bold transition text-left cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Export Portfolio Report</span>
              </button>
            </div>
          </div>

          {/* Recent Transaction Ledger Feed */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Recent Collections Feed</h3>
            <div className="divide-y divide-slate-800/80">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{tx.borrowerName}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{tx.receiptNo} • {tx.method}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400">+${tx.amountUSD.toFixed(2)}</div>
                    <div className="text-slate-500 text-[11px]">{tx.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collect Modal */}
      {selectedCollectLoan && (
        <CleanPaymentModal
          loan={selectedCollectLoan}
          onClose={() => setSelectedCollectLoan(null)}
          onSuccess={() => setSelectedCollectLoan(null)}
        />
      )}
    </div>
  );
};

export default DashboardView;
