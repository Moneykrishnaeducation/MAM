import React from 'react';
import Head from 'next/head';
import { Download, Monitor, Smartphone, Globe, ExternalLink, Activity } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientPlatformPage() {
  return (
    <div className="flex min-h-screen font-sans antialiased text-slate-100 bg-[#060e24]">
      <Head>
        <title>Platform | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        
        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Activity className="text-blue-500" size={32} />
              Trading Platform
            </h1>
            <p className="text-blue-300/70 mt-2 text-sm max-w-2xl">
              Download the trading terminals or access our web platform to monitor your MAM allocations and manager performance in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Windows Download */}
            <div className="bg-gradient-to-b from-[#0b1736] to-[#0e2152]/40 border border-blue-900/50 rounded-3xl p-8 shadow-2xl relative group overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:border-blue-500/50 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)]">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-blue-400 shadow-inner mb-6 group-hover:scale-110 transition-transform">
                <Monitor size={32} strokeWidth={1.5} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">MetaTrader 5 for Windows</h3>
              <p className="text-sm text-blue-300/70 mb-8 min-h-[40px]">
                The industry standard trading terminal fully optimized for Windows OS.
              </p>
              
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
                <Download size={18} />
                Download for PC
              </button>
            </div>

            {/* Mobile App */}
            <div className="bg-gradient-to-b from-[#0b1736] to-[#0e2152]/40 border border-blue-900/50 rounded-3xl p-8 shadow-2xl relative group overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.2)]">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shadow-inner mb-6 group-hover:scale-110 transition-transform">
                <Smartphone size={32} strokeWidth={1.5} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">MT5 Mobile App</h3>
              <p className="text-sm text-blue-300/70 mb-8 min-h-[40px]">
                Monitor your investments on the go. Available for iOS and Android devices.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-[#0e2152] hover:bg-blue-800 border border-blue-800/80 text-white font-semibold py-3 px-2 rounded-xl text-xs transition-colors shadow flex justify-center items-center gap-1.5">
                  <Download size={14} /> App Store
                </button>
                <button className="bg-[#0e2152] hover:bg-blue-800 border border-blue-800/80 text-white font-semibold py-3 px-2 rounded-xl text-xs transition-colors shadow flex justify-center items-center gap-1.5">
                  <Download size={14} /> Google Play
                </button>
              </div>
            </div>

            {/* Web Platform */}
            <div className="bg-gradient-to-b from-[#0b1736] to-[#0e2152]/40 border border-blue-900/50 rounded-3xl p-8 shadow-2xl relative group overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.2)]">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-purple-900/40 border border-purple-700/50 flex items-center justify-center text-purple-400 shadow-inner mb-6 group-hover:scale-110 transition-transform">
                <Globe size={32} strokeWidth={1.5} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Web Terminal</h3>
              <p className="text-sm text-blue-300/70 mb-8 min-h-[40px]">
                Trade directly from any web browser without downloading or installing any software.
              </p>
              
              <button className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold py-3 px-6 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
                Launch WebTrader
                <ExternalLink size={16} strokeWidth={2.5} />
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}