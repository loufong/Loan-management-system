import React from 'react';
import { UserProfile } from '../../types';
import {
  ADMIN_SECTIONS,
  USER_SECTIONS,
  isRouteActive,
  NavItemConfig,
} from '../../navigation/navigation';
import { Landmark, LogOut, LucideIcon, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import logoImg from '../../assets/logo-transparent.png';

export interface SidebarProps {
  currentUser: UserProfile;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  onCloseMobileDrawer?: () => void;
  onRoleToggle?: () => void;
  onRoleSwitch?: (role: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentPath,
  onNavigate,
  onLogout,
  onCloseMobileDrawer,
  onRoleToggle,
  onRoleSwitch,
}) => {
  const { language, t } = useLanguage();
  const role = (currentUser.role || 'USER').toUpperCase();
  const isAdmin = role !== 'BORROWER' && role !== 'USER';

  const sections = isAdmin ? ADMIN_SECTIONS : USER_SECTIONS;

  const getSectionTitle = (rawTitle?: string) => {
    if (!rawTitle) return '';
    if (rawTitle === 'LOAN MANAGEMENT') return t('sec_loan_management');
    if (rawTitle === 'MY LOANS') return t('sec_my_loans');
    if (rawTitle === 'MANAGEMENT') return t('sec_management');
    if (rawTitle === 'SYSTEM') return t('sec_system');
    if (rawTitle === 'ACCOUNT') return t('sec_account');
    return rawTitle;
  };

  const getItemLabel = (item: NavItemConfig) => {
    switch (item.id) {
      case 'user_dashboard':
      case 'admin_dashboard':
        return t('nav_dashboard', 'Dashboard');
      case 'user_applications':
        return t('nav_my_applications', 'My Applications');
      case 'user_loans':
        return t('nav_my_loans', 'My Loans');
      case 'user_repayments':
        return t('nav_repayments', 'Repayment Schedule');
      case 'user_payments':
        return t('nav_payments', 'Payments');
      case 'user_notifications':
      case 'admin_notifications':
        return t('nav_notifications', 'Notifications');
      case 'user_profile':
        return t('nav_profile', 'My Profile');
      case 'user_settings':
      case 'admin_settings':
        return t('nav_settings', 'Settings');
      case 'admin_borrowers':
      case 'borrowers':
        return t('nav_borrowers', 'Borrowers');
      case 'admin_applications':
        return t('nav_applications', 'Applications');
      case 'admin_loans':
        return t('nav_loans', 'Loans');
      case 'admin_overdue':
        return t('nav_overdue', 'Overdue');
      case 'admin_users':
        return t('nav_users', 'Users');
      case 'admin_products':
        return t('nav_products', 'Loan Products');
      case 'admin_reports':
        return t('nav_reports', 'Reports & Analytics');
      case 'admin_audit_logs':
        return t('nav_audit_logs', 'Audit Logs');
      default:
        return t(item.label, item.label);
    }
  };

  const handleItemClick = (item: NavItemConfig) => {
    const target = (item.id === 'admin_borrowers' || item.id === 'borrowers')
      ? '/admin/borrowers'
      : (item.path || item.id);
    onNavigate(target);
    onCloseMobileDrawer?.();
  };

  const handleProfileClick = () => {
    const profilePath = isAdmin ? '/admin/profile' : '/profile';
    onNavigate(profilePath);
    onCloseMobileDrawer?.();
  };

  const handleLogoutClick = () => {
    onCloseMobileDrawer?.();
    onLogout?.();
  };

  return (
    <aside
      aria-label="Application Sidebar"
      className="w-64 h-full bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col justify-between select-none font-sans"
    >
      {/* 1. Header: Branding & System Name */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#E2E8F0] shrink-0">
          <div className="w-10 h-10 rounded-[8px] bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-xs overflow-hidden p-1">
            <img src={logoImg} alt="Jam Song Vich Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-[#0F172A] tracking-tight truncate leading-tight">
              {t('app_name')}
            </span>
            <span className="text-[11px] font-medium text-[#64748B] truncate leading-tight mt-0.5">
              {t('app_subtitle')}
            </span>
          </div>
        </div>

        {/* 2. Scrollable Navigation Sections */}
        <nav
          aria-label="Main Navigation Menu"
          className="flex-1 overflow-y-auto px-3 py-3 space-y-4 focus:outline-none"
        >
          {sections.map((section, sIdx) => (
            <div key={section.sectionTitle || `sec-${sIdx}`} className="space-y-1">
              {section.sectionTitle && (
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {getSectionTitle(section.sectionTitle)}
                </div>
              )}

              {section.items.map((item) => {
                const active = isRouteActive(item, currentPath);
                const Icon: LucideIcon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] transition-colors text-left font-medium cursor-pointer',
                      active
                        ? 'bg-[#EFF6FF] text-[#2563EB]'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] shrink-0 transition-colors',
                        active ? 'text-[#2563EB]' : 'text-[#64748B]'
                      )}
                    />
                    <span className="truncate">{getItemLabel(item)}</span>
                    {item.badge !== undefined && (
                      <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded-[4px] bg-blue-100 text-[#2563EB] font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* 3. Bottom Area: Authenticated User Profile & Logout */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#FFFFFF] shrink-0 space-y-2">
        {/* User Card */}
        <button
          type="button"
          onClick={handleProfileClick}
          title="View profile details"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] hover:bg-[#F8FAFC] transition text-left border border-transparent hover:border-[#E2E8F0] cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 text-[#0F172A] flex items-center justify-center font-bold text-xs shrink-0 border border-[#CBD5E1]">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-semibold text-[#0F172A] truncate leading-tight">
              {currentUser.name || currentUser.fullName || 'User'}
            </span>
            <span className="text-[11px] text-[#64748B] truncate leading-tight mt-0.5">
              {isAdmin ? (language === 'km' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'Administrator') : (language === 'km' ? 'អតិថិជន (Borrower)' : 'Borrower User')}
            </span>
          </div>
        </button>

        {/* Quick 1-Click Role Toggle (Admin vs Borrower) */}
        <button
          type="button"
          onClick={() => {
            if (onRoleToggle) {
              onRoleToggle();
            } else if (onRoleSwitch) {
              onRoleSwitch(isAdmin ? 'BORROWER' : 'ADMIN');
            }
          }}
          className="w-full py-1.5 px-2.5 rounded-[6px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          title={`Quick 1-click toggle: currently ${isAdmin ? 'Admin' : 'Borrower'}`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>Switch to {isAdmin ? '👤 Borrower' : '⚡ Admin'}</span>
        </button>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-medium text-[#DC2626] hover:bg-rose-50 hover:text-red-700 transition text-left cursor-pointer"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0 text-[#DC2626]" />
          <span>{t('nav_logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
