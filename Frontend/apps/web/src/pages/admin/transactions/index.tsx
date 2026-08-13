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
  Ban,
  ChevronLeft,
  ChevronRight
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
  account_id_from?: string;
  account_id_to?: string;
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
  { id: 'pending', label: 'Pending' },
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
    return <ArrowUpRight className="w-4 h-4 text-red-400" />;
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

      <div className="w-full min-h-screen bg-[#0c1c59] text-white font-sans antialiased relative overflow-hidden">
        {/* Ambient background glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-8 relative z-10 space-y-6 md:space-y-8">
          
          {/* HEADER ROW WITH TABS AND ACTIONS */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-[#2450b7] pb-6">
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#081d5f] w-full xl:w-fit border border-[#2450b7] shadow-[0_20px_60px_rgba(4,15,54,0.2)]">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.15em] transition-all duration-300 ${
                      isActive
                        ? "bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-xl shadow-[#d4af37]/20 scale-[1.02] flex-1 md:flex-none"
                        : "text-[#8fb8ff] hover:text-white hover:bg-[#123283] flex-none"
                    }`}
                  >
                    {tab.id === 'pending' && <Clock size={14} />}
                    {tab.id === 'deposit' && <ArrowDownLeft size={14} />}
                    {tab.id === 'withdraw' && <ArrowUpRight size={14} />}
                    {tab.id === 'internal' && <ArrowLeftRight size={14} />}
                    <span className={isActive ? "inline" : "hidden md:inline"}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="relative group flex-1 xl:w-64 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8fb8ff] group-focus-within:text-[#d4af37] transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search ID, user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#2450b7] bg-[#081d5f] text-white outline-none focus:border-[#d4af37] transition-all font-bold text-xs shadow-sm placeholder:text-[#8fb8ff]/60"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8fb8ff] hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#081d5f] border border-[#2450b7] text-[#8fb8ff] text-[10px] font-black uppercase tracking-wider">
                <Filter size={14} className="text-[#d4af37]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer"
                >
                  <option value="All" className="bg-[#081d5f]">ALL STATUSES</option>
                  <option value="Pending" className="bg-[#081d5f]">PENDING</option>
                  <option value="Completed" className="bg-[#081d5f]">COMPLETED</option>
                  <option value="Processing" className="bg-[#081d5f]">PROCESSING</option>
                  <option value="Approved" className="bg-[#081d5f]">APPROVED</option>
                  <option value="Rejected" className="bg-[#081d5f]">REJECTED</option>
                  <option value="Failed" className="bg-[#081d5f]">FAILED</option>
                </select>
              </div>

              <button 
                onClick={loadTransactions}
                disabled={loading}
                className="p-3 rounded-2xl bg-[#081d5f] border border-[#2450b7] hover:bg-[#123283] hover:text-white text-[#8fb8ff] transition-all shrink-0"
              >
                <RefreshCw size={16} className={loading ? "animate-spin text-[#d4af37]" : ""} />
              </button>

              <button 
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#d4af37]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                <FileSpreadsheet size={15} /> Export
              </button>
            </div>
          </div>

          {/* SUMMARY STAT CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-[#081d5f] border border-[#2450b7] rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(4,15,54,0.2)] flex items-center justify-between">
              <div>
                <div className="text-[#8fb8ff] text-[9px] font-black uppercase tracking-[0.2em] mb-2">Pending Requests</div>
                <div className="text-2xl font-black text-amber-400">{summary?.pending_count ?? 0}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-[#081d5f] border border-[#2450b7] rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(4,15,54,0.2)] flex items-center justify-between">
              <div>
                <div className="text-[#8fb8ff] text-[9px] font-black uppercase tracking-[0.2em] mb-2">Total Deposits</div>
                <div className="text-2xl font-black text-emerald-400">{summary?.deposit_count ?? 0}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <ArrowDownLeft size={20} />
              </div>
            </div>

            <div className="bg-[#081d5f] border border-[#2450b7] rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(4,15,54,0.2)] flex items-center justify-between">
              <div>
                <div className="text-[#8fb8ff] text-[9px] font-black uppercase tracking-[0.2em] mb-2">Total Withdrawals</div>
                <div className="text-2xl font-black text-blue-400">{summary?.withdrawal_count ?? 0}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                <ArrowUpRight size={20} />
              </div>
            </div>

            <div className="bg-[#081d5f] border border-[#2450b7] rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(4,15,54,0.2)] flex items-center justify-between">
              <div>
                <div className="text-[#8fb8ff] text-[9px] font-black uppercase tracking-[0.2em] mb-2">Internal Transfers</div>
                <div className="text-2xl font-black text-[#d4af37]">{summary?.internal_count ?? 0}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] shrink-0 shadow-inner">
                <ArrowLeftRight size={20} />
              </div>
            </div>
          </div>

            {/* MAIN TABLE CONTAINER */}
          <div className="bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] border border-[#2450b7] rounded-[2.5rem] shadow-[0_30px_80px_rgba(4,15,54,0.25)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <CreditCard size={160} className="text-[#d4af37]" />
            </div>

            <div className="relative z-10">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#081d5f]">
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Tx ID</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Type</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">User Details</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Account</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Amount</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Method</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Approved By</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Approval Date</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Description</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Source</th>
                      
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Status</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2450b7]">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="p-20 text-center">
                          <div className="w-12 h-12 border-4 border-white/10 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Fetching transactions...</p>
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-20 text-center">
                          <Activity className="mx-auto mb-4 text-[#8fb8ff]/30 w-16 h-16" strokeWidth={1} />
                          <p className="mb-2 text-sm font-bold text-white uppercase tracking-widest">No transactions found</p>
                          <p className="text-xs text-[#8fb8ff]">Select a different tab or refine your query.</p>
                        </td>
                      </tr>
                    ) : (
                    filteredTransactions.map((item) => {
                      const statusMeta = formatStatusBadge(item.status);
                      const StatusIcon = statusMeta.icon;
                      const initials = getInitials(item.user);

                      return (
                        <tr key={item.id} className="hover:bg-[#123283]/40 transition-colors group">
                          <td className="px-6 py-4 border-b border-[#2450b7] font-mono text-xs font-bold text-[#d4af37]">
                            {item.id}
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <div className="flex items-center gap-2 font-bold">
                              <div className="p-1 rounded-lg bg-[#081d5f] border border-[#2450b7]">
                                {getTransactionIcon(item.type)}
                              </div>
                              <span className={`text-[11px] font-black uppercase tracking-wider ${
                                item.type === 'Deposit' ? 'text-emerald-400' :
                                item.type === 'Withdraw' ? 'text-red-400' :
                                'text-blue-400'
                              }`}>
                                {item.type}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-[#081d5f] border border-[#2450b7] flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs">{item.user}</div>
                                <div className="text-[10px] text-[#8fb8ff] font-mono">{item.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <span className="px-2.5 py-1 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 font-mono text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                              {(item.account_id_from && item.account_id_to) ? (
                                <>
                                  {item.account_id_from} <ArrowLeftRight className="w-3 h-3 text-[#d4af37]/70 mx-0.5" /> {item.account_id_to}
                                </>
                              ) : (
                                item.account || item.destination || '-'
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7] font-mono font-black text-white text-sm">
                            {item.amount}
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <span className="px-2.5 py-1 rounded-lg bg-[#081d5f] text-white border border-[#2450b7] font-mono text-[10px] inline-block">
                              {item.method}
                            </span>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7] text-white text-[11px] font-bold">
                            {item.approved_by || '-'}
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7] font-mono text-[10px] text-[#8fb8ff]">
                            {item.approval_date || item.date}
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <div className="max-w-[200px] truncate text-[11px] text-[#8fb8ff]" title={item.description || '-'}>
                              {item.description || '-'}
                            </div>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            {item.source ? (
                              <span className="px-2.5 py-1 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/25 font-black uppercase text-[9px] inline-block tracking-wider">
                                {item.source}
                              </span>
                            ) : (
                              <span className="text-[#8fb8ff] font-mono">-</span>
                            )}
                          </td>


                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border ${statusMeta.style}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                              {item.status}
                            </span>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7] text-right font-mono text-[11px] text-[#8fb8ff]">
                            {item.date}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="p-6 md:p-8 bg-[#081d5f] border-t border-[#2450b7] flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">
                  {total !== null ? (
                    <>
                      Entries <span className="text-white">{(page - 1) * perPage + 1}-{Math.min(page * perPage, total)}</span> of <span className="text-white">{total}</span>
                    </>
                  ) : (
                    <span>Showing results</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Rows</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-[#081d5f] border border-[#2450b7] rounded-lg px-2 py-1 text-[10px] font-black text-[#d4af37] outline-none"
                  >
                    {[10, 50, 100, 500, 1000].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  disabled={loading || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-3 rounded-xl border border-[#2450b7] hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-[#081d5f] text-[#8fb8ff]"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="px-4 font-black text-[#8fb8ff] text-xs">
                  PAGE {page} {totalPages ? `OF ${totalPages}` : ''}
                </span>
                <button
                  disabled={loading || totalPages === null || page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-3 rounded-xl border border-[#2450b7] hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-[#081d5f] text-[#8fb8ff]"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
