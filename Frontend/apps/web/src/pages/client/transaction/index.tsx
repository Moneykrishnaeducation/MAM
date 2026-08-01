import React, { useState } from 'react';
import Head from 'next/head';
import { ArrowRightLeft, Search, Download, ArrowUpRight, ArrowDownRight, Clock, Filter } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientTransactionPage() {
  const [search, setSearch] = useState('');

  const transactions = [
    { id: 'TRX-10928', type: 'Deposit', amount: '+$5,000.00', date: 'Today, 09:30 AM', status: 'Completed', method: 'Bank Transfer' },
    { id: 'TRX-10927', type: 'Investment', amount: '-$2,500.00', date: 'Yesterday, 14:15 PM', status: 'Completed', method: 'Internal Wallet' },
    { id: 'TRX-10901', type: 'Withdrawal', amount: '-$800.00', date: '12 Jul 2026', status: 'Pending', method: 'Crypto (USDT)' },
    { id: 'TRX-10884', type: 'Profit Share', amount: '+$340.50', date: '10 Jul 2026', status: 'Completed', method: 'System' },
    { id: 'TRX-10850', type: 'Deposit', amount: '+$10,000.00', date: '01 Jul 2026', status: 'Completed', method: 'Credit Card' },
  ];

  return (
    <div className="flex min-h-screen font-sans antialiased text-slate-100 bg-[#060e24]">
      <Head>
        <title>Transactions | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        
        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <ArrowRightLeft className="text-blue-500" size={32} />
                Transaction History
              </h1>
              <p className="text-blue-300/70 mt-2 text-sm">
                View all your deposits, withdrawals, and internal transfers.
              </p>
            </div>
            
            <button className="bg-[#0e2152] hover:bg-blue-800 border border-blue-800/80 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors shadow flex items-center justify-center gap-2">
              <Download size={16} />
              Export Statement
            </button>
          </div>

          <div className="bg-[#0b1736] border border-blue-900/50 rounded-3xl overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/60">
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md">All Time</button>
                <button className="px-4 py-2 bg-[#0e2152] text-blue-300 hover:text-white hover:bg-blue-800 text-xs font-bold rounded-lg transition-colors border border-blue-900/40">This Month</button>
                <button className="px-4 py-2 bg-[#0e2152] text-blue-300 hover:text-white hover:bg-blue-800 text-xs font-bold rounded-lg transition-colors border border-blue-900/40">Last Month</button>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-blue-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search transactions..." 
                    className="w-full bg-[#0e2152]/50 border border-blue-800/80 text-blue-100 rounded-full py-2 pl-9 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-blue-400/70"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="w-10 h-10 rounded-full bg-[#0e2152] border border-blue-800/80 text-blue-300 flex items-center justify-center hover:text-white hover:bg-blue-800 transition-colors shrink-0">
                  <Filter size={16} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-blue-200">
                <thead className="bg-[#0e2152]">
                  <tr className="border-b border-blue-900/40">
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">Transaction</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">ID</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">Method</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest text-right">Amount</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/40">
                  {transactions.map((trx, idx) => (
                    <tr key={trx.id} className={`group transition-colors hover:bg-[#11255e] ${idx % 2 === 0 ? 'bg-[#0b1736]' : 'bg-[#0e2152]/30'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            trx.amount.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {trx.amount.startsWith('+') ? <ArrowDownRight size={16} strokeWidth={2.5} /> : <ArrowUpRight size={16} strokeWidth={2.5} />}
                          </div>
                          <span className="font-bold text-white">{trx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-400">{trx.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {trx.method}
                      </td>
                      <td className="px-6 py-4 text-blue-300 font-medium text-xs whitespace-nowrap">
                        {trx.date}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${
                        trx.amount.startsWith('+') ? 'text-emerald-400' : 'text-white'
                      }`}>
                        {trx.amount}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {trx.status === 'Completed' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-blue-900/60 flex items-center justify-center text-xs font-semibold text-blue-400 bg-[#0b1736]">
              End of transaction history
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}