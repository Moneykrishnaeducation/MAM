import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, Wallet, ShieldCheck, User, ChevronRight, 
  ExternalLink, Building2, Coins, CheckCircle, AlertCircle, 
  Sparkles, ArrowRight, Info, DollarSign, Loader2, X 
} from 'lucide-react';

const GOLD = "#C9A227";

const ModalWrapper = ({
  title,
  onClose,
  isDarkMode,
  headerIcon: HeaderIcon,
  panelClassName = '',
  bodyClassName = '',
  children,
}: {
  title: string;
  onClose: () => void;
  isDarkMode: boolean;
  headerIcon?: React.ComponentType<any>;
  panelClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) => (
  <AnimatePresence>
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close modal overlay"
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 20 }}
        className={`relative w-full max-w-[640px] max-h-[calc(100vh-3rem)] overflow-hidden rounded-[32px] border bg-white shadow-2xl ${panelClassName}`}
        style={{ backgroundColor: isDarkMode ? '#0a1435' : '#ffffff' } as React.CSSProperties}
      >
        <div className={`relative border-b px-5 py-4 ${isDarkMode ? 'border-blue-900/30 bg-[#0a1435] text-white' : 'border-slate-200 bg-slate-50 text-slate-900'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900 text-white">
              {HeaderIcon ? <HeaderIcon size={24} /> : null}
            </div>
            <h2 className="text-xl font-black">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border transition ${
              isDarkMode 
                ? 'border-blue-900/30 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white' 
                : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100 shadow-sm'
            }`}
          >
            <X size={18} />
          </button>
        </div>
        <div className={`p-3 overflow-y-auto ${bodyClassName}`}>{children}</div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

const AnimatedSection = ({ delay = 0, children }: { delay?: number; children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay }}>
    {children}
  </motion.div>
);

const NumberTicker = ({ value }: { value: number }) => (
  <span className="font-black tracking-tight">{value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}</span>
);

