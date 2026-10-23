import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Sparkles } from 'lucide-react';

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Lightweight, non-blocking skeleton loader while session verification is running
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 relative shadow-xl">
          <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
        </div>
        <div className="space-y-2 text-center max-w-xs w-full">
          <div className="h-4 bg-slate-800 rounded-md animate-pulse w-3/4 mx-auto" />
          <div className="h-3 bg-slate-850 rounded-md animate-pulse w-1/2 mx-auto" />
        </div>
        <p className="text-xs text-slate-500 mt-4 font-mono">
          Verifying security clearance...
        </p>
      </div>
    );
  }

  // If not authenticated, redirect to /login with current location in state.from
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
