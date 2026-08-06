import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import {
  UserCheck,
  Mail,
  Phone,
  Search,
  MessageSquare,
  Calendar,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  X,
  Percent,
  Hash,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { fetchAdminManagers, fetchClientDashboard, fetchClientInvestments } from '@/lib/apiClient';
import {
  buildManagerRows,
  DEFAULT_MANAGER_ROW,
  formatCurrency,
  pickAssignedManager,
  toNumber,
  type ClientInvestmentSummary,
  type ManagerRow,
} from '@/lib/live-manager-data';
import { AvailableSkeleton } from '@/components/client-page-skeletons';
import { toast } from 'sonner';

const riskBadge = (risk: string, isDarkMode: boolean) => {
  if (risk === 'Low')
    return isDarkMode
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  if (risk === 'Medium')
    return isDarkMode
      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
  return isDarkMode
    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
    : 'bg-red-500/15 text-red-400 border border-red-500/30';
};

type ManagerViewRow = ManagerRow & {
  loginId: string;
  equity: string;
  age: string;
  growth: string;
};

export default function ClientAvailablePage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [query, setQuery] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<ManagerViewRow | null>(null);
  const [viewManager, setViewManager] = useState<ManagerViewRow | null>(null);
  const [investmentPassword, setInvestmentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showInvestmentPassword, setShowInvestmentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingInvest, setIsSubmittingInvest] = useState(false);
  const [investSubmitError, setInvestSubmitError] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [managerInfo, setManagerInfo] = useState<ManagerRow>(DEFAULT_MANAGER_ROW);
  const [allManagers, setAllManagers] = useState<ManagerRow[]>([]);
  const [clientInvestments, setClientInvestments] = useState<ClientInvestmentSummary[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });

  const toViewRow = (manager: ManagerRow): ManagerViewRow => ({
    ...manager,
    loginId: manager.accountId,
    equity: manager.strategy,
    age: manager.status,
    growth: `${manager.investorsCount} linked`,
  });

  // 1. Load static investments on mount
  useEffect(() => {
    let active = true;
    const loadStaticData = async () => {
      const investmentsResponse = await fetchClientInvestments();
      if (!active) return;
      setClientInvestments(Array.isArray(investmentsResponse) ? investmentsResponse : []);
    };
    loadStaticData();
    return () => {
      active = false;
    };
  }, []);

  // 2. Load paginated managers when page, limit, or query changes
  useEffect(() => {
    let active = true;
    const loadManagers = async () => {
      setIsPageLoading(true);
      try {
        const res = await fetchAdminManagers(currentPage, perPage, query);
        if (!active) return;

        if (res && Array.isArray(res.managers)) {
          const dashboardResponse = await fetchClientDashboard();
          if (!active) return;
          const profile = dashboardResponse?.client || null;

          const liveManagers = buildManagerRows(res.managers, clientInvestments, profile);
          const assignedManager = pickAssignedManager(liveManagers, clientInvestments) || DEFAULT_MANAGER_ROW;

          setAllManagers(liveManagers);
          setManagerInfo(assignedManager);

          setPagination({
            page: Number(res.pagination?.page ?? currentPage),
            perPage: Number(res.pagination?.per_page ?? perPage),
            total: Number(res.pagination?.total ?? liveManagers.length),
            totalPages: Number(res.pagination?.total_pages ?? 1),
            hasNext: Boolean(res.pagination?.has_next),
            hasPrevious: Boolean(res.pagination?.has_previous),
          });

          // Refresh selected/view managers if they are active
          setSelectedManager((current) => {
            if (!current) return null;
            const updated = liveManagers.find((m) => m.id === current.id) || assignedManager;
            return toViewRow(updated);
          });
          setViewManager((current) => {
            if (!current) return null;
            const updated = liveManagers.find((m) => m.id === current.id) || assignedManager;
            return toViewRow(updated);
          });
        }
      } catch {
        // Fallback
      } finally {
        if (active) {
          setIsPageLoading(false);
        }
      }
    };

    loadManagers();
    return () => {
      active = false;
    };
  }, [currentPage, perPage, query, clientInvestments]);

  const panelClass = isDarkMode
    ? 'border-slate-800 bg-slate-900 shadow-xl'
    : 'border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)]';
  const inputClass = isDarkMode
    ? 'bg-white/10 border-white/10 text-white placeholder:text-gray-500'
    : 'border-[#214fbf] bg-[#081d5f] text-[#dbe8ff] placeholder:text-[#6f92e7]';
  const softTextClass = isDarkMode ? 'text-gray-400' : 'text-[#8fb8ff]';
  const headingTextClass = isDarkMode ? 'text-white' : 'text-white';
  const borderMutedClass = isDarkMode ? 'border-white/10' : 'border-[#1745b3]';
  const goldButtonClass =
    'bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_16px_30px_rgba(201,149,8,0.28)]';

  const displayManagers = useMemo(() => {
    return allManagers.map((manager) => toViewRow(manager));
  }, [allManagers]);

  const hasQuery = query.trim().length > 0;

  // Pagination helper mappings
  const totalPages = pagination.totalPages;
  const safePage = pagination.page;
  const paginatedManagers = displayManagers;

  const showingStart = pagination.total > 0 ? (safePage - 1) * perPage + 1 : 0;
  const showingEnd = pagination.total > 0
    ? Math.min(showingStart + displayManagers.length - 1, pagination.total)
    : 0;

  const handlePerPageChange = (val: number) => {
    setPerPage(val);
    setCurrentPage(1);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  const openInvestModal = (manager: (typeof displayManagers)[number]) => {
    setSelectedManager(manager);
    setInvestmentPassword('');
    setConfirmPassword('');
    setIsSubmittingInvest(false);
    setInvestSubmitError(null);
    setIsInvestModalOpen(true);
  };

  const closeInvestModal = () => {
    setIsInvestModalOpen(false);
    setSelectedManager(null);
    setInvestmentPassword('');
    setConfirmPassword('');
    setIsSubmittingInvest(false);
    setInvestSubmitError(null);
  };

  const openViewModal = (manager: (typeof displayManagers)[number]) => {
    setViewManager(manager);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewManager(null);
  };

  const handleCreateInvestorAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedManager) {
      const message = 'Please select a manager first';
      setInvestSubmitError(message);
      toast.error(message);
      return;
    }

    if (investmentPassword !== confirmPassword) {
      const message = 'Investment password and confirmation do not match';
      setInvestSubmitError(message);
      toast.error(message);
      return;
    }

    setIsSubmittingInvest(true);
    setInvestSubmitError(null);

    try {
      let response = await fetch('/api/client/mam-managers/invest', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerAccNumber: selectedManager.accountId,
          investmentPassword,
        }),
      });

      if (!response.ok) {
        response = await fetch('/api/client/accounts/create', {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'investor',
            managerAccNumber: selectedManager.accountId,
            investmentPassword,
          }),
        });
      }

      const data = await response.json().catch(() => null);
      const message = data?.message || 'Failed to create investor account';

      if (!response.ok || data?.status === 'error') {
        throw new Error(message);
      }

      toast.success(data?.message || 'Investor account created successfully');
      closeInvestModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create investor account';
      setInvestSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmittingInvest(false);
    }
  };

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('client-invest-modal-toggle', {
        detail: { isOpen: isInvestModalOpen },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent('client-invest-modal-toggle', {
          detail: { isOpen: false },
        })
      );
    };
  }, [isInvestModalOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (isInvestModalOpen) {
        closeInvestModal();
        return;
      }

      if (isViewModalOpen) {
        closeViewModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInvestModalOpen, isViewModalOpen]);

  // Only show a highlighted card when user is actively searching
  const highlightedManager =
    hasQuery && allManagers.length > 0 ? allManagers[0] : null;

  // Check if the highlighted manager is the client's assigned manager
  const isAssigned =
    highlightedManager?.name === managerInfo.name ||
    highlightedManager?.email === managerInfo.email;

  const totalInvested = clientInvestments.reduce(
    (sum, investment) => sum + toNumber(investment.allocated ?? investment.allocated_amount),
    0,
  );
  const totalProfit = clientInvestments.reduce((sum, investment) => {
    const currentValue = toNumber(investment.current_value);
    const allocatedAmount = toNumber(investment.allocated ?? investment.allocated_amount);
    return sum + Math.max(0, currentValue - allocatedAmount);
  }, 0);
  const activeNodes = Math.max(
    1,
    new Set(
      clientInvestments
        .map((investment) => String(investment.manager || investment.manager_name || '').trim())
        .filter(Boolean),
    ).size,
  );

  if (isPageLoading) {
    return (
      <>
        <Head>
          <title>Available MAM Managers | Client Portal</title>
        </Head>
        <AvailableSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Available MAM Managers | Client Portal</title>
      </Head>

      {/* ── Invest in Manager Modal ── */}
      {isInvestModalOpen && selectedManager && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={closeInvestModal}
        >
          <div
            className={`w-full max-w-xl rounded-[2rem] overflow-hidden border shadow-2xl my-auto ${panelClass}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-4 p-6 border-b ${borderMutedClass}`}>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-[11px] font-bold tracking-wider uppercase mb-3">
                  <DollarSign size={12} /> Invest in Manager
                </div>
                <h2 className={`text-2xl font-black ${headingTextClass} tracking-tight`}>Invest in Manager</h2>
                <p className={`text-sm mt-1 ${softTextClass}`}>
                  Complete the investor account setup for the selected manager.
                </p>
              </div>
              <button
                type="button"
                onClick={closeInvestModal}
                className={`relative z-20 p-2.5 rounded-full transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]'
                }`}
                aria-label="Close invest modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvestorAccount} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`rounded-2xl border p-4 ${borderMutedClass} bg-white/[0.02]`}>
                  <p className={`text-[11px] font-black uppercase tracking-widest ${softTextClass}`}>Manager Name</p>
                  <p className="mt-2 text-lg font-black text-white">
                    {selectedManager.accountId}
                  </p>
                  <p className={`text-xs mt-1 ${softTextClass}`}>{selectedManager.name}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${borderMutedClass} bg-white/[0.02]`}>
                  <p className={`text-[11px] font-black uppercase tracking-widest ${softTextClass}`}>Performance Fee</p>
                  <p className="mt-2 text-lg font-black text-emerald-400">
                    {selectedManager.share || '20%'}
                  </p>
                  <p className={`text-xs mt-1 ${softTextClass}`}>Investor allocation details</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className={`text-xs font-black uppercase tracking-widest ${softTextClass}`}>Investment Password</span>
                  <div className="relative">
                    <input
                      type={showInvestmentPassword ? 'text' : 'password'}
                      value={investmentPassword}
                      onChange={(e) => setInvestmentPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      disabled={isSubmittingInvest}
                      className={`w-full rounded-2xl border pl-4 pr-12 py-3 text-sm text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowInvestmentPassword(!showInvestmentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showInvestmentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className={`text-xs font-black uppercase tracking-widest ${softTextClass}`}>Confirm Password</span>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required
                      disabled={isSubmittingInvest}
                      className={`w-full rounded-2xl border pl-4 pr-12 py-3 text-sm text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>

              {investSubmitError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {investSubmitError}
                </div>
              )}

              <div className={`flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t ${borderMutedClass}`}>
                <p className={`text-xs ${softTextClass}`}>
                  Make sure both passwords match before creating the investor account.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeInvestModal}
                    disabled={isSubmittingInvest}
                    className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all hover:scale-105 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white border disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvest}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-widest hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${goldButtonClass}`}
                  >
                    <Users size={15} />
                    {isSubmittingInvest ? 'Creating...' : 'Create Investor Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && viewManager && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
          onClick={closeViewModal}
        >
          <div
            className={`w-full max-w-2xl overflow-hidden rounded-[2rem] border shadow-2xl ${panelClass}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`relative overflow-hidden px-6 py-5 sm:px-8 border-b ${borderMutedClass}`}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeViewModal();
                }}
                className={`absolute right-5 top-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]'
                }`}
                aria-label="Close manager view"
              >
                <X size={18} />
              </button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-blue-500/15 border border-blue-500/30 text-white shadow-lg shadow-blue-500/10">
                    <UserCheck size={28} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${softTextClass}`}>Manager Details</p>
                    <h2 className="text-3xl font-black text-white tracking-tight">{viewManager.name}</h2>
                    <p className={`text-sm mt-1 ${softTextClass}`}>ID: <span className="font-mono text-blue-200">{viewManager.loginId}</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Account ID', value: viewManager.loginId, accent: 'bg-blue-500/10 text-blue-200' },
                  { label: 'AUM', value: viewManager.balance, accent: 'bg-sky-500/10 text-sky-200' },
                  { label: 'Strategy', value: viewManager.equity, accent: 'bg-violet-500/10 text-violet-200' },
                  { label: 'Performance Fee', value: viewManager.share, accent: 'bg-emerald-500/10 text-emerald-200' },
                  { label: 'Linked', value: viewManager.growth, accent: 'bg-blue-500/10 text-blue-200' },
                  { label: 'Status', value: viewManager.age, accent: riskBadge(viewManager.risk, isDarkMode) },
                ].map((item) => (
                  <div key={item.label} className={`rounded-3xl border p-4 ${borderMutedClass} bg-white/[0.02] ${item.accent}`}>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${softTextClass}`}>{item.label}</p>
                    <p className="mt-3 text-lg font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!viewManager) return;
                    const managerToInvest = viewManager;
                    closeViewModal();
                    openInvestModal(managerToInvest);
                  }}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-widest hover:scale-105 ${goldButtonClass}`}
                >
                  <MessageSquare size={14} /> Invest Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative p-6 md:p-10 space-y-12 overflow-hidden">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-600/5 blur-[90px]" />
        </div>

        {/* ── Page Header ── */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-black tracking-tighter ${headingTextClass} mb-2`}>
            Available <span className="text-[#f0b91f]">MAM Managers</span>
          </h1>
        </div>

        {/* Summary Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Invested', value: formatCurrency(totalInvested), meta: 'USD', color: 'text-emerald-400', bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Total Profit', value: formatCurrency(totalProfit), meta: 'USD', color: 'text-blue-400', bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Active Nodes', value: String(activeNodes), meta: 'Live', color: 'text-amber-400', bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-amber-500/10 border-amber-500/20' },
          ].map((item) => (
            <div
              key={item.label}
              className={`relative overflow-hidden rounded-[2rem] border shadow-xl p-5 ${item.bg}`}
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${softTextClass}`}>{item.label}</p>
              <div className="mt-3 flex items-end gap-2">
                <span className={`text-3xl font-black tracking-tight ${item.color}`}>{item.value}</span>
                <span className={`text-xs font-semibold pb-1 ${softTextClass}`}>{item.meta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Search controls */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center justify-between mb-8">
          <div className="relative flex-1 lg:w-72">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-500" />
            </div>
            <input
              id="manager-search"
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by manager name, email or ID…"
              className={`w-full pl-11 pr-11 py-3.5 rounded-[1.1rem] border outline-none transition-all font-medium focus:border-[#3aa0ff] ${inputClass}`}
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ── Manager Profile Card — only when actively searching ── */}
        {hasQuery && highlightedManager ? (
          <div className={`relative overflow-hidden border rounded-[2rem] shadow-2xl ${panelClass}`}>
            {/* Subtle glow accent */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row gap-6 p-6 md:p-8">
              {/* Avatar + status */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="relative">
                  <img
                    src={
                      isAssigned
                        ? managerInfo.avatar
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(highlightedManager.name)}&background=1e293b&color=34d399&size=128&bold=true`
                    }
                    alt={highlightedManager.name}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-xl"
                  />
                  <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow" />
                </div>
                {isAssigned && (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 tracking-wide uppercase">
                    Featured
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white leading-tight">
                    {highlightedManager.name}
                  </h2>
                  <p className="text-sm text-emerald-400 font-semibold mt-0.5">
                    {isAssigned
                      ? managerInfo.role
                      : 'MAM Portfolio Manager'}
                  </p>
                  {isAssigned && (
                    <p className={`text-xs mt-1 ${softTextClass}`}>
                      {managerInfo.experience}
                    </p>
                  )}
                </div>

                {/* Contact chips */}
                <div className="flex flex-wrap gap-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs bg-white/5 ${borderMutedClass}`}>
                    <Mail size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-slate-300 font-medium">
                      {highlightedManager.email}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs bg-white/5 ${borderMutedClass}`}>
                    <Hash size={14} className="text-blue-400 shrink-0" />
                    <span className="text-slate-300 font-medium">
                      {highlightedManager.id}
                    </span>
                  </div>
                  {isAssigned && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs bg-white/5 ${borderMutedClass}`}>
                      <Phone
                        size={14}
                        className="text-purple-400 shrink-0"
                      />
                      <span className="text-slate-300 font-medium">
                        {managerInfo.phone}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs bg-white/5 ${borderMutedClass}`}>
                    <Shield size={14} className="text-amber-400 shrink-0" />
                    <span
                      className={`font-semibold ${highlightedManager.risk === 'Low' ? 'text-emerald-400' : highlightedManager.risk === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}
                    >
                      {highlightedManager.status}
                    </span>
                  </div>
                </div>

                {/* Mini stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'AUM',
                      value: highlightedManager.balance,
                      icon: <DollarSign size={14} />,
                      color: 'text-emerald-400',
                      bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-emerald-500/10 border-emerald-500/20',
                    },
                    {
                      label: 'Strategy',
                      value: highlightedManager.profit,
                      icon: <TrendingUp size={14} />,
                      color: 'text-blue-400',
                      bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-blue-500/10 border-blue-500/20',
                    },
                    {
                      label: 'Performance Fee',
                      value: highlightedManager.share,
                      icon: <Percent size={14} />,
                      color: 'text-purple-400',
                      bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-purple-500/10 border-purple-500/20',
                    },
                    {
                      label: 'Linked',
                      value: highlightedManager.investorsCount,
                      icon: <Users size={14} />,
                      color: 'text-amber-400',
                      bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-amber-500/10 border-amber-500/20',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`flex flex-col gap-1.5 p-3 rounded-2xl border ${stat.bg} ${isDarkMode ? borderMutedClass : ''}`}
                    >
                      <div className={`${stat.color}`}>{stat.icon}</div>
                      <div className={`text-base font-extrabold ${stat.color}`}>
                        {stat.value}
                      </div>
                      <div className={`text-[10px] font-medium uppercase tracking-wider ${softTextClass}`}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : hasQuery && allManagers.length === 0 ? (
          /* ── No Results — only shown when searching ── */
          <div className={`flex flex-col items-center justify-center py-16 border rounded-[2rem] ${panelClass}`}>
            <Search size={40} className="text-slate-700 mb-3" />
            <p className={`font-semibold text-sm ${headingTextClass}`}>
               No available manager found for &quot;{query}&quot;
            </p>
            <p className={`text-xs mt-1 ${softTextClass}`}>
              Try a different name or email address.
            </p>
          </div>
        ) : null}
 
        {/* ── Manager Details Table ── */}
        <div className={`${panelClass} rounded-[2.5rem] border overflow-hidden mt-8`}>
          {/* Table header */}
          <div className={`p-8 border-b ${borderMutedClass} flex items-center justify-between`}>
            <div>
              <h3 className={`text-xl font-bold ${headingTextClass}`}>
                All Available Managers
              </h3>
              <p className={`text-xs mt-1 ${softTextClass}`}>
                Showing{' '}
                <span className={`font-semibold ${headingTextClass}`}>
                  {showingStart}–{showingEnd}
                </span>{' '}
                of{' '}
                <span className={`font-semibold ${headingTextClass}`}>
                  {pagination.total}
                </span>{' '}
                available manager{pagination.total !== 1 ? 's' : ''}
              </p>
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${softTextClass}`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Data
            </div>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={isDarkMode ? 'bg-white/5' : 'bg-[#0b226a]'}>
                  {[
                    'Manager Name',
                    'Account ID',
                    'AUM',
                    'Strategy',
                    'Performance Fee',
                    'Status',
                    'Linked',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={isDarkMode ? 'divide-y divide-white/5' : 'divide-y divide-[#153d9f]'}>
                {paginatedManagers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`text-center py-12 text-sm ${softTextClass}`}>
                      No managers match your search.
                    </td>
                  </tr>
                ) : (
                  paginatedManagers.map((mgr, idx) => {
                    const isClientManager =
                      mgr.name === managerInfo.name ||
                      mgr.email === managerInfo.email;
                    return (
                      <tr
                        key={mgr.id}
                        className={`group transition-colors hover:bg-white/5 ${isClientManager ? 'bg-emerald-500/10' : idx % 2 === 0 ? '' : isDarkMode ? 'bg-white/[0.01]' : 'bg-[#0e2152]/30'}`}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={isClientManager ? managerInfo.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(mgr.name)}&background=1e293b&color=34d399&size=64&bold=true`}
                              alt={mgr.name}
                              className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                            />
                            <div>
                              <div className="font-semibold text-slate-100 text-sm leading-tight">{mgr.name}</div>
                              <div className={`text-[11px] mt-0.5 ${softTextClass}`}>{mgr.email}</div>
                            </div>
                            {isClientManager && (
                              <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 tracking-wide">Yours</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-2 py-1 rounded-lg">{mgr.loginId}</span>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="font-bold text-emerald-400">{mgr.balance}</span>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="font-semibold text-blue-400">{mgr.equity}</span>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="text-purple-400 font-semibold">{mgr.share}</span>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${riskBadge(mgr.risk, isDarkMode)}`}>
                            {mgr.age}
                          </span>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="font-bold text-emerald-400">{mgr.growth}</span>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => openViewModal(mgr)}
                              className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all duration-200 ${isDarkMode ? 'bg-royal/10 text-royal hover:bg-royal hover:text-white border-royal/20' : 'border-[#2858cd] bg-[#0b226a] text-[#d7e5ff] hover:bg-[#102c7c]'}`}
                            >
                              View
                            </button>
                            <button
                              onClick={() => openInvestModal(mgr)}
                              className={`px-4 py-2 rounded-xl font-black text-xs transition-all uppercase tracking-widest hover:scale-105 ${goldButtonClass}`}
                            >
                              Invest
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination Footer ── */}
          <div className={`flex flex-col gap-4 border-t ${borderMutedClass} px-6 py-4 lg:flex-row lg:items-center lg:justify-between`}>
            <div className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
              SHOWING {showingStart} TO {showingEnd} OF {pagination.total}
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end lg:flex-row lg:items-center lg:gap-6">
              <div className="flex items-center gap-3">
                <label className={`text-[11px] font-bold uppercase tracking-[0.2em] ${softTextClass}`} htmlFor="per-page">
                  Rows per page
                </label>
                <select
                  id="per-page"
                  value={perPage}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none transition-all ${inputClass}`}
                >
                  {[10, 30, 50, 100, 500, 1000].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                {/* Prev */}
                <button
                  id="pagination-prev"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1 || !pagination.hasPrevious}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={13} /> Prev
                </button>

                {/* Page number pills */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const isEllipsis =
                    totalPages > 5 &&
                    page !== 1 &&
                    page !== totalPages &&
                    Math.abs(page - safePage) > 1;
                  if (isEllipsis) {
                    if (page === safePage - 2 || page === safePage + 2) {
                      return (
                        <span key={page} className="text-slate-600 px-1 text-xs select-none">
                          …
                        </span>
                      );
                    }
                    return null;
                  }
                  return (
                    <button
                      key={page}
                      id={`pagination-page-${page}`}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all border ${
                        page === safePage
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                {/* Next */}
                <button
                  id="pagination-next"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages || !pagination.hasNext}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Table footer with investors sub-list for highlighted manager */}
          {hasQuery && highlightedManager && highlightedManager.investorsList?.length > 0 && (
            <div className={`border-t px-6 py-4 ${borderMutedClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${softTextClass}`}>
                Linked investments under{' '}
                <span className="text-emerald-400">
                  {highlightedManager.name}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {highlightedManager.investorsList.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                      {inv.name.charAt(0)}
                    </div>
                    <span className="text-slate-300 font-medium">
                      {inv.name}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-emerald-400 font-semibold">
                      {inv.profit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
