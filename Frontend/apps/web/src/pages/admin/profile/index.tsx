import React, { useState } from 'react';
import Head from 'next/head';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Key, 
  Bell, 
  Lock, 
  Check, 
  Upload, 
  Activity, 
  Sparkles,
  Terminal,
  Cpu
} from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

export default function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'privileges' | 'logs'>('personal');
  const [showToast, setShowToast] = useState(false);

  const triggerSaveToast = (e: React.FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const adminLogs = [
    { action: 'Approved Withdrawal Request #8492', target: 'User ID: 104', time: '10m ago', severity: 'Info' },
    { action: 'Updated Global Settings (MFA requirement)', target: 'Platform Core', time: '1h ago', severity: 'Warning' },
    { action: 'Deleted Inactive Student Account', target: 'User ID: 492', time: '3h ago', severity: 'Info' },
    { action: 'Authenticated Admin session', target: 'IP: 192.168.1.100', time: '4h ago', severity: 'Success' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Admin Profile | Admin Portal</title>
        <meta name="description" content="View and manage admin control credentials and platform privileges" />
      </Head>

      <AdminSidebar />

      <main className="flex-1 flex flex-col min-w-0 relative overflow-y-auto">
        {/* Decorative background glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <AdminHeader />

        <div className="p-6 md:p-8 z-10 flex-1">
          {/* Toast Notification */}
          {showToast && (
            <div className="fixed bottom-6 right-6 bg-blue-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center gap-2 border border-blue-400 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Check size={18} />
              <span>Admin credentials saved successfully!</span>
            </div>
          )}

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <Sparkles size={13} className="animate-pulse" /> Core Controls
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Profile</h1>
            <p className="text-slate-400 text-sm mt-1">Manage administrative details, credentials, and review activity audit logs.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Admin Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="relative group mb-4">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" 
                      alt="Admin Avatar" 
                      className="w-28 h-28 rounded-3xl object-cover border-4 border-blue-500/40 shadow-xl transition-all duration-300 group-hover:scale-105"
                    />
                    <button className="absolute bottom-1 right-1 bg-blue-500 hover:bg-blue-400 text-white p-2 rounded-xl border-4 border-slate-900 shadow-md transition-colors" title="Change Avatar">
                      <Upload size={14} />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-0.5">Admin Control</h3>
                  <p className="text-blue-400 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4 inline-flex items-center gap-1">
                    <Shield size={11} className="text-blue-400" /> Root Administrator
                  </p>

                  <div className="w-full space-y-3 pt-4 border-t border-slate-800/80 text-left text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Admin ID</span>
                      <span className="text-slate-200 font-mono">#ADM-0001</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Auth Tier</span>
                      <span className="text-slate-200">Level 5 (Superuser)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Server Node</span>
                      <span className="text-slate-200">Cluster-US-East</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Security Checklist */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <h4 className="font-bold text-sm text-slate-100 mb-4">Security Parameters</h4>
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Check size={12} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">IP Binding Lockout</p>
                      <p className="text-slate-400">Strict mode (authorized subnets)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Check size={12} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">Hardware FIDO Key</p>
                      <p className="text-slate-400">Yubikey registered and bound</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Check size={12} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">DB Superuser Encryption</p>
                      <p className="text-slate-400">Enabled (AES-GCM-256)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Navigation & Tabs Form */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-800 gap-6 mb-6 overflow-x-auto pb-1 scrollbar-hide">
                  <button 
                    onClick={() => setActiveTab('personal')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'personal' 
                        ? 'border-blue-500 text-blue-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User size={15} /> Personal Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'security' 
                        ? 'border-blue-500 text-blue-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Key size={15} /> Authentication & Access
                  </button>
                  <button 
                    onClick={() => setActiveTab('privileges')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'privileges' 
                        ? 'border-blue-500 text-blue-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Cpu size={15} /> System Privileges
                  </button>
                  <button 
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'logs' 
                        ? 'border-blue-500 text-blue-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Terminal size={15} /> Operations Audit Log
                  </button>
                </div>

                {/* Tab: Personal Info */}
                {activeTab === 'personal' && (
                  <form onSubmit={triggerSaveToast} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Admin Profile Name</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500 transition-colors">
                          <User size={15} className="text-slate-400" />
                          <input type="text" defaultValue="Admin Control" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Administrative Contact Email</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500 transition-colors">
                          <Mail size={15} className="text-slate-400" />
                          <input type="email" defaultValue="admin@moneykrishna.com" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Hotline Phone Link</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500 transition-colors">
                          <Phone size={15} className="text-slate-400" />
                          <input type="text" defaultValue="+1 (555) 012-4911" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Registration Cluster</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500 transition-colors">
                          <Calendar size={15} className="text-slate-400" />
                          <input type="text" defaultValue="Superuser Hub Main" disabled className="bg-transparent border-none text-slate-500 outline-none w-full text-xs" />
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md">
                      Update Personal Info
                    </button>
                  </form>
                )}

                {/* Tab: Security */}
                {activeTab === 'security' && (
                  <form onSubmit={triggerSaveToast} className="space-y-6">
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Current Superuser Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500 transition-colors">
                          <Lock size={15} className="text-slate-400" />
                          <input type="password" placeholder="••••••••" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">New Root Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500 transition-colors">
                          <Key size={15} className="text-slate-400" />
                          <input type="password" placeholder="Min 12 complex chars" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Verify Root Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-blue-500 transition-colors">
                          <Key size={15} className="text-slate-400" />
                          <input type="password" placeholder="Confirm match" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80">
                      <h4 className="text-xs font-bold text-slate-100 mb-2">Multifactor Authorization Hardware Token</h4>
                      <p className="text-xs text-slate-400 mb-4">Required for executing any DB drop, data migrations or global setting overrides.</p>
                      <button type="button" className="px-4 py-2 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors rounded-xl text-xs font-semibold">
                        Add Yubikey FIDO Device
                      </button>
                    </div>

                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md">
                      Apply Root Auth Upgrades
                    </button>
                  </form>
                )}

                {/* Tab: System Privileges */}
                {activeTab === 'privileges' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-sm text-slate-100 mb-2">Database and App Permissions</h3>
                      <p className="text-xs text-slate-400 mb-4">Review the access tokens and security scopes granted to this administrator profile.</p>

                      <div className="space-y-3.5">
                        <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">Database Access</p>
                            <p className="text-slate-500 text-[10px]">Read, Write, Update, Delete migrations</p>
                          </div>
                          <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Full Access</span>
                        </div>
                        <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">User Management</p>
                            <p className="text-slate-500 text-[10px]">Approve requests, KYC validation, Block users</p>
                          </div>
                          <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Full Access</span>
                        </div>
                        <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">System Parameters Override</p>
                            <p className="text-slate-500 text-[10px]">Change proxy configurations and credentials</p>
                          </div>
                          <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Full Access</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Logs */}
                {activeTab === 'logs' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-slate-100">Superuser Audit Trail</h4>
                      <button className="text-[10px] text-blue-400 hover:underline">Download system log dump (.csv)</button>
                    </div>

                    <div className="border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800">
                      {adminLogs.map((log, idx) => (
                        <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs hover:bg-slate-800/20 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                            <div>
                              <p className="font-semibold text-slate-200">{log.action}</p>
                              <p className="text-slate-400 text-[11px] mt-0.5">{log.target}</p>
                            </div>
                          </div>
                          <div className="md:text-right flex items-center md:flex-col gap-2 md:gap-0.5 justify-between ml-4 md:ml-0">
                            <span className="text-slate-300 text-[11px]">{log.time}</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                              {log.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
