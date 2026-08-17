import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme as useNextTheme } from "next-themes";

const useTheme = () => {
  const { theme } = useNextTheme();
  return { isDarkMode: theme === 'dark' };
};
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
  ArrowDown,
  Info,
  Search,
  ArrowLeftToLine
} from "lucide-react";

// Currency formatter
const formatCurrency = (amount: any) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// API call utility (Admin version)
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

/* ── Glass Container ──────── */
const GlassCard = ({ children, className = "", noPadding = false, onClick }: any) => {
  const { isDarkMode } = useTheme();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-[2.5rem] border backdrop-blur-md transition-all duration-300 ${
        isDarkMode 
          ? 'bg-[#081d5f] border-[#2450b7] shadow-[0_30px_80px_rgba(4,15,54,0.3)]' 
          : 'bg-[#081d5f] border-[#2450b7] shadow-[0_30px_80px_rgba(4,15,54,0.3)]'
      } ${noPadding ? '' : 'p-6 md:p-8'} ${className}`}
    >
      {children}
    </motion.div>
  );
};

/* ── UI Icons ────────────────── */
const LayersIcon = ({ className, size = 24 }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
);

/* Small selectable account card used in lists */
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
          ? "border-[#d4af37] bg-[#d4af37]/10 shadow-lg shadow-[#d4af37]/10"
          : "border-[#2450b7] bg-[#0c1c59] hover:border-[#1745b3] hover:bg-[#123283]"
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#081d5f]">
             {isMAM ? <Shield className="w-3.5 h-3.5 text-[#d4af37]" /> : <User className="w-3.5 h-3.5 text-[#8fb8ff]" />}
          </div>
          <span className="text-sm font-black text-white">{acc.account_id}</span>
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#081d5f] text-[#8fb8ff] border border-[#2450b7]"
        >
          {acc.group_alias || (isMAM ? 'MAM' : 'Live')}
        </span>
      </div>

      <div className="flex items-end justify-between mt-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[#8fb8ff]">Balance</span>
          <span className="text-sm font-black text-white">
            {formatCurrency(acc.balance)}
          </span>
        </div>
        {(acc.user_name) && (
          <span className="text-[10px] font-bold text-[#8fb8ff] truncate max-w-[80px] text-right">
            {acc.user_name}
          </span>
        )}
      </div>
    </motion.button>
  );
}

/* Shown when an account is selected to "lock" it and clean up the UI */
function SelectedAccountCard({ acc, onClear, label }: any) {
  const { isDarkMode } = useTheme();
  const isMAM = acc.account_type?.toLowerCase().includes('mam');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full rounded-[2.5rem] p-6 border-2 transition-all bg-[#081d5f] border-[#d4af37]/30 shadow-[0_14px_30px_rgba(4,15,54,0.3)]"
    >
      <div className="absolute top-5 right-5">
        <motion.button
          whileHover={{ rotate: 180 }}
          onClick={onClear}
          type="button"
          aria-label="Clear selected account"
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all bg-[#0c1c59] text-[#8fb8ff] border border-[#2450b7] hover:bg-[#123283] hover:text-white"
        >
          <ArrowLeftToLine className="w-5 h-5" />
        </motion.button>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-[#d4af37]">
        {label}
      </p>

      <div className="flex items-center gap-5">
        <div className="p-4 rounded-2xl bg-[#040f33] shadow-inner border border-[#2450b7]">
          {isMAM ? (
            <Shield className="w-8 h-8 text-[#d4af37]" />
          ) : (
            <Wallet className="w-8 h-8 text-[#d4af37]" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tighter text-white">
              {acc.account_id}
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] uppercase tracking-widest">
              {acc.group_alias || (isMAM ? 'MAM MASTER' : 'LIVE ACCOUNT')}
            </span>
          </div>
          <p className="text-xs font-bold text-[#8fb8ff] mt-1">
            {acc.user_name || acc.user_email || "No Name"}
          </p>
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-[#2450b7] flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8fb8ff]">
          Available Funds
        </span>
        <span className="text-2xl font-black text-white">
          {formatCurrency(acc.balance)}
        </span>
      </div>
    </motion.div>
  );
}

export default function InternalTransfer() {
  const { isDarkMode } = useTheme();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [toast, setToast] = useState<any>(null);
  const [lastFetchAt, setLastFetchAt] = useState<any>(null);
  const [fetchError, setFetchError] = useState<any>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesMounted, setGuidelinesMounted] = useState(false);
  const guidelinesRef = useRef<any>(null);
  
  // Debounce refs
  const fromSearchTimeoutRef = useRef<any>(null);
  const toSearchTimeoutRef = useRef<any>(null);

  // Fetch non-demo accounts
  useEffect(() => {
    setMessage({ type: "", text: "" });
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (showGuidelines) {
      setGuidelinesMounted(true);
      setTimeout(() => {
        if (guidelinesRef.current) {
          guidelinesRef.current.style.maxHeight = "500px";
          guidelinesRef.current.style.opacity = "1";
        }
      }, 10);
    } else {
      if (guidelinesRef.current) {
        guidelinesRef.current.style.maxHeight = "0px";
        guidelinesRef.current.style.opacity = "0";
      }
      setTimeout(() => setGuidelinesMounted(false), 300);
    }
  }, [showGuidelines]);

  // Show toast notification when `message` changes
  useEffect(() => {
    if (!message || !message.text) return;
    const id = Date.now();
    setToast({ id, type: message.type, text: message.text });
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const fetchAccounts = async (searchTerm = '') => {
    setLoading(true);
    setFetchError(null);
    setLastFetchAt(new Date());
    try {
      const url = searchTerm 
        ? `api/admin/non-demo-accounts/?search=${encodeURIComponent(searchTerm)}`
        : 'api/admin/non-demo-accounts/';
      
      const data = await apiCall(url);
      const accountsList = Array.isArray(data) ? data : (data.accounts || []);
      
      // Filter for standard accounts only
      const filtered = accountsList.filter(
        (acc: any) =>
          !(
            acc.group_alias?.toUpperCase() === "CENT" ||
            acc.group_name?.toLowerCase().includes("cent")
          )
      );

      setAccounts(filtered);
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

  const filterAccounts = (searchTerm: any, accountList: any) => {
    if (!searchTerm) return accountList;
    const term = searchTerm.toLowerCase();
    return accountList.filter((acc: any) => 
      acc.account_id.toString().includes(term) ||
      (acc.user_email && acc.user_email.toLowerCase().includes(term)) ||
      (acc.user_name && acc.user_name.toLowerCase().includes(term))
    );
  };

  const selectedFromAccount = accounts.find((acc: any) => acc.account_id === fromAccount);
  const selectedToAccount = accounts.find((acc: any) => acc.account_id === toAccount);

  const handleTransfer = async (e: any) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    // Validation
    if (!fromAccount || !toAccount || !amount) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    if (fromAccount === toAccount) {
      setMessage({ type: "error", text: "Cannot transfer to the same account" });
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount" });
      return;
    }

    if (selectedFromAccount && transferAmount > selectedFromAccount.balance) {
      setMessage({ type: "error", text: "Insufficient balance in source account" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiCall('api/admin/internal-transfer/', {
        method: 'POST',
        body: JSON.stringify({
          fromAccountId: fromAccount,
          toAccountId: toAccount,
          amount: transferAmount,
          comment: comment || 'Internal Transfer'
        })
      });

      // Treat as success when backend explicitly marks success OR
      // when the message text contains 'success' (covers edge cases where status flag isn't set)
      const respMsg = response?.message || "";
      const respStatus = response?.status;
      const isRespSuccess = response?.success || respStatus === 'success' || (typeof respMsg === 'string' && /success/i.test(respMsg));

      if (isRespSuccess) {
        setMessage({ type: "success", text: respMsg || "Transfer successful! Funds have been moved instantly." });
        // Clear form
        setFromAccount("");
        setToAccount("");
        setFromSearch("");
        setToSearch("");
        setAmount("");
        setComment("");
        // Refresh accounts after 1 second
        setTimeout(() => {
          fetchAccounts();
        }, 1000);
      } else {
        const errorMsg = response.message || response.error || "Transfer failed";
        if (response.code === 'cent_conversion_blocked' || errorMsg.toLowerCase().includes('cent')) {
          setMessage({ type: "error", text: "CENT account transfers are not allowed. Please contact support." });
        } else {
          setMessage({ type: "error", text: errorMsg });
        }
      }
    } catch (error) {
      console.error('Transfer error:', error);
      const errMsg = error instanceof Error ? error.message : "Failed to process transfer. Please try again.";
      setMessage({ 
        type: "error", 
        text: errMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFromAccountSelect = (accountId: any) => {
    setFromAccount(accountId);
    setShowFromDropdown(false);
    setFromSearch("");
  };

  const handleToAccountSelect = (accountId: any) => {
    setToAccount(accountId);
    setShowToDropdown(false);
    setToSearch("");
  };

  const handleFromSearchChange = (value: any) => {
    setFromSearch(value);
    setShowFromDropdown(true);
    
    if (fromSearchTimeoutRef.current) clearTimeout(fromSearchTimeoutRef.current);
    fromSearchTimeoutRef.current = setTimeout(() => fetchAccounts(value), 300);
  };

  const handleToSearchChange = (value: any) => {
    setToSearch(value);
    setShowToDropdown(true);
    
    if (toSearchTimeoutRef.current) clearTimeout(toSearchTimeoutRef.current);
    toSearchTimeoutRef.current = setTimeout(() => fetchAccounts(value), 300);
  };
  
  const fromFilteredAccounts = filterAccounts(fromSearch, accounts);
  const toFilteredAccounts = filterAccounts(toSearch, accounts).filter((acc: any) => acc.account_id !== fromAccount);
  const isSuccess = message.type === 'success';

  return (
    <div className="min-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar p-4 md:p-8 transition-colors duration-300 relative bg-[#0c1c59] text-white">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-[#d4af37]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[340px] w-[340px] rounded-full bg-[#2450b7]/10 blur-[100px] pointer-events-none" />

      {/* Toast notifications (top-right) */}
      <div className="fixed top-35 right-6 z-50 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`max-w-xs w-[320px] pointer-events-auto rounded-lg p-4 shadow-xl border ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-red-600 text-white border-red-700'}`}
            >
              <div className="flex items-start gap-3">
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
            <div className="p-4 rounded-[1.5rem] shadow-2xl bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white">
              <ArrowLeftRight className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
                Internal Transfer
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] mt-2 text-[#8fb8ff]">
                Move funds instantly between verified trading accounts
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setShowGuidelines(prev => !prev)}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl bg-[#081d5f] text-[#8fb8ff] border border-[#2450b7] hover:border-[#1745b3] hover:text-white"
          >
            <Info className="w-4 h-4" />
            {showGuidelines ? "Minimize Specs" : "Network Specs"}
          </motion.button>
        </div>

        {/* Guidelines */}
        <AnimatePresence>
          {guidelinesMounted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-12 overflow-hidden rounded-[2.5rem] bg-[#081d5f] border border-[#2450b7] shadow-[0_30px_80px_rgba(4,15,54,0.3)]"
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 rounded-2xl bg-[#040f33] border border-[#2450b7]">
                    <Info className="w-6 h-6 text-[#d4af37]" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">
                    Transfer Guidelines
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {[
                    { label: 'Instant Settlement', text: 'Funds are moved immediately between internal accounts.' },
                    { label: 'Audit Trail', text: 'All internal movements are logged for compliance and security monitoring.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-5 items-start">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-[#d4af37]" />
                      <div>
                        <p className="font-black text-[10px] uppercase tracking-[0.2em] mb-1 text-[#d4af37]">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-white/6 rounded" />
                    <div className="h-20 bg-white/6 rounded" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="animate-pulse">
                  <div className="h-6 w-2/3 bg-white/5 rounded mb-4" />
                  <div className="h-12 bg-white/5 rounded mb-6" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-white/6 rounded" />
                    <div className="h-20 bg-white/6 rounded" />
                  </div>
                </div>
              </GlassCard>
            </div>

            
          </div>
        ) : (
          <form onSubmit={handleTransfer} className="space-y-10">
            {/* Account Selection Grid */}
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              {/* Central Connector - Desktop */}
              <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="p-5 rounded-full border-[8px] border-[#0c1c59] bg-[#0c1c59]">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="p-4 rounded-full shadow-[0_0_30px_rgba(212,175,55,0.3)] bg-[#081d5f] border border-[#2450b7]"
                  >
                    <ArrowLeftRight className="w-8 h-8 text-[#d4af37]" />
                  </motion.div>
                </div>
              </div>

              {/* Source Account */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8fb8ff]">
                    Source Terminal
                  </h2>
                  {fromAccount && (
                    <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg">
                      <CheckCircle className="w-3 h-3" /> Validated
                    </span>
                  )}
                </div>

                {selectedFromAccount ? (
                  <SelectedAccountCard
                    acc={selectedFromAccount}
                    label="Transmitting From"
                    onClear={() => {
                      setFromAccount("");
                      setFromSearch("");
                    }}
                  />
                ) : (
                  <GlassCard className="p-6">
                    <div className="relative mb-6">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8fb8ff]">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={fromSearch}
                        onChange={e => handleFromSearchChange(e.target.value)}
                        onFocus={() => setShowFromDropdown(true)}
                        onBlur={() => setTimeout(() => setShowFromDropdown(false), 200)}
                        placeholder="ACCOUNT ID, NAME OR EMAIL..."
                        className="w-full pl-14 pr-6 py-4 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all outline-none bg-[#0c1c59] border border-[#2450b7] text-white placeholder:text-[#8fb8ff]/50 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 shadow-inner"
                      />
                      {showFromDropdown && fromFilteredAccounts.length > 0 && (
                        <div className="absolute z-30 w-full mt-3 max-h-60 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl bg-[#081d5f]/95 border-[#2450b7]">
                          {fromFilteredAccounts.map((acc: any) => (
                            <div
                              key={acc.account_id}
                              onClick={() => handleFromAccountSelect(acc.account_id)}
                              className="px-6 py-4 cursor-pointer text-xs transition-colors border-b last:border-0 hover:bg-[#123283] border-[#2450b7] text-white"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-[#d4af37] tracking-widest">{acc.account_id}</span>
                                <span className="text-[10px] font-bold opacity-60">
                                  {acc.user_name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                      {fromFilteredAccounts.length > 0 ? (
                        fromFilteredAccounts.map((acc: any) => (
                          <AccountCard
                            key={acc.account_id}
                            acc={acc}
                            selected={fromAccount === acc.account_id}
                            onClick={() => handleFromAccountSelect(acc.account_id)}
                          />
                        ))
                      ) : (
                        <div className="py-12 text-center opacity-40">
                          <Search className="w-10 h-10 mx-auto mb-3 text-[#d4af37]" />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                            Zero Matches Found
                          </p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}
              </div>

              {/* Mobile Transition Icon */}
              <div className="lg:hidden flex justify-center py-4">
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-4 rounded-full bg-[#081d5f] border border-[#2450b7] text-[#d4af37] shadow-xl"
                >
                  <ArrowDown className="w-6 h-6" />
                </motion.div>
              </div>

              {/* Destination Account */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8fb8ff]">
                    Target Terminal
                  </h2>
                  {toAccount && (
                    <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 text-[#d4af37] border border-blue-500/20 shadow-lg">
                      <RefreshCw className="w-3 h-3" /> Targeted
                    </span>
                  )}
                </div>

                {selectedToAccount ? (
                  <SelectedAccountCard
                    acc={selectedToAccount}
                    label="Transmitting To"
                    onClear={() => {
                      setToAccount("");
                      setToSearch("");
                    }}
                  />
                ) : (
                  <GlassCard className="p-6">
                    <div className="relative mb-6">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8fb8ff]">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={toSearch}
                        onChange={e => handleToSearchChange(e.target.value)}
                        onFocus={() => setShowToDropdown(true)}
                        onBlur={() => setTimeout(() => setShowToDropdown(false), 200)}
                        placeholder="ACCOUNT ID, NAME OR EMAIL..."
                        className="w-full pl-14 pr-6 py-4 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all outline-none bg-[#0c1c59] border border-[#2450b7] text-white placeholder:text-[#8fb8ff]/50 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 shadow-inner"
                      />
                      {showToDropdown && toFilteredAccounts.length > 0 && (
                        <div className="absolute z-30 w-full mt-3 max-h-60 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl bg-[#081d5f]/95 border-[#2450b7]">
                          {toFilteredAccounts.map((acc: any) => (
                            <div
                              key={acc.account_id}
                              onClick={() => handleToAccountSelect(acc.account_id)}
                              className="px-6 py-4 cursor-pointer text-xs transition-colors border-b last:border-0 hover:bg-[#123283] border-[#2450b7] text-white"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-[#d4af37] tracking-widest">{acc.account_id}</span>
                                <span className="text-[10px] font-bold opacity-60">
                                  {acc.user_name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                      {toFilteredAccounts.length > 0 ? (
                        toFilteredAccounts.map((acc: any) => (
                          <AccountCard
                            key={acc.account_id}
                            acc={acc}
                            selected={toAccount === acc.account_id}
                            onClick={() => handleToAccountSelect(acc.account_id)}
                          />
                        ))
                      ) : (
                        <div className="py-12 text-center opacity-40">
                          <Search className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                            Zero Matches Found
                          </p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}
              </div>
            </div>

            {/* Propagation Parameters */}
            <GlassCard
              className={`p-10 transition-all ${
                fromAccount && toAccount ? "" : "opacity-40  pointer-events-none"
              }`}
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 rounded-2xl bg-[#040f33] border border-[#2450b7]">
                  <LayersIcon className="w-6 h-6 text-[#d4af37]" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                  Transfer Parameters
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8fb8ff] ml-1">
                    Transfer Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-[#d4af37]">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-14 pr-6 py-5 text-3xl font-black rounded-3xl transition-all outline-none bg-[#0c1c59] border border-[#2450b7] text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8fb8ff] ml-1">
                    Ledger Annotation
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#d4af37]" />
                    <input
                      type="text"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Enter Reference Sequence..."
                      className="w-full pl-16 pr-6 py-6 text-lg font-bold rounded-3xl transition-all outline-none bg-[#0c1c59] border border-[#2450b7] text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Execution Protocol */}
              <AnimatePresence>
                {fromAccount && toAccount && amount && parseFloat(amount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="mt-12 p-8 rounded-[2rem] border-2 border-dashed bg-[#040f33] border-[#2450b7]"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-[#d4af37]">
                          Validation Finalized
                        </p>
                        <p className="text-base font-bold text-white leading-relaxed">
                          Propagating <span className="text-[#d4af37] font-black mx-1">{formatCurrency(amount)}</span> 
                          from <span className="mx-1 px-3 py-1 rounded-lg bg-[#0c1c59] text-[#d4af37] font-mono border border-[#2450b7]">{fromAccount}</span> 
                          to <span className="mx-1 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono">{toAccount}</span>
                        </p>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(212, 175, 55, 0.4)" }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 ${
                          isSubmitting ? "opacity-60 cursor-not-allowed" : "bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-xl shadow-[#d4af37]/20"
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Transmitting...
                          </>
                        ) : (
                          <>
                            Transfer Fund
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status feed replaced by toast notifications (top-right) */}
            </GlassCard>
          </form>
        )}
      </div>
    </div>
  );
}
