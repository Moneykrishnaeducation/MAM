import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { 
  LifeBuoy, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  User, 
  Mail, 
  Calendar, 
  Tag, 
  FileText, 
  Paperclip, 
  Eye, 
  RefreshCw, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

type TicketStatus = 'Open' | 'Pending' | 'Closed';
type TicketTabFilter = 'all' | 'open' | 'pending' | 'closed';

interface TicketAttachment {
  id: string;
  name?: string;
  file?: string;
  file_url?: string;
}

interface AdminTicket {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: TicketStatus;
  description: string | null;
  date: string | null;
  attachments: TicketAttachment[];
  user_id: string;
  user_name: string;
  user_email: string;
}

interface TicketsSummary {
  total_tickets: number;
  open_count: number;
  pending_count: number;
  closed_count: number;
}

function getAdminRole(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find((row) => row.startsWith('role='));
  return match ? decodeURIComponent(match.split('=')[1] || '').trim() : '';
}

function isViewerOnly(role: string): boolean {
  return role.toLowerCase() === 'viewer';
}

export default function AdminTicketsPage() {
  const [adminRole, setAdminRole] = useState('');
  const [activeTab, setActiveTab] = useState<TicketTabFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [summary, setSummary] = useState<TicketsSummary>({
    total_tickets: 0,
    open_count: 0,
    pending_count: 0,
    closed_count: 0,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  const isViewer = useMemo(() => isViewerOnly(adminRole), [adminRole]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      params.append('page', String(page));
      params.append('per_page', String(perPage));

      const res = await fetch(`/api/admin/tickets?${params.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to load support tickets');
      }

      setTickets(data?.tickets || []);
      if (data?.summary) {
        setSummary(data.summary);
      }
      setTotal(data?.total ?? 0);
      setTotalPages(data?.total_pages ?? 1);
    } catch (err: any) {
      sonnerToast.error(err.message || 'Error fetching tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, searchTerm, page, perPage]);

  const handleUpdateStatus = async (ticketId: number, newStatus: TicketStatus) => {
    if (isViewer) {
      sonnerToast.error('Viewer accounts do not have permission to modify ticket status.');
      return;
    }

    setStatusUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update ticket status');
      }

      if (newStatus === 'Closed') {
        sonnerToast.error(`Ticket #${ticketId} status set to Closed`);
      } else {
        sonnerToast.success(`Ticket #${ticketId} status updated to ${newStatus}`);
      }

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      void fetchTickets();
    } catch (err: any) {
      sonnerToast.error(err.message || 'Error updating status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'urgent' || p === 'high') {
      return 'bg-red-500/15 border-red-500/30 text-red-400';
    }
    if (p === 'medium') {
      return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
    }
    return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
  };

  const getStatusBadgeClass = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'Pending':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      case 'Closed':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
      default:
        return 'bg-slate-700/50 border-slate-600 text-slate-300';
    }
  };

  return (
    <>
      <Head>
        <title>Client Support Tickets | Admin Panel</title>
        <meta name="description" content="View and respond to client support tickets" />
      </Head>

      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto text-slate-100">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#d4af37]">
                <LifeBuoy size={22} />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">Client Support Tickets</h1>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Manage client inquiries, technical questions, and account support requests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchTickets()}
            disabled={loading}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Tickets</span>
              <LifeBuoy size={16} className="text-blue-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-white">{summary.total_tickets}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
              <span>Open</span>
              <AlertCircle size={16} className="text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-300">{summary.open_count}</p>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-blue-400 text-xs font-semibold">
              <span>In Progress</span>
              <Clock size={16} className="text-blue-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-blue-300">{summary.pending_count}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span>Closed</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-300">{summary.closed_count}</p>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {(['all', 'open', 'pending', 'closed'] as TicketTabFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 shadow-md font-black'
                    : 'bg-slate-900/60 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All Tickets' : tab}
              </button>
            ))}
          </div>

          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search subject, client, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>

        {/* TICKETS TABLE */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Ticket ID</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Subject & Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-amber-400" />
                        <span>Loading tickets...</span>
                      </div>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <p className="font-semibold text-slate-300">No tickets found</p>
                      <p className="text-[11px] text-slate-500 mt-1">Try selecting another tab or resetting search filters.</p>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        #{t.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{t.user_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.user_id} • {t.user_email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 max-w-xs truncate">{t.subject}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Tag size={10} className="text-amber-400/80" />
                          <span>{t.category || 'General'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadgeClass(t.priority)}`}>
                          {t.priority || 'Normal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {t.date || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(t)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-xs font-semibold transition-colors"
                          >
                            <Eye size={13} />
                            View
                          </button>
                          
                          {!isViewer && t.status !== 'Closed' && (
                            <button
                              type="button"
                              disabled={statusUpdatingId === t.id}
                              onClick={() => void handleUpdateStatus(t.id, 'Closed')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-white/10 bg-slate-950/40 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Rows per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-amber-500/50"
              >
                {[5, 10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">
                Showing {total > 0 ? (page - 1) * perPage + 1 : 0} - {Math.min(page * perPage, total)} of {total} tickets
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                Previous
              </button>
              
              <span className="px-3 py-1 text-slate-400 font-mono text-xs">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* DETAIL MODAL */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-amber-400">#{selectedTicket.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedTicket.subject}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* CLIENT META */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Client Name</span>
                  <span className="font-semibold text-white">{selectedTicket.user_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Client Code</span>
                  <span className="font-mono text-slate-200">{selectedTicket.user_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Client Email</span>
                  <span className="font-mono text-slate-200 truncate block">{selectedTicket.user_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Category</span>
                  <span className="text-slate-200">{selectedTicket.category || 'General'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Priority</span>
                  <span className={`font-semibold ${selectedTicket.priority === 'High' ? 'text-red-400' : 'text-blue-300'}`}>{selectedTicket.priority || 'Normal'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Submitted</span>
                  <span className="text-slate-300 font-mono">{selectedTicket.date || 'N/A'}</span>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description || 'No description provided.'}
                </div>
              </div>

              {/* ATTACHMENTS */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Paperclip size={12} />
                    Attachments
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.attachments.map((att, idx) => (
                      <a
                        key={att.id || idx}
                        href={att.file_url || att.file || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-amber-300 font-medium transition-colors"
                      >
                        <FileText size={14} />
                        <span>{att.name || `Attachment #${idx + 1}`}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION FOOTER */}
              {!isViewer && (
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">Update Ticket Status:</span>
                  <div className="flex items-center gap-2">
                    {(['Open', 'Pending', 'Closed'] as TicketStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={selectedTicket.status === st || statusUpdatingId === selectedTicket.id}
                        onClick={() => void handleUpdateStatus(selectedTicket.id, st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          selectedTicket.status === st
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        }`}
                      >
                        Set {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </>
  );
}
