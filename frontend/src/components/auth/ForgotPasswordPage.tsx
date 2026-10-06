import React, { useState } from 'react';
import {
  Mail,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

interface ForgotPasswordPageProps {
  onOtpSent: (email: string) => void;
  onNavigateToLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onOtpSent,
  onNavigateToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please provide your registered email address.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      await api.forgotPassword({ email: cleanEmail });
      onOtpSent(cleanEmail);
    } catch (err: any) {
      setError(err?.message || 'Unable to process password reset request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-8 border border-[#CBD5E1] rounded-[8px] space-y-6">
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[6px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                APX
              </div>
              <h1 className="text-lg font-bold text-[#0F172A]">
                Apex LMS
              </h1>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] pt-2">
              Password Recovery
            </h2>
            <p className="text-xs text-[#64748B]">
              Enter your registered email address to receive a 6-digit verification code.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-[44px] px-3.5 pl-10 bg-white border border-[#CBD5E1] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[44px] bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white font-medium text-[14px] rounded-[6px] transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending code...</span>
                </>
              ) : (
                <span>Send Reset Code</span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#CBD5E1] text-center">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>
          </div>

        </div>

        <div className="mt-6 text-center text-xs text-[#64748B]">
          Apex Core Banking Platform • Secure Access Gateway
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
