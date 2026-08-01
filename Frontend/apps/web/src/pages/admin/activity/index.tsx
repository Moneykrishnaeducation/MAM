import React, { useState } from 'react';
import Head from 'next/head';
import { Activity, Clock, ShieldCheck, User, Database, AlertTriangle, Users } from 'lucide-react';

const activityTabs = [
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'client', label: 'Client', icon: Users },
  { id: 'error', label: 'Error', icon: AlertTriangle },
] as const;

export default function AdminActivityPage() {
  const [activeTab, setActiveTab] = useState<'admin' | 'client' | 'error'>('admin');

  const [logs, setLogs] = useState<any[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/admin/activity');
        const data = await res.json();
        if (data && data.activities && Array.isArray(data.activities)) {
          const mapped = data.activities.map((a: any) => ({
            id: a.id,
            action: a.action,
            target: a.user || 'System',
            time: a.time || 'recently',
            category: a.action?.toLowerCase().includes('client') ? 'client' : a.action?.toLowerCase().includes('error') ? 'error' : 'admin',
            detail: `IP: ${a.ip_address || 'N/A'}`,
            icon: a.action?.toLowerCase().includes('error') ? AlertTriangle : a.action?.toLowerCase().includes('client') ? User : ShieldCheck,
            color: a.action?.toLowerCase().includes('error') ? 'text-red-400' : a.action?.toLowerCase().includes('client') ? 'text-emerald-400' : 'text-blue-400',
          }));
          if (mapped.length > 0) {
            setLogs(mapped);
          }
        }
      } catch {}
    };
    loadData();
  }, []);

  const filteredLogs = logs.filter((log) => log.category === activeTab);

  return (
    <>
      <Head>
        <title>Audit Logs & Activity | Admin Portal</title>
      </Head>
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

          <div className="flex flex-wrap gap-2 mb-4">
            {activityTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            {filteredLogs.map((log) => {
              const Icon = log.icon;
              return (
                <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-800/80 hover:bg-slate-800/80 transition-colors">
                  <div className={`p-3 rounded-xl bg-slate-800 border border-slate-700 ${log.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-200">{log.action}</h4>
                    <p className="text-xs text-slate-400">{log.target}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{log.detail}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 mb-1">
                      {activityTabs.find((tab) => tab.id === log.category)?.label ?? log.category}
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
    </>
  );
}
