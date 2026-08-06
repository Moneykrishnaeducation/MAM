import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { CheckCircle2, ArrowUpCircle, Search } from 'lucide-react';

type TransactionType = 'Deposit' | 'Withdraw' | 'Internal Transfer';

type TransactionStatus = 'Pending' | 'Completed' | 'Failed' | 'Processing';

interface TransactionItem {
  id: string;
  type: TransactionType;
  user: string;
  email: string;
  amount: string;
  method: string;
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
  message?: string;
}

const tabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'withdraw', label: 'Withdraw' },
  { id: 'internal', label: 'Internal Transfer' },
] as const;

function formatStatus(status: TransactionStatus) {
  const mapping = {
    Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    Processing: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    Completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    Failed: 'bg-red-500/10 text-red-300 border-red-500/20',
  };
  return mapping[status];
}

export default function AdminTransactionsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<TransactionsApiResponse['summary']>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('tab', activeTab);

        const response = await fetch(`/api/admin/transactions?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        const data = (await response.json().catch(() => null)) as TransactionsApiResponse | null;

        if (!response.ok) {
          throw new Error(data?.message || 'Failed to load transactions');
        }

        setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
        setSummary(data?.summary || {});
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return;
        }
        setTransactions([]);
        setSummary({});
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();

    return () => controller.abort();
  }, [activeTab]);

  const filteredTransactions = transactions.filter((item) =>
    [item.id, item.user, item.email, item.type, item.method, item.destination]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Transactions | Admin Portal</title>
      </Head>

      <div className="p-6 md:p-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
              <ArrowUpCircle size={13} /> Transaction Management
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Transactions</h1>
            <p className="mt-1 text-sm text-slate-400">
              View and manage deposit, withdraw, internal transfer, and pending transaction records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="w-56 border-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 transition-all hover:bg-slate-700">
              <CheckCircle2 size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-400">
                Showing <span className="font-semibold text-white">{filteredTransactions.length}</span> transactions in{' '}
                <span className="font-semibold text-white">{tabs.find((tab) => tab.id === activeTab)?.label}</span>
              </p>
              {summary?.total_transactions !== undefined && (
                <p className="mt-1 text-xs text-slate-500">
                  Total on record: <span className="font-semibold text-slate-300">{summary.total_transactions}</span>
                </p>
              )}
            </div>
            <div className="text-xs text-slate-500">{loading ? 'Loading transactions...' : 'Updated just now'}</div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  <th className="px-3 pb-3">ID</th>
                  <th className="px-3 pb-3">Type</th>
                  <th className="px-3 pb-3">User</th>
                  <th className="px-3 pb-3">Amount</th>
                  <th className="px-3 pb-3">Method</th>
                  <th className="px-3 pb-3">Destination</th>
                  <th className="px-3 pb-3">Status</th>
                  <th className="px-3 pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((item) => (
                  <tr
                    key={item.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950/80 transition-all hover:bg-slate-900/95"
                  >
                    <td className="px-3 py-4 font-mono text-sky-300">{item.id}</td>
                    <td className="px-3 py-4 text-sm font-semibold text-slate-200">{item.type}</td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-slate-100">{item.user}</div>
                      <div className="text-[11px] text-slate-500">{item.email}</div>
                    </td>
                    <td className="px-3 py-4 font-semibold text-white">{item.amount}</td>
                    <td className="px-3 py-4 text-slate-300">{item.method}</td>
                    <td className="px-3 py-4 text-slate-300">{item.destination}</td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${formatStatus(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-400">{item.date}</td>
                  </tr>
                ))}
                {!loading && filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      No transactions match the current filter.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      Loading transactions...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
