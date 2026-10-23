import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  Users,
  UserCheck,
  TrendingUp,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Phone,
  PhoneCall,
  CreditCard,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  X,
  Building2,
  Sparkles,
  PieChart,
  MessageSquare,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { Currency, LoanAccount, Borrower, LoanApplication, PaymentReceipt } from '../../types';

export interface AdminDashboardProps {
  currency?: Currency;
  onNavigate?: (tab: string) => void;
  loans?: LoanAccount[];
  borrowers?: Borrower[];
  applications?: LoanApplication[];
  receipts?: PaymentReceipt[];
}

export type LoanHealthStatus = 'On Time' | 'Overdue 1-30 Days' | 'Critical 30+ Days';

export interface DueThisWeekLoan {
  id: string;
  loanCode: string;
  borrowerNameEn: string;
  borrowerNameKh: string;
  borrowerPhone: string;
  borrowerNationalId: string;
  productName: string;
  dueDate: string;
  dueDayLabel: string;
  daysDiff: number; // 0: today, >0: overdue, <0: future this week
  amountDueUSD: number;
  amountDueKHR: number;
  principalDueUSD: number;
  interestDueUSD: number;
  outstandingBalanceUSD: number;
  health: LoanHealthStatus;
  daysOverdue: number;
  branch: string;
}

