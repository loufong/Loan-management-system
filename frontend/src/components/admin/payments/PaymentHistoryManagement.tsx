import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  Calendar,
  CreditCard,
  Building2,
  DollarSign,
  User,
  FileText,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  Check,
  X,
  AlertTriangle,
  Receipt as ReceiptIcon
} from 'lucide-react';
import { api } from '../../../services/api';
import { Currency, PaymentReceipt } from '../../../types';
import { PaymentReceiptModal } from '../../cashier/PaymentReceiptModal';

interface PaymentHistoryManagementProps {
  currency?: Currency;
  onNavigate?: (tab: string) => void;
}

export interface PaymentRecordRow {
  paymentId: string;
  id: string;
  receiptNo: string;
  userId: string;
  userInternalId?: string;
  userFullName: string;
  userEmail: string;
  userPhone?: string;
  loanId: string;
  loanInternalId?: string;
  productName?: string;
  loanAmount: number;
  interestAmount?: number;
  totalRepaymentAmount?: number;
  paymentAmount: number;
  currency: string;
  paymentMethod: string;
  transactionReference: string;
  paymentDate: string;
  dueDate: string;
  installmentNo: number;
  installmentDueDate?: string;
  remainingBalance: number;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'OVERDUE' | 'PARTIAL' | 'REFUNDED';
  status: string;
  failureReason?: string;
  notes?: string;
  paidAt?: string;
  verifiedAt?: string;
  confirmedBy?: string;
}

interface SummaryMetrics {
  totalPaymentsReceived: number;
  totalAmountCollected: number;
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  failedPaymentsCount: number;
  failedPaymentsAmount: number;
  overduePaymentsCount: number;
  overduePaymentsAmount: number;
  totalOutstandingBalance: number;
}

