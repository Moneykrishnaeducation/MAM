import React from 'react';
import Head from 'next/head';
import { Settings, Shield, Bell, Key, Database, Save } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <>
      <Head>
        <title>Settings | Admin Portal</title>
      </Head>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Settings size={13} /> Global Configuration
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Platform Settings</h1>
              <p className="text-slate-400 text-sm mt-1">Configure global application parameters, security, and integration keys.</p>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto">
              <Save size={16} /> Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-blue-400" />
                <h3 className="font-bold text-slate-100 text-sm">Security & Auth</h3>
              </div>
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Enforce Multi-Factor Auth (MFA)</span>
                  <input type="checkbox" defaultChecked className="toggle rounded bg-slate-800" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Session Timeout (30 mins)</span>
                  <input type="checkbox" defaultChecked className="toggle rounded bg-slate-800" />
                </label>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">Email Notifications</h3>
              </div>
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Enrollment Alerts</span>
                  <input type="checkbox" defaultChecked className="toggle rounded bg-slate-800" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">System Performance Digest</span>
                  <input type="checkbox" defaultChecked className="toggle rounded bg-slate-800" />
                </label>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <Key size={20} className="text-purple-400" />
                <h3 className="font-bold text-slate-100 text-sm">API Gateway Keys</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Backend Django Proxy URL</span>
                  <input type="text" defaultValue="http://localhost:8000" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