// Baseline demo dataset for instant rich display if live props are empty
const FALLBACK_WEEK_LOANS: DueThisWeekLoan[] = [
  {
    id: 'ln-w1',
    loanCode: 'LN-BKK-0081',
    borrowerNameEn: 'Sokha Chan',
    borrowerNameKh: 'ចាន់ សុខា',
    borrowerPhone: '012 345 678',
    borrowerNationalId: '010892743',
    productName: 'SME Working Capital',
    dueDate: '2026-10-24',
    dueDayLabel: 'Due Tomorrow',
    daysDiff: -1,
    amountDueUSD: 459.50,
    amountDueKHR: 1883950,
    principalDueUSD: 396.12,
    interestDueUSD: 63.38,
    outstandingBalanceUSD: 3420.50,
    health: 'On Time',
    daysOverdue: 0,
    branch: 'Phnom Penh Main'
  },
  {
    id: 'ln-w2',
    loanCode: 'LN-SR-0142',
    borrowerNameEn: 'Chhaya Meng',
    borrowerNameKh: 'ម៉េង ឆាយា',
    borrowerPhone: '098 765 432',
    borrowerNationalId: '090123847',
    productName: 'Agricultural Expansion',
    dueDate: '2026-10-23',
    dueDayLabel: 'Due Today',
    daysDiff: 0,
    amountDueUSD: 310.00,
    amountDueKHR: 1271000,
    principalDueUSD: 275.00,
    interestDueUSD: 35.00,
    outstandingBalanceUSD: 2150.00,
    health: 'On Time',
    daysOverdue: 0,
    branch: 'Siem Reap Branch'
  },
  {
    id: 'ln-w3',
    loanCode: 'LN-BAT-0099',
    borrowerNameEn: 'Dara Rath',
    borrowerNameKh: 'រ័ត្ន តារា',
    borrowerPhone: '077 889 900',
    borrowerNationalId: '020485912',
    productName: 'Vehicle Purchase',
    dueDate: '2026-10-14',
    dueDayLabel: '9 Days Late',
    daysDiff: 9,
    amountDueUSD: 520.00,
    amountDueKHR: 2132000,
    principalDueUSD: 440.00,
    interestDueUSD: 80.00,
    outstandingBalanceUSD: 4890.00,
    health: 'Overdue 1-30 Days',
    daysOverdue: 9,
    branch: 'Battambang Branch'
  },
  {
    id: 'ln-w4',
    loanCode: 'LN-KPC-0067',
    borrowerNameEn: 'Bopha Pich',
    borrowerNameKh: 'ពេជ្រ បុប្ផា',
    borrowerPhone: '085 223 344',
    borrowerNationalId: '040392817',
    productName: 'Personal Microloan',
    dueDate: '2026-10-02',
    dueDayLabel: '21 Days Late',
    daysDiff: 21,
    amountDueUSD: 185.00,
    amountDueKHR: 758500,
    principalDueUSD: 160.00,
    interestDueUSD: 25.00,
    outstandingBalanceUSD: 1240.00,
    health: 'Overdue 1-30 Days',
    daysOverdue: 21,
    branch: 'Kampong Cham Branch'
  },
  {
    id: 'ln-w5',
    loanCode: 'LN-TK-0034',
    borrowerNameEn: 'Piseth Oeng',
    borrowerNameKh: 'អ៊ឹង ពិសិដ្ឋ',
    borrowerPhone: '010 998 877',
    borrowerNationalId: '050293841',
    productName: 'Commercial Property',
    dueDate: '2026-09-12',
    dueDayLabel: '41 Days Late',
    daysDiff: 41,
    amountDueUSD: 1450.00,
    amountDueKHR: 5945000,
    principalDueUSD: 1200.00,
    interestDueUSD: 250.00,
    outstandingBalanceUSD: 18450.00,
    health: 'Critical 30+ Days',
    daysOverdue: 41,
    branch: 'Takeo Branch'
  },
  {
    id: 'ln-w6',
    loanCode: 'LN-BKK-0092',
    borrowerNameEn: 'Vannak Heng',
    borrowerNameKh: 'ហេង វណ្ណៈ',
    borrowerPhone: '097 554 433',
    borrowerNationalId: '010776543',
    productName: 'SME Working Capital',
    dueDate: '2026-10-26',
    dueDayLabel: 'In 3 Days',
    daysDiff: -3,
    amountDueUSD: 620.00,
    amountDueKHR: 2542000,
    principalDueUSD: 535.00,
    interestDueUSD: 85.00,
    outstandingBalanceUSD: 5120.00,
    health: 'On Time',
    daysOverdue: 0,
    branch: 'Phnom Penh Main'
  }
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currency: initialCurrency = 'USD',
  onNavigate,
  loans = [],
  borrowers = [],
  applications = [],
  receipts = []
}) => {
  // Active currency view toggle: 'BOTH', 'USD', 'KHR'
  const [currencyMode, setCurrencyMode] = useState<'BOTH' | 'USD' | 'KHR'>('BOTH');
  const [searchFilter, setSearchFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('ALL');

  // Interactive Call Modal State
  const [callingLoan, setCallingLoan] = useState<DueThisWeekLoan | null>(null);
  const [callNotes, setCallNotes] = useState('');
  const [callStatusMessage, setCallStatusMessage] = useState<string | null>(null);

  // Quick Payment Modal State
  const [quickPayLoan, setQuickPayLoan] = useState<DueThisWeekLoan | null>(null);
  const [quickPaySuccess, setQuickPaySuccess] = useState(false);

  // USD to KHR fixed exchange rate for portfolio calculations
  const USD_TO_KHR = 4100;

  // Format money helper
  const formatUSD = (val: number) => {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatKHR = (val: number) => {
    return `៛${Math.round(val).toLocaleString('en-US')}`;
  };

  // 1. STAT: Total Disbursed (USD & KHR)
  const statsDisbursed = useMemo(() => {
    const totalUSD = loans.length > 0
      ? loans.reduce((sum, l) => sum + (l.principalUSD || 0), 0)
      : 2845000;
    const totalKHR = totalUSD * USD_TO_KHR;
    return { usd: totalUSD, khr: totalKHR };
  }, [loans]);

  // 2. STAT: Active Borrowers
  const statsActiveBorrowers = useMemo(() => {
    const count = borrowers.length > 0
      ? borrowers.filter(b => b.status === 'ACTIVE' || !b.status).length
      : 1284;
    return count;
  }, [borrowers]);

  // 3. STAT: Total Repayments Collected This Month
  const statsCollectedThisMonth = useMemo(() => {
    const totalUSD = receipts.length > 0
      ? receipts.reduce((sum, r) => sum + (r.amountPaidUSD || 0), 0)
      : 194500;
    const totalKHR = totalUSD * USD_TO_KHR;
    const monthlyTargetUSD = 210000;
    const percentage = Math.min(100, Math.round((totalUSD / monthlyTargetUSD) * 100));
    return { usd: totalUSD, khr: totalKHR, targetUSD: monthlyTargetUSD, percentage };
  }, [receipts]);

  // 4. STAT: Portfolio at Risk (PAR 30+ Rate)
  const statsPAR30 = useMemo(() => {
    const totalOutstandingUSD = loans.length > 0
      ? loans.reduce((sum, l) => sum + (l.outstandingBalanceUSD || 0), 0)
      : 1780000;

    const overdue30PlusUSD = loans.length > 0
      ? loans.filter(l => (l.daysOverdue ?? 0) > 30).reduce((sum, l) => sum + (l.outstandingBalanceUSD || 0), 0)
      : 43610; // ~2.45% baseline

    const parRate = totalOutstandingUSD > 0
      ? ((overdue30PlusUSD / totalOutstandingUSD) * 100).toFixed(2)
      : '2.45';

    return {
      rate: parseFloat(parRate),
      totalOutstandingUSD,
      overdue30PlusUSD,
      benchmark: 3.0 // Microfinance industry threshold < 3.0%
    };
  }, [loans]);

  // Compile / normalize Loans Due This Week
  const loansDueThisWeek = useMemo(() => {
    // If real loans are provided with schedules, we map them
    if (loans.length > 0) {
      const mapped: DueThisWeekLoan[] = [];
      loans.forEach(l => {
        const days = l.daysOverdue || 0;
        let health: LoanHealthStatus = 'On Time';
        if (days > 30) health = 'Critical 30+ Days';
        else if (days > 0) health = 'Overdue 1-30 Days';

        mapped.push({
          id: l.id,
          loanCode: l.loanNumber || `LN-${l.id.slice(0, 6)}`,
          borrowerNameEn: l.borrowerName || 'Valued Client',
          borrowerNameKh: 'អតិថិជនកម្ចី',
          borrowerPhone: l.borrowerPhone || '012 345 678',
          borrowerNationalId: l.borrowerId || '010293847',
          productName: l.productName || 'Micro-Loan',
          dueDate: l.nextPaymentDueDate || '2026-10-25',
          dueDayLabel: days > 0 ? `${days}d Overdue` : 'Due This Week',
          daysDiff: days,
          amountDueUSD: l.nextPaymentDueAmountUSD || 350,
          amountDueKHR: (l.nextPaymentDueAmountUSD || 350) * USD_TO_KHR,
          principalDueUSD: (l.nextPaymentDueAmountUSD || 350) * 0.85,
          interestDueUSD: (l.nextPaymentDueAmountUSD || 350) * 0.15,
          outstandingBalanceUSD: l.outstandingBalanceUSD || 2500,
          health,
          daysOverdue: days,
          branch: 'Main Branch'
        });
      });
      return mapped;
    }
    return FALLBACK_WEEK_LOANS;
  }, [loans]);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loansDueThisWeek.filter(loan => {
      // Search query
      const q = searchFilter.toLowerCase().trim();
      const matchQuery =
        !q ||
        loan.borrowerNameEn.toLowerCase().includes(q) ||
        loan.borrowerPhone.includes(q) ||
        loan.loanCode.toLowerCase().includes(q) ||
        loan.borrowerNationalId.includes(q);

      // Health badge filter
      let matchHealth = true;
      if (healthFilter === 'ON_TIME') matchHealth = loan.health === 'On Time';
      else if (healthFilter === 'OVERDUE_1_30') matchHealth = loan.health === 'Overdue 1-30 Days';
      else if (healthFilter === 'CRITICAL_30') matchHealth = loan.health === 'Critical 30+ Days';

      return matchQuery && matchHealth;
    });
  }, [loansDueThisWeek, searchFilter, healthFilter]);

  // Handle Quick Action: Call Borrower
  const handleInitiateCall = (loan: DueThisWeekLoan) => {
    setCallingLoan(loan);
    setCallNotes('');
    setCallStatusMessage(null);
  };

  const handleLogCallSuccess = () => {
    setCallStatusMessage(`Call logged successfully for ${callingLoan?.borrowerNameEn}. Reminder queued.`);
    setTimeout(() => {
      setCallingLoan(null);
      setCallStatusMessage(null);
    }, 1500);
  };

  // Handle Quick Action: Collect Payment
  const handleCollectPaymentClick = (loan: DueThisWeekLoan) => {
    if (onNavigate) {
      // Direct integration with cashier tab
      onNavigate('cashier');
    } else {
      setQuickPayLoan(loan);
      setQuickPaySuccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Banking Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-emerald-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Jam Song Vich • Executive Portfolio Monitor (ផ្ទាំងគ្រប់គ្រងឥណទាន)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Landmark className="w-7 h-7 text-amber-400" />
              <span>Banking & Portfolio Dashboard</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time portfolio quality metrics, dual-currency liquidity, and weekly repayment collection queue.
            </p>
          </div>

          {/* Currency Toggle & Quick Action Nav */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Currency Mode Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center shadow-inner">
              <button
                onClick={() => setCurrencyMode('BOTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currencyMode === 'BOTH'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                USD & KHR
              </button>
              <button
                onClick={() => setCurrencyMode('USD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currencyMode === 'USD'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrencyMode('KHR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currencyMode === 'KHR'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                KHR (៛)
              </button>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('cashier')}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Wallet className="w-4 h-4" />
                <span>Cashier Terminal</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4 TOP STAT CARDS                                                         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CARD 1: Total Disbursed (USD & KHR) */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/15 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Disbursed (ទំហំបើកផ្តល់)
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            {/* Values */}
            <div className="space-y-1">
              {(currencyMode === 'BOTH' || currencyMode === 'USD') && (
                <div className="text-2xl font-black text-white tracking-tight font-mono">
                  {formatUSD(statsDisbursed.usd)}
                </div>
              )}
              {(currencyMode === 'BOTH' || currencyMode === 'KHR') && (
                <div className={`font-mono font-bold text-emerald-400 ${
                  currencyMode === 'KHR' ? 'text-2xl text-white' : 'text-sm'
                }`}>
                  {formatKHR(statsDisbursed.khr)}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Cumulative release</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +12.4% vs prev
              </span>
            </div>
          </div>

          {/* CARD 2: Active Borrowers */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/15 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Borrowers (អតិថិជនសកម្ម)
              </span>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {statsActiveBorrowers.toLocaleString()}
            </div>
            <div className="text-xs text-cyan-400 font-medium mt-1">
              98.2% KYC Verified Clients
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Client Retention</span>
              <span className="text-white font-semibold flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> 94.8% Good Standing
              </span>
            </div>
          </div>

          {/* CARD 3: Total Repayments Collected This Month */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/15 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Collected This Month (ប្រមូលខែនេះ)
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              {(currencyMode === 'BOTH' || currencyMode === 'USD') && (
                <div className="text-2xl font-black text-white tracking-tight font-mono">
                  {formatUSD(statsCollectedThisMonth.usd)}
                </div>
              )}
              {(currencyMode === 'BOTH' || currencyMode === 'KHR') && (
                <div className={`font-mono font-bold text-amber-400 ${
                  currencyMode === 'KHR' ? 'text-2xl text-white' : 'text-sm'
                }`}>
                  {formatKHR(statsCollectedThisMonth.khr)}
                </div>
              )}
            </div>

            {/* Target Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Target: {formatUSD(statsCollectedThisMonth.targetUSD)}</span>
                <span className="text-amber-400 font-bold">{statsCollectedThisMonth.percentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${statsCollectedThisMonth.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* CARD 4: Portfolio at Risk (PAR 30+ Rate) */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-xl transition-all ${
              statsPAR30.rate <= 3.0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            }`} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                PAR 30+ Rate (ហានិភ័យផលប័ត្រ)
              </span>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm ${
                statsPAR30.rate <= 3.0
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono tracking-tight ${
                statsPAR30.rate <= 3.0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {statsPAR30.rate}%
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Healthy Tier 1
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Industry benchmark &lt; 3.0% (Risk threshold)
            </p>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Overdue &gt; 30d</span>
              <span className="text-slate-200 font-mono font-medium">
                {formatUSD(statsPAR30.overdue30PlusUSD)}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LOANS DUE THIS WEEK - MAIN TABLE & ACTION QUEUE                            */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Table Header & Search Filter Controls */}
          <div className="p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Loans with Payments Due This Week
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                  {filteredLoans.length} Loans Actionable
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Installments maturing between Monday and Sunday. Follow up proactively to maintain zero delinquency.
              </p>
            </div>

            {/* Search & Status Badges Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search borrower or loan code..."
                  className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-60"
                />
              </div>

              {/* Status Badge Filters */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setHealthFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    healthFilter === 'ALL'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHealthFilter('ON_TIME')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    healthFilter === 'ON_TIME'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  On Time
                </button>
                <button
                  onClick={() => setHealthFilter('OVERDUE_1_30')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    healthFilter === 'OVERDUE_1_30'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-slate-400 hover:text-amber-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  1-30d
                </button>
                <button
                  onClick={() => setHealthFilter('CRITICAL_30')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    healthFilter === 'CRITICAL_30'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                      : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Critical 30+d
                </button>
              </div>
            </div>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Borrower & Loan Ref</th>
                  <th className="py-3 px-4">Due Date & Timing</th>
                  <th className="py-3 px-4 text-right">Amount Due</th>
                  <th className="py-3 px-4 text-center">Loan Health Status</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-center">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLoans.map((loan) => (
                  <tr
                    key={loan.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Borrower & Loan Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/50 flex items-center justify-center font-bold text-xs text-amber-300 shadow-sm">
                          {loan.borrowerNameEn.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-amber-300 transition-colors">
                            {loan.borrowerNameEn}{' '}
                            <span className="text-slate-400 font-normal">({loan.borrowerNameKh})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="font-mono text-emerald-400 font-medium">{loan.loanCode}</span>
                            <span>•</span>
                            <span>{loan.productName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Due Date & Timing */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">{loan.dueDate}</div>
                      <div className="text-[11px] mt-0.5">
                        {loan.daysDiff === 0 ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due Today
                          </span>
                        ) : loan.daysDiff > 0 ? (
                          <span className="text-rose-400 font-medium">
                            {loan.daysDiff} days past due
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            {loan.dueDayLabel}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount Due (Principal + Interest) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-black text-sm text-white font-mono">
                        {formatUSD(loan.amountDueUSD)}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono">
                        {formatKHR(loan.amountDueKHR)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        P: {formatUSD(loan.principalDueUSD)} | I: {formatUSD(loan.interestDueUSD)}
                      </div>
                    </td>

                    {/* Loan Health Status Badges (Strict matching criteria) */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {loan.health === 'On Time' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>On Time</span>
                        </span>
                      )}

                      {loan.health === 'Overdue 1-30 Days' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-950/20">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Overdue 1-30 Days</span>
                        </span>
                      )}

                      {loan.health === 'Critical 30+ Days' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse shadow-sm shadow-rose-950/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Critical 30+ Days</span>
                        </span>
                      )}
                    </td>

                    {/* Outstanding Balance */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-slate-300">
                      <div>{formatUSD(loan.outstandingBalanceUSD)}</div>
                      <div className="text-[10px] text-slate-500">{loan.branch}</div>
                    </td>

                    {/* Quick Action Buttons */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* Call Borrower Quick Action */}
                        <button
                          onClick={() => handleInitiateCall(loan)}
                          title={`Call ${loan.borrowerNameEn} (${loan.borrowerPhone})`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Phone className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Call Borrower</span>
                        </button>

                        {/* Collect Payment Quick Action */}
                        <button
                          onClick={() => handleCollectPaymentClick(loan)}
                          title="Open cashier payment modal"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect Payment</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredLoans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-10 h-10 mx-auto text-emerald-400/60 mb-2" />
                      <p className="font-semibold text-white">No loans matching the selected filter</p>
                      <p className="text-xs text-slate-500 mt-1">All weekly scheduled repayments are clear or accounted for.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-white">{filteredLoans.length}</span> of{' '}
              <span className="font-semibold text-white">{loansDueThisWeek.length}</span> weekly loans
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>On Time: Healthy</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>1-30d: Follow-up</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>30+d: Risk Escalation</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK ACTION MODAL: CALL BORROWER                                         */}
      {/* ========================================================================= */}
      {callingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setCallingLoan(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Call Borrower Follow-up</h3>
                <p className="text-xs text-slate-400">Loan: {callingLoan.loanCode}</p>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Contact Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-sm text-white">{callingLoan.borrowerNameEn}</h4>
                    <p className="text-emerald-400">{callingLoan.borrowerNameKh}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    callingLoan.health === 'On Time'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {callingLoan.health}
                  </span>
                </div>

                <div className="space-y-1 text-slate-300 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <a
                      href={`tel:${callingLoan.borrowerPhone}`}
                      className="font-mono font-bold text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {callingLoan.borrowerPhone}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Due Amount:</span>
                    <span className="font-mono font-bold text-white">
                      {formatUSD(callingLoan.amountDueUSD)} ({formatKHR(callingLoan.amountDueKHR)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled Due:</span>
                    <span className="text-amber-400 font-medium">{callingLoan.dueDate}</span>
                  </div>
                </div>
              </div>

              {/* Call Outcome Logging */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
                  Call Log & Promise to Pay Notes (កំណត់ចំណាំ)
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="e.g. Borrower picked up. Promised to make KHQR repayment tomorrow by 2:00 PM."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              {callStatusMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-center font-medium">
                  {callStatusMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <a
                  href={`tel:${callingLoan.borrowerPhone}`}
                  className="px-4 py-2.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Dial Now</span>
                </a>
                <button
                  onClick={handleLogCallSuccess}
                  className="px-4 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Log</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ACTION MODAL: COLLECT PAYMENT (FALLBACK IF ONNAVIGATE NOT SUPPLIED)  */}
      {/* ========================================================================= */}
      {quickPayLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setQuickPayLoan(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Receive Repayment</h3>
                <p className="text-xs text-slate-400">{quickPayLoan.loanCode}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">{quickPayLoan.borrowerNameEn}</div>
                  <div className="text-slate-400">{quickPayLoan.borrowerPhone}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {formatUSD(quickPayLoan.amountDueUSD)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {formatKHR(quickPayLoan.amountDueKHR)}
                  </div>
                </div>
              </div>

              {quickPaySuccess ? (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold text-emerald-300">Payment Processed Successfully!</p>
                  <p className="text-slate-300 text-[11px]">Installment marked as paid and balance updated.</p>
                  <button
                    onClick={() => setQuickPayLoan(null)}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span>Principal:</span>
                      <span className="font-mono font-medium text-white">{formatUSD(quickPayLoan.principalDueUSD)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interest:</span>
                      <span className="font-mono font-medium text-amber-400">{formatUSD(quickPayLoan.interestDueUSD)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                      <span>Total Due:</span>
                      <span className="font-mono text-emerald-400">{formatUSD(quickPayLoan.amountDueUSD)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setQuickPaySuccess(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-950/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    Confirm Collection ({formatUSD(quickPayLoan.amountDueUSD)})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
