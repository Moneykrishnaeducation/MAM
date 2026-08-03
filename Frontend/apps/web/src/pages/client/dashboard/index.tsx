import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  BookOpen, 
  Clock, 
  TrendingUp, 
  ChevronRight,
  ArrowUpRight,
  UserCheck,
  X,
  Wallet,
  ShieldCheck,
  Banknote,
  Info,
  UploadCloud,
  Send,
  Globe,
} from 'lucide-react';
import AccountOpenModal from '../model/accountopen';
import WithdrawalModal from '../model/withdrawal';
import { motion, AnimatePresence } from 'framer-motion';

const WHITE_COL = '#FFFFFF';
const NAVY = '#0B1F4B';
const TEXT_SOFT = '#8A9BC0';

type ClientRequestContext = {
  userId?: string;
};

type DashboardCardPayload = {
  key: string;
  title: string;
  value: string;
  raw_value: number | string;
  subtitle?: string;
};

type DashboardActivityPayload = {
  id: number | string;
  action: string;
  details: string;
  ip_address?: string | null;
  time?: string | null;
};

type ClientDashboardPayload = {
  client: {
    user_id: number;
    full_name: string;
    email: string;
    country: string;
    tier: string;
    kyc_status: string;
  };
  cards: DashboardCardPayload[];
  recent_activity_logs: DashboardActivityPayload[];
};

type ClientProfilePayload = {
  user_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  country: string;
  tier: string;
  kyc_status: string;
};

type ActivityRowView = {
  id: number | string;
  time: string;
  action: string;
  details: string;
  ipAddress: string;
};

type ClientAccountPayload = {
  user_id: number;
  account_number: string;
  server: string;
  balance: number;
  equity: number;
  margin_free: number;
  leverage: string;
  currency: string;
  status: string;
};

type ClientInvestmentPayload = {
  id: number | string;
  manager?: string | null;
  manager_name?: string | null;
  allocated?: number | string | null;
  allocated_amount?: number | string | null;
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

async function fetchClientDashboard() {
  return fetchClientEndpoint<{ dashboard?: ClientDashboardPayload }>('/api/client/dashboard');
}

async function fetchClientProfile() {
  return fetchClientEndpoint<{ profile?: ClientProfilePayload }>('/api/client/profile');
}

async function fetchClientAccount() {
  return fetchClientEndpoint<{ account?: ClientAccountPayload }>('/api/client/account');
}

const formatDashboardTime = (value?: string | null) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value ?? 0);

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

const dashboardCardIcons: Record<
  string,
  React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>
> = {
  manager_account: UserCheck,
  funds_invested: TrendingUp,
  balance: Banknote,
};

const buildDashboardCards = (
  dashboardData: ClientDashboardPayload | null,
  account: ClientAccountPayload | null,
  investments: ClientInvestmentPayload[] | null,
): DashboardCardPayload[] => {
  const dashboardCards = dashboardData?.cards ?? [];
  const balanceCard = dashboardCards.find((card) => card.key === 'balance') || null;
  const investedCard = dashboardCards.find((card) => card.key === 'invested') || null;
  const liveInvestments = investments ?? null;
  const liveInvestmentRows = Array.isArray(liveInvestments) ? liveInvestments : [];
  const investmentManagerNames = Array.from(
    new Set(
      liveInvestmentRows
        .map((investment) => String(investment.manager || investment.manager_name || '').trim())
        .filter(Boolean),
    ),
  );
  const liveInvestmentTotal = liveInvestmentRows.reduce(
    (sum, investment) => sum + toNumber(investment.allocated ?? investment.allocated_amount),
    0,
  );
  const totalBalance =
    typeof balanceCard?.raw_value === 'number'
      ? balanceCard.raw_value
      : account?.balance ?? 0;
  const totalInvested =
    typeof investedCard?.raw_value === 'number'
      ? investedCard.raw_value
      : liveInvestmentTotal;
  const managerName =
    investmentManagerNames[0] || '-';
  const managerSubtitle =
    investmentManagerNames.length > 0
      ? `${investmentManagerNames.length} linked manager${investmentManagerNames.length === 1 ? '' : 's'}`
      : undefined;
  const allocationCount = liveInvestmentRows.length;

  return [
    {
      key: 'manager_account',
      title: 'MAM Manager Account',
      value: managerName,
      raw_value: managerName,
      subtitle: managerSubtitle,
    },
    {
      key: 'funds_invested',
      title: 'MAM Funds Invested',
      value: formatCurrency(totalInvested),
      raw_value: totalInvested,
      subtitle: allocationCount > 0 ? `${allocationCount} active allocation${allocationCount === 1 ? '' : 's'}` : undefined,
    },
    {
      key: 'balance',
      title: 'MAM Balance',
      value: formatCurrency(totalBalance),
      raw_value: totalBalance,
      subtitle: balanceCard?.subtitle || (account ? `Account ${account.account_number}` : undefined),
    },
    {
      key: 'available_managers',
      title: 'Available MAM Managers',
      value: investmentManagerNames.length > 0 ? `${investmentManagerNames.length}` : '0',    
      raw_value: investmentManagerNames.length,    
      subtitle: investmentManagerNames.length > 0 ? `Managers: ${investmentManagerNames.join(', ')}` : undefined,
    }
  ];
};

