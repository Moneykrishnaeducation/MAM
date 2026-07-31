import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Activity,
  ChevronRight,
  BookOpen,
  Settings
} from 'lucide-react';

import Sidebar from '../Components/Client/sidebar';
import Header from '../Components/Client/header';

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const stats = [
    { title: 'Total Students', value: '12,450', change: '+12%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Active Courses', value: '45', change: '+3', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Total Revenue', value: '$84,500', change: '+8%', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'System Health', value: '99.9%', change: 'All systems operational', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-50 font-sans overflow-hidden">
      <Head>
        <title>MAM Dashboard | Money Krishna Education</title>
        <meta name="description" content="MAM Education Platform Dashboard" />
      </Head>

      <Sidebar />

      <main className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Decorative background glow */}
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-[120px] pointer-events-none z-0"></div>
        
        <Header />

        <div className={`p-8 z-10 transition-all duration-700 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Welcome back, Admin
            </h1>
            <p className="text-slate-400 text-lg">Here's what's happening with your platform today.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex items-start gap-4 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-800/80 hover:border-white/10 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-5 fade-in"
                style={{ animationFillMode: 'backwards', animationDelay: `${index * 100}ms`, animationDuration: '600ms' }}
              >
                <div className={`p-3 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <h3 className="text-slate-400 text-sm font-medium mb-2">{stat.title}</h3>
                  <div className="text-3xl font-bold text-slate-50 mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-emerald-500">
                    {stat.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
                <button className="flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors">
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <img src={`https://i.pravatar.cc/150?img=${i + 20}`} alt="User" className="w-11 h-11 rounded-full object-cover" />
                    <div className="flex-1">
                      <h4 className="text-[0.95rem] font-semibold text-slate-50 mb-1">New student enrollment</h4>
                      <p className="text-[0.85rem] text-slate-400">Sarah Jenkins enrolled in "Advanced Financial Analysis"</p>
                    </div>
                    <div className="text-[0.8rem] text-slate-500 font-medium">
                      {i * 2}h ago
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-3xl p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-50 transition-all hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 hover:-translate-y-1">
                  <Users size={24} />
                  <span className="font-medium text-sm">Add Student</span>
                </button>
                <button className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-50 transition-all hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 hover:-translate-y-1">
                  <BookOpen size={24} />
                  <span className="font-medium text-sm">New Course</span>
                </button>
                <button className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-50 transition-all hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 hover:-translate-y-1">
                  <TrendingUp size={24} />
                  <span className="font-medium text-sm">View Reports</span>
                </button>
                <button className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-50 transition-all hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 hover:-translate-y-1">
                  <Settings size={24} />
                  <span className="font-medium text-sm">System Config</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
