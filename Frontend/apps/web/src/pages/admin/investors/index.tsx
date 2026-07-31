import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Landmark, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  PlusCircle, 
  MinusCircle, 
  History, 
  CheckCircle2,
  DollarSign,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';
import FinancialActionModal, { type FinancialModalType, type FinancialUserTarget } from '@/components/Admin/FinancialActionModal';

interface InvestorData {
  id: string;
  name: string;
  email: string;
  managerName: string;
  managerUserId: string;
  accountId: string;
  invested: string; // Balance
  profit: string;
}

export default function AdminInvestorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('INV-301');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<FinancialModalType>(null);
  const [targetUser, setTargetUser] = useState<FinancialUserTarget | null>(null);

  const [investors, setInvestors] = useState<InvestorData[]>([
    {
      id: 'INV-301',
      name: 'Elena Rostova',
      email: 'elena.r@example.com',
      managerName: 'Robert Vance',
      managerUserId: 'MGR-101',
      accountId: 'ACC-INV-801',
      invested: '$25,000.00',
      profit: '+$4,200.00',
    },
    {
      id: 'INV-302',
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      managerName: 'Robert Vance',
      managerUserId: 'MGR-101',
      accountId: 'ACC-INV-802',
      invested: '$14,250.00',
      profit: '+$2,100.00',
    },
    {
      id: 'INV-303',
      name: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      managerName: 'Robert Vance',
      managerUserId: 'MGR-101',
      accountId: 'ACC-INV-803',
      invested: '$8,400.00',
      profit: '+$950.00',
    },
    {
      id: 'INV-304',
      name: 'Michael Chen',
      email: 'm.chen@example.com',
      managerName: 'Sarah Jenkins',
      managerUserId: 'MGR-102',
      accountId: 'ACC-INV-804',
      invested: '$3,500.00',
      profit: '+$350.00',
    },
    {
      id: 'INV-305',
      name: 'Apex Edu Capital',
      email: 'apex@example.com',
      managerName: 'David Sterling',
      managerUserId: 'MGR-103',
      accountId: 'ACC-INV-805',
      invested: '$100,000.00',
      profit: '+$15,000.00',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleRow = (id: string) => {
    setExpandedRowId(prev => prev === id ? null : id);
  };

  const openFinancialModal = (inv: InvestorData, type: FinancialModalType) => {
    setTargetUser({
      id: inv.id,
      name: inv.name,
      email: inv.email,
      accountId: inv.accountId,
      balance: inv.invested,
      profit: inv.profit,
    });
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleConfirmAction = (actionType: string, amount: string, note: string) => {
    setIsModalOpen(false);
    showToast(`Action "${actionType.toUpperCase()}" of $${amount} processed for ${targetUser?.name}.`);
  };

  const filteredInvestors = investors.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.accountId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Investors Directory | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />

        <div className="p-6 md:p-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <Landmark size={13} /> Investor Stakeholders
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Investors Directory</h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage investor accounts, assigned portfolio managers, invested balances, profits, and sub-actions.
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
                  placeholder="Search investor name, manager, or account ID..." 
                  className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-500" 
                />
              </div>
              <span className="text-xs text-slate-400 font-medium">Investors Count: <strong className="text-white">{filteredInvestors.length}</strong></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-3 pl-2 font-semibold">User ID</th>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Mail ID</th>
                    <th className="pb-3 font-semibold">Manager Name (User ID)</th>
                    <th className="pb-3 font-semibold">Account ID</th>
                    <th className="pb-3 font-semibold">Invested (Balance)</th>
                    <th className="pb-3 font-semibold">Profit</th>
                    <th className="pb-3 pr-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvestors.map((i) => {
                    const isExpanded = expandedRowId === i.id;

                    return (
                      <React.Fragment key={i.id}>
                        {/* MAIN ROW */}
                        <tr 
                          onClick={() => toggleRow(i.id)}
                          className={`cursor-pointer transition-colors ${isExpanded ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
                        >
                          <td className="py-4 pl-2 font-mono text-blue-400 font-bold">{i.id}</td>
                          <td className="py-4 font-bold text-slate-100">{i.name}</td>
                          <td className="py-4 text-slate-400">{i.email}</td>
                          <td className="py-4 text-slate-300">
                            <span className="font-semibold text-slate-200">{i.managerName}</span>{' '}
                            <span className="font-mono text-xs text-blue-400 font-medium">({i.managerUserId})</span>
                          </td>
                          <td className="py-4 font-mono text-slate-300 font-semibold">{i.accountId}</td>
                          <td className="py-4 font-bold text-emerald-400">{i.invested}</td>
                          <td className="py-4 font-bold text-blue-400">{i.profit}</td>
                          <td className="py-4 pr-2 text-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleRow(i.id); }}
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
                            <td colSpan={8} className="p-4 sm:p-5">
                              <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-inner">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <span>Investor Financial Operations for <strong className="text-white">{i.name}</strong></span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-blue-400">Click any action to open modal</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                  {/* 1. Deposit */}
                                  <button
                                    onClick={() => openFinancialModal(i, 'deposit')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600/20 text-slate-200 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <ArrowDownCircle size={15} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span>Deposit</span>
                                  </button>

                                  {/* 2. Withdraw */}
                                  <button
                                    onClick={() => openFinancialModal(i, 'withdraw')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <ArrowUpCircle size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span>Withdraw</span>
                                  </button>

                                  {/* 3. Credit-In */}
                                  <button
                                    onClick={() => openFinancialModal(i, 'credit-in')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-purple-600/20 text-slate-200 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <PlusCircle size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                                    <span>Credit-In</span>
                                  </button>

                                  {/* 4. Credit-Out */}
                                  <button
                                    onClick={() => openFinancialModal(i, 'credit-out')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-amber-600/20 text-slate-200 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <MinusCircle size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                    <span>Credit-Out</span>
                                  </button>

                                  {/* 5. History */}
                                  <button
                                    onClick={() => openFinancialModal(i, 'history')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600/20 text-slate-200 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <History size={15} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                    <span>History</span>
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