export default function WithdrawalModal({ 
  onClose, 
  isDarkMode = false, 
  currentAccount = null 
}: any) {
  const router = useRouter();
  
  const [selectedAccount, setSelectedAccount] = useState(currentAccount || "");
  const [activeTab, setActiveTab] = useState("bank");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [bankDetails, setBankDetails] = useState<any>(null);
  const [cryptoDetails, setCryptoDetails] = useState<any>(null);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [accounts, setAccounts] = useState<any[]>([]);
  const withdrawalInfo = { minimum_withdrawal: 10 };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const accRes = await fetch("/api/client/account", { credentials: "include" });
        if (accRes.ok && active) {
          const data = await accRes.json();
          if (data && data.account) {
            const accList = [{
              account_id: data.account.account_number,
              balance: Number(data.account.balance || 0)
            }];
            setAccounts(accList);
            if (!selectedAccount) {
              setSelectedAccount(data.account.account_number);
              setAvailableBalance(Number(data.account.balance || 0));
            }
          }
        }

        const payRes = await fetch("/api/client/payment-details", { credentials: "include" });
        if (payRes.ok && active) {
          const data = await payRes.json();
          if (data && data.payment_details) {
            setBankDetails(data.payment_details.bank || null);
            setCryptoDetails(data.payment_details.crypto || null);
          }
        }
      } catch (err) {
        console.error("Failed to load withdrawal resources:", err);
      }
    };

    loadData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const acc = accounts.find(a => a.account_id === selectedAccount);
    if (acc) {
      setAvailableBalance(acc.balance);
    }
  }, [selectedAccount, accounts]);

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccount(e.target.value);
  };

  const handleWithdraw = async () => {
    if (!selectedAccount || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid account and amount.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/client/withdrawal", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number: selectedAccount,
          amount: Number(amount),
          payment_method: activeTab === "bank" ? "Bank Transfer" : "Crypto USDT",
          destination_type: activeTab,
          notes: `Withdrawal request submitted from modal via ${activeTab === 'bank' ? 'Bank' : 'Crypto'}`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to submit withdrawal request");
      }

      toast.success(data?.message || "Withdrawal request submitted successfully!");
      setAmount("");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  const ACCENT = "#2563EB";
  const sharedUtils = {
    formatCurrency: (val: number) => `$${val.toFixed(2)}`
  };

  return (
    <ModalWrapper 
      title="Withdraw Funds" 
      onClose={onClose} 
      isDarkMode={isDarkMode}
      headerIcon={ArrowUpRight}
      panelClassName="md:!w-[500px] md:!max-w-[95vw]"
      bodyClassName="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
    >
<div className="space-y-2">
        
        {/* Balance Card - Royal Gold Glass */}
        <AnimatedSection delay={0.1}>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-[24px] bg-gradient-to-br from-[#1A3A8C] via-[#2155C4] to-[#1A3A8C] text-white shadow-2xl relative overflow-hidden group border border-white/10`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-xl border border-white/10">
                  <Wallet size={14} style={{ color: ACCENT }} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">Treasury Balance</span>
                </div>
                <div className="flex items-center gap-1 opacity-50">
                  <ShieldCheck size={14} />
                  <span className="text-[8px] font-black uppercase tracking-widest">Vault Encrypted</span>
                </div>
              </div>
              <div className="text-2xl font-black tracking-tighter mt-2" style={{ textShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                <NumberTicker value={availableBalance} />
              </div>
              <div className="mt-4 flex items-center justify-between bg-black/10 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                    <User size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] text-blue-200 block font-black uppercase tracking-widest opacity-60">Account ID</span>
                    <span className="text-xs font-black tracking-widest">{selectedAccount || '---'}</span>
                  </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_#60a5fa]" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
                    </div>
                    <span className="text-[8px] text-blue-200 block font-black uppercase tracking-widest opacity-40">Network Validated</span>
                </div>
              </div>
            </div>
            
            {/* Animated background elements */}
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, 180, 0],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
              style={{ background: ACCENT } as any}
            />
            <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-[#2563eb]/30 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </AnimatedSection>

        {/* Account Switcher */}
        {!currentAccount && (
          <AnimatedSection delay={0.2}>
            <div className="space-y-2 px-1">
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-400' : 'text-[#0B1F4B]/40'}`}>
                Source Ledger
              </label>
              <div className="relative group">
                <select
                  value={selectedAccount}
                  onChange={handleAccountChange}
                  className={`w-full p-4 pr-12 rounded-[20px] appearance-none outline-none transition-all border-2 font-black tracking-widest text-sm ${
                    isDarkMode 
                      ? 'bg-black/20 border-white/5 text-white focus:border-[#1A3A8C]/50'
                      : 'bg-white/40 border-[#1A3A8C]/5 text-[#0B1F4B] focus:border-[#1A3A8C]/30'
                  } backdrop-blur-xl shadow-inner`}
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_id} • {sharedUtils.formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-[#1A3A8C] transition-colors">
                  <ChevronRight size={20} className="rotate-90" />
                </div>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Precise Side-by-Side Method Selection */}
        <AnimatedSection delay={0.3}>
          <div className="space-y-3">
            <div className="flex justify-between items-end px-2">
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-400' : 'text-[#0B1F4B]/40'}`}>
                Select Destination
              </label>
              <motion.button 
                whileHover={{ scale: 1.05, color: GOLD }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/profile?activeTab=payment')}
                className="text-[#1A3A8C] text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:opacity-100 transition-colors"
              >
                Manage Vault <ExternalLink size={10} />
              </motion.button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { 
                  id: "bank", 
                  label: "Bank Transfer", 
                  icon: Building2, 
                  hasData: !!bankDetails?.account_number,
                  desc: bankDetails?.account_number ? `${bankDetails.bank_name} •••• ${bankDetails.account_number.slice(-4)}` : "Missing Setup"
                },
                { 
                  id: "crypto", 
                  label: "Crypto Wallet", 
                  icon: Coins, 
                  hasData: !!cryptoDetails?.wallet_address,
                  desc: cryptoDetails?.wallet_address ? `${cryptoDetails.currency || 'USDT'} •••• ${cryptoDetails.wallet_address.slice(0,6)}` : "Missing Setup"
                }
              ].map((method) => {
                const Icon = method.icon;
                const isActive = activeTab === method.id;
                
                return (
                  <motion.button
                    key={method.id}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(method.id)}
                    className={`relative p-4 rounded-[24px] border-2 transition-all duration-500 text-left overflow-hidden flex flex-col gap-3 backdrop-blur-xl ${
                      isActive 
                        ? isDarkMode ? "bg-white/5 border-[#1A3A8C] shadow-2xl shadow-[#1A3A8C]/20" : "bg-white/80 border-[#1A3A8C] shadow-2xl shadow-[#1A3A8C]/10"
                        : isDarkMode ? "bg-black/20 border-white/5 hover:border-white/10" : "bg-white/40 border-black/5 hover:border-black/10 shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-700 ${
                        isActive ? "text-white shadow-lg" : "bg-black/5 text-gray-400"
                      }`} style={isActive ? { background: `linear-gradient(135deg, ${GOLD} 0%, #8c6a1a 100%)` } : {}}>
                        <Icon size={22} strokeWidth={2.5} />
                      </div>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                          >
                            <div className="p-1 rounded-full bg-[#1A3A8C]/10 text-[#1A3A8C]">
                                <CheckCircle size={16} strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="min-w-0 w-full">
                      <h4 className={`text-[11px] font-black tracking-widest uppercase mb-1 ${isActive ? (isDarkMode ? 'text-white' : 'text-[#0B1F4B]') : 'text-gray-400'}`}>
                        {method.label}
                      </h4>
                      <p className={`text-[9px] font-bold tracking-tight truncate transition-colors ${
                        isActive ? isDarkMode ? 'text-blue-200' : 'text-[#1A3A8C]' : 'text-gray-400/40'
                      }`}>
                        {method.desc}
                      </p>
                    </div>

                    {/* Active Accent Glass */}
                    {isActive && (
                      <motion.div 
                        layoutId="method-accent"
                        className="absolute bottom-0 right-0 left-0 h-1" 
                        style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` } as React.CSSProperties}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Premium Vault Panel - Missing Data */}
            <AnimatePresence mode="wait">
              {((activeTab === "bank" && !bankDetails?.account_number) || 
                (activeTab === "crypto" && !cryptoDetails?.wallet_address)) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className={`p-4 rounded-[28px] relative overflow-hidden border-2 border-dashed backdrop-blur-2xl ${
                    isDarkMode ? 'bg-black/40 border-amber-500/20 shadow-inner' : 'bg-white/60 border-amber-500/30'
                  }`}
                >
                  <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                    <div className="relative">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 rotate-45">
                        <AlertCircle size={24} strokeWidth={2.5} className="-rotate-45" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-amber-500 shadow-md">
                            <Sparkles size={12} fill="currentColor" />
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h5 className={`text-sm font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-amber-500/80' : 'text-amber-600'}`}>
                        Setup Required
                      </h5>
                      <p className={`text-[11px] font-bold leading-relaxed max-w-[240px] uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Establish a secure connection to your {activeTab} destination in your vault profile.
                      </p>
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.05, y: -2, boxShadow: `0 10px 20px -5px rgba(185, 138, 31, 0.3)` }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push('/profile?activeTab=payment')}
                      className="px-6 py-3 rounded-xl text-white text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-3 group relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #8c6a1a 100%)` } as React.CSSProperties}
                    >
                      Connect {activeTab}
                      <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </div>

                  {/* Decorative Background for Vault */}
                  <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20" style={{ background: ACCENT }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AnimatedSection>

        {/* Input & Quick Actions */}
        <AnimatedSection delay={0.4}>
          <div className="space-y-2">
            <div className="flex justify-between items-end px-2">
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-[#0B1F4B]/40'}`}>
                Withdrawal Amount
              </label>
              {withdrawalInfo && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/10 border border-blue-700/20 backdrop-blur-md">
                    <Info size={10} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-200 uppercase tracking-tighter">
                    Min: {sharedUtils.formatCurrency(withdrawalInfo.minimum_withdrawal || 10)}
                    </span>
                </div>
              )}
            </div>
            
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1A3A8C] group-focus-within:scale-110 transition-transform duration-300">
                <DollarSign size={24} strokeWidth={3} />
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                className={`w-full pl-16 pr-8 py-4 rounded-[24px] text-2xl font-black outline-none transition-all border-2 backdrop-blur-xl ${
                  isDarkMode 
                    ? 'bg-black/20 border-white/5 text-white focus:border-[#1A3A8C] focus:ring-8 focus:ring-[#1A3A8C]/5'
                    : 'bg-white/40 border-[#1A3A8C]/5 text-[#0B1F4B] focus:border-[#1A3A8C] focus:ring-8 focus:ring-[#1A3A8C]/5'
                } tracking-tighter`}
                style={{ textShadow: isDarkMode ? "0 0 20px rgba(255,255,255,0.05)" : "none" }}
              />
            </div>
          </div>
        </AnimatedSection>


        {/* Security Transaction Footer */}
        <div className="flex gap-3 pt-3 sticky bottom-0 backdrop-blur-md pb-1">
          <motion.button
            whileHover={{ scale: 1.02, y: -2, boxShadow: `0 20px 40px -10px rgba(10, 44, 99, 0.5)` }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWithdraw}
            disabled={submitting || !selectedAccount || parseFloat(amount) <= 0}
            className={`flex-[2] py-3 rounded-[20px] font-black uppercase tracking-[0.25em] text-[11px] text-white shadow-2xl flex items-center justify-center gap-3 transition-all relative overflow-hidden ${
              (submitting || !selectedAccount || parseFloat(amount) <= 0)
                ? 'bg-gray-400 grayscale cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-[#0B1F4B] via-[#1A3A8C] to-[#1A3A8C]'
            }`}
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin text-white" />
            ) : (
              <>
                Confirm
                <ArrowRight size={18} strokeWidth={3} />
              </>
            )}
            
            {/* Glossy overlay effect */}
            {!submitting && (
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
              />
            )}
            
            {/* Gold bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 opacity-50" style={{ background: GOLD }} />
          </motion.button>
        </div>
      </div>
    </ModalWrapper>
  );
}
