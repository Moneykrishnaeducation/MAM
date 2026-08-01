import React, { useState } from 'react';
import Head from 'next/head';
import { Shield, Key, Smartphone, Eye, EyeOff, Monitor, History, Bell, ToggleLeft, ToggleRight, CheckCircle2 } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientPrivacyPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [activityAlerts, setActivityAlerts] = useState(true);

  return (
    <div className="flex min-h-screen font-sans antialiased text-slate-100 bg-[#060e24]">
      <Head>
        <title>Privacy & Security | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Shield className="text-blue-500" size={32} />
              Privacy & Security
            </h1>
            <p className="text-blue-300/70 mt-2 text-sm">
              Manage your account security, authentication methods, and privacy preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Security Settings */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Change Password Card */}
              <div className="bg-[#0b1736] border border-blue-900/50 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/5 blur-3xl pointer-events-none"></div>
                
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Key size={20} className="text-blue-400" />
                  Change Password
                </h2>
                
                <form className="space-y-5 relative z-10" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Current Password</label>
                    <input 
                      type="password" 
                      className="w-full bg-[#0e2152]/50 border border-blue-800/60 rounded-xl px-4 py-3 text-white placeholder-blue-300/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="••••••••••••"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">New Password</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          className="w-full bg-[#0e2152]/50 border border-blue-800/60 rounded-xl px-4 py-3 text-white placeholder-blue-300/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="••••••••••••"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3.5 text-blue-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Confirm Password</label>
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        className="w-full bg-[#0e2152]/50 border border-blue-800/60 rounded-xl px-4 py-3 text-white placeholder-blue-300/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Sessions */}
              <div className="bg-[#0b1736] border border-blue-900/50 rounded-3xl p-6 md:p-8 shadow-2xl">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <History size={20} className="text-emerald-400" />
                  Active Sessions
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0e2152]/40 border border-blue-800/40">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-900/50 flex items-center justify-center text-blue-400">
                        <Monitor size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          Windows 11 • Chrome
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider font-bold">Current</span>
                        </div>
                        <div className="text-xs text-blue-300 mt-1">IP: 192.168.1.1 • Last active: Just now</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0e2152]/20 border border-blue-800/20 hover:border-blue-800/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-900/30 flex items-center justify-center text-slate-400">
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">iPhone 14 Pro • Safari</div>
                        <div className="text-xs text-blue-300/70 mt-1">IP: 172.16.254.1 • Last active: 2 hours ago</div>
                      </div>
                    </div>
                    <button className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Preferences */}
            <div className="space-y-6">
              
              {/* 2FA Card */}
              <div className="bg-[#0b1736] border border-blue-900/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden group text-center">
                <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <Smartphone className="text-emerald-400" size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Two-Factor Auth</h3>
                <p className="text-xs text-blue-300/70 mb-6 px-2">
                  Add an extra layer of security to your account by requiring an authentication code.
                </p>
                
                {twoFactorEnabled ? (
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold">
                    <CheckCircle2 size={18} />
                    Enabled
                  </div>
                ) : (
                  <button 
                    onClick={() => setTwoFactorEnabled(true)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-lg"
                  >
                    Enable 2FA
                  </button>
                )}
                
                {twoFactorEnabled && (
                  <button 
                    onClick={() => setTwoFactorEnabled(false)}
                    className="block w-full text-xs text-slate-400 hover:text-white mt-4 transition-colors"
                  >
                    Disable Two-Factor
                  </button>
                )}
              </div>

              {/* Privacy Preferences */}
              <div className="bg-[#0b1736] border border-blue-900/50 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                  <Bell size={18} className="text-yellow-400" />
                  Communications
                </h2>
                
                <div className="space-y-5">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setActivityAlerts(!activityAlerts)}>
                    <div>
                      <div className="font-semibold text-sm text-white">Security Alerts</div>
                      <div className="text-[11px] text-blue-300/70 mt-0.5">Get emails about new logins</div>
                    </div>
                    {activityAlerts ? <ToggleRight size={32} className="text-emerald-500" /> : <ToggleLeft size={32} className="text-slate-600" />}
                  </div>
                  
                  <div className="w-full h-px bg-blue-900/40"></div>
                  
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setMarketingEmails(!marketingEmails)}>
                    <div>
                      <div className="font-semibold text-sm text-white">Marketing Emails</div>
                      <div className="text-[11px] text-blue-300/70 mt-0.5">Receive news and offers</div>
                    </div>
                    {marketingEmails ? <ToggleRight size={32} className="text-emerald-500" /> : <ToggleLeft size={32} className="text-slate-600" />}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}