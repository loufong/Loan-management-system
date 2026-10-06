import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar, BreadcrumbItem } from './TopBar';
import { UserProfile, UserRole, Currency, NotificationItem } from '../../types';
import { X } from 'lucide-react';

export interface AppLayoutProps {
  currentUser: UserProfile;
  activeNavId: string;
  onNavigate: (navId: string) => void;
  onLogout?: () => void;
  branchName?: string;
  breadcrumbs: BreadcrumbItem[];
  currentRole: UserRole;
  onRoleSwitch: (role: UserRole) => void;
  currency: Currency;
  onToggleCurrency: (currency: Currency) => void;
  onSearchOpen?: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentUser,
  activeNavId,
  onNavigate,
  onLogout,
  branchName = 'Main Branch',
  breadcrumbs,
  currentRole,
  onRoleSwitch,
  currency,
  onToggleCurrency,
  onSearchOpen,
  notifications,
  onMarkNotificationRead,
  children
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleMobileNavigate = (navId: string) => {
    onNavigate(navId);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#2563EB] selection:text-white">
      
      {/* 1. Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 h-full">
        <Sidebar
          currentUser={currentUser}
          activeNavId={activeNavId}
          onNavigate={onNavigate}
          onLogout={onLogout}
          branchName={branchName}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* 2. Mobile/Tablet Slide-over Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
              aria-hidden="true"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col lg:hidden shadow-lg border-r border-slate-800"
            >
              <div className="absolute top-3.5 right-3 z-50">
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close Navigation Drawer"
                  className="p-1.5 rounded-[6px] text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-full w-full">
                <Sidebar
                  currentUser={currentUser}
                  activeNavId={activeNavId}
                  onNavigate={handleMobileNavigate}
                  onLogout={() => {
                    setMobileDrawerOpen(false);
                    onLogout?.();
                  }}
                  branchName={branchName}
                  isCollapsed={false}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full max-h-screen overflow-hidden">
        <TopBar
          breadcrumbs={breadcrumbs}
          currentRole={currentRole}
          onRoleSwitch={onRoleSwitch}
          currency={currency}
          onToggleCurrency={onToggleCurrency}
          onSearchOpen={onSearchOpen}
          notifications={notifications}
          onMarkNotificationRead={onMarkNotificationRead}
          onMobileMenuToggle={() => setMobileDrawerOpen(true)}
          currentUser={currentUser}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-[#F8FAFC]">
          <div className="h-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
};
