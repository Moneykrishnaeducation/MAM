import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { 
  BookOpen, 
  Clock, 
  Award, 
  TrendingUp, 
  PlayCircle, 
  ChevronRight,
  ArrowUpRight,
  UserCheck,
  X,
  Wallet,
  ShieldCheck,
  CreditCard,
  Banknote,
  Info,
  UploadCloud,
  Send,
  RefreshCw,
  Globe,
  DollarSign,
  Users,
} from 'lucide-react';
import AccountOpenModal from '../model/accountopen';
import { motion, AnimatePresence } from 'framer-motion';
import { getClientData } from '@/lib/mockDataLoader';

const WHITE_COL = '#FFFFFF';
const NAVY = '#0B1F4B';
const TEXT_SOFT = '#8A9BC0';

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
  const clientData = getClientData();
  const { assignedManager } = clientData;

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAccountOpenModal, setShowAccountOpenModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'cheesepay' | 'manual' | 'usdt'>('cheesepay');
  const [cheeseAmount, setCheeseAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [proof, setProof] = useState<File | null>(null);
  const [rate, setRate] = useState(83);
  const [convertedAmount, setConvertedAmount] = useState('');
  const [selectedDepositAccount, setSelectedDepositAccount] = useState('MAM-84930');
  const [submitting, setSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSubmittingCheesePay, setIsSubmittingCheesePay] = useState(false);
  const [usdtAmount, setUsdtAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawAccount, setWithdrawAccount] = useState('MAM-84930');

  const accounts = [
    { id: 'MAM-84930', name: 'MAM-84930' },
    { id: 'MAM-84931', name: 'MAM-84931' },
    { id: 'MAM-84932', name: 'MAM-84932' },
  ];

  useEffect(() => {
    if (!showDepositModal) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRate(83.5);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [showDepositModal]);

  useEffect(() => {
    const amount = Number(cheeseAmount);
    if (!cheeseAmount || Number.isNaN(amount)) {
      setConvertedAmount('');
      return;
    }

    const value = currency === 'USD' ? (amount * rate).toFixed(2) : (amount / rate).toFixed(2);
    setConvertedAmount(value);
  }, [cheeseAmount, currency, rate]);

  const isMinInrInvalid = currency === 'INR' && Number(cheeseAmount) > 0 && Number(cheeseAmount) < 1000;
  const isMinUsdInvalid = currency === 'USD' && Number(cheeseAmount) > 0 && Number(cheeseAmount) * rate < 1000;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const handleManualDepositSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDepositAccount || !cheeseAmount || !proof) {
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

  const handleCheesePaySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDepositAccount || !cheeseAmount) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (isMinInrInvalid || isMinUsdInvalid) {
      showToast('Minimum deposit amount is Rs.1000. Please increase your amount.', 'error');
      return;
    }

    setIsSubmittingCheesePay(true);
    setIsRedirecting(true);

    setTimeout(() => {
      setIsSubmittingCheesePay(false);
      setIsRedirecting(false);
      setShowDepositModal(false);
      setCheeseAmount('');
      showToast('Redirecting to CheesePay...', 'success');
    }, 1600);
  };

  const handleUsdtSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDepositAccount || !usdtAmount) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setShowDepositModal(false);
      setUsdtAmount('');
      showToast('USDT deposit request submitted successfully!', 'success');
    }, 1400);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!withdrawAmount) {
      showToast('Enter a withdrawal amount.', 'error');
      return;
    }

    setWithdrawSubmitting(true);
    setTimeout(() => {
      setWithdrawSubmitting(false);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      showToast('Withdrawal request submitted.', 'success');
    }, 1200);
  };

  const isDarkMode = false;

  const statIcons: Record<string, any> = {
    BookOpen: BookOpen,
    Clock: Clock,
    Award: Award,
    TrendingUp: TrendingUp,
  };

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
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <UserCheck size={18} />
              Open Mam Account
            </button>
            <button
              onClick={() => setShowDepositModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              <TrendingUp size={18} />
              Deposit
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-6 rounded-xl border border-slate-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <ArrowUpRight size={18} />
              Withdrawal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'MAM Account', value: 'Active', icon: BookOpen },
              { title: 'MAM Funds Invested', value: '$45,000.00', icon: TrendingUp },
              { title: 'MAM Balance', value: '$52,400.00', icon: Award },
              { title: 'Total Account', value: '3', icon: BookOpen },
              { title: 'Active Nodes', value: '8 Nodes', icon: PlayCircle },
              { title: 'Available Manager', value: assignedManager.name || '2', icon: UserCheck },
            ].map((st, idx) => {
              const IconComp = st.icon;

              return (
                <div key={idx} className="relative overflow-hidden bg-[#0b183f]/80 backdrop-blur-sm border border-blue-800/40 rounded-3xl p-6 shadow-2xl group hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:border-blue-500/50 transition-all duration-300">
                  <div className="absolute -top-4 -right-4 text-blue-500/10 group-hover:text-blue-500/20 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                    <IconComp size={100} strokeWidth={1} />
                  </div>
                  
                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-blue-400 shadow-inner group-hover:text-white group-hover:bg-blue-600 transition-all duration-300">
                        <IconComp size={18} strokeWidth={2.5} />
                      </div>
                      <div className="px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/50 text-[10px] uppercase font-bold tracking-widest text-blue-300">
                        Metric
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="text-blue-200/80 text-xs font-semibold tracking-wide mb-1">{st.title}</div>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{st.value}</div>
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
                Recent Activity
                <span className="absolute left-0 bottom-0 w-12 h-1 bg-yellow-500 rounded-full"></span>
              </h2>
              <a href="#" className="text-sm text-blue-200 font-semibold flex items-center hover:text-white transition-colors">
                View More <ChevronRight size={16} className="ml-1" />
              </a>
            </div>

            <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-blue-900/60 text-white font-semibold">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Amount (USD)</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800/40">
                    <tr className="hover:bg-blue-900/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">13 Jul 2026</td>
                      <td className="px-6 py-4 font-medium text-white">Test</td>
                      <td className="px-6 py-4">Deposit into Trading Account</td>
                      <td className="px-6 py-4 text-emerald-400 font-medium">+$300</td>
                      <td className="px-6 py-4">approved</td>
                    </tr>
                    <tr className="hover:bg-blue-900/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">11 Jun 2026</td>
                      <td className="px-6 py-4 font-medium text-white">Test</td>
                      <td className="px-6 py-4">Withdrawal from Trading Account</td>
                      <td className="px-6 py-4 text-emerald-400 font-medium">+$10</td>
                      <td className="px-6 py-4">approved</td>
                    </tr>
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
                  onClick={() => !submitting && !isRedirecting && !isSubmittingCheesePay && setShowDepositModal(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className={`relative w-full max-w-[580px] overflow-hidden rounded-[32px] border shadow-2xl ${isDarkMode ? 'bg-[#070b14] border-white/10' : 'bg-[#F4F7FD] border-[#E8EEF9]'}`}
                >
                  <AnimatePresence mode="wait">
                    {(isRedirecting || submitting || isSubmittingCheesePay) && (
                      <StatusOverlay key="status" type={submitting ? 'pending' : 'redirect'} isDarkMode={isDarkMode} />
                    )}
                  </AnimatePresence>

                  <div className="relative border-b p-6 sm:p-8" style={{
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(201, 162, 39, 0.2)',
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
                        <div className="flex items-center gap-2 mt-1">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          <span className="text-[13px] font-bold" style={{ color: TEXT_SOFT }}>
                            Account: <span className="font-mono text-[#2155C4]">{selectedDepositAccount || 'Select an account'}</span>
                          </span>
                        </div>
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
                    <div className="flex gap-1.5 sm:gap-2 rounded-2xl p-1.5" style={{ backgroundColor: isDarkMode ? '#0e1525' : '#E8EEF9' }}>
                      {[
                        { id: 'cheesepay', label: 'Cheese Pay', icon: CreditCard },
                        { id: 'manual', label: 'Manual', icon: Banknote },
                        { id: 'usdt', label: 'USDT', icon: DollarSign },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id as 'cheesepay' | 'manual' | 'usdt')}
                          className={`flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 rounded-xl py-2.5 sm:py-3.5 text-[10px] sm:text-[12px] font-black uppercase tracking-wider transition-all duration-500 relative overflow-hidden group ${
                            activeTab === tab.id
                              ? isDarkMode
                                ? 'bg-[#2155C4] text-white shadow-[0_8px_20px_-4px_rgba(33,85,196,0.4)]'
                                : 'bg-[#2155C4] text-white shadow-[0_4px_12px_-2px_rgba(33,85,196,0.2)]'
                              : isDarkMode
                              ? 'text-gray-500 hover:text-white'
                              : 'text-[#1A3A8C]/60 hover:bg-white/40 hover:text-[#2155C4]'
                          }`}
                        >
                          <tab.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:scale-110 ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`} />
                          <span className="leading-none text-center">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto p-8 pt-6">
                    <div className="mb-6">
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: TEXT_SOFT }}>
                        Select Trading Account
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                          <Users className="h-5 w-5 text-[#2155C4] opacity-60" />
                        </div>
                        <select
                          value={selectedDepositAccount}
                          onChange={(e) => setSelectedDepositAccount(e.target.value)}
                          className={`w-full rounded-2xl border bg-transparent py-4 pl-12 pr-6 text-sm font-bold transition-all focus:ring-2 focus:ring-[#2155C4]/20 appearance-none ${
                            isDarkMode ? 'border-white/10 text-white focus:border-[#2155C4]' : 'border-[rgba(26,58,140,0.12)] text-[#0B1F4B] focus:border-[#2155C4]'
                          }`}
                        >
                          <option value="" className={isDarkMode ? 'bg-[#070b14]' : 'bg-white'}>
                            -- Choose Account --
                          </option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id} className={isDarkMode ? 'bg-[#070b14]' : 'bg-white'}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                          <ChevronRight className="h-4 w-4 rotate-90 opacity-40" />
                        </div>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {activeTab === 'manual' ? (
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

                            {cheeseAmount && convertedAmount && (
                              <div className="rounded-2xl p-4 bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-widest block mb-1 opacity-50" style={{ color: TEXT_SOFT }}>
                                    Converted ({currency === 'USD' ? 'INR' : 'USD'})
                                  </span>
                                  <span className="text-lg font-black text-[#2155C4]">
                                    {currency === 'USD' ? `₹ ${convertedAmount}` : `$ ${convertedAmount}`}
                                  </span>
                                </div>
                              </div>
                            )}

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
                            disabled={submitting || !proof || !cheeseAmount}
                            className="w-full group relative overflow-hidden rounded-2xl bg-[#2155C4] py-4.5 font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-[#C9A227]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                              {submitting ? 'Submitting...' : 'Submit Proof'} <Send className="h-4 w-4" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          </button>
                        </motion.form>
                      ) : activeTab === 'cheesepay' ? (
                        <motion.form
                          key="cheesepay"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          onSubmit={handleCheesePaySubmit}
                          className="space-y-6"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: TEXT_SOFT }}>
                              Deposit Currency
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

                          <div className="space-y-6">
                            <div>
                              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider" style={{ color: TEXT_SOFT }}>
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
                                  className={`block w-full rounded-2xl border bg-transparent py-4 pl-12 pr-6 text-xl font-black transition-all focus:ring-4 focus:ring-[#C9A227]/10 ${
                                    isDarkMode ? 'border-white/10 text-white focus:border-[#2155C4]' : 'border-[rgba(26,58,140,0.12)] text-[#0B1F4B] focus:border-[#C9A227]'
                                  }`}
                                />
                              </div>
                            </div>

                            {cheeseAmount && rate && (
                              <div className="rounded-2xl p-4 border border-dashed flex items-center justify-between" style={{ borderColor: isDarkMode ? '#1e2d4d' : 'rgba(26,58,140,0.12)', backgroundColor: isDarkMode ? '#0e1525' : '#E8EEF9' }}>
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5 opacity-50" style={{ color: TEXT_SOFT }}>
                                    Live Conversion
                                  </span>
                                  <span className="text-xl font-black text-[#2155C4]">
                                    {currency === 'USD' ? `₹ ${(Number(cheeseAmount) * rate).toFixed(2)}` : `$ ${(Number(cheeseAmount) / rate).toFixed(2)}`}
                                  </span>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-[#2155C4]/10 flex items-center justify-center">
                                  <RefreshCw className="h-5 w-5 text-[#2155C4] animate-spin" />
                                </div>
                              </div>
                            )}

                            {(currency === 'INR' || isMinUsdInvalid) && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl text-[#2155C4] text-xs font-bold">
                                <Info className="h-4 w-4" />
                                Minimum deposit amount is Rs.1000
                              </div>
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmittingCheesePay || isMinInrInvalid || isMinUsdInvalid}
                            className="w-full rounded-2xl bg-[#2155C4] py-5 text-[15px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-[#C9A227]/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                          >
                            {isSubmittingCheesePay ? 'Processing...' : 'Pay Now'} <ChevronRight className="h-5 w-5 inline ml-1" />
                          </button>
                        </motion.form>
                      ) : (
                        <motion.form
                          key="usdt"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          onSubmit={handleUsdtSubmit}
                          className="space-y-8"
                        >
                          <div className="rounded-3xl border border-[#C9A227]/20 bg-[#E8EEF9]/50 p-6 border-dashed">
                            <div className="flex items-center gap-3 mb-3 text-[#C9A227]">
                              <Globe className="h-5 w-5" />
                              <span className="font-black text-sm uppercase tracking-wider">USDT TRC20 Protocol</span>
                            </div>
                            <p className="text-[13px] font-bold leading-relaxed" style={{ color: isDarkMode ? '#cbd5e1' : NAVY }}>
                              Enter the amount you wish to fund. You will be securely redirected to our payment gateway.
                            </p>
                          </div>

                          <div>
                            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest" style={{ color: TEXT_SOFT }}>
                              Deposit Amount (USDT)
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-green-500" />
                              </div>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={usdtAmount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    setUsdtAmount(val);
                                  }
                                }}
                                required
                                className={`block w-full rounded-2xl border bg-transparent py-4 pl-12 pr-6 text-xl font-black focus:ring-4 focus:ring-[#C9A227]/10 ${
                                  isDarkMode ? 'border-white/10 text-white focus:border-[#2155C4]' : 'border-[rgba(26,58,140,0.12)] text-[#0B1F4B] focus:border-[#C9A227]'
                                }`}
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={submitting || !usdtAmount}
                            className="w-full group relative overflow-hidden rounded-2xl bg-[#2155C4] py-5 font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-[#C9A227]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                              {submitting ? 'Processing...' : 'Pay Now'} <ArrowUpRight className="h-4 w-4" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          </button>
                        </motion.form>
                      )}
                    </AnimatePresence>
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

          <AnimatePresence>
            {showWithdrawModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !withdrawSubmitting && setShowWithdrawModal(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="relative w-full max-w-[520px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
                >
                  <div className="relative border-b p-6 sm:p-8 bg-slate-50">
                    <div className="flex items-start gap-5">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-slate-900 text-white">
                        <ArrowUpRight className="h-7 w-7" />
                      </div>
                      <div className="pt-1">
                        <h3 className="text-2xl font-black tracking-tight text-slate-900">Withdrawal Request</h3>
                        <p className="text-sm text-slate-500 mt-1">Request a payout from your MAM account.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowWithdrawModal(false)}
                      className="absolute right-6 top-8 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-8">
                    <form onSubmit={handleWithdrawSubmit} className="space-y-6">
                      <div>
                        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Select Account</label>
                        <select
                          value={withdrawAccount}
                          onChange={(e) => setWithdrawAccount(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white py-4 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Withdrawal Amount (USD)</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={withdrawAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setWithdrawAmount(val);
                              }
                            }}
                            className="w-full rounded-2xl border border-slate-300 bg-white py-4 pl-12 pr-4 text-xl font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>

                      <div className="rounded-3xl bg-slate-50 p-4 border border-slate-200 text-slate-700">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">Available Balance</div>
                        <div className="mt-2 text-2xl font-black text-slate-900">$52,400.00</div>
                      </div>

                      <button
                        type="submit"
                        disabled={withdrawSubmitting}
                        className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
                      >
                        {withdrawSubmitting ? 'Submitting...' : 'Request Withdrawal'}
                      </button>
                    </form>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AccountOpenModal showModal={showAccountOpenModal} setShowModal={setShowAccountOpenModal} isDarkMode={false} />
      </>
  );
}
