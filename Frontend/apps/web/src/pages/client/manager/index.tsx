import React, { useState } from 'react';
import Head from 'next/head';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';
import { getAdminManagers } from '@/lib/mockDataLoader';

export default function ClientManagerPage() {
  const [search, setSearch] = useState('');

  const rawManagers = getAdminManagers();
  
  // Filter and map raw manager data to our UI structure
  const managers = rawManagers
    .filter(mgr => 
      mgr.name.toLowerCase().includes(search.toLowerCase()) || 
      mgr.accountId.toLowerCase().includes(search.toLowerCase())
    )
    .map((mgr, i) => ({
      name: mgr.name,
      id: mgr.accountId,
      balance: mgr.balance,
      equity: mgr.balance, // Using balance as equity for mock
      profitShare: mgr.share,
      age: `${420 + (i * 45)} days`, // Deterministic age mocking to avoid hydration mismatch
      growth: mgr.profit
    }));

  return (
    <div className="flex min-h-screen font-sans antialiased text-slate-100" style={{ backgroundColor: '#0e2250' }}>
      <Head>
        <title>Explore Top MAM Managers | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        
        <div className="p-6 md:p-8">
          <div className="bg-[#0b183f] border border-blue-900/60 rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Header */}
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/60">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
                <h1 className="text-xl font-bold text-white tracking-wide">Explore Top MAM Managers</h1>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-blue-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search managers..." 
                  className="bg-transparent border border-blue-800/80 text-blue-100 rounded-full py-2 pl-9 pr-4 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-blue-400/70"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto relative">
              <table className="w-full text-left text-sm text-blue-200">
                <thead className="bg-[#0e2152] text-blue-300 text-xs font-bold uppercase tracking-widest border-b border-blue-900/40">
                  <tr>
                    <th className="px-6 py-4">MANAGER NAME</th>
                    <th className="px-6 py-4">LOGIN ID</th>
                    <th className="px-6 py-4">BALANCE</th>
                    <th className="px-6 py-4">EQUITY</th>
                    <th className="px-6 py-4">PROFIT SHARE</th>
                    <th className="px-6 py-4">AGE</th>
                    <th className="px-6 py-4">GROWTH</th>
                    <th className="px-6 py-4 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/40">
                  {managers.map((mgr, idx) => (
                    <tr key={idx} className="hover:bg-[#11255e] transition-colors bg-[#0b183f]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-800 font-bold shrink-0 shadow-sm">
                            (
                          </div>
                          <span className="font-bold text-white">{mgr.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-4 py-1.5 rounded-lg border border-blue-800 bg-blue-900/30 text-blue-100 font-semibold text-xs tracking-wider">
                          {mgr.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-white tracking-wide">{mgr.balance}</td>
                      <td className="px-6 py-4 font-bold text-white tracking-wide">{mgr.equity}</td>
                      <td className="px-6 py-4 font-bold text-white tracking-wide">{mgr.profitShare}</td>
                      <td className="px-6 py-4 font-bold text-white">
                        <div className="flex flex-col">
                          <span>{mgr.age.split(' ')[0]}</span>
                          <span className="text-xs text-blue-400 font-semibold mt-0.5">{mgr.age.split(' ')[1]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-bold tracking-wide">{mgr.growth}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-3">
                          <button className="px-5 py-1.5 rounded-full border border-blue-700 bg-blue-900/30 text-blue-100 hover:bg-blue-800/80 text-xs font-semibold transition-colors shadow-sm">
                            View
                          </button>
                          <button className="px-5 py-1.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-bold transition-colors shadow-md shadow-yellow-500/20">
                            Invest
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination */}
            <div className="p-5 border-t border-blue-900/60 flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-widest bg-[#0b183f]">
              <div>
                SHOWING 1 TO 10 OF 21
              </div>
              <div className="flex items-center gap-4">
                <button className="w-8 h-8 rounded-full border border-blue-800 flex items-center justify-center hover:bg-blue-800/50 transition-colors text-blue-300">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-white capitalize font-semibold tracking-normal text-sm">Page 1</span>
                <button className="w-8 h-8 rounded-full border border-blue-800 flex items-center justify-center hover:bg-blue-800/50 transition-colors text-yellow-500 border-yellow-500/30">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
