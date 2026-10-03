import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ShieldCheck,
  CreditCard,
  User,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Key,
  Shield,
  ArrowRightLeft,
  Lock,
  Building,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import {
  ManagedUser,
  UserRole,
  RoleDefinition,
  PermissionMatrixRow
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
  currentUserRole,
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
            phone: formPhone.trim()
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Admin / Manager
          </span>
        );
      case 'CASHIER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            Cashier
          </span>
        );
      case 'BORROWER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <User className="w-3.5 h-3.5 text-amber-600" />
            Borrower
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            Security &amp; Governance Center
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            User Roles &amp; Access Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure system personas across 3 core roles:{' '}
            <strong className="text-indigo-700">Admin / Manager</strong>,{' '}
            <strong className="text-emerald-700">Cashier</strong>, and{' '}
            <strong className="text-amber-700">Borrower</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all border ${
              activeTab === 'matrix'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 inline mr-1.5" />
            RBAC Matrix
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add New User
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Accounts
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
            <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {stats.active} Active accounts
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Admin / Manager */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider font-semibold">
              Admin / Manager
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.managers}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Full Authority &amp; Approvals</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Cashier */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider font-semibold">
              Cashier &amp; POS
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.cashiers}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Disbursement &amp; Receipts</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Borrower */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider font-semibold">
              Borrower Portal
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.borrowers}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Self-Service Students &amp; Clients</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <User className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          User Directory ({filteredUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Role Permissions Matrix
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Role Architecture Overview
        </button>
      </div>

      {/* TAB 1: User Directory */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by name, email, department, or username..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                <span className="px-2 text-slate-400 font-medium">Role:</span>
                {(['ALL', 'MANAGER', 'CASHIER', 'BORROWER'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      selectedRoleFilter === r
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {r === 'ALL'
                      ? 'All'
                      : r === 'MANAGER'
                      ? 'Admin/Manager'
                      : r === 'CASHIER'
                      ? 'Cashier'
                      : 'Borrower'}
                  </button>
                ))}
              </div>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">User &amp; Profile</th>
                  <th className="py-3 px-4">Role &amp; Privileges</th>
                  <th className="py-3 px-4">Department &amp; Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
                              user.role === 'MANAGER'
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : user.role === 'CASHIER'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {user.avatar || user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {user.name}
                              {user.borrowerId && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  {user.borrowerId}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              @{user.username} • {user.title}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">{getRoleBadge(user.role)}</td>

                      {/* Contact & Department */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 text-xs font-medium">
                          {user.department}
                        </div>
                        <div className="text-slate-400 text-xs flex items-center gap-2 mt-0.5">
                          <span>{user.email}</span>
                          {user.phone && <span>• {user.phone}</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                            user.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {user.lastLogin || '2026-10-03 09:00'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Switch Persona */}
                          {onSwitchUserPersona && (
                            <button
                              onClick={() => onSwitchUserPersona(user.role, user)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title={`Switch Persona to ${user.name} (${user.role})`}
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit User */}
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.entries(CORE_ROLE_DEFINITIONS).map(([key, def]) => (
              <div
                key={key}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${def.color}`}
                    >
                      {def.badge}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {def.khmerLabel}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{def.label}</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {def.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Key Responsibilities:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {def.responsibilities.slice(0, 4).map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Assigned Users:</span>
                  <span className="font-semibold text-slate-800">
                    {users.filter((u) => u.role === key).length} accounts
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-Side Permissions Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Granular Role-Based Access Control (RBAC) Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Comparative capability mapping across the 3 core LMS roles.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4 w-1/4">System Module &amp; Action</th>
                    <th className="py-3 px-4 w-1/3">Permission Description</th>
                    <th className="py-3 px-4 text-center text-indigo-700 bg-indigo-50/50">
                      Admin / Manager
                    </th>
                    <th className="py-3 px-4 text-center text-emerald-700 bg-emerald-50/50">
                      Cashier
                    </th>
                    <th className="py-3 px-4 text-center text-amber-700 bg-amber-50/50">
                      Borrower
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {PERMISSION_MATRIX_DATA.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal mr-2">
                          {row.module}
                        </span>
                        {row.permission}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{row.description}</td>

                      {/* Manager */}
                      <td className="py-3 px-4 text-center bg-indigo-50/20">
                        {row.manager ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 mx-auto">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      {/* Cashier */}
                      <td className="py-3 px-4 text-center bg-emerald-50/20">
                        {row.cashier ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 mx-auto">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      {/* Borrower */}
                      <td className="py-3 px-4 text-center bg-amber-50/20">
                        {row.borrower ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 mx-auto">
                            <X className="w-3.5 h-3.5" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">1. Admin / Manager</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consolidates all executive duties including credit underwriting, committee
              decisioning, product limit definitions, and user security administration.
            </p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-900 block">Scope:</span>
                Institution-wide portfolio, full database read/write, audit logs
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-900 block">Typical Users:</span>
                Branch Managers, Credit Committee Heads, System Admins
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">2. Desk Cashier</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Focuses specifically on treasury movement, disbursing funds for approved
              applications, collecting repayments, and printing official receipts.
            </p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-900 block">Scope:</span>
                Cash desk register, POS terminal, waterfall repayments, overdue watchlist
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-900 block">Typical Users:</span>
                University Bursar, Counter Tellers, Cashiers
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">3. Academic Borrower</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Self-service customer experience with object-level isolation (users can only
              ever view their own loans, installments, and receipts).
            </p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-900 block">Scope:</span>
                Own borrower profile, loan application submissions, own repayment history
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-900 block">Typical Users:</span>
                Students, Faculty members, Academic micro-loan clients
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create New Account</h3>
                  <p className="text-xs text-slate-500">
                    Assign role: Admin/Manager, Cashier, or Borrower
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="mt-4 space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select User Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MANAGER', 'CASHIER', 'BORROWER'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRole(r)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formRole === r
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">
                        {r === 'MANAGER'
                          ? 'Admin / Manager'
                          : r === 'CASHIER'
                          ? 'Cashier'
                          : 'Borrower'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Dr. Chan Sophat"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="e.g. c.sophat"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="user@loansystem.edu"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+855 12 345 678"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Department & Default Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Department / Faculty
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Finance & Treasury"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
                >
                  Save &amp; Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER & ROLE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Edit Account &amp; Role
                  </h3>
                  <p className="text-xs text-slate-500">
                    Modifying @{editingUser.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              {/* Role Reassignment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned User Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MANAGER', 'CASHIER', 'BORROWER'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRole(r)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formRole === r
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">
                        {r === 'MANAGER'
                          ? 'Admin / Manager'
                          : r === 'CASHIER'
                          ? 'Cashier'
                          : 'Borrower'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
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
