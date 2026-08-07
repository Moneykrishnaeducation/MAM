import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Check,
  Upload,
  Sparkles,
  Terminal,
  UserShield,
  Cpu,
} from 'lucide-react';

type TabKey = 'personal' | 'security' | 'privileges' | 'logs';

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: 'personal', label: 'Personal Details', icon: User },
  { key: 'security', label: 'Authentication', icon: Key },
  { key: 'privileges', label: 'Privileges', icon: Cpu },
];

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-800/80 ${className}`} />;
}

function SkeletonText({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-slate-800/80 ${className}`} />;
}

export default function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('');
  const [adminAvatar, setAdminAvatar] = useState('');
  const [adminDepartment, setAdminDepartment] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [adminLastLogin, setAdminLastLogin] = useState('');
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');

  const triggerSaveToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const loadAdminProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profile');
      if (!res.ok) {
        throw new Error(`Failed to load profile (${res.status})`);
      }
      const data = await res.json();
      const roleMap: Record<string, string> = {
        admin: 'Administrator',
        superadmin: 'Super Administrator',
        super_admin: 'Super Administrator',
        'super admin': 'Super Administrator',
        viewer: 'Viewer',
      };

      if (data?.admin_user) {
        setAdminId(data.admin_user.id || '');
        setAdminName(data.admin_user.name || '');
        setAdminEmail(data.admin_user.email || '');
        setAdminRole(roleMap[data.admin_user.role?.toLowerCase()] || data.admin_user.role || '');
        setAdminAvatar(data.admin_user.avatar || '');
        setAdminDepartment(data.admin_user.department || '');
        setAdminStatus(data.admin_user.status || '');
        setAdminLastLogin(data.admin_user.lastLogin || '');
        setAdminPermissions(Array.isArray(data.admin_user.permissions) ? data.admin_user.permissions : []);
      }
    } catch (err) {
      triggerSaveToast('Unable to load profile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const savePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: adminName, department: adminDepartment }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Failed to save profile');
      }
      triggerSaveToast('Personal info saved.');
    } catch (err) {
      triggerSaveToast((err as Error).message || 'Failed to save personal info');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== verifyPassword) {
      triggerSaveToast('New passwords do not match.');
      return;
    }

    if (!newPassword) {
      triggerSaveToast('Enter a new password to update.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Failed to update password');
      }
      setCurrentPassword('');
      setNewPassword('');
      setVerifyPassword('');
      triggerSaveToast('Password updated successfully.');
    } catch (err) {
      triggerSaveToast((err as Error).message || 'Failed to update password');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const openAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      const avatarData = reader.result;
      setSaving(true);
      try {
        const res = await fetch('/api/admin/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: avatarData }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || 'Failed to update avatar');
        }

        const responseData = await res.json().catch(() => ({}));
        setAdminAvatar(responseData?.admin_user?.avatar || avatarData);
        triggerSaveToast('Avatar updated successfully.');
      } catch (err) {
        triggerSaveToast((err as Error).message || 'Failed to update avatar');
        console.error(err);
      } finally {
        setSaving(false);
      }
    };

    reader.readAsDataURL(file);
  };

  useEffect(() => {
    loadAdminProfile();
  }, []);

  return (
    <>
      <Head>
        <title>Admin Profile | Admin Portal</title>
        <meta name="description" content="View and manage admin control credentials and platform privileges" />
      </Head>

      <div className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),linear-gradient(to_bottom,rgba(2,6,23,0.94),rgba(2,6,23,1))]" />
        <div className="absolute -top-32 left-[-4rem] h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-24 right-[-5rem] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-full max-w-7xl flex-1 flex-col gap-8 overflow-y-auto p-6 md:p-8">
          {showToast && (
            <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-slate-950/95 px-5 py-3 font-bold text-white shadow-lg shadow-amber-500/20 backdrop-blur">
              <Check size={18} />
              <span>{toastMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Sparkles size={13} className="animate-pulse" />
                Core Controls
              </div>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-4 lg:sticky lg:top-6">
                <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
                  <div className="relative flex flex-col items-center text-center">
                    <SkeletonBlock className="mb-5 h-32 w-32 rounded-[1.5rem]" />
                    <SkeletonBlock className="h-8 w-52 rounded-full" />
                    <SkeletonBlock className="mt-3 h-6 w-32 rounded-full" />

                    <div className="mt-6 w-full space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                          <div className="grid grid-cols-[120px_1fr] gap-3 p-3">
                            <SkeletonBlock className="h-4 w-24 rounded-full" />
                            <SkeletonText className="h-4 w-36 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* <div className="mt-6 w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left">
                      <SkeletonBlock className="h-4 w-28 rounded-full" />
                      <SkeletonText className="mt-3 h-3 w-full rounded-full" />
                      <SkeletonText className="mt-2 h-3 w-5/6 rounded-full" />
                    </div> */}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8">
                <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
                  <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <SkeletonBlock key={index} className="h-10 w-36 rounded-2xl" />
                    ))}
                  </div>

                  <div className="pt-5">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <SkeletonBlock className="h-4 w-36 rounded-full" />
                        <SkeletonBlock className="h-7 w-52 rounded-full" />
                        <SkeletonText className="h-3 w-72 rounded-full" />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="space-y-2">
                              <SkeletonBlock className="h-3 w-28 rounded-full" />
                              <SkeletonBlock className="h-12 w-full rounded-2xl" />
                            </div>
                          ))}
                        </div>

                        <SkeletonBlock className="h-11 w-44 rounded-2xl" />
                      </div>

                      <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <SkeletonBlock className="h-4 w-32 rounded-full" />
                        <SkeletonBlock className="h-7 w-48 rounded-full" />
                        <SkeletonText className="h-3 w-72 rounded-full" />
                        <div className="grid gap-3">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                              <SkeletonBlock className="h-3 w-20 rounded-full" />
                              <SkeletonBlock className="mt-2 h-4 w-32 rounded-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-4 lg:sticky lg:top-6">
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
                <div className="relative flex flex-col items-center text-center">
                  <div className="group relative mb-5">
                    <img
                      src={adminAvatar || ''}
                      alt="Admin Avatar"
                      className="h-32 w-32 rounded-[1.5rem] border border-blue-500/30 object-cover shadow-xl shadow-black/40 transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <button
                      type="button"
                      onClick={openAvatarPicker}
                      className="absolute bottom-2 right-2 rounded-xl border border-slate-900 bg-amber-500 p-2 text-white shadow-lg shadow-amber-500/30 transition-colors hover:bg-amber-400"
                      title="Change Avatar"
                    >
                      <Upload size={14} />
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAvatarFileChange(e.target.files?.[0])}
                    />
                  </div>

                  <h3 className="text-2xl font-bold text-white">{adminName || 'Admin Control'}</h3>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    <Shield size={11} />
                    {adminRole || 'Administrator'}
                  </p>

                  <div className="mt-6 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
                    <table className="text-left text-sm">
                      <tbody className="shadow-sm shadow-slate-800/20">
                        <tr>
                          <td className="w-1/3 px-3 py-3 text-[11px] font-semibold uppercase  text-slate-500">
                            Email
                          </td>
                          <td className="px-3 py-3 text-slate-100 break-all">
                            {adminEmail || "N/A"}
                          </td>
                        </tr>

                        <tr>
                          <td className="px-3 py-3 text-[11px] font-semibold uppercase  text-slate-500">
                            Department
                          </td>
                          <td className="px-3 py-3 text-slate-100">
                            {adminDepartment || "Operations"}
                          </td>
                        </tr>

                        <tr>
                          <td className="px-3 py-3 text-[11px] font-semibold uppercase  text-slate-500">
                            Last Login
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 text-slate-100">
                              <Calendar size={15} className="text-amber-400" />
                              {adminLastLogin || "Not available"}
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td className="px-3 py-3 text-[11px] font-semibold uppercase  text-slate-500">
                            Account Status
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${adminStatus === "Active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}
                            >
                              <span className="h-2 w-2 rounded-full bg-current" />
                              {adminStatus || "Active"}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-semibold transition-all ${active
                          ? 'border-amber-500/30 bg-amber-500/15 text-amber-300 shadow-lg shadow-amber-500/10'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-5">
                  {activeTab === 'personal' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                      <form onSubmit={savePersonalInfo} className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <div>
                          <p className="text-xs font-semibold uppercase  text-slate-500">Personal Information</p>
                          <h3 className="mt-2 text-lg font-bold text-white">Edit profile details</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400"> Name</label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 focus-within:border-amber-500/50">
                              <User size={15} className="text-slate-400" />
                              <input
                                type="text"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                                className="w-full border-none bg-transparent text-sm text-slate-100 outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/40 px-4 py-3">
                              <Mail size={15} className="text-slate-400" />
                              <input
                                type="email"
                                value={adminEmail}
                                disabled
                                className="w-full border-none bg-transparent text-sm text-slate-500 outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Department / Team</label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 focus-within:border-blue-500/50">
                              <Shield size={15} className="text-slate-400" />
                              <input
                                type="text"
                                value={adminDepartment}
                                onChange={(e) => setAdminDepartment(e.target.value)}
                                className="w-full border-none bg-transparent text-sm text-slate-100 outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Registration Cluster</label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/40 px-4 py-3">
                              <UserShield size={15} className="text-slate-400" />
                              <input
                                type="text"
                                value={adminRole}
                                onChange={(e) => setAdminRole(e.target.value)}
                                className="w-full border-none bg-transparent text-sm text-slate-100 outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={saving}
                        className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-6 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? 'Saving...' : 'Update Personal Info'}
                        </button>
                      </form>

                      <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <div>
                          <p className="text-xs font-semibold uppercase  text-slate-500">Profile Summary</p>
                          <h3 className="mt-2 text-lg font-bold text-white">Live account snapshot</h3>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                          <table className="w-full">
                            <tbody className="shadow-sm shadow-slate-800/20">
                              <tr>
                                <td className="w-40 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Admin ID
                                </td>
                                <td className="px-3 py-3 text-sm font-medium text-slate-100">
                                  {adminId || "N/A"}
                                </td>
                              </tr>

                              <tr>
                                <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Role
                                </td>
                                <td className="px-3 py-3 text-sm font-medium text-slate-100">
                                  {adminRole || "Administrator"}
                                </td>
                              </tr>

                              <tr>
                                <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Department
                                </td>
                                <td className="px-3 py-3 text-sm font-medium text-slate-100">
                                  {adminDepartment || "Operations"}
                                </td>
                              </tr>

                              <tr>
                                <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Status
                                </td>
                                <td className="px-3 py-3">
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${adminStatus === "Active"
                                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                        : "border border-red-500/20 bg-red-500/10 text-red-400"
                                      }`}
                                  >
                                    <span className="h-2 w-2 rounded-full bg-current" />
                                    {adminStatus || "Active"}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                      <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <div>
                          <p className="text-xs font-semibold uppercase  text-slate-500">Security</p>
                          <h3 className="mt-2 text-lg font-bold text-white">Authentication & access</h3>
                          <p className="mt-1 text-xs text-slate-400">Use this panel to rotate the admin password and tighten access credentials.</p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase  text-slate-500">
                            <Lock size={13} />
                            Security posture
                          </div>
                          <ul className="mt-3 space-y-2 text-xs leading-6 text-slate-400">
                            <li>- Password changes apply immediately to the current administrator profile.</li>
                            <li>- Keep the new root password unique and at least 8 characters long.</li>
                            <li>- Verify the confirmation field before submitting the form.</li>
                          </ul>
                        </div>
                      </div>

                      <form onSubmit={saveSecurity} className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <div>
                          <p className="text-xs font-semibold uppercase  text-slate-500">Password rotation</p>
                          <h3 className="mt-2 text-lg font-bold text-white">Update root credentials</h3>
                          <p className="mt-1 text-xs text-slate-400">Enter the current password, then define and confirm the new value.</p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Superuser Password</label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 focus-within:border-amber-500/50">
                              <Lock size={15} className="text-slate-400" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="********"
                                className="w-full border-none bg-transparent text-sm text-slate-100 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="text-slate-400 transition hover:text-amber-400"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">New Root Password</label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 focus-within:border-amber-500/50">
                              <Key size={15} className="text-slate-400" />
                              <input
                                type={showPassword1 ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min 8 complex chars"
                                className="w-full border-none bg-transparent text-sm text-slate-100 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword1((prev) => !prev)}
                                className="text-slate-400 transition hover:text-amber-400"
                                aria-label={showPassword1 ? 'Hide password' : 'Show password'}
                              >
                                {showPassword1 ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Verify Root Password</label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 focus-within:border-amber-500/50">
                              <Key size={15} className="text-slate-400" />
                              <input
                                type={showPassword2 ? 'text' : 'password'}
                                value={verifyPassword}
                                onChange={(e) => setVerifyPassword(e.target.value)}
                                placeholder="Confirm match"
                                className="w-full border-none bg-transparent text-sm text-slate-100 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword2((prev) => !prev)}
                                className="text-slate-400 transition hover:text-amber-400"
                                aria-label={showPassword2 ? 'Hide password' : 'Show password'}
                              >
                                {showPassword2 ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={saving}
                        className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-6 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? 'Saving...' : 'Apply Root Auth Upgrades'}
                        </button>
                      </form>
                    </div>
                  )}

                  {activeTab === 'privileges' && (
                    <div className="space-y-6">
                      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 p-6 shadow-2xl">
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.95),transparent_24%)]" />
                        <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                          <div className="space-y-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                <Cpu size={20} />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-100">Database and App Permissions</h3>
                                <p className="text-xs text-slate-400">Review the access tokens and security scopes granted to this administrator profile.</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                                <p className="text-[10px] uppercase  text-slate-500">Role</p>
                                <p className="mt-2 text-sm font-semibold text-slate-100">{adminRole || 'Administrator'}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                                <p className="text-[10px] uppercase  text-slate-500">Department</p>
                                <p className="mt-2 text-sm font-semibold text-slate-100">{adminDepartment || 'Operations'}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                                <p className="text-[10px] uppercase  text-slate-500">Scopes</p>
                                <p className="mt-2 text-sm font-semibold text-slate-100">{adminPermissions.length} active</p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-100">Assigned Permissions</p>
                                <p className="text-[11px] text-slate-500">Directly loaded from `/api/admin/profile`</p>
                              </div>
                              <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400">
                                Live
                              </div>
                            </div>

                            {adminPermissions.length > 0 ? (
                              <div className="flex flex-wrap gap-3">
                                {adminPermissions.map((permission) => (
                                  <div
                                    key={permission}
                                    className="group flex min-w-[180px] flex-1 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 transition-all hover:border-blue-500/30 hover:bg-slate-900"
                                  >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                      <Key size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-100">{permission}</p>
                                      <p className="text-[10px] text-slate-500">Enabled through admin access scope</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
                                No explicit permissions are assigned to this administrator profile.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                )}

                </div>
              </div>
            </div>
          </div>)}
      </div>
      </div>
    </>
  );
}
