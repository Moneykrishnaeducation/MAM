import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  CircleDollarSign,
  Clock,
  FileText,
  Flag,
  Loader2,
  RotateCw,
  Search,
} from 'lucide-react';

type ClientTransaction = {
  id: number | string;
  type: string;
  amount: number;
  method: string;
  status: string;
  date: string | null;
};

const tabs = [
  { id: 'PENDING', label: 'PENDING', icon: Clock },
  { id: 'DEPOSIT', label: 'DEPOSIT', icon: ArrowDownCircle },
  { id: 'WITHDRAWAL', label: 'WITHDRAWAL', icon: ArrowUpCircle },
] as const;

type TransactionTabId = (typeof tabs)[number]['id'];

type TransactionCounts = Record<TransactionTabId, number>;

type TransactionSummary = {
  totalTransactions: number;
  pendingCount: number;
  totalVolume: number;
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
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

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
  }).format(parsed);
};

const normalizeTransaction = (transaction: any): ClientTransaction => ({
  id: transaction.id,
  type: String(transaction.type || 'Unknown'),
  amount: toNumber(transaction.amount),
  method: String(transaction.method || 'Wire Transfer'),
  status: String(transaction.status || 'Completed'),
  date: transaction.date ? String(transaction.date) : null,
});

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    case 'processing':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'failed':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    default:
      return 'bg-blue-500/10 text-blue-200 border-blue-500/20';
  }
};

const getTypeStyles = (type: string) => {
  switch (type.toLowerCase()) {
    case 'deposit':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'withdrawal':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    default:
      return 'bg-blue-500/10 text-blue-200 border-blue-500/20';
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
  PENDING: 0,
  DEPOSIT: 0,
  WITHDRAWAL: 0,
});

const createEmptyTransactionSummary = (): TransactionSummary => ({
  totalTransactions: 0,
  pendingCount: 0,
  totalVolume: 0,
});

const buildTransactionsEndpoint = (tab: TransactionTabId) => {
  const searchParams = new URLSearchParams();

  searchParams.set('tab', tab.toLowerCase());

  const queryString = searchParams.toString();
  return queryString ? `/api/client/transactions?${queryString}` : '/api/client/transactions';
};

