import React from 'react';
import Head from 'next/head';
import { UserCheck, Search, Plus, Shield } from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

export default function AdminManagersPage() {
  const managers = [
    { id: 'MGR-101', name: 'Robert Vance', department: 'Course Operations', team: '12 Instructors', status: 'Active' },
    { id: 'MGR-102', name: 'Sarah Jenkins', department: 'Finance & Compliance', team: '5 Auditors', status: 'Active' },
    { id: 'MGR-103', name: 'David Sterling', department: 'Platform Engineering', team: '8 Engineers', status: 'Active' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Managers Directory | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <UserCheck size={13} /> Management Staff
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Managers Overview</h1>
              <p className="text-slate-400 text-sm mt-1">Manage departmental leads and supervisory permissions.</p>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto">
              <Plus size={16} /> Add Manager
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {managers.map((m) => (
              <div key={m.id} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{m.name}</h3>
                    <span className="text-xs text-slate-400 font-mono">{m.id}</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs border-t border-slate-800 pt-4">
                  <div className="flex justify-between text-slate-400">
                    <span>Department:</span>
                    <span className="text-slate-200 font-semibold">{m.department}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Team Scope:</span>
                    <span className="text-slate-200 font-semibold">{m.team}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
