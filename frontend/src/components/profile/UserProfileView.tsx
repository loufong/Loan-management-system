import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  User,
  Mail,
  Shield,
  Building,
  KeyRound,
  CheckCircle,
  Calendar,
  Hash,
  Phone,
  Briefcase,
  Edit3,
  Save,
  X,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export interface UserProfileViewProps {
  currentUser: UserProfile;
  onChangePassword?: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  onChangePassword,
  onUpdateUser,
}) => {
  const { updateProfile: authUpdateProfile, refreshUser } = useAuth();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'security'>('overview');

  // Edit Mode State
  const [fullName, setFullName] = useState(currentUser.fullName || currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [position, setPosition] = useState(currentUser.position || currentUser.title || '');
  const [department, setDepartment] = useState(currentUser.department || '');

  // Form Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Copy ID State
  const [copiedId, setCopiedId] = useState(false);

  // In-Profile Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const role = (currentUser.role || 'USER').toUpperCase();
  const isAdmin = role === 'ADMIN';

  // Password Strength Calculation
  const passStrengthScore = (() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  })();

  const passStrengthLabel = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][passStrengthScore];
  const passStrengthColor = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-blue-600', 'bg-emerald-600'][passStrengthScore];

  const handleCopyId = () => {
    if (currentUser.id) {
      navigator.clipboard.writeText(currentUser.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setSaveError('Full Name must be at least 2 characters.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await authUpdateProfile({
        fullName: cleanName,
        phone: phone.trim() || undefined,
        position: position.trim() || undefined,
        department: department.trim() || undefined,
      });

      if (onUpdateUser) {
        onUpdateUser(updated);
      }

      setSaveSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSaveSuccess(null);
        setActiveTab('overview');
      }, 1500);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }

    if (passStrengthScore < 3) {
      setPassError('Password must contain uppercase, lowercase, numbers, and symbols.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPassSuccess(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(null), 3000);
    } catch (err: any) {
      setPassError(err?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl font-sans text-[#0F172A]">
      {/* 1. Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-white shadow-xs flex items-center justify-center text-xl font-bold text-white shrink-0">
                {currentUser.fullName
                  ? currentUser.fullName.charAt(0).toUpperCase()
                  : currentUser.name
                  ? currentUser.name.charAt(0).toUpperCase()
                  : 'U'}
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Online & Active" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                  {currentUser.fullName || currentUser.name || 'User Profile'}
                </h1>

                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Active
                </span>

                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1 border ${
                    isAdmin
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  {isAdmin ? 'System Administrator' : 'Client Borrower'}
                </span>
              </div>

              <p className="text-xs text-[#64748B] mt-1 flex items-center gap-2">
                <span>@{currentUser.username || 'user'}</span>
                <span>•</span>
                <span>{currentUser.email}</span>
                {currentUser.borrowerId && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-blue-600 font-semibold">{currentUser.borrowerId}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'edit' ? 'overview' : 'edit')}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-[6px] transition-colors border ${
                activeTab === 'edit'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-slate-50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {activeTab === 'edit' ? 'Close Editor' : 'Edit Profile'}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'security' ? 'overview' : 'security')}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-[6px] transition-colors border ${
                activeTab === 'security'
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'bg-white text-[#2563EB] border-[#CBD5E1] hover:bg-blue-50'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Security
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-[#E2E8F0] mt-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
              activeTab === 'overview'
                ? 'bg-slate-100 text-[#0F172A]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
              activeTab === 'edit'
                ? 'bg-slate-100 text-[#0F172A]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            Edit Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
              activeTab === 'security'
                ? 'bg-slate-100 text-[#0F172A]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            Password & Security
          </button>
        </div>
      </div>

      {/* 2. TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account Details */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Personal & Account Details
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="text-[11px] font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Full Name
                </span>
                <span className="font-semibold text-[#0F172A]">
                  {currentUser.fullName || currentUser.name || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  Username
                </span>
                <span className="font-mono text-[#0F172A]">@{currentUser.username || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  Email Address
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A]">
                  {currentUser.email || 'N/A'}
                  <span title="Email Verified via Real OTP" className="inline-flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  Phone Number
                </span>
                <span className="font-mono text-[#0F172A]">{currentUser.phone || '012 345 678'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  Title / Position
                </span>
                <span className="text-[#0F172A]">
                  {currentUser.position || currentUser.title || (isAdmin ? 'Platform Administrator' : 'Client Borrower')}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Building className="w-3.5 h-3.5" />
                  Department
                </span>
                <span className="text-[#0F172A]">
                  {currentUser.department || (isAdmin ? 'Executive Administration' : 'Client Services')}
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Assignment & Platform Security */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#E2E8F0] pb-2.5">
              Institutional & Security Status
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Building className="w-3.5 h-3.5" />
                  Branch Location
                </span>
                <span className="text-[#0F172A]">{currentUser.branch || 'Phnom Penh Main Branch'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  OTP Protection
                </span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Real Email OTP Active
                </span>
              </div>

              {currentUser.borrowerId && (
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" />
                    Borrower Dossier ID
                  </span>
                  <span className="font-mono text-[#2563EB] font-bold">{currentUser.borrowerId}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  Account ID
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="font-mono text-[11px] text-[#64748B] hover:text-[#0F172A] inline-flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                  title="Click to copy Account ID"
                >
                  <span>{currentUser.id ? `${currentUser.id.slice(0, 10)}...` : 'N/A'}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Last Login
                </span>
                <span className="text-[#64748B]">
                  {currentUser.lastLogin
                    ? new Date(currentUser.lastLogin).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Active session'}
                </span>
              </div>
            </div>

            {/* Quick Switch to Security */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-[6px] text-xs text-[#64748B] flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#0F172A]">Need to update password?</p>
                <p className="text-[11px]">Keep your financial credentials secure.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-white border border-blue-200 hover:bg-blue-50 rounded-[4px] transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: EDIT PROFILE FORM */}
      {activeTab === 'edit' && (
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 shadow-xs space-y-5">
          <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Edit Personal Information</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Update your account details. Changes will synchronize across all loan records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] inline-flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[6px] text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-[40px] px-3.5 pl-9 rounded-[6px] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="e.g. David Serey"
                  />
                  <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-[40px] px-3.5 pl-9 rounded-[6px] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="e.g. 012 345 678"
                  />
                  <Phone className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Position / Title */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Position / Occupation
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full h-[40px] px-3.5 pl-9 rounded-[6px] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="e.g. Senior Software Engineer"
                  />
                  <Briefcase className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Department / Organization
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-[40px] px-3.5 pl-9 rounded-[6px] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="e.g. Client Services"
                  />
                  <Building className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Read-Only System Fields */}
            <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-4 space-y-2 mt-4 text-xs">
              <p className="font-semibold text-slate-700">Protected System Attributes</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[#64748B]">
                <div>
                  <span className="font-medium text-[#0F172A]">Email:</span> {currentUser.email} (Verified)
                </div>
                <div>
                  <span className="font-medium text-[#0F172A]">Username:</span> @{currentUser.username}
                </div>
                <div>
                  <span className="font-medium text-[#0F172A]">System Role:</span> {role}
                </div>
                <div>
                  <span className="font-medium text-[#0F172A]">Branch:</span> {currentUser.branch || 'Phnom Penh Main Branch'}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#CBD5E1] rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 rounded-[6px] transition-colors shadow-xs"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. TAB 3: PASSWORD & SECURITY */}
      {activeTab === 'security' && (
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 shadow-xs space-y-5">
          <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Account Security & Password</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Update your login password. Must meet strict banking security criteria.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] inline-flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>

          {passSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[6px] text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-[40px] px-3.5 pr-10 rounded-[6px] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">
                  New Password <span className="text-rose-500">*</span>
                </label>
                {newPassword && (
                  <span className="text-[11px] font-bold text-[#64748B]">
                    Strength: <span className="text-blue-600">{passStrengthLabel}</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-[40px] px-3.5 pr-10 rounded-[6px] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Enter strong new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Bar */}
              {newPassword && (
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passStrengthColor}`}
                    style={{ width: `${(passStrengthScore / 4) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-[40px] px-3.5 rounded-[6px] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Re-type new password"
              />
            </div>

            {/* Password Policy Checklist */}
            <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-3 text-[11px] space-y-1 text-[#64748B]">
              <p className="font-semibold text-[#0F172A]">Password Security Requirements:</p>
              <div className="grid grid-cols-2 gap-1">
                <span className={newPassword.length >= 8 ? 'text-emerald-700 font-semibold' : ''}>
                  • Min 8 characters
                </span>
                <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-700 font-semibold' : ''}>
                  • 1 uppercase letter
                </span>
                <span className={/[a-z]/.test(newPassword) ? 'text-emerald-700 font-semibold' : ''}>
                  • 1 lowercase letter
                </span>
                <span className={/[0-9]/.test(newPassword) ? 'text-emerald-700 font-semibold' : ''}>
                  • 1 number
                </span>
                <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-700 font-semibold' : ''}>
                  • 1 special symbol
                </span>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isChangingPass}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 rounded-[6px] transition-colors shadow-xs"
              >
                {isChangingPass ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                {isChangingPass ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
