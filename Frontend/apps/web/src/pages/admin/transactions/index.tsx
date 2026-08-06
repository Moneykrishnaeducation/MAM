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
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return mapping[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
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

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 mx-auto text-slate-100 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0b91f]/10 border border-[#f0b91f]/20 text-[#f0b91f] text-xs font-semibold mb-3">
              <ArrowUpCircle size={13} /> Transaction Management
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-[linear-gradient(180deg,#f0b91f_0%,#c99508_100%)]"></div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Transactions</h1>
            </div>
            <p className="mt-2 text-sm text-[#8db5ff]">
              View and manage deposit, withdraw, internal transfer, and pending transaction records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-[#081d5f] px-4 py-2.5 rounded-2xl border border-[#214fbf] focus-within:border-[#3aa0ff] transition-all">
              <Search size={16} className="text-[#8db5ff] shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="bg-transparent border-none text-xs text-white outline-none w-48 placeholder-[#8db5ff]"
              />
            </div>
            <button className="flex items-center gap-2 rounded-2xl border border-[#2858cd] bg-[#0b226a] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#d7e5ff] transition-all hover:bg-[#102c7c]">
              <CheckCircle2 size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="bg-[#040f2d] border border-[#153d9f] rounded-3xl p-2 mb-8 shadow-xl">
          <div className="flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-[#0b226a] border-[#2858cd] text-white shadow-lg'
                    : 'border-transparent text-[#8db5ff] hover:text-white hover:bg-[#0b226a]/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          </div>
        </div>

        <div className="overflow-x-auto bg-[#040f2d] rounded-3xl border border-[#153d9f] shadow-xl">
          <div className="p-6 border-b border-[#153d9f] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-[#8db5ff]">
                Showing <span className="font-semibold text-white">{filteredTransactions.length}</span> transactions in{' '}
                <span className="font-semibold text-white">{tabs.find((tab) => tab.id === activeTab)?.label}</span>
              </p>
              {summary?.total_transactions !== undefined && (
                <p className="mt-1 text-xs text-[#8db5ff]/70">
                  Total on record: <span className="font-semibold text-white">{summary.total_transactions}</span>
                </p>
              )}
            </div>
            <div className="text-xs text-[#8db5ff]/70">{loading ? 'Loading transactions...' : 'Updated just now'}</div>
          </div>

          {error && (
            <div className="m-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-bold">
              {error}
            </div>
          )}

          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#0b226a]">
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[#9ec0ff]">ID</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[#9ec0ff]">Type</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[#9ec0ff]">User</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[#9ec0ff]">Amount</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[#9ec0ff]">Method</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[#9ec0ff]">Destination</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[#9ec0ff]">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[#9ec0ff]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#153d9f]">
              {filteredTransactions.map((item) => (
                <tr
                  key={item.id}
                  className="text-[#dbe8ff] hover:bg-[#0a205f] transition-colors"
                >
                  <td className="px-6 py-4 font-mono font-bold text-[#f0b91f]">{item.id}</td>
                  <td className="px-6 py-4">{item.type}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{item.user}</div>
                    <div className="text-[11px] text-[#9ec0ff]">{item.email}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{item.amount}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#0b226a] text-[#8db5ff] border border-[#214fbf] font-semibold text-[10px] inline-block">
                      {item.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px]">{item.destination}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border ${formatStatus(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#8db5ff]">{item.date}</td>
                </tr>
              ))}
              {!loading && filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-[#8db5ff] text-sm">
                    No transactions match the current filter.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-[#8db5ff] text-sm">
                    <div className="flex justify-center mb-2"><div className="w-5 h-5 border-2 border-[#8db5ff] border-t-transparent rounded-full animate-spin"></div></div>
                    Loading transactions...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
