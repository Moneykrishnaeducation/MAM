import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Activity,
  ChevronRight,
  UserPlus,
  PlusCircle,
  FileText,
  Settings,
  Sliders,
  CheckCircle2,
  AlertCircle,
  DollarSign
} from 'lucide-react';

const iconMap: Record<string, any> = {
  'Users': Users,
  'GraduationCap': GraduationCap,
  'TrendingUp': TrendingUp,
  'DollarSign': DollarSign,
  'Activity': Activity
};

export default function AdminDashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'metrics'>('overview');
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setDashboard(data.dashboard);
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error("Failed to load dashboard data:", err);
        setIsLoaded(true);
      });
  }, []);

  const cards = dashboard?.cards || [];
  const enrollments = dashboard?.recent_registrations || [];

  return (
    <>
      <Head>
        <title>Admin Dashboard | Money Krishna Education</title>
        <meta name="description" content="MAM Education Admin Management Portal" />
      </Head>

        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className={`p-6 md:p-8 z-10 transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Sliders size={13} /> Administration Console
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                System Overview & Analytics
              </h1>
              <p className="text-slate-400 text-sm mt-1">Real-time metrics and platform operational control.</p>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 self-start md:self-auto shadow-inner">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'activity' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Enrollments
              </button>
              <button 
                onClick={() => setActiveTab('metrics')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'metrics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Metrics
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {cards.map((stat: any, index: number) => {
              const IconComponent = iconMap[stat.icon] || Users;
              return (
                <div 
                  key={index} 
                  className="group relative bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 transition-all duration-300 hover:border-slate-700 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl border ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                      <IconComponent size={22} />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-slate-400 text-xs font-medium tracking-wide uppercase">{stat.title}</h3>
                  <div className="text-3xl font-black text-slate-100 mt-1 tracking-tight">{stat.value}</div>
                </div>
              );
            })}
          </div>

          {/* Main Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity Table */}
            <div className="lg:col-span-2 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Recent User Registrations</h2>
                  <p className="text-xs text-slate-400">Latest client user profiles registered</p>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                  View All <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-3 font-semibold">User</th>
                      <th className="pb-3 font-semibold">Country</th>
                      <th className="pb-3 font-semibold">Joined</th>
                      <th className="pb-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {enrollments.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <img src={item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'} alt={item.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700" />
                            <div>
                              <div className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{item.name}</div>
                              <div className="text-[11px] text-slate-400">{item.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 font-medium text-slate-300">{item.country || 'N/A'}</td>
                        <td className="py-3.5 text-slate-450">{item.joined || item.date}</td>
                        <td className="py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            item.status === 'Completed' || item.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {item.status === 'Completed' || item.status === 'Active' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Administrative Actions & Health */}
            <div className="space-y-6">
              {/* Actions Box */}
              <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-slate-100 mb-1">Quick Admin Actions</h2>
                <p className="text-xs text-slate-400 mb-5">Frequently performed platform operations</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/admin/activity" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-slate-200 hover:bg-blue-600/15 hover:border-blue-500/40 hover:text-blue-400 transition-all duration-200 group">
                    <UserPlus size={22} className="mb-2 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    <span className="text-xs font-semibold">Add User</span>
                  </Link>

                  <Link href="/admin/admin-users" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-slate-200 hover:bg-purple-600/15 hover:border-purple-500/40 hover:text-purple-400 transition-all duration-200 group">
                    <PlusCircle size={22} className="mb-2 text-slate-400 group-hover:text-purple-400 transition-colors" />
                    <span className="text-xs font-semibold">Create Admin User</span>
                  </Link>

                  <Link href="/admin/activity" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-slate-200 hover:bg-emerald-600/15 hover:border-emerald-500/40 hover:text-emerald-400 transition-all duration-200 group">
                    <FileText size={22} className="mb-2 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs font-semibold">View Logs</span>
                  </Link>

                  <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-slate-200 hover:bg-amber-600/15 hover:border-amber-500/40 hover:text-amber-400 transition-all duration-200 group">
                    <Settings size={22} className="mb-2 text-slate-400 group-hover:text-amber-400 transition-colors" />
                    <span className="text-xs font-semibold">System Config</span>
                  </button>
                </div>
              </div>

              {/* System Health Card */}
              <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Server Node Status</span>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 font-medium mb-1">
                      <span>API Server Response</span>
                      <span className="text-emerald-400">18 ms</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full w-[95%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 font-medium mb-1">
                      <span>Database Load</span>
                      <span className="text-blue-400">32%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full w-[32%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
