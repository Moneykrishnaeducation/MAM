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

  const handleConfirmAction = async (actionType: string, amount: string, note: string): Promise<boolean> => {
    if (!targetUser || isViewer) return false;
    setIsLoading(true);

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
      return true;
    } catch (err: any) {
      showToast(err.message || 'Error executing financial action', true);
      return false;
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
   

      <div className="w-full min-h-screen bg-[#0c1c59] text-white font-sans antialiased relative overflow-hidden">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mt-8 p-3 sm:p-4 relative z-10 space-y-3.5">

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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#24358a]">
              <div className="relative group w-full md:w-80">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={16} className="text-blue-300 group-focus-within:text-white transition-colors" />
                </div>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user ID, name, email, manager, or account..." 
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[2rem] pl-11 pr-10 py-3 text-sm text-white placeholder:text-blue-300/70 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all shadow-[0_8px_32px_rgba(4,15,54,0.3)] backdrop-blur-md" 
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] text-blue-300 font-bold uppercase tracking-wider mr-1 shrink-0">Filter:</span>
                {(['All', 'Assigned', 'Unassigned'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 shadow-md font-bold'
                        : 'bg-[#113b95]/40 border border-[#24358a] text-blue-300 hover:text-white hover:bg-[#113b95]/60'
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
                  <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#113b95]/60 pb-2">
                    <th className="pb-2 px-2.5">Investor ID</th>
                    <th className="pb-2 px-2.5">Investor Details</th>
                    <th className="pb-2 px-2.5">Assigned Manager</th>
                    <th className="pb-2 px-2.5">Account ID</th>
                    <th className="pb-2 px-2.5">Invested Equity</th>
                    <th className="pb-2 px-2.5">Profit Gain</th>
                    <th className="pb-2 px-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#113b95]/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Loading investors directory...</p>
                      </td>
                    </tr>
                  ) : filteredInvestors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-blue-300 text-xs">
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
                            } ${isExpanded ? 'bg-[#040f33]/60' : 'hover:bg-[#040f33]/40'}`}
                          >
                            <td className="py-2.5 px-2.5 font-mono text-xs font-bold text-[#d4af37]">
                              {inv.id}
                            </td>

                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-[#113b95]/60 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0 group-hover:border-[#d4af37]/40 transition-colors">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-xs">{inv.name}</div>
                                  <div className="text-[10px] text-blue-300 font-mono">{inv.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-blue-100 text-xs">{inv.managerName}</span>
                                <span className="font-mono text-[10px] text-blue-300">{inv.managerUserId}</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5 font-mono">
                              <span className="px-2 py-0.5 rounded bg-black/20 text-[#d4af37] border border-[#113b95]/60 text-xs font-bold inline-block">
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
                            <td className="py-2.5 px-2.5 text-right flex justify-end gap-2">
                              {isViewer ? (
                                <>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openFinancialModal(inv, 'history'); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-[#040f33]/80 hover:bg-slate-800 text-blue-100 border border-[#113b95]/60 hover:border-[#d4af37]/40 transition-all"
                                  >
                                    <History size={13} className="text-[#d4af37]" />
                                    <span>History Log</span>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openFinancialModal(inv, 'position'); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-[#040f33]/80 hover:bg-slate-800 text-blue-100 border border-[#113b95]/60 hover:border-[#00ffcc]/40 transition-all"
                                  >
                                    <TrendingUp size={13} className="text-[#00ffcc]" />
                                    <span>Open Positions</span>
                                  </button>
                                </>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleRow(inv.id); }}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                                    isExpanded 
                                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 border-transparent font-black shadow-md' 
                                      : 'bg-[#040f33]/80 hover:bg-slate-800 text-blue-100 border-[#113b95]/60 hover:border-[#d4af37]/40'
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
                            <tr className="bg-[#040f33]/40 border-b border-[#24358a]">
                              <td colSpan={7} className="p-4 sm:p-6">
                                <div className="bg-[linear-gradient(180deg,rgba(11,34,106,0.6)_0%,rgba(7,26,87,0.8)_100%)] border border-[#113b95]/60 rounded-3xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_40px_rgba(4,15,54,0.5)] space-y-5 relative overflow-hidden">
                                  {/* Decorative background glow */}
                                  <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24358a]/60 pb-3 relative z-10">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
                                        <Sparkles size={16} />
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Investor Controls</div>
                                        <div className="text-sm font-bold text-white mt-0.5">{inv.name}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-[#040f33]/60 px-3 py-1.5 rounded-xl border border-white/5">
                                      <span className="text-[10px] text-blue-300/70 font-black uppercase tracking-widest">Account Ref</span>
                                      <strong className="text-sm font-mono text-[#d4af37]">{inv.accountId}</strong>
                                    </div>
                                  </div>

                                  <div className={`grid gap-2 ${
                                    isViewer ? 'grid-cols-2 max-w-sm' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
                                  }`}>
                                    {/* Financial buttons hidden for Viewer role */}
                                    {!isViewer && (
                                      <button 
                                        onClick={() => openFinancialModal(inv, 'deposit')} 
                                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-emerald-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                      >
                                        <ArrowDownCircle size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" /> 
                                        <span>Deposit</span>
                                      </button>
                                    )}

                                    {!isViewer && (
                                      <button 
                                        onClick={() => openFinancialModal(inv, 'withdraw')} 
                                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-amber-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                      >
                                        <ArrowUpCircle size={16} className="text-amber-400 group-hover:scale-110 transition-transform" /> 
                                        <span>Withdraw</span>
                                      </button>
                                    )}

                                    {!isViewer && (
                                      <button 
                                        onClick={() => openFinancialModal(inv, 'credit-in')} 
                                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-blue-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                      >
                                        <PlusCircle size={16} className="text-blue-400 group-hover:scale-110 transition-transform" /> 
                                        <span>Credit-In</span>
                                      </button>
                                    )}

                                    {!isViewer && (
                                      <button 
                                        onClick={() => openFinancialModal(inv, 'credit-out')} 
                                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-red-400/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                      >
                                        <MinusCircle size={16} className="text-red-400 group-hover:scale-110 transition-transform" /> 
                                        <span>Credit-Out</span>
                                      </button>
                                    )}

                                    {/* History Log Button (Visible for all roles including Viewer) */}
                                    <button 
                                      onClick={() => openFinancialModal(inv, 'history')} 
                                      className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-[#d4af37]/50 text-xs font-bold transition-all shadow-sm hover:shadow-md group"
                                    >
                                      <History size={16} className="text-[#d4af37] group-hover:scale-110 transition-transform" /> 
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
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-300 border-t border-white/5 pt-4">
              <div className="flex flex-wrap items-center gap-4">
                {total !== null ? (
                  <span>
                    Showing <strong className="text-white">{(page - 1) * perPage + 1}</strong> - <strong className="text-white">{Math.min(page * perPage, total)}</strong> of <strong className="text-white">{total}</strong> investors
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
                    className="px-2.5 py-1 rounded-lg bg-black/20 border border-[#113b95]/60 text-xs font-bold text-blue-100 focus:outline-none focus:border-[#d4af37]/60 cursor-pointer"
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
                  className="px-3 py-1.5 rounded-lg bg-black/20 hover:bg-slate-800 border border-[#113b95]/60 hover:border-white/20 text-xs font-bold text-blue-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
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
                  className="px-3 py-1.5 rounded-lg bg-black/20 hover:bg-slate-800 border border-[#113b95]/60 hover:border-white/20 text-xs font-bold text-blue-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
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