const fetchTransactionsForTab = async (tab: TransactionTabId): Promise<TransactionApiResponse | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const endpoint = buildTransactionsEndpoint(tab);

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
  const [activeTab, setActiveTab] = useState<TransactionTabId>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [tabCounts, setTabCounts] = useState<TransactionCounts>(createEmptyTransactionCounts);
  const [summary, setSummary] = useState<TransactionSummary>(createEmptyTransactionSummary);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadTransactions = useCallback(async (tab: TransactionTabId) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchTransactionsForTab(tab);
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!response) {
        throw new Error('Unable to load live transactions right now.');
      }

      const normalized = Array.isArray(response.transactions)
        ? response.transactions.map(normalizeTransaction).sort((a, b) => {
            const aTime = a.date ? new Date(a.date).getTime() : 0;
            const bTime = b.date ? new Date(b.date).getTime() : 0;

            if (bTime !== aTime) {
              return bTime - aTime;
            }

            return Number(b.id) - Number(a.id);
          })
        : [];

      setTransactions(normalized);
      setTabCounts({
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
      setTabCounts(createEmptyTransactionCounts());
      setSummary(createEmptyTransactionSummary());
      setError('Unable to load live transactions right now.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTransactions(activeTab);
  }, [activeTab, loadTransactions]);

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
        accentClassName:
          'relative overflow-hidden rounded-3xl border border-blue-800/60 bg-gradient-to-br from-blue-900/40 via-[#0b183f] to-[#0b183f] p-6 shadow-2xl',
        iconClassName:
          'flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/20 text-blue-300',
        valueClassName: 'text-3xl font-black text-white',
        subtitleClassName: 'text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/70',
      },
      {
        title: 'Pending',
        value: String(summary.pendingCount),
        subtitle: 'Needs attention',
        icon: Clock,
        accentClassName:
          'relative overflow-hidden rounded-3xl border border-amber-800/50 bg-gradient-to-br from-amber-900/30 via-[#0b183f] to-[#0b183f] p-6 shadow-2xl',
        iconClassName:
          'flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-300',
        valueClassName: 'text-3xl font-black text-white',
        subtitleClassName: 'text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70',
      },
      {
        title: 'Total Volume',
        value: formatMoney(summary.totalVolume),
        subtitle: 'All transactions',
        icon: CircleDollarSign,
        accentClassName:
          'relative overflow-hidden rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-emerald-900/30 via-[#0b183f] to-[#0b183f] p-6 shadow-2xl',
        iconClassName:
          'flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-300',
        valueClassName: 'text-3xl font-black text-white flex items-baseline gap-2',
        subtitleClassName: 'text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70',
      },
    ],
    [summary],
  );

  const selectedTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return transactions;
    }

    return transactions.filter((transaction) =>
      [
        String(transaction.id),
        transaction.type,
        transaction.method,
        transaction.status,
        transaction.date || '',
        `TXN-${transaction.id}`,
        formatMoney(transaction.amount),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, transactions]);

  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(lastUpdated)
    : 'Waiting for sync';

  const showingStart = selectedTransactions.length > 0 ? 1 : 0;
  const showingEnd = selectedTransactions.length;

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'PENDING';

  const handleRefresh = () => {
    void loadTransactions(activeTab);
  };

  const hasError = Boolean(error);
  const emptyMessage = hasError
    ? error || 'Unable to load live transactions.'
    : searchTerm.trim()
      ? 'No transactions match your search.'
      : 'No live transactions are available for this tab.';

  return (
    <>
      <Head>
        <title>Transaction History | Client Portal</title>
      </Head>

      <div className="flex min-h-screen flex-col p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              <FileText size={13} />
              Live Client Ledger
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Transaction History</h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4965a3]" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="w-full rounded-full border border-[#1b2b5a] bg-[#0e1736] py-2.5 pl-12 pr-4 text-sm text-blue-100 placeholder-[#4965a3] outline-none transition-colors focus:border-blue-600 sm:w-[320px]"
              />
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-[#1b2b5a] bg-[#0e1736] shadow-lg transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Refresh transactions"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin text-[#EAB308]" />
              ) : (
                <RotateCw size={18} className="text-[#EAB308]" />
              )}
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className={card.accentClassName}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_38%)]" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <div className={`${card.subtitleClassName} mb-2`}>{card.title}</div>
                    <div className={card.valueClassName}>{card.value}</div>
                    <div className="mt-2 text-sm text-slate-300/70">{card.subtitle}</div>
                  </div>
                  <div className={card.iconClassName}>
                    <Icon size={22} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  isActive
                    ? 'border-yellow-400/40 bg-yellow-400 text-[#0A1128] shadow-[0_0_15px_rgba(234,179,8,0.18)]'
                    : 'border-[#1b2b5a] bg-[#0e1736] text-[#8a9cc3] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={15} />
                {tab.label}
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive ? 'bg-black/10 text-[#0A1128]' : 'bg-white/5 text-blue-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#1b2b5a] bg-[#0e1736] shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-[#1b2b5a] px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-400">
                Showing <span className="font-semibold text-white">{selectedTransactions.length}</span> transactions in{' '}
                <span className="font-semibold text-white">{activeTabLabel}</span>
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Last synced {lastUpdatedLabel}</div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  <th className="px-5 pb-3 pt-2">
                    <div className="inline-flex items-center gap-2">
                      <Calendar size={14} className="text-[#6484c9]" />
                      Date
                    </div>
                  </th>
                  <th className="px-5 pb-3 pt-2">Type</th>
                  <th className="px-5 pb-3 pt-2">Method</th>
                  <th className="px-5 pb-3 pt-2">
                    <div className="inline-flex items-center gap-2">
                      <CircleDollarSign size={14} className="text-[#6484c9]" />
                      Amount
                    </div>
                  </th>
                  <th className="px-5 pb-3 pt-2">
                    <div className="inline-flex items-center gap-2">
                      <FileText size={14} className="text-[#6484c9]" />
                      Reference
                    </div>
                  </th>
                  <th className="px-5 pb-3 pt-2">
                    <div className="inline-flex items-center gap-2">
                      <Flag size={14} className="text-[#6484c9]" />
                      Status
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="inline-flex items-center gap-3 rounded-full border border-blue-800/40 bg-[#101f4c] px-5 py-3 text-sm font-bold text-blue-100">
                        <Loader2 size={18} className="animate-spin text-[#EAB308]" />
                        Loading live transactions...
                      </div>
                    </td>
                  </tr>
                ) : selectedTransactions.length > 0 ? (
                  selectedTransactions.map((transaction) => {
                    const TypeIcon = getTypeIcon(transaction.type);
                    const amountClass =
                      transaction.type.toLowerCase() === 'withdrawal'
                        ? 'text-rose-300'
                        : transaction.type.toLowerCase() === 'deposit'
                          ? 'text-emerald-300'
                          : 'text-white';

                    return (
                      <tr
                        key={String(transaction.id)}
                        className="rounded-3xl border border-[#1b2b5a] bg-[#0b1739] transition-colors hover:bg-[#11214f]"
                      >
                        <td className="px-5 py-4 whitespace-nowrap text-slate-300">{formatDate(transaction.date)}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${getTypeStyles(transaction.type)}`}
                          >
                            <TypeIcon size={13} />
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-slate-200">{transaction.method}</td>
                        <td className={`px-5 py-4 whitespace-nowrap font-bold ${amountClass}`}>{formatMoney(transaction.amount)}</td>
                        <td className="px-5 py-4 whitespace-nowrap font-mono text-sky-300">{`TXN-${transaction.id}`}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusStyles(transaction.status)}`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center">
                      <div className="mx-auto max-w-lg rounded-3xl border border-blue-800/40 bg-[#101f4c] px-6 py-8 text-blue-100">
                        <div className="mb-3 text-2xl font-black text-white">No records found</div>
                        <p className="text-sm text-blue-200/70">{emptyMessage}</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="rounded-full border border-blue-700/50 px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-800/30"
                          >
                            Clear Search
                          </button>
                          <button
                            type="button"
                            onClick={handleRefresh}
                            className="rounded-full bg-[#EAB308] px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0A1128] transition-colors hover:opacity-90"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#1b2b5a] px-6 py-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#3a4f82]">
              SHOWING {showingStart} TO {showingEnd} OF {selectedTransactions.length}
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              LIVE SYNC
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
