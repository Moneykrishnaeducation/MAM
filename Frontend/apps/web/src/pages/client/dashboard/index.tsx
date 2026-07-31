import React from 'react';
import Head from 'next/head';
import { 
  BookOpen, 
  Clock, 
  Award, 
  TrendingUp, 
  PlayCircle, 
  Calendar, 
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';
import { getClientData } from '@/lib/mockDataLoader';

export default function ClientDashboardPage() {
  const clientData = getClientData();
  const { profile, stats, assignedManager } = clientData;

  const statIcons: Record<string, any> = {
    BookOpen: BookOpen,
    Clock: Clock,
    Award: Award,
    TrendingUp: TrendingUp,
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Student Dashboard | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        
        <div className="p-6 md:p-8 space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/60 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-xl"
                />
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                    <Sparkles size={13} /> {profile.membership} (mockData.json)
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Welcome back, {profile.name}!
                  </h1>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Track your learning progress and investments in one place.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
                <img src={assignedManager.avatar} alt={assignedManager.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-blue-500/40" />
                <div className="text-xs">
                  <div className="text-slate-400 text-[10px]">Assigned Manager</div>
                  <div className="font-bold text-white">{assignedManager.name}</div>
                  <div className="text-[10px] text-emerald-400">{assignedManager.role}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((st, idx) => {
              const IconComp = statIcons[st.icon] || BookOpen;

              return (
                <div key={idx} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-xs font-medium">{st.title}</div>
                    <div className="text-2xl font-black text-white mt-1">{st.value}</div>
                    <div className="text-[11px] font-semibold text-emerald-400 mt-1">{st.change}</div>
                  </div>
                  <div className={`p-3 rounded-2xl ${st.bg} ${st.color}`}>
                    <IconComp size={22} />
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
