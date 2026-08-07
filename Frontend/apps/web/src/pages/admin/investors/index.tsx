import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { toast } from 'sonner';
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
  Users, 
  CheckCircle2,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  RefreshCw,
  X
} from 'lucide-react';
import FinancialActionModal, { type FinancialModalType, type FinancialUserTarget } from '@/components/Admin/FinancialActionModal';

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

export interface InvestorData {
  id: string;
  name: string;
  email: string;
  managerName: string;
  managerUserId: string;
  accountId: string;
  invested: string;
  profit: string;
  status?: 'Active' | 'Pending' | 'Inactive';
}

function getInitials(name: string) {
  if (!name || name === '-') return 'INV';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function AdminInvestorsPage() {
  const [adminRole, setAdminRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Assigned' | 'Unassigned'>('All');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<FinancialModalType>(null);
  const [targetUser, setTargetUser] = useState<FinancialUserTarget | null>(null);

  // Load state from API endpoint
  const [investors, setInvestors] = useState<InvestorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  const isViewer = useMemo(() => isViewerOnly(adminRole) || adminRole.toLowerCase() === 'viewer', [adminRole]);

  // Reset page on filter/search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, perPage]);

  const fetchInvestors = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', String(perPage));
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/admin/investors?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (data && data.investors && Array.isArray(data.investors)) {
        const mapped = data.investors.map((i: any) => ({
          id: i.id?.toString().startsWith('INV-') ? i.id : `INV-${i.id}`,
          name: i.name || 'Unknown Investor',
          email: i.email || 'N/A',
          managerName: i.allocated_mam_name ? i.allocated_mam_name : 'Not Assigned',
          managerUserId: i.allocated_mam ? (i.allocated_mam.toString().startsWith('MGR-') ? i.allocated_mam : `MGR-${i.allocated_mam}`) : 'N/A',
          accountId: i.account_id || i.accountId || `MAM-INV-00${i.id}`,
          invested: typeof i.equity === 'number' ? `$${i.equity.toLocaleString()}` : (i.invested || `$${(i.balance || 0).toLocaleString()}`),
          profit: typeof i.profit === 'string' ? i.profit : `+$${(i.profit || 0).toLocaleString()}`,
          status: i.status || 'Active'
        }));
        setInvestors(mapped);
        if (data.pagination) {
          setTotal(Number(data.pagination.total ?? data.investors.length));
          setTotalPages(Number(data.pagination.total_pages ?? 1));
        } else {
          setTotal(data.investors.length);
          setTotalPages(1);
        }
      } else {
        setInvestors([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch {
      setInvestors([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvestors();
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
    if (isViewer) return; // Viewers do not use the expanded dropdown
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

  const handleConfirmAction = async (actionType: string, amount: string, note: string) => {
    if (!targetUser || isViewer) return;
    setIsLoading(true);
    setIsModalOpen(false);

    try {
      const endpointMap: Record<string, string> = {
        deposit: '/api/admin/investors/deposit',
        withdraw: '/api/admin/investors/withdraw',
        'credit-in': '/api/admin/investors/credit-in',
        'credit-out': '/api/admin/investors/credit-out',
      };

      const targetEndpoint = endpointMap[actionType] || '/api/admin/accounts/financial-action';

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
      fetchInvestors();
    } catch (err: any) {
      showToast(err.message || 'Error executing financial action', true);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvestors = investors.filter(i => {
    const matchesSearch = 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.accountId.toLowerCase().includes(searchTerm.toLowerCase());

    const isAssigned = i.managerName !== 'Not Assigned' && i.managerUserId !== 'N/A';
    const matchesStatus = 
      statusFilter === 'All' ? true :
      statusFilter === 'Assigned' ? isAssigned :
      statusFilter === 'Unassigned' ? !isAssigned : true;

    return matchesSearch && matchesStatus;
  });

  // Calculate Overview Stats
  const totalCapitalNum = investors.reduce((acc, i) => {
    const val = parseFloat(i.invested.replace(/[^0-9.-]+/g, '')) || 0;
    return acc + val;
  }, 0);

  const assignedCount = investors.filter(i => i.managerName !== 'Not Assigned' && i.managerUserId !== 'N/A').length;
  const unassignedCount = investors.length - assignedCount;

  return (
    <>
      <Head>
        <title>Investors Directory | Admin Portal</title>
      </Head>

      <div className="w-full text-slate-100 font-sans antialiased">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto p-3 sm:p-4 relative z-10 space-y-3.5">
          
          {/* HEADER BANNER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-blue-600/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-inner shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#e6c687] text-[9px] font-black uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" /> Investors Management Engine
                </div>
                <h1 className="text-lg font-black tracking-tight text-white uppercase">
                  Investors Directory
                </h1>
                <p className="text-[11px] text-slate-400">
                  Manage investor trading accounts, capital allocations, strategy assignments, and transaction logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchInvestors()}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all hover:border-[#d4af37]/40"
              >
                <RefreshCw size={13} className={isLoading ? "animate-spin text-[#d4af37]" : ""} />
                <span>Sync Directory</span>
              </button>
            </div>
          </div>

          {/* SUMMARY KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Total Investors</div>
                <div className="text-xl font-black text-white mt-0.5">{investors.length} <span className="text-[9px] text-slate-500 font-semibold uppercase">Accounts</span></div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Users size={16} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Total Capital</div>
                <div className="text-xl font-black text-[#d4af37] mt-0.5">
                  ${totalCapitalNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] shrink-0">
                <DollarSign size={16} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Assigned to MAM</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">{assignedCount} <span className="text-[9px] text-slate-500 font-semibold uppercase">Allocated</span></div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <UserCheck size={16} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Unassigned Standby</div>
                <div className="text-xl font-black text-amber-400 mt-0.5">{unassignedCount} <span className="text-[9px] text-slate-500 font-semibold uppercase">Standby</span></div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Landmark size={16} />
              </div>
            </div>

          </div>

          {/* TOAST NOTIFICATION */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          {/* MAIN TABLE CONTAINER */}
          <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 sm:p-4 shadow-xl">
            
            {/* TOOLBAR SEARCH & FILTERS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-white/10">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user ID, name, email, manager, or account..." 
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37] transition-all" 
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1 shrink-0">Filter:</span>
                {(['All', 'Assigned', 'Unassigned'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 shadow-md font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {st === 'All' ? 'All Investors' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                    <th className="pb-2 px-2.5">Investor ID</th>
                    <th className="pb-2 px-2.5">Investor Details</th>
                    <th className="pb-2 px-2.5">Assigned Manager</th>
                    <th className="pb-2 px-2.5">Account ID</th>
                    <th className="pb-2 px-2.5">Invested Equity</th>
                    <th className="pb-2 px-2.5">Profit Gain</th>
                    <th className="pb-2 px-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading investors directory...</p>
                      </td>
                    </tr>
                  ) : filteredInvestors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No investor profiles match current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvestors.map((inv) => {
                      const isExpanded = expandedRowId === inv.id;
                      const initials = getInitials(inv.name);

                      return (
                        <React.Fragment key={inv.id}>
                          <tr 
                            onClick={() => !isViewer && toggleRow(inv.id)}
                            className={`transition-colors group ${
                              !isViewer ? 'cursor-pointer' : ''
                            } ${isExpanded ? 'bg-slate-800/60' : 'hover:bg-slate-800/40'}`}
                          >
                            <td className="py-2.5 px-2.5 font-mono text-xs font-bold text-[#d4af37]">
                              {inv.id}
                            </td>

                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0 group-hover:border-[#d4af37]/40 transition-colors">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-100 text-xs">{inv.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{inv.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-200 text-xs">{inv.managerName}</span>
                                <span className="font-mono text-[10px] text-slate-400">{inv.managerUserId}</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5 font-mono">
                              <span className="px-2 py-0.5 rounded bg-slate-950/80 text-[#d4af37] border border-white/10 text-xs font-bold inline-block">
                                {inv.accountId}
                              </span>
                            </td>

                            <td className="py-2.5 px-2.5 font-black text-white text-xs">
                              {inv.invested}
                            </td>

                            <td className="py-2.5 px-2.5 font-bold text-emerald-400 text-xs">
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp size={12} className="text-emerald-400" />
                                {inv.profit}
                              </span>
                            </td>

                            {/* ACTIONS COLUMN:
                                For Viewer: Show ONLY the direct History Log button (NOT inside dropdown)
                                For Non-Viewer: Show Manage dropdown button */}
                            <td className="py-2.5 px-2.5 text-right">
                              {isViewer ? (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openFinancialModal(inv, 'history'); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 transition-all"
                                >
                                  <History size={13} className="text-[#d4af37]" />
                                  <span>History Log</span>
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleRow(inv.id); }}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                                    isExpanded 
                                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 border-transparent font-black shadow-md' 
                                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-[#d4af37]/40'
                                  }`}
                                >
                                  <span>{isExpanded ? 'Hide Menu' : 'Manage'}</span>
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* EXPANDED ACTION PANEL (NON-VIEWER ONLY) */}
                          {isExpanded && !isViewer && (
                            <tr className="bg-slate-950/60 border-b border-white/10">
                              <td colSpan={7} className="p-3 sm:p-4">
                                <div className="bg-slate-900 border border-white/10 rounded-xl p-3.5 shadow-2xl space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                                    <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                      <Sparkles size={14} className="text-[#d4af37]" />
                                      <span>Financial Controls — <strong className="text-[#d4af37]">{inv.name}</strong></span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      Account Ref: <strong className="text-[#d4af37]">{inv.accountId}</strong>
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <button 
                                      onClick={() => openFinancialModal(inv, 'deposit')} 
                                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all group"
                                    >
                                      <ArrowDownCircle size={16} className="text-emerald-400 mb-1 group-hover:scale-110 transition-transform" /> 
                                      <span>Deposit</span>
                                    </button>

                                    <button 
                                      onClick={() => openFinancialModal(inv, 'withdraw')} 
                                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all group"
                                    >
                                      <ArrowUpCircle size={16} className="text-amber-400 mb-1 group-hover:scale-110 transition-transform" /> 
                                      <span>Withdraw</span>
                                    </button>

                                    <button 
                                      onClick={() => openFinancialModal(inv, 'credit-in')} 
                                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all group"
                                    >
                                      <PlusCircle size={16} className="text-blue-400 mb-1 group-hover:scale-110 transition-transform" /> 
                                      <span>Credit-In</span>
                                    </button>

                                    <button 
                                      onClick={() => openFinancialModal(inv, 'credit-out')} 
                                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all group"
                                    >
                                      <MinusCircle size={16} className="text-red-400 mb-1 group-hover:scale-110 transition-transform" /> 
                                      <span>Credit-Out</span>
                                    </button>

                                    <button 
                                      onClick={() => openFinancialModal(inv, 'history')} 
                                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all group"
                                    >
                                      <History size={16} className="text-[#d4af37] mb-1 group-hover:scale-110 transition-transform" /> 
                                      <span>History Logs</span>
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
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 border-t border-white/5 pt-4">
              <div className="flex flex-wrap items-center gap-4">
                {total !== null ? (
                  <span>
                    Showing <strong className="text-white">{(page - 1) * perPage + 1}</strong> - <strong className="text-white">{Math.min(page * perPage, total)}</strong> of <strong className="text-white">{total}</strong> investors
                  </span>
                ) : (
                  <span>Showing results</span>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Rows per page:</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#d4af37]/60 cursor-pointer"
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
                  className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Previous
                </button>

                <span className="text-xs text-slate-400">
                  Page <strong className="text-white">{page}</strong> {totalPages ? `of ${totalPages}` : ''}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoading || totalPages === null || page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
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
    </>
  );
}
