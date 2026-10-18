import React, { useState, useEffect, useRef } from 'react';
import { Currency, UserRole, NotificationItem, UserProfile } from '../../types';
import {
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  KeyRound,
  CheckCheck,
  User,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import logoImg from '../../assets/logo-transparent.png';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface TopBarProps {
  breadcrumbs: BreadcrumbItem[];
  currentRole: UserRole;
  onRoleSwitch: (role: UserRole) => void;
  currency: Currency;
  onToggleCurrency: (currency: Currency) => void;
  onSearchOpen?: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
  onMobileMenuToggle?: () => void;
  currentUser?: UserProfile;
  onLogout?: () => void;
  onNavigate?: (navId: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbs,
  currentRole,
  notifications,
  onMarkNotificationRead,
  onMobileMenuToggle,
  currentUser,
  onLogout,
  onNavigate,
}) => {
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { language, setLanguage, t } = useLanguage();
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const currentTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : t('nav_dashboard');
  const role = (currentUser?.role || currentRole || 'USER').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const displayRole = isAdmin ? (language === 'km' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'Admin') : (language === 'km' ? 'អតិថិជន (User)' : 'User');

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between select-none font-sans">
      {/* 1. Left: Mobile Toggle (☰) + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          type="button"
          aria-label="Open Navigation Drawer"
          className="lg:hidden p-2 rounded-[6px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Small Screen Logo fallback */}
        <div className="flex items-center gap-2 lg:hidden min-w-0">
          <img src={logoImg} alt="Jam Song Vich" className="w-6 h-6 object-contain shrink-0" />
          <span className="font-bold text-[15px] text-[#0F172A] truncate">
            {t('app_name')}
          </span>
        </div>

        {/* Desktop Title */}
        <h1 className="hidden lg:block text-[17px] font-bold text-[#0F172A] tracking-tight truncate">
          {currentTitle}
        </h1>
      </div>

      {/* 2. Right: Language Selector + Notification Bell + Profile Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Khmer / English Language Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-[6px] border border-[#E2E8F0] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLanguage('km')}
            className={cn(
              'px-2.5 py-1 rounded-[4px] transition-colors flex items-center justify-center cursor-pointer min-w-[30px]',
              language === 'km'
                ? 'bg-white text-[#2563EB] shadow-xs font-bold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            )}
            title="ភាសាខ្មែរ (KH)"
          >
            <span className="text-[11px] font-bold">KH</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={cn(
              'px-2.5 py-1 rounded-[4px] transition-colors flex items-center justify-center cursor-pointer min-w-[30px]',
              language === 'en'
                ? 'bg-white text-[#2563EB] shadow-xs font-bold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            )}
            title="English (EN)"
          >
            <span className="text-[11px] font-bold">EN</span>
          </button>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            type="button"
            aria-label="Notifications"
            className="relative p-2 rounded-[6px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition border border-[#E2E8F0] focus:outline-none cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2563EB]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-[8px] bg-white border border-[#E2E8F0] z-50 p-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E8F0]">
                <span className="text-[13px] font-bold text-[#0F172A]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-medium text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-[4px]">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-[#64748B]">
                    No notifications
                  </p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onMarkNotificationRead?.(n.id)}
                      className={cn(
                        'p-2.5 rounded-[6px] text-xs cursor-pointer transition border',
                        !n.isRead
                          ? 'bg-blue-50/60 border-blue-100 text-[#0F172A]'
                          : 'bg-white border-transparent text-[#64748B] hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-[#0F172A] text-xs">{n.title}</span>
                        <span className="text-[10px] text-[#64748B]">{n.timestamp}</span>
                      </div>
                      <p className="text-[12px] text-[#64748B] line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[13px] transition focus:outline-none"
          >
            <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left max-w-[120px]">
              <span className="text-[#0F172A] font-medium text-[13px] leading-tight truncate">
                {currentUser?.name || 'User'}
              </span>
              <span className="text-[11px] text-[#64748B] leading-none truncate">
                {displayRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-[8px] bg-white border border-[#E2E8F0] z-50 p-2 shadow-lg space-y-1">
              <div className="p-2 border-b border-[#E2E8F0] mb-1">
                <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                  {currentUser?.name || 'User'}
                </p>
                <p className="text-[11px] text-[#64748B] truncate">
                  {currentUser?.email || 'user@example.com'}
                </p>
                <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-[#0F172A]">
                  {displayRole}
                </span>
              </div>

              {onNavigate && (
                <>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate(isAdmin ? '/admin/profile' : '/profile');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[#0F172A] hover:bg-slate-50 font-normal transition text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#64748B]" />
                    <span>{t('nav_profile')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate('/settings/change-password');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[#0F172A] hover:bg-slate-50 font-normal transition text-left cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-[#64748B]" />
                    <span>{language === 'km' ? 'ប្តូរពាក្យសម្ងាត់' : 'Change Password'}</span>
                  </button>
                </>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[#DC2626] hover:bg-rose-50 font-normal transition text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-[#DC2626]" />
                  <span>{t('nav_logout')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
