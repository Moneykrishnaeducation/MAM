import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { toast } from 'sonner';
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
  RefreshCw,
  X
} from 'lucide-react';
import FinancialActionModal, { type FinancialModalType, type FinancialUserTarget } from '@/components/Admin/FinancialActionModal';
import ProfitShareHistory from '@/components/ProfitShareHistory';
import ClosedPositionsModal from '@/components/Admin/ClosedPositionsModal';

/* ─── Cookie & Role Helpers ────────────────────────────── */
function getAdminRole(): string {
  try {
    const nameEQ = 'role=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        try {
          return decodeURIComponent(cookie.substring(nameEQ.length)).trim();
        } catch {
          return cookie.substring(nameEQ.length).trim();
        }
      }
    }
  } catch {}
  return '';
}

const isViewerOnly = (role: string) => role.toLowerCase() === 'viewer';

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

function getInitials(name: string) {
  if (!name || name === '-') return 'MGR';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function AdminManagersPage() {
  const [adminRole, setAdminRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<FinancialModalType>(null);
  const [targetUser, setTargetUser] = useState<FinancialUserTarget | null>(null);

  // Profit Share Modal State
  const [profitShareModalManager, setProfitShareModalManager] = useState<ManagerData | null>(null);

  // Closed Positions Modal State
  const [isClosedPositionsOpen, setIsClosedPositionsOpen] = useState(false);
  const [closedPositionsUser, setClosedPositionsUser] = useState<{id: string, name: string, accountId: string} | null>(null);

  // Load state from API endpoint
  const [managers, setManagers] = useState<ManagerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, riskFilter, perPage]);

  const isViewer = useMemo(() => isViewerOnly(adminRole) || adminRole.toLowerCase() === 'viewer', [adminRole]);

  const formatCurrency = (value: number | string | null | undefined) => {
    const numericValue = Number(value ?? 0);
    return `$${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', String(perPage));
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/admin/managers?${params.toString()}`, { credentials: 'include' });
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
        setManagers(mapped);
        if (data.pagination) {
          setTotal(Number(data.pagination.total ?? data.managers.length));
          setTotalPages(Number(data.pagination.total_pages ?? 1));
        } else {
          setTotal(data.managers.length);
          setTotalPages(1);
        }
      } else {
        setManagers([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch {
      setManagers([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchManagers();
    }, 400);
    return () => clearTimeout(timer);
  }, [page, perPage, searchTerm]);

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    if (isError) {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
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

  const handleConfirmAction = async (actionType: string, amount: string, note: string): Promise<boolean> => {
    if (!targetUser || isViewer) return false;
    setIsLoading(true);

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
        credentials: 'include',
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
      const isWithdrawal = actionType === 'withdraw';
      showToast(data.message || `Action "${actionType.toUpperCase()}" of $${amount} processed successfully!`, isWithdrawal);
      fetchManagers();
      return true;
    } catch (err: any) {
      showToast(err.message || 'Error executing financial action', true);
      return false;
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

      <div className="w-full min-h-screen bg-[#0c1c59] text-white font-sans antialiased relative overflow-hidden">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mt-8 p-3 sm:p-4 relative z-10 space-y-3.5">
          {/* <div className="rounded-[2rem] bg-white/5 px-5 py-4 shadow-[0_18px_45px_rgba(4,15,54,0.22)] backdrop-blur-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#d4af37]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.26em] text-[#f5d77a]">
                  <Users size={12} />
                  Admin Workspace
                </span>
                <h1 className="text-3xl font-black tracking-tight text-transparent bg-gradient-to-r from-white via-blue-100 to-[#d4af37] bg-clip-text md:text-4xl">
                  Managers Directory
                </h1>
                <p className="max-w-2xl text-sm text-blue-200/75">
                  Review manager accounts, monitor balances, and manage actions from one focused view.
                </p>
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/60">
                Live portfolio oversight
              </div>
            </div>
          </div> */}
          {/* TOAST NOTIFICATION */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-blue-300 hover:text-white">&times;</button>
            </div>
          )}

          {/* MAIN TABLE CONTAINER */}
          <div className="rounded-[2.5rem] border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)] p-6 md:p-8 overflow-hidden">
            
            {/* TOOLBAR SEARCH & FILTERS */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#24358a]">
              <div className="relative group w-full md:w-96">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={16} className="text-blue-300 group-focus-within:text-white transition-colors" />
                </div>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search ID, Manager name, email, or account..." 
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[2rem] pl-11 pr-10 py-3 text-sm text-white placeholder:text-blue-300/70 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all shadow-[0_8px_32px_rgba(4,15,54,0.3)] backdrop-blur-md" 
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 overflow-x-auto w-full xl:w-auto xl:justify-end">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-blue-300 font-bold uppercase tracking-wider mr-1">Filter:</span>
                  {(['All', 'Low', 'Medium', 'High'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRiskFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        riskFilter === r
                          ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 shadow-md font-bold'
                          : 'bg-[#113b95]/40 border border-[#24358a] text-blue-300 hover:text-white hover:bg-[#113b95]/60'
                      }`}
                    >
                      {r === 'All' ? 'All Risks' : `${r} Risk`}
                    </button>
                  ))}
                </div>

                <div className="hidden sm:block w-px h-6 bg-[#24358a]" />

                <button
                  onClick={() => fetchManagers()}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-[#113b95]/40 border border-[#24358a] text-blue-300 hover:text-white hover:bg-[#113b95]/60 hover:border-blue-400/50 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 w-full sm:w-auto"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin text-[#d4af37]" : ""} />
                  Refresh
                </button>
              </div>
            </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#24358a] pb-2">
                    <th className="pb-2 px-2.5">Manager ID</th>
                    <th className="pb-2 px-2.5">Manager Details</th>
                    <th className="pb-2 px-2.5">Account ID</th>
                    <th className="pb-2 px-2.5">Balance</th>
                    <th className="pb-2 px-2.5">Credit</th>
                    <th className="pb-2 px-2.5">Equity</th>
                    <th className="pb-2 px-2.5">Profit Gain</th>
                    <th className="pb-2 px-2.5">Fee Share</th>
                    <th className="pb-2 px-2.5">Risk Level</th>
                    <th className="pb-2 px-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Loading managers directory...</p>
                      </td>
                    </tr>
                  ) : filteredManagers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-blue-300 text-xs">
                        No manager profiles match current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredManagers.map((m) => {
                      const isExpanded = expandedRowId === m.id;
                      const initials = getInitials(m.name);

                      return (
                        <React.Fragment key={m.id}>
                          <tr 
                            onClick={() => toggleRow(m.id)}
                            className={`cursor-pointer transition-colors group ${
                              isExpanded ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="py-2.5 px-2.5 font-mono text-xs font-bold text-[#d4af37]">
                              {m.id}
                            </td>

                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0 group-hover:border-blue-400/50 transition-colors">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-xs">{m.name}</div>
                                  <div className="text-[10px] text-blue-300 font-mono">{m.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5 font-mono">
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[#d4af37] border border-white/10 text-xs font-bold inline-block">
                                {m.accountId}
                              </span>
                            </td>

                            <td className="py-2.5 px-2.5 font-black text-white text-xs">
                              {m.balance}
                            </td>

                            <td className="py-2.5 px-2.5 font-semibold text-amber-300 text-xs">
                              {m.credit}
                            </td>

                            <td className="py-2.5 px-2.5 font-semibold text-cyan-300 text-xs">
                              {m.equity}
                            </td>

                            <td className="py-2.5 px-2.5 font-bold text-emerald-400 text-xs">
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp size={12} className="text-emerald-400" />
                                {m.profit}
                              </span>
                            </td>

                            <td className="py-2.5 px-2.5 font-mono text-blue-200 font-semibold">
                              <span className="px-2 py-0.5 rounded bg-white/5 text-white border border-white/10 text-[10px] font-bold">
                                {m.share}
                              </span>
                            </td>

                            <td className="py-2.5 px-2.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                m.risk === 'Low' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                                m.risk === 'Medium' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                                'bg-red-500/15 text-red-300 border-red-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  m.risk === 'Low' ? 'bg-emerald-400' :
                                  m.risk === 'Medium' ? 'bg-amber-400' :
                                  'bg-red-400'
                                }`} />
                                {m.risk} Risk
                              </span>
                            </td>

                            <td className="py-2.5 px-2.5 text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleRow(m.id); }}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                                  isExpanded 
                                    ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 border-transparent font-black shadow-md' 
                                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-white/20'
                                }`}
                              >
                                <span>{isExpanded ? 'Hide Menu' : 'Manage'}</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            </td>
                          </tr>

                          {/* EXPANDED ACTION DROPDOWN PANEL
                              For Viewer: Hide financial buttons (Deposit, Withdraw, Credit-In, Credit-Out). Show ONLY Investors & History Logs.
                              For Admin/SuperAdmin: Show all 6 buttons. */}
                          {isExpanded && (
                            <tr className="bg-[#040f33]/40 border-b border-[#24358a]">
                              <td colSpan={10} className="p-4 sm:p-6">
                                <div className="bg-[linear-gradient(180deg,rgba(11,34,106,0.6)_0%,rgba(7,26,87,0.8)_100%)] border border-[#113b95]/60 rounded-3xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_40px_rgba(4,15,54,0.5)] space-y-5 relative overflow-hidden">
                                  {/* Decorative background glow */}
                                  <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24358a]/60 pb-3 relative z-10">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
                                        <Sparkles size={16} />
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Manager Controls</div>
                                        <div className="text-sm font-bold text-white mt-0.5">{m.name}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-[#040f33]/60 px-3 py-1.5 rounded-xl border border-white/5">
                                      <span className="text-[10px] text-blue-300/70 font-black uppercase tracking-widest">Account Ref</span>
                                      <strong className="text-sm font-mono text-[#d4af37]">{m.accountId}</strong>
                                    </div>
                                  </div>

                                  <div className={`grid gap-2 ${
                                    isViewer ? 'grid-cols-2 max-w-md' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8'
                                  }`}>
                                    {/* Financial buttons hidden for Viewer role */}
                                    {!isViewer && (
                                      <button 
                                        onClick={() => openFinancialModal(m, 'deposit')} 
                                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-emerald-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                      >
                                        <ArrowDownCircle size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" /> 
                                        <span>Deposit</span>
                                      </button>
                                    )}

                                    {!isViewer && (
                                      <button 
                                        onClick={() => openFinancialModal(m, 'withdraw')} 
                                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-amber-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                      >
                                        <ArrowUpCircle size={16} className="text-amber-400 group-hover:scale-110 transition-transform" /> 
                                        <span>Withdraw</span>
                                      </button>
                                    )}

                                    {!isViewer && (
                                      <button 
                                        onClick={() => openFinancialModal(m, 'credit-in')} 
                                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-blue-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                      >
                                        <PlusCircle size={16} className="text-blue-400 group-hover:scale-110 transition-transform" /> 
                                        <span>Credit-In</span>
                                      </button>
                                    )}

                                    {!isViewer && (
                                      <button 
                                        onClick={() => openFinancialModal(m, 'credit-out')} 
                                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-red-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                      >
                                        <MinusCircle size={16} className="text-red-400 group-hover:scale-110 transition-transform" /> 
                                        <span>Credit-Out</span>
                                      </button>
                                    )}

                                    {/* Transaction Button (Visible for all roles including Viewer) */}
                                    <button 
                                      onClick={() => openFinancialModal(m, 'transaction')} 
                                      className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-[#d4af37]/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                    >
                                      <History size={16} className="text-[#d4af37] group-hover:scale-110 transition-transform" /> 
                                      <span>Transaction</span>
                                    </button>

                                    {/* Profit Share History Button */}
                                    <button 
                                      onClick={() => setProfitShareModalManager(m)} 
                                      className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-purple-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                    >
                                      <TrendingUp size={16} className="text-purple-400 group-hover:scale-110 transition-transform" /> 
                                      <span>Profit Shares</span>
                                    </button>
                                    
                                    {/* Closed Positions Button */}
                                    <button 
                                      onClick={() => {
                                        setClosedPositionsUser({ id: m.id, name: m.name, accountId: m.accountId });
                                        setIsClosedPositionsOpen(true);
                                      }} 
                                      className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-blue-500/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                    >
                                      <CheckCircle2 size={16} className="text-blue-400 group-hover:scale-110 transition-transform" /> 
                                      <span>Closed Positions</span>
                                    </button>

                                    {/* Investors List Button (Visible for all roles including Viewer) */}
                                    <button 
                                      onClick={() => openFinancialModal(m, 'investors_list')} 
                                      className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 border border-transparent text-xs font-black transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group"
                                    >
                                      <Users size={16} className="group-hover:scale-110 transition-transform" /> 
                                      <span>Investors</span>
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

            {/* Pagination Controls */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-300 border-t border-white/5 pt-4">
              <div className="flex flex-wrap items-center gap-4">
                {total !== null ? (
                  <span>
                    Showing <strong className="text-white">{(page - 1) * perPage + 1}</strong> - <strong className="text-white">{Math.min(page * perPage, total)}</strong> of <strong className="text-white">{total}</strong> managers
                  </span>
                ) : (
                  <span>Showing results</span>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-blue-300">Rows per page:</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-blue-200 focus:outline-none focus:border-[#d4af37]/60 cursor-pointer"
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
                  disabled={isLoading || page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-bold text-blue-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Previous
                </button>

                <span className="text-xs text-blue-300">
                  Page <strong className="text-white">{page}</strong> {totalPages ? `of ${totalPages}` : ''}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoading || totalPages === null || page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-bold text-blue-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Next
                </button>
              </div>
            </div>
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
      
      {/* ── Profit Share History Modal ── */}
      {profitShareModalManager && (
        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-[2.5rem] border shadow-[0_24px_60px_rgba(4,15,54,0.36)] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] border-[#113b95] max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              onClick={() => setProfitShareModalManager(null)}
              className="absolute top-6 right-6 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors z-20"
            >
              <X size={20} />
            </button>
            <ProfitShareHistory isAdmin={true} isDarkMode={true} managerLogin={profitShareModalManager.accountId} />
          </div>
        </div>
      )}

      {/* ── Closed Positions Modal ── */}
      <ClosedPositionsModal
        isOpen={isClosedPositionsOpen}
        onClose={() => setIsClosedPositionsOpen(false)}
        targetUser={closedPositionsUser}
      />
    </>
  );
}
