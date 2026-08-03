import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
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
  LayoutGrid
} from 'lucide-react';
import GroupConfiguration from '../groups';
import GroupConfigurationDemo from '../groups-demo';

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

// Helper to check if user is superuser
function isSuperuser(): boolean {
  try {
    const userCookie = getCookie('user');
    if (userCookie) {
      try {
        const userFromCookie = JSON.parse(userCookie);
        return userFromCookie?.is_superuser === true || userFromCookie?.is_superuser === 'true';
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
  return false;
}

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
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'groups-demo'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<AdminUserRecord | null>(null);
  
  // Message Dialog State
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');

  // Role Edit Dialog State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserRow, setSelectedUserRow] = useState<AdminUserRecord | null>(null);
  const [editRoleValue, setEditRoleValue] = useState('admin');
  const [editPassword, setEditPassword] = useState('');

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
  const [error, setError] = useState<string | null>(null);
  const [isSuperuserUser, setIsSuperuserUser] = useState(false);

  const showMessage = (title: string, text: string) => {
    setMessageTitle(title);
    setMessageText(text);
    setIsMessageOpen(true);
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
    setIsSuperuserUser(isSuperuser());
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.firstName || !formData.lastName) {
      showMessage('Validation', 'Please provide first name, last name and email.');
      return;
    }

    setCreateLoading(true);
    try {
      const payload: any = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role.toLowerCase(),
        manager_admin_status: formData.role,
        phone_number: formData.phone || '',
        address: formData.address || '',
      };
      if (isSuperuserUser && formData.password) {
        payload.password = formData.password;
      }

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
        showMessage('Created', `Created user successfully.\nTemporary Password: ${body.temp_password}`);
      } else {
        showMessage('Created', body?.message || 'Admin/manager created successfully.');
      }
    } catch (err: any) {
      showMessage('Error creating admin', err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenStatusModal = (user: AdminUserRecord) => {
    setSelectedUserRow(user);
    setEditRoleValue(user.role.toLowerCase() === 'manager' ? 'manager' : 'admin');
    setEditPassword('');
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUserRow) return;
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

      setAdminUsers(prev => prev.map(u => u.id === selectedUserRow.id ? { ...u, role: editRoleValue === 'manager' ? 'Manager' : 'Admin' } : u));
      setIsRoleModalOpen(false);
      showMessage('Success', 'Profile updated successfully.');
    } catch (err: any) {
      showMessage('Error updating profile', err.message);
    }
  };

  const handleDeleteClick = (user: AdminUserRecord) => {
    setPendingDeleteItem(user);
    setIsConfirmDeleteOpen(true);
  };

  const performDeleteConfirmed = async () => {
    if (!pendingDeleteItem) return;
    const userId = pendingDeleteItem.userId;
    setIsConfirmDeleteOpen(false);
    setPendingDeleteItem(null);

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
      showMessage('Deleted', 'User deleted successfully.');
    } catch (err: any) {
      showMessage('Error deleting user', err.message);
    }
  };

  const filteredAdmins = useMemo(() => {
    return adminUsers.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'All' || u.role.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [adminUsers, searchTerm, roleFilter]);

  return (
    <>
      <Head>
        <title>Admin System Management | Admin Portal</title>
      </Head>

      <div className="p-6 md:p-8">
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <ShieldCheck size={13} /> Administrative Access & Configuration
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {activeTab === 'users' ? 'Admin Users Directory' : activeTab === 'groups' ? 'Real Group Configuration' : 'Demo Group Configuration'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage system administrators, permissions, MT5 groups and primary environment defaults.</p>
          </div>
          {activeTab === 'users' && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto"
            >
              <UserPlus size={16} /> Add Administrator
            </button>
          )}
        </div>

        {/* TAB TOGGLE BAR */}
        {isSuperuserUser && (
          <div className="flex flex-wrap items-center justify-start gap-2 p-2 rounded-2xl md:rounded-[2rem] w-full md:w-fit border mb-8 bg-slate-900/90 border-slate-800">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center justify-center gap-3 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === 'users' 
                  ? "bg-yellow-500 text-slate-950 shadow-xl shadow-yellow-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/10"
              }`}
            >
              <UserIcon size={14} />
              <span>Admin List</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center justify-center gap-3 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === 'groups' 
                  ? "bg-yellow-500 text-slate-950 shadow-xl shadow-yellow-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/10"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Groups</span>
            </button>
            <button
              onClick={() => setActiveTab('groups-demo')}
              className={`flex items-center justify-center gap-3 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === 'groups-demo' 
                  ? "bg-yellow-500 text-slate-950 shadow-xl shadow-yellow-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/10"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Demo Groups</span>
            </button>
          </div>
        )}

        {/* VIEW CONTAINER 1: USERS LIST */}
        {activeTab === 'users' && (
          <>
            {error && (
              <div className="flex items-center gap-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-500 mb-6">
                <AlertCircle className="shrink-0" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {/* SUMMARY STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-xs font-medium">Total Administrators</div>
                  <div className="text-3xl font-black text-white mt-1">{adminUsers.length} Accounts</div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck size={24} />
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-xs font-medium">Admins</div>
                  <div className="text-3xl font-black text-emerald-400 mt-1">
                    {adminUsers.filter(u => u.role.toLowerCase() === 'admin').length} Active
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Shield size={24} />
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-xs font-medium">Managers</div>
                  <div className="text-3xl font-black text-purple-400 mt-1">
                    {adminUsers.filter(u => u.role.toLowerCase() === 'manager').length} Active
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Lock size={24} />
                </div>
              </div>
            </div>

            {/* LIST TABLE CONTAINER */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-2.5 rounded-2xl w-full sm:w-96 border border-slate-700/50">
                  <Search size={16} className="text-slate-400 shrink-0" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter administrators..." 
                    className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-500" 
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-2xl border border-slate-700 bg-slate-800 py-2.5 px-4 text-xs font-semibold text-slate-300 outline-none transition focus:border-blue-500"
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-3 font-semibold">User ID</th>
                      <th className="pb-3 font-semibold">Name & Email</th>
                      <th className="pb-3 font-semibold">Role</th>
                      <th className="pb-3 font-semibold">Elevated Date</th>
                      {isSuperuserUser && <th className="pb-3 text-right font-semibold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-20 text-center">
                          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading directory...</p>
                        </td>
                      </tr>
                    ) : filteredAdmins.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-20 text-center text-slate-400">
                          <Shield className="mx-auto mb-4 text-slate-600 h-12 w-12" />
                          <p className="mb-1 text-base font-bold text-white">No administrators found</p>
                          <p className="text-xs text-slate-500">Refine search criteria or register a new user.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAdmins.map((user) => {
                        const { date, time } = formatDateTime(user.elevated);
                        return (
                          <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-4 font-mono text-blue-400 font-bold">{user.userId}</td>
                            <td className="py-4">
                              <div className="font-bold text-slate-100">{user.name}</div>
                              <div className="text-[11px] text-slate-400">{user.email}</div>
                            </td>
                            <td className="py-4">
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                                user.role === 'Admin' 
                                  ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' 
                                  : 'text-purple-400 bg-purple-500/10 border border-purple-500/20'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="font-medium text-slate-200">{date}</div>
                              {time && <div className="text-[10px] text-slate-500 font-mono mt-0.5">{time}</div>}
                            </td>
                            {isSuperuserUser && (
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenStatusModal(user)}
                                    className="p-1.5 rounded-lg border text-xs bg-slate-850 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-slate-950 transition-all"
                                    title="Edit User Profile"
                                  >
                                    <Pencil size={14} />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteClick(user)}
                                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-red-500/20 text-slate-450 hover:text-red-400 border border-slate-700/50 hover:border-red-500/30 transition-all"
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

        {/* VIEW CONTAINER 2: REAL GROUP CONFIG */}
        {activeTab === 'groups' && (
          <GroupConfiguration />
        )}

        {/* VIEW CONTAINER 3: DEMO GROUP CONFIG */}
        {activeTab === 'groups-demo' && (
          <GroupConfigurationDemo />
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-400" /> Add System Admin
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500 mt-1">Register access credentials</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">&times;</button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">First Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Last Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@moneykrishna.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              {isSuperuserUser && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Password</label>
                  <input 
                    type="password" 
                    placeholder="Master Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Physical Address</label>
                <textarea 
                  rows={2}
                  placeholder="Street, City, ZIP"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">System Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" disabled={createLoading} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50">
                  {createLoading ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-xs">
            <h3 className="text-base font-bold text-white mb-2">Confirm Delete</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to delete {pendingDeleteItem?.name || pendingDeleteItem?.email || ''}? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setIsConfirmDeleteOpen(false); setPendingDeleteItem(null); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
              <button onClick={performDeleteConfirmed} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGE MODAL */}
      {isMessageOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-xs">
            <h3 className="text-base font-bold text-white mb-2">{messageTitle}</h3>
            <p className="text-slate-300 whitespace-pre-line mb-6">{messageText}</p>
            <div className="flex justify-end">
              <button onClick={() => setIsMessageOpen(false)} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-xs">
            <h3 className="text-base font-bold text-white mb-2">Change User Role</h3>
            <p className="text-slate-400 mb-4">Select the new administrative access role for {selectedUserRow?.name}.</p>
            
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 font-mono uppercase tracking-widest text-[9px]">Role</label>
                <select
                  value={editRoleValue}
                  onChange={(e) => setEditRoleValue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setIsRoleModalOpen(false); setSelectedUserRow(null); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
              <button onClick={handleUpdateRole} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold">Update Role</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
