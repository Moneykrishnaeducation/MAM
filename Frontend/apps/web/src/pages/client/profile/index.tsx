import React, { useState } from 'react';
import Head from 'next/head';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Key, 
  Bell, 
  BookOpen, 
  Lock, 
  Check, 
  Upload, 
  Activity, 
  Sliders,
  Sparkles
} from 'lucide-react';

export default function ClientProfilePage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'preferences' | 'activity'>('personal');
  const [showToast, setShowToast] = useState(false);
  const [riskTolerance, setRiskTolerance] = useState(70);

  const triggerSaveToast = (e: React.FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const activityLog = [
    { event: 'Logged in from New Device', device: 'Chrome / Windows (192.168.1.45)', time: 'Today, 4:32 PM', status: 'Success' },
    { event: 'Enrolled in Course', device: 'Advanced Financial Analysis', time: 'Yesterday, 11:20 AM', status: 'Completed' },
    { event: 'MAM Risk Preference Updated', device: 'Set to High Growth (70%)', time: '3 days ago', status: 'Success' },
    { event: 'Password Changed', device: 'IP: 182.43.22.10', time: 'July 15, 2026', status: 'Verified' },
  ];

  return (
    <>
      <Head>
        <title>My Profile | Client Portal</title>
        <meta name="description" content="View and manage your student profile and MAM preferences" />
      </Head>

      {/* Decorative background glows - Emerald and Teal to match Client Sidebar active theme */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="p-6 md:p-8 z-10 flex-1">
          {/* Toast Notification (Emerald theme) */}
          {showToast && (
            <div className="fixed bottom-6 right-6 bg-emerald-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 border border-emerald-400 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Check size={18} />
              <span>Profile Settings saved successfully!</span>
            </div>
          )}

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <Sparkles size={13} className="animate-pulse text-emerald-400" /> Student Center
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">My Profile</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your account information, safety controls, and MAM strategy settings.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - User Summary Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="relative group mb-4">
                    <img 
                      src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80" 
                      alt="Avatar" 
                      className="w-28 h-28 rounded-3xl object-cover border-4 border-emerald-500/40 shadow-xl transition-all duration-300 group-hover:scale-105"
                    />
                    <button className="absolute bottom-1 right-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2 rounded-xl border-4 border-slate-900 shadow-md transition-colors" title="Change Avatar">
                      <Upload size={14} />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-0.5">Alex Rivera</h3>
                  <p className="text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4 inline-flex items-center gap-1">
                    <BookOpen size={11} /> Premium Student
                  </p>

                  <div className="w-full space-y-3 pt-4 border-t border-slate-800/80 text-left text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Student ID</span>
                      <span className="text-slate-200 font-mono">#MAM-84920</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Join Date</span>
                      <span className="text-slate-200">Oct 14, 2025</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Account Type</span>
                      <span className="text-slate-200">Individual Trader</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Checklist Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <h4 className="font-bold text-sm text-slate-100 mb-4">Account Security Status</h4>
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Check size={12} />
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-slate-200">Email Verified</p>
                      <p className="text-slate-400">alex.rivera@example.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Check size={12} />
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-slate-200">Identity (KYC) Verified</p>
                      <p className="text-slate-400">Passport verified on Nov 02, 2025</p>
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
                        ? 'border-emerald-500 text-emerald-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User size={15} /> Personal Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'security' 
                        ? 'border-emerald-500 text-emerald-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield size={15} /> Password & Security
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'activity' 
                        ? 'border-emerald-500 text-emerald-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity size={15} /> Activity Log
                  </button>
                </div>

                {/* Tab: Personal Info */}
                {activeTab === 'personal' && (
                  <form onSubmit={triggerSaveToast} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">First Name</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <User size={15} className="text-slate-400" />
                          <input type="text" defaultValue="Alex" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Last Name</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <User size={15} className="text-slate-400" />
                          <input type="text" defaultValue="Rivera" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Email Address</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Mail size={15} className="text-slate-400" />
                          <input type="email" defaultValue="alex.rivera@example.com" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Phone Number</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Phone size={15} className="text-slate-400" />
                          <input type="text" defaultValue="+1 (555) 019-2834" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Country / Region</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <MapPin size={15} className="text-slate-400" />
                          <input type="text" defaultValue="United States" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Local Timezone</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Calendar size={15} className="text-slate-400" />
                          <input type="text" defaultValue="America/New_York (EST)" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md">
                      Save Profile Changes
                    </button>
                  </form>
                )}

                {/* Tab: Security */}
                {activeTab === 'security' && (
                  <form onSubmit={triggerSaveToast} className="space-y-6">
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Current Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Lock size={15} className="text-slate-400" />
                          <input type="password" placeholder="••••••••" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">New Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Key size={15} className="text-slate-400" />
                          <input type="password" placeholder="Min. 8 characters" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Confirm New Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Key size={15} className="text-slate-400" />
                          <input type="password" placeholder="Must match new password" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md">
                      Update Security Settings
                    </button>
                  </form>
                )}

                {/* Tab: Activity Log */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-slate-100">Audit History Log</h4>
                      <button className="text-[10px] text-emerald-400 hover:underline">Clear list</button>
                    </div>

                    <div className="border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800">
                      {activityLog.map((log, idx) => (
                        <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs hover:bg-slate-800/20 transition-colors">
                          <div>
                            <p className="font-semibold text-slate-200">{log.event}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5">{log.device}</p>
                          </div>
                          <div className="md:text-right flex items-center md:flex-col gap-2 md:gap-0.5 justify-between">
                            <span className="text-slate-300 text-[11px]">{log.time}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              {log.status}
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
      </>
  );
}
