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
  RefreshCw,
  Check,
  FileUp,
  FileWarning,
  Fingerprint,
  QrCode,
  ZoomIn,
  ZoomOut,
  Edit3,
  AlertCircle,
  Briefcase,
  DollarSign,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
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
  onUpdateUser?: (updated: UserProfile) => void;
}

export const BorrowerProfileView: React.FC<BorrowerProfileViewProps> = ({
  currentUser,
  currency: appCurrency,
  onNavigate,
  onUpdateUser,
}) => {
  const { updateProfile: authUpdateProfile } = useAuth();
  const { language } = useLanguage();
  const [activeCurrency, setActiveCurrency] = useState<Currency>(appCurrency || 'USD');

  // Edit Profile State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(currentUser?.fullName || currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '+855 12 000 888');
  const [editAddress, setEditAddress] = useState(currentUser?.address || 'Phnom Penh, Cambodia');
  const [editOccupation, setEditOccupation] = useState(currentUser?.occupation || currentUser?.position || 'SME Commercial Merchant');
  const [editMonthlyIncome, setEditMonthlyIncome] = useState(currentUser?.monthlyIncome ? String(currentUser.monthlyIncome) : '1200');
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser?.avatarUrl || currentUser?.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessNotice, setProfileSuccessNotice] = useState<string | null>(null);
  const [profileErrorNotice, setProfileErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setEditFullName(currentUser.fullName || currentUser.name || '');
      setEditPhone(currentUser.phone || '+855 12 000 888');
      if (currentUser.address) setEditAddress(currentUser.address);
      if (currentUser.occupation || currentUser.position) setEditOccupation(currentUser.occupation || currentUser.position || '');
      if (currentUser.monthlyIncome) setEditMonthlyIncome(String(currentUser.monthlyIncome));
      if (currentUser.avatarUrl || currentUser.avatar) setEditAvatarUrl(currentUser.avatarUrl || currentUser.avatar || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorNotice(null);

    const cleanName = editFullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setProfileErrorNotice('Full Name must be at least 2 characters.');
      return;
    }

    const cleanPhone = editPhone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setProfileErrorNotice('Please enter a valid phone number (at least 8 digits).');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await authUpdateProfile({
        fullName: cleanName,
        phone: cleanPhone,
        address: editAddress.trim() || undefined,
        position: editOccupation.trim() || undefined,
        occupation: editOccupation.trim() || undefined,
        monthlyIncome: editMonthlyIncome ? parseFloat(editMonthlyIncome) || 0 : undefined,
        avatarUrl: editAvatarUrl.trim() || undefined,
      });

      if (onUpdateUser) {
        onUpdateUser(updated);
      }

      setProfileSuccessNotice('Profile updated successfully!');
      setTimeout(() => {
        setProfileSuccessNotice(null);
        setIsEditModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setProfileErrorNotice(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

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

  const isDemoAccount =
    currentUser?.email === 'johnathan.doe@student.edu' ||
    currentUser?.username === 'j.doe' ||
    currentUser?.username === 'borrower' ||
    currentUser?.email === 'borrower@apex.local';

  const displayName = currentUser?.fullName || currentUser?.name || 'User';
  const clientId =
    currentUser?.borrowerId ||
    (isDemoAccount ? 'BOR-2026-8801' : (currentUser?.id || currentUser?.username || currentUser?.email || 'user'));

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

    const handleUpdate = (e: any) => {
      if (!e.detail?.userId || e.detail.userId === clientId) {
        loadKyc();
      }
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

  const verifiedCount = kycSummary?.verifiedCount ?? 3;
  const isBorrowingUnlocked = kycSummary?.isEligibleToBorrow ?? true;

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
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-950/50">
                <img
                  src={
                    currentUser?.avatarUrl ||
                    currentUser?.avatar ||
                    editAvatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
                  }
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
                {currentUser?.occupation || currentUser?.position || editOccupation || 'SME Commercial Merchant • Verified National ID holder'}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {currentUser?.phone || editPhone || '+855 12 000 888'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  {currentUser?.email || (currentUser?.username ? `${currentUser.username}@student.edu` : 'borrower@jamsongvich.com')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Credit Status & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Edit Profile</span>
            </button>

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

        {/* Personal & Account Information Card */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span>Personal & Contact Information</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Primary contact details and verified borrower identity information on file.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Full Legal Name</span>
              <div className="font-semibold text-white truncate">{displayName}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Primary Phone</span>
              <div className="font-semibold text-white font-mono truncate">{currentUser?.phone || editPhone}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Email Address</span>
              <div className="font-semibold text-white truncate">{currentUser?.email || (currentUser?.username ? `${currentUser.username}@student.edu` : 'user@student.edu')}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">National ID / CBC No.</span>
              <div className="font-semibold text-emerald-400 font-mono truncate">{currentUser?.nationalId || '0108928374'}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 sm:col-span-2">
              <span className="text-[11px] text-slate-400 font-medium">Residential Address</span>
              <div className="font-semibold text-white truncate">{currentUser?.address || editAddress}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Occupation / Profession</span>
              <div className="font-semibold text-white truncate">{currentUser?.occupation || currentUser?.position || editOccupation}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Monthly Income</span>
              <div className="font-semibold text-white font-mono truncate">{formatMoney(parseFloat(editMonthlyIncome) || 1200)}</div>
            </div>
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

        {/* 3 Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(kycSummary?.documents || []).map((doc) => {
            const isVerified = doc.status === 'VERIFIED';
            const isPending = doc.status === 'PENDING_REVIEW';
            const isRejected = doc.status === 'REJECTED';
            const isMissing = doc.status === 'MISSING' || (!isVerified && !isPending && !isRejected);
            const hasUploadedFile = Boolean(doc.originalFilename && doc.originalFilename.trim().length > 0);

            return (
              <div
                key={doc.documentType}
                className={`p-5 rounded-2xl bg-slate-950 border transition-all flex flex-col justify-between relative overflow-hidden group ${
                  isVerified
                    ? 'border-slate-800 hover:border-emerald-500/40'
                    : isRejected
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : isPending
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Status Indicator Bar at Top */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isVerified
                      ? 'bg-emerald-500'
                      : isRejected
                      ? 'bg-rose-500'
                      : isPending
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-800'
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

                    {isMissing && (
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        NOT UPLOADED
                      </span>
                    )}

                    {doc.referenceNumber ? (
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                        {doc.referenceNumber}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800/80">
                        REQUIRED
                      </span>
                    )}
                  </div>

                  {/* Document Title & File Details */}
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{doc.title}</h4>
                    {hasUploadedFile ? (
                      <>
                        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{doc.originalFilename}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                          {isVerified
                            ? `Approved: ${doc.verifiedAt?.slice(0, 10) || '2026-03-12'}`
                            : `Uploaded: ${doc.uploadedAt?.slice(0, 10) || 'Recently'}`} • {doc.fileSizeBytes ? (doc.fileSizeBytes / (1024 * 1024)).toFixed(1) : '1.0'} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>No file uploaded yet</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                          Upload PNG, JPG, or PDF up to 10MB
                        </p>
                      </>
                    )}
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
                  {hasUploadedFile ? (
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal(doc.documentType, '')}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-slate-950" />
                      <span>Upload Document</span>
                    </button>
                  )}

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

        const isImage = Boolean(
          activeDisplayUrl &&
            (activeDisplayUrl.startsWith('data:image/') ||
              /\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(activeDisplayUrl))
        );

        const isPdf = !isImage && Boolean(
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
                <div className="py-3 px-2 flex items-center justify-center min-h-[320px] bg-slate-950/90 rounded-xl border border-slate-900 overflow-hidden">
                  {activeDisplayUrl ? (
                    <div
                      className={`relative transition-all duration-300 ${
                        isPhotoZoomed ? 'max-w-4xl' : 'max-w-xl'
                      } w-full rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 p-1.5 flex items-center justify-center`}
                    >
                      {isPdf ? (
                        <iframe
                          src={activeDisplayUrl}
                          title={previewDoc.title}
                          className="w-full h-[450px] rounded-lg border-0 bg-white"
                        />
                      ) : (
                        <img
                          src={activeDisplayUrl}
                          alt={`${previewDoc.title} - ${idCardSide}`}
                          className={`w-auto h-auto max-w-full ${
                            isPhotoZoomed ? 'max-h-[620px]' : 'max-h-[420px]'
                          } object-contain rounded-lg shadow-md mx-auto`}
                        />
                      )}
                      <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-sm border border-emerald-500/30 text-[10px] font-mono text-emerald-400 px-2.5 py-1 rounded shadow flex items-center gap-1.5 font-bold">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>
                          UPLOADED PHOTO
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
                        <h4 className="text-sm font-bold text-white">Back Side Missing</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Please upload the back side of your National ID.
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
                        <span>Upload Back Side</span>
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
                    <span>Download Photo</span>
                  </button>

                  <a
                    href={activeDisplayUrl || previewDoc.viewUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open in New Tab</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Close
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Profile Details</h3>
                  <p className="text-xs text-slate-400">Update your borrower contact and profile information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileSuccessNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccessNotice}</span>
              </div>
            )}

            {profileErrorNotice && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileErrorNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Enter full name"
                  required
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Phone & Monthly Income */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+855 12 345 678"
                    required
                    className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1">
                    Monthly Income (USD)
                  </label>
                  <input
                    type="number"
                    value={editMonthlyIncome}
                    onChange={(e) => setEditMonthlyIncome(e.target.value)}
                    placeholder="1200"
                    min="0"
                    step="50"
                    className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Residential Address */}
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street address, Sangkat, Khan, City"
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Occupation / Position */}
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Occupation / Profession
                </label>
                <input
                  type="text"
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  placeholder="e.g. SME Merchant, Software Engineer, Teacher"
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Profile Avatar Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1.5">
                  Choose Profile Picture
                </label>
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256',
                    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
                  ].map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditAvatarUrl(url)}
                      className={`relative w-11 h-11 rounded-xl p-0.5 shrink-0 transition cursor-pointer ${
                        editAvatarUrl === url || (!editAvatarUrl && idx === 0)
                          ? 'ring-2 ring-blue-500'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`avatar-${idx}`} className="w-full h-full object-cover rounded-[10px]" />
                      {(editAvatarUrl === url || (!editAvatarUrl && idx === 0)) && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
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