export const PaymentHistoryManagement: React.FC<PaymentHistoryManagementProps> = ({
  currency = 'USD',
  onNavigate
}) => {
  // State: Data
  const [metrics, setMetrics] = useState<SummaryMetrics>({
    totalPaymentsReceived: 0,
    totalAmountCollected: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsAmount: 0,
    failedPaymentsCount: 0,
    failedPaymentsAmount: 0,
    overduePaymentsCount: 0,
    overduePaymentsAmount: 0,
    totalOutstandingBalance: 0,
  });
  const [payments, setPayments] = useState<PaymentRecordRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const limit = 12;

  // State: Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('');
  const [selectedLoanFilter, setSelectedLoanFilter] = useState<string>('');

  // Modals & Drawers
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<PaymentRecordRow | null>(null);
  const [activeReceiptModal, setActiveReceiptModal] = useState<PaymentReceipt | null>(null);
  const [confirmPaymentTarget, setConfirmPaymentTarget] = useState<PaymentRecordRow | null>(null);
  const [verificationChecked, setVerificationChecked] = useState<boolean>(false);
  const [confirmNotes, setConfirmNotes] = useState<string>('');
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState<boolean>(false);

  const [rejectPaymentTarget, setRejectPaymentTarget] = useState<PaymentRecordRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // User Dossier Drawer
  const [dossierUserId, setDossierUserId] = useState<string | null>(null);
  const [userDossierData, setUserDossierData] = useState<any | null>(null);
  const [isDossierLoading, setIsDossierLoading] = useState<boolean>(false);
  const [dossierActiveTab, setDossierActiveTab] = useState<'OVERVIEW' | 'LOANS' | 'INSTALLMENTS' | 'PAYMENTS'>('OVERVIEW');

  // Audit Trail Modal
  const [auditTrailPaymentId, setAuditTrailPaymentId] = useState<string | null>(null);
  const [auditTrailLogs, setAuditTrailLogs] = useState<any[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);

  // Toast / feedback message
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Summary KPIs
  const loadSummaryMetrics = async () => {
    try {
      const data = await api.getAdminPaymentSummary();
      if (data) {
        setMetrics({
          totalPaymentsReceived: Number(data.totalPaymentsReceived || 0),
          totalAmountCollected: Number(data.totalAmountCollectedUSD || data.totalAmountCollected || 0),
          pendingPaymentsCount: Number(data.pendingPaymentsCount || 0),
          pendingPaymentsAmount: Number(data.pendingPaymentsAmount || 0),
          failedPaymentsCount: Number(data.failedPaymentsCount || 0),
          failedPaymentsAmount: Number(data.failedPaymentsAmount || 0),
          overduePaymentsCount: Number(data.overduePaymentsCount || 0),
          overduePaymentsAmount: Number(data.overduePaymentsAmount || 0),
          totalOutstandingBalance: Number(data.totalOutstandingBalanceUSD || data.totalOutstandingBalance || 0),
        });
      }
    } catch (err) {
      console.warn('Failed to fetch admin payment summary metrics:', err);
    }
  };

  // Fetch Table Data
  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminPayments({
        search: searchQuery,
        status: statusFilter,
        paymentMethod: methodFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: selectedUserFilter || undefined,
        loanId: selectedLoanFilter || undefined,
        page,
        limit,
      });

      if (res && res.items) {
        setPayments(res.items);
        setTotalPages(res.meta?.totalPages || 1);
        setTotalRecords(res.meta?.total || res.items.length);
      }
    } catch (err) {
      console.error('Failed to load admin payment records:', err);
      showToast('Error loading payment history records from database.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummaryMetrics();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [page, statusFilter, methodFilter, startDate, endDate, selectedUserFilter, selectedLoanFilter]);

  // Debounced Search Query Trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      loadPayments();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load User Dossier
  const openUserDossier = async (userId: string) => {
    setDossierUserId(userId);
    setIsDossierLoading(true);
    setDossierActiveTab('OVERVIEW');
    try {
      const data = await api.getUserPaymentDossier(userId);
      setUserDossierData(data);
    } catch (err) {
      console.error('Failed to fetch user payment dossier:', err);
      showToast('Could not load user payment dossier', 'error');
    } finally {
      setIsDossierLoading(false);
    }
  };

  // Load Audit Trail
  const openAuditTrail = async (paymentId: string) => {
    setAuditTrailPaymentId(paymentId);
    setIsAuditLoading(true);
    try {
      const logs = await api.getPaymentAuditTrail(paymentId);
      setAuditTrailLogs(logs);
    } catch (err) {
      console.error('Failed to fetch payment audit trail:', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Action: Confirm Payment
  const handleConfirmPayment = async () => {
    if (!confirmPaymentTarget) return;
    if (!verificationChecked) {
      showToast('Please check the verification acknowledgement box.', 'error');
      return;
    }

    setIsSubmittingConfirm(true);
    try {
      const res = await api.confirmAdminPayment(confirmPaymentTarget.id, confirmNotes);
      showToast(res?.message || `Payment ${confirmPaymentTarget.receiptNo} successfully confirmed and settled.`);
      setConfirmPaymentTarget(null);
      setVerificationChecked(false);
      setConfirmNotes('');
      // Reload table and summary metrics
      loadSummaryMetrics();
      loadPayments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to confirm payment transaction.', 'error');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  // Action: Reject Payment
  const handleRejectPayment = async () => {
    if (!rejectPaymentTarget) return;
    if (!rejectionReason || rejectionReason.trim().length < 3) {
      showToast('Please provide a valid rejection reason of at least 3 characters.', 'error');
      return;
    }

    setIsSubmittingReject(true);
    try {
      const res = await api.rejectAdminPayment(rejectPaymentTarget.id, rejectionReason.trim());
      showToast(res?.message || `Payment submission ${rejectPaymentTarget.receiptNo} marked as failed.`);
      setRejectPaymentTarget(null);
      setRejectionReason('');
      loadSummaryMetrics();
      loadPayments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to reject payment submission.', 'error');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Action: Export CSV
  const handleExportCSV = () => {
    if (payments.length === 0) {
      showToast('No transaction records available to export.', 'info');
      return;
    }

    const headers = [
      'Payment ID',
      'User ID',
      'User Full Name',
      'User Email',
      'Loan ID',
      'Loan Amount (USD)',
      'Payment Amount (USD)',
      'Payment Method',
      'Transaction Reference',
      'Payment Date',
      'Due Date',
      'Payment Status',
      'Notes'
    ];

    const rows = payments.map((p) => [
      `"${p.paymentId}"`,
      `"${p.userId}"`,
      `"${p.userFullName.replace(/"/g, '""')}"`,
      `"${p.userEmail}"`,
      `"${p.loanId}"`,
      p.loanAmount.toFixed(2),
      p.paymentAmount.toFixed(2),
      `"${p.paymentMethod}"`,
      `"${p.transactionReference}"`,
      `"${new Date(p.paymentDate).toISOString().slice(0, 10)}"`,
      `"${p.dueDate}"`,
      `"${p.paymentStatus}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payment-history-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Payment history exported to CSV successfully.');
  };

  // Action: Print Table
  const handlePrintTable = () => {
    window.print();
  };

  // Convert row to receipt for viewing/printing
  const viewRowReceipt = (p: PaymentRecordRow) => {
    const rec: PaymentReceipt = {
      receiptNo: p.receiptNo || p.paymentId,
      loanNumber: p.loanId,
      borrowerId: p.userId,
      borrowerName: p.userFullName,
      installmentNo: p.installmentNo || 1,
      amountPaidUSD: p.paymentAmount,
      amountPaidKHR: Math.round(p.paymentAmount * 4100),
      currency: 'USD',
      paymentMethod: p.paymentMethod as any,
      transactionRef: p.transactionReference,
      paidAt: p.paymentDate,
      cashierName: p.confirmedBy || 'National Bank of Cambodia Universal Clearing',
      principalAllocatedUSD: Math.round(p.paymentAmount * 0.85 * 100) / 100,
      interestAllocatedUSD: Math.round(p.paymentAmount * 0.15 * 100) / 100,
      lateFeeAllocatedUSD: 0,
      outstandingBalanceAfterUSD: p.remainingBalance,
      notes: p.notes || 'Settled via Core Banking Ledger',
    };
    setActiveReceiptModal(rec);
  };

  // Formatting helpers
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PAID':
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
            Paid
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></span>
            Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5"></span>
            Failed
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5"></span>
            Overdue
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5"></span>
            Partial
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mr-1.5"></span>
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            {status}
          </span>
        );
    }
  };

  const getMethodBadge = (method: string) => {
    const m = (method || '').toUpperCase();
    if (m.includes('KHQR') || m.includes('QR')) {
      return (
        <span className="inline-flex items-center text-xs text-slate-700">
          <span className="font-semibold text-rose-600 mr-1">KHQR</span> Dynamic QR
        </span>
      );
    }
    if (m.includes('BANK') || m.includes('TRANSFER')) {
      return (
        <span className="inline-flex items-center text-xs text-slate-700">
          <Building2 className="w-3 h-3 text-slate-500 mr-1" /> Bank Wire
        </span>
      );
    }
    if (m.includes('CARD')) {
      return (
        <span className="inline-flex items-center text-xs text-slate-700">
          <CreditCard className="w-3 h-3 text-slate-500 mr-1" /> Credit/Debit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-xs text-slate-700">
        <DollarSign className="w-3 h-3 text-emerald-600 mr-1" /> Cash Desk
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans antialiased text-[#0F172A]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 text-xs font-semibold">
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 text-rose-600" />}
          {toast.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-600" />}
          <span className="text-slate-800">{toast.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                <ReceiptIcon className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                User Payment History Management
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                Super Admin Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time monitoring, verification, and audit of all borrower repayment transactions across active facilities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="Export current view to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={handlePrintTable}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="Print transaction table"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print
            </button>
            <button
              onClick={() => {
                loadSummaryMetrics();
                loadPayments();
                showToast('Synchronized with live database.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="Refresh ledger"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* 2. PAYMENT HISTORY DASHBOARD - 6 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Total Payments Received */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Payments Received
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {metrics.totalPaymentsReceived}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Confirmed Transactions</p>
          </div>
        </div>

        {/* Card 2: Total Amount Collected */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Amount Collected
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-emerald-700 tracking-tight">
              {formatUSD(metrics.totalAmountCollected)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ៛ {(Math.round(metrics.totalAmountCollected * 4100)).toLocaleString()} KHR
            </p>
          </div>
        </div>

        {/* Card 3: Pending Payments */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Payments
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-700 tracking-tight">
              {metrics.pendingPaymentsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Vol: {formatUSD(metrics.pendingPaymentsAmount)}
            </p>
          </div>
        </div>

        {/* Card 4: Failed Payments */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Failed Payments
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-rose-700 tracking-tight">
              {metrics.failedPaymentsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Vol: {formatUSD(metrics.failedPaymentsAmount)}
            </p>
          </div>
        </div>

        {/* Card 5: Overdue Payments */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Payments
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-red-700 tracking-tight">
              {metrics.overduePaymentsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Arrears: {formatUSD(metrics.overduePaymentsAmount)}
            </p>
          </div>
        </div>

        {/* Card 6: Total Outstanding Balance */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Balance
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {formatUSD(metrics.totalOutstandingBalance)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Portfolio Principal</p>
          </div>
        </div>
      </div>

      {/* 6. SEARCH AND FILTER TOOLBAR */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, email, Payment ID, Loan ID, or Ref #..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder-slate-400 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Method filter */}
          <div className="md:col-span-3">
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 bg-white cursor-pointer"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="QR_PAYMENT">Bakong Dynamic KHQR</option>
              <option value="BANK_TRANSFER">Bank Wire / ACLEDA</option>
              <option value="CASH">Cash Desk / Counter</option>
              <option value="CARD">Credit / Debit Card</option>
            </select>
          </div>

          {/* Date range picker */}
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none text-slate-700 bg-white"
                title="Start Date"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="relative flex-1">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none text-slate-700 bg-white"
                title="End Date"
              />
            </div>
            {(startDate || endDate || methodFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setMethodFilter('ALL');
                  setStartDate('');
                  setEndDate('');
                  setSelectedUserFilter('');
                  setSelectedLoanFilter('');
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                title="Clear all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Status:
          </span>
          {[
            { id: 'ALL', label: 'All Transactions' },
            { id: 'PAID', label: 'Paid' },
            { id: 'PENDING', label: 'Pending Review' },
            { id: 'FAILED', label: 'Failed' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'PARTIAL', label: 'Partial' },
            { id: 'REFUNDED', label: 'Refunded' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. USER PAYMENT HISTORY TABLE (13 COLUMNS) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5 whitespace-nowrap">Payment ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap">User ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap">User Full Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap">User Email</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Loan ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Loan Amount</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Payment Amount</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Payment Method</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Transaction Ref</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Payment Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Due Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Payment Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin"></div>
                      Loading database payment records...
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="text-xs font-semibold text-slate-700">No payment records found</p>
                      <p className="text-[11px] text-slate-400">
                        Try modifying search keywords or clearing active status/date filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isPending = p.paymentStatus === 'PENDING';
                  return (
                    <tr
                      key={p.id || p.paymentId}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* 1. Payment ID */}
                      <td className="py-3 px-3.5 font-mono text-slate-900 font-semibold whitespace-nowrap">
                        {p.paymentId}
                      </td>

                      {/* 2. User ID */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {p.userId}
                      </td>

                      {/* 3. User Full Name (Clickable -> Opens Dossier) */}
                      <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                        <button
                          onClick={() => openUserDossier(p.userInternalId || p.userId)}
                          className="text-slate-900 hover:text-emerald-700 hover:underline font-semibold text-left inline-flex items-center gap-1 cursor-pointer"
                          title="Click to view complete User Payment Dossier"
                        >
                          {p.userFullName}
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </button>
                      </td>

                      {/* 4. User Email */}
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                        {p.userEmail}
                      </td>

                      {/* 5. Loan ID */}
                      <td className="py-3 px-3.5 font-mono text-slate-800 whitespace-nowrap font-medium">
                        {p.loanId}
                      </td>

                      {/* 6. Loan Amount */}
                      <td className="py-3 px-3.5 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatUSD(p.loanAmount)}
                      </td>

                      {/* 7. Payment Amount */}
                      <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatUSD(p.paymentAmount)}
                      </td>

                      {/* 8. Payment Method */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getMethodBadge(p.paymentMethod)}
                      </td>

                      {/* 9. Transaction Reference */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {p.transactionReference}
                      </td>

                      {/* 10. Payment Date */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {new Date(p.paymentDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* 11. Due Date */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {p.dueDate}
                      </td>

                      {/* 12. Payment Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(p.paymentStatus)}
                      </td>

                      {/* 13. Actions */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => setSelectedPaymentDetails(p)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                            title="View Payment Breakdown Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* View Receipt */}
                          <button
                            onClick={() => viewRowReceipt(p)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                            title="Print / View Official Banking Receipt"
                          >
                            <ReceiptIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Audit Trail */}
                          <button
                            onClick={() => openAuditTrail(p.id)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                            title="View Audit Trail Logs"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* If Pending: Review & Confirm or Reject */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => {
                                  setConfirmPaymentTarget(p);
                                  setVerificationChecked(false);
                                  setConfirmNotes('');
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer inline-flex items-center gap-1 ml-1"
                                title="Review and confirm payment"
                              >
                                <Check className="w-3 h-3" />
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  setRejectPaymentTarget(p);
                                  setRejectionReason('');
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                                title="Reject invalid payment"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="bg-slate-50/80 px-4 py-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{payments.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalRecords}</span> payment records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. PAYMENT DETAILS MODAL */}
      {selectedPaymentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-slate-50">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="w-4 h-4 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  Payment Details Breakdown • {selectedPaymentDetails.paymentId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPaymentDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* User & Loan Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Borrower Information
                  </span>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">User Full Name:</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentDetails.userFullName}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">User ID:</span>
                    <span className="font-mono text-slate-700">{selectedPaymentDetails.userId}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Email Address:</span>
                    <span className="text-slate-700">{selectedPaymentDetails.userEmail}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-700">{selectedPaymentDetails.userPhone || 'N/A'}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Loan Facility Details
                  </span>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Loan ID:</span>
                    <span className="font-mono font-semibold text-slate-900">{selectedPaymentDetails.loanId}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Product:</span>
                    <span className="text-slate-700">{selectedPaymentDetails.productName || 'Standard Loan'}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Original Amount:</span>
                    <span className="font-medium text-slate-900">{formatUSD(selectedPaymentDetails.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Total Repayment:</span>
                    <span className="font-medium text-slate-900">
                      {formatUSD(selectedPaymentDetails.totalRepaymentAmount || selectedPaymentDetails.loanAmount * 1.08)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Installment & Settlement Info */}
              <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Installment & Transaction Settlement
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Installment Cycle</span>
                    <span className="font-semibold text-slate-800">Cycle #{selectedPaymentDetails.installmentNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Installment Due Date</span>
                    <span className="font-medium text-slate-800">{selectedPaymentDetails.dueDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Payment Status</span>
                    <div className="mt-0.5">{getStatusBadge(selectedPaymentDetails.paymentStatus)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Amount Paid</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {formatUSD(selectedPaymentDetails.paymentAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Remaining Balance</span>
                    <span className="font-medium text-slate-800">
                      {formatUSD(selectedPaymentDetails.remainingBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Payment Method</span>
                    <span className="font-medium text-slate-800">{selectedPaymentDetails.paymentMethod}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between text-[11px] text-slate-500 gap-2">
                  <div>
                    Transaction Reference: <span className="font-mono text-slate-700 font-semibold">{selectedPaymentDetails.transactionReference}</span>
                  </div>
                  <div>
                    Recorded: {new Date(selectedPaymentDetails.paymentDate).toLocaleString()}
                  </div>
                </div>

                {selectedPaymentDetails.failureReason && (
                  <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                    <strong>Failure Reason:</strong> {selectedPaymentDetails.failureReason}
                  </div>
                )}
                {selectedPaymentDetails.notes && (
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                    <strong>Notes:</strong> {selectedPaymentDetails.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  viewRowReceipt(selectedPaymentDetails);
                  setSelectedPaymentDetails(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                View Printable Receipt
              </button>

              <button
                onClick={() => setSelectedPaymentDetails(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CONFIRM PAYMENT VERIFICATION MODAL */}
      {confirmPaymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Super Admin Payment Verification & Confirmation
                </h3>
              </div>
              <button
                onClick={() => setConfirmPaymentTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Mandatory Security Verification Policy
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  As Super Admin, you are confirming settlement of this transaction into the core institutional ledger. This action atomically decrements the loan facility outstanding balance, updates schedule status, and generates an immutable banking receipt.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment ID:</span>
                  <span className="font-mono font-semibold text-slate-800">{confirmPaymentTarget.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Borrower:</span>
                  <span className="font-semibold text-slate-900">{confirmPaymentTarget.userFullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Facility:</span>
                  <span className="font-mono text-slate-800">{confirmPaymentTarget.loanId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Amount:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatUSD(confirmPaymentTarget.paymentAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono text-slate-700">{confirmPaymentTarget.transactionReference}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Confirmation Notes / Bank Reference (Optional)
                </label>
                <input
                  type="text"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="e.g., Verified against ACLEDA settlement ledger batch #4409"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                />
              </div>

              {/* Mandatory Checklist Checkbox */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verificationChecked}
                  onChange={(e) => setVerificationChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-[11px] text-slate-700 leading-normal">
                  I have verified this transaction reference against our clearing rail (Bakong, ACLEDA, or Cash Counter) and confirm receipt of funds.
                </span>
              </label>
            </div>

            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmPaymentTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={!verificationChecked || isSubmittingConfirm}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
              >
                {isSubmittingConfirm ? 'Confirming...' : 'Confirm & Reconcile Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. REJECT PAYMENT MODAL WITH MANDATORY REASON */}
      {rejectPaymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Reject Payment Submission • {rejectPaymentTarget.receiptNo}
                </h3>
              </div>
              <button
                onClick={() => setRejectPaymentTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                You are rejecting payment submission of{' '}
                <strong className="text-slate-900">{formatUSD(rejectPaymentTarget.paymentAmount)}</strong> from{' '}
                <strong className="text-slate-900">{rejectPaymentTarget.userFullName}</strong>.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Mandatory Rejection Reason: <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Specify clear reason (e.g., Transaction reference not found in ACLEDA statement, amount mismatch, etc.)..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  This reason will be recorded in the audit log and communicated to the borrower.
                </span>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectPaymentTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                disabled={isSubmittingReject || rejectionReason.trim().length < 3}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition cursor-pointer"
              >
                {isSubmittingReject ? 'Rejecting...' : 'Reject Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. COMPLETE USER PAYMENT HISTORY DOSSIER DRAWER */}
      {dossierUserId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="bg-white border-l border-[#E2E8F0] shadow-xl w-full max-w-3xl h-full flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-800" />
                  Borrower Financial Dossier & Payment History
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Complete repayment track record, facilities, and schedule breakdown for {userDossierData?.user?.fullName || dossierUserId}
                </p>
              </div>
              <button
                onClick={() => {
                  setDossierUserId(null);
                  setUserDossierData(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            {isDossierLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin"></div>
                  Loading borrower payment track record...
                </div>
              </div>
            ) : userDossierData ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* Borrower Overview Banner */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {userDossierData.user.fullName}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span>ID: <strong className="text-slate-700 font-mono">{userDossierData.user.userId}</strong></span>
                      <span>•</span>
                      <span>Email: <strong className="text-slate-700">{userDossierData.user.email}</strong></span>
                      <span>•</span>
                      <span>Phone: <strong className="text-slate-700">{userDossierData.user.phone}</strong></span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                    Account Active
                  </span>
                </div>

                {/* Dossier Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="border border-slate-200 rounded-lg p-3 bg-white">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Borrowed</span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">
                      {formatUSD(userDossierData.summary.totalAmountBorrowedUSD)}
                    </span>
                    <span className="text-[10px] text-slate-500">{userDossierData.summary.totalLoansBorrowed} Loans Borrowed</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Repaid</span>
                    <span className="text-sm font-bold text-emerald-700 block mt-1">
                      {formatUSD(userDossierData.summary.totalAmountRepaidUSD)}
                    </span>
                    <span className="text-[10px] text-slate-500">{userDossierData.summary.successfulPaymentsCount} Paid Txns</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Remaining Balance</span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">
                      {formatUSD(userDossierData.summary.remainingRepaymentAmountUSD)}
                    </span>
                    <span className="text-[10px] text-slate-500">Outstanding</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Late / Delinquency</span>
                    <span className={`text-sm font-bold block mt-1 ${userDossierData.summary.latePaymentRecordsCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {userDossierData.summary.latePaymentRecordsCount} Cycles
                    </span>
                    <span className="text-[10px] text-slate-500">Overdue Incidents</span>
                  </div>
                </div>

                {/* Dossier Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  {[
                    { id: 'OVERVIEW', label: 'All Borrowed Loans' },
                    { id: 'INSTALLMENTS', label: 'Installment Schedules' },
                    { id: 'PAYMENTS', label: 'Payment Transactions' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDossierActiveTab(tab.id as any)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                        dossierActiveTab === tab.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Loans */}
                {dossierActiveTab === 'OVERVIEW' && (
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      All Facilities Originated ({userDossierData.loans.length})
                    </span>
                    {userDossierData.loans.map((loan: any) => (
                      <div
                        key={loan.id}
                        className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {loan.loanNumber}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-medium">{loan.productName}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {loan.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400 block">Principal</span>
                            <span className="font-semibold text-slate-800">{formatUSD(loan.principalAmount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Interest Rate</span>
                            <span className="font-semibold text-slate-800">{loan.interestRate}% APR</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Total Repaid</span>
                            <span className="font-semibold text-emerald-700">{formatUSD(loan.totalPaid)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Outstanding</span>
                            <span className="font-semibold text-slate-900">{formatUSD(loan.outstandingBalance)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab: Installments */}
                {dossierActiveTab === 'INSTALLMENTS' && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Cycle</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Principal</th>
                          <th className="py-2.5 px-3 text-right">Interest</th>
                          <th className="py-2.5 px-3 text-right">Total Due</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {userDossierData.installments.map((inst: any, idx: number) => (
                          <tr key={inst.id || idx}>
                            <td className="py-2 px-3 font-semibold text-slate-800">#{inst.installmentNo}</td>
                            <td className="py-2 px-3 text-slate-600">{inst.dueDate}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-700">{formatUSD(inst.principalAmount)}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatUSD(inst.interestAmount)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">{formatUSD(inst.totalDue)}</td>
                            <td className="py-2 px-3 text-right font-medium text-emerald-700">{formatUSD(inst.amountPaid)}</td>
                            <td className="py-2 px-3 text-center">
                              {getStatusBadge(inst.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab: Payments */}
                {dossierActiveTab === 'PAYMENTS' && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Receipt #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {userDossierData.payments.map((pmt: any) => (
                          <tr key={pmt.id}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{pmt.receiptNo || pmt.paymentId}</td>
                            <td className="py-2 px-3 text-slate-600">{new Date(pmt.paymentDate).toLocaleDateString()}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatUSD(pmt.amount)}</td>
                            <td className="py-2 px-3 text-slate-700">{pmt.paymentMethod}</td>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{pmt.referenceNo}</td>
                            <td className="py-2 px-3 text-center">{getStatusBadge(pmt.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {/* Drawer Footer */}
            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  setDossierUserId(null);
                  setUserDossierData(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. AUDIT TRAIL MODAL */}
      {auditTrailPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  Payment Audit Trail • {auditTrailPaymentId}
                </h3>
              </div>
              <button
                onClick={() => setAuditTrailPaymentId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto space-y-3 text-xs">
              {isAuditLoading ? (
                <div className="py-8 text-center text-slate-500">Loading audit log events...</div>
              ) : auditTrailLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No explicit audit trail recorded for this payment identifier.
                </div>
              ) : (
                auditTrailLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px]">{log.action}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Operator: <strong className="text-slate-800">{log.adminName}</strong> ({log.adminRole})
                    </p>
                    {log.details && (
                      <pre className="text-[10px] font-mono bg-white p-2 rounded border border-slate-200 text-slate-700 overflow-x-auto mt-1">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-slate-50 flex justify-end">
              <button
                onClick={() => setAuditTrailPaymentId(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Thermal / Banking Receipt Modal */}
      {activeReceiptModal && (
        <PaymentReceiptModal
          receipt={activeReceiptModal}
          onClose={() => setActiveReceiptModal(null)}
        />
      )}
    </div>
  );
};
export default PaymentHistoryManagement;
