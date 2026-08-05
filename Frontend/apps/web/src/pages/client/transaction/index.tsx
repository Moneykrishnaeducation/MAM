import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Flag,
  Loader2,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { TransactionsSkeleton } from '@/components/client-page-skeletons';

type ClientTransaction = {
  id: number | string;
  type: string;
  amount: number;
  method: string;
  status: string;
  date: string | null;
  account_id?: string;
};

const tabs = [
  { id: 'ALL', label: 'ALL', icon: CircleDollarSign },
  { id: 'PENDING', label: 'PENDING', icon: Clock },
  { id: 'DEPOSIT', label: 'DEPOSIT', icon: ArrowDownCircle },
  { id: 'WITHDRAWAL', label: 'WITHDRAWAL', icon: ArrowUpCircle },
] as const;

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100, 500, 1000] as const;

type TransactionTabId = (typeof tabs)[number]['id'];

type TransactionCounts = Record<TransactionTabId, number>;

type TransactionSummary = {
  totalTransactions: number;
  pendingCount: number;
  totalVolume: number;
};

type TransactionPagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

type TransactionApiResponse = {
  status?: string;
  user_id?: number;
  tab?: string;
  counts?: Partial<TransactionCounts>;
  summary?: {
    total_transactions?: number;
    pending_count?: number;
    total_volume?: number;
  };
  pagination?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
    has_next?: boolean;
    has_previous?: boolean;
  };
  transactions?: any[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const formatMoney = (value: number) =>
  `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const formatDate = (value: string | null) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const normalizeTransaction = (transaction: any): ClientTransaction => ({
  id: transaction.id,
  type: String(transaction.type || 'Unknown'),
  amount: toNumber(transaction.amount),
  method: String(transaction.method || 'Wire Transfer'),
  status: String(transaction.status || 'Completed'),
  date: transaction.date ? String(transaction.date) : null,
  account_id: transaction.account_number || transaction.account_id || 'N/A',
});

const getStatusStyles = (status: string, isDarkMode: boolean) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return isDarkMode
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    case 'processing':
      return isDarkMode
        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
        : 'bg-sky-500/10 text-sky-300 border-sky-500/20';
    case 'completed':
      return isDarkMode
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'failed':
      return isDarkMode
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        : 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    default:
      return isDarkMode
        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
        : 'bg-blue-500/10 text-blue-200 border-blue-500/20';
  }
};

const getTypeStyles = (type: string, isDarkMode: boolean) => {
  switch (type.toLowerCase()) {
    case 'deposit':
      return isDarkMode
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'withdrawal':
      return isDarkMode
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        : 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    default:
      return isDarkMode
        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
        : 'bg-blue-500/10 text-blue-200 border-blue-500/20';
  }
};

const getTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'deposit':
      return ArrowDownCircle;
    case 'withdrawal':
      return ArrowUpCircle;
    default:
      return FileText;
  }
};

const createEmptyTransactionCounts = (): TransactionCounts => ({
  ALL: 0,
  PENDING: 0,
  DEPOSIT: 0,
  WITHDRAWAL: 0,
});

const createEmptyTransactionSummary = (): TransactionSummary => ({
  totalTransactions: 0,
  pendingCount: 0,
  totalVolume: 0,
});

const buildTransactionsEndpoint = ({
  tab,
  page,
  perPage,
  searchTerm,
  fromDate,
  toDate,
}: {
  tab: TransactionTabId;
  page: number;
  perPage: number;
  searchTerm: string;
  fromDate: string;
  toDate: string;
}) => {
  const searchParams = new URLSearchParams();

  searchParams.set('tab', tab.toLowerCase());
  searchParams.set('page', String(page));
  searchParams.set('per_page', String(perPage));

  if (searchTerm.trim()) {
    searchParams.set('search', searchTerm.trim());
  }

  if (fromDate) {
    searchParams.set('from_date', fromDate);
  }

  if (toDate) {
    searchParams.set('to_date', toDate);
  }

  const queryString = searchParams.toString();
  return queryString ? `/api/client/transactions?${queryString}` : '/api/client/transactions';
};

const fetchTransactionsForTab = async ({
  tab,
  page,
  perPage,
  searchTerm,
  fromDate,
  toDate,
}: {
  tab: TransactionTabId;
  page: number;
  perPage: number;
  searchTerm: string;
  fromDate: string;
  toDate: string;
}): Promise<TransactionApiResponse | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const endpoint = buildTransactionsEndpoint({ tab, page, perPage, searchTerm, fromDate, toDate });

  const request = async () =>
    fetch(endpoint, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

  try {
    const response = await request();

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as TransactionApiResponse;
  } catch {
    return null;
  }
};

export default function TransactionHistory() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TransactionTabId>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [tabCounts, setTabCounts] = useState<TransactionCounts>(createEmptyTransactionCounts);
  const [summary, setSummary] = useState<TransactionSummary>(createEmptyTransactionSummary);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<TransactionPagination>({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const panelClass = isDarkMode
    ? 'border-slate-800 bg-slate-900'
    : 'border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)]';
  const inputClass = isDarkMode
    ? 'bg-white/10 border-white/10 text-white placeholder:text-gray-500'
    : 'border-[#214fbf] bg-[#081d5f] text-[#dbe8ff] placeholder:text-[#6f92e7]';
  const softTextClass = isDarkMode ? 'text-gray-400' : 'text-[#8fb8ff]';
  const headingTextClass = isDarkMode ? 'text-white' : 'text-white';
  const borderMutedClass = isDarkMode ? 'border-white/10' : 'border-[#1745b3]';

  const loadTransactions = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchTransactionsForTab({
        tab: activeTab,
        page: currentPage,
        perPage: rowsPerPage,
        searchTerm,
        fromDate,
        toDate,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!response) {
        throw new Error('Unable to load live transactions right now.');
      }

      const normalized = Array.isArray(response.transactions) ? response.transactions.map(normalizeTransaction) : [];

      setTransactions(normalized);
      setPagination({
        page: Number(response.pagination?.page ?? currentPage),
        perPage: Number(response.pagination?.per_page ?? rowsPerPage),
        total: Number(response.pagination?.total ?? normalized.length),
        totalPages: Number(response.pagination?.total_pages ?? 1),
        hasNext: Boolean(response.pagination?.has_next),
        hasPrevious: Boolean(response.pagination?.has_previous),
      });
      setTabCounts({
        ALL: response.counts?.ALL ?? 0,
        PENDING: response.counts?.PENDING ?? 0,
        DEPOSIT: response.counts?.DEPOSIT ?? 0,
        WITHDRAWAL: response.counts?.WITHDRAWAL ?? 0,
      });
      setSummary({
        totalTransactions: response.summary?.total_transactions ?? 0,
        pendingCount: response.summary?.pending_count ?? 0,
        totalVolume: toNumber(response.summary?.total_volume ?? 0),
      });
      setLastUpdated(new Date());
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setTransactions([]);
      setPagination({
        page: currentPage,
        perPage: rowsPerPage,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      });
      setTabCounts(createEmptyTransactionCounts());
      setSummary(createEmptyTransactionSummary());
      setError('Unable to load live transactions right now.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [activeTab, currentPage, fromDate, rowsPerPage, searchTerm, toDate]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  const summaryCards = useMemo(
    () => [
      {
        title: 'Total Transactions',
        value: String(summary.totalTransactions),
        subtitle: 'Live records loaded',
        icon: FileText,
        accentClassName: isDarkMode
          ? 'relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl'
          : 'relative overflow-hidden rounded-3xl border border-blue-800/60 bg-gradient-to-br from-blue-900/40 via-[#0b183f] to-[#0b183f] p-6 shadow-2xl',
        iconClassName: isDarkMode
          ? 'flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-300'
          : 'flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/20 text-blue-300',
        valueClassName: 'text-3xl font-black text-white',
        subtitleClassName: isDarkMode ? 'text-xs font-semibold uppercase tracking-[0.2em] text-gray-400' : 'text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/70',
      },
      {
        title: 'Pending',
        value: String(summary.pendingCount),
        subtitle: 'Needs attention',
        icon: Clock,
        accentClassName: isDarkMode
          ? 'relative overflow-hidden rounded-3xl border border-amber-900/45 bg-slate-900 p-6 shadow-xl'
          : 'relative overflow-hidden rounded-3xl border border-amber-800/50 bg-gradient-to-br from-amber-900/30 via-[#0b183f] to-[#0b183f] p-6 shadow-2xl',
        iconClassName: isDarkMode
          ? 'flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400'
          : 'flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-300',
        valueClassName: 'text-3xl font-black text-white',
        subtitleClassName: isDarkMode ? 'text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/80' : 'text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70',
      },
    ],
    [summary, isDarkMode],
  );

  const totalTransactions = pagination.total;
  const totalPages = Math.max(1, pagination.totalPages);
  const safePage = pagination.page;

  const paginationItems = useMemo<Array<number | 'ellipsis'>>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | 'ellipsis'> = [1];
    const leftSibling = Math.max(2, safePage - 1);
    const rightSibling = Math.min(totalPages - 1, safePage + 1);

    if (leftSibling > 2) {
      items.push('ellipsis');
    }

    for (let page = leftSibling; page <= rightSibling; page += 1) {
      items.push(page);
    }

    if (rightSibling < totalPages - 1) {
      items.push('ellipsis');
    }

    items.push(totalPages);
    return items;
  }, [safePage, totalPages]);

  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(lastUpdated)
    : 'Waiting for sync';

  const showingStart = totalTransactions > 0 ? (safePage - 1) * pagination.perPage + 1 : 0;
  const showingEnd = totalTransactions > 0
    ? Math.min(showingStart + transactions.length - 1, totalTransactions)
    : 0;

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'PENDING';

  const handleRefresh = () => {
    void loadTransactions();
  };

  const clearDateFilters = () => {
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const hasError = Boolean(error);
  const emptyMessage = hasError
    ? error || 'Unable to load live transactions.'
    : searchTerm.trim() || fromDate || toDate
      ? 'No transactions match your filters.'
      : 'No live transactions are available for this tab.';


  return (
    <>
      <Head>
        <title>Transaction History | Client Portal</title>
      </Head>

      <div className="relative p-6 md:p-10 space-y-12 overflow-hidden">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] float-anim-slow" />
          <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px] float-anim-2" />
          <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-600/8 blur-[90px] float-anim-3" />
        </div>

        {/* Controls Row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          {/* Left: Tabs */}
          <div className={`grid grid-cols-3 gap-2 p-2 rounded-[2rem] border ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-[#1747b8] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)]'} shadow-[0_10px_32px_rgba(4,15,54,0.22)] w-full lg:flex lg:w-auto`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  title={tab.label}
                  aria-label={tab.label}
                  className={`flex min-w-0 items-center justify-center gap-2 rounded-3xl px-3 py-3 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-300 lg:flex-1 lg:px-6 lg:py-4 lg:text-xs lg:tracking-widest ${
                    isActive
                      ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)] scale-[1.02]'
                      : isDarkMode
                        ? 'border border-transparent bg-white/5 text-gray-400 hover:text-white'
                        : 'border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] text-[#d8e4ff] hover:border-[#1c4fc3] hover:text-white'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="whitespace-nowrap">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Search + Date Filters + Refresh */}
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center md:flex-row md:items-center flex-1 lg:flex-initial w-full lg:w-auto">
            {/* From Date */}
            <div className="relative w-full sm:w-[11.5rem]">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-4 py-3 rounded-[1.1rem] border outline-none transition-all font-medium text-xs ${inputClass}`}
                title="From Date"
              />
            </div>
            {/* To Date */}
            <div className="relative w-full sm:w-[11.5rem]">
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-4 py-3 rounded-[1.1rem] border outline-none transition-all font-medium text-xs ${inputClass}`}
                title="To Date"
              />
            </div>
            {/* Clear Dates Button */}
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={clearDateFilters}
                className={`p-3 rounded-[1.1rem] border transition-all ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    : 'border-blue-900/60 bg-[#11255e] text-blue-300 hover:bg-[#18317a] hover:text-white'
                }`}
                title="Clear date filters"
              >
                <X size={16} />
              </button>
            )}
            {/* Search Input */}
            <div className="relative w-full sm:min-w-[16rem] sm:flex-1 lg:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8db5ff]" size={18} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-11 pr-4 py-3 rounded-[1.1rem] border outline-none transition-all font-medium focus:border-[#3aa0ff] ${inputClass}`}
              />
            </div>
          </div>
        </div>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className={card.accentClassName}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_38%)]" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <div className={`${card.subtitleClassName} mb-2`}>{card.title}</div>
                    <div className={card.valueClassName}>{card.value}</div>
                    <div className={isDarkMode ? 'mt-2 text-sm text-gray-400' : 'mt-2 text-sm text-slate-300/70'}>{card.subtitle}</div>
                  </div>
                  <div className={card.iconClassName}>
                    <Icon size={22} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table Container */}
        <div className={`${panelClass} rounded-[2.5rem] border overflow-hidden`}>
          {/* Table Header Section */}
          <div className={`p-8 border-b ${borderMutedClass}`}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-[linear-gradient(180deg,#f0b91f_0%,#c99508_100%)]"></div>
              <h2 className={`text-xl font-bold ${headingTextClass}`}>Transaction History</h2>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-b border-white/5 px-6 py-5 md:flex-row md:items-center md:justify-between bg-white/[0.02]">
            
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="flex items-center gap-3">
                <label className={`text-[11px] font-bold uppercase tracking-[0.2em] ${softTextClass}`} htmlFor="transactions-per-page">
                  Rows:
                </label>
                <select
                  id="transactions-per-page"
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none transition-all ${inputClass}`}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              
            </div>
          </div>

          {error && (
            <div className="mx-8 mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4 px-4 pb-4 md:hidden">
            {loading ? (
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,35,88,0.95)_0%,rgba(8,22,59,0.98)_100%)] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                  <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                  <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                  <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                </div>
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => {
                const TypeIcon = getTypeIcon(transaction.type);
                const amountClass =
                  transaction.type.toLowerCase() === 'withdrawal'
                    ? 'text-rose-400'
                    : transaction.type.toLowerCase() === 'deposit'
                      ? 'text-emerald-400'
                      : isDarkMode ? 'text-white' : 'text-white';

                return (
                  <article
                    key={String(transaction.id)}
                    className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,35,88,0.95)_0%,rgba(8,22,59,0.98)_100%)] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.22)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Reference</p>
                        <p className="mt-1 font-mono text-sm font-bold text-slate-50">{`TXN-${transaction.id}`}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold ${getStatusStyles(transaction.status, isDarkMode)}`}
                      >
                        {transaction.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">{formatDate(transaction.date)}</p>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Type</p>
                        <span
                          className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getTypeStyles(transaction.type, isDarkMode)}`}
                        >
                          <TypeIcon size={12} />
                          {transaction.type}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Method</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">{transaction.method}</p>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Amount</p>
                        <p className={`mt-1 text-sm font-black ${amountClass}`}>{formatMoney(transaction.amount)}</p>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,35,88,0.95)_0%,rgba(8,22,59,0.98)_100%)] p-8 text-center shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-[#0b226a]'}`}>
                  <Search className={isDarkMode ? 'text-gray-400' : 'text-[#8db5ff]'} size={26} />
                </div>
                <p className={`text-base font-bold ${softTextClass}`}>{emptyMessage}</p>
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className={isDarkMode ? 'bg-white/5' : 'bg-[#0b226a]'}>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>
                    <div className="inline-flex items-center gap-2">
                      <Calendar size={14} className="text-[#6484c9]" />
                      Date
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>Account</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>Type</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>Method</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>
                    <div className="inline-flex items-center gap-2">
                      <CircleDollarSign size={14} className="text-[#6484c9]" />
                      Amount
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>
                    <div className="inline-flex items-center gap-2">
                      <FileText size={14} className="text-[#6484c9]" />
                      Reference
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>
                    <div className="inline-flex items-center gap-2">
                      <Flag size={14} className="text-[#6484c9]" />
                      Status
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className={isDarkMode ? 'divide-y divide-white/5' : 'divide-y divide-[#153d9f]'}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded-full w-24" /></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded-full w-20" /></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded-full w-16" /></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded-full w-28" /></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded-full w-20" /></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded-full w-32" /></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded-full w-16" /></td>
                    </tr>
                  ))
                ) : transactions.length > 0 ? (
                  transactions.map((transaction) => {
                    const TypeIcon = getTypeIcon(transaction.type);
                    const amountClass =
                      transaction.type.toLowerCase() === 'withdrawal'
                        ? 'text-rose-400'
                        : transaction.type.toLowerCase() === 'deposit'
                          ? 'text-emerald-400'
                          : isDarkMode ? 'text-white' : 'text-white';

                    return (
                      <tr
                        key={String(transaction.id)}
                        className={`group ${isDarkMode ? 'hover:bg-white/5' : 'text-[#dbe8ff] hover:bg-[#0a205f]'} transition-colors`}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`font-bold ${isDarkMode ? 'text-gray-300' : 'text-[#dbe8ff]'}`}>
                            {formatDate(transaction.date)}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold ${
                              isDarkMode
                                ? 'border-[#d3a11a]/30 bg-[#e0b01d]/5 text-amber-400'
                                : 'border-[#d3a11a]/45 bg-[#e0b01d]/10 text-[#f5c22b]'
                            }`}
                          >
                            {transaction.account_id}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${getTypeStyles(transaction.type, isDarkMode)}`}
                          >
                            <TypeIcon size={13} />
                            {transaction.type}
                          </span>
                        </td>
                        <td className={`px-6 py-5 whitespace-nowrap font-bold ${isDarkMode ? 'text-gray-300' : 'text-[#dbe8ff]'}`}>{transaction.method}</td>
                        <td className={`px-6 py-5 whitespace-nowrap font-bold ${amountClass}`}>{formatMoney(transaction.amount)}</td>
                        <td className="px-6 py-5 whitespace-nowrap font-mono text-sky-400">{`TXN-${transaction.id}`}</td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusStyles(transaction.status, isDarkMode)}`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-[#0b226a]'}`}>
                        <Search className={isDarkMode ? 'text-gray-400' : 'text-[#8db5ff]'} size={32} />
                      </div>
                      <p className={`text-lg font-bold ${softTextClass}`}>{emptyMessage}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={`flex flex-col gap-4 border-t ${borderMutedClass} px-6 py-4 lg:flex-row lg:items-center lg:justify-between`}>
            <div className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
              SHOWING {showingStart} TO {showingEnd} OF {totalTransactions}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1 || !pagination.hasPrevious}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={13} />
                Prev
              </button>

              {paginationItems.map((pageItem, index) =>
                pageItem === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-xs select-none text-slate-600">
                    …
                  </span>
                ) : (
                  <button
                    key={pageItem}
                    type="button"
                    onClick={() => setCurrentPage(pageItem)}
                    className={`min-w-[32px] h-8 rounded-lg border text-xs font-bold transition-all ${
                      pageItem === safePage
                        ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {pageItem}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages || !pagination.hasNext}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
