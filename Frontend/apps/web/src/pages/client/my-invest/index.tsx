import React from 'react';
import Head from 'next/head';
import { DollarSign, TrendingUp, PieChart, ArrowUpRight, Lock } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';
import { getClientData } from '@/lib/mockDataLoader';

export default function ClientMyInvestPage() {
  const clientData = getClientData();
  const investments = clientData.investments;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>My Portfolio & Investments | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <PieChart size={13} /> Data from mockData.json
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">My Portfolio & Investments</h1>
              <p className="text-slate-400 text-sm mt-1">Track active capital investments, growth metrics, and yields.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="text-slate-400 text-xs font-medium">Total Invested Capital</div>
              <div className="text-3xl font-black text-white mt-1">$25,500.00</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="text-slate-400 text-xs font-medium">Current Portfolio Valuation</div>
              <div className="text-3xl font-black text-emerald-400 mt-1">$28,210.00</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="text-slate-400 text-xs font-medium">Unrealized Growth</div>
              <div className="text-3xl font-black text-blue-400 mt-1">+$2,710.00 (+10.6%)</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Active Investment Positions</h2>
            <div className="divide-y divide-slate-800">
              {investments.map((inv, idx) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-white text-sm">{inv.name}</div>
                    <div className="text-slate-400 text-[11px]">Category: <span className="text-slate-200 font-medium">{inv.category}</span></div>
                  </div>
                  <div className="flex items-center gap-6 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-slate-400 text-[11px]">Initial Capital</div>
                      <div className="font-semibold text-slate-300">{inv.invested}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-[11px]">Return Rate</div>
                      <div className="font-bold text-emerald-400">{inv.returnRate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-[11px]">Current Value</div>
                      <div className="font-black text-white text-sm">{inv.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
