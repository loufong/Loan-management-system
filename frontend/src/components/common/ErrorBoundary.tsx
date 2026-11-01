import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL: Core Banking Application Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleResetSession = () => {
    try {
      localStorage.removeItem('apex_token');
      localStorage.removeItem('apex_user');
      localStorage.removeItem('JAM_SONG_VICH_UNIFIED_LEDGER');
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6 font-sans antialiased">
          <div className="max-w-md w-full bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Core Banking Session Interrupted
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                The portal encountered an unexpected runtime state. Your banking ledger records and database transactions remain secure.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-[#050811] border border-slate-800 rounded-xl p-3 max-h-36 overflow-y-auto font-mono text-[11px] text-rose-400">
                <p className="font-bold text-rose-300">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Portal
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-[#1e293b] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                Reset Session & Return to Safe Login
              </button>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-center gap-2">
              <span>JAM SONG VICH Core Banking</span>
              <span>•</span>
              <span>256-Bit SSL Rail</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
