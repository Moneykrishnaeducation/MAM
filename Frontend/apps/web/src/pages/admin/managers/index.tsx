import React, { useState } from 'react';
import Head from 'next/head';
import { 
  UserCheck, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Users, 
  CheckCircle2,
  Shield,
  AlertTriangle
} from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';
import FinancialActionModal, { type FinancialModalType, type FinancialUserTarget } from '@/components/Admin/FinancialActionModal';

interface ManagerData {
  id: string;
  name: string;
  email: string;
  accountId: string;
  balance: string;
  profit: string;
  share: string;
  risk: 'Low' | 'Medium' | 'High';
  investorsCount: number;
  investorsList: Array<{ id: string; name: string; email: string; invested: string; profit: string }>;
}

export default function AdminManagersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('MGR-101');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<FinancialModalType>(null);
  const [targetUser, setTargetUser] = useState<FinancialUserTarget | null>(null);

  const [managers, setManagers] = useState<ManagerData[]>([
    {
      id: 'MGR-101',
      name: 'Robert Vance',
      email: 'robert.vance@moneykrishna.com',
      accountId: 'ACC-MGR-001',
      balance: '$125,400.00',
      profit: '+$18,900.00',
      share: '20%',
      risk: 'Low',
      investorsCount: 4,
      investorsList: [
        { id: 'INV-301', name: 'Alex Rivera', email: 'alex.rivera@example.com', invested: '$14,250', profit: '+$2,100' },
        { id: 'INV-302', name: 'Elena Rostova', email: 'elena.r@example.com', invested: '$25,000', profit: '+$4,200' },
        { id: 'INV-303', name: 'Sarah Jenkins', email: 'sarah.j@example.com', invested: '$8,400', profit: '+$950' },
      ],
    },
    {
      id: 'MGR-102',
      name: 'Sarah Jenkins',
      email: 'sarah.j@moneykrishna.com',
      accountId: 'ACC-MGR-002',
      balance: '$84,000.00',
      profit: '+$9,500.00',
      share: '15%',
      risk: 'Medium',
      investorsCount: 2,
      investorsList: [
        { id: 'INV-304', name: 'Michael Chen', email: 'm.chen@example.com', invested: '$3,500', profit: '+$350' },
      ],
    },
    {
      id: 'MGR-103',
      name: 'David Sterling',
      email: 'd.sterling@moneykrishna.com',
      accountId: 'ACC-MGR-003',
      balance: '$210,000.00',
      profit: '+$32,400.00',
      share: '25%',
      risk: 'Low',
      investorsCount: 5,
      investorsList: [
        { id: 'INV-305', name: 'Apex Edu Capital', email: 'apex@example.com', invested: '$100,000', profit: '+$15,000' },
      ],
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleRow = (id: string) => {
    setExpandedRowId(prev => prev === id ? null : id);
  };

  const openFinancialModal = (mgr: ManagerData, type: FinancialModalType) => {
    setTargetUser({
      id: mgr.id,
      name: mgr.name,
      email: mgr.email,
      accountId: mgr.accountId,
      balance: mgr.balance,
      profit: mgr.profit,
      investors: mgr.investorsList,
    });
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleConfirmAction = (actionType: string, amount: string, note: string) => {
    setIsModalOpen(false);
    showToast(`Action "${actionType.toUpperCase()}" of $${amount} processed for ${targetUser?.name}.`);
  };

  const filteredManagers = managers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.accountId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Managers Directory | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />

        <div className="p-6 md:p-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <UserCheck size={13} /> Management Directory
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Managers Overview</h1>
              <p className="text-slate-400 text-sm mt-1">
                Monitor account balances, profits, share percentages, risk levels, and manage financial operations.
              </p>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-2.5 rounded-2xl w-72 md:w-96 border border-slate-700/50">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search manager name, email, or account ID..." 
                  className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-500" 
                />
              </div>
              <span className="text-xs text-slate-400 font-medium">Managers Count: <strong className="text-white">{filteredManagers.length}</strong></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-3 pl-2 font-semibold">User ID</th>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Mail ID</th>
                    <th className="pb-3 font-semibold">Account ID</th>
                    <th className="pb-3 font-semibold">Balance</th>
                    <th className="pb-3 font-semibold">Profit</th>
                    <th className="pb-3 font-semibold">Share</th>
                    <th className="pb-3 font-semibold">Risk</th>
                    <th className="pb-3 pr-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredManagers.map((m) => {
                    const isExpanded = expandedRowId === m.id;

                    return (
                      <React.Fragment key={m.id}>
                        {/* MAIN ROW */}
                        <tr 
                          onClick={() => toggleRow(m.id)}
                          className={`cursor-pointer transition-colors ${isExpanded ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
                        >
                          <td className="py-4 pl-2 font-mono text-blue-400 font-bold">{m.id}</td>
                          <td className="py-4 font-bold text-slate-100">{m.name}</td>
                          <td className="py-4 text-slate-400">{m.email}</td>
                          <td className="py-4 font-mono text-slate-300 font-semibold">{m.accountId}</td>
                          <td className="py-4 font-bold text-emerald-400">{m.balance}</td>
                          <td className="py-4 font-bold text-blue-400">{m.profit}</td>
                          <td className="py-4 font-mono text-slate-200 font-semibold">{m.share}</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              m.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              m.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {m.risk} Risk
                            </span>
                          </td>
                          <td className="py-4 pr-2 text-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleRow(m.id); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                            >
                              <span>Options</span>
                              {isExpanded ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* SUB-ROW DROPDOWN WITH BUTTONS */}
                        {isExpanded && (
                          <tr className="bg-slate-900/90 border-b border-slate-800">
                            <td colSpan={9} className="p-4 sm:p-5">
                              <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-inner">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <span>Financial Operations & Sub-Actions for <strong className="text-white">{m.name}</strong></span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-blue-400">Click any action to open modal</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                  {/* 1. Deposit */}
                                  <button
                                    onClick={() => openFinancialModal(m, 'deposit')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600/20 text-slate-200 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <ArrowDownCircle size={15} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span>Deposit</span>
                                  </button>

                                  {/* 2. Withdraw */}
                                  <button
                                    onClick={() => openFinancialModal(m, 'withdraw')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <ArrowUpCircle size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span>Withdraw</span>
                                  </button>

                                  {/* 3. Credit-In */}
                                  <button
                                    onClick={() => openFinancialModal(m, 'credit-in')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-purple-600/20 text-slate-200 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <PlusCircle size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                                    <span>Credit-In</span>
                                  </button>

                                  {/* 4. Credit-Out */}
                                  <button
                                    onClick={() => openFinancialModal(m, 'credit-out')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-amber-600/20 text-slate-200 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <MinusCircle size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                    <span>Credit-Out</span>
                                  </button>

                                  {/* 5. History */}
                                  <button
                                    onClick={() => openFinancialModal(m, 'history')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600/20 text-slate-200 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <History size={15} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                    <span>History</span>
                                  </button>

                                  {/* 6. Investors (List) - Manager Only */}
                                  <button
                                    onClick={() => openFinancialModal(m, 'investors_list')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600/15 hover:bg-teal-600 text-teal-400 hover:text-white border border-teal-500/30 text-xs font-bold transition-all shadow-sm group"
                                  >
                                    <Users size={15} className="group-hover:scale-110 transition-transform" />
                                    <span>Investors ({m.investorsCount})</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* REUSABLE FINANCIAL ACTION MODAL */}
      <FinancialActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetUser={targetUser}
        modalType={modalType}
        onConfirmAction={handleConfirmAction}
      />
    </div>
  );
}
