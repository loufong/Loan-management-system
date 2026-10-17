import React from 'react';
import { UserProfile } from '../../types';
import {
  ADMIN_SECTIONS,
  USER_SECTIONS,
  isRouteActive,
  NavItemConfig,
} from '../../navigation/navigation';
import { Landmark, LogOut, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SidebarProps {
  currentUser: UserProfile;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentPath,
  onNavigate,
  onLogout,
  onCloseMobileDrawer,
}) => {
  const role = (currentUser.role || 'USER').toUpperCase();
  const isAdmin = role === 'ADMIN';

  const sections = isAdmin ? ADMIN_SECTIONS : USER_SECTIONS;

  const handleItemClick = (item: NavItemConfig) => {
    onNavigate(item.path);
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
      className="w-64 h-full bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col justify-between select-none"
    >
      {/* 1. Header: Branding & System Name */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#E2E8F0] shrink-0">
          <div className="w-9 h-9 rounded-[6px] bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-[#0F172A] tracking-tight truncate leading-tight">
              Apex LMS
            </span>
            <span className="text-[11px] font-medium text-[#64748B] truncate leading-tight mt-0.5">
              Loan Management
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
                  {section.sectionTitle}
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
                      'w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] transition-colors text-left font-medium',
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
                    <span className="truncate">{item.label}</span>
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
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] hover:bg-[#F8FAFC] transition text-left border border-transparent hover:border-[#E2E8F0]"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 text-[#0F172A] flex items-center justify-center font-bold text-xs shrink-0 border border-[#CBD5E1]">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-semibold text-[#0F172A] truncate leading-tight">
              {currentUser.name || currentUser.fullName || 'User'}
            </span>
            <span className="text-[11px] text-[#64748B] truncate leading-tight mt-0.5">
              {isAdmin ? 'Administrator' : 'User'}
            </span>
          </div>
        </button>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-medium text-[#DC2626] hover:bg-rose-50 hover:text-red-700 transition text-left"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0 text-[#DC2626]" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
