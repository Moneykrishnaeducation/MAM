import React, { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import { Wallet, TrendingUp, ShieldCheck, X, Eye, EyeOff, ArrowRight, BarChart3, Users, ArrowDownCircle, ArrowUpCircle, Search, ChevronDown } from 'lucide-react';
import DepositModal from '../model/depositmodel';
import WithdrawalModal from '../model/withdrawal';
import { InvestmentsSkeleton } from '@/components/client-page-skeletons';
import { toast } from 'sonner';

const Modal: React.FC<{ title: string; onClose: () => void; children?: React.ReactNode }> = ({ title, onClose, children }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const panelClass = isDarkMode
    ? 'border-slate-800 bg-slate-900 shadow-2xl'
    : 'border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)]';
  const borderMutedClass = isDarkMode ? 'border-white/10' : 'border-[#1745b3]';
  return (
    <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className={`relative z-[100000] w-full max-w-[1000px] rounded-[2rem] border overflow-hidden flex flex-col max-h-[95vh] ${panelClass}`}>
        <div className={`flex items-center justify-between px-6 py-5 border-b ${borderMutedClass}`}>
          <h3 className="text-[17px] font-extrabold text-white tracking-wide">{title}</h3>
          <button onClick={onClose} className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-white/70 hover:text-white'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

type ClientInvestment = {
  id: number | string;
  accountId: string;
  strategy: string;
  manager: string;
  allocated: number;
  currentValue: number;
  returnPct: number;
  status: string;
  investorAllowCopy: boolean;
  copyMode?: string;
  copyFactor?: number;
  multiTradeCount?: number;
  managerAccountId?: string;
};


type ClientInvestmentApi = {
  id: number | string;
  strategy?: string | null;
  strategy_name?: string | null;
  manager?: string | null;
  manager_name?: string | null;
  allocated?: number | string | null;
  allocated_amount?: number | string | null;
  current_value?: number | string | null;
  return_pct?: number | string | null;
  status?: string | null;
};

async function fetchClientEndpoint<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const request = async () =>
    fetch(endpoint, {
      ...options,
      credentials: 'include',
      headers: (() => {
        const headers = new Headers(options.headers || {});
        headers.set('Accept', 'application/json');
        if (options.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
        return headers;
      })(),
    });

  try {
    const response = await request();

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch {
    return null;
  }
}

export async function fetchClientInvestments(page?: number, perPage?: number, search?: string) {
  const searchParams = new URLSearchParams();
  if (page !== undefined) searchParams.set('page', String(page));
  if (perPage !== undefined) searchParams.set('per_page', String(perPage));
  if (search && search.trim()) searchParams.set('search', search.trim());

  const queryString = searchParams.toString();
  const url = queryString ? `/api/client/my-investments?${queryString}` : '/api/client/my-investments';

  const data = await fetchClientEndpoint<{ investments?: any[]; pagination?: any; user_id?: string }>(url);
  if (page === undefined && perPage === undefined) {
    return data?.investments || null;
  }
  return data;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) => {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}%`;
};

const normalizeBool = (value: unknown): boolean => value !== false;

export default function ClientMyInvestPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedInvModal, setSelectedInvModal] = useState<ClientInvestment | null>(null);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showCoefficientModal, setShowCoefficientModal] = useState<boolean>(false);
  const [showInvestorTradesModal, setShowInvestorTradesModal] = useState<boolean>(false);
  const [showManagerTradesModal, setShowManagerTradesModal] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [investorPositions, setInvestorPositions] = useState<any[]>([]);
  const [positionsLoading, setPositionsLoading] = useState<boolean>(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [managerPositions, setManagerPositions] = useState<any[]>([]);
  const [managerPositionsLoading, setManagerPositionsLoading] = useState<boolean>(false);
  const [managerPositionsError, setManagerPositionsError] = useState<string | null>(null);
  const [isCopyingActionLoading, setIsCopyingActionLoading] = useState<boolean>(false);
  const [coefficientMethod, setCoefficientMethod] = useState<'balance' | 'fixed'>('balance');
  const [fixedRatioValue, setFixedRatioValue] = useState<string>('1.00');
  const [multiExecutionEnabled, setMultiExecutionEnabled] = useState<boolean>(false);
  const [activeDepositTab, setActiveDepositTab] = useState<string>('cheesepay');
  const [cheeseAmount, setCheeseAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [usdtAmount, setUsdtAmount] = useState<string>('');
  const [newInvestorPassword, setNewInvestorPassword] = useState<string>('');
  const [confirmInvestorPassword, setConfirmInvestorPassword] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<ClientInvestment[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [investmentsLoading, setInvestmentsLoading] = useState<boolean>(true);
  const [investmentsError, setInvestmentsError] = useState<string | null>(null);
  const hasLoadedInitialDataRef = useRef(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });

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

  useEffect(() => {
    let active = true;

    const loadInvestments = async () => {
      setInvestmentsLoading(true);

      try {
        const response = await fetchClientInvestments(currentPage, perPage, searchQuery);
        const list = response && Array.isArray((response as any).investments) ? (response as any).investments : [];
        const normalized = list.map((investment: any): ClientInvestment => ({
          id: investment.id,
          accountId: String(investment.account_id || ''),
          strategy: String(investment.strategy || investment.strategy_name || 'Untitled strategy'),
          manager: String(investment.manager || investment.manager_name || 'Unassigned'),
          allocated: toNumber(investment.allocated ?? investment.allocated_amount),
          currentValue: toNumber(investment.current_value),
          returnPct: toNumber(investment.return_pct),
          status: String(investment.status || 'Active'),
          investorAllowCopy: normalizeBool(investment.investor_allow_copy),
          copyMode: investment.copy_mode || 'balance',
          copyFactor: toNumber(investment.copy_factor ?? 1.0),
          multiTradeCount: toNumber(investment.multi_trade_count ?? 1),
          managerAccountId: String(investment.manager_account_id || ''),
        }));

        if (!active) {
          return;
        }

        setInvestments(normalized);
        const resAny = response as any;
        setPagination({
          page: Number(resAny?.pagination?.page ?? currentPage),
          perPage: Number(resAny?.pagination?.per_page ?? perPage),
          total: Number(resAny?.pagination?.total ?? normalized.length),
          totalPages: Number(resAny?.pagination?.total_pages ?? 1),
          hasNext: Boolean(resAny?.pagination?.has_next),
          hasPrevious: Boolean(resAny?.pagination?.has_previous),
        });
        setInvestmentsError(normalized.length > 0 ? null : 'No live investments are available.');
        hasLoadedInitialDataRef.current = true;
      } catch {
        if (active) {
          setInvestments([]);
          setInvestmentsError('Unable to load live investments right now.');
          hasLoadedInitialDataRef.current = true;
        }
      } finally {
        if (active) {
          setInvestmentsLoading(false);
        }
      }
    };

    void loadInvestments();

    return () => {
      active = false;
    };
  }, [currentPage, perPage, searchQuery]);

  const openDetailsModal = (inv: ClientInvestment) => {
    setSelectedInvModal(inv);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedInvModal(null);
    setShowDetailsModal(false);
  };

  const openDepositModal = (inv?: ClientInvestment | null) => {
    if (inv) {
      setSelectedInvModal(inv);
    }
    setShowDetailsModal(false);
    setShowDepositModal(true);
  };

  const openWithdrawModal = () => {
    setShowDetailsModal(false);
    setShowWithdrawModal(true);
  };

  const handleCopyingToggle = async () => {
    if (!selectedInvModal) {
      return;
    }

    const accountId = selectedInvModal.accountId?.trim();
    if (!accountId) {
      toast.error('Investment account is not available.');
      return;
    }

    const shouldPause = selectedInvModal.investorAllowCopy;
    const endpoint = shouldPause ? '/api/client/my-investments/pause' : '/api/client/my-investments/start';

    setIsCopyingActionLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account_id: accountId }),
      });

      const data = await response.json().catch(() => null);
      const message = data?.message || (shouldPause ? 'Failed to pause copying' : 'Failed to start copying');

      if (!response.ok || data?.status === 'error') {
        throw new Error(message);
      }

      const nextAllowCopy = !shouldPause;
      setInvestments((prev) =>
        prev.map((investment) =>
          String(investment.id) === String(selectedInvModal.id)
            ? {
                ...investment,
                investorAllowCopy: nextAllowCopy,
                status: nextAllowCopy ? 'Active' : 'Paused',
              }
            : investment,
        ),
      );
      setSelectedInvModal((current) =>
        current
          ? {
              ...current,
              investorAllowCopy: nextAllowCopy,
              status: nextAllowCopy ? 'Active' : 'Paused',
            }
          : current,
      );

      toast.success(data?.message || (shouldPause ? 'Copying paused successfully' : 'Copying started successfully'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update copying state';
      toast.error(message);
    } finally {
      setIsCopyingActionLoading(false);
    }
  };

  const openCoefficientModal = () => {
    if (selectedInvModal) {
      setCoefficientMethod(selectedInvModal.copyMode === 'fixed_multiple' ? 'fixed' : 'balance');
      setFixedRatioValue(String(selectedInvModal.copyFactor ?? '1.00'));
      setMultiExecutionEnabled((selectedInvModal.multiTradeCount ?? 1) > 1);
    }
    setShowCoefficientModal(true);
  };

  const openInvestorTradesModal = async () => {
    setShowInvestorTradesModal(true);
    if (!selectedInvModal) return;

    setPositionsLoading(true);
    setPositionsError(null);
    setInvestorPositions([]);
    try {
      const response = await fetchClientEndpoint<{ success?: boolean; positions?: any[]; message?: string }>(
        `/api/client/open-positions/${selectedInvModal.accountId}`
      );
      if (response && response.success) {
        setInvestorPositions(response.positions || []);
      } else {
        setPositionsError(response?.message || 'Failed to fetch open positions.');
      }
    } catch (err) {
      setPositionsError('Error fetching open positions.');
    } finally {
      setPositionsLoading(false);
    }
  };

  const openManagerTradesModal = async () => {
    setShowManagerTradesModal(true);
    if (!selectedInvModal || !selectedInvModal.managerAccountId) return;

    setManagerPositionsLoading(true);
    setManagerPositionsError(null);
    setManagerPositions([]);
    try {
      const response = await fetchClientEndpoint<{ success?: boolean; positions?: any[]; message?: string }>(
        `/api/client/open-positions/${selectedInvModal.managerAccountId}`
      );
      if (response && response.success) {
        setManagerPositions(response.positions || []);
      } else {
        setManagerPositionsError(response?.message || 'Failed to fetch manager open positions.');
      }
    } catch (err) {
      setManagerPositionsError('Error fetching manager open positions.');
    } finally {
      setManagerPositionsLoading(false);
    }
  };

  const handleInvestorPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);

    if (!selectedInvModal) {
      setPasswordError('No investment selected.');
      return;
    }

    if (!newInvestorPassword || !confirmInvestorPassword) {
      setPasswordError('Please enter and confirm the new password.');
      return;
    }

    if (newInvestorPassword !== confirmInvestorPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      const response = await fetchClientEndpoint<{ status?: string; message?: string }>(
        '/api/client/reset-investor-password',
        {
          method: 'POST',
          body: JSON.stringify({
            account_id: selectedInvModal.accountId,
            new_password: newInvestorPassword,
            password_type: 'investor',
          }),
        }
      );

      if (response && response.status === 'ok') {
        toast.success(response.message || 'Investor password updated successfully!');
        setShowPasswordModal(false);
        setNewInvestorPassword('');
        setConfirmInvestorPassword('');
        setShowPasswordText(false);
      } else {
        setPasswordError('Failed to reset investor password. Please try again.');
      }
    } catch {
      setPasswordError('An error occurred while resetting investor password.');
    }
  };

  const handleDeployConfiguration = async () => {
    if (!selectedInvModal) return;

    try {
      const response = await fetchClientEndpoint<{ status?: string; message?: string }>(
        '/api/client/my-investments/coefficient',
        {
          method: 'POST',
          body: JSON.stringify({
            account_id: selectedInvModal.accountId,
            coefficient_method: coefficientMethod,
            multiplier: parseFloat(fixedRatioValue),
            multi_execution: multiExecutionEnabled,
          }),
        }
      );

      if (response && response.status === 'ok') {
        toast.success(response.message || 'Coefficient configuration deployed successfully!');
        setShowCoefficientModal(false);
        // Refresh investments
        const updated = await fetchClientInvestments();
        if (updated) {
          const normalized = Array.isArray(updated)
            ? updated.map((investment: any): ClientInvestment => ({
                id: investment.id,
                accountId: String(investment.account_id || ''),
                strategy: String(investment.strategy || investment.strategy_name || 'Untitled strategy'),
                manager: String(investment.manager || investment.manager_name || 'Unassigned'),
                allocated: toNumber(investment.allocated ?? investment.allocated_amount),
                currentValue: toNumber(investment.current_value),
                returnPct: toNumber(investment.return_pct),
                status: String(investment.status || 'Active'),
                investorAllowCopy: normalizeBool(investment.investor_allow_copy),
                copyMode: investment.copy_mode || 'balance',
                copyFactor: toNumber(investment.copy_factor ?? 1.0),
                multiTradeCount: toNumber(investment.multi_trade_count ?? 1),
                managerAccountId: String(investment.manager_account_id || ''),
              }))
            : [];
          setInvestments(normalized);
        }
      } else {
        toast.error(response?.message || 'Failed to deploy coefficient configuration.');
      }
    } catch (err) {
      toast.error('An error occurred while deploying configuration.');
    }
  };

  const totalInvested = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.allocated, 0),
    [investments],
  );

  const totalCurrentValue = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.currentValue, 0),
    [investments],
  );

  const totalProfit = useMemo(
    () => totalCurrentValue - totalInvested,
    [totalCurrentValue, totalInvested],
  );

  const totalProfitPct = useMemo(
    () => (totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0),
    [totalInvested, totalProfit],
  );

  const activeInvestments = useMemo(
    () => investments.filter((investment) => String(investment.status).toLowerCase() === 'active').length,
    [investments],
  );

  const visibleInvestments = useMemo(() => investments, [investments]);

  const summaryCards = useMemo(
    () => [
      {
        title: 'Total Invested',
        value: formatMoney(totalInvested),
        suffix: 'USD',
        icon: Wallet,
        badge: 'Live',
        cardClassName: isDarkMode
          ? 'relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-xl group hover:border-[#1d53ca]/50 transition-all duration-500'
          : 'relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-[2rem] p-6 shadow-2xl group hover:border-blue-600/80 transition-all duration-500',
        glowClassName:
          'absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500',
        iconClassName: isDarkMode
          ? 'w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-300 flex items-center justify-center transition-all'
          : 'w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all',
        badgeClassName:
          'text-emerald-400 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider',
        titleClassName: isDarkMode ? 'text-gray-400 text-xs font-black tracking-widest uppercase mb-1.5' : 'text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5',
        valueClassName: 'text-3xl font-black text-white flex items-baseline gap-1.5',
        suffixClassName: 'text-sm font-bold text-blue-500',
      },
      {
        title: 'Total Profit',
        value: formatMoney(totalProfit),
        suffix: formatPercent(totalProfitPct),
        icon: TrendingUp,
        badge: 'Growth',
        cardClassName: isDarkMode
          ? 'relative overflow-hidden rounded-[2rem] border border-emerald-950/45 bg-slate-900 p-6 shadow-xl group hover:border-[#1d53ca]/50 transition-all duration-500'
          : 'relative overflow-hidden bg-gradient-to-br from-emerald-900/30 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-[2rem] p-6 shadow-2xl group hover:border-emerald-700/60 transition-all duration-500',
        glowClassName:
          'absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500',
        iconClassName: isDarkMode
          ? 'w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all'
          : 'w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all',
        badgeClassName:
          'text-emerald-400 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider',
        titleClassName: isDarkMode ? 'text-gray-400 text-xs font-black tracking-widest uppercase mb-1.5' : 'text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5',
        valueClassName: 'text-3xl font-black text-white flex items-baseline gap-1.5',
        suffixClassName: 'text-sm font-bold text-emerald-500',
      },
      {
        title: 'Active Investments',
        value: String(activeInvestments),
        suffix: `${investments.length} total`,
        icon: ShieldCheck,
        badge: 'Open',
        cardClassName: isDarkMode
          ? 'relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-xl group hover:border-[#1d53ca]/50 transition-all duration-500'
          : 'relative overflow-hidden bg-gradient-to-br from-yellow-900/30 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-[2rem] p-6 shadow-2xl group hover:border-yellow-700/60 transition-all duration-500',
        glowClassName:
          'absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-yellow-500/10 blur-3xl group-hover:bg-yellow-500/20 transition-all duration-500',
        iconClassName: isDarkMode
          ? 'w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-300 flex items-center justify-center transition-all'
          : 'w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.15)] group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all',
        badgeClassName:
          'text-blue-300 text-[11px] font-bold px-3 py-1 bg-blue-900/50 rounded-full border border-blue-700/50 uppercase tracking-wider',
        titleClassName: isDarkMode ? 'text-gray-400 text-xs font-black tracking-widest uppercase mb-1.5' : 'text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5',
        valueClassName: 'text-3xl font-black text-white',
        suffixClassName: 'text-sm font-bold text-yellow-300',
      },
    ],
    [activeInvestments, investments.length, totalInvested, totalProfit, totalProfitPct, isDarkMode],
  );

  const selectedInvestmentId = selectedInvModal ? String(selectedInvModal.accountId) : '';
  const selectedInvestmentProfit = selectedInvModal ? selectedInvModal.currentValue - selectedInvModal.allocated : 0;
  const visibleCount = pagination.total;
  const showingStart = visibleCount > 0 ? (pagination.page - 1) * perPage + 1 : 0;
  const showingEnd = visibleCount
    ? Math.min(showingStart + visibleInvestments.length - 1, visibleCount)
    : 0;
  const totalPages = pagination.totalPages;
  const safePage = pagination.page;

  if (investmentsLoading && !hasLoadedInitialDataRef.current) {
    return (
      <>
        <Head>
          <title>My Investments | Client Portal</title>
        </Head>
        <InvestmentsSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>My Investments | Client Portal</title>
      </Head>
      <div className="relative p-6 md:p-10 space-y-12 overflow-hidden">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-600/5 blur-[90px]" />
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className={card.cardClassName}>
                <div className={card.glowClassName} />
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <div className={card.iconClassName}>
                    <Icon size={22} strokeWidth={2.5} />
                  </div>
                  <div className={card.badgeClassName}>{card.badge}</div>
                </div>
                <div className="relative z-10">
                  <div className={card.titleClassName}>{card.title}</div>
                  <div className={card.valueClassName}>
                    {card.value}
                    {card.suffix ? <span className={card.suffixClassName}>{card.suffix}</span> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Table Container */}
        <div className={`${panelClass} rounded-[2.5rem] border overflow-hidden mt-8`}>
          {/* Header */}
          <div className={`p-8 border-b ${borderMutedClass} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-[linear-gradient(180deg,#f0b91f_0%,#c99508_100%)]"></div>
              <h2 className={`text-xl font-bold ${headingTextClass} tracking-wide`}>My Investments</h2>
            </div>
            <div className="relative w-full md:w-[320px]">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <Search size={18} className="text-blue-200/50" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search investments..."
                className={`w-full rounded-2xl border px-4 py-3 pl-11 text-sm font-medium outline-none transition-all ${inputClass}`}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-blue-100/60 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              ) : (
                <ChevronDown className="pointer-events-none absolute inset-y-0 right-4 my-auto text-blue-100/30" size={16} />
              )}
            </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={isDarkMode ? 'bg-white/5' : 'bg-[#0b226a]'}>
                  {[
                    'STRATEGY',
                    'INVESTMENT ID',
                    'ALLOCATED',
                    'CURRENT VALUE',
                    'RETURN %',
                    'PROFIT',
                    'STATUS',
                    'ACTIONS',
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
                {investmentsLoading ? (
                  <tr>
                    <td colSpan={8} className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#2450b7] border-t-[#f0b91f] rounded-full animate-spin mb-4" />
                        <p className={`font-bold ${softTextClass}`}>Fetching investments...</p>
                      </div>
                    </td>
                  </tr>
                ) : visibleInvestments.length > 0 ? (
                  visibleInvestments.map((inv) => {
                    const profit = inv.currentValue - inv.allocated;
                    const isPositive = profit >= 0;
                    const isActive = String(inv.status).toLowerCase() === 'active';

                    return (
                      <tr
                        key={String(inv.id)}
                        className={`group ${isDarkMode ? 'hover:bg-white/5' : 'text-[#dbe8ff] hover:bg-[#0a205f]'} transition-colors`}
                      >
                        {/* Strategy */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-900 font-extrabold text-sm shadow-sm shrink-0">
                              {inv.strategy.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className={`font-bold text-[14px] ${isDarkMode ? 'text-white' : 'text-white'}`}>
                                {inv.strategy}
                              </div>
                              <div className={`text-[11px] mt-0.5 ${softTextClass}`}>
                                Manager: {inv.manager}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Investment ID */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`font-mono font-bold px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-white/5 text-royal-400' : 'border border-[#2450b7] bg-[#0b226a] text-[#f0b91f]'}`}>
                            {String(inv.accountId).toUpperCase()}
                          </span>
                        </td>

                        {/* Allocated */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`font-bold text-[14px] ${isDarkMode ? 'text-gray-300' : 'text-[#dbe8ff]'}`}>
                            {formatMoney(inv.allocated)}
                          </span>
                        </td>

                        {/* Current Value */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`font-bold text-[14px] ${isDarkMode ? 'text-gray-300' : 'text-[#dbe8ff]'}`}>
                            {formatMoney(inv.currentValue)}
                          </span>
                        </td>

                        {/* Return % */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`font-bold text-[14px] ${isDarkMode ? 'text-gray-300' : 'text-[#dbe8ff]'}`}>
                            {formatPercent(inv.returnPct)}
                          </span>
                        </td>

                        {/* Profit */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`text-[14px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatMoney(profit)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              isActive
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-gray-500/10 text-gray-500'
                            }`}
                          >
                            {String(inv.status).toUpperCase()}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openDetailsModal(inv)}
                              className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all duration-200 ${isDarkMode ? 'bg-royal/10 text-royal hover:bg-royal hover:text-white border-royal/20' : 'border-[#2858cd] bg-[#0b226a] text-[#d7e5ff] hover:bg-[#102c7c]'}`}
                            >
                              Details
                            </button>
                            <button
                              onClick={() => openDepositModal(inv)}
                              className={`px-4 py-2 rounded-xl font-black text-xs transition-all uppercase tracking-widest hover:scale-105 ${goldButtonClass}`}
                            >
                              Deposit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-20 text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-[#0b226a]'}`}>
                        <ShieldCheck className={isDarkMode ? 'text-gray-400' : 'text-[#8db5ff]'} size={32} />
                      </div>
                      <p className={`text-lg font-bold ${softTextClass}`}>
                        {searchQuery.trim()
                          ? `No investments found for "${searchQuery}".`
                          : investmentsError || 'No live investments are available.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className={`flex flex-col gap-4 border-t ${borderMutedClass} px-6 py-4 lg:flex-row lg:items-center lg:justify-between`}>
            <div className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
              SHOWING {showingStart} TO {showingEnd} OF {visibleCount}
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end lg:flex-row lg:items-center lg:gap-6">
              <div className="flex items-center gap-3">
                <label className={`text-[11px] font-bold uppercase tracking-[0.2em] ${softTextClass}`} htmlFor="per-page">
                  Rows per page
                </label>
                <select
                  id="per-page"
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none transition-all ${inputClass}`}
                >
                  {[10, 30, 50, 100, 500, 1000].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                {/* Prev */}
                <button
                  id="pagination-prev"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1 || !pagination.hasPrevious}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> Prev
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
                  Next <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          </div>
          {/* Details Modal (opened from table) */}
          {showDetailsModal && selectedInvModal && (
            <Modal title={`${selectedInvestmentId || 'N/A'} - ${selectedInvModal.strategy}`} onClose={closeDetailsModal}>
              <div className="space-y-8">
                {/* Top section: Balance and Stats */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
                  <div className="flex-1">
                    <div className={`text-[11px] font-black uppercase tracking-widest ${softTextClass}`}>Current Value</div>
                    <div className="text-[40px] font-black text-white mt-1 leading-none tracking-tight">
                      {formatMoney(selectedInvModal.currentValue)} <span className={`text-lg font-black ml-2 ${softTextClass}`}>USD</span>
                    </div>
                    <div className="mt-5 flex items-center gap-3">
                      <button
                        onClick={() => openDepositModal(selectedInvModal)}
                        className={`px-5 py-2.5 rounded-lg font-black text-sm transition-all uppercase tracking-widest hover:scale-105 ${goldButtonClass}`}
                      >
                        Quick Deposit
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyingToggle}
                        disabled={isCopyingActionLoading}
                        className={`px-5 py-2.5 rounded-lg border text-white font-bold transition-all hover:scale-105 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                          isDarkMode
                            ? 'border-slate-800 bg-white/5 hover:bg-white/10'
                            : 'border-blue-700/50 hover:bg-blue-800/30'
                        }`}
                      >
                        {isCopyingActionLoading
                          ? 'Updating...'
                          : selectedInvModal.investorAllowCopy
                            ? 'Pause Copying'
                            : 'Start Copying'}
                      </button>
                    </div>
                  </div>

                  {/* Right: Stats Grid */}
                  <div className="flex-none w-full md:w-auto">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                      <div className={`text-sm ${softTextClass}`}>Allocated Amount</div>
                      <div className="text-[15px] font-extrabold text-white text-right">{formatMoney(selectedInvModal.allocated)}</div>

                      <div className={`text-sm ${softTextClass}`}>Profit</div>
                      <div className={`text-[15px] font-extrabold text-right ${selectedInvestmentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatMoney(selectedInvestmentProfit)}
                      </div>

                      <div className={`text-sm ${softTextClass}`}>Return %</div>
                      <div className="text-[15px] font-extrabold text-white text-right">{formatPercent(selectedInvModal.returnPct)}</div>

                      <div className={`text-sm ${softTextClass}`}>Status</div>
                      <div className="text-[15px] font-extrabold text-white text-right">{String(selectedInvModal.status).toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                {/* Info cards row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className={`p-6 rounded-[20px] border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'bg-[#0b1739] border-blue-900/40'}`}>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">Investment Configuration</h4>
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center"><span className={softTextClass}>Investment ID</span><span className="font-extrabold text-white">#{selectedInvestmentId || 'N/A'}</span></div>
                      <div className="flex justify-between items-center"><span className={softTextClass}>Manager</span><span className="font-extrabold text-white text-right max-w-[120px] truncate">{selectedInvModal.manager}</span></div>
                      <div className="flex justify-between items-center"><span className={softTextClass}>Strategy</span><span className="font-extrabold text-white text-right max-w-[120px] truncate">{selectedInvModal.strategy}</span></div>
                      <div className="flex justify-between items-center"><span className={softTextClass}>Status</span><span className="font-extrabold text-white">{String(selectedInvModal.status).toUpperCase()}</span></div>
                    </div>
                  </div>

                  {/* Account Security */}
                  <div className={`p-6 rounded-[20px] border flex flex-col items-center text-center justify-center ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'bg-[#08132e] border-blue-800/50'}`}>
                    <div className="w-12 h-12 rounded-full bg-[#142c70] flex items-center justify-center mb-4 border border-blue-500/20">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d9aa2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">Account Security</h4>
                    <div className="w-full space-y-3 mt-1">
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className={`w-full py-3 rounded-xl font-black transition-all text-sm hover:scale-105 ${goldButtonClass}`}
                      >
                        Password Settings
                      </button>
                      <button
                        onClick={openCoefficientModal}
                        className={`w-full py-3 rounded-xl font-black transition-all text-sm hover:scale-105 ${goldButtonClass}`}
                      >
                        Edit Coefficient
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className={`p-6 rounded-[20px] border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'bg-[#08132e] border-blue-800/50'}`}>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white mb-5">QUICK ACTIONS</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={openInvestorTradesModal}
                        className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#1f56e0] p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#316bff]"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                          <BarChart3 size={18} />
                        </span>
                        Investor Trades
                      </button>
                      <button
                        onClick={openManagerTradesModal}
                        className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#1f56e0] p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#316bff]"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                          <Users size={18} />
                        </span>
                        Manager Trades
                      </button>
                      <button
                        onClick={openWithdrawModal}
                        className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#1f56e0] p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#316bff]"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                          <ArrowUpCircle size={18} />
                        </span>
                        Withdraw
                      </button>
                      <button
                        onClick={() => openDepositModal(selectedInvModal)}
                        className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#1f56e0] p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#316bff]"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                          <ArrowDownCircle size={18} />
                        </span>
                        Deposit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>

      <DepositModal
        showDepositModal={showDepositModal}
        setShowDepositModal={setShowDepositModal}
        activeTab={activeDepositTab}
        setActiveTab={setActiveDepositTab}
        cheeseAmount={cheeseAmount}
        setCheeseAmount={setCheeseAmount}
        currency={currency}
        setCurrency={setCurrency}
        usdtAmount={usdtAmount}
        setUsdtAmount={setUsdtAmount}
        selectedDepositAccount={selectedInvestmentId}
      />

      {showWithdrawModal && (
        <WithdrawalModal
          onClose={() => setShowWithdrawModal(false)}
          isDarkMode={isDarkMode}
          currentAccount={selectedInvestmentId}
        />
      )}

      {showCoefficientModal && (
        <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className={`w-full max-w-lg rounded-[2rem] border shadow-2xl overflow-hidden ${panelClass}`}>
            <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b ${borderMutedClass}`}>
              <div>
                <h3 className="text-xl font-black text-white">Coefficient Configuration</h3>
                <p className={`text-sm uppercase tracking-[0.26em] mt-1 ${softTextClass}`}>Risk Engine</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCoefficientModal(false)}
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
              <div className={`rounded-3xl border p-4 ${borderMutedClass} bg-white/[0.02]`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-900/80 p-3 text-blue-300">
                      <ArrowRight size={18} />
                    </div>
                    <div>
                      <div className={`text-[10px] uppercase tracking-[0.26em] ${softTextClass}`}>Target Investment</div>
                      <div className="text-sm font-bold text-white">ID: #{selectedInvestmentId || 'N/A'}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-yellow-300/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-amber-500">Risk Engine</span>
                </div>
              </div>

              <div className={`rounded-3xl border p-4 ${borderMutedClass} bg-white/[0.02]`}>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCoefficientMethod('balance')}
                    className={`rounded-2xl py-3 text-sm font-bold transition ${coefficientMethod === 'balance' ? 'bg-white text-blue-950 shadow-sm' : 'bg-blue-950/70 text-blue-100 hover:bg-blue-900'}`}
                  >
                    Balance Ratio
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoefficientMethod('fixed')}
                    className={`rounded-2xl py-3 text-sm font-bold transition ${coefficientMethod === 'fixed' ? 'bg-white text-blue-950 shadow-sm' : 'bg-blue-950/70 text-blue-100 hover:bg-blue-900'}`}
                  >
                    Fixed Ratio
                  </button>
                </div>
              </div>

              {coefficientMethod === 'fixed' && (
                <div className={`rounded-3xl border p-4 ${borderMutedClass} bg-white/[0.02]`}>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <div className={`text-[10px] uppercase tracking-[0.26em] ${softTextClass}`}>Multiplication Factor</div>
                      <div className="text-sm font-black text-white">Multiplier</div>
                    </div>
                    <div className="rounded-2xl bg-blue-900/80 px-3 py-2 text-blue-200 text-sm font-black">x{fixedRatioValue}</div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={fixedRatioValue}
                    onChange={(e) => setFixedRatioValue(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className={`w-full rounded-2xl border px-4 py-3 text-lg font-black text-white outline-none transition ${inputClass}`}
                  />
                  <p className={`mt-2 text-[11px] ${softTextClass}`}>Example: A factor of 2.0 will double the relative trade size.</p>
                </div>
              )}

              <div className={`rounded-3xl border p-4 ${borderMutedClass} bg-white/[0.02]`}>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="text-sm font-bold text-white">Multi-Execution</div>
                    <div className={`text-xs ${softTextClass}`}>Order cloning technology</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMultiExecutionEnabled(!multiExecutionEnabled)}
                    className={`relative inline-flex h-9 w-16 items-center rounded-full transition ${multiExecutionEnabled ? 'bg-blue-500' : 'bg-slate-800/90'}`}
                  >
                    <span className={`inline-block h-7 w-7 rounded-full bg-white shadow transition-transform ${multiExecutionEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className={`text-xs uppercase tracking-[0.24em] ${softTextClass}`}>Scaling methodology selected: {coefficientMethod === 'balance' ? 'Balance Ratio' : 'Fixed Ratio'}</div>
              </div>

              <button
                type="button"
                onClick={handleDeployConfiguration}
                className={`w-full py-3 rounded-2xl font-black text-sm hover:scale-[1.02] transition-all uppercase tracking-widest ${goldButtonClass}`}
              >
                Deploy Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvestorTradesModal && (
        <div className="fixed inset-0 z-[100003] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className={`w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden border ${panelClass}`}>
            <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b ${borderMutedClass}`}>
              <div>
                <h3 className="text-xl font-black text-white">Open Positions</h3>
                <p className={`text-sm mt-1 ${softTextClass}`}>Real-time trading activity for Investment #{selectedInvestmentId || 'N/A'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvestorTradesModal(false)}
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={isDarkMode ? 'bg-white/5' : 'bg-[#0b226a]'}>
                      {['TICKET','SYMBOL','TYPE','VOLUME','OPEN PRICE','CURRENT','PROFIT','SWAP','OPEN TIME','COMMENT'].map((label) => (
                        <th key={label} className={`px-3 py-3 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={isDarkMode ? 'divide-y divide-white/5' : 'divide-y divide-[#153d9f]'}>
                    {positionsLoading ? (
                      <tr>
                        <td className="px-3 py-5 text-blue-200" colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            <div className={`text-sm font-semibold mt-2 ${softTextClass}`}>Loading open positions...</div>
                          </div>
                        </td>
                      </tr>
                    ) : positionsError ? (
                      <tr>
                        <td className="px-3 py-5 text-red-400" colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <div className="text-sm font-semibold">{positionsError}</div>
                          </div>
                        </td>
                      </tr>
                    ) : investorPositions.length === 0 ? (
                      <tr>
                        <td className="px-3 py-5 text-blue-200" colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-800 text-blue-200">
                              <ArrowRight size={20} />
                            </span>
                            <div className={`text-sm font-semibold ${softTextClass}`}>No open positions found</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      investorPositions.map((pos, idx) => {
                        const ticket = pos.Ticket ?? pos.ticket ?? 'N/A';
                        const symbol = pos.Symbol ?? pos.symbol ?? 'N/A';
                        const typeVal = pos.Type === 0 || pos.type === 0 || String(pos.Type || pos.type).toLowerCase() === 'buy' ? 'BUY' : 'SELL';
                        const volume = pos.Volume ?? pos.volume ?? '0.00';
                        const openPrice = pos.PriceOpen ?? pos.Price_Open ?? pos.open_price ?? '0.00000';
                        const currentPrice = pos.PriceCurrent ?? pos.Price_Current ?? pos.current_price ?? '0.00000';
                        const profit = toNumber(pos.Profit ?? pos.profit ?? 0);
                        const swap = toNumber(pos.Swap ?? pos.swap ?? 0);
                        const time = pos.Time ?? pos.open_time ?? 'N/A';
                        const comment = pos.Comment ?? pos.comment ?? '';

                        return (
                          <tr key={ticket + '-' + idx} className="text-xs text-white">
                            <td className="px-3 py-4 font-mono font-bold text-blue-300">{ticket}</td>
                            <td className="px-3 py-4 font-bold">{symbol}</td>
                            <td className={`px-3 py-4 font-black ${typeVal === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {typeVal}
                            </td>
                            <td className="px-3 py-4 font-bold">{volume}</td>
                            <td className="px-3 py-4 font-mono">{openPrice}</td>
                            <td className="px-3 py-4 font-mono">{currentPrice}</td>
                            <td className={`px-3 py-4 font-mono font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatMoney(profit)}
                            </td>
                            <td className="px-3 py-4 font-mono">{formatMoney(swap)}</td>
                            <td className="px-3 py-4 text-[10px] text-gray-400">{time}</td>
                            <td className="px-3 py-4 text-[10px] text-gray-400 font-mono">{comment}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-blue-200">
                <div className={`inline-flex items-center gap-2 ${softTextClass}`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> LIVE FEED
                </div>
                <button
                  type="button"
                  className="rounded-full bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition shadow-[0_10px_30px_-20px_rgba(59,130,246,0.7)]"
                  onClick={() => setShowInvestorTradesModal(false)}
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManagerTradesModal && (
        <div className="fixed inset-0 z-[100003] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className={`w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden border ${panelClass}`}>
            <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b ${borderMutedClass}`}>
              <div>
                <h3 className="text-xl font-black text-white">Manager Trades</h3>
                <p className={`text-sm mt-1 ${softTextClass}`}>Manager activity for Investment #{selectedInvestmentId || 'N/A'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManagerTradesModal(false)}
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={isDarkMode ? 'bg-white/5' : 'bg-[#0b226a]'}>
                      {['TICKET','SYMBOL','TYPE','VOLUME','OPEN PRICE','CURRENT','PROFIT','SWAP','OPEN TIME','COMMENT'].map((label) => (
                        <th key={label} className={`px-3 py-3 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={isDarkMode ? 'divide-y divide-white/5' : 'divide-y divide-[#153d9f]'}>
                    {managerPositionsLoading ? (
                      <tr>
                        <td className="px-3 py-5 text-blue-200" colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            <div className={`text-sm font-semibold mt-2 ${softTextClass}`}>Loading manager positions...</div>
                          </div>
                        </td>
                      </tr>
                    ) : managerPositionsError ? (
                      <tr>
                        <td className="px-3 py-5 text-red-400" colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <div className="text-sm font-semibold">{managerPositionsError}</div>
                          </div>
                        </td>
                      </tr>
                    ) : managerPositions.length === 0 ? (
                      <tr>
                        <td className="px-3 py-5 text-blue-200" colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-800 text-blue-200">
                              <ArrowRight size={20} />
                            </span>
                            <div className={`text-sm font-semibold ${softTextClass}`}>No manager trades found</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      managerPositions.map((pos, idx) => {
                        const ticket = pos.Ticket ?? pos.ticket ?? 'N/A';
                        const symbol = pos.Symbol ?? pos.symbol ?? 'N/A';
                        const typeVal = pos.Type === 0 || pos.type === 0 || String(pos.Type || pos.type).toLowerCase() === 'buy' ? 'BUY' : 'SELL';
                        const volume = pos.Volume ?? pos.volume ?? '0.00';
                        const openPrice = pos.PriceOpen ?? pos.Price_Open ?? pos.open_price ?? '0.00000';
                        const currentPrice = pos.PriceCurrent ?? pos.Price_Current ?? pos.current_price ?? '0.00000';
                        const profit = toNumber(pos.Profit ?? pos.profit ?? 0);
                        const swap = toNumber(pos.Swap ?? pos.swap ?? 0);
                        const time = pos.Time ?? pos.open_time ?? 'N/A';
                        const comment = pos.Comment ?? pos.comment ?? '';

                        return (
                          <tr key={ticket + '-' + idx} className="text-xs text-white">
                            <td className="px-3 py-4 font-mono font-bold text-blue-300">{ticket}</td>
                            <td className="px-3 py-4 font-bold">{symbol}</td>
                            <td className={`px-3 py-4 font-black ${typeVal === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {typeVal}
                            </td>
                            <td className="px-3 py-4 font-bold">{volume}</td>
                            <td className="px-3 py-4 font-mono">{openPrice}</td>
                            <td className="px-3 py-4 font-mono">{currentPrice}</td>
                            <td className={`px-3 py-4 font-mono font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatMoney(profit)}
                            </td>
                            <td className="px-3 py-4 font-mono">{formatMoney(swap)}</td>
                            <td className="px-3 py-4 text-[10px] text-gray-400">{time}</td>
                            <td className="px-3 py-4 text-[10px] text-gray-400 font-mono">{comment}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-blue-200">
                <div className={`inline-flex items-center gap-2 ${softTextClass}`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> LIVE FEED
                </div>
                <button
                  type="button"
                  className="rounded-full bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition shadow-[0_10px_30px_-20px_rgba(59,130,246,0.7)]"
                  onClick={() => setShowManagerTradesModal(false)}
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className={`w-full max-w-md rounded-[2rem] border shadow-2xl overflow-hidden ${panelClass}`}>
            <div className={`flex items-start justify-between gap-4 px-6 py-5 border-b ${borderMutedClass}`}>
              <div>
                <h3 className="text-xl font-black text-white">Change Investor Password</h3>
                <p className={`text-sm mt-1 ${softTextClass}`}>Investment ID: #{selectedInvestmentId || 'N/A'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className={`rounded-full p-2 transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInvestorPasswordSubmit} className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <label className={`block text-[11px] font-black uppercase tracking-[0.24em] ${softTextClass}`}>New Investor Password</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={newInvestorPassword}
                    onChange={(e) => setNewInvestorPassword(e.target.value)}
                    placeholder="Enter new investor password"
                    className={`w-full rounded-2xl border pl-4 pr-12 py-3 text-sm text-slate-100 outline-none transition ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`block text-[11px] font-black uppercase tracking-[0.24em] ${softTextClass}`}>Confirm Investor Password</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={confirmInvestorPassword}
                    onChange={(e) => setConfirmInvestorPassword(e.target.value)}
                    placeholder="Confirm new investor password"
                    className={`w-full rounded-2xl border pl-4 pr-12 py-3 text-sm text-slate-100 outline-none transition ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-400/20 px-4 py-3 text-sm text-rose-100">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-3 rounded-2xl font-black text-sm hover:scale-[1.02] transition-all uppercase tracking-widest ${goldButtonClass}`}
              >
                Update Investor Password
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
