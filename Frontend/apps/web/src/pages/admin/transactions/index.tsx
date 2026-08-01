import React, { useState } from 'react';
import Head from 'next/head';
import { CheckCircle2, ArrowUpCircle, ArrowDownCircle, Repeat, Search } from 'lucide-react';

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

const tabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'withdraw', label: 'Withdraw' },
  { id: 'internal', label: 'Internal Transfer' },
] as const;

const depositTransactions: TransactionItem[] = [
  {
    id: 'TXN-1001',
    type: 'Deposit',
    user: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    amount: '$15,000.00',
    method: 'Bank Wire',
    status: 'Pending',
    date: '1h ago',
    destination: 'Account: MAM-001',
  },
  {
    id: 'TXN-1005',
    type: 'Deposit',
    user: 'Elena Rostova',
    email: 'elena.r@example.com',
    amount: '$6,250.00',
    method: 'USDT-TRC20',
    status: 'Completed',
    date: '3h ago',
    destination: 'Wallet: 0x9Fa3...2c80',
  },
];

const withdrawTransactions: TransactionItem[] = [
  {
    id: 'TXN-2002',
    type: 'Withdraw',
    user: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    amount: '$4,200.00',
    method: 'Crypto USDT',
    status: 'Pending',
    date: '35m ago',
    destination: 'Wallet: 0x8c1f...B2e9',
  },
  {
    id: 'TXN-2009',
    type: 'Withdraw',
    user: 'Michael Chen',
    email: 'm.chen@example.com',
    amount: '$2,980.00',
    method: 'Bank Transfer',
    status: 'Processing',
    date: '2h ago',
    destination: 'Bank: HSBC UK (**** 9102)',
  },
];

const internalTransactions: TransactionItem[] = [
  {
    id: 'TXN-3004',
    type: 'Internal Transfer',
    user: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    amount: '$8,000.00',
    method: 'Account Transfer',
    status: 'Completed',
    date: '45m ago',
    destination: 'From: Live Account → Savings',
  },
  {
    id: 'TXN-3010',
    type: 'Internal Transfer',
    user: 'Elena Rostova',
    email: 'elena.r@example.com',
    amount: '$3,100.00',
    method: 'MT5 Account Move',
    status: 'Pending',
    date: '5h ago',
    destination: 'From: Demo → Live Account',
  },
];

const allPendingTransactions = [...depositTransactions, ...withdrawTransactions, ...internalTransactions].filter(
  (item) => item.status === 'Pending' || item.status === 'Processing'
);

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

  const selectedTransactions =
    activeTab === 'deposit'
      ? depositTransactions
      : activeTab === 'withdraw'
      ? withdrawTransactions
      : activeTab === 'internal'
      ? internalTransactions
      : allPendingTransactions;

  const filteredTransactions = selectedTransactions.filter((item) =>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <ArrowUpCircle size={13} /> Transaction Management
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Transactions</h1>
            <p className="text-slate-400 text-sm mt-1">View and manage deposit, withdraw, internal transfer, and pending transaction records.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="bg-transparent border-none text-sm text-white outline-none w-56 placeholder:text-slate-500"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all">
              <CheckCircle2 size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
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

        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <p className="text-sm text-slate-400">Showing <span className="font-semibold text-white">{filteredTransactions.length}</span> transactions in <span className="font-semibold text-white">{tabs.find((tab) => tab.id === activeTab)?.label}</span></p>
            </div>
            <div className="text-xs text-slate-500">Updated just now</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-separate border-spacing-y-2">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-[0.2em]">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">User</th>
                  <th className="pb-3 px-3">Amount</th>
                  <th className="pb-3 px-3">Method</th>
                  <th className="pb-3 px-3">Destination</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((item) => (
                  <tr key={item.id} className="bg-slate-950/80 border border-slate-800 rounded-3xl transition-all hover:bg-slate-900/95">
                    <td className="px-3 py-4 font-mono text-sky-300">{item.id}</td>
                    <td className="px-3 py-4 text-sm text-slate-200 font-semibold">{item.type}</td>
                    <td className="px-3 py-4">
                      <div className="text-slate-100 font-semibold">{item.user}</div>
                      <div className="text-[11px] text-slate-500">{item.email}</div>
                    </td>
                    <td className="px-3 py-4 font-semibold text-white">{item.amount}</td>
                    <td className="px-3 py-4 text-slate-300">{item.method}</td>
                    <td className="px-3 py-4 text-slate-300">{item.destination}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border ${formatStatus(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-400">{item.date}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">No transactions match the current filter.</td>
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
