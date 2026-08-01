import React, { useState } from 'react';
import Head from 'next/head';
import {
  LifeBuoy, Plus, Search, MessageSquare,
  Clock, CheckCircle2, AlertCircle, ChevronRight, X,
} from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

const mockTickets = [
  { id: 'TKT-8921', subject: 'Withdrawal delay inquiry',    status: 'Open',     priority: 'High',   date: 'Today, 10:42 AM' },
  { id: 'TKT-8910', subject: 'How to allocate more funds?', status: 'Resolved', priority: 'Low',    date: '2 days ago' },
  { id: 'TKT-8842', subject: 'Platform login issue',        status: 'Resolved', priority: 'Medium', date: 'Last week' },
];

const FILTERS = ['All', 'Open', 'Resolved'] as const;
type Filter = typeof FILTERS[number];

export default function ClientTicketsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = mockTickets.filter((t) => {
    const matchesFilter = filter === 'All' || t.status === filter;
    const matchesSearch =
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex min-h-screen font-sans antialiased text-slate-100" style={{ backgroundColor: '#0e2250' }}>
      <Head>
        <title>Support Tickets | Client Portal</title>
      </Head>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes beam {
          0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
          50%       { opacity: 1;   transform: scaleX(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .float-slow { animation: float 6s ease-in-out infinite; }
        .float-mid  { animation: float 5s ease-in-out infinite 1s; }
        .float-fast { animation: float 4s ease-in-out infinite 2s; }

        .shimmer-text {
          background: linear-gradient(90deg, #93c5fd 0%, #ffffff 40%, #60a5fa 60%, #93c5fd 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .beam-line { animation: beam 3s ease-in-out infinite; }
        .page-enter { animation: fadeSlideUp 0.6s ease forwards; }
      `}</style>

      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ClientHeader />

        <div className="relative p-6 md:p-10 space-y-8 overflow-hidden">

          {/* ── Ambient orbs ── */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] float-slow" />
            <div className="absolute top-1/2 -right-40 w-[380px] h-[380px] rounded-full bg-indigo-500/8 blur-[100px] float-mid" />
            <div className="absolute bottom-10 left-1/3 w-[320px] h-[320px] rounded-full bg-blue-800/8 blur-[90px] float-fast" />
          </div>

          {/* ── Page Header ── */}
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 page-enter">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-3">
                <span className="text-white">Support </span>
                <span className="shimmer-text">Tickets</span>
              </h1>
              <p className="text-blue-200/60 text-sm leading-relaxed max-w-md">
                Need help? Open a ticket or review your past support requests below.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-px w-24 bg-gradient-to-r from-blue-500/80 to-transparent beam-line rounded-full" />
                <div className="h-px w-12 bg-gradient-to-r from-blue-400/50 to-transparent beam-line rounded-full" style={{ animationDelay: '0.5s' }} />
                <div className="h-px w-6 bg-gradient-to-r from-blue-300/30 to-transparent rounded-full" />
              </div>
            </div>

            {/* New Ticket button */}
            <button
              id="btn-new-ticket"
              className="relative flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                boxShadow: '0 8px 24px rgba(5,150,105,0.35)',
                color: '#fff',
              }}
            >
              <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
              <Plus size={16} strokeWidth={2.5} className="relative z-10" />
              <span className="relative z-10">New Ticket</span>
            </button>
          </div>

          {/* ── Table card ── */}
          <div
            className="rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #112058 0%, #0e2250 100%)', border: '1px solid rgba(59,130,246,0.15)' }}
          >
            {/* Table toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
              <div>
                <h3 className="text-base font-bold text-white">All Support Tickets</h3>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                  Showing{' '}
                  <span className="text-slate-300 font-semibold">{filtered.length}</span>
                  {' '}of{' '}
                  <span className="text-slate-300 font-semibold">{mockTickets.length}</span>
                  {' '}ticket{mockTickets.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter tabs */}
                <div className="flex gap-1.5">
                  {FILTERS.map((f) => {
                    const count = f === 'All' ? mockTickets.length : mockTickets.filter(t => t.status === f).length;
                    const active = filter === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                        style={{
                          background: active ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.05)',
                          color: active ? '#fff' : '#64748b',
                          border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
                          boxShadow: active ? '0 3px 10px rgba(37,99,235,0.35)' : 'none',
                        }}
                      >
                        {f}{f !== 'All' && <span className="ml-1 opacity-70">({count})</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#3b82f6' }} />
                  <input
                    id="ticket-search"
                    type="text"
                    placeholder="Search tickets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-7 py-1.5 rounded-xl text-xs outline-none transition-all w-48"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      color: '#e2e8f0',
                    }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: '#3b82f6' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Live indicator */}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ background: 'rgba(59,130,246,0.07)', borderColor: 'rgba(59,130,246,0.1)' }}>
                    {['Ticket ID', 'Subject', 'Status', 'Priority', 'Last Updated', 'Action'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: '#475569' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-14 text-sm" style={{ color: '#334155' }}>
                        No tickets match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((ticket, idx) => (
                      <tr
                        key={ticket.id}
                        className="group transition-colors"
                        style={{
                          borderBottom: '1px solid rgba(59,130,246,0.07)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(59,130,246,0.03)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.09)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(59,130,246,0.03)')}
                      >
                        {/* Ticket ID */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' }}
                          >
                            {ticket.id}
                          </span>
                        </td>

                        {/* Subject */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}
                            >
                              <MessageSquare size={14} style={{ color: '#3b82f6' }} />
                            </div>
                            <span className="font-semibold text-slate-100 text-sm leading-tight">{ticket.subject}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {ticket.status === 'Open' ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
                            >
                              <Clock size={11} /> Open
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                            >
                              <CheckCircle2 size={11} /> Resolved
                            </span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {ticket.priority === 'High' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                              <AlertCircle size={11} /> High
                            </span>
                          )}
                          {ticket.priority === 'Medium' && (
                            <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                              Medium
                            </span>
                          )}
                          {ticket.priority === 'Low' && (
                            <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8' }}>
                              Low
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-medium" style={{ color: '#475569' }}>
                          {ticket.date}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-blue-500/10 text-slate-400 hover:text-blue-300">
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}