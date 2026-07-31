import React from 'react';
import Head from 'next/head';
import { Activity, Clock, ShieldCheck, User, Database } from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

export default function AdminActivityPage() {
  const logs = [
    { id: 1, action: 'User Permissions Updated', target: 'Alex Rivera (USR-001)', time: '5m ago', type: 'Security', icon: ShieldCheck, color: 'text-blue-400' },
    { id: 2, action: 'New Course Published', target: 'Advanced Financial Analysis', time: '42m ago', type: 'Content', icon: User, color: 'text-emerald-400' },
    { id: 3, action: 'Database Migration Completed', target: 'Aerich Migration v1.4', time: '2h ago', type: 'System', icon: Database, color: 'text-purple-400' },
    { id: 4, action: 'Admin Login', target: 'Super Admin', time: '4h ago', type: 'Auth', icon: Activity, color: 'text-amber-400' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Audit Logs & Activity | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Activity size={13} /> Real-Time Audit
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">System Activity Logs</h1>
              <p className="text-slate-400 text-sm mt-1">Audit log records of admin operations and system events.</p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            {logs.map((log) => {
              const Icon = log.icon;
              return (
                <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-800/80 hover:bg-slate-800/80 transition-colors">
                  <div className={`p-3 rounded-xl bg-slate-800 border border-slate-700 ${log.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-200">{log.action}</h4>
                    <p className="text-xs text-slate-400">{log.target}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 mb-1">
                      {log.type}
                    </span>
                    <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                      <Clock size={11} /> {log.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
