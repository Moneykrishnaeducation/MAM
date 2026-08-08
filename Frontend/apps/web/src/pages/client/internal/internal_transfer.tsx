import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme as useNextTheme } from "next-themes";
import { 
  ArrowLeftRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  User, 
  Shield, 
  ArrowRight, 
  Wallet, 
  MessageSquare,
  Info,
  Search,
  CheckCircle2,
  ChevronDown
} from "lucide-react";

const useTheme = () => {
  const { theme } = useNextTheme();
  return { isDarkMode: theme === 'dark' };
};

const formatCurrency = (amount: any) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

const apiCall = async (endpoint: string, options: any = {}) => {
  const baseURL = window.location.origin;
  const url = `${baseURL}/${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
  }
  
  return response.json();
};

function AccountCard({ acc, selected, onClick }: any) {
  const { isDarkMode } = useTheme();
  const isMAM = acc.account_type?.toLowerCase().includes('mam');
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      className={`w-full text-left cursor-pointer rounded-2xl p-4 border transition-all duration-300 flex flex-col gap-2 ${
        selected
          ? (isDarkMode ? "border-yellow-500 bg-yellow-900/20 shadow-lg shadow-yellow-500/10" : "border-[#f0b91f] bg-white/10 shadow-lg")
          : (isDarkMode ? "border-white/5 bg-[#1e293b]/40 hover:border-yellow-500/40" : "border-white/10 bg-white/5 hover:border-white/30")
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-[#0b226a]'}`}>
             {isMAM ? <Shield className="w-3.5 h-3.5 text-yellow-500" /> : <User className="w-3.5 h-3.5 text-blue-500" />}
          </div>
          <span className="text-sm font-black text-white">{acc.account_id}</span>
        </div>
        <span
          className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
            isDarkMode ? "bg-white/5 text-gray-400" : "bg-[#0b226a] text-[#8fb8ff]"
          }`}
        >
          {acc.group_alias || (isMAM ? 'MAM' : 'Investor')}
        </span>
      </div>

      <div className="flex items-end justify-between mt-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[#8fb8ff]">Balance</span>
          <span className="text-sm font-black text-white">
            {formatCurrency(acc.balance)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function SelectedAccountCard({ acc, onClear, label }: any) {
  const { isDarkMode } = useTheme();
  const isMAM = acc.account_type?.toLowerCase().includes('mam');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative w-full rounded-[2.5rem] p-6 border-2 transition-all ${
        isDarkMode 
          ? "bg-slate-900/60 border-yellow-500/30" 
          : "bg-[linear-gradient(135deg,#0a2a80_0%,#092467_100%)] border-[#2154ca] shadow-[0_14px_30px_rgba(4,15,54,0.22)]"
      }`}
    >
      <div className="absolute top-5 right-5">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClear}
          type="button"
          className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          Change
        </motion.button>
      </div>

      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8fb8ff] mb-4">
        {label}
      </div>

      <div className="flex items-center gap-4">
        <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/10">
          {isMAM ? <Shield className="w-8 h-8 text-yellow-500" /> : <User className="w-8 h-8 text-blue-500" />}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-tight text-white">
              {acc.account_id}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/80">
              {acc.account_type}
            </span>
          </div>
          <div className="text-xs font-bold text-white/60 mt-0.5">
            {acc.account_name}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-end">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] font-black text-[#8fb8ff] mb-1">Available Funds</div>
          <div className="text-2xl font-black text-white">{formatCurrency(acc.balance)}</div>
        </div>
      </div>
    </motion.div>
  );
}

