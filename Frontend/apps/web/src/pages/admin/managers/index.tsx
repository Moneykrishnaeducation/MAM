import React, { useState } from 'react';
import Head from 'next/head';
import { 
  UserCheck, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Users, 
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import FinancialActionModal, { type FinancialModalType, type FinancialUserTarget } from '@/components/Admin/FinancialActionModal';

export interface ManagerData {
  id: string;
  name: string;
  email: string;
  accountId: string;
  balance: string;
  credit: string;
  equity: string;
  profit: string;
  share: string;
  risk: 'Low' | 'Medium' | 'High';
  investorsCount: number;
  investorsList: Array<{ id: string; name: string; email: string; invested: string; profit: string }>;
}

export default function AdminManagersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('MGR-101');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<FinancialModalType>(null);
  const [targetUser, setTargetUser] = useState<FinancialUserTarget | null>(null);

  // Load state from single mockData.json / API endpoint
  const [managers, setManagers] = useState<ManagerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (value: number | string | null | undefined) => {
    const numericValue = Number(value ?? 0);
    return `$${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/managers');
      const data = await res.json();
      if (data && data.managers && Array.isArray(data.managers)) {
        const mapped = data.managers.map((m: any) => ({
          id: m.id.toString().startsWith('MGR-') ? m.id : `MGR-${m.id}`,
          name: m.name,
          email: m.email,
          accountId: m.accountId || m.account_id || 'MAM-MGR-00' + m.id,
          balance: formatCurrency(m.balance ?? m.aum ?? 0),
          credit: formatCurrency(m.credit ?? 0),
          equity: formatCurrency(m.equity ?? m.balance ?? m.aum ?? 0),
          profit: typeof m.profit === 'string' ? m.profit : `+${m.strategy || '12.5%'}`,
          share: m.share || m.performance_fee || '20%',
          risk: m.risk ? m.risk : (m.strategy?.toLowerCase().includes('high') ? 'High' : m.strategy?.toLowerCase().includes('low') ? 'Low' : 'Medium'),
          investorsCount: m.investorsCount || (m.investorsList ? m.investorsList.length : 0),
          investorsList: m.investorsList || [],
        }));
        if (mapped.length > 0) {
          setManagers(mapped);
        }
      }
    } catch {
      // Fallback state handle
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchManagers();
  }, []);

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
      credit: mgr.credit,
      equity: mgr.equity,
      profit: mgr.profit,
      investors: mgr.investorsList,
    });
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleConfirmAction = async (actionType: string, amount: string, note: string) => {
    if (!targetUser) return;
    setIsLoading(true);
    setIsModalOpen(false);

    const endpointMap: Record<string, string> = {
      deposit: '/api/admin/managers/deposit',
      withdraw: '/api/admin/managers/withdraw',
      'credit-in': '/api/admin/managers/credit-in',
      'credit-out': '/api/admin/managers/credit-out',
    };

    const targetEndpoint = endpointMap[actionType] || '/api/admin/managers/deposit';

    try {
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: targetUser.accountId,
          amount: parseFloat(amount),
          note,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to process financial operation');
      }
      showToast(data.message || `Action "${actionType.toUpperCase()}" of $${amount} processed successfully!`);
      fetchManagers();
    } catch (err: any) {
      showToast(err.message || 'Error executing financial action');
    } finally {
      setIsLoading(false);
    }
  };



  const filteredManagers = managers.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.accountId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'All' || m.risk === riskFilter;

    return matchesSearch && matchesRisk;
  });

  // Calculate Overview Stats
  const totalBalanceNum = managers.reduce((acc, m) => {
    const val = parseFloat(m.balance.replace(/[^0-9.-]+/g, '')) || 0;
    return acc + val;
  }, 0);

  const totalInvestors = managers.reduce((acc, m) => acc + (m.investorsCount || 0), 0);
  const lowRiskCount = managers.filter(m => m.risk === 'Low').length;
  const mediumRiskCount = managers.filter(m => m.risk === 'Medium').length;
  const highRiskCount = managers.filter(m => m.risk === 'High').length;

  return (
    <>
      <Head>
        <title>Managers Directory | Admin Portal</title>
      </Head>

      {/* 80% DARK BLUE CANVAS BACKGROUND */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 mx-auto min-h-screen text-slate-100">
      

        {/* SUMMARY KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1 */}
          <div className="bg-[#0b183f]/80 text-white border border-blue-800/40 backdrop-blur-sm rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">Total Fund Managers</span>
              <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-[#f5c84b] shadow-inner group-hover:bg-[#C9A227] group-hover:text-slate-900 group-hover:border-[#C9A227] transition-all duration-300">
                <UserCheck size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-white">{managers.length}</div>
              <div className="text-[11px] text-[#f5c84b] mt-1 flex items-center gap-1 font-bold">
                <span>100% Active strategy masters</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#C9A227] via-yellow-400 to-[#f5c84b] opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0b183f]/80 text-white border border-blue-800/40 backdrop-blur-sm rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Combined Balance (AUM)</span>
              <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-[#f5c84b] shadow-inner group-hover:bg-[#C9A227] group-hover:text-slate-900 group-hover:border-[#C9A227] transition-all duration-300">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white">
                ${totalBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-blue-300 mt-1 flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-400" />
                <span>Pooled capital balance</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#C9A227] via-yellow-400 to-[#f5c84b] opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0b183f]/80 text-white border border-blue-800/40 backdrop-blur-sm rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Assigned Investors</span>
              <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-[#f5c84b] shadow-inner group-hover:bg-[#C9A227] group-hover:text-slate-900 group-hover:border-[#C9A227] transition-all duration-300">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white">{totalInvestors}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Across {managers.length} active manager accounts
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#C9A227] via-yellow-400 to-[#f5c84b] opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#0b183f]/80 text-white border border-blue-800/40 backdrop-blur-sm rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Risk Level Split</span>
              <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-[#f5c84b] shadow-inner group-hover:bg-[#C9A227] group-hover:text-slate-900 group-hover:border-[#C9A227] transition-all duration-300">
                <ShieldAlert size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                {lowRiskCount} Low
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                {mediumRiskCount} Med
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold">
                {highRiskCount} High
              </span>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#C9A227] via-yellow-400 to-[#f5c84b] opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
          </div>

        </div>

{/* MODERN SUCCESS TOAST */}
{toastMessage && (
  <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
    <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-900/95 px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl min-w-[340px]">

      {/* Left Accent */}
      <div className="absolute left-0 top-0 h-full w-1 bg-emerald-400" />

      {/* Icon */}
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
      </div>

      {/* Message */}
      <div>
        <p className="text-sm font-semibold text-white">
          Success
        </p>
        <p className="mt-1 text-xs text-slate-300">
          {toastMessage}
        </p>
      </div>
    </div>
  </div>
)}


        {/* MAIN DATA TABLE CONTAINER */}
        <div className="bg-[#0b183f]/80 border border-blue-800/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
          
          {/* SEARCH & RISK TABS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            
            {/* Search Bar with Crisp Accent Inputs */}
            <div className="flex items-center gap-3 bg-blue-950/40 px-4 py-2.5 rounded-2xl w-full lg:w-96 border border-blue-800/60 focus-within:border-[#f5c84b] transition-all shadow-inner">
              <Search size={16} className="text-[#f5c84b] shrink-0" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by ID, Manager name, email, or account..." 
                className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-400 font-medium" 
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white text-xs">
                  Clear
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-1 mr-1 shrink-0">
                <SlidersHorizontal size={13} className="text-[#f5c84b]" /> Filter:
              </span>
              {(['All', 'Low', 'Medium', 'High'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border shrink-0 ${
                    riskFilter === r
                      ? 'bg-[#C9A227] text-slate-950 border-[#C9A227] shadow-lg shadow-[#a3851d]/20'
                      : 'bg-blue-900/40 text-slate-300 border-blue-800/40 hover:bg-[#C9A227]/20 hover:text-[#f5c84b] hover:border-[#C9A227]/40'
                  }`}
                >
                  {r === 'All' ? 'All Risks' : `${r} Risk`}
                </button>
              ))}
              
              <div className="h-4 w-[1px] bg-blue-900/80 mx-1 hidden sm:block" />
              
              <span className="text-xs text-slate-300 font-medium shrink-0">
                Showing <strong className="text-white">{filteredManagers.length}</strong> of <strong className="text-slate-300">{managers.length}</strong>
              </span>
            </div>

          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-blue-800/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-blue-900/40 font-semibold text-white">
                <tr className="border-b border-blue-800/40 uppercase tracking-widest text-[10px]">
                  <th className="py-3.5 px-4 font-bold text-white">Manager ID</th>
                  <th className="py-3.5 px-4 font-bold text-white">Manager Details</th>
                  <th className="py-3.5 px-4 font-bold text-white">Account ID</th>
                  <th className="py-3.5 px-4 font-bold text-white">Balance</th>
                  <th className="py-3.5 px-4 font-bold text-white">Credit</th>
                  <th className="py-3.5 px-4 font-bold text-white">Equity</th>
                  <th className="py-3.5 px-4 font-bold text-white">Profit Gain</th>
                  <th className="py-3.5 px-4 font-bold text-white">Fee Share</th>
                  <th className="py-3.5 px-4 font-bold text-white">Risk Level</th>
                  <th className="py-3.5 px-4 pr-6 text-right font-bold text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-800/40 bg-transparent">
                {filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      No manager profiles found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredManagers.map((m) => {
                    const isExpanded = expandedRowId === m.id;
                    const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2);

                    return (
                      <React.Fragment key={m.id}>
                        <tr 
                          onClick={() => toggleRow(m.id)}
                          className={`cursor-pointer transition-colors group ${
                            isExpanded 
                              ? 'bg-blue-900/40' 
                              : 'hover:bg-blue-900/20'
                          }`}
                        >
                          {/* ID */}
                          <td className="py-4 px-4 font-mono text-blue-300 font-bold">
                            {m.id}
                          </td>

                          {/* NAME & EMAIL */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#C9A227] text-slate-950 font-black text-xs flex items-center justify-center shadow-md shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs sm:text-sm group-hover:text-[#f5c84b] transition-colors">{m.name}</div>
                                <div className="text-blue-200/60 text-[11px] font-medium">{m.email}</div>
                              </div>
                            </div>
                          </td>
{/* ACCOUNT ID */}
<td className="py-4 px-4 font-mono">
  <span className="px-3 py-1.5 rounded-lg bg-blue-900/40 text-sm font-black text-white border border-blue-800/40">
    {m.accountId}
  </span>
</td>

                          {/* BALANCE */}
                          <td className="py-4 px-4 font-black text-white text-sm">
                            {m.balance}
                          </td>

                          {/* CREDIT */}
                          <td className="py-4 px-4 font-semibold text-amber-300 text-sm">
                            {m.credit}
                          </td>

                          {/* EQUITY */}
                          <td className="py-4 px-4 font-semibold text-cyan-300 text-sm">
                            {m.equity}
                          </td>

                          {/* PROFIT */}
                          <td className="py-4 px-4 font-bold text-blue-300">
                            <span className="inline-flex items-center gap-1">
                              <TrendingUp size={13} className="text-blue-400" />
                              {m.profit}
                            </span>
                          </td>

                          {/* SHARE */}
                          <td className="py-4 px-4 font-mono text-slate-200 font-semibold">
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/20 text-[11px] font-bold">
                              {m.share}
                            </span>
                          </td>

                          {/* RISK */}
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1.5 ${
                              m.risk === 'Low' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                              m.risk === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                              'bg-red-500/20 text-red-300 border-red-500/40'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                m.risk === 'Low' ? 'bg-emerald-400' :
                                m.risk === 'Medium' ? 'bg-amber-400' :
                                'bg-red-400'
                              }`} />
                              {m.risk} Risk
                            </span>
                          </td>

                          {/* ACTION EXPAND BUTTON */}
                          <td className="py-4 px-4 pr-6 text-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleRow(m.id); }}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all border ${
                                isExpanded 
                                  ? 'bg-[#C9A227] text-slate-950 border-[#C9A227] shadow-lg shadow-[#a3851d]/20' 
                                  : 'bg-blue-900/40 hover:bg-[#C9A227]/20 hover:text-[#f5c84b] text-slate-300 border-blue-800/40'
                              }`}
                            >
                              <span>{isExpanded ? 'Hide Menu' : 'Manage'}</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* EXPANDED ACTION PANEL */}
                        {isExpanded && (
                          <tr className="bg-blue-900/20 border-b border-blue-800/40">
                            <td colSpan={10} className="p-4 sm:p-5">
                              <div className="bg-[#0b183f]/90 rounded-2xl border border-blue-800/40 p-4 sm:p-5 shadow-2xl space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-800/40 pb-3">
                                  <div className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                                    <Sparkles size={14} className="text-[#f5c84b]" />
                                    <span>Financial & Account Controls — <strong className="text-[#f5c84b]">{m.name}</strong></span>
                                  </div>
                                  <span className="text-[11px] text-slate-300 font-mono">
                                    Manager Ref: <strong className="text-white">{m.id}</strong> | Acc: <strong className="text-blue-300">{m.accountId}</strong>
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                                  <button 
                                    onClick={() => openFinancialModal(m, 'deposit')} 
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-900/40 hover:bg-[#C9A227]/10 hover:text-[#f5c84b] hover:border-[#C9A227]/40 text-slate-300 border border-blue-800/40 text-xs font-bold transition-all group shadow-md"
                                  >
                                    <ArrowDownCircle size={18} className="text-[#f5c84b] opacity-80 mb-1 group-hover:scale-110 group-hover:opacity-100 transition-all" /> 
                                    <span>Deposit</span>
                                  </button>

                                  <button 
                                    onClick={() => openFinancialModal(m, 'withdraw')} 
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-900/40 hover:bg-[#C9A227]/10 hover:text-[#f5c84b] hover:border-[#C9A227]/40 text-slate-300 border border-blue-800/40 text-xs font-bold transition-all group shadow-md"
                                  >
                                    <ArrowUpCircle size={18} className="text-[#f5c84b] opacity-80 mb-1 group-hover:scale-110 group-hover:opacity-100 transition-all" /> 
                                    <span>Withdraw</span>
                                  </button>

                                  <button 
                                    onClick={() => openFinancialModal(m, 'credit-in')} 
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-900/40 hover:bg-[#C9A227]/10 hover:text-[#f5c84b] hover:border-[#C9A227]/40 text-slate-300 border border-blue-800/40 text-xs font-bold transition-all group shadow-md"
                                  >
                                    <PlusCircle size={18} className="text-[#f5c84b] opacity-80 mb-1 group-hover:scale-110 group-hover:opacity-100 transition-all" /> 
                                    <span>Credit-In</span>
                                  </button>

                                  <button 
                                    onClick={() => openFinancialModal(m, 'credit-out')} 
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-900/40 hover:bg-[#C9A227]/10 hover:text-[#f5c84b] hover:border-[#C9A227]/40 text-slate-300 border border-blue-800/40 text-xs font-bold transition-all group shadow-md"
                                  >
                                    <MinusCircle size={18} className="text-[#f5c84b] opacity-80 mb-1 group-hover:scale-110 group-hover:opacity-100 transition-all" /> 
                                    <span>Credit-Out</span>
                                  </button>

                                  <button 
                                    onClick={() => openFinancialModal(m, 'history')} 
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-900/40 hover:bg-[#C9A227]/10 hover:text-[#f5c84b] hover:border-[#C9A227]/40 text-slate-300 border border-blue-800/40 text-xs font-bold transition-all group shadow-md"
                                  >
                                    <History size={18} className="text-[#f5c84b] opacity-80 mb-1 group-hover:scale-110 group-hover:opacity-100 transition-all" /> 
                                    <span>History Logs</span>
                                  </button>

                                  {/* Accent Button */}
                                  <button 
                                    onClick={() => openFinancialModal(m, 'investors_list')} 
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#C9A227] hover:bg-[#b89d20] text-slate-950 border border-[#C9A227] text-xs font-black transition-all group shadow-lg shadow-[#a3851d]/20"
                                  >
                                    <Users size={18} className="mb-1 group-hover:scale-110 transition-transform" /> 
                                    <span>Investors </span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <FinancialActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetUser={targetUser}
        modalType={modalType}
        onConfirmAction={handleConfirmAction}
      />
    </>
  );
}
