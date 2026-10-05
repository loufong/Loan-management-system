import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Currency, UserDashboardSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Wallet,
  TrendingUp,
  AlertOctagon,
  Calendar,
  ArrowUpRight,
  Plus,
  UserPlus,
  CreditCard,
  CheckCircle2,
  Clock,
  ChevronDown,
  Building2,
  Landmark,
  PieChart as PieIcon,
  BarChart3,
  ShieldCheck,
  Check,
  RefreshCw,
  AlertCircle,
  Mail,
  Shield,
  Layers,
  Sparkles,
  User as UserIcon,
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
  Cell,
} from 'recharts';
import { cn } from '../../lib/utils';
import { ProjectDashboardView } from './ProjectDashboardView';


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
  const { user, isAuthenticated, updateSettings } = useAuth();

  const [summary, setSummary] = useState<UserDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedBranch, setSelectedBranch] = useState<string>('Phnom Penh Main Branch');
  const [timeframe, setTimeframe] = useState<'6M' | 'YTD' | '1Y'>('6M');
  const [activeCurrency, setActiveCurrency] = useState<Currency>(currency);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dashboardMode, setDashboardMode] = useState<'portfolio' | 'workspace'>('portfolio');

  // Currency multiplier (1 USD = 4,100 KHR)
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

  // Live ticking clock (1-second tick)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync currency from parent prop
  useEffect(() => {
    setActiveCurrency(currency);
  }, [currency]);

  // Fetch dynamic user dashboard data bound specifically to req.user.id
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (!isAuthenticated) return;

    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);

    try {
      const data = await api.getUserDashboardSummary();
      setSummary(data);
      if (data?.settings?.branch) {
        setSelectedBranch(data.settings.branch);
      }
      if (isManualRefresh) {
        showToast('Dashboard metrics refreshed from database.');
      }
    } catch (err: any) {
      console.error('Failed to load user dashboard summary:', err);
      setError(err?.message || 'Failed to load user dashboard data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle branch preference change and persist to DB
  const handleBranchChange = async (newBranch: string) => {
    setSelectedBranch(newBranch);
    try {
      await updateSettings({ branch: newBranch });
      showToast(`Default branch preference updated to ${newBranch}`);
    } catch {
      // Ignored
    }
  };

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
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

  // Custom Chart Tooltips
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const disb = data.disbursedUSD;
      const coll = data.collectedUSD;

      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 shadow-md text-xs space-y-2 select-none min-w-[200px]">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 font-sans flex items-center justify-between">
            <span>{data.fullMonth || data.month}</span>
            <span className="text-[10px] text-slate-400 font-mono">FINANCIAL AUDIT</span>
          </p>
          <div className="space-y-1.5 font-mono">
            {disb > 0 && (
              <div className="flex items-center justify-between text-blue-400">
                <span className="font-sans text-slate-300">Disbursed:</span>
                <span className="font-bold tabular-nums">{formatMoney(disb)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-emerald-400">
              <span className="font-sans text-slate-300">Repaid / Collected:</span>
              <span className="font-bold tabular-nums">{formatMoney(coll)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // =========================================================================
  // LOADING STATE: ANIMATED SKELETON LOADERS
  // =========================================================================
  if (isLoading) {
    return (
      <div className="space-y-6 select-none font-sans animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-200 rounded-md" />
            <div className="h-7 w-64 bg-slate-200 rounded-lg" />
            <div className="h-3 w-48 bg-slate-100 rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-slate-200 rounded-lg" />
            <div className="h-9 w-32 bg-slate-200 rounded-lg" />
          </div>
        </div>

        {/* 4 Stat Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-8 w-8 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-7 w-36 bg-slate-200 rounded-lg" />
              <div className="h-2 w-full bg-slate-100 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 h-80 flex flex-col justify-between">
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-48 w-full bg-slate-100 rounded-lg" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 h-80 flex flex-col justify-between">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-40 w-40 mx-auto bg-slate-100 rounded-full" />
            <div className="h-4 w-24 mx-auto bg-slate-100 rounded" />
          </div>
        </div>

        {/* Activity Feed Skeleton */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full bg-slate-50 border border-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ERROR STATE
  // =========================================================================
  if (error || !summary) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 shadow-xs text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 font-sans">
          Could not load user dashboard
        </h3>
        <p className="text-xs text-slate-500">
          {error || 'Unable to connect to the loan engine API server.'}
        </p>
        <button
          onClick={() => loadDashboardData(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const { user: userProfile, metrics, cashflowTrend, productDistribution, overdueWatchlist, recentActivities, isNewUser } = summary;

  // Chart data scaled with active currency
  const chartData = (cashflowTrend || []).map((d) => ({
    ...d,
    disbursed: activeCurrency === 'KHR' ? d.disbursedUSD * rate : d.disbursedUSD,
    collected: activeCurrency === 'KHR' ? d.collectedUSD * rate : d.collectedUSD,
  }));

  const hasChartData = chartData.some((d) => d.disbursed > 0 || d.collected > 0);
  const hasProducts = (productDistribution || []).length > 0;
  const hasOverdue = (overdueWatchlist || []).length > 0;
  const hasActivities = (recentActivities || []).length > 0;

  return (
    <div className="space-y-6 select-none font-sans relative">
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xs border border-slate-700 flex items-center gap-3 text-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div>
              <p className="font-semibold text-slate-100">Live Status</p>
              <p className="text-slate-400 text-[11px]">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 1. DYNAMIC USER PROFILE CARD & REAL-TIME CONTROLS                        */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
        
        {/* Left: User Identity, Avatar, Time & Greeting */}
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          {/* Avatar with fallback */}
          <div className="relative flex-shrink-0">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.fullName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {userProfile.fullName.charAt(0)}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" title="Active Session" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {getGreeting()}
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {userProfile.role.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ID: {userProfile.id.slice(0, 8)}...
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans truncate mt-1">
              {userProfile.fullName}
            </h1>

            {/* User Metadata: Email, Department, Member Since, Last Login */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-1.5">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{userProfile.email}</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-600 font-medium">
                {userProfile.department || 'Retail Banking'}
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-400">
                Member since {new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-500" />
                Active now
              </span>
            </div>
          </div>
        </div>

        {/* Right: Real-time Date, Branch Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end border-t xl:border-t-0 pt-4 xl:pt-0 border-slate-100">
          
          {/* Live Clock Pill */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{formatLiveTime(currentDate)}</span>
          </div>

          {/* Branch Selector Dropdown */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg pl-8 pr-8 py-2 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 transition cursor-pointer appearance-none"
            >
              <option>Phnom Penh Main Branch</option>
              <option>Siem Reap Regional Office</option>
              <option>Battambang Agriloan Center</option>
              <option>Sihanoukville Commercial Desk</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-xs disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-blue-600')} />
          </button>

          {/* Quick Action: New Application */}
          <button
            type="button"
            onClick={onOpenNewApplication}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition flex items-center gap-1.5 ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Apply / Create Loan</span>
          </button>
        </div>
      </div>

      {/* View Segment Switcher (Portfolio Intelligence vs Personal Workspace) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setDashboardMode('portfolio')}
            className={cn(
              'px-3.5 py-1.5 rounded-md font-medium transition-colors',
              dashboardMode === 'portfolio'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Portfolio Intelligence
          </button>
          <button
            type="button"
            onClick={() => setDashboardMode('workspace')}
            className={cn(
              'px-3.5 py-1.5 rounded-md font-medium transition-colors',
              dashboardMode === 'workspace'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Personal Workspace
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[11px] text-slate-400">Strict Row-Level Scoped (WHERE user_id = req.user.id)</span>
        </div>
      </div>

      {dashboardMode === 'workspace' ? (
        <ProjectDashboardView apiEndpoint="/api/dashboard" />
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 2. 4 DYNAMIC USER METRICS CARDS (BOUND TO AUTHENTICATED USER)            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI Card 1: Active Loan Accounts / Portfolio */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase font-sans">
                {userProfile.role === 'BORROWER' ? 'My Active Loans' : 'Managed Portfolio'}
              </span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl xl:text-3xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {formatMoney(metrics.totalOutstandingUSD || 0)}
            </div>

            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {activeCurrency === 'USD'
                  ? `៛ ${((metrics.totalOutstandingUSD || 0) * rate).toLocaleString()} KHR`
                  : `${formatMoney(metrics.totalOutstandingUSD || 0, 'USD')}`}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-slate-400" />
              {metrics.activeLoansCount} active {metrics.activeLoansCount === 1 ? 'facility' : 'facilities'}
            </span>
            {isNewUser ? (
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                Brand New
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified</span>
              </span>
            )}
          </div>
        </div>

        {/* KPI Card 2: Total Repayments / Collections */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase font-sans">
                {userProfile.role === 'BORROWER' ? 'Total Repaid' : 'Total Collections'}
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl xl:text-3xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {formatMoney(metrics.totalRepaidUSD ?? metrics.totalCollectedUSD ?? 0)}
            </div>

            {/* Progress bar */}
            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="font-bold text-emerald-700">
                  {metrics.totalBorrowedUSD && metrics.totalBorrowedUSD > 0
                    ? `${Math.round(((metrics.totalRepaidUSD || 0) / metrics.totalBorrowedUSD) * 100)}% Repaid`
                    : '100% on pace'}
                </span>
                <span className="text-slate-400">
                  {metrics.totalBorrowedUSD ? `of ${formatMoney(metrics.totalBorrowedUSD)}` : 'Recorded Ledger'}
                </span>
              </div>
              <div className="h-1.5 w-full rounded bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded transition-all duration-500"
                  style={{
                    width: `${
                      metrics.totalBorrowedUSD && metrics.totalBorrowedUSD > 0
                        ? Math.min(100, Math.round(((metrics.totalRepaidUSD || 0) / metrics.totalBorrowedUSD) * 100))
                        : metrics.totalCollectedUSD ? 85 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <span className="text-slate-600 font-medium">Reconciled Ledger</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Good Pace</span>
            </span>
          </div>
        </div>

        {/* KPI Card 3: Account Standing / Approval Metrics */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase font-sans">
                {userProfile.role === 'BORROWER' ? 'Account Standing' : 'Underwriting Rate'}
              </span>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl xl:text-3xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {userProfile.role === 'BORROWER'
                ? metrics.overdueCount && metrics.overdueCount > 0
                  ? `${metrics.overdueCount} Overdue`
                  : 'Good Standing'
                : `${metrics.approvalRate || 92.5}%`}
            </div>

            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn(
                  'text-[11px] font-mono font-bold px-2 py-0.5 rounded border',
                  metrics.overdueCount && metrics.overdueCount > 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                )}
              >
                {metrics.overdueCount && metrics.overdueCount > 0
                  ? 'Payment Attention Needed'
                  : 'Zero Delinquency'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <span className="text-slate-600 font-medium">
              {metrics.totalApplications !== undefined
                ? `${metrics.totalApplications} total applications`
                : 'Credit Committee Score'}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              Tier 1
            </span>
          </div>
        </div>

        {/* KPI Card 4: Next Payment Due or Overdue Amount */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase font-sans">
                {userProfile.role === 'BORROWER' ? 'Next Payment Due' : 'Overdue Portfolio'}
              </span>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl xl:text-3xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {metrics.nextPaymentDue
                ? formatMoney(metrics.nextPaymentDue.amountUSD)
                : formatMoney(metrics.totalOverdueUSD || 0)}
            </div>

            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-500">
                {metrics.nextPaymentDue
                  ? `Due: ${new Date(metrics.nextPaymentDue.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : metrics.totalOverdueUSD > 0
                  ? 'Accruing 0.1%/day penalty'
                  : 'No overdue balance'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            {metrics.nextPaymentDue ? (
              <button
                onClick={() => onOpenQuickPayment?.(metrics.nextPaymentDue?.loanNumber)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Installment #{metrics.nextPaymentDue.installmentNo}</span>
              </button>
            ) : (
              <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Up to date
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. CHARTS GRID (DISBURSEMENT VS COLLECTION & PORTFOLIO BREAKDOWN)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Cashflow Velocity (6-Month Trend) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                {userProfile.role === 'BORROWER' ? 'Repayment History' : 'Disbursements vs Collections Trend'}
              </h3>
              <p className="text-xs text-slate-500">
                {userProfile.role === 'BORROWER'
                  ? 'Real-time payment history bound to your loans'
                  : 'Institutional 6-month loan capital flow comparison'}
              </p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              {(['6M', 'YTD', '1Y'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] transition',
                    timeframe === t
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Chart or Clean Empty State */}
          {!hasChartData ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Financial History Yet</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                Your monthly repayment velocity and transaction logs will be visualized here as loans are originated.
              </p>
              <button
                onClick={onOpenNewApplication}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
              >
                + Apply for a facility
              </button>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(0)}k`
                        : val
                    }
                  />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="disbursed" fill="#2563EB" radius={[4, 4, 0, 0]} name="Disbursed" />
                  <Bar dataKey="collected" fill="#059669" radius={[4, 4, 0, 0]} name="Collected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart Legend */}
          <div className="flex items-center justify-between text-xs pt-4 border-t border-slate-100 mt-2">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-600" />
                Disbursed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600" />
                Collected / Repaid
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Live Currency: {activeCurrency}
            </span>
          </div>
        </div>

        {/* Chart 2: Product Breakdown / Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans">
              Portfolio by Loan Product
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Distribution of active facility commitments
            </p>
          </div>

          {!hasProducts ? (
            <div className="h-48 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-6 text-center my-auto">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-2">
                <PieIcon className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Active Products</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                Loan product categories will appear once your application is approved.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productDistribution}
                      dataKey="valUSD"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {productDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Product breakdown list */}
              <div className="space-y-2">
                {productDistribution.slice(0, 4).map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 truncate text-slate-700 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {p.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center font-mono">
            {metrics.activeLoansCount} Total Active Accounts
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. ACTIVITY FEED & OVERDUE WATCHLIST (BOUND TO AUTHENTICATED USER)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Real-time Activity Feed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                Activity Feed & Audit Log
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {recentActivities.length} events
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              WHERE user_id = {userProfile.id.slice(0, 6)}...
            </span>
          </div>

          {!hasActivities ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No activity yet</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Actions, repayments, and approvals bound to your profile will be recorded here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition text-xs flex items-start gap-3 bg-white"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 truncate">
                        {act.actor}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed truncate">
                      {act.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Overdue Delinquency Watchlist / Good Standing Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                {userProfile.role === 'BORROWER' ? 'Payment Schedule Alerts' : 'Delinquency Watchlist'}
              </h3>
              {hasOverdue && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {overdueWatchlist.length} flagged
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Risk Management
            </span>
          </div>

          {!hasOverdue ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">All Accounts In Good Standing</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                No overdue installments or delinquent balances associated with your account identity.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>Zero Late Fees Accrued</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {overdueWatchlist.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 text-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {item.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {item.borrowerName} • {item.loanNumber}
                      </p>
                      <p className="text-[11px] text-rose-600 font-mono">
                        {item.daysOverdue} days late (Installment #{item.installmentNo})
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-mono font-bold text-rose-700 text-xs block">
                      {formatMoney(item.overdueAmountUSD)}
                    </span>
                    <button
                      onClick={() => onOpenQuickPayment?.(item.loanId)}
                      className="text-[10px] font-semibold text-blue-600 hover:underline"
                    >
                      Settle now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