const StatusOverlay = ({ type, isDarkMode }: { type: 'pending' | 'redirect'; isDarkMode: boolean }) => {
  const isPending = type === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center p-6 text-center backdrop-blur-xl rounded-[24px]"
      style={{ backgroundColor: isDarkMode ? 'rgba(17, 27, 61, 0.95)' : 'rgba(232, 238, 249, 0.92)' } as React.CSSProperties}
    >
      <div className="relative mb-8">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 rounded-full blur-xl ${isPending ? 'bg-yellow-500/20' : 'bg-[#2155C4]/20'}`}
        />

        <div className={`relative h-24 w-24 rounded-full flex items-center justify-center border-2 ${isPending ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-[#2155C4]/30 bg-[#2155C4]/10'}`}>
          <motion.div
            animate={isPending ? { rotate: [0, 10, -10, 0] } : { scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {isPending ? <Clock className="h-12 w-12 text-yellow-500" /> : <Globe className="h-12 w-12 text-[#2155C4] animate-pulse" />}
          </motion.div>

          <svg className="absolute inset-0 h-full w-full">
            <motion.circle
              cx="48"
              cy="48"
              r="45"
              fill="transparent"
              stroke={isPending ? '#eab308' : '#2155C4'}
              strokeWidth="2"
              strokeDasharray="20 120"
              strokeLinecap="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </svg>
        </div>
      </div>

      <h3 className="text-2xl font-bold mb-3" style={{ color: isDarkMode ? WHITE_COL : NAVY }}>
        {isPending ? 'Request Pending...' : 'Securely Redirecting...'}
      </h3>

      <p className="text-sm max-w-[320px] leading-relaxed" style={{ color: TEXT_SOFT }}>
        {isPending
          ? "We've received your deposit proof. Our team is verifying the transaction details. This usually takes a few minutes."
          : 'Connecting you to our secure payment gateway to complete your funding request.'}
      </p>
    </motion.div>
  );
};

export default function ClientDashboardPage() {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAccountOpenModal, setShowAccountOpenModal] = useState(false);
  const [dashboardData, setDashboardData] = useState<ClientDashboardPayload | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfilePayload | null>(null);
  const [clientAccount, setClientAccount] = useState<ClientAccountPayload | null>(null);
  const [clientInvestments, setClientInvestments] = useState<ClientInvestmentPayload[] | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [cheeseAmount, setCheeseAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setDashboardLoading(true);

      try {
        const [liveDashboard, liveProfile, liveAccount, liveInvestments] = await Promise.all([
          fetchClientDashboard(),
          fetchClientProfile(),
          fetchClientAccount(),
          fetchClientEndpoint<{ investments?: ClientInvestmentPayload[] }>('/api/client/my-investments'),
        ]);

        if (!isMounted) {
          return;
        }

        setDashboardData(liveDashboard ? (liveDashboard as ClientDashboardPayload) : null);
        setClientProfile(liveProfile ? (liveProfile as ClientProfilePayload) : null);
        setClientAccount(liveAccount ? (liveAccount as ClientAccountPayload) : null);
        setClientInvestments(
          liveInvestments && Array.isArray(liveInvestments.investments)
            ? (liveInvestments.investments as ClientInvestmentPayload[])
            : null,
        );
      } catch {
        if (isMounted) {
          setDashboardData(null);
          setClientProfile(null);
          setClientAccount(null);
          setClientInvestments(null);
        }
      } finally {
        if (isMounted) {
          setDashboardLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const handleManualDepositSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!clientAccount?.account_number || !cheeseAmount || !proof) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setShowDepositModal(false);
      setProof(null);
      setCheeseAmount('');
      showToast('Manual deposit request submitted successfully!', 'success');
    }, 1400);
  };

  const isDarkMode = false;

  const depositAccountNumber = clientAccount?.account_number || '';
  const depositAccountCurrency = clientAccount?.currency || 'USD';
  const dashboardCards = buildDashboardCards(dashboardData, clientAccount, clientInvestments);
  const dashboardActivityRows: ActivityRowView[] =
    dashboardData?.recent_activity_logs?.map((log) => ({
      id: log.id,
      time: formatDashboardTime(log.time),
      action: log.action,
      details: log.details,
      ipAddress: log.ip_address || 'N/A',
    })) || [];

  return (
    <>
      <Head>
        <title>Student Dashboard | Client Portal</title>
      </Head>
        
        <div className="p-6 md:p-8">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <button
              onClick={() => setShowAccountOpenModal(true)}
              className="bg-[#C9A227] hover:bg-[#b89d20] text-slate-950 font-semibold py-3 px-7 rounded-[28px] transition-colors shadow-lg shadow-[#a3851d]/20 flex items-center gap-2.5"
            >
              <UserCheck size={18} />
              Open MAM Account
            </button>
            <button
              onClick={() => setShowDepositModal(true)}
              className="bg-[#C9A227] hover:bg-[#b89d20] text-slate-950 font-semibold py-3 px-7 rounded-[28px] transition-colors shadow-lg shadow-[#a3851d]/20 flex items-center gap-2.5"
            >
              <TrendingUp size={18} />
              Deposit
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-[#C9A227] hover:bg-[#b89d20] text-slate-950 font-semibold py-3 px-7 rounded-[28px] transition-colors shadow-lg shadow-slate-900/20 flex items-center gap-2.5"
            >
              <ArrowUpRight size={18} />
              Withdrawal
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {dashboardCards.map((st, idx) => {
              const IconComp = dashboardCardIcons[st.key] || BookOpen;
              const isFallbackCard = !dashboardData?.cards?.length;

              return (
                <div
                  key={st.key || idx}
                  className={`relative overflow-hidden rounded-3xl border p-6 shadow-2xl group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:border-blue-500/50 ${
                    isFallbackCard ? 'bg-[#081737]/90 border-blue-800/30' : 'bg-[#0b183f]/80 border-blue-800/40 backdrop-blur-sm'
                  }`}
                >
                  <div className="absolute -top-4 -right-4 text-blue-500/10 group-hover:text-blue-500/20 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                    <IconComp size={100} strokeWidth={1} />
                  </div>

                  <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-blue-400 shadow-inner group-hover:text-white group-hover:bg-blue-600 transition-all duration-300">
                        <IconComp size={18} strokeWidth={2.5} />
                      </div>
                      <div className="px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/50 text-[10px] uppercase font-bold tracking-widest text-blue-300">
                        {isFallbackCard ? 'Snapshot' : 'Metric'}
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="text-blue-200/80 text-xs font-semibold tracking-wide mb-1">{st.title}</div>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{st.value}</div>
                      {st.subtitle ? (
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300/60">
                          {st.subtitle}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Hover bottom gradient bar */}
                  <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                </div>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white relative inline-block pb-2">
                Recent Activity Logs
                <span className="absolute left-0 bottom-0 w-12 h-1 bg-yellow-500 rounded-full"></span>
              </h2>
              <a href="/client/transaction" className="text-sm text-blue-200 font-semibold flex items-center hover:text-white transition-colors">
                View Transactions <ChevronRight size={16} className="ml-1" />
              </a>
            </div>

            <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-blue-900/60 text-white font-semibold">
                    <tr>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800/40">
                    {dashboardActivityRows.length > 0 ? (
                      dashboardActivityRows.map((log) => (
                        <tr key={log.id} className="hover:bg-blue-900/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-200">{log.time}</td>
                          <td className="px-6 py-4 font-medium text-white">{log.action}</td>
                          <td className="px-6 py-4 text-slate-300">{log.details}</td>
                          <td className="px-6 py-4 text-blue-200 font-mono text-xs">{log.ipAddress}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                          {dashboardLoading ? 'Loading live activity logs...' : 'No recent activity recorded for this client.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

          <AnimatePresence>
            {showDepositModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !submitting && setShowDepositModal(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className={`relative w-full max-w-[580px] overflow-hidden rounded-[32px] border shadow-2xl ${isDarkMode ? 'bg-[#070b14] border-white/10' : 'bg-[#F4F7FD] border-[#E8EEF9]'}`}
                >
                  <AnimatePresence mode="wait">
                    {submitting && (
                      <StatusOverlay key="status" type="pending" isDarkMode={isDarkMode} />
                    )}
                  </AnimatePresence>

                  <div className="relative border-b p-6 sm:p-8" style={{
                    borderColor: 
                    isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(201, 162, 39, 0.2)',
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(11,31,75,0.4) 0%, rgba(10,22,45,0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(232,238,249,0.9) 0%, rgba(244,247,253,0.6) 100%)',
                  }}>
                    <div className="flex items-start gap-5">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] shadow-lg bg-[#C9A227] text-white">
                        <Wallet className="h-7 w-7" />
                      </div>
                      <div className="pt-1">
                        <h3 className="text-2xl font-black tracking-tight" style={{ color: isDarkMode ? WHITE_COL : NAVY }}>
                          Deposit Funds
                        </h3>
                        {depositAccountNumber ? (
                          <div className="flex items-center gap-2 mt-1">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <span className="text-[13px] font-bold" style={{ color: TEXT_SOFT }}>
                              Account: <span className="font-mono text-[#2155C4]">{depositAccountNumber}</span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowDepositModal(false)}
                      className={`absolute right-6 top-8 flex h-10 w-10 items-center justify-center rounded-full border transition-all ${isDarkMode ? 'hover:bg-white/10 border-white/10 text-white' : 'hover:bg-black/5 border-black/5 text-[#0B1F4B]'}`}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="px-6 sm:px-8 pt-4">
                    <div className="rounded-2xl border border-blue-100 bg-[#F4F7FD] p-4">
                      <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#2155C4]">Manual Deposit</h4>
                      <p className="mt-1 text-xs text-slate-500">Upload proof to fund your live account manually.</p>
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto p-8 pt-6">
                    <div className="mb-6">
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: TEXT_SOFT }}>
                        Trading Account
                      </label>
                      <div className={`rounded-2xl border px-4 py-4 ${depositAccountNumber ? 'border-[rgba(26,58,140,0.12)] bg-white' : 'border-dashed border-[rgba(26,58,140,0.18)] bg-[#F4F7FD]'}`}>
                        {depositAccountNumber ? (
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-black" style={{ color: NAVY }}>
                                {depositAccountNumber}
                              </p>
                              <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: TEXT_SOFT }}>
                                {clientAccount?.server || 'Live account'} · {depositAccountCurrency} · {clientAccount?.status || 'Active'}
                              </p>
                            </div>
                            <Banknote className="h-5 w-5 text-[#2155C4]" />
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-slate-500">
                            No live trading account is available. Sign in to load account details.
                          </p>
                        )}
                      </div>
                    </div>

                    <motion.form
                      key="manual"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onSubmit={handleManualDepositSubmit}
                      className="space-y-6"
                    >
                      <div className="rounded-3xl border border-[#C9A227]/20 bg-[#E8EEF9]/50 p-6 border-dashed">
                        <div className="flex items-center gap-3 mb-3 text-[#C9A227]">
                          <Info className="h-5 w-5" />
                          <span className="font-black text-sm uppercase tracking-wider">Instructions</span>
                        </div>
                        <p className="text-[13px] font-bold leading-relaxed" style={{ color: isDarkMode ? '#cbd5e1' : NAVY }}>
                          For bank details, contact <span className="text-[#C9A227] underline cursor-pointer">Support</span>.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="flex flex-col items-center gap-3">
                          <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: TEXT_SOFT }}>
                            Currency
                          </span>
                          <div className="flex rounded-2xl border overflow-hidden" style={{ borderColor: isDarkMode ? '#1e2d4d' : 'rgba(26,58,140,0.12)' }}>
                            {['USD', 'INR'].map((curr) => (
                              <button
                                key={curr}
                                type="button"
                                onClick={() => setCurrency(curr as 'USD' | 'INR')}
                                className={`px-10 py-3 text-[13px] font-black transition-all ${
                                  currency === curr ? 'bg-[#C9A227] text-white' : isDarkMode ? 'text-gray-500 hover:bg-[#162545]' : 'bg-white text-gray-500'
                                }`}
                              >
                                {curr}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="group">
                          <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: TEXT_SOFT }}>
                            Deposit Amount ({currency})
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                              <span className="text-xl font-bold opacity-60">{currency === 'USD' ? '$' : '₹'}</span>
                            </div>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={cheeseAmount}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  setCheeseAmount(val);
                                }
                              }}
                              required
                              className={`w-full rounded-2xl border bg-transparent py-4 pl-12 pr-6 text-xl font-black transition-all focus:ring-2 focus:ring-[#C9A227]/20 ${
                                isDarkMode ? 'border-white/10 text-white focus:border-[#2155C4]' : 'border-[rgba(26,58,140,0.12)] text-[#0B1F4B] focus:border-[#C9A227]'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: TEXT_SOFT }}>
                            Upload Transaction Proof
                          </label>
                          <label className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:bg-[#C9A227]/5 ${
                            proof ? 'border-green-500 bg-green-500/5' : 'border-[rgba(26,58,140,0.12)] hover:border-[#C9A227]'
                          }`}>
                            {proof ? (
                              <>
                                <div className="h-8 w-8 shrink-0 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-500/20">
                                  <Send className="h-4 w-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-green-600 truncate">{proof.name}</p>
                                  <p className="text-[10px] uppercase font-bold text-green-600/60">Ready for verification</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="h-8 w-8 shrink-0 rounded-full bg-[#C9A227]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <UploadCloud className="h-4 w-4 text-[#C9A227]" />
                                </div>
                                <div>
                                  <p className="text-sm font-black" style={{ color: NAVY }}>
                                    Drop or click to upload
                                  </p>
                                  <p className="text-[11px] font-bold opacity-50" style={{ color: TEXT_SOFT }}>
                                    JPG, PNG or PDF
                                  </p>
                                </div>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => setProof(e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !proof || !cheeseAmount || !depositAccountNumber}
                        className="w-full group relative overflow-hidden rounded-2xl bg-[#2155C4] py-4.5 font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-[#C9A227]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          {submitting ? 'Submitting...' : 'Submit Proof'} <Send className="h-4 w-4" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      </button>
                    </motion.form>
                  </div>

                  <div className="border-t p-6 text-center" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#E8EEF9' }}>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: TEXT_SOFT }}>
                      <ShieldCheck className="h-3 w-3 text-[#C9A227]" />Protected
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {showWithdrawModal && (
            <WithdrawalModal
              onClose={() => setShowWithdrawModal(false)}
              isDarkMode={isDarkMode}
              currentAccount={depositAccountNumber}
            />
          )}

          <AccountOpenModal showModal={showAccountOpenModal} setShowModal={setShowAccountOpenModal} isDarkMode={false} />
      </>
  );
}
