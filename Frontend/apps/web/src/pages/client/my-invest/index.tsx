import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { Wallet, TrendingUp, ShieldCheck, X, Eye, EyeOff, ArrowRight, BarChart3, Users, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import DepositModal from '../model/depositmodel';
import WithdrawalModal from '../model/withdrawal';

const Modal: React.FC<{ title: string; onClose: () => void; children?: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
    <div className="relative z-[100000] w-full max-w-[1000px] bg-[#0a1435] rounded-xl border border-blue-900/30 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
      <div className="flex items-center justify-between px-6 py-5 border-b border-blue-900/30">
        <h3 className="text-[17px] font-extrabold text-white tracking-wide">{title}</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="p-6 md:p-8 overflow-y-auto">{children}</div>
    </div>
  </div>
);

type ClientInvestment = {
  id: number | string;
  strategy: string;
  manager: string;
  allocated: number;
  currentValue: number;
  returnPct: number;
  status: string;
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

async function fetchClientInvestments() {
  const data = await fetchClientEndpoint<{ investments?: ClientInvestmentApi[]; user_id?: string }>('/api/client/my-investments');
  return data?.investments || null;
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
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) => {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}%`;
};

export default function ClientMyInvestPage() {
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedInvModal, setSelectedInvModal] = useState<ClientInvestment | null>(null);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showCoefficientModal, setShowCoefficientModal] = useState<boolean>(false);
  const [showInvestorTradesModal, setShowInvestorTradesModal] = useState<boolean>(false);
  const [showManagerTradesModal, setShowManagerTradesModal] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
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
  const [investmentsLoading, setInvestmentsLoading] = useState<boolean>(true);
  const [investmentsError, setInvestmentsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadInvestments = async () => {
      setInvestmentsLoading(true);

      try {
        const response = await fetchClientInvestments();
        const normalized = Array.isArray(response)
          ? response.map((investment: any): ClientInvestment => ({
              id: investment.id,
              strategy: String(investment.strategy || investment.strategy_name || 'Untitled strategy'),
              manager: String(investment.manager || investment.manager_name || 'Unassigned'),
              allocated: toNumber(investment.allocated ?? investment.allocated_amount),
              currentValue: toNumber(investment.current_value),
              returnPct: toNumber(investment.return_pct),
              status: String(investment.status || 'Active'),
            }))
          : [];

        if (!active) {
          return;
        }

        setInvestments(normalized);
        setInvestmentsError(normalized.length > 0 ? null : 'No live investments are available.');
      } catch {
        if (active) {
          setInvestments([]);
          setInvestmentsError('Unable to load live investments right now.');
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
  }, []);

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

  const openCoefficientModal = () => {
    setShowCoefficientModal(true);
  };

  const openInvestorTradesModal = () => {
    setShowInvestorTradesModal(true);
  };

  const openManagerTradesModal = () => {
    setShowManagerTradesModal(true);
  };

  const handleInvestorPasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newInvestorPassword || !confirmInvestorPassword) {
      setPasswordError('Please enter and confirm the new password.');
      return;
    }

    if (newInvestorPassword !== confirmInvestorPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setShowPasswordModal(false);
    setNewInvestorPassword('');
    setConfirmInvestorPassword('');
    setShowPasswordText(false);
    console.log('Investor password updated for', selectedInvestmentId || 'unknown');
  };

  const handleDeployConfiguration = () => {
    setShowCoefficientModal(false);
    setMultiExecutionEnabled(false);
    setCoefficientMethod('balance');
    console.log('Deployed coefficient configuration for', selectedInvestmentId || 'unknown');
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

  const summaryCards = useMemo(
    () => [
      {
        title: 'Total Invested',
        value: formatMoney(totalInvested),
        suffix: 'USD',
        icon: Wallet,
        badge: 'Live',
        cardClassName:
          'relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-blue-600/80 transition-all duration-500',
        glowClassName:
          'absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500',
        iconClassName:
          'w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all',
        badgeClassName:
          'text-emerald-400 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider',
        titleClassName: 'text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5',
        valueClassName: 'text-3xl font-black text-white flex items-baseline gap-1.5',
        suffixClassName: 'text-sm font-bold text-blue-500',
      },
      {
        title: 'Total Profit',
        value: formatMoney(totalProfit),
        suffix: formatPercent(totalProfitPct),
        icon: TrendingUp,
        badge: 'Growth',
        cardClassName:
          'relative overflow-hidden bg-gradient-to-br from-emerald-900/30 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-emerald-700/60 transition-all duration-500',
        glowClassName:
          'absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500',
        iconClassName:
          'w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all',
        badgeClassName:
          'text-emerald-400 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider',
        titleClassName: 'text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5',
        valueClassName: 'text-3xl font-black text-white flex items-baseline gap-1.5',
        suffixClassName: 'text-sm font-bold text-emerald-500',
      },
      {
        title: 'Active Investments',
        value: String(activeInvestments),
        suffix: `${investments.length} total`,
        icon: ShieldCheck,
        badge: 'Open',
        cardClassName:
          'relative overflow-hidden bg-gradient-to-br from-yellow-900/30 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-yellow-700/60 transition-all duration-500',
        glowClassName:
          'absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-yellow-500/10 blur-3xl group-hover:bg-yellow-500/20 transition-all duration-500',
        iconClassName:
          'w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.15)] group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all',
        badgeClassName:
          'text-blue-300 text-[11px] font-bold px-3 py-1 bg-blue-900/50 rounded-full border border-blue-700/50 uppercase tracking-wider',
        titleClassName: 'text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5',
        valueClassName: 'text-3xl font-black text-white',
        suffixClassName: 'text-sm font-bold text-yellow-300',
      },
    ],
    [activeInvestments, investments.length, totalInvested, totalProfit, totalProfitPct],
  );

  const visibleInvestments = investments;
  const selectedInvestmentId = selectedInvModal ? String(selectedInvModal.id) : '';
  const selectedInvestmentProfit = selectedInvModal ? selectedInvModal.currentValue - selectedInvModal.allocated : 0;
  const visibleCount = visibleInvestments.length;
  const showingStart = visibleCount > 0 ? 1 : 0;
  const showingEnd = visibleCount;

  return (
    <>
      <Head>
        <title>My Investments | Client Portal</title>
      </Head>
        <div className="p-6 md:p-8 space-y-6 relative h-full min-h-screen">
          
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
          <div className="bg-[#0a1435] border border-blue-900/30 rounded-3xl overflow-hidden shadow-2xl mt-8">
            {/* Header */}
            <div className="p-6 border-b border-blue-900/30 flex items-center gap-3 bg-[#0a1435]">
              <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-wide">My Investments</h2>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#0f1d4a]">
                  <tr>
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
                        className="text-left px-4 py-5 text-[11px] font-extrabold text-blue-200 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/30">
                  {investmentsLoading ? (
                    <tr className="bg-[#0a1435]">
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="inline-flex items-center gap-3 rounded-full border border-blue-800/40 bg-[#101f4c] px-5 py-3 text-sm font-bold text-blue-100">
                          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow-400" />
                          Loading live investments...
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
                          className="transition-colors hover:bg-[#11255e] bg-[#0a1435]"
                        >
                          {/* Strategy */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-900 font-extrabold text-sm shadow-sm shrink-0">
                                {inv.strategy.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white text-[14px]">
                                  {inv.strategy}
                                </div>
                                <div className="text-[11px] text-blue-200/70 mt-0.5">
                                  Manager: {inv.manager}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Investment ID */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-white bg-[#101f4c] px-3 py-1.5 rounded-lg border border-blue-800/50">
                              #{String(inv.id)}
                            </span>
                          </td>

                          {/* Allocated */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-white font-bold text-[14px]">
                              {formatMoney(inv.allocated)}
                            </span>
                          </td>

                          {/* Current Value */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-white font-bold text-[14px]">
                              {formatMoney(inv.currentValue)}
                            </span>
                          </td>

                          {/* Return % */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-white font-bold text-[14px]">
                              {formatPercent(inv.returnPct)}
                            </span>
                          </td>

                          {/* Profit */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`text-[14px] font-bold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {formatMoney(profit)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase border ${
                                isActive
                                  ? 'bg-[#003822] text-[#00e676] border-[#005e3a]'
                                  : 'bg-[#101f4c] text-blue-200 border-blue-800/50'
                              }`}
                            >
                              {String(inv.status).toUpperCase()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openDetailsModal(inv)}
                                className="px-4 py-2 rounded-xl font-bold text-xs bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => openDepositModal(inv)}
                                className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-[#fcd34d] to-[#d97706] text-amber-950 text-xs font-bold transition hover:opacity-90 shadow-lg shadow-amber-500/20"
                              >
                                Deposit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="bg-[#0a1435]">
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="mx-auto max-w-md rounded-2xl border border-blue-800/40 bg-[#101f4c] px-6 py-5 text-blue-100">
                          <div className="text-sm font-bold">
                            {investmentsError || 'No live investments are available.'}
                          </div>
                          <div className="mt-1 text-xs text-blue-200/70">
                            Once the backend returns investment records, they will appear here automatically.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-6 py-5 border-t border-blue-900/30 bg-[#0a1435]">
              <div className="text-xs font-bold text-blue-200 uppercase tracking-widest">
                SHOWING {showingStart} TO {showingEnd} OF {visibleCount}
              </div>

              <div className="flex items-center gap-4">
                <button className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-900/60 text-blue-300 hover:bg-[#11255e] hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <span className="text-xs font-bold text-white">Page 1</span>
                <button className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-900/60 text-blue-300 hover:bg-[#11255e] hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            {/* Details Modal (opened from table) */}
            {showDetailsModal && selectedInvModal && (
              <Modal title={`${selectedInvestmentId || 'N/A'} - ${selectedInvModal.strategy}`} onClose={closeDetailsModal}>
                <div className="space-y-8">
                  {/* Top section: Balance and Stats (No separate container background, just flex layout) */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
                    <div className="flex-1">
                      <div className="text-[11px] font-extrabold text-blue-200 uppercase tracking-widest">Current Value</div>
                      <div className="text-[40px] font-black text-white mt-1 leading-none tracking-tight">
                        {formatMoney(selectedInvModal.currentValue)} <span className="text-lg font-extrabold text-white/70 ml-2">USD</span>
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <button
                          onClick={() => openDepositModal(selectedInvModal)}
                          className="px-5 py-2.5 rounded-lg font-bold bg-[#d9aa2b] hover:bg-[#eabb3a] text-amber-950 transition-colors shadow-lg shadow-amber-500/20 text-sm"
                        >
                          Quick Deposit
                        </button>
                        <button className="px-5 py-2.5 rounded-lg border border-blue-700/50 hover:bg-blue-800/30 text-white font-bold transition-colors text-sm">
                          Pause
                        </button>
                      </div>
                    </div>

                    {/* Right: Stats Grid */}
                    <div className="flex-none w-full md:w-auto">
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div className="text-sm text-white/60">Allocated Amount</div>
                        <div className="text-[15px] font-extrabold text-white text-right">{formatMoney(selectedInvModal.allocated)}</div>

                        <div className="text-sm text-white/60">Profit</div>
                        <div className={`text-[15px] font-extrabold text-right ${selectedInvestmentProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {formatMoney(selectedInvestmentProfit)}
                        </div>

                        <div className="text-sm text-white/60">Return %</div>
                        <div className="text-[15px] font-extrabold text-white text-right">{formatPercent(selectedInvModal.returnPct)}</div>

                        <div className="text-sm text-white/60">Status</div>
                        <div className="text-[15px] font-extrabold text-white text-right">{String(selectedInvModal.status).toUpperCase()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Info cards row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="p-6 rounded-[20px] bg-[#0b1739] border border-blue-900/40">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">Investment Configuration</h4>
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center"><span className="text-white/60">Investment ID</span><span className="font-extrabold text-white">{selectedInvestmentId || 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-white/60">Manager</span><span className="font-extrabold text-white text-right max-w-[120px] truncate">{selectedInvModal.manager}</span></div>
                        <div className="flex justify-between items-center"><span className="text-white/60">Strategy</span><span className="font-extrabold text-white text-right max-w-[120px] truncate">{selectedInvModal.strategy}</span></div>
                        <div className="flex justify-between items-center"><span className="text-white/60">Status</span><span className="font-extrabold text-white">{String(selectedInvModal.status).toUpperCase()}</span></div>
                      </div>
                    </div>

                    {/* Account Security */}
                    <div className="p-6 rounded-[20px] bg-[#08132e] border border-blue-800/50 flex flex-col items-center text-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#142c70] flex items-center justify-center mb-4">
                        {/* Custom Lock SVG matching image style */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d9aa2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">Account Security</h4>
                      <div className="w-full space-y-3 mt-1">
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="w-full py-3 rounded-xl bg-[#2962ff] hover:bg-[#1e4ed8] text-white font-extrabold transition-colors text-sm"
                        >
                          Password Settings
                        </button>
                        <button
                          onClick={openCoefficientModal}
                          className="w-full py-3 rounded-xl bg-[#2962ff] hover:bg-[#1e4ed8] text-white font-extrabold transition-colors text-sm"
                        >
                          Edit Coefficient
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="p-6 rounded-[32px] bg-white/5 border border-blue-700/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-100 mb-5">QUICK ACTIONS</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={openInvestorTradesModal}
                          className="group flex flex-col items-center justify-center gap-2 rounded-3xl bg-[#1f56e0] p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#316bff] shadow-[0_15px_35px_-20px_rgba(37,99,235,0.7)]"
                        >
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-800/20">
                            <BarChart3 size={18} />
                          </span>
                          Investor Trades
                        </button>
                        <button
                          onClick={openManagerTradesModal}
                          className="group flex flex-col items-center justify-center gap-2 rounded-3xl bg-[#1f56e0] p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#316bff] shadow-[0_15px_35px_-20px_rgba(37,99,235,0.7)]"
                        >
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-800/20">
                            <Users size={18} />
                          </span>
                          Manager Trades
                        </button>
                        <button
                          onClick={openWithdrawModal}
                          className="group flex flex-col items-center justify-center gap-2 rounded-3xl bg-[#1f56e0] p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#316bff] shadow-[0_15px_35px_-20px_rgba(37,99,235,0.7)]"
                        >
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-800/20">
                            <ArrowUpCircle size={18} />
                          </span>
                          Withdraw
                        </button>
                        <button
                          onClick={() => openDepositModal(selectedInvModal)}
                          className="group flex flex-col items-center justify-center gap-2 rounded-3xl bg-[#1f56e0] p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#316bff] shadow-[0_15px_35px_-20px_rgba(37,99,235,0.7)]"
                        >
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-800/20">
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
            isDarkMode={true}
            currentAccount={selectedInvestmentId}
          />
        )}

        {showCoefficientModal && (
          <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
            <div className="w-full max-w-lg rounded-[32px] border border-blue-500/20 bg-slate-950 shadow-2xl shadow-blue-950/40 overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-6 py-5 bg-blue-950/95 border-b border-blue-500/10">
                <div>
                  <h3 className="text-xl font-black text-white">Coefficient Configuration</h3>
                  <p className="text-sm uppercase tracking-[0.26em] text-blue-200/80 mt-1">Risk Engine</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCoefficientModal(false)}
                  className="rounded-full border border-blue-500/30 bg-blue-900/70 p-2 text-blue-100 hover:bg-blue-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5 px-6 py-6 bg-[#08132a]">
                <div className="rounded-3xl border border-blue-500/10 bg-blue-950/10 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-blue-900/80 p-3 text-blue-300">
                        <ArrowRight size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.26em] text-blue-300/70">Target Investment</div>
                        <div className="text-sm font-bold text-white">ID: {selectedInvestmentId || 'N/A'}</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-yellow-300/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-amber-500">Risk Engine</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-blue-500/10 bg-blue-950/5 p-4">
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
                  <div className="rounded-3xl border border-blue-500/10 bg-blue-950/5 p-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.26em] text-blue-300/70">Multiplication Factor</div>
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
                      className="w-full rounded-2xl border border-blue-500/20 bg-[#071127] px-4 py-3 text-lg font-black text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="mt-2 text-[11px] text-blue-200/70">Example: A factor of 2.0 will double the relative trade size.</p>
                  </div>
                )}

                <div className="rounded-3xl border border-blue-500/10 bg-blue-950/5 p-4">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="text-sm font-bold text-white">Multi-Execution</div>
                      <div className="text-xs text-blue-200/70">Order cloning technology</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMultiExecutionEnabled(!multiExecutionEnabled)}
                      className={`relative inline-flex h-9 w-16 items-center rounded-full transition ${multiExecutionEnabled ? 'bg-blue-500' : 'bg-slate-800/90'}`}
                    >
                      <span className={`inline-block h-7 w-7 rounded-full bg-white shadow transition-transform ${multiExecutionEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="text-xs uppercase tracking-[0.24em] text-blue-300/60">Scaling methodology selected: {coefficientMethod === 'balance' ? 'Balance Ratio' : 'Fixed Ratio'}</div>
                </div>

                <button
                  type="button"
                  onClick={handleDeployConfiguration}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#d7b128] to-[#b28915] px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:opacity-95 transition"
                >
                  Deploy Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {showInvestorTradesModal && (
          <div className="fixed inset-0 z-[100003] flex items-center justify-center p-4 bg-blue-950/90 backdrop-blur-xl">
            <div className="w-full max-w-3xl rounded-[32px] bg-[#0c2d62] shadow-2xl overflow-hidden border border-blue-600/70">
              <div className="flex items-center justify-between gap-4 bg-[#0d3f7a] px-6 py-5 border-b border-blue-700/60 rounded-t-[32px]">
                <div>
                  <h3 className="text-xl font-black text-white">Open Positions</h3>
                  <p className="text-sm text-blue-200">Real-time trading activity for Investment #{selectedInvestmentId || 'N/A'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvestorTradesModal(false)}
                  className="rounded-full bg-blue-800 p-2 text-blue-100 hover:bg-blue-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 bg-[#0b1b46]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-blue-100">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.18em] text-blue-200 border-b border-blue-700/50">
                        {['# TICKET','SYMBOL','TYPE','VOLUME','OPEN PRICE','CURRENT','PROFIT','SWAP','OPEN TIME','COMMENT'].map((label) => (
                          <th key={label} className="px-3 py-3 text-blue-100">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-blue-700/40">
                        <td className="px-3 py-5 text-blue-200" colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-800 text-blue-200">
                              <ArrowRight size={20} />
                            </span>
                            <div className="text-sm font-semibold text-blue-200">No open positions found</div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-blue-200">
                  <div className="inline-flex items-center gap-2 text-blue-200">
                    <span className="h-2 w-2 rounded-full bg-blue-400" /> LIVE FEED
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
          <div className="fixed inset-0 z-[100003] flex items-center justify-center p-4 bg-blue-950/90 backdrop-blur-xl">
            <div className="w-full max-w-3xl rounded-[32px] bg-[#0c2d62] shadow-2xl overflow-hidden border border-blue-600/70">
              <div className="flex items-center justify-between gap-4 bg-[#0d3f7a] px-6 py-5 border-b border-blue-700/60 rounded-t-[32px]">
                <div>
                  <h3 className="text-xl font-black text-white">Manager Trades</h3>
                  <p className="text-sm text-blue-200">Manager activity for Investment #{selectedInvestmentId || 'N/A'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManagerTradesModal(false)}
                  className="rounded-full bg-blue-800 p-2 text-blue-100 hover:bg-blue-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 bg-[#0b1b46]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-blue-100">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.18em] text-blue-200 border-b border-blue-700/50">
                        {['# TICKET','SYMBOL','TYPE','VOLUME','OPEN PRICE','CURRENT','PROFIT','SWAP','OPEN TIME','COMMENT'].map((label) => (
                          <th key={label} className="px-3 py-3 text-blue-100">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-blue-700/40">
                        <td className="px-3 py-5 text-blue-200" colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-800 text-blue-200">
                              <ArrowRight size={20} />
                            </span>
                            <div className="text-sm font-semibold text-blue-200">No manager trades found</div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-blue-200">
                  <div className="inline-flex items-center gap-2 text-blue-200">
                    <span className="h-2 w-2 rounded-full bg-blue-400" /> LIVE FEED
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
          <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
            <div className="w-full max-w-md rounded-[32px] border border-blue-500/30 bg-gradient-to-br from-blue-950 via-[#0b173f] to-[#071125] shadow-2xl shadow-blue-900/40 overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-blue-500/20">
                <div>
                  <h3 className="text-xl font-black text-white">Change Investor Password</h3>
                  <p className="text-sm text-blue-200 mt-1">Investment ID: {selectedInvestmentId || 'N/A'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleInvestorPasswordSubmit} className="space-y-5 px-6 py-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-[0.24em] text-blue-200">New Investor Password</label>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={newInvestorPassword}
                    onChange={(e) => setNewInvestorPassword(e.target.value)}
                    placeholder="Enter new investor password"
                    className="w-full rounded-2xl border border-blue-500/30 bg-[#071127] px-4 py-3 text-sm text-slate-100 placeholder:text-blue-200/60 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-[0.24em] text-blue-200">Confirm Investor Password</label>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={confirmInvestorPassword}
                    onChange={(e) => setConfirmInvestorPassword(e.target.value)}
                    placeholder="Confirm new investor password"
                    className="w-full rounded-2xl border border-blue-500/30 bg-[#071127] px-4 py-3 text-sm text-slate-100 placeholder:text-blue-200/60 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-blue-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPasswordText}
                      onChange={() => setShowPasswordText(!showPasswordText)}
                      className="accent-blue-400"
                    />
                    Show password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-900/40 px-3 py-2 text-xs font-bold text-blue-100 hover:bg-blue-800 transition"
                  >
                    {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />} {showPasswordText ? 'Hide' : 'Reveal'}
                  </button>
                </div>

                {passwordError && (
                  <div className="rounded-2xl bg-rose-500/10 border border-rose-400/20 px-4 py-3 text-sm text-rose-100">
                    {passwordError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 transition"
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
