import React, { useState } from 'react';
import {
  Wallet,
  Users,
  CalendarCheck,
  AlertOctagon,
  TrendingUp,
  FilePlus2,
  QrCode,
  UserPlus,
  CreditCard,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { Currency } from '../../types';

export interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
  onOpenNewApplication?: () => void;
  onOpenNewBorrower?: () => void;
  onOpenQuickPayment?: (borrowerName?: string, amount?: number) => void;
  currency?: Currency;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewApplication,
  onOpenNewBorrower,
  onOpenQuickPayment,
  currency = 'USD'
}) => {
  // Demo dataset for installments due today
  const [todaysDueList, setTodaysDueList] = useState([
    {
      id: 'due-1',
      loanCode: 'LN-BKK-0081',
      borrowerName: 'Sokha Chan',
      borrowerNameKh: 'ចាន់ សុខា',
      phone: '012 345 678',
      dueAmountUSD: 459.50,
      dueAmountKHR: 1883950,
      dueDate: 'Today (23 Oct)',
      isPaid: false
    },
    {
      id: 'due-2',
      loanCode: 'LN-SR-0142',
      borrowerName: 'Chhaya Meng',
      borrowerNameKh: 'ម៉េង ឆាយា',
      phone: '098 765 432',
      dueAmountUSD: 310.00,
      dueAmountKHR: 1271000,
      dueDate: 'Today (23 Oct)',
      isPaid: false
    },
    {
      id: 'due-3',
      loanCode: 'LN-BAT-0099',
      borrowerName: 'Dara Rath',
      borrowerNameKh: 'រ័ត្ន តារា',
      phone: '077 889 900',
      dueAmountUSD: 520.00,
      dueAmountKHR: 2132000,
      dueDate: 'Today (23 Oct)',
      isPaid: false
    },
    {
      id: 'due-4',
      loanCode: 'LN-KPC-0067',
      borrowerName: 'Bopha Pich',
      borrowerNameKh: 'ពេជ្រ បុប្ផា',
      phone: '085 223 344',
      dueAmountUSD: 185.00,
      dueAmountKHR: 758500,
      dueDate: 'Today (23 Oct)',
      isPaid: true
    }
  ]);

  // Recent Repayments Activity Feed
  const [activityFeed, setActivityFeed] = useState([
    {
      id: 'act-1',
      borrower: 'Vannak Heng (ហេង វណ្ណៈ)',
      amountUSD: 450.00,
      method: 'Bakong KHQR',
      time: '12 mins ago',
      loanCode: 'LN-CAP-0094'
    },
    {
      id: 'act-2',
      borrower: 'Sreymom Keo (កែវ ស្រីមុំ)',
      amountUSD: 620.00,
      method: 'Cash',
      time: '45 mins ago',
      loanCode: 'LN-BKK-0072'
    },
    {
      id: 'act-3',
      borrower: 'Piseth Oeng (អ៊ឹង ពិសិដ្ឋ)',
      amountUSD: 1200.00,
      method: 'Bank Transfer',
      time: '2 hours ago',
      loanCode: 'LN-TK-0034'
    }
  ]);

  const handle1ClickCollect = (id: string, name: string, amount: number) => {
    if (onOpenQuickPayment) {
      onOpenQuickPayment(name, amount);
    } else if (onNavigate) {
      onNavigate('cashier');
    } else {
      setTodaysDueList(prev => prev.map(item => item.id === id ? { ...item, isPaid: true } : item));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Executive Financial Cockpit
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Modern Financial Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Real-time portfolio liquidity, expected installment collections, and operational queue.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 KEY METRIC CARDS GRID                                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* CARD 1: Total Outstanding Portfolio (Split USD & KHR) */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Outstanding Portfolio
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              <CurrencyDisplay amount={1784250.00} currency="USD" />
            </div>
            <div className="text-sm font-bold text-amber-400 font-mono">
              <CurrencyDisplay amount={7315425000} currency="KHR" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>Portfolio Quality</span>
            <span className="text-emerald-400 font-semibold">Tier 1 Prime</span>
          </div>
        </div>

        {/* CARD 2: Active Borrowers (+X% growth metric) */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Borrowers
            </span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            1,284
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8.4% vs last month</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>KYC Verified</span>
            <span className="text-white font-semibold">98.2%</span>
          </div>
        </div>

        {/* CARD 3: Today's Expected Collections vs. Actual Collected */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Collections
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            <CurrencyDisplay amount={1474.50} currency="USD" />
          </div>
          <div className="text-xs text-slate-400 mt-1 flex justify-between">
            <span>Target: $1,850.00</span>
            <span className="text-amber-400 font-bold">79.7%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full w-[80%]" />
          </div>
        </div>

        {/* CARD 4: Portfolio at Risk (PAR 30+) percentage gauge */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Portfolio at Risk (PAR 30+)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
              2.45%
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Healthy
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Industry limit: &lt; 3.0% threshold
          </p>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>Critical Overdue 30+d</span>
            <span className="text-white font-mono">$43,610.00</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPERATIONAL SECTIONS (2 COLUMNS)                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2 Cols wide): Table of Today's Installments Due */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Today's Installments Due (ត្រូវប្រមូលថ្ងៃនេះ)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Borrowers scheduled to repay today. Quick 1-click collection available.
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
              {todaysDueList.filter(i => !i.isPaid).length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Borrower Name & Ref</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4 text-right">Due Amount</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {todaysDueList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{item.borrowerName}</div>
                      <div className="text-[11px] text-slate-400">{item.borrowerNameKh} • <span className="text-emerald-400 font-mono">{item.loanCode}</span></div>
                    </td>
                    <td className="py-3 px-4">
                      <a href={`tel:${item.phone}`} className="text-slate-300 hover:text-cyan-400 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {item.phone}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-white font-mono">
                        <CurrencyDisplay amount={item.dueAmountUSD} currency="USD" />
                      </div>
                      <div className="text-[10px] text-amber-400/90 font-mono">
                        <CurrencyDisplay amount={item.dueAmountKHR} currency="KHR" />
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-amber-400 font-medium">{item.dueDate}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.isPaid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" /> Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => handle1ClickCollect(item.id, item.borrowerName, item.dueAmountUSD)}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 transition-all shadow-md active:scale-95 flex items-center gap-1 mx-auto"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN (1 Col wide): Quick Shortcuts & Recent Repayments Activity Feed */}
        <div className="space-y-6">
          {/* Quick Action Shortcuts */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Quick Action Shortcuts
            </h3>
            <div className="space-y-2.5">
              <button
                onClick={onOpenNewApplication || (() => onNavigate?.('new-application'))}
                className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/60 transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <FilePlus2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-emerald-400 transition">
                      New Loan Application
                    </span>
                    <span className="text-[10px] text-slate-400">Originate borrower facility</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </button>

              <button
                onClick={() => onNavigate?.('cashier')}
                className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/60 transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-amber-400 transition">
                      Quick KHQR Payment
                    </span>
                    <span className="text-[10px] text-slate-400">Generate Bakong dynamic QR</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </button>

              <button
                onClick={onOpenNewBorrower || (() => onNavigate?.('borrowers'))}
                className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-cyan-400 transition">
                      Register Borrower
                    </span>
                    <span className="text-[10px] text-slate-400">Onboard KYC dossier</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </button>
            </div>
          </div>

          {/* Activity Feed: Recent Repayments */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Repayments Feed
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              {activityFeed.map((item) => (
                <div key={item.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white">{item.borrower}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +<CurrencyDisplay amount={item.amountUSD} currency="USD" />
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{item.method} • <span className="font-mono text-slate-500">{item.loanCode}</span></span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
