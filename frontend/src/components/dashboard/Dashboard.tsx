import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Currency } from '../../types';
import {
  Wallet,
  TrendingUp,
  AlertOctagon,
  FileCheck2,
  Calendar,
  ArrowUpRight,
  Plus,
  UserPlus,
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  BellRing,
  ExternalLink,
  ShieldAlert,
  PieChart as PieIcon,
  BarChart3,
  Zap,
  ShieldCheck,
  Check,
  Building2,
  Landmark
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '../../lib/utils';

export interface DashboardProps {
  currency: Currency;
  onNavigate: (tabId: string) => void;
  onOpenNewBorrower?: () => void;
  onOpenNewApplication?: () => void;
  onOpenQuickPayment?: (loanId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currency,
  onNavigate,
  onOpenNewBorrower,
  onOpenNewApplication,
  onOpenQuickPayment,
}) => {
  const [selectedBranch, setSelectedBranch] = useState('Phnom Penh Main Branch');
  const [timeframe, setTimeframe] = useState<'6M' | 'YTD' | '1Y'>('6M');
  const [activeCurrency, setActiveCurrency] = useState<Currency>(currency);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // REAL-TIME STATE & METRICS
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [heartbeatSec, setHeartbeatSec] = useState<number>(0);
  const [liveCollectedUSD, setLiveCollectedUSD] = useState<number>(184500.0);
  const [livePortfolioUSD, setLivePortfolioUSD] = useState<number>(2480500.0);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);

  // Formatters for live dynamic time, date, and Khmer calendar
  const formatLiveTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatLiveDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatKhmerDate = (date: Date) => {
    const KHMER_DAYS = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
    const KHMER_MONTHS = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    const toKhmerDigits = (num: number) => {
      const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
      return num
        .toString()
        .split('')
        .map((d) => khmerDigits[parseInt(d, 10)] || d)
        .join('');
    };

    const dayName = KHMER_DAYS[date.getDay()];
    const day = toKhmerDigits(date.getDate());
    const month = KHMER_MONTHS[date.getMonth()];
    const year = toKhmerDigits(date.getFullYear());
    return `ថ្ងៃ${dayName} ${day} ${month} ${year}`;
  };

  // Sync if parent updates currency
  React.useEffect(() => {
    setActiveCurrency(currency);
  }, [currency]);

  // Real-time ticking clock & heartbeat (1-second tick)
  React.useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentDate(new Date());
      setHeartbeatSec((prev) => (prev >= 60 ? 1 : prev + 1));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Currency multiplier helper (1 USD = 4,100 KHR)
  const rate = 4100;
  const formatMoney = (usdVal: number, curr = activeCurrency) => {
    if (curr === 'KHR') {
      const khr = usdVal * rate;
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0,
      }).format(khr);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(usdVal);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 6-Month Historical Data for Disbursement vs Collection
  const historicalCashflow6M = [
    { month: 'May', fullMonth: 'May 2026', disbursedUSD: 142000, collectedUSD: 128000 },
    { month: 'Jun', fullMonth: 'Jun 2026', disbursedUSD: 168000, collectedUSD: 139000 },
    { month: 'Jul', fullMonth: 'Jul 2026', disbursedUSD: 195000, collectedUSD: 164000 },
    { month: 'Aug', fullMonth: 'Aug 2026', disbursedUSD: 210000, collectedUSD: 175000 },
    { month: 'Sep', fullMonth: 'Sep 2026', disbursedUSD: 225000, collectedUSD: 184500 },
    { month: 'Oct', fullMonth: 'Oct 2026 (Est)', disbursedUSD: 240000, collectedUSD: 195000 },
  ];

  const historicalCashflowYTD = [
    { month: 'Jan', fullMonth: 'Jan 2026', disbursedUSD: 110000, collectedUSD: 98000 },
    { month: 'Feb', fullMonth: 'Feb 2026', disbursedUSD: 125000, collectedUSD: 104000 },
    { month: 'Mar', fullMonth: 'Mar 2026', disbursedUSD: 132000, collectedUSD: 115000 },
    { month: 'Apr', fullMonth: 'Apr 2026', disbursedUSD: 140000, collectedUSD: 122000 },
    ...historicalCashflow6M,
  ];

  const historicalCashflow1Y = [
    { month: 'Nov', fullMonth: 'Nov 2025', disbursedUSD: 95000, collectedUSD: 88000 },
    { month: 'Dec', fullMonth: 'Dec 2025', disbursedUSD: 105000, collectedUSD: 92000 },
    ...historicalCashflowYTD,
  ];

  const currentChartData =
    timeframe === '6M'
      ? historicalCashflow6M
      : timeframe === 'YTD'
      ? historicalCashflowYTD
      : historicalCashflow1Y;

  // Chart data scaled with active currency
  const chartData = currentChartData.map((d) => ({
    ...d,
    disbursed: activeCurrency === 'KHR' ? d.disbursedUSD * rate : d.disbursedUSD,
    collected: activeCurrency === 'KHR' ? d.collectedUSD * rate : d.collectedUSD,
  }));

  // Portfolio Breakdown by Product with vibrant, distinct modern fintech colors
  const productDistribution = [
    { name: 'Business Loan', percentage: 42, color: '#3B82F6', gradient: 'from-blue-500 to-indigo-600', valUSD: 1041810 },
    { name: 'Personal Loan', percentage: 28, color: '#8B5CF6', gradient: 'from-violet-500 to-purple-600', valUSD: 694540 },
    { name: 'Agriculture Loan', percentage: 18, color: '#10B981', gradient: 'from-emerald-500 to-teal-600', valUSD: 446490 },
    { name: 'Emergency Loan', percentage: 12, color: '#F59E0B', gradient: 'from-amber-500 to-orange-500', valUSD: 297660 },
  ];

  // Urgent Overdue Accounts
  const overdueWatchlist = [
    {
      id: 'od-1',
      loanId: 'LN-2026-0042',
      loanNumber: 'LN-2026-0042',
      borrowerName: 'Sokha Chea',
      initials: 'SC',
      avatarColor: 'bg-rose-500 text-white',
      borrowerPhone: '+855-12-889-102',
      installmentNo: 3,
      daysOverdue: 38,
      urgency: '30+d Critical',
      urgencyVariant: 'rose',
      overdueAmountUSD: 1240.0,
    },
    {
      id: 'od-2',
      loanId: 'LN-2026-0089',
      loanNumber: 'LN-2026-0089',
      borrowerName: 'Vanna Rath',
      initials: 'VR',
      avatarColor: 'bg-amber-500 text-white',
      borrowerPhone: '+855-98-332-901',
      installmentNo: 2,
      daysOverdue: 24,
      urgency: '16-30d Moderate',
      urgencyVariant: 'orange',
      overdueAmountUSD: 850.0,
    },
    {
      id: 'od-3',
      loanId: 'LN-2026-0112',
      loanNumber: 'LN-2026-0112',
      borrowerName: 'Dara Chan',
      initials: 'DC',
      avatarColor: 'bg-blue-500 text-white',
      borrowerPhone: '+855-77-665-219',
      installmentNo: 1,
      daysOverdue: 19,
      urgency: '16-30d Moderate',
      urgencyVariant: 'orange',
      overdueAmountUSD: 420.0,
    },
    {
      id: 'od-4',
      loanId: 'LN-2026-0145',
      loanNumber: 'LN-2026-0145',
      borrowerName: 'Kalyan Meas',
      initials: 'KM',
      avatarColor: 'bg-emerald-500 text-white',
      borrowerPhone: '+855-15-778-992',
      installmentNo: 4,
      daysOverdue: 11,
      urgency: '1-15d Grace',
      urgencyVariant: 'amber',
      overdueAmountUSD: 310.0,
    },
    {
      id: 'od-5',
      loanId: 'LN-2026-0178',
      loanNumber: 'LN-2026-0178',
      borrowerName: 'Bopha Pich',
      initials: 'BP',
      avatarColor: 'bg-violet-500 text-white',
      borrowerPhone: '+855-88-112-445',
      installmentNo: 2,
      daysOverdue: 6,
      urgency: '1-15d Grace',
      urgencyVariant: 'amber',
      overdueAmountUSD: 290.0,
    },
  ];

  // Initial Live Core Banking Ledger Activity Feed
  const [activities, setActivities] = useState([
    {
      id: 'act-1',
      time: 'Just now',
      actor: 'Cashier Emily Ross',
      text: 'recorded $511.25 payment on LN-2026-0001 (Johnathan Doe)',
      type: 'PAYMENT',
      badge: 'POS Terminal',
      badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconStyle: 'bg-emerald-500 text-white ring-4 ring-emerald-100',
    },
    {
      id: 'act-2',
      time: '18 mins ago',
      actor: 'Manager Marcus Vance',
      text: 'approved $15,000.00 Personal Loan facility for Dr. Robert Taylor',
      type: 'APPROVAL',
      badge: 'Credit Committee',
      badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
      iconStyle: 'bg-blue-600 text-white ring-4 ring-blue-100',
    },
    {
      id: 'act-3',
      time: '42 mins ago',
      actor: 'Credit Officer Dr. Chen',
      text: 'submitted Low-Risk underwriting appraisal for APP-2026-0002',
      type: 'REVIEW',
      badge: 'DTI Risk',
      badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
      iconStyle: 'bg-purple-600 text-white ring-4 ring-purple-100',
    },
    {
      id: 'act-4',
      time: '1 hr ago',
      actor: 'Automated Overdue Engine',
      text: 'executed daily cron scan (1 facility transitioned to OVERDUE status)',
      type: 'OVERDUE',
      badge: 'Cron Watchdog',
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200',
      iconStyle: 'bg-rose-500 text-white ring-4 ring-rose-100',
    },
    {
      id: 'act-5',
      time: '2 hrs ago',
      actor: 'Cashier Emily Ross',
      text: 'disbursed $3,000.00 via Bakong Instant Transfer to Student Account *4892',
      type: 'DISBURSEMENT',
      badge: 'Core Ledger',
      badgeStyle: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      iconStyle: 'bg-cyan-500 text-white ring-4 ring-cyan-100',
    },
  ]);

  // Real-time Event Trigger (Simulates live websocket events from Core Banking engine)
  const triggerRealtimeEvent = React.useCallback(() => {
    const liveEvents = [
      {
        actor: 'Bakong Instant Switch',
        text: 'settled $280.00 QR repayment on LN-2026-0042 (Sokha Chea)',
        type: 'PAYMENT',
        badge: 'Bakong Live',
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconStyle: 'bg-emerald-500 text-white ring-4 ring-emerald-100',
        amountUSD: 280,
      },
      {
        actor: 'Cashier Emily Ross',
        text: 'processed $450.00 cash installment on LN-2026-0089 (Vanna Rath)',
        type: 'PAYMENT',
        badge: 'POS Terminal',
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconStyle: 'bg-emerald-500 text-white ring-4 ring-emerald-100',
        amountUSD: 450,
      },
      {
        actor: 'Manager Marcus Vance',
        text: 'approved $12,500.00 Agriloan facility for Kampot Cooperative',
        type: 'APPROVAL',
        badge: 'Credit Committee',
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
        iconStyle: 'bg-blue-600 text-white ring-4 ring-blue-100',
        amountUSD: 12500,
        isPortfolio: true,
      },
      {
        actor: 'Credit Officer Dr. Chen',
        text: 'verified e-KYC risk assessment (DTI 34.2%) for APP-2026-0099',
        type: 'REVIEW',
        badge: 'DTI Risk',
        badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
        iconStyle: 'bg-purple-600 text-white ring-4 ring-purple-100',
      },
      {
        actor: 'Automated Overdue Engine',
        text: 'dispatched automated SMS payment reminder to 3 borrowers',
        type: 'OVERDUE',
        badge: 'Cron Watchdog',
        badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200',
        iconStyle: 'bg-rose-500 text-white ring-4 ring-rose-100',
      },
    ];

    const randomEvt = liveEvents[Math.floor(Math.random() * liveEvents.length)];
    const newEntry = {
      id: `act-${Date.now()}`,
      time: 'Just now',
      actor: randomEvt.actor,
      text: randomEvt.text,
      type: randomEvt.type,
      badge: randomEvt.badge,
      badgeStyle: randomEvt.badgeStyle,
      iconStyle: randomEvt.iconStyle,
    };

    setActivities((prev) => [newEntry, ...prev.slice(0, 7)]);
    setHeartbeatSec(0);

    if (randomEvt.amountUSD) {
      if (randomEvt.isPortfolio) {
        setLivePortfolioUSD((p) => p + randomEvt.amountUSD);
      } else {
        setLiveCollectedUSD((c) => c + randomEvt.amountUSD);
      }
    }
  }, []);

  // Periodic automatic real-time event simulation (every 12s when streaming)
  React.useEffect(() => {
    if (!isLiveStreaming) return;
    const streamInterval = setInterval(() => {
      triggerRealtimeEvent();
    }, 12000);
    return () => clearInterval(streamInterval);
  }, [isLiveStreaming, triggerRealtimeEvent]);

  // Custom Recharts Grouped Bar Tooltip
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const disb = data.disbursedUSD;
      const coll = data.collectedUSD;
      const ratio = ((coll / disb) * 100).toFixed(1);

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-2 select-none min-w-[210px]">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 font-sans flex items-center justify-between">
            <span>{data.fullMonth}</span>
            <span className="text-[10px] text-slate-400 font-mono">FINANCIAL AUDIT</span>
          </p>
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-blue-400">
              <span className="flex items-center gap-1.5 font-sans text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                Disbursed:
              </span>
              <span className="font-bold tabular-nums">{formatMoney(disb)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5 font-sans text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                Collected:
              </span>
              <span className="font-bold tabular-nums">{formatMoney(coll)}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-sans">Collection Velocity:</span>
            <span className="font-bold font-mono text-amber-400 tabular-nums px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              {ratio}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Donut Tooltip
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl border border-slate-700/80 shadow-xl text-xs select-none">
          <p className="font-bold text-slate-200 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </p>
          <p className="font-mono text-cyan-400 mt-1 tabular-nums font-bold">
            {formatMoney(data.valUSD)}
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            {data.percentage}% of aggregate portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 select-none font-sans relative">
      
      {/* Toast Notification Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-6 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-3 text-xs"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <p className="font-bold text-slate-100">Dispatched Successfully</p>
              <p className="text-slate-400 text-[11px]">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 1. HERO HEADER & REAL-TIME CONTROLS                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            Executive Banking Dashboard
          </h1>
          
          {/* Dynamic Real-time Date, Khmer Calendar & Live Ticking Clock */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-2">
            {/* Live Ticking Time */}
            <div className="flex items-center gap-1.5 font-mono font-bold text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
              <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
              <span>{formatLiveTime(currentDate)}</span>
            </div>

            {/* Live English Date */}
            <div className="flex items-center gap-1.5 font-medium text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatLiveDate(currentDate)}</span>
            </div>

            <span className="text-slate-300">•</span>

            {/* Dynamic Khmer Calendar Date */}
            <span className="font-khmer text-slate-700 font-semibold bg-amber-50/80 px-2.5 py-1 rounded-lg text-amber-950 border border-amber-200/60 shadow-2xs">
              {formatKhmerDate(currentDate)}
            </span>
          </div>
        </div>

        {/* Action Group: Branch Selector + Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">

          {/* Branch Selector Dropdown */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl pl-8 pr-8 py-2 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer appearance-none"
            >
              <option>Phnom Penh Main Branch</option>
              <option>Siem Reap Regional Office</option>
              <option>Battambang Agriloan Center</option>
              <option>Sihanoukville Commercial Desk</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick Action 1: + New Borrower */}
          <button
            type="button"
            onClick={onOpenNewBorrower}
            className="bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 active:scale-[0.98]"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ New Borrower</span>
          </button>

          {/* Quick Action 2: Record Payment */}
          <button
            type="button"
            onClick={() => onOpenQuickPayment?.()}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 active:scale-[0.98]"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Record Payment</span>
          </button>

          {/* Quick Action 3: + Create Application (Clean single +) */}
          <button
            type="button"
            onClick={onOpenNewApplication}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-1.5 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Application</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 4 COLORFUL VIBRANT 3D KPI CARDS                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI Card 1: Total Active Portfolio (VIBRANT ROYAL BLUE & CYAN) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-50/90 via-white to-sky-50/50 border border-blue-200/80 rounded-2xl p-5 shadow-[0_10px_30px_-5px_rgba(59,130,246,0.12)] hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(59,130,246,0.22)] transition-all group"
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
          
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[11px] font-black tracking-wider text-blue-900 uppercase">
              Total Active Portfolio
            </span>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-blue-500/30">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl xl:text-3xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
            {formatMoney(livePortfolioUSD)}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
              {activeCurrency === 'USD' ? '៛ 10.170 Billion KHR' : `${formatMoney(livePortfolioUSD, 'USD')}`}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-blue-100/80">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-blue-600" />
              428 accounts
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shadow-2xs">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span>+12.4% MoM</span>
            </span>
          </div>
        </motion.div>

        {/* KPI Card 2: Collected This Month (VIBRANT EMERALD & MINT) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 border border-emerald-200/80 rounded-2xl p-5 shadow-[0_10px_30px_-5px_rgba(16,185,129,0.12)] hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(16,185,129,0.22)] transition-all group"
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />

          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[11px] font-black tracking-wider text-emerald-900 uppercase">
              Collected This Month
            </span>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-emerald-500/30">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl xl:text-3xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
            {formatMoney(liveCollectedUSD)}
          </div>
          
          {/* Progress Bar with colorful gradient: Real-time dynamic calculation */}
          <div className="mt-2.5 space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="font-bold text-emerald-800">
                {((liveCollectedUSD / 220000.0) * 100).toFixed(1)}% of Target
              </span>
              <span className="text-slate-500">{formatMoney(220000.0)} goal</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-emerald-100/70 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${Math.min(100, Math.round((liveCollectedUSD / 220000.0) * 100))}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs pt-3 border-t border-emerald-100/80">
            <span className="text-slate-600 font-medium">96.2% on-time pace</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono shadow-sm shadow-emerald-500/30 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>On Track</span>
            </span>
          </div>
        </motion.div>

        {/* KPI Card 3: Portfolio at Risk (VIBRANT ROSE & AMBER ALERT) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="relative overflow-hidden bg-gradient-to-br from-rose-50/90 via-white to-amber-50/50 border border-rose-200/80 rounded-2xl p-5 shadow-[0_10px_30px_-5px_rgba(244,63,94,0.12)] hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(244,63,94,0.22)] transition-all group"
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500" />

          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[11px] font-black tracking-wider text-rose-900 uppercase">
              Portfolio at Risk (PAR 30+)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-rose-500/30">
              <AlertOctagon className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl xl:text-3xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
            {formatMoney(36800.0)}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
              Cap limit &lt; 3.0% (NBC Mandate)
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-rose-100/80">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              5 overdue facilities
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>1.48% (Safe)</span>
            </span>
          </div>
        </motion.div>

        {/* KPI Card 4: Application Pipeline (VIBRANT ELECTRIC PURPLE & FUCHSIA) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-50/90 via-white to-fuchsia-50/50 border border-purple-200/80 rounded-2xl p-5 shadow-[0_10px_30px_-5px_rgba(168,85,247,0.12)] hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(168,85,247,0.22)] transition-all group"
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-400" />

          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[11px] font-black tracking-wider text-purple-900 uppercase">
              Application Pipeline
            </span>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-purple-500/30">
              <FileCheck2 className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl xl:text-3xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
            14 Pending
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
              $245,000 Requested Total
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-purple-100/80">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              7 ready for committee
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-mono shadow-sm">
              <span>82.5% Approved</span>
            </span>
          </div>
        </motion.div>

      </div>

      {/* ========================================================================= */}
      {/* 2B. COLORFUL OPERATIONAL HIGHLIGHTS RIBBON                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/70 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-blue-700">Disbursement Velocity</p>
              <p className="text-xs font-bold text-slate-800">$240,000 this month (+18%)</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-200/60 text-blue-800 rounded-md font-mono">Top Tier</span>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-amber-800">Underwriting Turnaround</p>
              <p className="text-xs font-bold text-slate-800">4.2 Hours Avg. SLA</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-md font-mono">Fast-Track</span>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200/70 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-emerald-800">Collateral Coverage</p>
              <p className="text-xs font-bold text-slate-800">142% Overcollateralized</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200/60 text-emerald-900 rounded-md font-mono">Secure</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CHARTS & ANALYTICS GRID (2 COLUMNS: 60% / 40%)                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card (60%): Monthly Capital Cashflow Grouped Bar Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  Monthly Capital Cashflow
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Disbursed capital vs. Repayments collected
              </p>
            </div>

            {/* Timeframe Selector & Currency Toggle */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Currency Selector Pill */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveCurrency('USD')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition',
                    activeCurrency === 'USD'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCurrency('KHR')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition font-khmer',
                    activeCurrency === 'KHR'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  KHR
                </button>
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                {(['6M', 'YTD', '1Y'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-[11px] transition font-mono',
                      timeframe === t
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend Chips with Colorful Badges */}
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <span className="w-3.5 h-3.5 rounded-md bg-blue-500 shadow-xs" />
                <span>Disbursed Capital</span>
              </span>
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs" />
                <span>Collected Capital</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                Net Inflow: <strong className="text-emerald-600 font-bold">+$45.0k</strong>
              </span>
            </div>
          </div>

          {/* Recharts Grouped Bar Chart */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) =>
                    activeCurrency === 'KHR'
                      ? `${(val / 1_000_000).toFixed(0)}M`
                      : `$${Math.round(val / 1000)}k`
                  }
                />
                <RechartsTooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="disbursed"
                  name="Disbursed"
                  fill="#3B82F6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={30}
                />
                <Bar
                  dataKey="collected"
                  name="Collected"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card (40%): Portfolio Distribution by Product */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  Portfolio by Product
                </h2>
              </div>
              <span className="text-[11px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                100% Allocation
              </span>
            </div>

            {/* Donut Chart + Central Total Badge */}
            <div className="h-44 w-full relative my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip content={<CustomDonutTooltip />} />
                  <Pie
                    data={productDistribution}
                    dataKey="percentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {productDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center Floating Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Portfolio
                </span>
                <span className="text-base font-black font-mono text-slate-900 tabular-nums">
                  $2.48M
                </span>
              </div>
            </div>

            {/* Colorful Product Legend with Progress Bars & Amounts */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {productDistribution.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-md flex-shrink-0 shadow-xs"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-bold text-slate-800 truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatMoney(p.valUSD)}
                      </span>
                      <span
                        className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-md"
                        style={{ backgroundColor: `${p.color}20`, color: p.color }}
                      >
                        {p.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Miniature allocation track */}
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Microfinance Regulatory Rule Note with Vibrant Accent */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/90 rounded-2xl text-[11px] text-blue-950 leading-relaxed font-sans shadow-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-blue-900">NBC Prudential Compliance:</strong> Productive lending (Business &amp; Agriculture: <strong>60%</strong>) fulfills statutory concentration guidelines (&ge; 50%).
            </p>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. OVERDUE WATCHLIST & LIVE CORE BANKING ACTIVITY STREAM                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Overdue Watchlist (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <AlertOctagon className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Urgent Delinquency &amp; Overdue Watchlist
                </h3>
                <p className="text-[11px] text-slate-400">Immediate recovery triggers and collections</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                5 Critical
              </span>
            </div>
            <button
              onClick={() => onNavigate('overdue')}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline flex items-center gap-1"
            >
              <span>View Watchlist</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Borrower</th>
                  <th className="py-2.5 px-3">Facility</th>
                  <th className="py-2.5 px-3">Delinquency</th>
                  <th className="py-2.5 px-3">Overdue Amt</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueWatchlist.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shadow-2xs', acc.avatarColor)}>
                          {acc.initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {acc.borrowerName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{acc.borrowerPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold text-slate-800">
                        {acc.loanNumber}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                        Installment #{acc.installmentNo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border inline-flex items-center gap-1.5 shadow-2xs',
                          acc.urgencyVariant === 'rose'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : acc.urgencyVariant === 'orange'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            acc.urgencyVariant === 'rose'
                              ? 'bg-rose-500 animate-pulse'
                              : acc.urgencyVariant === 'orange'
                              ? 'bg-orange-500'
                              : 'bg-amber-500'
                          )}
                        />
                        {acc.daysOverdue}d ({acc.urgency})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-rose-600 tabular-nums">
                      {formatMoney(acc.overdueAmountUSD)}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => showToast(`Payment reminder SMS & phone dispatch queued for ${acc.borrowerName}`)}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 transition shadow-2xs inline-flex items-center gap-1"
                      >
                        <BellRing className="w-3 h-3 text-amber-500" />
                        <span>Notify</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenQuickPayment?.(acc.loanId)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[11px] font-bold transition shadow-sm shadow-emerald-500/25 active:scale-95 inline-flex items-center gap-1"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Collect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Core Banking Activity Feed (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Live Core Banking Ledger Feed
                  </h3>
                  <p className="text-[11px] text-slate-400">WebSocket realtime event stream</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerRealtimeEvent}
                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-mono font-bold border border-blue-200 transition shadow-2xs flex items-center gap-1 active:scale-95"
                  title="Simulate incoming real-time core banking transaction"
                >
                  <Zap className="w-3 h-3 text-blue-600 fill-blue-600" />
                  <span>+ Emit Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                  className={cn(
                    'flex items-center gap-1.5 font-bold text-[11px] font-mono px-2.5 py-1 rounded-full border shadow-2xs transition',
                    isLiveStreaming
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isLiveStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    )}
                  />
                  <span>{isLiveStreaming ? 'REALTIME ON' : 'PAUSED'}</span>
                </button>
              </div>
            </div>

            {/* Animated Ledger Activity Feed */}
            <div className="mt-3.5 space-y-2.5">
              {activities.map((act, index) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex items-start gap-3 text-xs group"
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs',
                      act.iconStyle
                    )}
                  >
                    {act.type === 'PAYMENT' && <CheckCircle2 className="w-4 h-4" />}
                    {act.type === 'APPROVAL' && <FileCheck2 className="w-4 h-4" />}
                    {act.type === 'REVIEW' && <Sparkles className="w-4 h-4" />}
                    {act.type === 'OVERDUE' && <AlertOctagon className="w-4 h-4" />}
                    {act.type === 'DISBURSEMENT' && <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                          act.badgeStyle
                        )}
                      >
                        {act.badge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-snug font-sans">
                      <span className="font-bold text-slate-900">{act.actor}</span> {act.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Immutable Ledger Block: #APX-9042</span>
            </span>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Synced NBC Relay
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
