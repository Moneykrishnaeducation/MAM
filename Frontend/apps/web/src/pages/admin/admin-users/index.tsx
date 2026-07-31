import React, { useState } from 'react';
import Head from 'next/head';
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Key, 
  Shield, 
  Lock, 
  Mail, 
  User, 
  Trash2, 
  Power,
  Sliders,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Operations Manager' | 'Finance Manager' | 'Support Admin';
  department: string;
  permissions: string[];
  status: 'Active' | 'Suspended';
  lastLogin: string;
  avatar: string;
}

export default function AdminUsersManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Create Admin
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Operations Manager' as AdminUser['role'],
    department: 'Operations',
    permissions: ['User Approvals', 'View Reports'],
    password: '',
  });

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([
    {
      id: 'ADM-001',
      name: 'Super Admin',
      email: 'admin@moneykrishna.com',
      role: 'Super Admin',
      department: 'Executive Management',
      permissions: ['Full System Control', 'Financial Transfers', 'User Approvals', 'Audit Logs'],
      status: 'Active',
      lastLogin: 'Just now',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    {
      id: 'ADM-002',
      name: 'Robert Vance',
      email: 'robert.vance@moneykrishna.com',
      role: 'Operations Manager',
      department: 'Course & Student Ops',
      permissions: ['User Approvals', 'View Reports'],
      status: 'Active',
      lastLogin: '25m ago',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80',
    },
    {
      id: 'ADM-003',
      name: 'Sarah Jenkins',
      email: 'sarah.j@moneykrishna.com',
      role: 'Finance Manager',
      department: 'Financial Compliance',
      permissions: ['Financial Transfers', 'Audit Logs'],
      status: 'Active',
      lastLogin: '2h ago',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    },
    {
      id: 'ADM-004',
      name: 'David Sterling',
      email: 'd.sterling@moneykrishna.com',
      role: 'Support Admin',
      department: 'IT & Platform Support',
      permissions: ['User Approvals'],
      status: 'Suspended',
      lastLogin: '3 days ago',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Please fill out the name and email address.');
      return;
    }

    const newAdmin: AdminUser = {
      id: `ADM-00${adminUsers.length + 1}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department: formData.department,
      permissions: formData.permissions,
      status: 'Active',
      lastLogin: 'Never',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    };

    setAdminUsers([newAdmin, ...adminUsers]);
    setIsModalOpen(false);
    showToast(`New Admin User "${formData.name}" (${formData.role}) created successfully!`);
    
    // Reset Form
    setFormData({
      name: '',
      email: '',
      role: 'Operations Manager',
      department: 'Operations',
      permissions: ['User Approvals', 'View Reports'],
      password: '',
    });
  };

  const toggleAdminStatus = (id: string, currentName: string, currentStatus: string) => {
    setAdminUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
        showToast(`Admin ${currentName} status changed to ${nextStatus}`);
        return { ...u, status: nextStatus as AdminUser['status'] };
      }
      return u;
    }));
  };

  const handleRevokeAdmin = (id: string, name: string) => {
    if (confirm(`Are you sure you want to revoke administrative access for ${name}?`)) {
      setAdminUsers(prev => prev.filter(u => u.id !== id));
      showToast(`Admin access for ${name} revoked.`);
    }
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: exists 
          ? prev.permissions.filter(p => p !== perm) 
          : [...prev.permissions, perm],
      };
    });
  };

  const filteredAdmins = adminUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Admin Users Management | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />

        <div className="p-6 md:p-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <ShieldCheck size={13} /> Administrative Access Control
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Users Directory</h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage administrative accounts, role permissions, and onboard new system administrators.
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-600/20 self-start md:self-auto"
            >
              <UserPlus size={16} /> Create Admin User
            </button>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">Total System Admins</div>
                <div className="text-3xl font-black text-white mt-1">{adminUsers.length} Accounts</div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <ShieldCheck size={24} />
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">Super Admins</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {adminUsers.filter(u => u.role === 'Super Admin').length} Superusers
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield size={24} />
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">Active Credentials</div>
                <div className="text-3xl font-black text-purple-400 mt-1">
                  {adminUsers.filter(u => u.status === 'Active').length} Active
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Lock size={24} />
              </div>
            </div>
          </div>

          {/* Admin Users Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-2.5 rounded-2xl w-72 md:w-96 border border-slate-700/50">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter admin users by name, email, or role..." 
                  className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-500" 
                />
              </div>
              <span className="text-xs text-slate-400 font-medium">Admins Count: <strong className="text-white">{filteredAdmins.length}</strong></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-3 font-semibold">Admin ID</th>
                    <th className="pb-3 font-semibold">Name & Email</th>
                    <th className="pb-3 font-semibold">Role / Department</th>
                    <th className="pb-3 font-semibold">Assigned Permissions</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Last Login</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAdmins.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 font-mono text-blue-400 font-bold">{adm.id}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img src={adm.avatar} alt={adm.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700" />
                          <div>
                            <div className="font-bold text-slate-100">{adm.name}</div>
                            <div className="text-[11px] text-slate-400">{adm.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-slate-200">{adm.role}</div>
                        <div className="text-[11px] text-slate-400">{adm.department}</div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1">
                          {adm.permissions.map((p, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          adm.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {adm.status === 'Active' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                          {adm.status}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400">{adm.lastLogin}</td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleAdminStatus(adm.id, adm.name, adm.status)}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              adm.status === 'Active' 
                                ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border-slate-700'
                                : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border-emerald-500/30'
                            }`}
                            title="Toggle Admin Access"
                          >
                            <Power size={14} />
                          </button>

                          {adm.role !== 'Super Admin' && (
                            <button
                              onClick={() => handleRevokeAdmin(adm.id, adm.name)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors"
                              title="Revoke Admin Access"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* CREATE ADMIN USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 relative">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-400" /> Create New Admin User
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Onboard a new administrator and assign system privileges.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                  <User size={16} className="text-slate-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-transparent border-none text-white outline-none w-full placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Email Address</label>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                  <Mail size={16} className="text-slate-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="jane.doe@moneykrishna.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-transparent border-none text-white outline-none w-full placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Admin Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminUser['role'] })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Operations Manager">Operations Manager</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Support Admin">Support Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department</label>
                  <input 
                    type="text" 
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Assigned System Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Full System Control', 'User Approvals', 'Financial Transfers', 'Audit Logs', 'View Reports'].map((perm) => {
                    const checked = formData.permissions.includes(perm);
                    return (
                      <button
                        type="button"
                        key={perm}
                        onClick={() => togglePermission(perm)}
                        className={`p-2 rounded-xl border text-[11px] font-semibold text-left transition-all flex items-center justify-between ${
                          checked 
                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' 
                            : 'bg-slate-800/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>{perm}</span>
                        {checked && <CheckCircle2 size={13} className="text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                  <Key size={16} className="text-slate-400" />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-transparent border-none text-white outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20"
                >
                  Create Admin User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
