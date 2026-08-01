import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import {
  LifeBuoy, Plus, Search, MessageSquare,
  Clock, CheckCircle2, AlertCircle, ChevronRight, X,
  ChevronLeft, Tag, FileText, Send
} from 'lucide-react';

const mockTickets: SupportTicket[] = [
  { id: 'TKT-8921', subject: 'Withdrawal delay inquiry',    status: 'Open',     priority: 'High',   date: 'Today, 10:42 AM' },
  { id: 'TKT-8910', subject: 'How to allocate more funds?', status: 'Closed',   priority: 'Low',    date: '2 days ago' },
  { id: 'TKT-8842', subject: 'Platform login issue',        status: 'Closed',   priority: 'Medium', date: 'Last week' },
  { id: 'TKT-8835', subject: 'Verification request status', status: 'Pending',  priority: 'Medium', date: '2 weeks ago' },
  { id: 'TKT-8821', subject: 'MT5 Terminal network issue',   status: 'Closed',   priority: 'High',   date: 'Last month' },
  { id: 'TKT-8812', subject: 'USDT deposit address update', status: 'Open',     priority: 'High',   date: 'Last month' },
  { id: 'TKT-8799', subject: 'Performance fee split query', status: 'Pending',  priority: 'Low',    date: 'Jun 14, 2026' },
  { id: 'TKT-8785', subject: 'Leverage limit inquiry',        status: 'Open',     priority: 'Medium', date: 'May 28, 2026' },
  { id: 'TKT-8772', subject: 'Tax report statement request',status: 'Closed',   priority: 'Low',    date: 'May 10, 2026' },
  { id: 'TKT-8760', subject: 'Password recovery assistance',status: 'Closed',   priority: 'Low',    date: 'Apr 02, 2026' },
];

const FILTERS = ['All', 'Open', 'Pending', 'Closed'] as const;
type Filter = typeof FILTERS[number];

type TicketStatus = 'Open' | 'Pending' | 'Closed';
type TicketPriority = 'High' | 'Medium' | 'Low';

interface SupportTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  date: string;
  category?: string;
  description?: string;
}

const CREATE_TICKET_CATEGORIES = [
  'Account Access',
  'Deposits & Withdrawals',
  'Trading Platform',
  'Verification',
  'General Question',
  'Other',
];

type CreateTicketFormState = {
  subject: string;
  category: string;
  priority: TicketPriority;
  description: string;
};

