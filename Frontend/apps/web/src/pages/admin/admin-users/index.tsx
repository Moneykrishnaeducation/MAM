import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast as sonnerToast } from 'sonner';
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Shield, 
  Lock, 
  User as UserIcon, 
  Trash2, 
  Pencil,
  AlertCircle,
  CheckCircle,
  LayoutGrid,
  X,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Key,
  RefreshCw,
  Sparkles,
  Clock,
  Filter
} from 'lucide-react';
import GroupConfiguration from '../groups';

// Helper to get a cookie value
function getCookie(name: string): string {
  try {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        let value = cookie.substring(nameEQ.length);
        try {
          return decodeURIComponent(value);
        } catch {
          return value;
        }
      }
    }
  } catch {}
  return '';
}

// Read the role cookie set by the backend on login
function getAdminRole(): string {
  try {
    const nameEQ = 'role=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        try {
          return decodeURIComponent(cookie.substring(nameEQ.length)).trim();
        } catch {
          return cookie.substring(nameEQ.length).trim();
        }
      }
    }
  } catch {}
  return '';
}

// Role helpers
const isSuperAdminRole = (role: string) => role.toLowerCase() === 'superadmin';
const isAdminOrAbove   = (role: string) => ['superadmin', 'admin'].includes(role.toLowerCase());
const isViewerOnly     = (role: string) => role.toLowerCase() === 'viewer';

