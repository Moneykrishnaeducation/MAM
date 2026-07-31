import React from 'react';
import Head from 'next/head';
import { Wallet, TrendingUp, ArrowUpRight, DollarSign, PieChart, ShieldAlert } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientMyInvestPage() {
  const investments = [
    { name: 'MAM High-Yield Education Fund', invested: '$12,500', returnRate: '+14.2%', value: '$14,275', category: 'Growth' },
    { name: 'Tech & EdTech Venture Basket', invested: '$8,000', returnRate: '+8.5%', value: '$8,680', category: 'Equity' },
    { name: 'Fixed Income Dividend Notes', invested: '$5,000', returnRate: '+5.1%', value: '$5,255', category: 'Bonds' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>My Investments | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <Wallet size={13} /> Asset Portfolio
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">My Investments</h1>
              <p className="text-slate-400 text-sm mt-1">Track your active investment holdings, returns, and asset allocations.</p>
            </div>
            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto">
              <ArrowUpRight size={16} /> Invest More
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Total Portfolio Value</span>
                <DollarSign size={18} className="text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white">$28,210</div>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <TrendingUp size={13} /> +$2,710 overall gain
              </span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Total Capital Invested</span>
                <PieChart size={18} className="text-blue-400" />
              </div>
              <div className="text-3xl font-black text-white">$25,500</div>
              <span className="text-xs text-slate-400 mt-1 block">Across 3 active funds</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Avg Return Rate</span>
                <TrendingUp size={18} className="text-purple-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400">+10.6%</div>
              <span className="text-xs text-slate-400 mt-1 block">Annualized ROI</span>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">Active Holdings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-3 font-semibold">Fund Name</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Capital Invested</th>
                    <th className="pb-3 font-semibold">Current Value</th>
                    <th className="pb-3 font-semibold text-right">Yield / ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {investments.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 font-bold text-slate-200">{inv.name}</td>
                      <td className="py-3.5 text-slate-400">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                          {inv.category}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-300 font-medium">{inv.invested}</td>
                      <td className="py-3.5 text-white font-bold">{inv.value}</td>
                      <td className="py-3.5 text-right font-mono text-emerald-400 font-bold">{inv.returnRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
