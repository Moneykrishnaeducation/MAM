import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  BookOpen, 
  Clock, 
  TrendingUp, 
  ChevronRight,
  ArrowUpRight,
  UserCheck,
  Users,
  X,
  Wallet,
  ShieldCheck,
  Banknote,
  Info,
  UploadCloud,
  Send,
  Globe,
  Building2,
  Coins,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Loader2,
  User,
} from 'lucide-react';
import AccountOpenModal from '../model/accountopen';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/client-page-skeletons';

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
  recent_transactions?: {
    id: number | string;
    account_number: string;
    type: string;
    amount: number;
    method: string;
    status: string;
    date: string;
  }[];
  trading_accounts?: {
    account_id: string;
    account_type: string;
    account_name: string;
    balance: number;
    status: string;
  }[];
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

const HIDDEN_ACTIVITY_KEYWORDS = ['deposit', 'withdraw', 'reject'];

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
  return fetchClientEndpoint<{
    dashboard?: ClientDashboardPayload & {
      account?: ClientAccountPayload | null;
      investments?: ClientInvestmentPayload[] | null;
    };
  }>('/api/client/dashboard');
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
  investor_account: User,
  Total_Investments: TrendingUp,
  balance: Banknote,
  available_managers: Users,
};

const cardRedirectRoutes: Record<string, string> = {
  manager_account: '/client/manager',
  investor_account: '/client/my-invest',
  funds_invested: '/client/my-invest',
  total_investments: '/client/my-invest',
  Total_Investments: '/client/my-invest',
  balance: '/client/transaction',
  available_managers: '/client/available',
};

const buildDashboardCards = (
  dashboardData: ClientDashboardPayload | null,
  account: ClientAccountPayload | null,
  investments: ClientInvestmentPayload[] | null,
): DashboardCardPayload[] => {
  if (dashboardData?.cards && dashboardData.cards.length > 0) {
    return dashboardData.cards;
  }

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
     
    },
    {
      key: 'Total_Investments',
      title: 'Total Investments',
      value: formatCurrency(totalInvested),
      raw_value: totalInvested,
      // subtitle: allocationCount > 0 ? `${allocationCount} active allocation${allocationCount === 1 ? '' : 's'}` : undefined,
    },
    {
      key: 'balance',
      title: 'MAM Balance',
      value: formatCurrency(totalBalance),
      raw_value: totalBalance,
      // subtitle: balanceCard?.subtitle || (account ? `Account ${account.account_number}` : undefined),
    },
    {
      key: 'available_managers',
      title: 'Available MAM Managers',
      value: investmentManagerNames.length > 0 ? `${investmentManagerNames.length}` : '0',    
      raw_value: investmentManagerNames.length,    
      // subtitle: investmentManagerNames.length > 0 ? `Managers: ${investmentManagerNames.join(', ')}` : undefined,
    },
    {
      key: 'Total_Investments',
      title: 'Total Investments',
      value: formatCurrency(liveInvestmentTotal),
      raw_value: liveInvestmentTotal,
      // subtitle: allocationCount > 0 ? `${allocationCount} active allocation${allocationCount === 1 ? '' : 's'}` : undefined,
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

const WITHDRAWAL_MIN_AMOUNT = 10;

const formatWithdrawalCurrency = (value: number, currency?: string | null) => {
  const safeCurrency = typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency)
    ? currency.toUpperCase()
    : 'USD';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const maskWithdrawalAccount = (value?: string | null) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '---';
  }
  if (trimmed.length <= 8) {
    return trimmed;
  }
  return `${trimmed.slice(0, 4)} •••• ${trimmed.slice(-4)}`;
};

type DashboardWithdrawalModalProps = {
  open: boolean;
  onClose: () => void;
  accountNumber?: string | null;
  accountBalance?: number | null;
  accountCurrency?: string | null;
  accountServer?: string | null;
  accountStatus?: string | null;
  tradingAccounts?: {
    account_id: string;
    account_type: string;
    account_name: string;
    balance: number;
    status: string;
  }[];
};

