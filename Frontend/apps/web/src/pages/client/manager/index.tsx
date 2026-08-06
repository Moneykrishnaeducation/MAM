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
  Settings,
  RefreshCw,
  Wallet,
  Eye,
  EyeOff,
} from 'lucide-react';
import { fetchClientDashboard, fetchClientInvestments } from '@/lib/apiClient';
import {
  buildManagerRows,
  DEFAULT_MANAGER_ROW,
  formatCurrency,
  pickAssignedManager,
  toNumber,
  type ClientAccountSummary,
  type ClientInvestmentSummary,
  type ManagerRow,
} from '@/lib/live-manager-data';
import { ManagerSkeleton } from '@/components/client-page-skeletons';
import DepositModal from '../model/depositmodel';
import WithdrawalModal from '../model/withdrawal';
import AccountOpenModal from '../model/accountopen';
import { toast } from 'sonner';

export async function fetchAdminManagers(page?: number, perPage?: number, search?: string) {
  try {
    const searchParams = new URLSearchParams();
    if (page !== undefined) searchParams.set('page', String(page));
    if (perPage !== undefined) searchParams.set('per_page', String(perPage));
    if (search) searchParams.set('search', search);

    const queryString = searchParams.toString();
    const myClientUrl = queryString ? `/api/client/my-mam-managers?${queryString}` : '/api/client/my-mam-managers';

    let res = await fetch(myClientUrl);
    if (!res.ok) return null;
    const data = await res.json();
    if (page === undefined && perPage === undefined && !search) {
      return data.managers || null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

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

export default function ClientManagerPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [query, setQuery] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const [showInvestorListModal, setShowInvestorListModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showAccountOpenModal, setShowAccountOpenModal] = useState(false);
  const [activeDepositTab, setActiveDepositTab] = useState('cheesepay');
  const [cheeseAmount, setCheeseAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [convertedAmount, setConvertedAmount] = useState<any>(null);
  const [newLeverage, setNewLeverage] = useState<string>('500');
  const [passwordType, setPasswordType] = useState<'Investor' | 'Manager' | 'None'>('Investor');
  const [newInvestorPassword, setNewInvestorPassword] = useState<string>('');
  const [confirmInvestorPassword, setConfirmInvestorPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [selectedManager, setSelectedManager] = useState<ManagerRow | null>(null);
  const [managerInfo, setManagerInfo] = useState<ManagerRow>(DEFAULT_MANAGER_ROW);
  const [allManagers, setAllManagers] = useState<ManagerRow[]>([]);
  const [clientAccount, setClientAccount] = useState<ClientAccountSummary | null>(null);
  const [clientInvestments, setClientInvestments] = useState<ClientInvestmentSummary[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });

  const [openPositions, setOpenPositions] = useState<any[]>([]);
  const [positionsLoading, setPositionsLoading] = useState<boolean>(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [mt5Status, setMt5Status] = useState<string>('offline');

  const [popupInvestors, setPopupInvestors] = useState<any[]>([]);
  const [isPopupInvestorsLoading, setIsPopupInvestorsLoading] = useState<boolean>(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  const fetchManagerInvestorsList = async (accountId: string) => {
    setIsPopupInvestorsLoading(true);
    try {
      const res = await fetch(`/api/client/mam-managers/${accountId}/investors`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPopupInvestors(Array.isArray(data.investors) ? data.investors : []);
      }
    } catch {
      // Fallback to activeManager.investorsList
    } finally {
      setIsPopupInvestorsLoading(false);
    }
  };

  const handleOpenInvestorListModal = () => {
    if (activeManager?.accountId) {
      fetchManagerInvestorsList(activeManager.accountId);
    }
    setShowInvestorListModal(true);
  };

  const handleToggleStatus = async () => {
    if (!activeManager?.accountId) return;
    setIsTogglingStatus(true);
    try {
      const isCurrentlyActive = String(activeManager.status).toLowerCase() === 'active';
      const action = isCurrentlyActive ? 'deactivate' : 'activate';
      const res = await fetch(`/api/client/mam-managers/${activeManager.accountId}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedStatus = data.account_status || (isCurrentlyActive ? 'Inactive' : 'Active');
        setAllManagers((prev) =>
          prev.map((m) => (m.accountId === activeManager.accountId ? { ...m, status: updatedStatus } : m))
        );
        setSelectedManager((prev) => (prev ? { ...prev, status: updatedStatus } : null));
      }
    } catch {
      // Handle error
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Fetch only my-mam-managers for the My Manager page
  useEffect(() => {
    let active = true;
    const loadAllData = async () => {
      setIsPageLoading(true);
      try {
        const managersRes = await fetchAdminManagers(currentPage, perPage, query);

        if (!active) return;

        if (managersRes && Array.isArray(managersRes.managers)) {
          const liveManagers = buildManagerRows(managersRes.managers, [], null);
          const assignedManager = pickAssignedManager(liveManagers, []) || DEFAULT_MANAGER_ROW;

          setAllManagers(liveManagers);
          setManagerInfo(assignedManager);
          setPagination({
            page: Number(managersRes.pagination?.page ?? currentPage),
            perPage: Number(managersRes.pagination?.per_page ?? perPage),
            total: Number(managersRes.pagination?.total ?? liveManagers.length),
            totalPages: Number(managersRes.pagination?.total_pages ?? 1),
            hasNext: Boolean(managersRes.pagination?.has_next),
            hasPrevious: Boolean(managersRes.pagination?.has_previous),
          });
        }
      } catch {
        // Fallback error handling
      } finally {
        if (active) {
          setIsPageLoading(false);
        }
      }
    };

    loadAllData();
    return () => {
      active = false;
    };
  }, [currentPage, perPage, query]);

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

  const hasQuery = query.trim().length > 0;

  // Pagination helper mappings
  const totalPages = pagination.totalPages;
  const safePage = pagination.page;
  const paginatedManagers = allManagers;

  const showingStart = pagination.total > 0 ? (safePage - 1) * perPage + 1 : 0;
  const showingEnd = pagination.total > 0
    ? Math.min(showingStart + allManagers.length - 1, pagination.total)
    : 0;

  const handlePerPageChange = (val: number) => {
    setPerPage(val);
    setCurrentPage(1);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  const closeActiveManagerCard = () => {
    setSelectedManager(null);
    setQuery('');
    setCurrentPage(1);
  };

  // Only show a highlighted card when user is actively searching
  const highlightedManager =
    hasQuery && allManagers.length > 0 ? allManagers[0] : null;

  // Active manager may be from an explicit selection (selectedManager)
  // or from the current search highlight (highlightedManager)
  const activeManager =
    selectedManager ?? (hasQuery && highlightedManager ? highlightedManager : null);
  const showActiveManager = Boolean(activeManager);

  // Check if the active manager is the client's assigned manager
  const isAssigned =
    activeManager?.name === managerInfo.name ||
    activeManager?.email === managerInfo.email;

  const selectedInvestmentId = activeManager ? String(activeManager.id) : '';

  const totalInvested = clientInvestments.reduce(
    (sum, investment) => sum + toNumber(investment.allocated ?? investment.allocated_amount),
    0,
  );
  const totalProfit = clientInvestments.reduce((sum, investment) => {
    const currentValue = toNumber(investment.current_value);
    const allocatedAmount = toNumber(investment.allocated ?? investment.allocated_amount);
    return sum + Math.max(0, currentValue - allocatedAmount);
  }, 0);
  const linkedManagerCount = Math.max(
    1,
    new Set(
      clientInvestments
        .map((investment) => String(investment.manager || investment.manager_name || '').trim())
        .filter(Boolean),
    ).size,
  );
  const currentAccountLabel = activeManager?.accountId || managerInfo.accountId || clientAccount?.account_number || 'N/A';

  const loadOpenPositions = async () => {
    const targetAccountId = activeManager?.accountId || currentAccountLabel;
    if (!targetAccountId || targetAccountId === 'N/A') {
      setPositionsError('No account ID available to fetch open positions.');
      return;
    }

    setPositionsLoading(true);
    setPositionsError(null);
    try {
      const res = await fetch(`/api/client/open-positions/${targetAccountId}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setOpenPositions(data.positions || []);
        setMt5Status(data.mt5_status || 'online');
      } else {
        setPositionsError(data.message || 'Failed to load open positions.');
      }
    } catch (err: any) {
      setPositionsError(err?.message || 'Error loading open positions.');
    } finally {
      setPositionsLoading(false);
    }
  };

  useEffect(() => {
    if (showPerformanceModal) {
      loadOpenPositions();
    }
  }, [showPerformanceModal, activeManager]);

  if (isPageLoading) {
    return (
      <>
        <Head>
          <title>My Manager | Client Portal</title>
        </Head>
        <ManagerSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>My Manager | Client Portal</title>
      </Head>
      <div className="relative p-6 md:p-10 space-y-12 overflow-hidden">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-600/5 blur-[90px]" />
        </div>


        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">MAM Managers</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowAccountOpenModal(true)}
            className={`px-6 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] ${goldButtonClass}`}
          >
            Open Account
          </button>
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

        {/* ── Manager Profile Card / Details ── */}
        {showActiveManager && activeManager ? (
          <div className={`relative overflow-hidden border rounded-[2rem] shadow-2xl ${panelClass}`}>
            {/* Subtle glow accent */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <button
              type="button"
              onClick={closeActiveManagerCard}
              aria-label="Close manager card"
              className={`absolute top-4 right-4 z-20 rounded-full p-2 transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                  : 'border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]'
              }`}
            >
              <X size={18} />
            </button>

            <div className="relative flex flex-col md:flex-row gap-6 p-6 md:p-8">
              {/* Avatar + status */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="relative">
                  <img
                    src={
                      isAssigned
                        ? managerInfo.avatar
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(activeManager.name)}&background=1e293b&color=34d399&size=128&bold=true`
                    }
                    alt={activeManager.name}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-xl"
                  />
                  <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow" />
                </div>
                {isAssigned && (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 tracking-wide uppercase">
                    Your Manager
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white leading-tight">
                    {activeManager.name}
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
                      {activeManager.email}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs bg-white/5 ${borderMutedClass}`}>
                    <Hash size={14} className="text-blue-400 shrink-0" />
                    <span className="text-slate-300 font-medium">
                      {activeManager.id}
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
                      className={`font-semibold ${activeManager.risk === 'Low' ? 'text-emerald-400' : activeManager.risk === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}
                    >
                      {activeManager.status}
                    </span>
                  </div>
                </div>

                {/* Mini stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'AUM',
                      value: activeManager.balance,
                      icon: <DollarSign size={14} />,
                      color: 'text-emerald-400',
                      bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-emerald-500/10 border-emerald-500/20',
                    },
                    {
                      label: 'Strategy',
                      value: activeManager.profit,
                      icon: <TrendingUp size={14} />,
                      color: 'text-blue-400',
                      bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-blue-500/10 border-blue-500/20',
                    },
                    {
                      label: 'Performance Fee',
                      value: activeManager.share,
                      icon: <Percent size={14} />,
                      color: 'text-purple-400',
                      bg: isDarkMode ? 'border-slate-800 bg-slate-900' : 'bg-purple-500/10 border-purple-500/20',
                    },
                    {
                      label: 'Linked',
                      value: activeManager.investorsCount,
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
            
            {/* ── Detailed Dashboard Content ── */}
            <div className="p-6 md:p-8 pt-0 space-y-6">
              
              {/* NET BALANCE Banner */}
              <div className={`rounded-[2rem] border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/[0.02] ${borderMutedClass}`}>
                <div className="flex-1">
                  <div className={`text-[10px] font-black uppercase tracking-widest ${softTextClass}`}>Net Balance</div>
                  <div className="text-4xl font-black text-white mt-1 leading-none tracking-tight">
                    {formatCurrency(clientAccount?.balance ?? totalInvested)} <span className={`text-sm font-black ml-1 ${softTextClass}`}>{clientAccount?.currency || 'USD'}</span>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDepositModal(true)}
                      className={`px-5 py-2.5 rounded-lg font-black text-sm transition-all uppercase tracking-widest hover:scale-105 ${goldButtonClass}`}
                    >
                      + Quick Fund
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWithdrawalModal(true)}
                      className={`px-5 py-2.5 rounded-lg border text-white font-bold transition-all hover:scale-105 text-sm flex items-center gap-2 ${isDarkMode ? 'border-slate-800 bg-white/5 hover:bg-white/10' : 'border-blue-700/50 hover:bg-blue-800/30'}`}
                    >
                      <Wallet size={16} /> Withdraw
                    </button>
                  </div>
                </div>
                <div className="flex-none w-full md:w-auto">
                  <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
                    <div className={softTextClass}>Total Profit</div>
                    <div className="text-[15px] font-extrabold text-white text-right">{formatCurrency(totalProfit)}</div>
                    <div className={softTextClass}>Performance Fee</div>
                    <div className="text-[15px] font-extrabold text-white text-right">{activeManager?.share || '0%'}</div>
                    <div className={softTextClass}>Status</div>
                    <div className="text-[15px] font-extrabold text-white text-right">{activeManager?.status || 'Active'}</div>
                    <div className={softTextClass}>Leverage</div>
                    <div className="text-[15px] font-extrabold text-white text-right">{clientAccount?.leverage || '1:500'}</div>
                  </div>
                </div>
              </div>

              {/* Three Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* MAM CONFIGURATION */}
                <div className={`p-6 rounded-[20px] border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'bg-[#0a1435] border-blue-900/40'}`}>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">MAM Configuration</h4>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center"><span className={softTextClass}>Account Name</span><span className="font-extrabold text-white">Naveen Test</span></div>
                    <div className="flex justify-between items-center"><span className={softTextClass}>Payout Cycle</span><span className="font-extrabold text-white">weekly</span></div>
                    <div className="flex justify-between items-center"><span className={softTextClass}>Algo Trading</span><span className="font-extrabold text-white">Manual</span></div>
                    <div className="flex justify-between items-center"><span className={softTextClass}>Status</span><span className="font-extrabold text-white">Active</span></div>
                  </div>
                </div>

                {/* Master Security */}
                <div className={`p-6 rounded-[20px] border flex flex-col items-center justify-center text-center ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'bg-[#0a1435] border-blue-900/40'}`}>
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                    <Settings size={24} />
                  </div>
                  <h4 className="text-[16px] font-extrabold tracking-wide text-white mb-5">Master Security</h4>
                  <div className="w-full space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowAccountSettingsModal(true)}
                      className={`w-full py-3 rounded-xl font-black transition-all text-sm hover:scale-105 ${goldButtonClass} flex items-center justify-center gap-2`}
                    >
                      <Settings size={16} /> Account Settings
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenInvestorListModal}
                      className={`w-full py-3 rounded-xl font-black transition-all text-sm hover:scale-105 ${goldButtonClass} flex items-center justify-center gap-2`}
                    >
                      <Users size={16} /> Investor List
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className={`p-6 rounded-[20px] border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'bg-[#0a1435] border-blue-900/40'}`}>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">Quick Actions</h4>
                  <div className="w-full space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowPerformanceModal(true)}
                      className={`w-full py-3 rounded-xl font-black transition-all text-sm hover:scale-105 ${goldButtonClass} flex items-center justify-center gap-2`}
                    >
                      <TrendingUp size={16} /> Performance
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      disabled={isTogglingStatus}
                      className={`w-full py-3 rounded-xl text-white font-extrabold transition-colors text-sm flex items-center justify-center gap-2 ${
                        String(activeManager?.status).toLowerCase() === 'active'
                          ? 'bg-[#ef4444] hover:bg-[#dc2626]'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <RefreshCw size={16} className={isTogglingStatus ? 'animate-spin' : ''} />
                      {isTogglingStatus
                        ? 'Updating...'
                        : String(activeManager?.status).toLowerCase() === 'active'
                        ? 'Deactivate'
                        : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>

              {/* PROFIT SHARE WALLET */}
              <div className={`p-6 rounded-[20px] border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'bg-[#0a1435] border-blue-900/40'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white">Profit Share Wallet</h4>
                  <button className={`px-4 py-2 rounded-lg font-black text-[11px] transition-all uppercase tracking-widest hover:scale-105 ${goldButtonClass} flex items-center gap-2`}>
                    <DollarSign size={14} /> Trigger Settlement
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${softTextClass}`}>Pending Wallet</div>
                    <div className="text-2xl font-black text-[#d9aa2b]">{formatCurrency(totalInvested)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${softTextClass}`}>Total Settled</div>
                    <div className="text-2xl font-black text-white">{formatCurrency(totalProfit)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${softTextClass}`}>Live Managers</div>
                    <div className="text-2xl font-black text-white">{linkedManagerCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : hasQuery && allManagers.length === 0 ? (
          /* ── No Results — only shown when searching ── */
          <div className={`flex flex-col items-center justify-center py-16 border rounded-[2rem] ${panelClass}`}>
            <Search size={40} className="text-slate-700 mb-3" />
            <p className={`font-semibold text-sm ${headingTextClass}`}>
              No manager found for &quot;{query}&quot;
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
                All Manager Details
              </h3>
              
            </div>
           
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={isDarkMode ? 'bg-white/5' : 'bg-[#0b226a]'}>
                  {[
                    'Manager',
                    'Account ID',
                    'AUM',
                    'Strategy',
                    'Performance Fee',
                    'Status',
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
                    <td
                      colSpan={9}
                      className={`text-center py-12 text-sm ${softTextClass}`}
                    >
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
                        {/* Manager name + avatar */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                isClientManager
                                  ? managerInfo.avatar
                                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(mgr.name)}&background=1e293b&color=34d399&size=64&bold=true`
                              }
                              alt={mgr.name}
                              className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                            />
                            <div>
                              <div className="font-semibold text-slate-100 text-sm leading-tight">
                                {mgr.name}
                              </div>
                              <div className={`text-[11px] mt-0.5 ${softTextClass}`}>
                                {mgr.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Account ID */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`font-mono font-bold px-2 py-1 rounded-lg ${isDarkMode ? 'bg-white/5 text-royal-400' : 'border border-[#2450b7] bg-[#0b226a] text-[#f0b91f]'}`}>
                            {mgr.accountId}
                          </span>
                        </td>

                        {/* Balance */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="font-bold text-emerald-400">
                            {mgr.balance}
                          </span>
                        </td>

                        {/* Profit */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="font-semibold text-blue-400">
                            {mgr.profit}
                          </span>
                        </td>

                        {/* Share */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="text-purple-400 font-semibold">
                            {mgr.share}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Users
                              size={13}
                              className="text-amber-400 shrink-0"
                            />
                            <span className="font-semibold">
                              {mgr.status}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedManager(mgr)}
                              className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all duration-200 ${isDarkMode ? 'bg-royal/10 text-royal hover:bg-royal hover:text-white border-royal/20' : 'border-[#2858cd] bg-[#0b226a] text-[#d7e5ff] hover:bg-[#102c7c]'}`}
                            >
                              <ChevronRight size={14} className="mr-1 inline" />
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedManager(mgr);
                                setShowDepositModal(true);
                              }}
                              className={`px-4 py-2 rounded-xl font-black text-xs transition-all uppercase tracking-widest hover:scale-105 ${goldButtonClass}`}
                            >
                              <DollarSign size={14} className="inline mr-1" />
                              Fund
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

          {/* Table footer with investors sub-list for highlighted manager */}
          {hasQuery && activeManager && activeManager.investorsList?.length > 0 && (
            <div className={`border-t px-6 py-4 ${borderMutedClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${softTextClass}`}>
                Linked investments under{' '}
                <span className="text-emerald-400">
                  {activeManager.name}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {activeManager.investorsList.map((inv: any) => (
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

      {showAccountSettingsModal && activeManager && (
        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className={`w-full max-w-md rounded-[2rem] border shadow-2xl overflow-hidden ${panelClass}`}>
            <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b ${borderMutedClass}`}>
              <div>
                <h3 className="text-xl font-black text-white">Account Settings</h3>
                <p className={`text-sm mt-1 ${softTextClass}`}>Manage leverage and security for {activeManager.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountSettingsModal(false)}
                className={`rounded-full p-2 transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]'
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5 px-6 py-6">
              {/* <div className={`rounded-3xl border p-4 bg-white/[0.02] ${borderMutedClass}`}>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <div className={`text-[10px] uppercase tracking-[0.24em] ${softTextClass}`}>Leverage Control</div>
                    <div className="text-sm font-black text-white">Current Active</div>
                  </div>
                  <div className="rounded-2xl bg-blue-900/80 px-3 py-2 text-blue-100 text-sm font-black">{newLeverage}</div>
                </div>
                <select
                  value={newLeverage}
                  onChange={(e) => setNewLeverage(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none transition focus:ring-2 focus:ring-blue-500/20 ${inputClass}`}
                >
                  {['100','200','300','400','500','600','700','800','900','1000'].map((val) => (
                    <option key={val} value={val} className="bg-slate-900 text-white">{val}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`mt-4 w-full py-3 rounded-2xl font-black text-sm hover:scale-[1.02] transition-all uppercase tracking-widest ${goldButtonClass}`}
                >
                  Update Leverage
                </button>
              </div> */}

              <div className={`rounded-3xl border p-4 bg-white/[0.02] ${borderMutedClass}`}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <div className={`text-[10px] uppercase tracking-[0.24em] ${softTextClass}`}>Security Access</div>
                    <div className="text-sm font-black text-white">Reset Account Password</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${softTextClass}`}>Password Type</span>
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      {['Investor'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPasswordType(type as 'Investor' | 'Manager')}
                          className={`py-2 px-1 rounded-xl border text-xs font-bold transition ${
                            passwordType === type
                              ? 'border-[#3aa0ff] bg-blue-500/20 text-white'
                              : 'border-white/10 bg-white/5 text-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${softTextClass}`}>New Password</span>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newInvestorPassword}
                        onChange={(e) => setNewInvestorPassword(e.target.value)}
                        placeholder="Enter new password"
                        className={`w-full rounded-xl border pl-3 pr-10 py-2 text-xs text-white outline-none ${inputClass}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${softTextClass}`}>Confirm Password</span>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmInvestorPassword}
                        onChange={(e) => setConfirmInvestorPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={`w-full rounded-xl border pl-3 pr-10 py-2 text-xs text-white outline-none ${inputClass}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountSettingsModal(false);
                    setNewInvestorPassword('');
                    setConfirmInvestorPassword('');
                  }}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-xs font-bold transition-all hover:scale-105 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeManager?.accountId) return;
                    if (!newInvestorPassword || !confirmInvestorPassword) {
                      toast.error('Please enter and confirm the new password');
                      return;
                    }
                    if (newInvestorPassword !== confirmInvestorPassword) {
                      toast.error('Passwords do not match');
                      return;
                    }
                    try {
                      const res = await fetch('/api/client/reset-investor-password', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          account_id: activeManager.accountId,
                          new_password: newInvestorPassword,
                          password_type: passwordType.toLowerCase(),
                        }),
                      });
                      const data = await res.json().catch(() => null);
                      if (res.ok && data?.status === 'ok') {
                        toast.success(data.message || 'Password updated successfully');
                        setShowAccountSettingsModal(false);
                        setNewInvestorPassword('');
                        setConfirmInvestorPassword('');
                      } else {
                        toast.error(data?.message || 'Failed to reset password');
                      }
                    } catch {
                      toast.error('An error occurred resetting password');
                    }
                  }}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all hover:scale-105 ${goldButtonClass}`}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvestorListModal && activeManager && (
        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className={`w-full max-w-3xl rounded-[2rem] border shadow-2xl overflow-hidden ${panelClass}`}>
            <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b ${borderMutedClass}`}>
              <div>
                <h3 className="text-xl font-black text-white">Investor List</h3>
                <p className={`text-sm mt-1 ${softTextClass}`}>Active investors linked to {activeManager.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvestorListModal(false)}
                className={`rounded-full p-2 transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]'
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {isPopupInvestorsLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-amber-400 rounded-full animate-spin mb-3" />
                  <p className={`font-bold text-xs ${softTextClass}`}>Loading investors list...</p>
                </div>
              ) : (popupInvestors.length ? popupInvestors : activeManager.investorsList)?.length ? (
                <div className="grid gap-4">
                  {(popupInvestors.length ? popupInvestors : activeManager.investorsList).map((inv: any) => (
                    <div key={inv.id || inv.accountId} className={`rounded-2xl border p-4 bg-white/[0.02] ${borderMutedClass} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
                      <div>
                        <div className="text-sm font-black text-white">{inv.name}</div>
                        <div className={`text-xs mt-1 ${softTextClass}`}>Account #{inv.accountId || inv.id} · {inv.invested || 'Active'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-blue-900/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100 border border-blue-500/20">{inv.profit || inv.equity}</span>
                        <span className="text-xs text-slate-300">{inv.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`rounded-[2rem] border p-10 text-center ${borderMutedClass} bg-white/[0.02]`}>
                  <div className="text-xl font-black text-white mb-3">No Investors Found</div>
                  <p className={`text-sm ${softTextClass}`}>There are no active investors linked to this manager account yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPerformanceModal && activeManager && (
        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className={`w-full max-w-5xl rounded-[2rem] border shadow-2xl overflow-hidden ${panelClass}`}>
            <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b ${borderMutedClass}`}>
              <div>
                <h3 className="text-xl font-black text-white">Open Positions</h3>
                <p className={`text-sm mt-1 ${softTextClass}`}>Real-time trading activity for Account #{activeManager.accountId || currentAccountLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPerformanceModal(false)}
                className={`rounded-full p-2 transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]'
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {positionsLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-amber-400 rounded-full animate-spin mb-4" />
                  <p className={`font-bold text-sm ${softTextClass}`}>Fetching open positions from MT5...</p>
                </div>
              ) : positionsError ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <p className="text-rose-400 font-bold text-sm mb-3">{positionsError}</p>
                  <button
                    type="button"
                    onClick={loadOpenPositions}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
                  >
                    Retry
                  </button>
                </div>
              ) : openPositions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-800/40 text-blue-200 border border-blue-500/20">
                    <TrendingUp size={20} />
                  </span>
                  <div className={`text-sm font-semibold ${softTextClass}`}>No open positions found for account #{activeManager.accountId || currentAccountLabel}</div>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className={isDarkMode ? 'bg-slate-950' : 'bg-[#0b226a]'}>
                        {['TICKET','SYMBOL','TYPE','VOLUME','OPEN PRICE','CURRENT','PROFIT','SWAP','OPEN TIME','COMMENT'].map((label) => (
                          <th key={label} className={`px-3 py-3 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={isDarkMode ? 'divide-y divide-white/5' : 'divide-y divide-[#153d9f]'}>
                      {openPositions.map((pos: any) => {
                        const isBuy = String(pos.type).toLowerCase() === 'buy';
                        const isProfit = Number(pos.profit) >= 0;
                        return (
                          <tr key={pos.ticket} className={`hover:bg-white/5 transition-colors ${isDarkMode ? '' : 'text-white'}`}>
                            <td className="px-3 py-3 font-mono text-xs font-bold text-amber-400">{pos.ticket}</td>
                            <td className="px-3 py-3 font-bold text-sm">{pos.symbol}</td>
                            <td className="px-3 py-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                {pos.type}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-bold text-xs">{pos.volume}</td>
                            <td className="px-3 py-3 font-mono text-xs">{pos.open_price}</td>
                            <td className="px-3 py-3 font-mono text-xs">{pos.current_price}</td>
                            <td className={`px-3 py-3 font-bold text-xs ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {pos.profit >= 0 ? `+${pos.profit}` : pos.profit}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs">{pos.swap}</td>
                            <td className="px-3 py-3 text-xs text-slate-300 whitespace-nowrap">{pos.open_time}</td>
                            <td className="px-3 py-3 text-xs text-slate-400 font-mono">{pos.comment || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-6 flex items-center justify-between text-xs text-blue-200">
                <div className={`inline-flex items-center gap-2 ${softTextClass}`}>
                  <span className={`h-2 w-2 rounded-full ${mt5Status === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
                  {mt5Status === 'online' ? 'LIVE FEED (MT5 Online)' : 'MT5 Offline'}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={loadOpenPositions}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white' : 'border-blue-500/30 bg-blue-900/50 hover:bg-blue-800/50 text-white'}`}
                  >
                    <RefreshCw size={14} className={positionsLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition shadow-[0_10px_30px_-20px_rgba(59,130,246,0.7)]"
                    onClick={() => setShowPerformanceModal(false)}
                  >
                    Close Panel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DepositModal
        showDepositModal={showDepositModal}
        setShowDepositModal={setShowDepositModal}
        activeTab={activeDepositTab}
        setActiveTab={setActiveDepositTab}
        cheeseAmount={cheeseAmount}
        setCheeseAmount={setCheeseAmount}
        currency={currency}
        setCurrency={setCurrency}
        convertedAmount={convertedAmount}
        selectedDepositAccount={currentAccountLabel}
        usdtAmount={usdtAmount}
        setUsdtAmount={setUsdtAmount}
      />

      {showWithdrawalModal && (
        <WithdrawalModal
          onClose={() => setShowWithdrawalModal(false)}
          isDarkMode={isDarkMode}
          currentAccount={currentAccountLabel}
        />
      )}

      <AccountOpenModal
        showModal={showAccountOpenModal}
        setShowModal={setShowAccountOpenModal}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
