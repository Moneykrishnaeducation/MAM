import React from 'react';
import Head from 'next/head';
import { Wallet, TrendingUp, ShieldCheck, Search } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientMyInvestPage() {
  return (
    <div className="flex min-h-screen font-sans antialiased text-slate-100" style={{ backgroundColor: '#0e2250' }}>
      <Head>
        <title>My Investments | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Invested */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-blue-600/80 transition-all duration-500">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                  <Wallet size={22} strokeWidth={2.5} />
                </div>
                <div className="text-emerald-400 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider">Active</div>
              </div>
              <div className="relative z-10">
                <div className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5">Total Invested</div>
                <div className="text-3xl font-black text-white flex items-baseline gap-1.5">
                  $0.00 <span className="text-sm font-bold text-blue-500">USD</span>
                </div>
              </div>
            </div>

            {/* Total Profit */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/30 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-emerald-700/60 transition-all duration-500">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                  <TrendingUp size={22} strokeWidth={2.5} />
                </div>
                <div className="text-emerald-400 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider">+0.00%</div>
              </div>
              <div className="relative z-10">
                <div className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5">Total Profit</div>
                <div className="text-3xl font-black text-white flex items-baseline gap-1.5">
                  $0.00 <span className="text-sm font-bold text-emerald-500">USD</span>
                </div>
              </div>
            </div>

            {/* Active Nodes */}
            <div className="relative overflow-hidden bg-gradient-to-br from-yellow-900/30 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-yellow-700/60 transition-all duration-500">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-yellow-500/10 blur-3xl group-hover:bg-yellow-500/20 transition-all duration-500"></div>
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.15)] group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all">
                  <ShieldCheck size={22} strokeWidth={2.5} />
                </div>
                <div className="text-blue-300 text-[11px] font-bold px-3 py-1 bg-blue-900/50 rounded-full border border-blue-700/50 uppercase tracking-wider">Secured</div>
              </div>
              <div className="relative z-10">
                <div className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5">Active Nodes</div>
                <div className="text-3xl font-black text-white">
                  0
                </div>
              </div>
            </div>
          </div>

          {/* Main Table / Empty State Container */}
          <div className="bg-[#0b183f] border border-blue-900/60 rounded-3xl overflow-hidden shadow-2xl min-h-[500px] flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-blue-900/60 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-wide">My Investments</h2>
            </div>
            
            {/* Empty State Body */}
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
              <div className="w-20 h-20 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-800/40 mb-6 shadow-inner">
                <Search size={32} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">No records found</h3>
              <button className="text-yellow-500 font-bold text-sm hover:text-yellow-400 transition-colors">
                Clear search
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
