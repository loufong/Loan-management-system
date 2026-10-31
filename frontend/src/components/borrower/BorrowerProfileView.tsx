import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  FileCheck,
  Award,
  TrendingUp,
  Download,
  Eye,
  X,
  ExternalLink,
  Landmark,
  BadgeCheck,
  Lock,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export interface BorrowerProfileViewProps {
  currentUser: UserProfile;
  currency: Currency;
  onNavigate: (route: string) => void;
}

export const BorrowerProfileView: React.FC<BorrowerProfileViewProps> = ({
  currentUser,
  currency: appCurrency,
  onNavigate,
}) => {
  const { language } = useLanguage();
  const isKhmer = language === 'km' || (language as string) === 'KH';

  const [activeCurrency, setActiveCurrency] = useState<Currency>(appCurrency || 'USD');
  const [selectedDocPreview, setSelectedDocPreview] = useState<string | null>(null);

  const NBC_RATE = 4080;

  const formatMoney = (valUSD: number) => {
    if (activeCurrency === 'KHR') {
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0,
      }).format(valUSD * NBC_RATE);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(valUSD);
  };

  const displayName = currentUser?.fullName || currentUser?.name || 'Johnathan Doe';
  const clientId = currentUser?.borrowerId || 'BOR-2026-8801';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION & IDENTITY CARD                                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        <div>
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <span className="text-slate-500 font-medium">Core Banking</span>
            <span>/</span>
            <span className="font-bold text-emerald-400 uppercase tracking-wider">
              {'My Profile'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {'Borrower KYC Dossier & Credit Profile'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official verified borrower identity records compliant with Credit Bureau Cambodia (CBC) institutional requirements.
          </p>
        </div>

        {/* User Identity Header Card */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Real Photograph KYC Avatar with Verified Ring */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-950/50">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
                  alt={displayName}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
                ✓
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {displayName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Borrower
                </span>
              </div>

              <p className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <span>Client ID: <strong className="text-white">{clientId}</strong></span>
                <span>•</span>
                <span className="text-slate-400">NBC Regulatory Status: <strong className="text-emerald-400">Class 1 Good Standing</strong></span>
              </p>
              <p className="text-[11px] text-slate-500">
                Member of Jam Song Vich Microfinance Institution since March 2025
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-white font-semibold text-xs border border-slate-700 transition"
            >
              Account Preferences
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md shadow-emerald-500/20"
            >
              Print Dossier
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INFORMATION GRID (3 SUB-SECTIONS)                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Personal & Contact Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              1. Personal & Contact Details
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Full Legal Name</span>
              <p className="text-sm font-bold text-white font-sans">Johnathan Doe</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">National ID Card Number</span>
              <p className="text-sm font-mono font-bold text-slate-200">010••••89</p>
              <span className="text-[10px] text-emerald-400 font-mono">● Verified with Ministry of Interior</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Primary Phone (Bakong Linked)</span>
              <p className="text-sm font-mono font-bold text-slate-200">+855 12 ••• 789</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Residential Address</span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                No. 42, St. 315, Sangkat Boeng Kak II, Khan Toul Kork, Phnom Penh, Cambodia
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Credit Scoring */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Award className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              2. Financial & Credit Scoring
            </h3>
          </div>

          <div className="space-y-4">
            {/* Credit Bureau Cambodia (CBC) Score Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Credit Bureau Cambodia (CBC)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Grade A Prime
                </span>
              </div>

              {/* Gauge Score Display */}
              <div className="text-center py-2">
                <p className="text-3xl font-black font-mono text-emerald-400">
                  745 <span className="text-sm text-slate-500 font-normal">/ 850</span>
                </p>
                <p className="text-xs text-white font-semibold mt-1">Excellent Repayment Track Record</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Zero defaults across 36 historical cycles</p>
              </div>

              {/* Gauge Scale Bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                <div className="h-full bg-rose-500 w-[20%]" title="Poor (< 550)" />
                <div className="h-full bg-amber-500 w-[25%]" title="Fair (550 - 650)" />
                <div className="h-full bg-teal-500 w-[25%]" title="Good (650 - 720)" />
                <div className="h-full bg-emerald-500 w-[30%]" title="Prime (720 - 850)" />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>300 (Subprime)</span>
                <span>850 (Prime)</span>
              </div>
            </div>

            {/* Active Borrowing Limit Ceiling Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                Active Approved Borrowing Limit
              </span>
              <p className="text-xl font-mono font-black text-white">
                {formatMoney(15000.0)} <span className="text-xs font-normal text-slate-400">Available</span>
              </p>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Drawn: $6,000.00</span>
                <span>Ceiling: $20,000.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Linked Settlement Accounts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Landmark className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              3. Linked Settlement Accounts
            </h3>
          </div>

          <div className="space-y-3">
            {/* Account 1: ACLEDA */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                    AC
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">ACLEDA Bank Plc.</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Account: •••• 2023</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PRIMARY
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Designated direct disbursement destination and automated debit clearing account.
              </p>
            </div>

            {/* Account 2: Bakong */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-red-600 text-white font-black text-[9px] flex items-center justify-center">
                    KH
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">NBC Bakong Wallet</h4>
                    <span className="text-[10px] text-slate-400 font-mono">jamsongvich@nbc</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-800 text-slate-300">
                  INSTANT
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Connected for instant KHQR generation and push payment confirmations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KYC DOCUMENTS ATTACHED                                                 */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Verified Regulatory KYC Documents
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            3 of 3 Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: 'National ID Card (Front & Back)',
              docId: 'NID-KH-010992384',
              file: 'national_id_verified.pdf',
              date: 'Verified 2026-03-12',
            },
            {
              title: 'Proof of Residence (Family Book / Soft Title)',
              docId: 'RES-PP-99401',
              file: 'soft_title_card_khan_toul_kork.pdf',
              date: 'Verified 2026-03-12',
            },
            {
              title: 'Employment & Income Contract',
              docId: 'EMP-CORP-2026',
              file: 'employment_contract_senior_dev.pdf',
              date: 'Verified 2026-03-14',
            },
          ].map((doc, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-750 transition flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    VERIFIED
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">{doc.docId}</span>
                </div>
                <h4 className="text-xs font-bold text-white pt-1">{doc.title}</h4>
                <p className="text-[11px] text-slate-400 font-mono truncate">{doc.file}</p>
                <p className="text-[10px] text-slate-500">{doc.date}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocPreview(doc.title)}
                className="mt-3 w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>View Document</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Document Preview */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setSelectedDocPreview(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">{selectedDocPreview}</h3>
            </div>

            <div className="p-8 rounded-xl bg-slate-950 border border-slate-850 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-xs text-white font-bold">Encrypted KYC Document Storage</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                This document is digitally watermarked, encrypted with AES-256 GCM, and held in compliance with National Bank of Cambodia regulatory retention standards.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDocPreview(null)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowerProfileView;

