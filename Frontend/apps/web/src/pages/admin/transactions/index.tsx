import React, { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Sparkles, 
  Filter, 
  X, 
  RefreshCw, 
  FileSpreadsheet, 
  DollarSign, 
  Wallet, 
  Activity,
  XCircle,
  CreditCard,
  ShieldCheck,
  Ban
} from 'lucide-react';

type TransactionType = 'Deposit' | 'Withdraw' | 'Internal Transfer';

type TransactionStatus = 'Pending' | 'Completed' | 'Failed' | 'Processing' | 'Approved' | 'Rejected';

interface TransactionItem {
  id: string;
  type: TransactionType;
  user: string;
  email: string;
  role?: string;
  account?: string;
  amount: string;
  method: string;
  approved_by?: string;
  approval_date?: string;
  description?: string;
  source?: string;
  status: TransactionStatus;
  date: string;
  destination: string;
}

interface TransactionsApiResponse {
  status: string;
  tab?: string;
  summary?: {
    total_transactions?: number;
    pending_count?: number;
    deposit_count?: number;
    withdrawal_count?: number;
    internal_count?: number;
    total_volume?: number;
  };
  transactions?: TransactionItem[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message?: string;
}

const tabs = [
  { id: 'pending', label: 'Pending Requests' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'withdraw', label: 'Withdrawals' },
  { id: 'internal', label: 'Internal Transfers' },
] as const;

function formatStatusBadge(status: TransactionStatus) {
  switch (status) {
    case 'Pending':
      return {
        style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400 animate-pulse',
        icon: Clock
      };
    case 'Processing':
      return {
        style: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dot: 'bg-blue-400 animate-spin',
        icon: RefreshCw
      };
    case 'Completed':
      return {
        style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        icon: CheckCircle2
      };
    case 'Approved':
      return {
        style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        icon: ShieldCheck
      };
    case 'Failed':
      return {
        style: 'bg-red-500/15 text-red-400 border-red-500/30',
        dot: 'bg-red-400',
        icon: XCircle
      };
    case 'Rejected':
      return {
        style: 'bg-red-500/15 text-red-400 border-red-500/30',
        dot: 'bg-red-400',
        icon: Ban
      };
    default:
      return {
        style: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        dot: 'bg-slate-400',
        icon: Activity
      };
  }
}

function getTransactionIcon(type: TransactionType) {
  if (type === 'Deposit') {
    return <ArrowDownLeft className="w-4 h-4 text-emerald-400" />;
  }
  if (type === 'Withdraw') {
    return <ArrowUpRight className="w-4 h-4 text-amber-400" />;
  }
  return <ArrowLeftRight className="w-4 h-4 text-blue-400" />;
}

function getInitials(name: string) {
  if (!name || name === '-') return 'TX';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function AdminTransactionsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<TransactionsApiResponse['summary']>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm, statusFilter, perPage]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('tab', activeTab);
      params.set('page', String(page));
      params.set('per_page', String(perPage));
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'All') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/transactions?${params.toString()}`, {
        credentials: 'include',
      });

      const data = (await response.json().catch(() => null)) as TransactionsApiResponse | null;

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to load transactions');
      }

      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setSummary(data?.summary || {});
      if (data?.pagination) {
        setTotal(Number(data.pagination.total ?? data.transactions?.length ?? 0));
        setTotalPages(Number(data.pagination.total_pages ?? 1));
      } else {
        setTotal(data?.transactions?.length ?? 0);
        setTotalPages(1);
      }
    } catch (fetchError: any) {
      setTransactions([]);
      setSummary({});
      setError(fetchError?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions();
    }, 400);
    return () => clearTimeout(timer);
  }, [activeTab, page, perPage, searchTerm, statusFilter]);

  const filteredTransactions = transactions;

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ["ID", "Type", "User", "Email", "Account", "Amount", "Method", "Approved By", "Approval Date", "Description", "Source",  "Status", "Date"];
    const rows = filteredTransactions.map(t => [
      t.id, t.type, t.user, t.email, t.account || '', t.amount, t.method,
      t.approved_by || '', t.approval_date || '', t.description || '',
      t.source || '', t.destination, t.status, t.date
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(cell => `"${cell}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Transaction History & Requests | Admin Portal</title>
      </Head>

      <div className="w-full text-slate-100 font-sans antialiased">
        {/* Ambient background glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10 space-y-5">
          
          {/* HEADER BANNER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-blue-600/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-inner shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#e6c687] text-[10px] font-black uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-[#d4af37]" /> Financial Operations
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Transaction Audit Ledger
                </h1>
                <p className="text-xs text-slate-400">
                  Monitor live client deposits, withdrawals, internal fund transfers, and pending requests.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={loadTransactions}
                disabled={loading}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center gap-2 text-xs font-semibold"
                title="Refresh ledger"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-[#d4af37]" : ""} />
                <span>Refresh</span>
              </button>

              <button 
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-gold-glow active:scale-95 disabled:opacity-50"
              >
                <FileSpreadsheet size={15} /> Export CSV
              </button>
            </div>
          </div>

          {/* SUMMARY STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-lg flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Pending Approvals</div>
                <div className="text-xl font-black text-amber-400 mt-0.5">{summary?.pending_count ?? 0} <span className="text-[10px] text-slate-500 font-semibold uppercase">Requests</span></div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Clock size={18} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-lg flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Deposits</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">{summary?.deposit_count ?? 0} <span className="text-[10px] text-slate-500 font-semibold uppercase">Completed</span></div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ArrowDownLeft size={18} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-lg flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Withdrawals</div>
                <div className="text-xl font-black text-blue-400 mt-0.5">{summary?.withdrawal_count ?? 0} <span className="text-[10px] text-slate-500 font-semibold uppercase">Processed</span></div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <ArrowUpRight size={18} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-lg flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Internal Transfers</div>
                <div className="text-xl font-black text-[#d4af37] mt-0.5">{summary?.internal_count ?? 0} <span className="text-[10px] text-slate-500 font-semibold uppercase">Moved</span></div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] shrink-0">
                <ArrowLeftRight size={18} />
              </div>
            </div>
          </div>

          {/* TAB BAR */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border bg-slate-900/90 border-white/10 w-fit backdrop-blur-md overflow-x-auto max-w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {tab.id === 'pending' && <Clock className={`w-3.5 h-3.5 ${isActive ? "text-[#d4af37]" : ""}`} />}
                  {tab.id === 'deposit' && <ArrowDownLeft className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : ""}`} />}
                  {tab.id === 'withdraw' && <ArrowUpRight className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : ""}`} />}
                  {tab.id === 'internal' && <ArrowLeftRight className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : ""}`} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN TABLE CONTAINER */}
          <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search transaction ID, user, email, method..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37] transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-slate-400 text-xs font-medium">
                  <Filter size={13} className="text-[#d4af37]" />
                  <span>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-slate-900 text-slate-200">All Statuses</option>
                    <option value="Pending" className="bg-slate-900 text-slate-200">Pending</option>
                    <option value="Completed" className="bg-slate-900 text-slate-200">Completed</option>
                    <option value="Processing" className="bg-slate-900 text-slate-200">Processing</option>
                    <option value="Approved" className="bg-slate-900 text-slate-200">Approved</option>
                    <option value="Rejected" className="bg-slate-900 text-slate-200">Rejected</option>
                    <option value="Failed" className="bg-slate-900 text-slate-200">Failed</option>
                  </select>
                </div>

                <div className="text-[11px] text-slate-500 font-mono px-2.5 py-1.5 rounded-xl bg-slate-950/40 border border-white/5">
                  Showing {filteredTransactions.length} of {transactions.length}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 font-black uppercase tracking-wider text-[10px] border-b border-white/10 pb-2">
                    <th className="pb-2.5 px-3">Tx ID</th>
                    <th className="pb-2.5 px-3">Type</th>
                    <th className="pb-2.5 px-3">User Details</th>
                    <th className="pb-2.5 px-3">Account</th>
                    <th className="pb-2.5 px-3">Amount</th>
                    <th className="pb-2.5 px-3">Method</th>
                    <th className="pb-2.5 px-3">Approved By</th>
                    <th className="pb-2.5 px-3">Approval Date</th>
                    <th className="pb-2.5 px-3">Description</th>
                    <th className="pb-2.5 px-3">Source</th>
                    
                    <th className="pb-2.5 px-3">Status</th>
                    <th className="pb-2.5 px-3 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="p-12 text-center">
                        <div className="mx-auto mb-2.5 h-8 w-8 animate-spin rounded-full border-3 border-[#d4af37] border-t-transparent" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fetching transactions...</p>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-12 text-center text-slate-400">
                        <Activity className="mx-auto mb-2 text-slate-600 h-8 w-8" />
                        <p className="mb-0.5 text-xs font-bold text-white">No transactions match your search or filter</p>
                        <p className="text-[11px] text-slate-500">Select a different tab or refine your query.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((item) => {
                      const statusMeta = formatStatusBadge(item.status);
                      const StatusIcon = statusMeta.icon;
                      const initials = getInitials(item.user);

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="py-3 px-3 font-mono text-xs font-bold text-[#d4af37]">
                            {item.id}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2 font-bold text-slate-200">
                              <div className="p-1 rounded-lg bg-slate-950/60 border border-white/10">
                                {getTransactionIcon(item.type)}
                              </div>
                              <span>{item.type}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[10px] shrink-0 group-hover:border-[#d4af37]/40 transition-colors">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-100">{item.user}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{item.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                            {item.account || item.destination || '-'}
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-white text-sm">
                            {item.amount}
                          </td>

                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 text-slate-300 border border-white/10 font-medium text-[11px] inline-block shadow-inner">
                              {item.method}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-slate-300 text-[11px]">
                            {item.approved_by || '-'}
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {item.approval_date || item.date}
                          </td>

                          <td className="py-3 px-3">
                            <div className="max-w-[200px] truncate text-[11px] text-slate-300" title={item.description || '-'}>
                              {item.description || '-'}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {item.source ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#d4af37]/10 text-[#e6c687] border border-[#d4af37]/25 font-semibold text-[10px] inline-block">
                                {item.source}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>


                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest border ${statusMeta.style}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                              {item.status}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-400">
                            {item.date}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 border-t border-white/5 pt-4">
              <div className="flex flex-wrap items-center gap-4">
                {total !== null ? (
                  <span>
                    Showing <strong className="text-white">{(page - 1) * perPage + 1}</strong> - <strong className="text-white">{Math.min(page * perPage, total)}</strong> of <strong className="text-white">{total}</strong> transactions
                  </span>
                ) : (
                  <span>Showing results</span>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Rows per page:</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#d4af37]/60 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={loading || page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Previous
                </button>

                <span className="text-xs text-slate-400">
                  Page <strong className="text-white">{page}</strong> {totalPages ? `of ${totalPages}` : ''}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading || totalPages === null || page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
