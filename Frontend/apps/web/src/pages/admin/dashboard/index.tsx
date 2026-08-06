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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-[#C9A227]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className={`p-6 md:p-8 z-10 transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Header Banner */}
          {/* <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"> */}
            {/* <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Sliders size={13} /> Administration Console
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                System Overview & Analytics
              </h1>
              <p className="text-slate-400 text-sm mt-1">Real-time metrics and platform operational control.</p>
            </div> */}

            {/* Quick Filter Tabs */}
            {/* <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 self-start md:self-auto shadow-inner">
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
            </div> */}
          {/* </div> */}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {cards.map((stat: any, index: number) => {
              const IconComponent = iconMap[stat.icon] || Users;
              return (
                <div 
                  key={index} 
                  className="relative overflow-hidden rounded-3xl border p-6 shadow-2xl group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:border-blue-500/50 cursor-pointer bg-[#0b183f]/80 border-blue-800/40 backdrop-blur-sm"
                >
                  <div className="absolute -top-4 -right-4 text-blue-500/10 group-hover:text-blue-500/20 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                    <IconComponent size={100} strokeWidth={1} />
                  </div>

                  <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-[#f5c84b] shadow-inner group-hover:text-white group-hover:bg-blue-600 transition-all duration-300">
                        <IconComponent size={18} strokeWidth={2.5} />
                      </div>
                      <div className="px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/50 text-[10px] uppercase font-bold tracking-widest text-[#f5c84b]/80">
                        Metric
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="text-blue-200/80 text-xs font-semibold tracking-wide mb-1 uppercase">{stat.title}</div>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{stat.value}</div>
                    </div>
                  </div>

                  {/* Hover bottom gradient bar */}
                  <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#C9A227] via-yellow-400 to-[#f5c84b] opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                </div>
              );
            })}
          </div>

          {/* Main Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity Table */}
            <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-blue-800/40 bg-[#0b183f]/80 backdrop-blur-sm shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="relative inline-block pb-2 text-lg font-bold text-white">
                    Recent User Registrations
                    <span className="absolute left-0 bottom-0 w-12 h-1 bg-[#C9A227] rounded-full"></span>
                  </h2>
                  <p className="text-xs text-blue-200/60 mt-1">Latest client user profiles registered</p>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold text-[#f5c84b] hover:text-[#f5c84b]/80 transition-colors bg-[#C9A227]/10 px-3 py-1.5 rounded-xl border border-[#C9A227]/20">
                  View All <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-blue-800/60 bg-blue-950/40">
                <table className="min-w-[600px] w-full text-left text-xs">
                  <thead className="bg-blue-900/60 font-semibold text-white">
                    <tr>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-white">User</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-white">Country</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-white">Joined</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-white text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800/40">
                    {enrollments.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-blue-900/30 transition-colors group">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <img src={item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'} alt={item.name} className="w-9 h-9 rounded-xl object-cover border border-blue-700/50" />
                            <div>
                              <div className="font-semibold text-white group-hover:text-[#f5c84b] transition-colors">{item.name}</div>
                              <div className="text-[11px] text-blue-200/60">{item.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-300">{item.country || 'N/A'}</td>
                        <td className="px-4 py-3.5 text-blue-200/80">{item.joined || item.date}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            item.status === 'Completed' || item.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-[#f5c84b] border-[#C9A227]/20'
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
              <div className="bg-[#0b183f]/80 backdrop-blur-sm border border-blue-800/40 rounded-3xl p-6 shadow-xl">
                <h2 className="relative inline-block pb-2 text-lg font-bold text-white mb-2">
                  Quick Admin Actions
                  <span className="absolute left-0 bottom-0 w-8 h-1 bg-[#C9A227] rounded-full"></span>
                </h2>
                <p className="text-xs text-blue-200/60 mb-5">Frequently performed platform operations</p>
                
                <div className="flex flex-col gap-3">
                  <Link href="/admin/users" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-900/40 border border-blue-800/40 text-slate-200 hover:bg-blue-600/20 hover:border-blue-500/40 hover:text-[#f5c84b] transition-all duration-200 group">
                    <UserPlus size={22} className="mb-2 text-blue-300 group-hover:text-[#f5c84b] transition-colors" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Add User</span>
                  </Link>

                  <Link href="/admin/admin-users" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-900/40 border border-blue-800/40 text-slate-200 hover:bg-purple-600/20 hover:border-purple-500/40 hover:text-purple-400 transition-all duration-200 group">
                    <PlusCircle size={22} className="mb-2 text-blue-300 group-hover:text-purple-400 transition-colors" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">New Admin</span>
                  </Link>

                  <Link href="/admin/activity" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-900/40 border border-blue-800/40 text-slate-200 hover:bg-emerald-600/20 hover:border-emerald-500/40 hover:text-emerald-400 transition-all duration-200 group col-span-2">
                    <FileText size={22} className="mb-2 text-blue-300 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">View Activity Logs</span>
                  </Link>
                </div>
              </div>

              {/* System Health Card */}
              {/* <div className="bg-[#0b183f]/80 backdrop-blur-sm border border-blue-800/40 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-200/80">Server Node Status</span>
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400 tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live
                  </span>
                </div>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between text-blue-100 font-semibold mb-1.5">
                      <span>API Server Response</span>
                      <span className="text-emerald-400">18 ms</span>
                    </div>
                    <div className="w-full bg-blue-900/60 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full w-[95%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-blue-100 font-semibold mb-1.5">
                      <span>Database Load</span>
                      <span className="text-[#f5c84b]">32%</span>
                    </div>
                    <div className="w-full bg-blue-900/60 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-[#C9A227] to-[#f5c84b] h-1.5 rounded-full w-[32%]"></div>
                    </div>
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
    </>
  );
}
