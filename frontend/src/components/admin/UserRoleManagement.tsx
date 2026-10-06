import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  CreditCard,
  User,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Key,
  Shield,
  ArrowRightLeft,
  Check,
  X,
  ShieldAlert
} from 'lucide-react';
import {
  ManagedUser,
  UserRole
} from '../../types';
import {
  MOCK_MANAGED_USERS,
  CORE_ROLE_DEFINITIONS,
  PERMISSION_MATRIX_DATA
} from '../../data/mockData';

interface UserRoleManagementProps {
  currentUserRole: UserRole;
  onSwitchUserPersona?: (role: UserRole, user: ManagedUser) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  currentUserRole: _currentUserRole,
  onSwitchUserPersona,
  onShowToast
}) => {
  const [users, setUsers] = useState<ManagedUser[]>(MOCK_MANAGED_USERS);
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'overview'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  // Form State for Create/Edit
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('BORROWER');
  const [formDepartment, setFormDepartment] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('Password123!');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');

  // Actions
  const handleSuspendUser = (user: ManagedUser) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: 'SUSPENDED' as any } : u))
    );
    onShowToast?.(`Account for ${user.name} has been suspended.`, 'info');
  };

  const handleActivateUser = (user: ManagedUser) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: 'ACTIVE' as any } : u))
    );
    onShowToast?.(`Account for ${user.name} has been activated.`, 'success');
  };

  const handleResetPassword = (user: ManagedUser) => {
    const confirmed = window.confirm(`Reset password for user "${user.name}" (${user.username}) to "Password123!"?`);
    if (confirmed) {
      onShowToast?.(`Password for ${user.name} reset to "Password123!" successfully.`, 'success');
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;

      const matchesStatus =
        selectedStatusFilter === 'ALL' || u.status === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Counts
  const stats = useMemo(() => {
    const total = users.length;
    const managers = users.filter((u) => u.role === 'MANAGER').length;
    const cashiers = users.filter((u) => u.role === 'CASHIER').length;
    const borrowers = users.filter((u) => u.role === 'BORROWER').length;
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    return { total, managers, cashiers, borrowers, active };
  }, [users]);

  // Actions
  const handleToggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          onShowToast?.(`User ${u.name} status updated to ${nextStatus}`, 'info');
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const handleOpenCreateModal = () => {
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormRole('BORROWER');
    setFormDepartment('Academic Affairs');
    setFormPhone('');
    setFormPassword('Password123!');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormDepartment(user.department);
    setFormPhone(user.phone || '');
    setFormStatus((user.status as any) || 'ACTIVE');
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formUsername.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const newUser: ManagedUser = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: formName.trim(),
      username: formUsername.trim().toLowerCase(),
      email: formEmail.trim().toLowerCase(),
      role: formRole,
      title:
        formRole === 'MANAGER'
          ? 'Credit & System Administrator'
          : formRole === 'CASHIER'
          ? 'Desk Cashier & Bursar'
          : 'Enrolled Academic Borrower',
      department: formDepartment.trim() || 'General Lending',
      status: 'ACTIVE',
      phone: formPhone.trim() || '+855 12 000 000',
      avatar: formName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      createdAt: new Date().toISOString().slice(0, 10),
      lastLogin: 'Never'
    };

    setUsers((prev) => [newUser, ...prev]);
    setIsCreateModalOpen(false);
    onShowToast?.(`New user ${newUser.name} created as ${formRole}!`, 'success');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            name: formName.trim(),
            email: formEmail.trim(),
            role: formRole,
            department: formDepartment.trim(),
            phone: formPhone.trim(),
            status: formStatus
          };
        }
        return u;
      })
    );

    onShowToast?.(`User ${formName} updated successfully`, 'success');
    setEditingUser(null);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            Administrator
          </span>
        );
      case 'CASHIER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
            <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
            Cashier
          </span>
        );
      case 'BORROWER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
            <User className="w-3.5 h-3.5 text-[#D97706]" />
            Borrower
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs bg-slate-100 text-[#64748B] border border-[#CBD5E1]">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[8px] border border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            Security & Governance Center
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            User Roles & Access Control
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure institutional personas across 3 core roles:{' '}
            <strong className="text-[#0F172A]">Administrator</strong>,{' '}
            <strong className="text-[#2563EB]">Cashier</strong>, and{' '}
            <strong className="text-[#D97706]">Borrower</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-[6px] border transition-colors ${
              activeTab === 'matrix'
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5" />
            RBAC Matrix
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors flex items-center gap-1.5 border border-[#0F172A]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New User
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-4 rounded-[8px] border border-[#CBD5E1] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Accounts
            </p>
            <h3 className="text-xl font-bold text-[#0F172A] mt-1">{stats.total}</h3>
            <span className="text-xs text-[#16A34A] font-semibold inline-flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {stats.active} Active accounts
            </span>
          </div>
          <div className="w-10 h-10 rounded-[6px] bg-slate-100 border border-[#CBD5E1] flex items-center justify-center text-[#0F172A]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Admin / Manager */}
        <div className="bg-white p-4 rounded-[8px] border border-[#CBD5E1] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#0F172A] uppercase tracking-wider">
              Admin / Manager
            </p>
            <h3 className="text-xl font-bold text-[#0F172A] mt-1">{stats.managers}</h3>
            <span className="text-xs text-[#64748B] mt-1 block">Full Authority & Approvals</span>
          </div>
          <div className="w-10 h-10 rounded-[6px] bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Cashier */}
        <div className="bg-white p-4 rounded-[8px] border border-[#CBD5E1] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
              Cashier & POS
            </p>
            <h3 className="text-xl font-bold text-[#0F172A] mt-1">{stats.cashiers}</h3>
            <span className="text-xs text-[#64748B] mt-1 block">Disbursement & Receipts</span>
          </div>
          <div className="w-10 h-10 rounded-[6px] bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Borrower */}
        <div className="bg-white p-4 rounded-[8px] border border-[#CBD5E1] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#D97706] uppercase tracking-wider">
              Borrower Portal
            </p>
            <h3 className="text-xl font-bold text-[#0F172A] mt-1">{stats.borrowers}</h3>
            <span className="text-xs text-[#64748B] mt-1 block">Self-Service Students & Clients</span>
          </div>
          <div className="w-10 h-10 rounded-[6px] bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D97706]">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#CBD5E1]">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 px-4 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-[#0F172A] text-[#0F172A]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Users className="w-4 h-4" />
          User Directory ({filteredUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-2.5 px-4 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'matrix'
              ? 'border-[#0F172A] text-[#0F172A]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Role Permissions Matrix
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-4 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-[#0F172A] text-[#0F172A]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Shield className="w-4 h-4" />
          Role Architecture Overview
        </button>
      </div>

      {/* TAB 1: User Directory */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[8px] border border-[#CBD5E1] overflow-hidden">
          {/* Controls Bar */}
          <div className="p-3 border-b border-[#CBD5E1] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by name, email, department, or username..."
                className="w-full pl-9 pr-3 h-9 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] text-[#0F172A] placeholder-[#64748B]"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-[6px] border border-[#CBD5E1] text-xs">
                <span className="px-2 text-[#64748B] font-semibold text-[11px]">Role:</span>
                {(['ALL', 'MANAGER', 'CASHIER', 'BORROWER'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors ${
                      selectedRoleFilter === r
                        ? 'bg-[#0F172A] text-white'
                        : 'text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]'
                    }`}
                  >
                    {r === 'ALL'
                      ? 'All'
                      : r === 'MANAGER'
                      ? 'Admin'
                      : r === 'CASHIER'
                      ? 'Cashier'
                      : 'Borrower'}
                  </button>
                ))}
              </div>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-white border border-[#CBD5E1] rounded-[6px] px-2.5 h-9 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Status: All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#CBD5E1] text-[#64748B] text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">User & Profile</th>
                  <th className="py-2.5 px-3">Role & Privileges</th>
                  <th className="py-2.5 px-3">Department & Contact</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Activity</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD5E1] text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#64748B]">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-[4px] flex items-center justify-center font-bold text-xs border ${
                              user.role === 'MANAGER'
                                ? 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
                                : user.role === 'CASHIER'
                                ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                                : 'bg-amber-50 text-[#D97706] border-amber-200'
                            }`}
                          >
                            {user.avatar || user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                              {user.name}
                              {user.borrowerId && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[4px] bg-amber-50 text-[#D97706] border border-amber-200">
                                  {user.borrowerId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-mono">
                              @{user.username} • {user.title}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-2.5 px-3">{getRoleBadge(user.role)}</td>

                      {/* Contact & Department */}
                      <td className="py-2.5 px-3">
                        <div className="text-[#0F172A] text-xs font-medium">
                          {user.department}
                        </div>
                        <div className="text-[#64748B] text-[11px] flex items-center gap-2 mt-0.5">
                          <span>{user.email}</span>
                          {user.phone && <span>• {user.phone}</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-semibold transition-colors ${
                            user.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-[#64748B] border border-[#CBD5E1] hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'ACTIVE' ? 'bg-[#16A34A]' : 'bg-[#64748B]'
                            }`}
                          />
                          {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Last Activity */}
                      <td className="py-2.5 px-3 text-xs text-[#64748B] font-mono">
                        {user.lastLogin || '2026-10-03 09:00'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Suspend or Activate toggle */}
                          {user.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => handleActivateUser(user)}
                              className="p-1 text-[#16A34A] hover:bg-emerald-50 rounded-[4px] transition-colors"
                              title="Activate Suspended User"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspendUser(user)}
                              className="p-1 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded-[4px] transition-colors"
                              title="Suspend User Account"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="p-1 text-[#64748B] hover:text-[#D97706] hover:bg-amber-50 rounded-[4px] transition-colors"
                            title="Reset Password to Default"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Switch Persona */}
                          {onSwitchUserPersona && (
                            <button
                              onClick={() => onSwitchUserPersona(user.role, user)}
                              className="p-1 text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 rounded-[4px] transition-colors"
                              title={`Switch Persona to ${user.name} (${user.role})`}
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit User */}
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-[4px] transition-colors"
                            title="Edit User Details & Role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Role Permissions Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Role Cards Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(CORE_ROLE_DEFINITIONS).map(([key, def]) => (
              <div
                key={key}
                className="bg-white rounded-[8px] border border-[#CBD5E1] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]"
                    >
                      {def.badge}
                    </span>
                    <span className="text-xs font-mono text-[#64748B]">
                      {def.khmerLabel}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">{def.label}</h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    {def.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-[#CBD5E1]">
                    <h4 className="text-[11px] font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
                      Key Responsibilities:
                    </h4>
                    <ul className="space-y-1 text-xs text-[#64748B]">
                      {def.responsibilities.slice(0, 4).map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-[#CBD5E1] flex items-center justify-between text-xs text-[#64748B]">
                  <span>Assigned Users:</span>
                  <span className="font-semibold text-[#0F172A]">
                    {users.filter((u) => u.role === key).length} accounts
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-Side Permissions Table */}
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] overflow-hidden">
            <div className="p-4 border-b border-[#CBD5E1]">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Role-Based Access Control (RBAC) Matrix
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Comparative capability mapping across the 3 core LMS roles.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#CBD5E1] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <th className="py-2.5 px-3 w-1/4">System Module & Action</th>
                    <th className="py-2.5 px-3 w-1/3">Permission Description</th>
                    <th className="py-2.5 px-3 text-center text-[#0F172A] bg-slate-100/60">
                      Admin / Manager
                    </th>
                    <th className="py-2.5 px-3 text-center text-[#2563EB] bg-blue-50/50">
                      Cashier
                    </th>
                    <th className="py-2.5 px-3 text-center text-[#D97706] bg-amber-50/50">
                      Borrower
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBD5E1] text-xs">
                  {PERMISSION_MATRIX_DATA.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                        <span className="inline-block px-1.5 py-0.5 rounded-[4px] bg-slate-100 text-[#64748B] font-normal mr-2 border border-[#CBD5E1]">
                          {row.module}
                        </span>
                        {row.permission}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B]">{row.description}</td>

                      {/* Manager */}
                      <td className="py-2.5 px-3 text-center bg-slate-50/50">
                        {row.manager ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px] bg-emerald-100 text-[#16A34A] mx-auto border border-emerald-200">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px] bg-slate-100 text-slate-400 mx-auto border border-[#CBD5E1]">
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </td>

                      {/* Cashier */}
                      <td className="py-2.5 px-3 text-center bg-blue-50/20">
                        {row.cashier ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px] bg-emerald-100 text-[#16A34A] mx-auto border border-emerald-200">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px] bg-slate-100 text-slate-400 mx-auto border border-[#CBD5E1]">
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </td>

                      {/* Borrower */}
                      <td className="py-2.5 px-3 text-center bg-amber-50/20">
                        {row.borrower ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px] bg-emerald-100 text-[#16A34A] mx-auto border border-emerald-200">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px] bg-slate-100 text-slate-400 mx-auto border border-[#CBD5E1]">
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Overview & Architecture */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[8px] border border-[#CBD5E1] space-y-3">
            <div className="w-10 h-10 rounded-[6px] bg-slate-100 border border-[#CBD5E1] flex items-center justify-center text-[#0F172A]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">1. Admin / Manager</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Consolidates all executive duties including credit underwriting, committee
              decisioning, product limit definitions, and user security administration.
            </p>
            <div className="space-y-2 text-xs text-[#64748B]">
              <div className="p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#0F172A] block mb-0.5">Scope:</span>
                Institution-wide portfolio, full database read/write, audit logs
              </div>
              <div className="p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#0F172A] block mb-0.5">Typical Users:</span>
                Branch Managers, Credit Committee Heads, System Admins
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[8px] border border-[#CBD5E1] space-y-3">
            <div className="w-10 h-10 rounded-[6px] bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">2. Desk Cashier</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Focuses specifically on treasury movement, disbursing funds for approved
              applications, collecting repayments, and printing official receipts.
            </p>
            <div className="space-y-2 text-xs text-[#64748B]">
              <div className="p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#0F172A] block mb-0.5">Scope:</span>
                Cash desk register, POS terminal, waterfall repayments, overdue watchlist
              </div>
              <div className="p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#0F172A] block mb-0.5">Typical Users:</span>
                University Bursar, Counter Tellers, Cashiers
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[8px] border border-[#CBD5E1] space-y-3">
            <div className="w-10 h-10 rounded-[6px] bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D97706]">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">3. Academic Borrower</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Self-service customer experience with object-level isolation (users can only
              ever view their own loans, installments, and receipts).
            </p>
            <div className="space-y-2 text-xs text-[#64748B]">
              <div className="p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#0F172A] block mb-0.5">Scope:</span>
                Personal active loans, digital payment QR, statement generation
              </div>
              <div className="p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#0F172A] block mb-0.5">Typical Users:</span>
                University Students, Faculty Members, Personal Borrowers
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-[8px] max-w-lg w-full p-5 border border-[#CBD5E1] shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-[6px] bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Create New Account</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Assign role: Administrator, Cashier, or Borrower
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="mt-4 space-y-3">
              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Select User Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MANAGER', 'CASHIER', 'BORROWER'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRole(r)}
                      className={`p-2.5 rounded-[6px] border text-left transition-colors ${
                        formRole === r
                          ? 'border-[#0F172A] bg-slate-100 text-[#0F172A]'
                          : 'border-[#CBD5E1] hover:border-slate-400 text-[#64748B]'
                      }`}
                    >
                      <div className="font-bold text-xs">
                        {r === 'MANAGER'
                          ? 'Administrator'
                          : r === 'CASHIER'
                          ? 'Cashier'
                          : 'Borrower'}
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        {r === 'MANAGER'
                          ? 'Full Control'
                          : r === 'CASHIER'
                          ? 'POS & Receipts'
                          : 'Self-Service'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Username */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Dr. Chan Sophat"
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="e.g. c.sophat"
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] font-mono"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="user@loansystem.edu"
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+855 12 345 678"
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Department & Default Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Department / Faculty
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Finance & Treasury"
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] font-mono"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#CBD5E1] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-100 rounded-[6px] border border-[#CBD5E1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors"
                >
                  Save & Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER & ROLE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-[8px] max-w-lg w-full p-5 border border-[#CBD5E1] shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-[6px] bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Edit Account & Role
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Modifying @{editingUser.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              {/* Role Reassignment */}
              <div>
                <label className="block text-[11px] font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Assigned User Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MANAGER', 'CASHIER', 'BORROWER'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRole(r)}
                      className={`p-2.5 rounded-[6px] border text-left transition-colors ${
                        formRole === r
                          ? 'border-[#0F172A] bg-slate-100 text-[#0F172A]'
                          : 'border-[#CBD5E1] hover:border-slate-400 text-[#64748B]'
                      }`}
                    >
                      <div className="font-bold text-xs">
                        {r === 'MANAGER'
                          ? 'Administrator'
                          : r === 'CASHIER'
                          ? 'Cashier'
                          : 'Borrower'}
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        {r === 'MANAGER'
                          ? 'Full Control'
                          : r === 'CASHIER'
                          ? 'POS & Receipts'
                          : 'Self-Service'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Account Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#CBD5E1] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-100 rounded-[6px] border border-[#CBD5E1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
