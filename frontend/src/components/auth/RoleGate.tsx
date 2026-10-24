import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface RoleGateProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallbackDashboardRoute?: string;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  allowedRoles,
  children,
  fallbackDashboardRoute = '/admin/dashboard'
}) => {
  const { user, profile } = useAuth();

  const currentRole = (profile?.role || user?.role || 'teller').toLowerCase();
  const isDev =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '3000' ||
        window.location.port === '5000'));

  const isBorrower = currentRole === 'borrower' || currentRole === 'user';
  const effectiveFallback = isBorrower ? '/my-loans' : fallbackDashboardRoute;

  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
  const hasClearance =
    (!isBorrower && isDev) ||
    normalizedAllowedRoles.includes(currentRole) ||
    normalizedAllowedRoles.includes('all');

  if (!hasClearance) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden space-y-5">
          {/* Top Amber Ambient Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

          {/* Amber Shield Alert Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-950/40">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              403 • Authorization Required
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Access Clearance Denied
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              You do not have clearance to view this credit module. Your active operational role is{' '}
              <strong className="text-amber-400 font-mono uppercase">{currentRole}</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
            <div className="flex justify-between">
              <span>Required Clearance:</span>
              <span className="font-mono text-emerald-400">{allowedRoles.join(' / ').toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Account User:</span>
              <span className="text-white font-medium">{user?.name || 'Staff User'}</span>
            </div>
          </div>

          {/* Back to My Dashboard / Portal Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.hash = `#${effectiveFallback}`;
              }
            }}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-950/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBorrower ? 'Back to My Loans (/my-loans)' : 'Back to My Dashboard'}</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGate;