const DashboardWithdrawalModal = ({
  open,
  onClose,
  accountNumber,
  accountBalance,
  accountCurrency,
  accountServer,
  accountStatus,
  tradingAccounts,
}: DashboardWithdrawalModalProps) => {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [destinationType, setDestinationType] = useState<'bank' | 'crypto'>('bank');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedAccount('');
      setAmount('');
      setDestinationType('bank');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const selectedTradingAcc = tradingAccounts?.find(acc => acc.account_id === selectedAccount);
  const availableBalance = selectedTradingAcc 
    ? selectedTradingAcc.balance 
    : (typeof accountBalance === 'number' && Number.isFinite(accountBalance) ? accountBalance : 0);
  const accountStatusLabel = selectedTradingAcc 
    ? selectedTradingAcc.status 
    : (accountStatus || 'Active');
  const currencyLabel = accountCurrency && /^[A-Za-z]{3}$/.test(accountCurrency) ? accountCurrency.toUpperCase() : 'USD';
  const parsedAmount = Number(amount);
  const canSubmit =
    Boolean(selectedAccount) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= WITHDRAWAL_MIN_AMOUNT &&
    !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAccount) {
      toast.error('Please select an account.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < WITHDRAWAL_MIN_AMOUNT) {
      toast.error(`Withdrawal amount must be at least ${formatWithdrawalCurrency(WITHDRAWAL_MIN_AMOUNT, currencyLabel)}`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/client/withdrawal', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_number: selectedAccount,
          amount: parsedAmount,
          payment_method: destinationType === 'crypto' ? 'Crypto Wallet' : 'Bank Transfer',
          destination_type: destinationType,
          notes: `Dashboard withdrawal request (${currencyLabel})`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to submit withdrawal request');
      }

      toast.success(data?.message || 'Withdrawal request submitted successfully');
      setAmount('');
      setDestinationType('bank');
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const destinationCards = [
    {
      id: 'bank' as const,
      label: 'Bank Transfer',
      icon: Building2,
      description: accountNumber ? `${maskWithdrawalAccount(accountNumber)}` : 'No account linked',
    },
    {
      id: 'crypto' as const,
      label: 'Crypto Wallet',
      icon: Coins,
      description: 'Missing Setup',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.button
          type="button"
          onClick={() => !submitting && onClose()}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          aria-label="Close withdrawal modal overlay"
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 20 }}
          className="relative w-full max-w-[560px] max-h-[calc(100vh-1.5rem)] overflow-y-auto overflow-x-hidden rounded-[28px] border border-[#1745b3] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(135deg,#071a57_0%,#082468_100%)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-[#d3a11a] text-white shadow-sm">
                <ArrowUpRight size={18} />
              </div>
              <h3 className="text-[20px] font-black tracking-tight text-white">
                Withdraw Funds
              </h3>
            </div>

            <button
              type="button"
              onClick={() => !submitting && onClose()}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            >
              <X size={17} />
            </button>
          </div>

          <form className="space-y-3 px-4 pb-4 pt-3 sm:px-5" onSubmit={handleSubmit}>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-3.5 text-white shadow-[0_18px_40px_rgba(4,15,54,0.24)]">
              <div className="mb-3.5 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur-md">
                  <Wallet size={13} className="text-[#d4af37]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-100/80">
                    Treasury Balance
                  </span>
                </div>
                <div className="flex items-center gap-1.5 opacity-60">
                  <ShieldCheck size={12} />
                  <span className="text-[7px] font-black uppercase tracking-[0.2em]">
                    Vault Encrypted
                  </span>
                </div>
              </div>

              <div className="text-[30px] font-black leading-none tracking-tight sm:text-[34px]">
                {formatWithdrawalCurrency(availableBalance, currencyLabel)}
              </div>

              <div className="mt-3 rounded-[22px] border border-white/10 bg-white/5 p-2.5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10">
                      <User size={15} />
                    </div>
                    <div>
                      <span className="mb-0.5 block text-[8px] font-black uppercase tracking-[0.16em] text-blue-100/60">
                        Account ID
                      </span>
                      <span className="font-black tracking-[0.18em] text-[13px]">
                        {maskWithdrawalAccount(selectedAccount || accountNumber)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                      <span className="text-[8px] font-black uppercase tracking-[0.18em]">
                        {String(accountStatusLabel || 'Active').toUpperCase()}
                      </span>
                    </div>
                    <span className="block text-[7px] font-black uppercase tracking-[0.18em] text-blue-100/50">
                      {accountServer || 'Network Validated'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black uppercase tracking-[0.24em] text-blue-100/60">
                Source Ledger
              </label>
              <div className="relative">
                <select
                  value={selectedAccount}
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  className="w-full appearance-none rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3.5 pr-12 text-[15px] font-black tracking-wide text-white outline-none transition focus:border-[#d3a11a]"
                >
                  <option value="" disabled className="bg-[#071a57] text-white">
                    Select Account
                  </option>
                  {tradingAccounts?.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id} className="bg-[#071a57] text-white">
                      {acc.account_type === 'MAM' ? 'MAM Master' : 'MAM Investor'} ({maskWithdrawalAccount(acc.account_id)}) — {formatWithdrawalCurrency(acc.balance, currencyLabel)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-blue-100/60" size={17} />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-end justify-between gap-4 px-1">
                <label className="block text-[9px] font-black uppercase tracking-[0.24em] text-blue-100/60">
                  Select Destination
                </label>
                <a
                  href="/client/profile?activeTab=payment"
                  className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.22em] text-[#d3a11a] transition hover:opacity-80"
                >
                  Manage Vault
                  <ArrowUpRight size={10} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {destinationCards.map((destination) => {
                  const Icon = destination.icon;
                  const isActive = destinationType === destination.id;

                  return (
                    <motion.button
                      key={destination.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setDestinationType(destination.id)}
                      className={`relative flex flex-col gap-2.5 rounded-[22px] border-2 p-3.5 text-left shadow-sm transition-all ${
                        isActive
                          ? 'border-[#d3a11a] bg-white/10 shadow-[0_12px_30px_rgba(4,15,54,0.18)]'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-[14px] ${
                          isActive ? 'bg-[#d3a11a] text-white' : 'bg-white/10 text-blue-100/60'
                        }`}>
                          <Icon size={18} strokeWidth={2.5} />
                        </div>

                        {isActive ? (
                          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/10 bg-white text-[#071a57] shadow-sm">
                            <CheckCircle2 size={14} strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div className="h-[22px] w-[22px] rounded-full border border-white/10 bg-white/5" />
                        )}
                      </div>

                      <div>
                        <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                          isActive ? 'text-white' : 'text-blue-100/50'
                        }`}>
                          {destination.label}
                        </h4>
                        <p className={`mt-0.5 text-[8px] font-semibold tracking-wide ${
                          isActive ? 'text-blue-100/70' : 'text-blue-100/50'
                        }`}>
                          {destination.description}
                        </p>
                      </div>

                      {isActive ? (
                        <motion.div
                          layoutId="withdraw-destination-accent"
                          className="absolute inset-x-0 bottom-0 h-1 rounded-b-[20px]"
                          style={{ background: 'linear-gradient(to right, #d4af37 0%, #2c59c9 100%)' }}
                        />
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black uppercase tracking-[0.24em] text-blue-100/60">
                Withdrawal Amount
              </label>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-[18px] py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tracking-tight text-blue-100/60">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setAmount(value);
                      }
                    }}
                    className="w-full border-0 bg-transparent py-1.5 text-center text-[24px] font-black tracking-tight text-white outline-none placeholder:text-blue-100/30"
                  />
                </div>
              </div>
              <p className="px-1 text-[10px] font-semibold text-blue-100/50">
                Minimum withdrawal amount is {formatWithdrawalCurrency(WITHDRAWAL_MIN_AMOUNT, currencyLabel)}.
              </p>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex w-full items-center justify-center gap-3 rounded-[20px] px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.32em] transition ${
                canSubmit
                  ? 'bg-[#2c59c9] text-white shadow-[0_16px_30px_rgba(44,89,201,0.22)] hover:translate-y-[-1px]'
                  : 'cursor-not-allowed bg-white/10 text-white/50'
              }`}
              >
              <span>Confirm</span>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function ClientDashboardPage() {
  const router = useRouter();
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
  const [selectedDepositAccount, setSelectedDepositAccount] = useState('');
  const [depositAccountMenuOpen, setDepositAccountMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setDashboardLoading(true);

      try {
        const liveDashboard = await fetchClientDashboard();

        if (!isMounted) {
          return;
        }

        const db = liveDashboard?.dashboard;
        setDashboardData(db ? (db as ClientDashboardPayload) : null);
        setClientProfile(db?.client ? (db.client as ClientProfilePayload) : null);
        setClientAccount(db?.account ? (db.account as ClientAccountPayload) : null);
        setClientInvestments(
          db?.investments && Array.isArray(db.investments)
            ? (db.investments as ClientInvestmentPayload[])
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

  const handleManualDepositSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDepositAccount || !cheeseAmount || !proof) {
      toast.error("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("account_number", selectedDepositAccount);
      formData.append("amount", cheeseAmount);
      formData.append("payment_method", "Manual Deposit");
      formData.append("notes", `Manual deposit submitted from dashboard (${currency})`);
      formData.append("proof_file", proof);

      const response = await fetch("/api/client/deposit", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to submit deposit request");
      }

      toast.success(data?.message || "Manual deposit request submitted successfully!");
      setShowDepositModal(false);
      setProof(null);
      setCheeseAmount("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit deposit request");
    } finally {
      setSubmitting(false);
    }
  };

  const isDarkMode = false;

  const depositAccountNumber = clientAccount?.account_number || '';
  const depositAccountCurrency = clientAccount?.currency || 'USD';
  const dashboardCards = buildDashboardCards(dashboardData, clientAccount, clientInvestments);
  const dashboardActivityRows =
    dashboardData?.recent_transactions?.map((tx: any) => ({
      id: tx.id,
      time: formatDashboardTime(tx.date),
      action: `Account ID: ${tx.account_number} via ${tx.method}`,
      details: tx.type,
      amount: formatCurrency(tx.amount),
      status: tx.status,
    })) || [];

  if (dashboardLoading) {
    return (
      <>
        <Head>
          <title>Student Dashboard | Client Portal</title>
        </Head>
        <DashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Student Dashboard | Client Portal</title>
      </Head>
        
        <div className="p-6 md:p-8">
          {/* Action Buttons */}
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <button
              onClick={() => setShowAccountOpenModal(true)}
              className="flex w-full items-center justify-center gap-2.5 rounded-[28px] bg-[#C9A227] px-5 py-3.5 font-semibold text-slate-950 transition-colors shadow-lg shadow-[#a3851d]/20 hover:bg-[#b89d20] sm:min-w-0"
            >
              <UserCheck size={18} />
              Open MAM Account
            </button>
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex w-full items-center justify-center gap-2.5 rounded-[28px] bg-[#C9A227] px-5 py-3.5 font-semibold text-slate-950 transition-colors shadow-lg shadow-[#a3851d]/20 hover:bg-[#b89d20] sm:min-w-0"
            >
              <TrendingUp size={18} />
              Deposit
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="flex w-full items-center justify-center gap-2.5 rounded-[28px] bg-[#C9A227] px-5 py-3.5 font-semibold text-slate-950 transition-colors shadow-lg shadow-slate-900/20 hover:bg-[#b89d20] sm:min-w-0"
            >
              <ArrowUpRight size={18} />
              Withdrawal
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {dashboardCards.map((st, idx) => {
              const IconComp = dashboardCardIcons[st.key] || BookOpen;
              const isFallbackCard = !dashboardData?.cards?.length;
              const targetRoute = cardRedirectRoutes[st.key];

              return (
                <div
                  key={st.key || idx}
                  onClick={() => targetRoute && router.push(targetRoute)}
                  className={`relative overflow-hidden rounded-3xl border p-6 shadow-2xl group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:border-blue-500/50 cursor-pointer ${
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
            <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="relative inline-block pb-2 text-xl font-bold text-white">
                Recent Activity
                <span className="absolute left-0 bottom-0 w-12 h-1 bg-yellow-500 rounded-full"></span>
              </h2>
              <a href="/client/transaction" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-200 transition-colors hover:text-white sm:self-auto">
                View All<ChevronRight size={16} />
              </a>
            </div>

            <div className="overflow-hidden rounded-xl border border-blue-800/60 bg-blue-950/40 shadow-lg">
              <div className="overflow-x-auto">
                <table className="min-w-[680px] sm:min-w-full w-full table-fixed text-left text-sm text-slate-300">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[30%]" />
                    <col className="w-[15%]" />
                    <col className="w-[18%]" />
                    <col className="w-[17%]" />
                  </colgroup>
                  <thead className="bg-blue-900/60 font-semibold text-white">
                    <tr>
                      <th className="px-3 py-4 text-[10px] uppercase tracking-widest sm:px-6 sm:text-xs">Time</th>
                      <th className="px-3 py-4 text-[10px] uppercase tracking-widest sm:px-6 sm:text-xs">Description</th>
                      <th className="px-3 py-4 text-[10px] uppercase tracking-widest sm:px-6 sm:text-xs">Type</th>
                      <th className="px-3 py-4 text-[10px] uppercase tracking-widest sm:px-6 sm:text-xs">Amount (USD)</th>
                      <th className="px-3 py-4 text-[10px] uppercase tracking-widest sm:px-6 sm:text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800/40">
                    {dashboardActivityRows.length > 0 ? (
                      dashboardActivityRows.map((log: any) => (
                        <tr key={log.id} className="hover:bg-blue-900/30 transition-colors">
                          <td className="px-3 py-4 align-top whitespace-nowrap text-xs text-slate-200 sm:px-6 sm:text-sm">{log.time}</td>
                          <td className="px-3 py-4 align-top font-medium text-white sm:px-6">{log.action}</td>
                          <td className="px-3 py-4 align-top break-words leading-6 text-slate-300 sm:px-6">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              log.details === "Deposit" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {log.details}
                            </span>
                          </td>
                          <td className="px-3 py-4 align-top whitespace-nowrap font-mono text-[11px] text-blue-200 sm:px-6 sm:text-xs">{log.amount}</td>
                          <td className="px-3 py-4 align-top sm:px-6">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              log.status === "Approved" ? "bg-green-500/10 text-green-400" :
                              log.status === "Rejected" ? "bg-red-500/10 text-red-400" :
                              "bg-amber-500/10 text-amber-400"
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-slate-400 sm:px-6">
                          {dashboardLoading ? "Loading live transactions..." : "No recent transactions recorded for this client."}
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
                  className="relative w-full max-w-[580px] overflow-hidden rounded-[32px] border shadow-2xl bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] border-[#1745b3]"
                >
                  <AnimatePresence mode="wait">
                    {submitting && (
                      <StatusOverlay key="status" type="pending" isDarkMode={isDarkMode} />
                    )}
                  </AnimatePresence>

                  <div className="relative border-b p-6 sm:p-8" style={{
                    borderColor: 'rgba(255,255,255,0.05)',
                    background: 'linear-gradient(135deg, #071a57 0%, #082468 100%)',
                  }}>
                    <div className="flex items-start gap-5">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] shadow-lg bg-[#C9A227] text-white">
                        <Wallet className="h-7 w-7" />
                      </div>
                      <div className="pt-1">
                        <h3 className="text-2xl font-black tracking-tight text-white">
                          Deposit Funds
                        </h3>
                        {selectedDepositAccount ? (
                          <div className="flex items-center gap-2 mt-1">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <span className="text-[13px] font-bold text-blue-100/70">
                              Account: <span className="font-mono text-[#8bb4ff]">{selectedDepositAccount}</span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowDepositModal(false)}
                      className="absolute right-6 top-8 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition-all hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="px-6 sm:px-8 pt-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <h4 className="text-sm font-black uppercase tracking-[0.2em] text-blue-200">Manual Deposit</h4>
                      <p className="mt-1 text-xs text-blue-100/60">Upload proof to fund your live account manually.</p>
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto p-8 pt-6">
                    <div className="mb-6 relative">
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-blue-100/60">
                        Trading Account
                      </label>
                      <button
                        type="button"
                        onClick={() => setDepositAccountMenuOpen((open) => !open)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left text-sm font-black text-white transition hover:border-[#d3a11a] hover:bg-white/[0.06]"
                      >
                        <span className="truncate">
                          {selectedDepositAccount
                            ? (() => {
                                const matchedAccount = dashboardData?.trading_accounts?.find((acc) => acc.account_id === selectedDepositAccount);
                                if (matchedAccount) {
                                  return `${matchedAccount.account_type === 'MAM' ? 'MAM Master' : 'MAM Investor'} (${matchedAccount.account_id}) - ${formatCurrency(matchedAccount.balance)}`;
                                }
                                return selectedDepositAccount;
                              })()
                            : 'Select account'}
                        </span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-white/70 transition-transform ${depositAccountMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {depositAccountMenuOpen && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-[#071a57] shadow-2xl custom-scrollbar">
                          {dashboardData?.trading_accounts?.map((acc) => (
                            <button
                              key={acc.account_id}
                              type="button"
                              onClick={() => {
                                setSelectedDepositAccount(acc.account_id);
                                setDepositAccountMenuOpen(false);
                              }}
                              className="block w-full px-4 py-3 text-left text-sm font-black text-white transition hover:bg-white/10"
                            >
                              {acc.account_type === 'MAM' ? 'MAM Master' : 'MAM Investor'} ({acc.account_id}) - {formatCurrency(acc.balance)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>                    <motion.form
                      key="manual"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onSubmit={handleManualDepositSubmit}
                      className="space-y-6"
                    >
                      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 border-dashed">
                        <div className="flex items-center gap-3 mb-3 text-[#d3a11a]">
                          <Info className="h-5 w-5" />
                          <span className="font-black text-sm uppercase tracking-wider text-blue-100/80">Instructions</span>
                        </div>
                        <p className="text-[13px] font-bold leading-relaxed text-blue-100/70">
                          For bank details, contact <span className="text-[#d3a11a] underline cursor-pointer">Support</span>.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="flex flex-col items-center gap-3">
                          <span className="text-[11px] font-black uppercase tracking-wider text-blue-100/60">
                            Currency
                          </span>
                          <div className="flex rounded-2xl border overflow-hidden border-white/10">
                            {['USD', 'INR'].map((curr) => (
                              <button
                                key={curr}
                                type="button"
                                onClick={() => setCurrency(curr as 'USD' | 'INR')}
                                className={`px-10 py-3 text-[13px] font-black transition-all ${
                                  currency === curr ? 'bg-[#d3a11a] text-white' : 'bg-white/5 text-blue-100/60 hover:bg-white/10'
                                }`}
                              >
                                {curr}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="group">
                          <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-blue-100/60">
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
                              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 pl-12 pr-6 text-xl font-black text-white placeholder-blue-100/30 transition-all focus:border-[#d3a11a] focus:ring-2 focus:ring-[#d3a11a]/20"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em] text-blue-100/60">
                            Upload Transaction Proof
                          </label>
                          <label className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:bg-white/5 ${
                            proof ? 'border-green-500 bg-green-500/5' : 'border-white/10 hover:border-[#d3a11a]'
                          }`}>
                            {proof ? (
                              <>
                                <div className="h-8 w-8 shrink-0 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-500/20">
                                  <Send className="h-4 w-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-green-300 truncate">{proof.name}</p>
                                  <p className="text-[10px] uppercase font-bold text-green-300/60">Ready for verification</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="h-8 w-8 shrink-0 rounded-full bg-[#d3a11a]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <UploadCloud className="h-4 w-4 text-[#d3a11a]" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-white">
                                    Drop or click to upload
                                  </p>
                                  <p className="text-[11px] font-bold text-blue-100/50">
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
                        disabled={submitting || !proof || !cheeseAmount || !selectedDepositAccount}
                        className="w-full group relative overflow-hidden rounded-2xl bg-[#2155C4] py-4 font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-[#C9A227]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
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

          <DashboardWithdrawalModal
            open={showWithdrawModal}
            onClose={() => setShowWithdrawModal(false)}
            accountNumber={depositAccountNumber}
            accountBalance={clientAccount?.balance}
            accountCurrency={clientAccount?.currency}
            accountServer={clientAccount?.server}
            accountStatus={clientAccount?.status}
            tradingAccounts={dashboardData?.trading_accounts}
          />

          <AccountOpenModal showModal={showAccountOpenModal} setShowModal={setShowAccountOpenModal} isDarkMode={false} />
      </>
  );
}

