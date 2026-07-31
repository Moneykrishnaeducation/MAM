import React from 'react';
import Head from 'next/head';
import { Landmark, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

export default function AdminInvestorsPage() {
  const investors = [
    { name: 'Apex Education Ventures', equity: '14.5%', capital: '$2.5M', tier: 'Series A Lead', status: 'Active' },
    { name: 'Global Tech Capital', equity: '8.2%', capital: '$1.2M', tier: 'Angel Participant', status: 'Active' },
    { name: 'Horizon Capital Partners', equity: '5.0%', capital: '$800K', tier: 'Strategic Partner', status: 'Active' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Investors Directory | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Landmark size={13} /> Capital & Stakeholders
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Investor Relations</h1>
              <p className="text-slate-400 text-sm mt-1">Track strategic investors, equity cap tables, and financial funding rounds.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Total Raised</span>
                <DollarSign size={18} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">$4.5M</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Cap Table Allocated</span>
                <PieChart size={18} className="text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">27.7%</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Active Investors</span>
                <TrendingUp size={18} className="text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">3 Entities</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">Investor Cap Table</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-3 font-semibold">Entity Name</th>
                    <th className="pb-3 font-semibold">Investment Tier</th>
                    <th className="pb-3 font-semibold">Capital Committed</th>
                    <th className="pb-3 font-semibold text-right">Equity Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {investors.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 font-bold text-slate-200">{inv.name}</td>
                      <td className="py-3.5 text-slate-400">{inv.tier}</td>
                      <td className="py-3.5 text-emerald-400 font-semibold">{inv.capital}</td>
                      <td className="py-3.5 text-right font-mono text-blue-400 font-bold">{inv.equity}</td>
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