export default function ClientTicketsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [perPage, setPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState<CreateTicketFormState>({
    subject: '',
    category: CREATE_TICKET_CATEGORIES[0],
    priority: 'Medium',
    description: '',
  });

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchesFilter = filter === 'All' || t.status === filter;
      const matchesSearch =
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [search, filter, tickets]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = useMemo(() => {
    return filtered.slice((safePage - 1) * perPage, safePage * perPage);
  }, [filtered, safePage, perPage]);

  const handlePerPageChange = (val: number) => {
    setPerPage(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (val: Filter) => {
    setFilter(val);
    setCurrentPage(1);
  };

  const openCreateTicketModal = () => {
    setTicketForm({
      subject: '',
      category: CREATE_TICKET_CATEGORIES[0],
      priority: 'Medium',
      description: '',
    });
    setIsCreateModalOpen(true);
  };

  const closeCreateTicketModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const now = new Date();
    const createdTicket: SupportTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: ticketForm.subject.trim(),
      status: 'Open',
      priority: ticketForm.priority,
      category: ticketForm.category,
      description: ticketForm.description.trim(),
      date: now.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    };

    setTickets((prev) => [createdTicket, ...prev]);
    setIsCreateModalOpen(false);
    setFilter('All');
    setSearch('');
    setCurrentPage(1);
  };

  return (
    <>
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
            onClick={openCreateTicketModal}
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

        {/* ── Filter Tabs & Search Row (Outside the table) ── */}
        {isCreateModalOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-3xl overflow-hidden border border-blue-900/40 bg-[#0c1636] shadow-2xl my-auto">
              <div className="flex items-start justify-between gap-4 p-6 border-b border-blue-900/30 bg-[#0f1b42]">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold tracking-wider uppercase mb-3">
                    <LifeBuoy size={12} /> Create Ticket
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Open a new support request</h2>
                  <p className="text-sm text-blue-200/60 mt-1">
                    Share the issue and we'll route it to the right support queue.
                  </p>
                </div>
                <button
                  onClick={closeCreateTicketModal}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Close create ticket modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <MessageSquare size={13} className="text-blue-400" /> Subject
                    </span>
                    <input
                      type="text"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Short summary of the issue"
                      required
                      className="w-full rounded-2xl bg-[#0a1330] border border-blue-900/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Tag size={13} className="text-emerald-400" /> Category
                    </span>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full rounded-2xl bg-[#0a1330] border border-blue-900/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                    >
                      {CREATE_TICKET_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <AlertCircle size={13} className="text-amber-400" /> Priority
                    </span>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm((prev) => ({ ...prev, priority: e.target.value as TicketPriority }))}
                      className="w-full rounded-2xl bg-[#0a1330] border border-blue-900/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>

                  <div className="rounded-2xl border border-blue-900/30 bg-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      <FileText size={13} className="text-sky-400" /> What happens next
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      We'll create the ticket as <span className="text-emerald-300 font-semibold">Open</span> and send it to the support team.
                    </p>
                  </div>
                </div>

                <label className="space-y-2 block">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <FileText size={13} className="text-blue-400" /> Description
                  </span>
                  <textarea
                    rows={5}
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the issue in detail, including any error messages or account numbers if relevant."
                    required
                    className="w-full rounded-2xl bg-[#0a1330] border border-blue-900/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </label>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-blue-900/25">
                  <p className="text-xs text-slate-500">
                    Tip: include screenshots or timestamps in the description for faster triage.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={closeCreateTicketModal}
                      className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-sm font-black shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-opacity"
                    >
                      <Send size={15} /> Submit Ticket
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>, document.body
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-enter relative z-20">
          {/* Filter tabs */}
          <div className="flex bg-[#0b1736] p-1.5 rounded-2xl border border-blue-900/60 shadow-lg">
            {FILTERS.map((f) => {
              const count = f === 'All' ? tickets.length : tickets.filter(t => t.status === f).length;
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 tracking-wider"
                  style={{
                    background: active ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                    color: active ? '#fff' : '#64748b',
                    boxShadow: active ? '0 4px 15px rgba(37,99,235,0.3)' : 'none',
                  }}
                >
                  {f} <span className={`ml-1 text-[10px] ${active ? 'text-blue-200' : 'text-slate-500'}`}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400" />
            <input
              id="ticket-search"
              type="text"
              placeholder="Search tickets by ID or subject..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-11 pr-10 py-2.5 rounded-2xl text-xs outline-none transition-all w-64 bg-[#0b1736] border border-blue-900/60 text-slate-100 placeholder-slate-500 shadow-lg focus:border-blue-500"
            />
            {search && (
              <button onClick={() => handleSearchChange('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Table card ── */}
        <div
          className="rounded-3xl overflow-hidden shadow-2xl relative z-10"
          style={{ background: 'linear-gradient(135deg, #112058 0%, #0e2250 100%)', border: '1px solid rgba(59,130,246,0.15)' }}
        >
          {/* Table toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
            <div>
              <h3 className="text-base font-bold text-white">All Support Tickets</h3>
              <p className="text-xs mt-0.5" style={{ color: '#8a9cc3' }}>
                Showing{' '}
                <span className="text-slate-350 font-semibold">
                  {filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1}
                  –
                  {Math.min(safePage * perPage, filtered.length)}
                </span>{' '}
                of{' '}
                <span className="text-slate-350 font-semibold">{filtered.length}</span>{' '}
                ticket{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
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
                      style={{ color: '#64748b' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-sm" style={{ color: '#334155' }}>
                      No tickets match your search.
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket, idx) => (
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
                        {ticket.status === 'Open' && (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
                          >
                            <Clock size={11} /> Open
                          </span>
                        )}
                        {ticket.status === 'Pending' && (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                            style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa' }}
                          >
                            <Clock size={11} /> Pending
                          </span>
                        )}
                        {ticket.status === 'Closed' && (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                          >
                            <CheckCircle2 size={11} /> Closed
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

          {/* ── Pagination Footer ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-blue-900/60 bg-[#0b1736]">
            {/* Per-page selector */}
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <label htmlFor="per-page" className="text-xs text-slate-500 whitespace-nowrap">
                Rows per page:
              </label>
              <select
                id="per-page"
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="bg-[#0e2152] border border-blue-900/50 text-blue-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                {[5, 10, 25, 50, 100, 250, 500].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                — Page{' '}
                <span className="text-slate-350 font-semibold">{safePage}</span>
                {' '}of{' '}
                <span className="text-slate-350 font-semibold">{totalPages}</span>
              </span>
            </div>

            {/* Page buttons */}
            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              {/* Prev */}
              <button
                id="pagination-prev"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={13} /> Prev
              </button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const isEllipsis =
                  totalPages > 5 &&
                  page !== 1 &&
                  page !== totalPages &&
                  Math.abs(page - safePage) > 1;
                if (isEllipsis) {
                  if (page === safePage - 2 || page === safePage + 2) {
                    return (
                      <span key={page} className="text-slate-600 px-1 text-xs select-none">
                        …
                      </span>
                    );
                  }
                  return null;
                }
                return (
                  <button
                    key={page}
                    id={`pagination-page-${page}`}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all border ${
                      page === safePage
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              {/* Next */}
              <button
                id="pagination-next"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}