function GlassCard({ children, className = "", overflowHidden = true }: any) {
  const { isDarkMode } = useTheme();
  return (
    <div
      className={`rounded-[2.5rem] border transition-all duration-300 relative ${
        overflowHidden ? "overflow-hidden backdrop-blur-md" : ""
      } ${
        isDarkMode 
          ? "bg-slate-900/40 border-white/5 shadow-2xl" 
          : "bg-white/5 border-white/10 shadow-[0_23px_40px_rgba(8,29,82,0.15)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function ClientInternalTransfer() {
  const { isDarkMode } = useTheme();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form states
  const [fromAccount, setFromAccount] = useState<string>("");
  const [toAccount, setToAccount] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const [message, setMessage] = useState({ type: "", text: "" });
  const [toast, setToast] = useState<{ id: number; type: string; text: string } | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [guidelinesMounted, setGuidelinesMounted] = useState(true);

  const fromDropdownRef = useRef<HTMLDivElement>(null);
  const toDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    setGuidelinesMounted(showGuidelines);
  }, [showGuidelines]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target as Node)) {
        setShowFromDropdown(false);
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(event.target as Node)) {
        setShowToDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const id = Date.now();
    setToast({ id, type: message.type, text: message.text });
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const fetchAccounts = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiCall('api/client/internal-transfer');
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setFetchError(errMsg);
      setMessage({ type: "error", text: "Failed to load accounts. Please try again." });
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = (searchTerm: string, list: any[]) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((acc: any) => 
      acc.account_id.toString().includes(term) ||
      (acc.account_name && acc.account_name.toLowerCase().includes(term))
    );
  };

  const selectedFromAccount = accounts.find((acc: any) => acc.account_id === fromAccount);
  const selectedToAccount = accounts.find((acc: any) => acc.account_id === toAccount);

  const handleTransfer = async (e: any) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!fromAccount || !toAccount) {
      setMessage({ type: "error", text: "Please select both source and destination accounts." });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount greater than 0." });
      return;
    }

    if (selectedFromAccount && parseFloat(selectedFromAccount.balance) < parseFloat(amount)) {
      setMessage({ type: "error", text: "Insufficient funds in the source account." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiCall('api/client/internal-transfer/', {
        method: "POST",
        body: JSON.stringify({
          fromAccountId: fromAccount,
          toAccountId: toAccount,
          amount: parseFloat(amount),
          comment: comment
        })
      });

      if (res.status === "ok") {
        setMessage({ type: "success", text: res.message || "Internal transfer successful!" });
        setAmount("");
        setComment("");
        setFromAccount("");
        setToAccount("");
        
        // Refresh balances
        setTimeout(() => {
          fetchAccounts();
        }, 1000);
      } else {
        setMessage({ type: "error", text: res.message || "Transfer failed. Please try again." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const fromFilteredAccounts = filterAccounts(fromSearch, accounts);
  const toFilteredAccounts = filterAccounts(toSearch, accounts).filter((acc: any) => acc.account_id !== fromAccount);

  return (
    <div className="min-h-screen bg-[#0e2250] text-slate-100 p-4 md:p-8 relative overflow-hidden">
      <Head>
        <title>Internal Transfer | MAM</title>
        <meta name="description" content="Move funds instantly between your verified accounts" />
      </Head>

      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#1b3e85]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-yellow-500/5 blur-[120px] pointer-events-none" />

      {/* Floating Toast Notification */}
      <div className="fixed top-24 right-6 z-50 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <div className={`flex items-center gap-4 px-6 py-4 rounded-[1.75rem] border shadow-2xl backdrop-blur-md ${
                toast.type === 'success' 
                  ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/80 border-rose-500/30 text-rose-300'
              }`}>
                <div className="p-2 rounded-md bg-white/10">
                  {toast.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.3em]">
                    {toast.type === 'success' ? 'Success' : 'Error'}
                  </div>
                  <div className="text-sm font-bold">{toast.text}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-[1.5rem] shadow-2xl bg-yellow-500/10`}>
              <ArrowLeftRight className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
                Internal Transfer
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] mt-2 text-white/60">
                Move funds instantly between your verified accounts
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setShowGuidelines(prev => !prev)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl bg-slate-800 text-yellow-500 border border-white/5`}
          >
            <Info className="w-4 h-4" />
            {showGuidelines ? "Minimize Specs" : "Specs"}
          </motion.button>
        </div>

        {/* Guidelines */}
        <AnimatePresence>
          {guidelinesMounted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mb-12 overflow-hidden rounded-[2.5rem] border-2 bg-slate-900/60 border-white/5`}
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 rounded-2xl bg-yellow-500/10">
                    <Info className="w-6 h-6 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">
                    Transfer Guidelines
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {[
                    { label: 'Instant Settlement', text: 'Funds are moved immediately between internal accounts.' },
                    { label: 'Supported Accounts', text: 'Only your own Live MAM Manager and Investor accounts are supported.' },
                    { label: 'Excluded Accounts', text: 'Demo accounts and CENT accounts are excluded from internal transfers.' },
                    { label: 'Zero Fees', text: 'Internal transfers do not incur any transaction fees.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-5 items-start">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-yellow-500" />
                      <div>
                        <p className="font-black text-[10px] uppercase tracking-[0.2em] mb-1 text-yellow-500">
                          {item.label}
                        </p>
                        <p className="text-sm font-bold text-[#8fb8ff]">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        {loading && accounts.length === 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-6">
                <div className="animate-pulse">
                  <div className="h-6 w-3/4 bg-white/5 rounded mb-4" />
                  <div className="h-12 bg-white/5 rounded mb-6" />
                  <div className="h-24 bg-white/5 rounded" />
                </div>
              </GlassCard>
              <GlassCard className="p-6">
                <div className="animate-pulse">
                  <div className="h-6 w-3/4 bg-white/5 rounded mb-4" />
                  <div className="h-12 bg-white/5 rounded mb-6" />
                  <div className="h-24 bg-white/5 rounded" />
                </div>
              </GlassCard>
            </div>
          </div>
        ) : (
          <form onSubmit={handleTransfer} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* FROM ACCOUNT SELECTOR */}
              <GlassCard className="p-8" overflowHidden={false}>
                {selectedFromAccount ? (
                  <SelectedAccountCard 
                    acc={selectedFromAccount} 
                    label="Source Account (Transfer From)"
                    onClear={() => setFromAccount("")}
                  />
                ) : (
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white mb-6 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      From Account
                    </h3>

                    {/* Dropdown Input Search */}
                    <div className="relative mb-6" ref={fromDropdownRef}>
                      <div 
                        onClick={() => setShowFromDropdown(true)}
                        className="w-full flex items-center justify-between bg-slate-900/60 border border-white/5 rounded-2xl px-5 py-4 cursor-pointer hover:border-white/20 transition-all"
                      >
                        <span className="text-sm font-bold text-white/50">
                          {fromSearch ? fromSearch : "Select an account..."}
                        </span>
                        <ChevronDown className="w-5 h-5 text-white/40" />
                      </div>

                      {showFromDropdown && (
                        <div className="absolute z-50 top-full left-0 w-full mt-2 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-4 max-h-[300px] overflow-y-auto backdrop-blur-xl">
                          <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-white/5 rounded-xl border border-white/5">
                            <Search className="w-4 h-4 text-white/40" />
                            <input 
                              type="text"
                              value={fromSearch}
                              onChange={(e) => setFromSearch(e.target.value)}
                              placeholder="Search by ID or type..."
                              className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/30"
                            />
                          </div>
                          
                          <div className="flex flex-col mt-2">
                            {fromFilteredAccounts.length > 0 ? (
                              fromFilteredAccounts.map((acc: any) => (
                                <div
                                  key={acc.account_id}
                                  onClick={() => {
                                    setFromAccount(acc.account_id);
                                    setShowFromDropdown(false);
                                  }}
                                  className="px-4 py-3 cursor-pointer transition-colors border-b last:border-0 border-white/5 hover:bg-white/5 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-yellow-500 tracking-widest">{acc.account_id}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white/70">
                                      {acc.account_type}
                                    </span>
                                  </div>
                                  <span className="font-bold text-white">{formatCurrency(acc.balance)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-6 text-xs text-white/40">
                                No eligible accounts found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* TO ACCOUNT SELECTOR */}
              <GlassCard className="p-8" overflowHidden={false}>
                {selectedToAccount ? (
                  <SelectedAccountCard 
                    acc={selectedToAccount} 
                    label="Destination Account (Transfer To)"
                    onClear={() => setToAccount("")}
                  />
                ) : (
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white mb-6 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      To Account
                    </h3>

                    {/* Dropdown Input Search */}
                    <div className="relative mb-6" ref={toDropdownRef}>
                      <div 
                        onClick={() => setShowToDropdown(true)}
                        className="w-full flex items-center justify-between bg-slate-900/60 border border-white/5 rounded-2xl px-5 py-4 cursor-pointer hover:border-white/20 transition-all"
                      >
                        <span className="text-sm font-bold text-white/50">
                          {toSearch ? toSearch : "Select an account..."}
                        </span>
                        <ChevronDown className="w-5 h-5 text-white/40" />
                      </div>

                      {showToDropdown && (
                        <div className="absolute z-50 top-full left-0 w-full mt-2 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-4 max-h-[300px] overflow-y-auto backdrop-blur-xl">
                          <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-white/5 rounded-xl border border-white/5">
                            <Search className="w-4 h-4 text-white/40" />
                            <input 
                              type="text"
                              value={toSearch}
                              onChange={(e) => setToSearch(e.target.value)}
                              placeholder="Search by ID or type..."
                              className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/30"
                            />
                          </div>

                          <div className="flex flex-col mt-2">
                            {toFilteredAccounts.length > 0 ? (
                              toFilteredAccounts.map((acc: any) => (
                                <div
                                  key={acc.account_id}
                                  onClick={() => {
                                    setToAccount(acc.account_id);
                                    setShowToDropdown(false);
                                  }}
                                  className="px-4 py-3 cursor-pointer transition-colors border-b last:border-0 border-white/5 hover:bg-white/5 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-yellow-500 tracking-widest">{acc.account_id}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white/70">
                                      {acc.account_type}
                                    </span>
                                  </div>
                                  <span className="font-bold text-white">{formatCurrency(acc.balance)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-6 text-xs text-white/40">
                                No eligible accounts found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* AMOUNT AND COMMENT INPUTS */}
            <GlassCard className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Amount */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] uppercase tracking-[0.25em] font-black text-[#8fb8ff] flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="any"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={submitting}
                      className="w-full bg-slate-900/60 border border-white/5 focus:border-yellow-500/40 rounded-2xl px-5 py-4 text-white text-lg font-bold outline-none transition-all placeholder-white/20"
                    />
                  </div>
                </div>

                {/* Comment */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] uppercase tracking-[0.25em] font-black text-[#8fb8ff] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comment (Optional)
                  </label>
                  <input 
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Reference notes..."
                    disabled={submitting}
                    className="w-full bg-slate-900/60 border border-white/5 focus:border-yellow-500/40 rounded-2xl px-5 py-4 text-white text-sm outline-none transition-all placeholder-white/20"
                  />
                </div>
              </div>

              {/* Error display inside card */}
              {message.type === 'error' && (
                <div className="mt-8 flex items-center gap-3 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/20 text-rose-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                  <p className="text-xs font-bold leading-relaxed">{message.text}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-8 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting || !fromAccount || !toAccount || !amount}
                  className={`w-full md:w-auto px-10 py-5 rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl transition-all ${
                    submitting || !fromAccount || !toAccount || !amount
                      ? "bg-slate-800 text-white/30 cursor-not-allowed border border-white/5"
                      : "bg-[linear-gradient(135deg,#eab308_0%,#ca8a04_100%)] text-white shadow-yellow-500/10 border-2 border-[#fbbf24] hover:shadow-yellow-500/20 hover:scale-[1.02]"
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Initiate Transfer
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </GlassCard>
          </form>
        )}
      </div>
    </div>
  );
}
