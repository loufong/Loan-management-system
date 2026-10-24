import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  Printer,
  ChevronDown,
  ChevronUp,
  Receipt,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { CleanPaymentModal } from '../components/loans/CleanPaymentModal';
import { useAuth } from '../context/AuthContext';
import { MOCK_LOANS, MOCK_RECEIPTS } from '../data/mockData';

export const MyLoansView: React.FC = () => {
  const { user, profile } = useAuth();
  const currentBorrower = profile || user;
  const borrowerName = currentBorrower?.fullName || currentBorrower?.name || 'Johnathan Doe';

  // Active Loan Account
  const activeLoan = useMemo(() => {
    return (
      MOCK_LOANS.find((l) => (l.status || '').toUpperCase() === 'ACTIVE') ||
      MOCK_LOANS[0]
    );
  }, []);

  const [activeTab, setActiveTab] = useState<'schedule' | 'receipts'>('schedule');
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | undefined>(undefined);

  // Financial Metrics
  const principalBalance = activeLoan?.remainingPrincipalUSD || 3850;
  const totalPrincipal = activeLoan?.principalAmountUSD || 5000;
  const nextInstallmentAmount = 450;
  const nextDueDate = '2026-11-15';
  const percentRepaid = Math.round(((totalPrincipal - principalBalance) / totalPrincipal) * 100);

  // Installment Schedule Rows
  const schedules = useMemo(() => {
    return (activeLoan?.schedules || []).map((s: any, idx: number) => {
      const num = s.installmentNo || idx + 1;
      let status = (s.status || 'UNPAID').toUpperCase();
      if (num < 4) status = 'PAID';
      else if (num === 4) status = 'PENDING';
      else if (num === 5) status = 'OVERDUE';
      return {
        ...s,
        installmentNo: num,
        status,
        dueDate: s.dueDate || `2026-0${Math.min(9, num + 1)}-15`,
        totalDue: s.totalDueUSD || 450,
        paidAmount: status === 'PAID' ? 450 : 0
      };
    });
  }, [activeLoan]);

  const handlePayInstallment = (installmentId?: string) => {
    setSelectedInstallmentId(installmentId);
    setIsPaymentModalOpen(true);
  };

  const handlePrintReceipt = (receiptNo: string) => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-6 text-slate-100">
      {/* 1. Header Overview Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACTIVE FACILITY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {borrowerName}
            </h1>
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-3 font-mono">
              <span>Loan Ref: #{activeLoan?.loanCode || 'LN-2026-0010'}</span>
              <span>•</span>
              <span>Disbursed: 2026-02-10</span>
            </p>
          </div>

          <button
            onClick={() => handlePayInstallment()}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-600/25 transition cursor-pointer"
          >
            <QrCode className="w-5 h-5" />
            <span>Pay with Bakong KHQR</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Grid & Animated Progress Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Remaining Balance */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Remaining Principal
            </span>
            <div className="text-3xl font-extrabold text-white mt-2 font-mono">
              ${principalBalance.toLocaleString()}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
            <span>Facility Size: ${totalPrincipal.toLocaleString()}</span>
            <span className="text-emerald-400 font-bold">{percentRepaid}% Repaid</span>
          </div>
        </div>

        {/* Metric 2: Next Installment */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Next Due Installment
            </span>
            <div className="text-3xl font-extrabold text-amber-400 mt-2 font-mono">
              ${nextInstallmentAmount.toFixed(2)}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Due Date: {nextDueDate}</span>
          </div>
        </div>

        {/* Metric 3: Progress Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Loan Maturity Progress
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-white font-mono">{percentRepaid}%</span>
              <span className="text-xs text-slate-400">settled to date</span>
            </div>
          </div>
          {/* Animated Progress Bar */}
          <div className="mt-4 w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percentRepaid}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Tab Switcher (Schedule vs Receipts) */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'schedule'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Repayment Schedule</span>
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'receipts'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment Receipts</span>
        </button>
      </div>

      {/* 4. Tab 1: Collapsible Schedule Table */}
      {activeTab === 'schedule' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div
            onClick={() => setIsScheduleOpen(!isScheduleOpen)}
            className="flex items-center justify-between px-6 py-4 bg-slate-900/80 cursor-pointer border-b border-slate-800/80"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Amortization Installments</span>
              <span className="text-xs text-slate-400">({schedules.length} periods)</span>
            </div>
            {isScheduleOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>

          {isScheduleOpen && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">#</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4">Total Due</th>
                    <th className="py-3.5 px-4">Paid Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {schedules.map((row: any) => {
                    const isPaid = row.status === 'PAID';
                    const isOverdue = row.status === 'OVERDUE';
                    return (
                      <tr key={row.id || row.installmentNo} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-6 font-bold text-white">#{row.installmentNo}</td>
                        <td className="py-3.5 px-4 text-slate-300">{row.dueDate}</td>
                        <td className="py-3.5 px-4 text-white font-bold">${Number(row.totalDue).toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-slate-400">${Number(row.paidAmount).toFixed(2)}</td>
                        <td className="py-3.5 px-4 font-sans">
                          {isPaid && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Paid
                            </span>
                          )}
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Overdue
                            </span>
                          )}
                          {!isPaid && !isOverdue && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          {!isPaid && (
                            <button
                              onClick={() => handlePayInstallment(row.id)}
                              className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold transition font-sans cursor-pointer"
                            >
                              Pay Now
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Receipts Tab with Print Button */}
      {activeTab === 'receipts' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden p-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Settlement Receipts</h3>
            <div className="divide-y divide-slate-800/80">
              {MOCK_RECEIPTS.slice(0, 5).map((rec: any) => (
                <div key={rec.id || rec.receiptNumber} className="py-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                      <span>{rec.receiptNumber || 'REC-2026-0001'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-sans">
                        CONFIRMED
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Paid via {rec.paymentMethod || 'KHQR'} • {rec.paymentDate || '2026-09-15'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-base font-bold text-white">
                      ${Number(rec.amountUSD || 450).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handlePrintReceipt(rec.receiptNumber)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Print Official Thermal Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clean Payment Modal */}
      {isPaymentModalOpen && (
        <CleanPaymentModal
          loan={activeLoan}
          initialScheduleId={selectedInstallmentId}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => setIsPaymentModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MyLoansView;
