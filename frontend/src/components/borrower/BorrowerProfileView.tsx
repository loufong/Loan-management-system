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
  RefreshCw,
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
  const [previewBackPhoto, setPreviewBackPhoto] = useState<string | null>(null);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBackFile, setSelectedBackFile] = useState<File | null>(null);
  const [refNumberInput, setRefNumberInput] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleBackFileSelect = (file: File) => {
    setUploadError(null);
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setUploadError(`Back side file size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum regulatory limit of 10MB.`);
      setSelectedBackFile(null);
      return;
    }
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setUploadError(`Invalid back side format "${file.type}". Regulatory standards accept .pdf, .jpg, and .png only.`);
      setSelectedBackFile(null);
      return;
    }
    setSelectedBackFile(file);
  };

  const handleOpenUploadModal = (docType: KycDocType, currentRef?: string) => {
    setUploadTargetDocType(docType);
    setSelectedFile(null);
    setSelectedBackFile(null);
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
    if (!uploadTargetDocType || (!selectedFile && !selectedBackFile)) {
      setUploadError('Please select at least one document file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(20);

    // Save front side photo permanently to IndexedDB + LocalStorage vault
    let cachedFileDataUrl = '';
    if (selectedFile) {
      try {
        cachedFileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(selectedFile);
        });
        if (cachedFileDataUrl) {
          await kycVaultStorage.saveFile(
            clientId,
            uploadTargetDocType === 'NATIONAL_ID' ? 'NATIONAL_ID_FRONT' : uploadTargetDocType,
            cachedFileDataUrl,
            {
              fileName: selectedFile.name,
              mimeType: selectedFile.type || 'image/png',
              fileSize: selectedFile.size,
            }
          );
          if (uploadTargetDocType === 'NATIONAL_ID') {
            await kycVaultStorage.saveFile(clientId, 'NATIONAL_ID', cachedFileDataUrl, {
              fileName: selectedFile.name,
              mimeType: selectedFile.type || 'image/png',
              fileSize: selectedFile.size,
            });
          }
        }
      } catch (cacheErr) {
        console.warn('KYC vault caching note:', cacheErr);
      }
    }

    // Save back side photo if provided for National ID
    let cachedBackDataUrl = '';
    if (uploadTargetDocType === 'NATIONAL_ID' && selectedBackFile) {
      try {
        cachedBackDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(selectedBackFile);
        });
        if (cachedBackDataUrl) {
          await kycVaultStorage.saveFile(clientId, 'NATIONAL_ID_BACK', cachedBackDataUrl, {
            fileName: selectedBackFile.name,
            mimeType: selectedBackFile.type || 'image/png',
            fileSize: selectedBackFile.size,
          });
        }
      } catch (cacheBackErr) {
        console.warn('KYC back vault caching note:', cacheBackErr);
      }
    }

    try {
      const primaryFile = (selectedFile || selectedBackFile)!;
      const mime =
        primaryFile.type ||
        (primaryFile.name.endsWith('.pdf')
          ? 'application/pdf'
          : primaryFile.name.endsWith('.png')
          ? 'image/png'
          : 'image/jpeg');

      // 1. Request pre-signed S3/R2 upload URL
      let uploadPlan;
      try {
        uploadPlan = await kycService.requestUploadUrl({
          documentType: uploadTargetDocType,
          originalFilename: primaryFile.name,
          mimeType: mime,
          fileSizeBytes: (selectedFile?.size || 0) + (selectedBackFile?.size || 0),
          userId: clientId,
        });
      } catch {
        const fileKey = `kyc/${clientId}/${uploadTargetDocType.toLowerCase()}_${Date.now()}.${
          primaryFile.name.split('.').pop() || 'png'
        }`;
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
      await kycService.uploadToStorage(uploadPlan.uploadUrl, primaryFile, uploadPlan.headers);

      setUploadProgress(85);

      // 3. Confirm document upload -> Status transitions to PENDING_REVIEW
      await kycService.confirmUpload({
        documentType: uploadTargetDocType,
        fileKey: uploadPlan.fileKey,
        originalFilename: selectedFile ? selectedFile.name : (selectedBackFile?.name || 'national_id.png'),
        referenceNumber: refNumberInput.trim() || `REF-${Date.now().toString().slice(-6)}`,
        fileSizeBytes: (selectedFile?.size || 0) + (selectedBackFile?.size || 0),
        mimeType: mime,
        userId: clientId,
        viewUrl: cachedFileDataUrl || undefined,
        backViewUrl: cachedBackDataUrl || undefined,
        backOriginalFilename: selectedBackFile?.name || undefined,
      });

      setUploadProgress(100);
      await loadKyc();
      setUploadTargetDocType(null);
      setSelectedFile(null);
      setSelectedBackFile(null);
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
    const storedFront =
      (await kycVaultStorage.getFile(clientId, doc.documentType === 'NATIONAL_ID' ? 'NATIONAL_ID_FRONT' : doc.documentType)) ||
      (await kycVaultStorage.getFile(clientId, doc.documentType)) ||
      (doc.viewUrl && (doc.viewUrl.startsWith('data:') || doc.viewUrl.startsWith('blob:')) ? doc.viewUrl : null);

    let storedBack = null;
    if (doc.documentType === 'NATIONAL_ID') {
      storedBack =
        (await kycVaultStorage.getFile(clientId, 'NATIONAL_ID_BACK')) ||
        (doc.backViewUrl && (doc.backViewUrl.startsWith('data:') || doc.backViewUrl.startsWith('blob:')) ? doc.backViewUrl : null);
    }
    setPreviewBackPhoto(storedBack);

    setPreviewDoc({
      ...doc,
      viewUrl: storedFront || doc.viewUrl,
      backViewUrl: storedBack || doc.backViewUrl,
    });
  };

  const handleDownloadScannedPhoto = () => {
    if (!previewDoc) return;
    const targetUrl =
      previewDoc.documentType === 'NATIONAL_ID' && idCardSide === 'back' && (previewBackPhoto || previewDoc.backViewUrl)
        ? (previewBackPhoto || previewDoc.backViewUrl)
        : previewDoc.viewUrl;

    const targetFilename =
      previewDoc.documentType === 'NATIONAL_ID' && idCardSide === 'back'
        ? previewDoc.backOriginalFilename || 'national_id_back.png'
        : previewDoc.originalFilename || `${previewDoc.documentType.toLowerCase()}.png`;

    if (targetUrl && (targetUrl.startsWith('data:') || targetUrl.startsWith('blob:'))) {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = targetFilename;
      link.click();
    } else {
      window.open(targetUrl || '#', '_blank');
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
        const activeDisplayUrl =
          previewDoc.documentType === 'NATIONAL_ID' && idCardSide === 'back'
            ? (previewBackPhoto || previewDoc.backViewUrl)
            : previewDoc.viewUrl;

        const isBackMissing =
          previewDoc.documentType === 'NATIONAL_ID' &&
          idCardSide === 'back' &&
          !activeDisplayUrl;

        const isPdf = Boolean(
          activeDisplayUrl &&
            (activeDisplayUrl.startsWith('data:application/pdf') ||
              (idCardSide === 'back'
                ? previewDoc.backOriginalFilename?.toLowerCase().endsWith('.pdf')
                : previewDoc.mimeType === 'application/pdf' ||
                  previewDoc.originalFilename?.toLowerCase().endsWith('.pdf')))
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

                    {/* National ID Front / Back Toggle (Official Specimen button removed per user request) */}
                    {previewDoc.documentType === 'NATIONAL_ID' && (
                      <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono">
                        <button
                          type="button"
                          onClick={() => setIdCardSide('front')}
                          className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                            idCardSide === 'front'
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Front Side</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdCardSide('back')}
                          className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                            idCardSide === 'back'
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Back Side</span>
                          {previewBackPhoto || previewDoc.backViewUrl ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          ) : null}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
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
                  {activeDisplayUrl ? (
                    <div
                      className={`relative transition-all duration-300 ${
                        isPhotoZoomed ? 'max-w-3xl' : 'max-w-md'
                      } w-full rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 p-1 flex items-center justify-center`}
                    >
                      {isPdf ? (
                        <iframe
                          src={activeDisplayUrl}
                          title={previewDoc.title}
                          className="w-full h-[380px] rounded-lg border-0 bg-white"
                        />
                      ) : (
                        <img
                          src={activeDisplayUrl}
                          alt={`${previewDoc.title} - ${idCardSide}`}
                          className="w-full max-h-[380px] object-contain rounded-lg shadow-md"
                        />
                      )}
                      <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-sm border border-emerald-500/30 text-[10px] font-mono text-emerald-400 px-2.5 py-1 rounded shadow flex items-center gap-1.5 font-bold">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>
                          AUTHENTIC UPLOADED PHOTO
                          {previewDoc.documentType === 'NATIONAL_ID'
                            ? ` • ${idCardSide.toUpperCase()} SIDE`
                            : ''}
                        </span>
                      </div>
                    </div>
                  ) : isBackMissing ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <CreditCard className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">Back Side Not Yet Uploaded</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          You have uploaded the Front Side of your National ID. Please upload the Back Side (showing residence address & MRZ barcode) to complete the verification package.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const ref = previewDoc.referenceNumber;
                          setPreviewDoc(null);
                          handleOpenUploadModal('NATIONAL_ID', ref);
                        }}
                        className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Back Side Now</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">No Document Photo Uploaded Yet</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          No scanned photo is currently stored for this document. Please upload an authentic image or PDF to proceed.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const docType = previewDoc.documentType;
                          const ref = previewDoc.referenceNumber;
                          setPreviewDoc(null);
                          handleOpenUploadModal(docType, ref);
                        }}
                        className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Document Now</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Compact Encrypted Metadata Row */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500">File:</span>
                    <span className="text-slate-200 font-semibold truncate">
                      {previewDoc.documentType === 'NATIONAL_ID' && idCardSide === 'back'
                        ? previewDoc.backOriginalFilename || 'national_id_back.png'
                        : previewDoc.originalFilename}
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
                    href={activeDisplayUrl || previewDoc.viewUrl || '#'}
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

              {/* Drag & Drop Zone: Dual-side dropzone for National ID, single for other documents */}
              {uploadTargetDocType === 'NATIONAL_ID' ? (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center gap-2 font-mono">
                    <CreditCard className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>National Bank of Cambodia regulations require both <strong>Front Side</strong> and <strong>Back Side</strong> scans.</span>
                  </div>

                  {/* Front Side Dropzone */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5 font-mono">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        <span>1. Front Side (Face Portrait & Personal Details):</span>
                      </label>
                      {selectedFile && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                          READY
                        </span>
                      )}
                    </div>

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
                      className={`p-3.5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                        selectedFile
                          ? 'border-emerald-500/60 bg-emerald-500/5'
                          : 'border-slate-800 hover:border-emerald-500/40 bg-slate-950/60'
                      }`}
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-between text-left gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                              <p className="text-[10px] font-mono text-emerald-400">
                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'image'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-xs text-rose-400 hover:text-rose-300 font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 py-1">
                          <UploadCloud className="w-5 h-5 text-slate-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-200">
                            Click or drag & drop Front Side photo here
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Portrait photo, personal details (.pdf, .jpg, .png up to 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back Side Dropzone */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5 font-mono">
                        <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                        <span>2. Back Side (Address & MRZ Barcode):</span>
                      </label>
                      {selectedBackFile && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                          READY
                        </span>
                      )}
                    </div>

                    <input
                      ref={backFileInputRef}
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBackFileSelect(file);
                      }}
                    />

                    <div
                      onClick={() => backFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleBackFileSelect(file);
                      }}
                      className={`p-3.5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                        selectedBackFile
                          ? 'border-emerald-500/60 bg-emerald-500/5'
                          : 'border-slate-800 hover:border-sky-500/40 bg-slate-950/60'
                      }`}
                    >
                      {selectedBackFile ? (
                        <div className="flex items-center justify-between text-left gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{selectedBackFile.name}</p>
                              <p className="text-[10px] font-mono text-emerald-400">
                                {(selectedBackFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedBackFile.type || 'image'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBackFile(null);
                              if (backFileInputRef.current) backFileInputRef.current.value = '';
                            }}
                            className="text-xs text-rose-400 hover:text-rose-300 font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 py-1">
                          <UploadCloud className="w-5 h-5 text-slate-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-200">
                            Click or drag & drop Back Side photo here
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Residence address, fingerprint, MRZ barcode (.pdf, .jpg, .png up to 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Drag & Drop Zone for Proof of Residence & Employment Contract */
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
              )}

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
                  disabled={isUploading || (!selectedFile && !selectedBackFile)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                    isUploading || (!selectedFile && !selectedBackFile)
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
