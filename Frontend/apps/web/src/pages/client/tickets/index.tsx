import React, { useState } from 'react';
import Head from 'next/head';
import { LifeBuoy, Plus, Search, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientTicketsPage() {
  const [search, setSearch] = useState('');

  const mockTickets = [
    { id: 'TKT-8921', subject: 'Withdrawal delay inquiry', status: 'Open', priority: 'High', date: 'Today, 10:42 AM' },
    { id: 'TKT-8910', subject: 'How to allocate more funds?', status: 'Resolved', priority: 'Low', date: '2 days ago' },
    { id: 'TKT-8842', subject: 'Platform login issue', status: 'Resolved', priority: 'Medium', date: 'Last week' },
  ];

  return (
    <div className="flex min-h-screen font-sans antialiased text-slate-100 bg-[#060e24]">
      <Head>
        <title>Support Tickets | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        
        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <LifeBuoy className="text-blue-500" size={32} />
                Support Tickets
              </h1>
              <p className="text-blue-300/70 mt-2 text-sm">
                Need help? Open a ticket or review your past support requests.
              </p>
            </div>
            <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2 w-full md:w-auto justify-center">
              <Plus size={18} strokeWidth={2.5} />
              New Ticket
            </button>
          </div>

          <div className="bg-[#0b1736] border border-blue-900/50 rounded-3xl overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/60">
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md">All Tickets</button>
                <button className="px-4 py-2 bg-[#0e2152] text-blue-300 hover:text-white hover:bg-blue-800 text-xs font-bold rounded-lg transition-colors border border-blue-900/40">Open (1)</button>
                <button className="px-4 py-2 bg-[#0e2152] text-blue-300 hover:text-white hover:bg-blue-800 text-xs font-bold rounded-lg transition-colors border border-blue-900/40">Resolved (2)</button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-blue-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search tickets..." 
                  className="bg-[#0e2152]/50 border border-blue-800/80 text-blue-100 rounded-full py-2 pl-9 pr-4 w-full md:w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-blue-400/70"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Tickets Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-blue-200">
                <thead className="bg-[#0e2152]">
                  <tr className="border-b border-blue-900/40">
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">Ticket ID</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">Subject</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">Priority</th>
                    <th className="px-6 py-4 font-bold text-blue-300 text-xs uppercase tracking-widest">Last Updated</th>
                    <th className="px-6 py-4 text-center font-bold text-blue-300 text-xs uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/40">
                  {mockTickets.map((ticket, idx) => (
                    <tr key={ticket.id} className={`group transition-colors hover:bg-[#11255e] ${idx % 2 === 0 ? 'bg-[#0b1736]' : 'bg-[#0e2152]/30'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                          {ticket.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
                          <MessageSquare size={14} />
                        </div>
                        {ticket.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ticket.status === 'Open' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                            <Clock size={12} /> Open
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={12} /> Resolved
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ticket.priority === 'High' && <span className="text-red-400 font-bold text-xs flex items-center gap-1"><AlertCircle size={12} /> High</span>}
                        {ticket.priority === 'Medium' && <span className="text-amber-400 font-bold text-xs">Medium</span>}
                        {ticket.priority === 'Low' && <span className="text-slate-400 font-bold text-xs">Low</span>}
                      </td>
                      <td className="px-6 py-4 text-blue-300 font-medium text-xs whitespace-nowrap">
                        {ticket.date}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button className="px-4 py-1.5 rounded-lg border border-blue-700 bg-blue-900/30 text-blue-100 hover:bg-blue-800 hover:text-white text-xs font-bold transition-colors">
                          View
                        </button>
                      </td>
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