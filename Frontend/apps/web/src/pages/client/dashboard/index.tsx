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
    <>
      <Head>
        <title>Student Dashboard | Client Portal</title>
      </Head>
        
        <div className="p-6 md:p-8">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
              <UserCheck size={18} />
              Open Mam Account
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2">
              <TrendingUp size={18} />
              Deposit
            </button>
            <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-6 rounded-xl border border-slate-700 transition-colors shadow-lg flex items-center gap-2">
              <ArrowUpRight size={18} />
              Withdrawal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'MAM Account', value: 'Active', icon: BookOpen },
              { title: 'MAM Funds Invested', value: '$45,000.00', icon: TrendingUp },
              { title: 'MAM Balance', value: '$52,400.00', icon: Award },
              { title: 'Total Account', value: '3', icon: BookOpen },
              { title: 'Active Nodes', value: '8 Nodes', icon: PlayCircle },
              { title: 'Available Manager', value: assignedManager.name || '2', icon: UserCheck },
            ].map((st, idx) => {
              const IconComp = st.icon;

              return (
                <div key={idx} className="relative overflow-hidden bg-[#0b183f]/80 backdrop-blur-sm border border-blue-800/40 rounded-3xl p-6 shadow-2xl group hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:border-blue-500/50 transition-all duration-300">
                  <div className="absolute -top-4 -right-4 text-blue-500/10 group-hover:text-blue-500/20 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                    <IconComp size={100} strokeWidth={1} />
                  </div>
                  
                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-blue-400 shadow-inner group-hover:text-white group-hover:bg-blue-600 transition-all duration-300">
                        <IconComp size={18} strokeWidth={2.5} />
                      </div>
                      <div className="px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/50 text-[10px] uppercase font-bold tracking-widest text-blue-300">
                        Metric
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="text-blue-200/80 text-xs font-semibold tracking-wide mb-1">{st.title}</div>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{st.value}</div>
                    </div>
                  </div>
                  
                  {/* Hover bottom gradient bar */}
                  <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                </div>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white relative inline-block pb-2">
                Recent Activity
                <span className="absolute left-0 bottom-0 w-12 h-1 bg-yellow-500 rounded-full"></span>
              </h2>
              <a href="#" className="text-sm text-blue-200 font-semibold flex items-center hover:text-white transition-colors">
                View More <ChevronRight size={16} className="ml-1" />
              </a>
            </div>

            <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-blue-900/60 text-white font-semibold">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Amount (USD)</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800/40">
                    <tr className="hover:bg-blue-900/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">13 Jul 2026</td>
                      <td className="px-6 py-4 font-medium text-white">Test</td>
                      <td className="px-6 py-4">Deposit into Trading Account</td>
                      <td className="px-6 py-4 text-emerald-400 font-medium">+$300</td>
                      <td className="px-6 py-4">approved</td>
                    </tr>
                    <tr className="hover:bg-blue-900/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">11 Jun 2026</td>
                      <td className="px-6 py-4 font-medium text-white">Test</td>
                      <td className="px-6 py-4">Withdrawal from Trading Account</td>
                      <td className="px-6 py-4 text-emerald-400 font-medium">+$10</td>
                      <td className="px-6 py-4">approved</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
