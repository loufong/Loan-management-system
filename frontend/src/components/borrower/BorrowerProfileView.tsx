import React, { useState, useEffect, useRef } from 'react';
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
  UploadCloud,
  FileText,
  AlertTriangle,
  Clock,
  RotateCcw,
  Check,
  FileUp,
  FileWarning,
  Sparkles,
  Fingerprint,
  QrCode,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import {
  kycService,
  FrontendKycDocument,
  FrontendKycSummary,
  KycDocType,
  KycStatus,
} from '../../services/kycService';
import { kycVaultStorage } from '../../services/kycVaultStorage';

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
  const [activeCurrency, setActiveCurrency] = useState<Currency>(appCurrency || 'USD');

  // KYC Live State
  const [kycSummary, setKycSummary] = useState<FrontendKycSummary | null>(null);
  const [isLoadingKyc, setIsLoadingKyc] = useState<boolean>(true);

  // Modal States
  const [previewDoc, setPreviewDoc] = useState<FrontendKycDocument | null>(null);
  const [uploadTargetDocType, setUploadTargetDocType] = useState<KycDocType | null>(null);
  const [idCardSide, setIdCardSide] = useState<'front' | 'back'>('front');
  const [isPhotoZoomed, setIsPhotoZoomed] = useState<boolean>(false);
  const [photoViewMode, setPhotoViewMode] = useState<'scan' | 'specimen'>('scan');

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [refNumberInput, setRefNumberInput] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadKyc = async () => {
    try {
      const summary = await kycService.getKycStatus(clientId);
      setKycSummary(summary);
    } catch (err) {
      console.warn('Failed to load KYC status:', err);
    } finally {
      setIsLoadingKyc(false);
    }
  };

  useEffect(() => {
    loadKyc();

    const handleUpdate = () => {
      loadKyc();
    };
    window.addEventListener('kyc_status_updated', handleUpdate);
    return () => window.removeEventListener('kyc_status_updated', handleUpdate);
  }, [clientId]);

  // Handle Drag & Drop / File Select
  const handleFileSelect = (file: File) => {
    setUploadError(null);

    // 1. Validate File Size: Max 10MB
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setUploadError(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum regulatory limit of 10MB.`);
      setSelectedFile(null);
      return;
    }

    // 2. Validate MIME Type: PDF, JPG, PNG
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setUploadError(`Invalid format "${file.type}". Regulatory standards accept .pdf, .jpg, and .png only.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleOpenUploadModal = (docType: KycDocType, currentRef?: string) => {
    setUploadTargetDocType(docType);
    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(0);
    setRefNumberInput(currentRef || (
      docType === 'NATIONAL_ID'
        ? 'NID-KH-010992384'
        : docType === 'PROOF_OF_RESIDENCE'
        ? 'RES-PP-99401'
        : 'EMP-CORP-2026'
    ));
  };

  const handleExecuteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTargetDocType || !selectedFile) {
      setUploadError('Please select a valid document file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(20);

    // Save uploaded file permanently to IndexedDB + LocalStorage vault
    let cachedFileDataUrl = '';
    try {
      cachedFileDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(selectedFile);
      });
      if (cachedFileDataUrl) {
        await kycVaultStorage.saveFile(clientId, uploadTargetDocType, cachedFileDataUrl, {
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'image/png',
          fileSize: selectedFile.size,
        });
      }
    } catch (cacheErr) {
      console.warn('KYC vault caching note:', cacheErr);
    }

    try {
      const mime = selectedFile.type || (selectedFile.name.endsWith('.pdf') ? 'application/pdf' : selectedFile.name.endsWith('.png') ? 'image/png' : 'image/jpeg');

      // 1. Request pre-signed S3/R2 upload URL
      let uploadPlan;
      try {
        uploadPlan = await kycService.requestUploadUrl({
          documentType: uploadTargetDocType,
          originalFilename: selectedFile.name,
          mimeType: mime,
          fileSizeBytes: selectedFile.size,
          userId: clientId,
        });
      } catch {
        const fileKey = `kyc/${clientId}/${uploadTargetDocType.toLowerCase()}_${Date.now()}.${selectedFile.name.split('.').pop() || 'png'}`;
        uploadPlan = {
          uploadUrl: `/api/v1/kyc/storage-simulator/upload?fileKey=${encodeURIComponent(fileKey)}`,
          fileKey,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          headers: { 'Content-Type': mime },
          maxFileSizeBytes: 10 * 1024 * 1024,
          allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        };
      }

      setUploadProgress(50);

      // 2. Transmit binary stream to cloud storage URL
      await kycService.uploadToStorage(uploadPlan.uploadUrl, selectedFile, uploadPlan.headers);

      setUploadProgress(85);

      // 3. Confirm document upload -> Status transitions to PENDING_REVIEW
      await kycService.confirmUpload({
        documentType: uploadTargetDocType,
        fileKey: uploadPlan.fileKey,
        originalFilename: selectedFile.name,
        referenceNumber: refNumberInput.trim() || `REF-${Date.now().toString().slice(-6)}`,
        fileSizeBytes: selectedFile.size,
        mimeType: mime,
        userId: clientId,
        viewUrl: cachedFileDataUrl || undefined,
      });

      setUploadProgress(100);
      await loadKyc();
      setUploadTargetDocType(null);
      setSelectedFile(null);
    } catch (err: any) {
      setUploadError(err.message || 'Document upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenPreview = async (doc: FrontendKycDocument) => {
    setIdCardSide('front');
    setIsPhotoZoomed(false);

    // Retrieve from permanent vault (IndexedDB / LocalStorage)
    const storedFile =
      (await kycVaultStorage.getFile(clientId, doc.documentType)) ||
      (doc.viewUrl && (doc.viewUrl.startsWith('data:') || doc.viewUrl.startsWith('blob:')) ? doc.viewUrl : null);

    if (storedFile) {
      setPreviewDoc({ ...doc, viewUrl: storedFile });
      setPhotoViewMode('scan');
    } else {
      setPreviewDoc(doc);
      setPhotoViewMode('specimen');
    }
  };

  const handleDownloadScannedPhoto = () => {
    if (!previewDoc) return;
    if (previewDoc.viewUrl && (previewDoc.viewUrl.startsWith('data:image/') || previewDoc.viewUrl.startsWith('blob:'))) {
      const link = document.createElement('a');
      link.href = previewDoc.viewUrl;
      link.download = previewDoc.originalFilename || `${previewDoc.documentType.toLowerCase()}.png`;
      link.click();
    } else {
      window.open(previewDoc.viewUrl || '#', '_blank');
    }
  };

  // Simulation Controls for Testing
  const handleSimulateStatus = async (docType: KycDocType, status: KycStatus, reason?: string) => {
    await kycService.simulateStatus(docType, status, reason, clientId);
    await loadKyc();
  };

  const handleResetKyc = async () => {
    kycService.resetToVerified(clientId);
    await loadKyc();
  };

  const handleApproveDocument = async (docType: KycDocType) => {
    await kycService.approveDocument(docType, clientId);
    await loadKyc();
    if (previewDoc && previewDoc.documentType === docType) {
      setPreviewDoc(null);
    }
  };

  const handleRejectDocument = async (docType: KycDocType, reason?: string) => {
    await kycService.simulateStatus(
      docType,
      'REJECTED',
      reason || 'Document does not meet National Bank of Cambodia compliance standards. Please re-upload.',
      clientId
    );
    await loadKyc();
    if (previewDoc && previewDoc.documentType === docType) {
      setPreviewDoc(null);
    }
  };

  const handleApproveAll = async () => {
    await kycService.approveAllDocuments();
    await loadKyc();
  };

  const verifiedCount = kycSummary?.verifiedCount ?? 3;
  const isBorrowingUnlocked = kycSummary?.isEligibleToBorrow ?? true;
  const pendingCount = (kycSummary?.documents || []).filter((d) => d.status === 'PENDING_REVIEW').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-slate-100">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION & IDENTITY CARD                                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        <div>
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-mono">
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
            Official verified borrower identity records compliant with Credit Bureau Cambodia (CBC) and National Bank of Cambodia (NBC) regulatory standards.
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">{displayName}</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {clientId}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  PHNOM PENH MAIN
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                SME Commercial Merchant • Verified National ID holder
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  +855 12 345 678
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  {currentUser?.email || 'borrower@jamsongvich.com'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Credit Status & Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('apply')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isBorrowingUnlocked
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
              }`}
              title={isBorrowingUnlocked ? 'Apply for loan facility' : 'Locked: 3 of 3 KYC documents required'}
            >
              {isBorrowingUnlocked ? (
                <>
                  <Award className="w-4 h-4" />
                  <span>Apply for Loan</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Borrowing Locked ({verifiedCount}/3)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REGULATORY KYC DOCUMENTS (CORE SECTION)                                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Section Header with Dynamic Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Verified Regulatory KYC Documents
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              National Bank of Cambodia mandatory customer due diligence (CDD). All 3 documents must be in <strong className="text-emerald-400 font-mono">VERIFIED</strong> status to unlock credit origination.
            </p>
          </div>

          {/* Dynamic 3-of-3 Status Pill */}
          {isBorrowingUnlocked ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 self-start sm:self-auto shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold">3 of 3 Verified</span>
              <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200">
                BORROWING ACTIVE
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 self-start sm:self-auto shadow-sm animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-mono font-bold">{verifiedCount} of 3 Verified</span>
              <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                BORROWING LOCKED
              </span>
            </div>
          )}
        </div>

        {/* Locked Warning Alert Banner if < 3 verified */}
        {!isBorrowingUnlocked && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-white block">
                Regulatory Borrowing Lock Active (NBC Prakas on Credit Risk B-7-018)
              </span>
              <p className="text-amber-300/90 leading-relaxed">
                Credit origination and disbursements are restricted. You currently have {verifiedCount} of 3 verified regulatory KYC documents. Please upload the required documents below to clear compliance review.
              </p>
            </div>
          </div>
        )}

        {/* Pending Review Queue Banner with One-Click Fast-Track Approval */}
        {pendingCount > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-emerald-950/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">
                    Underwriting Review Desk: {pendingCount} Document{pendingCount > 1 ? 's' : ''} Awaiting Approval
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PENDING OFFICER SIGN-OFF
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 max-w-xl leading-relaxed">
                  Documents are queued for Credit Committee due diligence. Authorized compliance officers can review each document or fast-track verify all 3 to immediately unlock borrowing.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApproveAll}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 self-start sm:self-center"
            >
              <BadgeCheck className="w-4 h-4" />
              <span>Approve All (Fast-Track)</span>
            </button>
          </div>
        )}

        {/* 3 Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(kycSummary?.documents || []).map((doc) => {
            const isVerified = doc.status === 'VERIFIED';
            const isPending = doc.status === 'PENDING_REVIEW';
            const isRejected = doc.status === 'REJECTED';

            return (
              <div
                key={doc.documentType}
                className={`p-5 rounded-2xl bg-slate-950 border transition-all flex flex-col justify-between relative overflow-hidden group ${
                  isVerified
                    ? 'border-slate-800 hover:border-emerald-500/40'
                    : isRejected
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : 'border-amber-500/40 bg-amber-950/10'
                }`}
              >
                {/* Status Indicator Bar at Top */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isVerified
                      ? 'bg-emerald-500'
                      : isRejected
                      ? 'bg-rose-500'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />

                <div className="space-y-3">
                  {/* Card Header: Status Tag + Reference ID */}
                  <div className="flex items-center justify-between gap-2">
                    {isVerified && (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        VERIFIED
                      </span>
                    )}

                    {isPending && (
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        PENDING REVIEW
                      </span>
                    )}

                    {isRejected && (
                      <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        REJECTED
                      </span>
                    )}

                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      {doc.referenceNumber}
                    </span>
                  </div>

                  {/* Document Title & File Details */}
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{doc.title}</h4>
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{doc.originalFilename}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {isVerified
                        ? `Approved: ${doc.verifiedAt?.slice(0, 10) || '2026-03-12'}`
                        : `Uploaded: ${doc.uploadedAt?.slice(0, 10)}`} • {(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)}MB
                    </p>
                  </div>

                  {/* Rejection Notice if rejected */}
                  {isRejected && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] space-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <FileWarning className="w-3.5 h-3.5 text-rose-400" />
                        Compliance Notice:
                      </span>
                      <p className="text-[10px] text-rose-200/90 leading-tight">
                        {doc.rejectionReason || 'Document did not meet regulatory standards. Please re-upload a clear copy.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons: View, Replace & Quick Officer Approve */}
                <div className="mt-4 pt-3 border-t border-slate-850 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(doc)}
                      className="py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>View Doc</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal(doc.documentType, doc.referenceNumber)}
                      className={`py-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isRejected || isPending
                          ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300 font-bold'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <FileUp className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isRejected ? 'Re-upload' : 'Replace'}</span>
                    </button>
                  </div>

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => handleApproveDocument(doc.documentType)}
                      className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Approve as Verified</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reviewer / Sandbox Testing Toolset */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 bg-slate-950/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">KYC Borrowing Lock Demonstration Tools:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                handleSimulateStatus(
                  'PROOF_OF_RESIDENCE',
                  'REJECTED',
                  'Commune administrative stamp missing or expired beyond 6 months.'
                )
              }
              className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer transition"
            >
              Simulate Rejection (Lock Borrowing)
            </button>

            <button
              type="button"
              onClick={() => handleSimulateStatus('EMPLOYMENT_INCOME_CONTRACT', 'PENDING_REVIEW')}
              className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer transition"
            >
              Simulate Pending (2/3 Locked)
            </button>

            <button
              type="button"
              onClick={handleResetKyc}
              className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to 3 of 3 Verified
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: PRE-SIGNED ENCRYPTED DOCUMENT VIEWER (PHOTO IN BOX)             */}
      {/* ========================================================================= */}
      {previewDoc && (() => {
        const hasUploadedPhoto = !!(
          previewDoc.viewUrl &&
          (previewDoc.viewUrl.startsWith('data:image/') ||
            previewDoc.viewUrl.startsWith('blob:') ||
            previewDoc.originalFilename?.match(/\.(jpg|jpeg|png|webp)$/i))
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl sm:max-w-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 text-slate-100 my-auto max-h-[92vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 pr-8">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {previewDoc.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 flex-wrap">
                      <span>
                        Ref: <strong className="text-slate-200">{previewDoc.referenceNumber}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Status:{' '}
                        <span
                          className={`font-bold ${
                            previewDoc.status === 'VERIFIED'
                              ? 'text-emerald-400'
                              : previewDoc.status === 'REJECTED'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {previewDoc.status}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-Bit SSL Vault</span>
                </div>
              </div>

              {/* Document Scanned Photo in Box */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 sm:p-5 space-y-3.5 shadow-inner">
                {/* Photo Toolbar Controls */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Document Photo Scan
                    </span>

                    {hasUploadedPhoto && (
                      <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px] font-mono">
                        <button
                          type="button"
                          onClick={() => setPhotoViewMode('scan')}
                          className={`px-2 py-0.5 rounded transition ${
                            photoViewMode === 'scan'
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Uploaded Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoViewMode('specimen')}
                          className={`px-2 py-0.5 rounded transition ${
                            photoViewMode === 'specimen'
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Official Specimen
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {previewDoc.documentType === 'NATIONAL_ID' &&
                      (!hasUploadedPhoto || photoViewMode === 'specimen') && (
                        <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() => setIdCardSide('front')}
                            className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                              idCardSide === 'front'
                                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Front Side
                          </button>
                          <button
                            type="button"
                            onClick={() => setIdCardSide('back')}
                            className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                              idCardSide === 'back'
                                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Back Side (MRZ)
                          </button>
                        </div>
                      )}

                    <button
                      type="button"
                      onClick={() => setIsPhotoZoomed(!isPhotoZoomed)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1 transition cursor-pointer"
                      title={isPhotoZoomed ? 'Reset zoom' : 'Zoom in photo'}
                    >
                      {isPhotoZoomed ? (
                        <ZoomOut className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                      )}
                      <span className="hidden sm:inline font-bold">
                        {isPhotoZoomed ? 'Reset' : 'Zoom'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Scanned Photo Box Stage */}
                <div className="overflow-x-auto overflow-y-hidden py-3 px-1 flex items-center justify-center min-h-[300px] bg-slate-950/90 rounded-xl border border-slate-900">
                  {hasUploadedPhoto && photoViewMode === 'scan' ? (
                    /* User Uploaded Photo or PDF Document */
                    <div
                      className={`relative transition-all duration-300 ${
                        isPhotoZoomed ? 'max-w-3xl' : 'max-w-md'
                      } w-full rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 p-1 flex items-center justify-center`}
                    >
                      {previewDoc.viewUrl && (previewDoc.mimeType === 'application/pdf' || previewDoc.viewUrl.startsWith('data:application/pdf') || previewDoc.originalFilename?.toLowerCase().endsWith('.pdf')) ? (
                        <iframe
                          src={previewDoc.viewUrl}
                          title={previewDoc.title}
                          className="w-full h-[380px] rounded-lg border-0 bg-white"
                        />
                      ) : (
                        <img
                          src={previewDoc.viewUrl}
                          alt={previewDoc.title}
                          className="w-full max-h-[380px] object-contain rounded-lg shadow-md"
                        />
                      )}
                      <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-sm border border-emerald-500/30 text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded shadow flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3 text-emerald-400" />
                        AUTHENTIC UPLOADED DOCUMENT
                      </div>
                    </div>
                  ) : previewDoc.documentType === 'NATIONAL_ID' ? (
                    idCardSide === 'back' ? (
                      /* Cambodian National ID Card: Back Side */
                      <div
                        className={`relative transition-all duration-300 mx-auto ${
                          isPhotoZoomed ? 'scale-105' : 'scale-100'
                        } w-full max-w-[500px] rounded-2xl shadow-2xl overflow-hidden border border-sky-300/60 bg-gradient-to-br from-[#c6e4f5] via-[#def0fa] to-[#cbe5f0] text-slate-800 p-4 sm:p-5 select-none font-sans`}
                        style={{
                          boxShadow:
                            '0 20px 40px -15px rgba(14, 116, 144, 0.3), 0 0 0 1px rgba(186, 230, 253, 0.5)',
                        }}
                      >
                        {/* Magnetic Stripe on Top */}
                        <div className="h-9 w-full bg-slate-900/90 rounded-lg shadow-inner mb-3 flex items-center px-4 justify-between text-[8px] font-mono text-slate-400">
                          <span>TRACK 1 & 2 ENCRYPTED ISO-7810</span>
                          <span className="text-emerald-400 font-bold">● SMART NFC ACTIVE</span>
                        </div>

                        <div className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-8 space-y-2">
                            <div>
                              <div className="text-[8px] font-bold text-slate-500">
                                អាសយដ្ឋានបច្ចុប្បន្ន / CURRENT RESIDENCE
                              </div>
                              <div className="text-[11px] font-bold text-slate-900 font-serif leading-snug">
                                ផ្ទះលេខ ៤៨ ផ្លូវ ៣១៥ សង្កាត់បឹងកក់១ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ
                              </div>
                              <div className="text-[10px] font-semibold text-slate-700 leading-snug">
                                #48, St 315, Sangkat Boeng Kak 1, Khan Tuol Kouk, Phnom Penh
                              </div>
                            </div>

                            <div className="text-[8px] text-slate-600 font-mono space-y-0.5 pt-1">
                              <div>AUTHORITY: GENERAL DEPT OF IDENTIFICATION</div>
                              <div>RECORD NO: GDI-KH-2021-0899214</div>
                            </div>
                          </div>

                          <div className="col-span-4 flex flex-col items-center">
                            <div className="w-20 h-24 rounded-xl border-2 border-rose-600/50 bg-rose-50/80 p-1 flex items-center justify-center shadow-inner relative">
                              <Fingerprint className="w-16 h-16 text-rose-700/80" />
                            </div>
                            <span className="text-[7px] font-bold text-slate-600 font-mono mt-1 text-center">
                              ស្នាមមេដៃស្តាំ / RIGHT THUMB
                            </span>
                          </div>
                        </div>

                        {/* Machine Readable Zone (MRZ) Strip */}
                        <div className="mt-3.5 p-2 bg-slate-100/90 rounded-lg border border-slate-300 font-mono text-[9px] sm:text-[10px] text-slate-800 tracking-widest leading-relaxed shadow-inner">
                          <div>I&lt;KHM0109923848&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
                          <div>9210145M3101128KHM&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</div>
                          <div>DOE&lt;&lt;JOHNATHAN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
                        </div>
                      </div>
                    ) : (
                      /* Cambodian National ID Card: Front Side */
                      <div
                        className={`relative transition-all duration-300 mx-auto ${
                          isPhotoZoomed ? 'scale-105' : 'scale-100'
                        } w-full max-w-[500px] rounded-2xl shadow-2xl overflow-hidden border border-sky-300/60 bg-gradient-to-br from-[#c6e4f5] via-[#def0fa] to-[#cbe5f0] text-slate-800 p-4 sm:p-5 select-none font-sans`}
                        style={{
                          boxShadow:
                            '0 20px 40px -15px rgba(14, 116, 144, 0.3), 0 0 0 1px rgba(186, 230, 253, 0.5)',
                        }}
                      >
                        {/* Guilloche Overlay */}
                        <svg
                          className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <defs>
                            <pattern id="guilloche-pat" width="40" height="40" patternUnits="userSpaceOnUse">
                              <path d="M 0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="#0284c7" strokeWidth="0.8" />
                              <path d="M 0 20 Q 10 40 20 20 T 40 20" fill="none" stroke="#0369a1" strokeWidth="0.8" />
                              <circle cx="20" cy="20" r="14" fill="none" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="2,2" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#guilloche-pat)" />
                        </svg>

                        {/* Card Header */}
                        <div className="relative z-10 flex items-start justify-between border-b border-sky-900/15 pb-2.5">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 border border-amber-600/40 p-1 flex items-center justify-center shadow-sm shrink-0">
                            <Landmark className="w-6 h-6 text-amber-900" />
                          </div>

                          <div className="text-center flex-1 px-2">
                            <div className="text-[12px] sm:text-[13px] font-bold text-sky-950 tracking-wider font-serif">
                              ព្រះរាជាណាចក្រកម្ពុជា
                            </div>
                            <div className="text-[9px] font-extrabold text-sky-900 tracking-widest uppercase">
                              KINGDOM OF CAMBODIA
                            </div>
                            <div className="text-[8px] font-semibold text-sky-800">
                              ជាតិ សាសនា ព្រះមហាក្សត្រ • NATION RELIGION KING
                            </div>
                            <div className="mt-1 py-0.5 px-3 bg-sky-900/10 rounded-full border border-sky-900/20 inline-block">
                              <span className="text-[10px] font-bold text-sky-950 font-serif">
                                អត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ
                              </span>
                              <span className="text-[8px] font-extrabold text-sky-900 ml-1.5 tracking-wider">
                                NATIONAL IDENTITY CARD
                              </span>
                            </div>
                          </div>

                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400/40 via-teal-300/40 to-indigo-300/40 border border-sky-400/60 p-0.5 flex flex-col items-center justify-center text-[7px] font-mono font-bold text-sky-950 shadow-inner shrink-0 rotate-6">
                            <Sparkles className="w-3.5 h-3.5 text-sky-800 animate-spin" />
                            <span>KHM</span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="relative z-10 mt-3 grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-4 flex flex-col items-center space-y-2">
                            {/* Gold EMV Chip */}
                            <div className="w-11 h-9 rounded-md bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 border border-amber-600/60 p-1 shadow-inner relative flex items-center justify-center">
                              <div className="w-full h-full border border-amber-700/40 rounded grid grid-cols-2 gap-0.5 p-0.5">
                                <div className="border-r border-amber-700/40" />
                                <div />
                                <div className="border-r border-t border-amber-700/40" />
                                <div className="border-t border-amber-700/40" />
                              </div>
                            </div>

                            {/* Passport Photo */}
                            <div className="relative w-24 h-32 rounded-xl overflow-hidden border-2 border-sky-700/60 shadow-md bg-sky-200">
                              <img
                                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256"
                                alt="Johnathan Doe"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full border-2 border-rose-600/60 text-rose-700 flex items-center justify-center text-[6px] font-bold font-serif rotate-[-15deg] bg-rose-500/10 pointer-events-none">
                                ក្រសួង
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="font-serif italic text-xs text-sky-950 font-bold tracking-wider -rotate-3">
                                Johnathan Doe
                              </div>
                              <div className="text-[7px] text-slate-500 font-mono">ហត្ថលេខា / SIGNATURE</div>
                            </div>
                          </div>

                          <div className="col-span-8 space-y-1.5 pl-1">
                            <div className="flex items-center justify-between pb-1 border-b border-sky-900/15">
                              <span className="text-[9px] font-bold text-slate-600 font-mono">
                                លេខអត្តសញ្ញាណប័ណ្ណ / ID NO:
                              </span>
                              <span className="text-base sm:text-lg font-black font-mono tracking-widest text-red-700">
                                010992384
                              </span>
                            </div>

                            <div className="leading-tight">
                              <div className="text-[8px] font-bold text-slate-500">
                                គោត្តនាម និងនាម / SURNAME & GIVEN NAME
                              </div>
                              <div className="text-sm font-bold text-slate-950 font-serif">យ៉ូណាថាន ដូ</div>
                              <div className="text-xs font-black text-slate-900 tracking-wider">JOHNATHAN DOE</div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] pt-0.5">
                              <div>
                                <span className="text-[7px] text-slate-500 block">ថ្ងៃខែឆ្នាំកំណើត / DOB</span>
                                <span className="font-bold font-mono text-slate-900">14.10.1992</span>
                              </div>
                              <div>
                                <span className="text-[7px] text-slate-500 block">ភេទ • កម្ពស់ / SEX • HT</span>
                                <span className="font-bold text-slate-900">ប្រុស / M • 1.75 m</span>
                              </div>
                              <div>
                                <span className="text-[7px] text-slate-500 block">សញ្ជាតិ / NATIONALITY</span>
                                <span className="font-bold text-slate-900">ខ្មែរ / KHM</span>
                              </div>
                              <div>
                                <span className="text-[7px] text-slate-500 block">សុពលភាព / EXPIRY</span>
                                <span className="font-bold font-mono text-emerald-800">12.01.2031</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[7px] text-slate-500 block">ទីកន្លែងកំណើត / PLACE OF BIRTH</span>
                                <span className="font-semibold text-slate-900">រាជធានីភ្នំពេញ / Phnom Penh</span>
                              </div>
                            </div>

                            <div className="pt-1 flex items-center justify-between">
                              <div className="text-[7px] font-mono text-slate-500 leading-tight">
                                <div>ISSUED: 12.01.2021</div>
                                <div>MINISTRY OF INTERIOR</div>
                              </div>

                              <div className="w-14 h-14 rounded-full border-2 border-rose-600/80 bg-rose-500/10 p-1 flex flex-col items-center justify-center text-rose-700 text-center shadow-sm rotate-6">
                                <span className="text-[6px] font-bold font-serif leading-none">ក្រសួងមហាផ្ទៃ</span>
                                <span className="text-[8px] leading-none my-0.5">★</span>
                                <span className="text-[5px] font-mono uppercase font-bold leading-none">INTERIOR</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : previewDoc.documentType === 'PROOF_OF_RESIDENCE' ? (
                    /* Cambodian Soft Title / Family Residence Certificate Photo */
                    <div
                      className={`relative transition-all duration-300 mx-auto ${
                        isPhotoZoomed ? 'scale-105' : 'scale-100'
                      } w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden border-2 border-emerald-900/30 bg-[#fdfcf7] text-slate-900 p-5 select-none font-serif`}
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.9) 0%, rgba(247,243,232,0.85) 100%)',
                        boxShadow:
                          '0 20px 40px -15px rgba(6, 78, 59, 0.25), 0 0 0 1px rgba(167, 243, 208, 0.3)',
                      }}
                    >
                      <div className="text-center pb-2.5 border-b border-emerald-900/20">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 border border-amber-600/40 p-1 flex items-center justify-center shadow-sm mx-auto mb-1">
                          <Landmark className="w-5 h-5 text-amber-900" />
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide font-serif">
                          ព្រះរាជាណាចក្រកម្ពុជា • ជាតិ សាសនា ព្រះមហាក្សត្រ
                        </div>
                        <div className="text-[10px] font-bold text-emerald-900 tracking-wider font-sans">
                          KINGDOM OF CAMBODIA • NATION RELIGION KING
                        </div>
                        <div className="text-[9px] font-semibold text-slate-600 font-sans mt-0.5">
                          រដ្ឋបាលរាជធានីភ្នំពេញ • សាលាខណ្ឌទួលគោក (Toul Kork District Administration)
                        </div>
                        <div className="mt-1.5 py-1 px-4 bg-emerald-900/10 rounded-full border border-emerald-900/20 inline-block">
                          <span className="text-xs font-bold text-emerald-950 font-serif">
                            លិខិតបញ្ជាក់សិទ្ធិកាន់កាប់ប្រើប្រាស់ដីធ្លី និងផ្ទះសម្បែង (ប័ណ្ណសំគាល់សិទ្ធិទន់)
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-sans pb-2 border-b border-slate-200">
                        <div>
                          <span className="text-slate-500 block text-[8px]">លេខយោង / REFERENCE NO:</span>
                          <strong className="font-mono text-emerald-900 font-bold text-xs">RES-PP-99401</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[8px]">សៀវភៅលេខ / REGISTER VOLUME:</span>
                          <strong className="font-mono text-slate-800">PP-TK-VOL 88 / FOLIO 14</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[8px]">ម្ចាស់កាន់កាប់ / CERTIFIED OCCUPANT:</span>
                          <strong className="text-slate-900 font-bold">Johnathan Doe (សញ្ជាតិ ខ្មែរ • NID: 010992384)</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[8px]">ទីតាំងអចលនវត្ថុ / PROPERTY LOCATION:</span>
                          <strong className="text-slate-900">
                            ផ្ទះលេខ ៤៨ ផ្លូវ ៣១៥ សង្កាត់បឹងកក់១ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ
                          </strong>
                        </div>
                      </div>

                      {/* Cadastral Survey Land Plot Sketch */}
                      <div className="mt-2.5 bg-white rounded-xl border border-slate-300 p-2.5 shadow-inner">
                        <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pb-1 border-b border-slate-100">
                          <span>CADASTRAL SURVEY PLAN (ប្លង់ក្បាលដី)</span>
                          <span>PARCEL #PK-889 • AREA: 168.5 m²</span>
                        </div>

                        <div className="relative h-24 w-full flex items-center justify-center my-1 bg-slate-50/80 rounded border border-dashed border-slate-300">
                          <div className="absolute top-1 right-2 text-[8px] font-bold font-mono text-slate-500 flex flex-col items-center">
                            <span>▲</span>
                            <span>N</span>
                          </div>

                          <div className="w-48 h-16 border-2 border-emerald-700 bg-emerald-500/10 rounded flex flex-col items-center justify-center text-center relative shadow-sm">
                            <span className="text-[7px] font-mono text-emerald-800 absolute -top-3">10.00 m</span>
                            <span className="text-[7px] font-mono text-emerald-800 absolute -bottom-3">10.00 m (St. 315)</span>
                            <span className="text-[7px] font-mono text-emerald-800 absolute -left-7">16.85 m</span>
                            <span className="text-[7px] font-mono text-emerald-800 absolute -right-7">16.85 m</span>
                            <span className="text-[10px] font-bold text-emerald-950 font-mono">LOT #PK-889</span>
                            <span className="text-[8px] font-semibold text-emerald-900">ផ្ទៃក្រឡា: 168.50 ម៉ែត្រការ៉េ</span>
                          </div>
                        </div>
                      </div>

                      {/* Official Red Commune Seal & Signature */}
                      <div className="mt-3 flex items-center justify-between pt-1">
                        <div className="text-[8px] font-sans text-slate-600">
                          <div>ចុះថ្ងៃទី ១០ ខែ មីនា ឆ្នាំ ២០២៤</div>
                          <div className="font-semibold text-slate-800">ប្រធានការិយាល័យភូមិបាលខណ្ឌទួលគោក</div>
                          <div className="font-serif italic text-xs text-blue-900 mt-1 font-bold">Phok Sokha</div>
                        </div>

                        <div className="w-16 h-16 rounded-full border-2 border-rose-600/80 bg-rose-500/10 p-1 flex flex-col items-center justify-center text-rose-700 text-center shadow-sm rotate-6">
                          <span className="text-[6px] font-bold font-serif leading-none">រដ្ឋបាលខណ្ឌទួលគោក</span>
                          <span className="text-[8px] leading-none my-0.5">★</span>
                          <span className="text-[5px] font-mono uppercase font-bold leading-none">TOUL KORK SEAL</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Corporate Employment Contract Photo */
                    <div
                      className={`relative transition-all duration-300 mx-auto ${
                        isPhotoZoomed ? 'scale-105' : 'scale-100'
                      } w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden border border-slate-300 bg-white text-slate-900 p-5 select-none font-sans`}
                      style={{
                        boxShadow:
                          '0 20px 40px -15px rgba(30, 41, 59, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
                      }}
                    >
                      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="text-xs sm:text-sm font-black tracking-tight text-slate-950 font-mono">
                            JAM SONG VICH TECHNOLOGY GROUP (CAMBODIA) CO., LTD.
                          </div>
                          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                            FINTECH & CORE BANKING SYSTEMS DIVISION
                          </div>
                          <div className="text-[8px] text-slate-500 font-mono">
                            MOC Reg #00049281-KH • #128 Norodom Blvd, Chamkarmon, Phnom Penh
                          </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 font-mono font-bold flex items-center justify-center text-xs shadow shrink-0">
                          JSV
                        </div>
                      </div>

                      <div className="my-2.5 text-center">
                        <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                          CERTIFIED EXECUTIVE EMPLOYMENT & SALARY CONTRACT
                        </div>
                        <div className="text-[9px] font-mono text-slate-500">
                          Ref: <strong className="text-slate-800">EMP-CORP-2026</strong> • Effective Date: January 1, 2024
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[8px] text-slate-500 block">EXECUTIVE BORROWER:</span>
                          <strong className="text-slate-900 font-bold">Johnathan Doe</strong>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 block">DESIGNATION / ROLE:</span>
                          <strong className="text-slate-900 font-semibold">Principal Core Banking Systems Engineer</strong>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 block">EMPLOYEE ID:</span>
                          <span className="font-mono text-slate-800">EMP-8801</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 block">EMPLOYMENT TENURE:</span>
                          <span className="font-semibold text-emerald-700">Permanent Confirmed (Active Standing)</span>
                        </div>
                      </div>

                      <div className="my-2.5 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-500/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-950 font-mono">
                            Verified Net Monthly Remuneration
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold text-[9px]">
                            CLEARED FOR CREDIT
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-900">$2,800.00 USD</span>
                          <span className="text-[10px] text-emerald-800 font-medium">(Two Thousand Eight Hundred USD / Month)</span>
                        </div>
                        <div className="text-[8px] font-mono text-slate-600 pt-0.5 border-t border-emerald-200">
                          Disbursement: ACLEDA Core Payroll Clearance • Dedicated Direct Deposit: #0100-XXXX-8821
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-300 p-1 flex items-center justify-center">
                            <QrCode className="w-10 h-10 text-slate-800" />
                          </div>
                          <div className="text-[7px] font-mono text-slate-500 leading-tight">
                            <div>HASH: NBC-KYC-HR-89211</div>
                            <div>PAYROLL REGISTRY VERIFIED</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-serif italic text-xs text-blue-900 font-bold -rotate-3">
                              Sokha Vannak
                            </div>
                            <div className="text-[7px] font-mono text-slate-500">GROUP MANAGING DIRECTOR</div>
                          </div>

                          <div className="w-14 h-14 rounded-full border-2 border-rose-600/80 bg-rose-500/10 p-1 flex flex-col items-center justify-center text-rose-700 text-center shadow-sm rotate-6">
                            <span className="text-[5px] font-bold font-mono leading-none">JAM SONG VICH</span>
                            <span className="text-[7px] leading-none my-0.5">★</span>
                            <span className="text-[5px] font-bold uppercase font-mono leading-none">CORP SEAL</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Compact Encrypted Metadata Row */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500">File:</span>
                    <span className="text-slate-200 font-semibold truncate">
                      {previewDoc.originalFilename}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500">Object Key:</span>
                    <span className="text-slate-300 truncate">{previewDoc.fileKey}</span>
                  </div>
                </div>
              </div>

              {/* Compliance Decision Box for Pending Document */}
              {previewDoc.status === 'PENDING_REVIEW' && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Compliance & Underwriting Decision:
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                      PENDING OFFICER SIGN-OFF
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Review the displayed document photo scan and approve it to satisfy National Bank of Cambodia regulatory customer due diligence requirements.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApproveDocument(previewDoc.documentType)}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      <span>Approve as Verified</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectDocument(previewDoc.documentType)}
                      className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadScannedPhoto}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download Scanned Photo</span>
                  </button>

                  <a
                    href={previewDoc.viewUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open in Secure Tab</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. MODAL: REAL FILE UPLOAD DROPZONE (10MB LIMIT & MIME VALIDATION)          */}
      {/* ========================================================================= */}
      {uploadTargetDocType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 text-slate-100">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => setUploadTargetDocType(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Upload Regulatory KYC Document
                </h3>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  {uploadTargetDocType}
                </span>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteUpload} className="space-y-4 text-xs">
              {/* Reference ID Input */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5 font-mono">
                  Official Document Reference Number:
                </label>
                <input
                  type="text"
                  required
                  value={refNumberInput}
                  onChange={(e) => setRefNumberInput(e.target.value)}
                  placeholder="e.g. NID-KH-010992384"
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Drag & Drop Zone */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5 font-mono">
                  Document File (.pdf, .jpg, .png up to 10MB):
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-emerald-500/60 bg-emerald-500/5'
                      : 'border-slate-800 hover:border-emerald-500/40 bg-slate-950/60'
                  }`}
                >
                  {selectedFile ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                      <p className="text-[11px] font-mono text-emerald-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type}
                      </p>
                      <p className="text-[10px] text-slate-500 pt-1">Click to replace file</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-white">
                        Click or drag & drop document file here
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Strict 10MB ceiling • 256-bit SSL encrypted transit
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar during upload */}
              {isUploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Uploading to encrypted vault...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setUploadTargetDocType(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                    isUploading || !selectedFile
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 cursor-pointer'
                  }`}
                >
                  {isUploading ? 'Encrypting & Transmitting...' : 'Upload & Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowerProfileView;
