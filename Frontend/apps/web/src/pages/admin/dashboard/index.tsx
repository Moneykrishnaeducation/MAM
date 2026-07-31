import React, { useState, useEffect } from 'react';
import Head from 'next/head';
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
  AlertCircle
} from 'lucide-react';

import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

export default function AdminDashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'metrics'>('overview');

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const stats = [
    { title: 'Total Students', value: '12,450', change: '+12%', isPositive: true, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { title: 'Active Courses', value: '45', change: '+3 new', isPositive: true, icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { title: 'Total Revenue', value: '$84,500', change: '+8.4%', isPositive: true, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { title: 'System Uptime', value: '99.9%', change: 'Optimal', isPositive: true, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ];

  const recentEnrollments = [
    { name: 'Sarah Jenkins', email: 'sarah.j@example.com', course: 'Advanced Financial Analysis', date: '10m ago', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80', status: 'Completed' },
    { name: 'Michael Chen', email: 'm.chen@example.com', course: 'Algorithmic Trading 101', date: '45m ago', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', status: 'Active' },
    { name: 'Emma Watson', email: 'emma.w@example.com', course: 'Risk Management Essentials', date: '2h ago', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80', status: 'Active' },
    { name: 'David Miller', email: 'd.miller@example.com', course: 'Corporate Valuation Methods', date: '4h ago', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80', status: 'Pending' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden">
      <Head>
        <title>Admin Dashboard | Money Krishna Education</title>
        <meta name="description" content="MAM Education Admin Management Portal" />
      </Head>

      <AdminSidebar />

      <main className="flex-1 flex flex-col min-w-0 relative overflow-y-auto">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <AdminHeader />

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
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="group relative bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 transition-all duration-300 hover:border-slate-700 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl border ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon size={22} />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-slate-400 text-xs font-medium tracking-wide uppercase">{stat.title}</h3>
                <div className="text-3xl font-black text-slate-100 mt-1 tracking-tight">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Main Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity Table */}
            <div className="lg:col-span-2 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Recent Student Enrollments</h2>
                  <p className="text-xs text-slate-400">Latest course signups across all modules</p>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                  View All <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-3 font-semibold">Student</th>
                      <th className="pb-3 font-semibold">Course</th>
                      <th className="pb-3 font-semibold">Time</th>
                      <th className="pb-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentEnrollments.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <img src={item.avatar} alt={item.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700" />
                            <div>
                              <div className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{item.name}</div>
                              <div className="text-[11px] text-slate-400">{item.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 font-medium text-slate-300">{item.course}</td>
                        <td className="py-3.5 text-slate-400">{item.date}</td>
                        <td className="py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            item.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : item.status === 'Active'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {item.status === 'Completed' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
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
                  <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-slate-200 hover:bg-blue-600/15 hover:border-blue-500/40 hover:text-blue-400 transition-all duration-200 group">
                    <UserPlus size={22} className="mb-2 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    <span className="text-xs font-semibold">Add Student</span>
                  </button>

                  <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-slate-200 hover:bg-purple-600/15 hover:border-purple-500/40 hover:text-purple-400 transition-all duration-200 group">
                    <PlusCircle size={22} className="mb-2 text-slate-400 group-hover:text-purple-400 transition-colors" />
                    <span className="text-xs font-semibold">Create Course</span>
                  </button>

                  <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-slate-200 hover:bg-emerald-600/15 hover:border-emerald-500/40 hover:text-emerald-400 transition-all duration-200 group">
                    <FileText size={22} className="mb-2 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs font-semibold">View Reports</span>
                  </button>

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
      </main>
    </div>
  );
}
