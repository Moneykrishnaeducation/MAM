import React from 'react';
import Head from 'next/head';
import { Compass, Sparkles, PlusCircle, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientAvailablePage() {
  const availableItems = [
    { title: 'Quantitative Trading & AI Algorithms', category: 'Course', minEntry: 'Advanced Level', rating: '4.9 ★', badge: 'Popular' },
    { title: 'Global Macro Opportunity Fund III', category: 'Investment', minEntry: '$5,000 Min', rating: '12% Expected ROI', badge: 'High Yield' },
    { title: 'Corporate Valuation Masterclass', category: 'Course', minEntry: 'Intermediate', rating: '4.8 ★', badge: 'Certified' },
    { title: 'EdTech Venture Seed Pool', category: 'Investment', minEntry: '$2,500 Min', rating: 'Equity Based', badge: 'New Opportunity' },
  ];

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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <Compass size={13} /> Discovery Hub
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Available Opportunities</h1>
              <p className="text-slate-400 text-sm mt-1">Explore available educational programs, certified courses, and investment pools.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableItems.map((item, idx) => (
              <div key={idx} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-6">
                    <span>Requirement: <strong className="text-slate-200">{item.minEntry}</strong></span>
                    <span>Performance: <strong className="text-emerald-400">{item.rating}</strong></span>
                  </div>
                </div>

                <button className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all border border-slate-700 hover:border-emerald-500">
                  Explore & Enroll <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
