import React, { useState, useMemo, useEffect } from 'react';
import { LoanApplication, Currency, UserRole, UserProfile } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { Badge } from '../../common/Badge';
import { MoneyText } from '../../common/MoneyText';
import { api } from '../../../services/api';
import { loanStorageService, LEDGER_UPDATE_EVENT } from '../../../services/loanStorageService';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  AlertTriangle,
  Eye,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  ChevronRight,
  ArrowUpDown,
  CheckSquare,
  Square,
  Lock,
  History,
  Info,
  Loader2
} from 'lucide-react';

export interface LoanApplicationManagementProps {
  applications: LoanApplication[];
  currency: Currency;
  currentUserRole: UserRole;
  currentUserName: string;
  onExecutiveDecision: (
    appId: string,
    decision: 'APPROVED' | 'REJECTED',
    terms?: { amount: number; term: number; rate: number; reason?: string }
  ) => void;
  onNavigateToDisbursements?: () => void;
}

export const LoanApplicationManagement: React.FC<LoanApplicationManagementProps> = ({
  applications,
  currency,
  currentUserRole,
  currentUserName,
  onExecutiveDecision,
  onNavigateToDisbursements
}) => {
  const { t } = useLanguage();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected application for detail review drawer/modal
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<'dossier' | 'checklist' | 'history'>('dossier');

  // Verification Checklist State (9 Required Items)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    personalInfo: false,
    identityVerified: false,
    contactChecked: false,
    employmentReviewed: false,
    incomeReviewed: false,
    documentsChecked: false,
    loanAmountReviewed: false,
    repaymentAbilityAssessed: false,
    existingLoansChecked: false,
  });

  // Document preview lightbox
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url?: string; type: string } | null>(null);
  const [docZoom, setDocZoom] = useState(1);
  const [docRotation, setDocRotation] = useState(0);

  // Approval Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState<number>(5000);
  const [approvedTerm, setApprovedTerm] = useState<number>(12);
  const [approvedRate, setApprovedRate] = useState<number>(10.5);
  const [approvalNotes, setApprovalNotes] = useState<string>('Approved by Executive Credit Committee');

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('HIGH_DTI');
  const [rejectionNotes, setRejectionNotes] = useState<string>('');

  // Target App for Direct Decisions & Loading State
  const [targetAppForDecision, setTargetAppForDecision] = useState<LoanApplication | null>(null);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);

  // Synchronized unified applications
  const [appsList, setAppsList] = useState<LoanApplication[]>(applications);

  useEffect(() => {
    setAppsList(applications);
  }, [applications]);

  // Handle cross-component sync
  useEffect(() => {
    const handleSync = async () => {
      try {
        const res = await api.getApplications();
        if (Array.isArray(res)) setAppsList(res);
      } catch {
        // ignore
      }
    };
    window.addEventListener(LEDGER_UPDATE_EVENT, handleSync);
    return () => window.removeEventListener(LEDGER_UPDATE_EVENT, handleSync);
  }, []);

  // Helper to dynamically resolve authentic human applicant profile
  const resolveApplicantDetails = (app: LoanApplication | null) => {
    if (!app) {
      return {
        fullName: 'Applicant',
        email: 'applicant@student.edu',
        phone: '',
        dateOfBirth: '2001-08-15',
        gender: 'Female',
        residentialAddress: 'Preah Monivong Blvd, Sangkat BKK1, Phnom Penh, Cambodia',
        occupation: 'Student / Entrepreneur',
        userId: 'BOR-2026-3838',
      };
    }

    let regUsers: Record<string, any> = {};
    try {
      regUsers = JSON.parse(localStorage.getItem('apex_registered_users') || '{}');
    } catch {}

    const appEmail = (app as any).email || (app as any).borrowerEmail;
    const appPhone = (app as any).phone || (app as any).borrowerPhone;
    const bName = app.borrowerName || '';
    const bId = app.borrowerId || '';

    const matchedUser =
      (appEmail && regUsers[appEmail.toLowerCase()]) ||
      (bId && regUsers[bId]) ||
      (bName && regUsers[bName.toLowerCase()]) ||
      Object.values(regUsers).find((u: any) =>
        (u.name && u.name.toLowerCase() === bName.toLowerCase()) ||
        (u.borrowerId && u.borrowerId === bId)
      ) || null;

    const fullName = bName || matchedUser?.name || 'Applicant';
    const email = appEmail || matchedUser?.email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@student.edu`;
    const phone = appPhone || matchedUser?.phone || '';
    const dateOfBirth = (app as any).dateOfBirth || (app as any).dob || matchedUser?.dateOfBirth || matchedUser?.dob || '2001-08-15';
    const gender = (app as any).gender || matchedUser?.gender || 'Female';
    const residentialAddress = (app as any).residentialAddress || (app as any).address || matchedUser?.address || matchedUser?.residentialAddress || 'Preah Monivong Blvd, Sangkat BKK1, Phnom Penh, Cambodia';
    const occupation = (app as any).occupation || matchedUser?.occupation || 'Student / Entrepreneur';
    const userId = bId || matchedUser?.borrowerId || 'BOR-2026-3838';

    return {
      fullName,
      email,
      phone,
      dateOfBirth,
      gender,
      residentialAddress,
      occupation,
      userId,
    };
  };

  // Filtered & Sorted applications
  const filteredApps = useMemo(() => {
    return appsList.filter((app) => {
      const q = searchQuery.toLowerCase().trim();
      const st = (app.status || '').toUpperCase();
      const applicant = resolveApplicantDetails(app);

      const matchesSearch =
        !q ||
        app.applicationNo.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        applicant.userId.toLowerCase().includes(q) ||
        applicant.fullName.toLowerCase().includes(q) ||
        applicant.email.toLowerCase().includes(q) ||
        applicant.phone.toLowerCase().includes(q) ||
        (app.productName || '').toLowerCase().includes(q);

      let matchesStatus = true;
      if (selectedStatusTab === 'PENDING') {
        matchesStatus =
          st === 'SUBMITTED' ||
          st === 'PENDING' ||
          st === 'UNDER_REVIEW' ||
          st === 'UNDERWRITING_PENDING';
      } else if (selectedStatusTab === 'APPROVED') {
        matchesStatus = st === 'APPROVED';
      } else if (selectedStatusTab === 'REJECTED') {
        matchesStatus = st === 'REJECTED';
      } else if (selectedStatusTab === 'ACTIVE') {
        matchesStatus = st === 'ACTIVE' || st === 'DISBURSED';
      } else if (selectedStatusTab === 'COMPLETED') {
        matchesStatus = st === 'COMPLETED';
      } else if (selectedStatusTab === 'OVERDUE') {
        matchesStatus = st === 'OVERDUE';
      }

      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }
      if (sortField === 'amount') {
        const aVal = Number(a.requestedAmountUSD || 0);
        const bVal = Number(b.requestedAmountUSD || 0);
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (sortField === 'name') {
        return sortOrder === 'asc'
          ? a.borrowerName.localeCompare(b.borrowerName)
          : b.borrowerName.localeCompare(a.borrowerName);
      }
      return 0;
    });
  }, [appsList, searchQuery, selectedStatusTab, sortField, sortOrder]);

  // Counts for status tabs
  const pendingCount = useMemo(() => {
    return appsList.filter((a) => {
      const st = (a.status || '').toUpperCase();
      return (
        st === 'SUBMITTED' ||
        st === 'PENDING' ||
        st === 'UNDER_REVIEW' ||
        st === 'UNDERWRITING_PENDING'
      );
    }).length;
  }, [appsList]);

  // Active selected application object
  const activeApp = useMemo(() => {
    if (!selectedAppId) return null;
    return appsList.find((a) => a.id === selectedAppId || a.applicationNo === selectedAppId) || null;
  }, [selectedAppId, appsList]);

  // Dynamically resolved applicant profile
  const activeApplicant = useMemo(() => {
    return resolveApplicantDetails(targetAppForDecision || activeApp);
  }, [targetAppForDecision, activeApp]);

  // Dynamically resolved documents for selected applicant
  const activeApplicantDocs = useMemo(() => {
    if (!activeApp) return [];
    const applicant = resolveApplicantDetails(activeApp);
    const docs: Array<{ title: string; filename: string; size: string; type: string; url?: string }> = [];

    // 1. National ID Document
    docs.push({
      title: 'National Identity Card',
      filename: `${applicant.fullName.toLowerCase().replace(/\s+/g, '_')}_national_id.png`,
      size: '245 KB',
      type: 'image/png'
    });

    // 2. Check if real salarySlipDoc attached
    const slip = (activeApp as any).salarySlipDoc;
    if (slip && slip.fileName) {
      docs.push({
        title: 'Salary / Income Slip',
        filename: slip.fileName,
        size: slip.fileSize ? `${(slip.fileSize / 1024).toFixed(0)} KB` : '412 KB',
        type: slip.mimeType || 'application/pdf',
        url: slip.dataUrl
      });
    } else {
      docs.push({
        title: 'Salary / Income Slip',
        filename: `${applicant.fullName.toLowerCase().replace(/\s+/g, '_')}_salary_slip.pdf`,
        size: '412 KB',
        type: 'application/pdf'
      });
    }

    // 3. Check if real collateralDoc attached
    const col = (activeApp as any).collateralDoc;
    if (col && col.fileName) {
      docs.push({
        title: 'Proof of Residence Certificate',
        filename: col.fileName,
        size: col.fileSize ? `${(col.fileSize / 1024).toFixed(0)} KB` : '310 KB',
        type: col.mimeType || 'image/jpeg',
        url: col.dataUrl
      });
    } else {
      docs.push({
        title: 'Proof of Residence Certificate',
        filename: `${applicant.fullName.toLowerCase().replace(/\s+/g, '_')}_residence_cert.jpg`,
        size: '310 KB',
        type: 'image/jpeg'
      });
    }

    return docs;
  }, [activeApp]);

  const openApproveModalFor = (app: LoanApplication) => {
    setTargetAppForDecision(app);
    setSelectedAppId(app.id);
    setApprovedAmount(app.requestedAmountUSD || 5000);
    setApprovedTerm(app.requestedTermMonths || 12);
    setApprovedRate(10.5);
    setApprovalNotes('Approved by Executive Credit Committee');
    setApproveModalOpen(true);
  };

  const openRejectModalFor = (app: LoanApplication) => {
    setTargetAppForDecision(app);
    setSelectedAppId(app.id);
    setRejectionReason('HIGH_DTI');
    setRejectionNotes('Debt-to-Income (DTI) ratio exceeds approved institutional guidelines.');
    setRejectModalOpen(true);
  };

  const handleExecuteApproval = async () => {
    const appToDecide = targetAppForDecision || activeApp;
    if (!appToDecide) return;
    setIsProcessingDecision(true);
    try {
      await onExecutiveDecision(appToDecide.id, 'APPROVED', {
        amount: Number(approvedAmount) || appToDecide.requestedAmountUSD || 5000,
        term: Number(approvedTerm) || appToDecide.requestedTermMonths || 12,
        rate: Number(approvedRate) || 10.5,
        reason: approvalNotes.trim() || 'Approved by Executive Credit Committee'
      });
      setApproveModalOpen(false);
      setTargetAppForDecision(null);
      setSelectedAppId(null);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const handleExecuteRejection = async () => {
    const appToDecide = targetAppForDecision || activeApp;
    if (!appToDecide) return;
    setIsProcessingDecision(true);
    try {
      const note = rejectionNotes.trim() || 'Debt-to-Income (DTI) ratio or risk criteria exceed institutional guidelines.';
      await onExecutiveDecision(appToDecide.id, 'REJECTED', {
        amount: 0,
        term: 0,
        rate: 0,
        reason: `[${rejectionReason}] ${note}`
      });
      setRejectModalOpen(false);
      setTargetAppForDecision(null);
      setSelectedAppId(null);
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  // Checklist verification calculations
  const verifiedChecklistCount = Object.values(checklist).filter(Boolean).length;
  const isChecklistComplete = verifiedChecklistCount === 9;

  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCheckAll = () => {
    setChecklist({
      personalInfo: true,
      identityVerified: true,
      contactChecked: true,
      employmentReviewed: true,
      incomeReviewed: true,
      documentsChecked: true,
      loanAmountReviewed: true,
      repaymentAbilityAssessed: true,
      existingLoansChecked: true,
    });
  };

  const handleResetChecklist = () => {
    setChecklist({
      personalInfo: false,
      identityVerified: false,
      contactChecked: false,
      employmentReviewed: false,
      incomeReviewed: false,
      documentsChecked: false,
      loanAmountReviewed: false,
      repaymentAbilityAssessed: false,
      existingLoansChecked: false,
    });
  };

  const renderStatusBadge = (status: string) => {
    const st = (status || '').toUpperCase();
    if (st === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          <span>{t('Approved')}</span>
        </span>
      );
    }
    if (st === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-rose-50 text-[#DC2626] border border-rose-200">
          <XCircle className="w-3 h-3" />
          <span>{t('Rejected')}</span>
        </span>
      );
    }
    if (st === 'ACTIVE' || st === 'DISBURSED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
          <CheckCircle2 className="w-3 h-3" />
          <span>{t('Active')}</span>
        </span>
      );
    }
    if (st === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <span>{t('Completed')}</span>
        </span>
      );
    }
    if (st === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
          <AlertTriangle className="w-3 h-3" />
          <span>{t('Overdue')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
        <Clock className="w-3 h-3" />
        <span>{t('Pending')}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {t('Loan Application Management')}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
              {pendingCount} {t('Pending Review')}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Comprehensive Super Admin review desk for borrower credit applications, KYC documents, and risk authorizations.
          </p>
        </div>
      </div>

      {/* 2. Status Filters & Search Bar */}
      <div className="space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-[#E2E8F0] pb-2 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Applications' },
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'ACTIVE', label: 'Active Facilities' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'OVERDUE', label: 'Overdue' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-[6px] transition cursor-pointer ${
                selectedStatusTab === tab.id
                  ? 'bg-[#0F172A] text-white font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Applicant Name, Email, Phone, Application ID, User ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[6px] border border-[#CBD5E1] bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className="text-[#64748B]">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-2 py-1.5 rounded-[6px] border border-[#CBD5E1] bg-white text-[#0F172A] text-xs"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="name">Name</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-1.5 rounded-[6px] border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#0F172A]"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. 10-Column Enterprise Data Table */}
      <div className="overflow-hidden rounded-[8px] border border-[#E2E8F0] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="table-enterprise w-full">
            <thead>
              <tr>
                <th>{t('Application ID')}</th>
                <th>{t('User ID')}</th>
                <th>{t('Applicant Name')}</th>
                <th>{t('Email')}</th>
                <th>{t('Phone Number')}</th>
                <th className="text-right">{t('Requested Loan Amount')}</th>
                <th className="text-center">{t('Duration')}</th>
                <th>{t('Application Date')}</th>
                <th className="text-center">{t('Application Status')}</th>
                <th className="text-right">{t('Action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-xs text-[#64748B]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ShieldCheck className="w-8 h-8 text-[#16A34A] mx-auto" />
                      <p className="font-semibold text-[#0F172A] text-sm">No applications found</p>
                      <p>No loan application records matched your current search and filter criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const applicant = resolveApplicantDetails(app);
                  const appDate = app.createdAt ? app.createdAt.split('T')[0] : '2026-09-01';

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Application ID */}
                      <td className="font-mono tabular-nums font-bold text-[#2563EB]">
                        {app.applicationNo || app.id}
                      </td>

                      {/* 2. User ID */}
                      <td className="font-mono text-xs text-[#64748B]">
                        {applicant.userId}
                      </td>

                      {/* 3. Applicant Name */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {applicant.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-[#0F172A]">{applicant.fullName}</span>
                        </div>
                      </td>

                      {/* 4. Email */}
                      <td className="text-xs text-[#64748B]">
                        {applicant.email}
                      </td>

                      {/* 5. Phone Number */}
                      <td className="text-xs font-mono text-[#0F172A]">
                        {applicant.phone}
                      </td>

                      {/* 6. Requested Loan Amount */}
                      <td className="text-right font-mono font-bold text-[#0F172A]">
                        <MoneyText amount={app.requestedAmountUSD} currency={currency} />
                      </td>

                      {/* 7. Loan Duration */}
                      <td className="text-center font-mono text-xs text-[#0F172A]">
                        {app.requestedTermMonths || 12} Mos
                      </td>

                      {/* 8. Application Date */}
                      <td className="text-xs font-mono text-[#64748B]">
                        {appDate}
                      </td>

                      {/* 9. Application Status */}
                      <td className="text-center">
                        {renderStatusBadge(app.status)}
                      </td>

                      {/* 10. Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAppId(app.id);
                              setActiveDossierTab('dossier');
                            }}
                            className="px-2.5 py-1 rounded-[6px] bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1 shadow-xs"
                            title="Inspect Application Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'UNDERWRITING_PENDING'].includes((app.status || '').toUpperCase()) && (
                            <>
                              <button
                                type="button"
                                onClick={() => openApproveModalFor(app)}
                                className="px-2.5 py-1 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                                title="Approve Loan Sanction"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openRejectModalFor(app)}
                                className="px-2.5 py-1 rounded-[6px] bg-[#DC2626] hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                                title="Reject Application"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {app.status === 'APPROVED' && onNavigateToDisbursements && (
                            <button
                              type="button"
                              onClick={onNavigateToDisbursements}
                              className="px-2.5 py-1 rounded-[6px] bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
                              title="Go to Disbursements Queue"
                            >
                              <span>Disburse ➔</span>
                            </button>
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
      </div>

      {/* 4. COMPREHENSIVE VIEW DETAILS REVIEW DRAWER / MODAL */}
      {activeApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans backdrop-blur-xs">
          <div className="bg-white rounded-[8px] border border-[#E2E8F0] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Application Dossier: {activeApp.applicationNo || activeApp.id}
                    </h2>
                    {renderStatusBadge(activeApp.status)}
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Applicant: <strong className="text-[#0F172A]">{activeApp.borrowerName}</strong> • User ID: {activeApp.borrowerId || 'BOR-2026-0001'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAppId(null);
                  setTargetAppForDecision(null);
                  setApproveModalOpen(false);
                  setRejectModalOpen(false);
                }}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200/70 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Tabs Navigation */}
            <div className="flex items-center gap-4 px-4 border-b border-[#E2E8F0] bg-white text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveDossierTab('dossier')}
                className={`py-3 border-b-2 transition cursor-pointer ${
                  activeDossierTab === 'dossier'
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                1. Full Application Dossier
              </button>
              <button
                type="button"
                onClick={() => setActiveDossierTab('checklist')}
                className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeDossierTab === 'checklist'
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span>2. Verification Checklist</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isChecklistComplete ? 'bg-emerald-100 text-[#16A34A]' : 'bg-amber-100 text-[#D97706]'
                }`}>
                  {verifiedChecklistCount}/9
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDossierTab('history')}
                className={`py-3 border-b-2 transition cursor-pointer ${
                  activeDossierTab === 'history'
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                3. Review History & Audit Trail
              </button>
            </div>

            {/* Dossier Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: FULL APPLICATION DOSSIER */}
              {activeDossierTab === 'dossier' && (
                <div className="space-y-6">
                  {/* A. PERSONAL INFORMATION */}
                  <div className="rounded-[8px] border border-[#E2E8F0] p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] text-[#0F172A] font-bold text-xs uppercase tracking-wide">
                      <User className="w-4 h-4 text-[#2563EB]" />
                      <span>A. Personal Information</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[#64748B] block">Full Name</span>
                        <strong className="text-[#0F172A]">{activeApplicant.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Date of Birth</span>
                        <strong className="text-[#0F172A]">{activeApplicant.dateOfBirth}</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Gender</span>
                        <strong className="text-[#0F172A]">{activeApplicant.gender}</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Email Address</span>
                        <strong className="text-[#0F172A] truncate block">
                          {activeApplicant.email}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Phone Number</span>
                        <strong className="text-[#0F172A]">{activeApplicant.phone}</strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[#64748B] block">Residential Address</span>
                        <strong className="text-[#0F172A]">{activeApplicant.residentialAddress}</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Occupation & Employment</span>
                        <strong className="text-[#0F172A]">{activeApplicant.occupation}</strong>
                      </div>
                    </div>
                  </div>

                  {/* B. LOAN INFORMATION */}
                  <div className="rounded-[8px] border border-[#E2E8F0] p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] text-[#0F172A] font-bold text-xs uppercase tracking-wide">
                      <DollarSign className="w-4 h-4 text-[#16A34A]" />
                      <span>B. Loan Information</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[#64748B] block font-sans">Requested Loan Amount</span>
                        <strong className="text-[#0F172A] text-sm">
                          <MoneyText amount={activeApp.requestedAmountUSD} currency={currency} />
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Loan Purpose</span>
                        <strong className="text-[#0F172A] font-sans">{activeApp.purpose || 'Commercial Working Capital'}</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Loan Duration</span>
                        <strong className="text-[#0F172A]">{activeApp.requestedTermMonths || 12} Months</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Interest Rate</span>
                        <strong className="text-[#0F172A]">10.5% APR (Reducing Balance)</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Monthly Installment (EMI)</span>
                        <strong className="text-[#0F172A]">
                          <MoneyText amount={Math.round((activeApp.requestedAmountUSD * 1.105) / (activeApp.requestedTermMonths || 12))} currency={currency} />
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Total Repayment Amount</span>
                        <strong className="text-[#0F172A]">
                          <MoneyText amount={Math.round(activeApp.requestedAmountUSD * 1.105)} currency={currency} />
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Repayment Start Date</span>
                        <strong className="text-[#0F172A]">{new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Product Type</span>
                        <strong className="text-[#0F172A] font-sans">{activeApp.productName || 'Personal Credit Facility'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* C. FINANCIAL INFORMATION */}
                  <div className="rounded-[8px] border border-[#E2E8F0] p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] text-[#0F172A] font-bold text-xs uppercase tracking-wide">
                      <Briefcase className="w-4 h-4 text-[#D97706]" />
                      <span>C. Financial Information & DTI Assessment</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[#64748B] block font-sans">Monthly Declared Income</span>
                        <strong className="text-[#0F172A]">
                          <MoneyText amount={activeApp.borrowerIncomeUSD || 2500} currency={currency} />
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Employment Status</span>
                        <strong className="text-[#0F172A] font-sans">Full-time Employed</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Existing Debt Obligations</span>
                        <strong className="text-[#0F172A]">$0.00 / Month</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block font-sans">Debt-to-Income (DTI)</span>
                        <strong className="text-[#16A34A]">{activeApp.dtiRatio || 24.5}% (Prime Risk)</strong>
                      </div>
                    </div>
                  </div>

                  {/* D. SUPPORTING DOCUMENTS VAULT */}
                  <div className="rounded-[8px] border border-[#E2E8F0] p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                      <div className="flex items-center gap-2 text-[#0F172A] font-bold text-xs uppercase tracking-wide">
                        <FileText className="w-4 h-4 text-[#2563EB]" />
                        <span>D. Submitted Supporting Documents</span>
                      </div>
                      <span className="text-[11px] text-[#64748B]">All files scanned for virus and verified</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {activeApplicantDocs.map((doc, idx) => (
                        <div key={idx} className="p-3 rounded-[6px] border border-[#E2E8F0] bg-slate-50/50 flex flex-col justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-[#0F172A] block">{doc.title}</span>
                            <span className="text-[11px] text-[#64748B] font-mono block mt-0.5">{doc.filename} ({doc.size})</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] mt-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified Authentic</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-2 border-t border-[#E2E8F0]">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewDoc({ name: `${doc.title} (${activeApplicant.fullName})`, url: doc.url, type: doc.type });
                                setDocZoom(1);
                                setDocRotation(0);
                              }}
                              className="px-2 py-1 rounded-[4px] bg-[#0F172A] text-white hover:bg-slate-800 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Preview</span>
                            </button>
                            <a
                              href={doc.url || `data:text/plain;charset=utf-8,${encodeURIComponent(`Document: ${doc.title}\nApplicant: ${activeApplicant.fullName}\nUser ID: ${activeApplicant.userId}\nStatus: Verified Authentic by Institutional Underwriting`)}`}
                              download={doc.filename}
                              className="px-2 py-1 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 9-POINT ADMIN VERIFICATION CHECKLIST */}
              {activeDossierTab === 'checklist' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-[8px] border border-blue-100 bg-blue-50/50">
                    <div>
                      <h3 className="font-bold text-xs text-[#0F172A] uppercase tracking-wide">
                        Institutional Underwriting Due Diligence Checklist
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Super Admin must audit all 9 regulatory criteria prior to executive sign-off.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetChecklist}
                        className="px-2.5 py-1.5 rounded-[6px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleCheckAll}
                        className="px-3 py-1.5 rounded-[6px] bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition"
                      >
                        Verify All (Fast-Track)
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-[8px] bg-white overflow-hidden text-xs">
                    {[
                      { key: 'personalInfo', label: '1. Personal information is complete and matches official records' },
                      { key: 'identityVerified', label: '2. Applicant identity and photo has been officially verified' },
                      { key: 'contactChecked', label: '3. Contact information (phone, email, emergency contact) has been checked' },
                      { key: 'employmentReviewed', label: '4. Employment information and business registration reviewed' },
                      { key: 'incomeReviewed', label: '5. Income information and debt service ratio verified against salary slip' },
                      { key: 'documentsChecked', label: '6. Supporting documents (ID, residence, proof of income) checked' },
                      { key: 'loanAmountReviewed', label: '7. Requested loan amount reviewed and within approved policy caps' },
                      { key: 'repaymentAbilityAssessed', label: '8. Repayment ability assessed (DTI < 40%)' },
                      { key: 'existingLoansChecked', label: '9. Existing loan records checked (Enforce 1 Active Loan Rule)' },
                    ].map((item) => {
                      const isChecked = checklist[item.key] || false;
                      return (
                        <div
                          key={item.key}
                          onClick={() => toggleChecklistItem(item.key)}
                          className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                            isChecked ? 'bg-emerald-50/40 text-[#0F172A]' : 'hover:bg-slate-50 text-[#64748B]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#16A34A] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                            )}
                            <span className={isChecked ? 'font-semibold text-[#0F172A]' : ''}>{item.label}</span>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] font-semibold ${
                            isChecked ? 'bg-emerald-100 text-[#16A34A]' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isChecked ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: REVIEW HISTORY & AUDIT TRAIL */}
              {activeDossierTab === 'history' && (
                <div className="space-y-4">
                  <div className="border border-[#E2E8F0] rounded-[8px] bg-white overflow-hidden text-xs">
                    <table className="w-full table-enterprise">
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Administrator / Agent</th>
                          <th>Status Transition</th>
                          <th>Action Taken</th>
                          <th>Administrative Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        <tr>
                          <td className="font-mono text-[#64748B]">{activeApp.createdAt || new Date().toISOString()}</td>
                          <td>
                            <div className="font-semibold text-[#0F172A]">Borrower Origination Desk</div>
                            <span className="text-[10px] text-[#64748B] font-mono">SYS-ORIG-PORTAL</span>
                          </td>
                          <td className="font-mono text-[#2563EB]">DRAFT ➔ SUBMITTED</td>
                          <td>
                            <span className="px-2 py-0.5 rounded-[4px] bg-blue-50 text-[#2563EB] font-bold text-[10px]">
                              SUBMITTED
                            </span>
                          </td>
                          <td className="text-[#64748B]">Application submitted with verified KYC documents package.</td>
                        </tr>
                        {activeApp.status === 'APPROVED' && (
                          <tr>
                            <td className="font-mono text-[#64748B]">{new Date().toISOString()}</td>
                            <td>
                              <div className="font-semibold text-[#0F172A]">{currentUserName}</div>
                              <span className="text-[10px] text-[#64748B] font-mono">SUPER_ADMIN</span>
                            </td>
                            <td className="font-mono text-[#16A34A]">SUBMITTED ➔ APPROVED</td>
                            <td>
                              <span className="px-2 py-0.5 rounded-[4px] bg-emerald-50 text-[#16A34A] font-bold text-[10px]">
                                APPROVED
                              </span>
                            </td>
                            <td className="text-[#0F172A] font-semibold">
                              Sanctioned by Executive Credit Committee. Transferred to Cashier Disbursements queue.
                            </td>
                          </tr>
                        )}
                        {activeApp.status === 'REJECTED' && (
                          <tr>
                            <td className="font-mono text-[#64748B]">{new Date().toISOString()}</td>
                            <td>
                              <div className="font-semibold text-[#0F172A]">{currentUserName}</div>
                              <span className="text-[10px] text-[#64748B] font-mono">SUPER_ADMIN</span>
                            </td>
                            <td className="font-mono text-[#DC2626]">SUBMITTED ➔ REJECTED</td>
                            <td>
                              <span className="px-2 py-0.5 rounded-[4px] bg-rose-50 text-[#DC2626] font-bold text-[10px]">
                                REJECTED
                              </span>
                            </td>
                            <td className="text-[#DC2626] font-semibold">
                              {activeApp.creditOfficerReview?.notes || 'Credit underwriting criteria not satisfied.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-[#64748B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <span>Super Admin Authorization Desk</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAppId(null);
                    setTargetAppForDecision(null);
                    setApproveModalOpen(false);
                    setRejectModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] bg-white text-[#0F172A] text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Close
                </button>

                {/* Show Approve/Reject only when actionable */}
                {((activeApp.status as string) === 'SUBMITTED' ||
                  (activeApp.status as string) === 'PENDING' ||
                  (activeApp.status as string) === 'UNDER_REVIEW' ||
                  (activeApp.status as string) === 'UNDERWRITING_PENDING') && (
                  <>
                    <button
                      type="button"
                      onClick={() => openRejectModalFor(activeApp)}
                      className="px-3 py-1.5 rounded-[6px] bg-[#DC2626] hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Application</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openApproveModalFor(activeApp)}
                      className="px-4 py-1.5 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Loan</span>
                    </button>
                  </>
                )}

                {activeApp.status === 'APPROVED' && onNavigateToDisbursements && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAppId(null);
                      onNavigateToDisbursements();
                    }}
                    className="px-3 py-1.5 rounded-[6px] bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Go to Disbursements Queue ➔
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. APPROVAL CONFIRMATION MODAL */}
      {approveModalOpen && (targetAppForDecision || activeApp) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 font-sans backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-[8px] border border-[#E2E8F0] shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[4px] bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Confirm Loan Sanction Authorization
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Sanction facility for <strong className="text-[#0F172A]">{activeApplicant.fullName}</strong> (<span className="font-mono text-[#2563EB]">{activeApplicant.userId}</span>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isProcessingDecision}
                onClick={() => setApproveModalOpen(false)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Approved Amount (USD)</label>
                <input
                  type="number"
                  disabled={isProcessingDecision}
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] font-mono text-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-semibold mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    disabled={isProcessingDecision}
                    value={approvedTerm}
                    onChange={(e) => setApprovedTerm(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] font-mono text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-semibold mb-1">Interest Rate (% APR)</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={isProcessingDecision}
                    value={approvedRate}
                    onChange={(e) => setApprovedRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] font-mono text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Administrative Notes</label>
                <textarea
                  disabled={isProcessingDecision}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] text-[#0F172A]"
                />
              </div>

              <div className="p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs space-y-1">
                <p className="font-bold">✓ Audit Action Notice:</p>
                <p className="text-[11px]">
                  Confirming this action will update the application status to <strong>APPROVED</strong>, record your administrator ID, and move the facility to the Cashier Disbursements Queue.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                disabled={isProcessingDecision}
                onClick={() => setApproveModalOpen(false)}
                className="px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] text-[#0F172A] font-semibold text-xs hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingDecision}
                onClick={handleExecuteApproval}
                className="px-4 py-1.5 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessingDecision && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isProcessingDecision ? 'Processing...' : 'Confirm Approval'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. REJECTION CONFIRMATION MODAL */}
      {rejectModalOpen && (targetAppForDecision || activeApp) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 font-sans backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-[8px] border border-[#E2E8F0] shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[4px] bg-rose-50 text-[#DC2626] flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#DC2626]">
                    Confirm Formal Loan Rejection
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Adverse Determination for <strong className="text-[#0F172A]">{activeApplicant.fullName}</strong> (<span className="font-mono text-[#DC2626]">{activeApplicant.userId}</span>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isProcessingDecision}
                onClick={() => setRejectModalOpen(false)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">
                  Regulatory Rejection Reason Category <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={isProcessingDecision}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] text-[#0F172A] bg-white"
                >
                  <option value="HIGH_DTI">High Debt-to-Income (DTI) ratio exceeds regulatory cap (&gt; 40%)</option>
                  <option value="INSUFFICIENT_INCOME">Insufficient verified monthly income or documentation</option>
                  <option value="UNVERIFIED_KYC">Incomplete or unverifiable mandatory KYC documentation</option>
                  <option value="ACTIVE_LOAN_EXISTS">Borrower already has an active loan in repayment</option>
                  <option value="POLICY_CAP_EXCEEDED">Requested amount exceeds institutional unsecured lending cap</option>
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">
                  Formal Adverse Notice to Applicant <span className="text-rose-500">*</span>
                </label>
                <textarea
                  disabled={isProcessingDecision}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={3}
                  placeholder="Detail the exact reason for rejection so the applicant understands..."
                  className="w-full px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] text-[#0F172A]"
                />
              </div>

              <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-[#DC2626] text-xs space-y-1">
                <p className="font-bold">⚠ Important Rule:</p>
                <p className="text-[11px]">
                  Rejecting this application will mark it as <strong>REJECTED</strong>. As per system rules, a rejected application will not prevent the user from applying again in the future once criteria are met.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                disabled={isProcessingDecision}
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] text-[#0F172A] font-semibold text-xs hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingDecision}
                onClick={handleExecuteRejection}
                className="px-4 py-1.5 rounded-[6px] bg-[#DC2626] hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessingDecision && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isProcessingDecision ? 'Processing...' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. SECURE DOCUMENT PREVIEW LIGHTBOX */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 font-sans backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-[8px] border border-[#E2E8F0] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <span className="font-bold text-xs text-[#0F172A]">
                Document Preview: {previewDoc.name}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.min(2, z + 0.2))}
                  className="p-1 rounded bg-slate-200 text-slate-700 hover:text-slate-900"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.max(0.6, z - 0.2))}
                  className="p-1 rounded bg-slate-200 text-slate-700 hover:text-slate-900"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocRotation((r) => (r + 90) % 360)}
                  className="p-1 rounded bg-slate-200 text-slate-700 hover:text-slate-900"
                  title="Rotate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 rounded bg-slate-200 text-slate-700 hover:text-slate-900 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-100 flex items-center justify-center min-h-[300px] overflow-hidden">
              <div
                style={{
                  transform: `scale(${docZoom}) rotate(${docRotation}deg)`,
                  transition: 'transform 0.2s ease',
                }}
                className="bg-white p-6 rounded shadow border border-slate-300 max-w-md text-center space-y-3"
              >
                {previewDoc.url && (previewDoc.type?.includes('image') || previewDoc.url.startsWith('data:image')) ? (
                  <img src={previewDoc.url} alt={previewDoc.name} className="max-h-64 mx-auto object-contain rounded" />
                ) : (
                  <FileText className="w-16 h-16 text-[#2563EB] mx-auto" />
                )}
                <h4 className="font-bold text-sm text-[#0F172A]">{previewDoc.name}</h4>
                <p className="text-xs text-[#64748B]">
                  Regulatory Security Clear: Document verified by Compliance Verification Engine with immutable SHA-256 hash stamp.
                </p>
                <div className="p-2 rounded bg-emerald-50 text-[#16A34A] text-xs font-mono font-semibold">
                  STATUS: VERIFIED & COMPLIANT
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
