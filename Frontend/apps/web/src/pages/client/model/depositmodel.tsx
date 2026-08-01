import React, { useState, useEffect } from "react";
import { 
  Copy, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Info, 
  Wallet, 
  CreditCard, 
  ArrowRight, 
  Banknote,
  Loader2,
  ChevronRight,
  Globe,
  DollarSign,
  UploadCloud,
  Clock,
  Send,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Using a mock hook since we don't have the real context available here.
// In a real environment, this should be imported correctly.
const useTheme = () => ({ isDarkMode: true });

const sharedUtils = {
  showToast: (msg, type) => console.log(`[${type}] ${msg}`)
};

const NAVY = "#0B1F4B";
const ROYAL = "#1A3A8C";
const BLUE_MID = "#2155C4";
const BLUE_LIGHT = "#4A7DE8";
const SKY = "#E8EEF9";
const SKY_SOFT = "#F4F7FD";
const GOLD = "#C9A227";
const GOLD_LIGHT = "#F0C84A";
const GOLD_PALE = "#FDF6E3";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#0B1F4B";
const TEXT_MID = "#4A5A7A";
const TEXT_SOFT = "#8A9BC0";
const BORDER_COLOR = "rgba(26,58,140,0.12)";

const StatusOverlay = ({ type, isDarkMode }) => {
  const isPending = type === 'pending';
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center p-6 text-center backdrop-blur-xl rounded-[24px]"
      style={{ backgroundColor: isDarkMode ? "rgba(17, 27, 61, 0.95)" : "rgba(232, 238, 249, 0.92)" }}
    >
      <div className="relative mb-8">
        {/* Outer Glow Ring */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 rounded-full blur-xl ${isPending ? 'bg-yellow-500/20' : 'bg-[#2155C4]/20'}`}
        />
        
        {/* Main Icon Circle */}
        <div className={`relative h-24 w-24 rounded-full flex items-center justify-center border-2 ${isPending ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-[#2155C4]/30 bg-[#2155C4]/10'}`}>
          <motion.div
            animate={isPending ? { rotate: [0, 10, -10, 0] } : { scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {isPending ? (
              <Clock className="h-12 w-12 text-yellow-500" />
            ) : (
              <Globe className="h-12 w-12 text-[#2155C4] animate-pulse" />
            )}
          </motion.div>

          {/* Spinning Outer Orbit */}
          <svg className="absolute inset-0 h-full w-full">
            <motion.circle
              cx="48" cy="48" r="45"
              fill="transparent"
              stroke={isPending ? "#eab308" : "#2155C4"}
              strokeWidth="2"
              strokeDasharray="20 120"
              strokeLinecap="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </svg>
        </div>
      </div>

      <h3 className="text-2xl font-bold mb-3" style={{ color: isDarkMode ? WHITE : NAVY }}>
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

export default function DepositModal({
  showDepositModal,
  setShowDepositModal,
  activeTab = "cheesepay",
  setActiveTab,
  cheeseAmount = "",
  setCheeseAmount,
  currency = "USD",
  setCurrency,
  convertedAmount,
  selectedDepositAccount = "MAM-84930",
  usdtAmount = "",
  setUsdtAmount,
}) {
  const { isDarkMode } = useTheme();
  const [proofFile, setProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usdInrRate, setUsdInrRate] = useState(83);
  const [loadingRate, setLoadingRate] = useState(false);
  const [isSubmittingUsdt, setIsSubmittingUsdt] = useState(false);
  const [isSubmittingCheesePay, setIsSubmittingCheesePay] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // UI Only: Hardcoding rate for demonstration purposes
    if (showDepositModal) {
      setLoadingRate(true);
      setTimeout(() => {
        setUsdInrRate(83.5); // Mock exchange rate
        setLoadingRate(false);
      }, 500);
    }
  }, [showDepositModal]);

  const handleManualDepositSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDepositAccount || !cheeseAmount || !proofFile) {
      sharedUtils.showToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    // UI Only: Simulate network delay for animations
    setTimeout(() => {
      setShowDepositModal(false);
      setCheeseAmount("");
      setProofFile(null);
      setIsSubmitting(false);
      sharedUtils.showToast("Manual deposit submitted successfully!", "success");
    }, 3000);
  };

  const handleCheesePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedDepositAccount || !cheeseAmount) return;
    
    setIsSubmittingCheesePay(true);
    setIsRedirecting(true);

    // UI Only: Simulate network delay for animations
    setTimeout(() => {
      setIsSubmittingCheesePay(false);
      setIsRedirecting(false);
      setShowDepositModal(false);
      sharedUtils.showToast("Redirecting to CheesePay...", "success");
    }, 2000);
  };

  const handleUsdtSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDepositAccount || !usdtAmount) return;

    setIsSubmittingUsdt(true);
    setIsRedirecting(true);
    
    // UI Only: Simulate network delay for animations
    setTimeout(() => {
      setShowDepositModal(false);
      setIsSubmittingUsdt(false);
      setIsRedirecting(false);
      sharedUtils.showToast("Redirecting for USDT Payment...", "success");
    }, 2000);
  };

  return (
    <AnimatePresence>
      {showDepositModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && !isRedirecting && setShowDepositModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full max-w-[580px] overflow-hidden rounded-[32px] border shadow-2xl ${isDarkMode ? 'bg-[#111b3d] border-white/10' : 'bg-[#F4F7FD] border-[#E8EEF9]'}`}
          >
            <AnimatePresence mode="wait">
              {(isRedirecting || isSubmitting || isSubmittingUsdt || isSubmittingCheesePay) && (
                <StatusOverlay key="status" type={isSubmitting ? 'pending' : 'redirect'} isDarkMode={isDarkMode} />
              )}
            </AnimatePresence>

            {/* Premium Header */}
            <div className="relative border-b p-6 sm:p-8" style={{ 
              borderColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(201, 162, 39, 0.2)",
              background: isDarkMode 
                ? "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)" 
                : "linear-gradient(135deg, rgba(232,238,249,0.9) 0%, rgba(244,247,253,0.6) 100%)"
            }}>
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] shadow-lg bg-[#C9A227] text-white">
                  <Wallet className="h-7 w-7" />
                </div>
                <div className="pt-1">
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: isDarkMode ? WHITE : NAVY }}>
                    Deposit Funds
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span className="text-[13px] font-bold" style={{ color: TEXT_SOFT }}>
                      Account: <span className="font-mono text-[#2155C4]">{selectedDepositAccount}</span>
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

            {/* Navigation Tabs */}
            <div className="px-6 sm:px-8 pt-8">
              <div className="flex gap-1.5 sm:gap-2 rounded-2xl p-1.5" style={{ backgroundColor: isDarkMode ? "#0b183f" : "#E8EEF9" }}>
                {[
                  { id: "cheesepay", label: "Cheese Pay", icon: CreditCard },
                  { id: "manual", label: "Manual", icon: Banknote },
                  { id: "usdt", label: "USDT", icon: DollarSign }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 rounded-xl py-2.5 sm:py-3.5 text-[10px] sm:text-[12px] font-black uppercase tracking-wider transition-all duration-500 relative overflow-hidden group ${
                      activeTab === tab.id 
                        ? (isDarkMode ? "bg-[#2155C4] text-white shadow-[0_8px_20px_-4px_rgba(33,85,196,0.4)]" : "bg-[#2155C4] text-white shadow-[0_4px_12px_-2px_rgba(33,85,196,0.2)]")
                        : (isDarkMode ? "text-gray-500 hover:text-white" : "text-[#1A3A8C]/60 hover:bg-white/40 hover:text-[#2155C4]")
                    }`}
                  >
                    <tab.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:scale-110 ${activeTab === tab.id ? "opacity-100" : "opacity-60"}`} />
                    <span className="leading-none text-center">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-8 pt-6">
              <AnimatePresence mode="wait">
                
                {/* CHEESE PAY TAB */}
                {activeTab === "cheesepay" && (
                  <motion.form 
                    key="cheesepay"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onSubmit={handleCheesePaySubmit} 
                    className="space-y-6"
                  >
                    <div className="rounded-3xl border border-[#C9A227]/20 bg-[#E8EEF9]/50 p-6 border-dashed">
                      <div className="flex items-center gap-3 mb-3 text-[#C9A227]">
                        <CreditCard className="h-5 w-5" />
                        <span className="font-black text-sm uppercase tracking-wider">Secure Checkout</span>
                      </div>
                      <p className="text-[13px] font-bold leading-relaxed" style={{ color: isDarkMode ? '#cbd5e1' : NAVY }}>
                        Use Cheese Pay for instant, secure deposits directly into your account using various local payment methods.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="group">
                        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: TEXT_SOFT }}>Deposit Amount (USD)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <DollarSign className="h-5 w-5 text-[#2155C4]" />
                          </div>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={cheeseAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) setCheeseAmount(val);
                            }}
                            required
                            className={`w-full rounded-2xl border bg-transparent py-4 pl-12 pr-6 text-xl font-black transition-all focus:ring-2 focus:ring-[#2155C4]/20 ${isDarkMode ? "border-white/10 text-white focus:border-[#2155C4]" : "border-[rgba(26,58,140,0.12)] text-[#0B1F4B] focus:border-[#2155C4]"}`}
                          />
                        </div>
                      </div>

                      {cheeseAmount && usdInrRate && (
                        <div className="rounded-2xl p-4 border border-dashed flex items-center justify-between" style={{ borderColor: isDarkMode ? "#1e2d4d" : "rgba(26,58,140,0.12)", backgroundColor: isDarkMode ? "#0b183f" : "#E8EEF9" }}>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5 opacity-50" style={{ color: TEXT_SOFT }}>Live Conversion</span>
                            <span className="text-xl font-black text-[#2155C4]">
                              {currency === "USD" ? `₹ ${(parseFloat(cheeseAmount) * usdInrRate).toFixed(2)}` : `$ ${(parseFloat(cheeseAmount) / usdInrRate).toFixed(2)}`}
                            </span>
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-[#2155C4]/10 flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 text-[#2155C4] animate-spin-slow" />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingCheesePay}
                      className="w-full rounded-2xl bg-[#2155C4] py-5 text-[15px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-[#2155C4]/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      Pay Now <ChevronRight className="h-5 w-5 inline ml-1" />
                    </button>
                  </motion.form>
                )}

                {/* MANUAL TAB */}
                {activeTab === "manual" && (
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
                        For secure transfers, please contact our <span className="text-[#C9A227] underline cursor-pointer">Live Support</span> to receive our official verified details.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="group">
                        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: TEXT_SOFT }}>Deposit Amount (USDT)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <DollarSign className="h-5 w-5 text-green-500 opacity-60" />
                          </div>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={cheeseAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) setCheeseAmount(val);
                            }}
                            required
                            className={`w-full rounded-2xl border bg-transparent py-4 pl-12 pr-6 text-xl font-black transition-all focus:ring-2 focus:ring-[#C9A227]/20 ${isDarkMode ? "border-white/10 text-white focus:border-[#C9A227]" : "border-[rgba(26,58,140,0.12)] text-[#0B1F4B] focus:border-[#C9A227]"}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: TEXT_SOFT }}>
                          Upload Transaction Proof
                        </label>
                        <label className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:bg-green-500/5 ${proofFile ? "border-green-500 bg-green-500/5" : "border-[rgba(26,58,140,0.12)] hover:border-green-500"}`}>
                          {proofFile ? (
                            <>
                              <div className="h-8 w-8 shrink-0 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-500/20">
                                <CheckCircle className="h-4 w-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-green-600 truncate">{proofFile.name}</p>
                                <p className="text-[10px] uppercase font-bold text-green-500">Selected</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-8 w-8 shrink-0 rounded-full bg-[#E8EEF9] flex items-center justify-center group-hover:bg-green-500/10 transition-colors">
                                <UploadCloud className="h-4 w-4 text-green-500" />
                              </div>
                              <div>
                                <p className="text-sm font-bold" style={{ color: isDarkMode ? '#fff' : NAVY }}>Click to upload file</p>
                                <p className="text-[10px] uppercase font-bold" style={{ color: TEXT_SOFT }}>JPG, PNG, PDF (Max 5MB)</p>
                              </div>
                            </>
                          )}
                          <input type="file" className="hidden" onChange={(e) => setProofFile(e.target.files[0])} accept="image/*,.pdf" />
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-2xl bg-green-600 py-5 text-[15px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-green-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-6"
                    >
                      Submit Deposit <Send className="h-5 w-5 inline ml-2" />
                    </button>
                  </motion.form>
                )}

                {/* USDT TAB */}
                {activeTab === "usdt" && (
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
                        Enter the amount you wish to fund. You will be securely redirected to our payment gateway to complete the USDT TRC20 transfer.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-widest" style={{ color: TEXT_SOFT }}>Deposit Amount (USDT)</label>
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
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setUsdtAmount(val);
                          }}
                          required
                          className={`block w-full rounded-2xl border bg-transparent py-4 pl-12 pr-6 text-xl font-black focus:ring-4 focus:ring-[#C9A227]/10 ${isDarkMode ? "border-white/10 text-white focus:border-[#2155C4]" : "border-[rgba(26,58,140,0.12)] text-[#0B1F4B] focus:border-[#C9A227]"}`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingUsdt || !usdtAmount}
                      className="w-full group relative overflow-hidden rounded-2xl bg-[#2155C4] py-5 font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-[#2155C4]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        Pay Now <ArrowRight className="h-4 w-4" />
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </button>

                  </motion.form>
                )}
              </AnimatePresence>
            </div>
            
            <div className="border-t p-6 text-center" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#E8EEF9" }}>
              <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: TEXT_SOFT }}>
                <ShieldCheck className="h-3 w-3 text-[#C9A227]" />Protected
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