const formatDateTime = (value: string) => {
  if (!value || value === "-") return { date: "N/A", time: "N/A" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: "" };

  return {
    date: date.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    time: date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

export interface AdminUserRecord {
  id: any;
  userId: any;
  name: string;
  email: string;
  role: string;
  elevated: string;
}

export default function AdminUsersManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<AdminUserRecord | null>(null);
  
  // Toast / Message Dialog State
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error'; title?: string } | null>(null);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);

  // Role Edit Dialog State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserRow, setSelectedUserRow] = useState<AdminUserRecord | null>(null);
  const [editRoleValue, setEditRoleValue] = useState('admin');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    role: 'Admin',
    password: '',
  });

  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateRoleLoading, setUpdateRoleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState('');

  const isViewer = useMemo(() => isViewerOnly(adminRole) || adminRole.toLowerCase() === 'viewer', [adminRole]);
  const canCreateAdmin = useMemo(() => isAdminOrAbove(adminRole) && !isViewer, [adminRole, isViewer]);

  const showToast = (message: string, variant: 'success' | 'error' = 'success', title?: string) => {
    setToast({ message, variant, title });
    if (variant === 'error') {
      sonnerToast.error(title ? `${title}: ${message}` : message);
    } else {
      sonnerToast.success(title ? `${title}: ${message}` : message);
    }
    setTimeout(() => setToast(null), 5000);
  };

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
          return;
        }
        setError(`Failed to fetch admins: ${res.status}`);
        return;
      }
      const resJson = await res.json();
      const items = Array.isArray(resJson.admin_users)
        ? resJson.admin_users
        : Array.isArray(resJson.admins)
        ? resJson.admins
        : Array.isArray(resJson.data)
        ? resJson.data
        : resJson.results || [];

      const mapped = items.map((user: any) => ({
        id: user.id,
        userId: user.userId ?? user.id ?? user.pk,
        name: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "-",
        email: user.email || "-",
        role: user.role || "-",
        elevated: user.created_at || user.elevated_date || user.lastLogin || "-",
      }));

      setAdminUsers(mapped);
    } catch (err: any) {
      setError(err.message || 'Error loading administrative users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAdminRole(getAdminRole());
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      showToast('Viewer accounts do not have permission to add administrators.', 'error', 'Permission Denied');
      return;
    }

    if (!formData.email || !formData.firstName || !formData.lastName) {
      showToast('Please provide first name, last name, and email.', 'error', 'Validation Error');
      return;
    }

    setCreateLoading(true);
    try {
      const payload: any = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        phone_number: formData.phone || '',
        address: formData.address || '',
        password: formData.password || '',
      };

      const res = await fetch('/api/admin/admin-users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || body?.error || `Failed with status ${res.status}`);
      }

      const newId = body?.user_id || body?.id || Date.now();
      const newEntry = {
        id: newId,
        userId: newId,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        role: formData.role,
        elevated: new Date().toISOString(),
      };

      setAdminUsers(prev => [newEntry, ...prev]);
      setIsCreateModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', address: '', role: 'Admin', password: '' });

      if (body?.temp_password) {
        showToast(`User created. Temp password: ${body.temp_password}`, 'success', 'Admin Account Created');
      } else {
        showToast(body?.message || 'Admin user created successfully.', 'success', 'Account Created');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error', 'Creation Error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenStatusModal = (user: AdminUserRecord) => {
    setSelectedUserRow(user);
    const normalizedRole = user.role.toLowerCase();
    setEditRoleValue(normalizedRole === 'superadmin' ? 'SuperAdmin' : normalizedRole === 'viewer' ? 'Viewer' : 'Admin');
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUserRow) return;
    setUpdateRoleLoading(true);
    try {
      const userId = selectedUserRow.userId;
      const payload: any = {
        role: editRoleValue,
        manager_admin_status: editRoleValue,
      };

      const res = await fetch(`/api/admin/admin-users/${userId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to update admin profile: status ${res.status}`);
      }

      setAdminUsers(prev => prev.map(u => u.id === selectedUserRow.id ? { ...u, role: editRoleValue } : u));
      setIsRoleModalOpen(false);
      showToast('Admin role updated successfully.', 'success', 'Role Updated');
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error', 'Update Error');
    } finally {
      setUpdateRoleLoading(false);
    }
  };

  const handleDeleteClick = (user: AdminUserRecord) => {
    setPendingDeleteItem(user);
    setIsConfirmDeleteOpen(true);
  };

  const performDeleteConfirmed = async () => {
    if (!pendingDeleteItem) return;
    const userId = pendingDeleteItem.userId;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Failed with status ${res.status}`);
      }

      setAdminUsers(prev => prev.filter(u => u.id !== pendingDeleteItem.id));
      setIsConfirmDeleteOpen(false);
      setPendingDeleteItem(null);
      showToast('Administrator user deleted successfully.', 'success', 'Account Removed');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error', 'Deletion Error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAdmins = useMemo(() => {
    return adminUsers.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            String(u.userId).includes(searchTerm);
      const matchesRole = roleFilter === 'All' || u.role.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [adminUsers, searchTerm, roleFilter]);

  const getInitials = (name: string) => {
    if (!name || name === '-') return 'AU';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <Head>
        <title>Admin System Management | Admin Portal</title>
      </Head>

      <div className="w-full min-h-screen bg-[#0c1c59] text-slate-100 font-sans antialiased">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10 space-y-5">
          
          {/* HEADER BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#081d5f] border border-[#2450b7] shadow-[0_30px_80px_rgba(4,15,54,0.3)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#040f33] border border-[#2450b7] flex items-center justify-center text-[#d4af37] shadow-inner shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] text-[10px] font-black uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-[#d4af37]" /> Governance & Credentials
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  {activeTab === 'users' ? 'Admin Directory' : 'MT5 Trade Group Config'}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] mt-1">
                  Manage administrative accounts, role permissions, and trading group configurations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'users' && canCreateAdmin && (
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white font-black px-4 py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-[#d4af37]/20 hover:scale-[1.02] active:scale-95 shrink-0"
                >
                  <UserPlus size={15} /> Add Administrator
                </button>
              )}
            </div>
          </div>

          {/* TAB TOGGLE BAR — SuperAdmin & Admin */}
          {isSuperAdminRole(adminRole) && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl border bg-[#081d5f] border-[#2450b7] w-fit shadow-[0_14px_30px_rgba(4,15,54,0.2)]">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
                  activeTab === 'users' 
                    ? "bg-[#2450b7] text-white shadow-inner font-bold" 
                    : "text-[#8fb8ff] hover:text-white hover:bg-[#123283]"
                }`}
              >
                <UserIcon size={14} className={activeTab === 'users' ? "text-[#d4af37]" : ""} />
                <span>Admin Users</span>
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
                  activeTab === 'groups' 
                    ? "bg-[#2450b7] text-white shadow-inner font-bold" 
                    : "text-[#8fb8ff] hover:text-white hover:bg-[#123283]"
                }`}
              >
                <LayoutGrid size={14} className={activeTab === 'groups' ? "text-[#d4af37]" : ""} />
                <span>Group Configuration</span>
              </button>
            </div>
          )}

          {/* VIEW CONTAINER 1: USERS LIST */}
          {activeTab === 'users' && (
            <>
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 backdrop-blur-md">
                  <AlertCircle className="shrink-0 w-5 h-5" />
                  <p className="text-xs font-semibold">{error}</p>
                </div>
              )}

              {/* SUMMARY STAT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#081d5f] border border-[#2450b7] rounded-2xl p-4 shadow-[0_14px_30px_rgba(4,15,54,0.3)] flex items-center justify-between">
                  <div>
                    <div className="text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest">Total Administrators</div>
                    <div className="text-2xl font-black text-white mt-0.5">{adminUsers.length} <span className="text-[10px] text-[#8fb8ff]/50 font-black uppercase tracking-widest">Accounts</span></div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2450b7]/20 border border-[#2450b7] flex items-center justify-center text-[#8fb8ff] shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                </div>

                <div className="bg-[#081d5f] border border-[#2450b7] rounded-2xl p-4 shadow-[0_14px_30px_rgba(4,15,54,0.3)] flex items-center justify-between">
                  <div>
                    <div className="text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest">SuperAdmins</div>
                    <div className="text-2xl font-black text-[#d4af37] mt-0.5">
                      {adminUsers.filter(u => u.role.toLowerCase() === 'superadmin').length} <span className="text-[10px] text-[#8fb8ff]/50 font-black uppercase tracking-widest">Users</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] shrink-0">
                    <Shield size={20} />
                  </div>
                </div>

                <div className="bg-[#081d5f] border border-[#2450b7] rounded-2xl p-4 shadow-[0_14px_30px_rgba(4,15,54,0.3)] flex items-center justify-between">
                  <div>
                    <div className="text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest">Admins / Viewers</div>
                    <div className="text-2xl font-black text-emerald-400 mt-0.5">
                      {adminUsers.filter(u => ['admin','viewer'].includes(u.role.toLowerCase())).length} <span className="text-[10px] text-[#8fb8ff]/50 font-black uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Lock size={20} />
                  </div>
                </div>
              </div>

              {/* LIST TABLE CONTAINER */}
              <div className="bg-[#081d5f] border border-[#2450b7] rounded-2xl p-4 sm:p-6 shadow-[0_30px_80px_rgba(4,15,54,0.3)]">
                {/* TOOLBAR */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#2450b7]">
                  <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d4af37]" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search name, email, role or ID..." 
                      className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl pl-10 pr-9 py-3 text-[11px] font-black uppercase tracking-widest text-white placeholder:text-[#8fb8ff]/40 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all shadow-inner" 
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0c1c59] border border-[#2450b7] text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest shadow-inner">
                      <Filter size={13} className="text-[#d4af37]" />
                      <span>Role:</span>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer"
                      >
                        <option value="All" className="bg-[#081d5f] text-white">All Roles</option>
                        <option value="SuperAdmin" className="bg-[#081d5f] text-white">SuperAdmin</option>
                        <option value="Admin" className="bg-[#081d5f] text-white">Admin</option>
                        <option value="Viewer" className="bg-[#081d5f] text-white">Viewer</option>
                      </select>
                    </div>

                    <div className="text-[10px] text-[#8fb8ff] font-black uppercase tracking-widest px-4 py-3 rounded-xl bg-[#0c1c59] border border-[#2450b7] shadow-inner">
                      Showing {filteredAdmins.length} of {adminUsers.length}
                    </div>
                  </div>
                </div>

                {/* TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[#8fb8ff] font-black uppercase tracking-widest text-[10px] border-b border-[#2450b7] pb-2">
                        <th className="pb-3 px-2">ID</th>
                        <th className="pb-3 px-2">Administrator Info</th>
                        <th className="pb-3 px-2">Access Role</th>
                        <th className="pb-3 px-2">Created / Elevated</th>
                        {canCreateAdmin && <th className="pb-3 px-2 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2450b7]/50">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center">
                            <div className="mx-auto mb-2.5 h-8 w-8 animate-spin rounded-full border-3 border-[#d4af37] border-t-transparent" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Loading directory...</p>
                          </td>
                        </tr>
                      ) : filteredAdmins.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400">
                            <Shield className="mx-auto mb-2 text-slate-600 h-8 w-8" />
                            <p className="mb-0.5 text-xs font-bold text-white">No administrators match your filter</p>
                            <p className="text-[11px] text-slate-500">Try adjusting your search query or role filter.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAdmins.map((user) => {
                          const { date, time } = formatDateTime(user.elevated);
                          const initials = getInitials(user.name);
                          const roleLower = user.role.toLowerCase();

                          return (
                            <tr key={user.id} className="hover:bg-[#123283]/20 transition-colors group">
                              <td className="py-4 px-2 font-black uppercase tracking-widest text-[10px] text-[#d4af37]">
                                {user.userId}
                              </td>
                              <td className="py-4 px-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-[#040f33] border border-[#2450b7] flex items-center justify-center font-black text-[#d4af37] text-[11px] shrink-0 shadow-inner group-hover:border-[#d4af37]/40 transition-colors">
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="font-black text-white text-[11px] uppercase tracking-wide">{user.name}</div>
                                    <div className="text-[10px] text-[#8fb8ff] font-black uppercase tracking-widest">{user.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border ${
                                  roleLower === 'superadmin'
                                    ? 'text-[#d4af37] bg-[#d4af37]/20 border-[#d4af37]/30'
                                    : roleLower === 'admin'
                                    ? 'text-[#8fb8ff] bg-[#2450b7]/40 border-[#2450b7]'
                                    : 'text-slate-400 bg-slate-500/15 border-slate-500/30'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    roleLower === 'superadmin' ? 'bg-[#d4af37]' : roleLower === 'admin' ? 'bg-[#8fb8ff]' : 'bg-slate-400'
                                  }`} />
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-4 px-2">
                                <div className="font-black uppercase tracking-widest text-white flex items-center gap-1.5 text-[10px]">
                                  <Clock className="w-3.5 h-3.5 text-[#8fb8ff]" />
                                  {date}
                                </div>
                                {time && <div className="text-[9px] text-[#8fb8ff]/70 font-black uppercase tracking-widest ml-5 mt-0.5">{time}</div>}
                              </td>
                              {canCreateAdmin && (
                                <td className="py-4 px-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenStatusModal(user)}
                                      className="p-2.5 rounded-xl bg-[#0c1c59] hover:bg-[#123283] text-[#d4af37] border border-[#2450b7] transition-all shadow-md"
                                      title="Edit Access Role"
                                    >
                                      <Pencil size={14} />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteClick(user)}
                                      className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all shadow-md"
                                      title="Delete Administrator"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* VIEW CONTAINER 2: GROUP CONFIG */}
          {activeTab === 'groups' && (
            <GroupConfiguration />
          )}

        </div>

        {/* CREATE ADMIN MODAL */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#081d5f] border border-[#2450b7] rounded-[2rem] p-5 sm:p-8 max-w-lg w-full shadow-[0_30px_80px_rgba(4,15,54,0.3)] relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 border-b border-[#2450b7] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center text-[#d4af37]">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white uppercase tracking-tight">Add System Administrator</h2>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#e6c687]">Register corporate credentials</p>
                  </div>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">First Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" />
                      <input 
                        type="text" 
                        required
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl pl-11 pr-4 py-3 text-white text-[11px] font-black uppercase tracking-widest placeholder:text-[#8fb8ff]/40 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Last Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" />
                      <input 
                        type="text" 
                        required
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl pl-11 pr-4 py-3 text-white text-[11px] font-black uppercase tracking-widest placeholder:text-[#8fb8ff]/40 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Corporate Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" />
                    <input 
                      type="email" 
                      required
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl pl-11 pr-4 py-3 text-white text-[11px] font-black uppercase tracking-widest placeholder:text-[#8fb8ff]/40 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Master Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" />
                    <input 
                      type={showPasswordInModal ? "text" : "password"} 
                      required
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl pl-11 pr-11 py-3 text-white text-[11px] font-black uppercase tracking-widest placeholder:text-[#8fb8ff]/40 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordInModal(prev => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8fb8ff] hover:text-white"
                    >
                      {showPasswordInModal ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" />
                      <input 
                        type="text" 
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl pl-11 pr-4 py-3 text-white text-[11px] font-black uppercase tracking-widest placeholder:text-[#8fb8ff]/40 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Access Role</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" />
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl pl-11 pr-4 py-3 text-white text-[11px] font-black uppercase tracking-widest outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all cursor-pointer shadow-inner"
                      >
                        {isSuperAdminRole(adminRole) && <option value="SuperAdmin" className="bg-[#081d5f]">Super Admin</option>}
                        <option value="Admin" className="bg-[#081d5f]">Admin</option>
                        <option value="Viewer" className="bg-[#081d5f]">Viewer</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Physical Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-[#d4af37]" />
                    <textarea 
                      rows={2}
                      placeholder="Street, City, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl pl-11 pr-4 py-3 text-white text-[11px] font-black uppercase tracking-widest placeholder:text-[#8fb8ff]/40 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all resize-none shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-5 mt-2 border-t border-[#2450b7]">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)} 
                    className="px-6 py-3.5 rounded-xl bg-[#0c1c59] border border-[#2450b7] text-[#8fb8ff] font-black text-[10px] uppercase tracking-widest hover:bg-[#123283] hover:text-white transition-all shadow-inner"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={createLoading} 
                    className="px-6 py-3.5 rounded-xl bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-[#d4af37]/20 disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {createLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Administrator'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRM DELETE MODAL */}
        {isConfirmDeleteOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#081d5f] border border-red-500/50 rounded-2xl p-6 max-w-sm w-full shadow-[0_30px_80px_rgba(4,15,54,0.3)] relative animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 mx-auto shadow-inner">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-black text-white text-center mb-2 uppercase tracking-tight">Confirm Account Removal</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] text-center mb-6 leading-relaxed">
                Are you sure you want to delete <span className="text-white bg-[#0c1c59] px-2 py-1 rounded-md border border-[#2450b7] ml-1 mr-1">{pendingDeleteItem?.name || pendingDeleteItem?.email || ''}</span>? This administrative access revocation cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={performDeleteConfirmed} 
                  disabled={deleteLoading}
                  className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-red-500/20 active:scale-95"
                >
                  {deleteLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Yes, Delete User'}
                </button>
                <button 
                  onClick={() => { setIsConfirmDeleteOpen(false); setPendingDeleteItem(null); }} 
                  className="w-full py-3.5 rounded-xl bg-[#0c1c59] text-[#8fb8ff] border border-[#2450b7] font-black text-[10px] uppercase tracking-widest hover:bg-[#123283] hover:text-white transition-all shadow-inner active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT ROLE MODAL */}
        {isRoleModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#081d5f] border border-[#2450b7] rounded-[2rem] p-6 max-w-sm w-full shadow-[0_30px_80px_rgba(4,15,54,0.3)] relative animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#2450b7]">
                <div className="w-12 h-12 rounded-xl bg-[#040f33] border border-[#2450b7] flex items-center justify-center text-[#d4af37] shadow-inner">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Modify Role</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] mt-1">{selectedUserRow?.name}</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[#8fb8ff] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Access Role Permission</label>
                  <select
                    value={editRoleValue}
                    onChange={(e) => setEditRoleValue(e.target.value)}
                    className="w-full bg-[#0c1c59] border border-[#2450b7] rounded-xl px-4 py-3 text-white text-[11px] font-black uppercase tracking-widest outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition-all cursor-pointer shadow-inner"
                  >
                    {isSuperAdminRole(adminRole) && <option value="SuperAdmin" className="bg-[#081d5f]">SuperAdmin</option>}
                    <option value="Admin" className="bg-[#081d5f]">Admin</option>
                    <option value="Viewer" className="bg-[#081d5f]">Viewer</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleUpdateRole} 
                  disabled={updateRoleLoading}
                  className="w-full py-4 rounded-xl bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#d4af37]/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {updateRoleLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Save Role Change'}
                </button>
                <button 
                  onClick={() => { setIsRoleModalOpen(false); setSelectedUserRow(null); }} 
                  className="w-full py-3.5 rounded-xl bg-[#0c1c59] text-[#8fb8ff] border border-[#2450b7] font-black text-[10px] uppercase tracking-widest hover:bg-[#123283] hover:text-white transition-all shadow-inner active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST CONTAINER */}
        {toast && (
          <div className="fixed top-20 right-8 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`w-auto max-w-sm px-5 py-4 rounded-2xl flex items-start gap-3 border shadow-2xl backdrop-blur-xl ${
              toast.variant === 'error' 
                ? 'bg-red-950/90 border-red-500/60 text-red-100 shadow-red-500/20' 
                : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-500/20'
            }`}>
              {toast.variant === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                {toast.title && (
                  <div className="text-xs font-black uppercase tracking-wider mb-0.5">
                    {toast.title}
                  </div>
                )}
                <div className="text-xs font-medium text-slate-200 whitespace-pre-line">{toast.message}</div>
              </div>
              <button 
                type="button" 
                onClick={() => setToast(null)} 
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
