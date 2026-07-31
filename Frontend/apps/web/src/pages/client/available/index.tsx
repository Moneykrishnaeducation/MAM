import React from 'react';
import Head from 'next/head';
import { Sparkles, ArrowRight, BookOpen, TrendingUp, ShieldCheck } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';
import { getClientData } from '@/lib/mockDataLoader';

export default function ClientAvailablePage() {
  const clientData = getClientData();
  const opportunities = clientData.availableOpportunities;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Available Opportunities | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Sparkles size={13} /> Data from mockData.json
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Available Opportunities</h1>
              <p className="text-slate-400 text-sm mt-1">Explore available education modules and investment funds.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {opportunities.map((opp, idx) => (
              <div key={idx} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                      {opp.category}
                    </span>
                    <span className="text-xs font-bold text-amber-400 px-2.5 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                      {opp.badge}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">{opp.title}</h2>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-6">
                    <span>Entry: <strong className="text-slate-200">{opp.minEntry}</strong></span>
                    <span>•</span>
                    <span>Performance: <strong className="text-emerald-400">{opp.rating}</strong></span>
                  </div>
                </div>

                <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all border border-slate-700 hover:border-blue-500 shadow-md">
                  <span>Explore & Enroll</span> <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
