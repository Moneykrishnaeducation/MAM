import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Settings, 
  Shield, 
  Bell, 
  Key, 
  Database, 
  Save, 
  Server, 
  Lock, 
  UserCheck, 
  RefreshCw,
  CheckCircle,
  Eye,
  EyeOff,
  HelpCircle,
  Cpu,
  Globe,
  Radio,
  FileText,
  Loader2
} from 'lucide-react';

export default function AdminSettingsPage() {
  // Form values
  const [brokerName, setBrokerName] = useState('VTIndex-MT5');
  const [serverAddress, setServerAddress] = useState('185.28.255.35');
  const [managerLogin, setManagerLogin] = useState('1055');
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [isMfaEnforced, setIsMfaEnforced] = useState(true);
  const [isSessionTimeout, setIsSessionTimeout] = useState(true);
  const [enrollmentAlerts, setEnrollmentAlerts] = useState(true);
  const [systemDigest, setSystemDigest] = useState(true);

  // States
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassChar, setShowPassChar] = useState(false);
  const [activeSection, setActiveSection] = useState<'broker' | 'security'  | 'notifications'>('broker');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast("Global configuration saved successfully!");
    }, 1200);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      showToast("Error: Passwords must match!");
      return;
    }
    showToast("Manager password updated successfully!");
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordReset(false);
  };

  // Sections navigation configurations
  const menuItems = [
    { id: 'broker', label: 'MT5 Connection', icon: Server, desc: 'Broker host and manager credentials' },
    { id: 'security', label: 'Security & Access', icon: Shield, desc: 'MFA, session lifetime rules' },
    { id: 'notifications', label: 'Alert Center', icon: Bell, desc: 'System alert & email notifications' },
  ] as const;

  return (
    <>
      <Head>
        <title>Settings | Admin Portal</title>
      </Head>

      <div className=" text-slate-100 p-4 md:p-8 relative overflow-hidden font-sans">
        {/* Futuristic Background Gradients */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none" />

        {/* Animated Toast Notification */}
        {toast && (
          <div className="fixed top-8 right-8 z-50 flex items-center gap-3 bg-slate-900/90 border border-blue-500/35 text-blue-400 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(59,130,246,0.2)] backdrop-blur-xl animate-in slide-in-from-right-5 duration-300">
            <CheckCircle size={18} className="text-emerald-400" />
            <span className="text-sm font-semibold text-slate-200">{toast}</span>
          </div>
        )}

        {/* ── Page Header ── */}
        <div className="max-w-6xl mx-auto mb-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Settings size={13} className="animate-spin-slow" /> Control Panel
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">System Settings</h1>
              <p className="text-slate-400 text-sm mt-0.5">Manage broker server integration, security criteria, and alert routes.</p>
            </div>
            
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold px-6 py-3 rounded-2xl text-xs transition-all shadow-[0_8px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_35px_rgba(59,130,246,0.45)] disabled:opacity-50 active:scale-97 cursor-pointer self-start md:self-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={15} /> Save Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Grid Container (macOS Style settings app layout) ── */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0f162e]/50 border border-white/[0.04] rounded-3xl p-5 backdrop-blur-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4 px-2">Settings Category</span>
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full text-left flex items-start gap-3.5 px-4 py-3 rounded-2xl transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white font-bold shadow-[0_10px_25px_rgba(37,99,235,0.25)]' 
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]'
                      }`}
                    >
                      <Icon size={18} className={`mt-0.5 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                      <div>
                        <div className="text-sm font-semibold leading-tight">{item.label}</div>
                        <div className={`text-[10px] mt-0.5 leading-snug ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE SYSTEM ENGINE STATS CARD */}
            <div className="bg-gradient-to-br from-[#0e162f]/60 to-[#0b0f20]/90 border border-white/[0.04] rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-blue-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">Terminal Connection Engine</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-white/[0.03]">
                  <span className="text-slate-400">Daemon status</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Online
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Server engine</span>
                  <span className="text-blue-400 font-bold font-mono">MT5-v1.89</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE SETTINGS WORKSPACE */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. MT5 CONNECTION MODULE */}
            {activeSection === 'broker' && (
              <div className="bg-[#0f1730]/40 border border-white/[0.05] rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3.5 pb-5 border-b border-white/[0.05]">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Server size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-lg">MT5 Integration parameters</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Control the system link credentials to the VT-Index broker server.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Broker Name</span>
                    </div>
                    <input 
                      type="text" 
                      value={brokerName}
                      onChange={(e) => setBrokerName(e.target.value)}
                      className="w-full bg-[#070b1a] border border-white/[0.08] hover:border-blue-500/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl px-4 py-3 text-slate-200 font-semibold transition-all text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Server Address</span>
                    </div>
                    <input 
                      type="text" 
                      value={serverAddress}
                      onChange={(e) => setServerAddress(e.target.value)}
                      className="w-full bg-[#070b1a] border border-white/[0.08] hover:border-blue-500/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl px-4 py-3 text-slate-200 font-semibold font-mono transition-all text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Manager Login</span>
                    </div>
                    <input 
                      type="text" 
                      value={managerLogin}
                      onChange={(e) => setManagerLogin(e.target.value)}
                      className="w-full bg-[#070b1a] border border-white/[0.08] hover:border-blue-500/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl px-4 py-3 text-slate-200 font-semibold font-mono transition-all text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Manager Password Status</span>
                    <div className="flex items-center justify-between gap-3 bg-[#070b1a]/50 border border-white/[0.05] rounded-2xl px-4 py-3 h-[46px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-slate-300 text-xs font-bold">Password is configured</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowPasswordReset(true)}
                        className="text-xs font-extrabold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw size={11} /> Reset Password
                      </button>
                    </div>
                  </div>
                </div>

                {/* MODAL / NESTED CARD FOR RESETTING PASSWORD */}
                {showPasswordReset && (
                  <div className="mt-8 bg-gradient-to-r from-slate-900 to-[#121935] border border-blue-500/20 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <Lock size={15} className="text-blue-400" />
                        <span className="text-xs font-bold text-slate-200">Update MT5 Password</span>
                      </div>
                      <button 
                        onClick={() => setShowPasswordReset(false)}
                        className="text-slate-500 hover:text-slate-300 transition-colors text-xs font-bold"
                      >
                        Close
                      </button>
                    </div>

                    <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 relative">
                          <label className="text-[11px] font-bold text-slate-450 uppercase">New Password</label>
                          <div className="relative">
                            <input 
                              type={showPassChar ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-[#070b1a] border border-white/[0.08] focus:border-blue-500 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-200 outline-none"
                            />
                            <button 
                              type="button"
                              onClick={() => setShowPassChar(!showPassChar)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                              {showPassChar ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-450 uppercase">Confirm Password</label>
                          <input 
                            type={showPassChar ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#070b1a] border border-white/[0.08] focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-[11px] transition-all cursor-pointer"
                        >
                          Confirm Reset
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowPasswordReset(false)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold px-4 py-2 rounded-xl text-[11px] transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* 2. SECURITY POLICY MODULE */}
            {activeSection === 'security' && (
              <div className="bg-[#0f1730]/40 border border-white/[0.05] rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3.5 pb-5 border-b border-white/[0.05]">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-lg">Access & Guard Policy</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Control panel safety guidelines and credentials protocols.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-5 bg-[#070b1a]/50 border border-white/[0.04] hover:border-blue-500/20 rounded-2xl cursor-pointer transition-all">
                    <div>
                      <span className="text-slate-200 text-sm font-bold block">Enforce Multi-Factor Auth (MFA)</span>
                      <span className="text-slate-500 text-xs block mt-0.5">Require auth codes at dashboard entry for security audits.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isMfaEnforced}
                      onChange={(e) => setIsMfaEnforced(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-[#070b1a] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-5 bg-[#070b1a]/50 border border-white/[0.04] hover:border-blue-500/20 rounded-2xl cursor-pointer transition-all">
                    <div>
                      <span className="text-slate-200 text-sm font-bold block">Administrator session timeout</span>
                      <span className="text-slate-500 text-xs block mt-0.5">Disconnect admin accounts automatically after 30 minutes.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isSessionTimeout}
                      onChange={(e) => setIsSessionTimeout(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-[#070b1a] cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 3. NOTIFICATIONS ALERTS MODULE */}
            {activeSection === 'notifications' && (
              <div className="bg-[#0f1730]/40 border border-white/[0.05] rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3.5 pb-5 border-b border-white/[0.05]">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Bell size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-lg">Notifications Center</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Control mail and terminal logs dispatch rules.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-5 bg-[#070b1a]/50 border border-white/[0.04] hover:border-blue-500/20 rounded-2xl cursor-pointer transition-all">
                    <div>
                      <span className="text-slate-200 text-sm font-bold block">Client Registration Logs</span>
                      <span className="text-slate-500 text-xs block mt-0.5">Send alerts whenever a client creates a trading account.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={enrollmentAlerts}
                      onChange={(e) => setEnrollmentAlerts(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-[#070b1a] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-5 bg-[#070b1a]/50 border border-white/[0.04] hover:border-blue-500/20 rounded-2xl cursor-pointer transition-all">
                    <div>
                      <span className="text-slate-200 text-sm font-bold block">Performance Digest Report</span>
                      <span className="text-slate-500 text-xs block mt-0.5">Generate daily diagnostic reports about connection latency.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={systemDigest}
                      onChange={(e) => setSystemDigest(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-[#070b1a] cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </>
  );
}

// Custom Close svg component
const X = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
