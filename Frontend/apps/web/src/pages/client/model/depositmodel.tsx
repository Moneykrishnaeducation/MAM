import React, { useState } from "react";
import { 
  CheckCircle, 
  X, 
  Info, 
  Wallet, 
  DollarSign, 
  UploadCloud, 
  Clock, 
  Send, 
  ShieldCheck,
  Globe,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Theme and utility mocks
const useTheme = () => ({ isDarkMode: true });

const sharedUtils = {
  showToast: (msg: string, type: string) => {
    if (type === "success") {
      toast.success(msg);
    } else if (type === "error") {
      toast.error(msg);
    } else {
      toast(msg);
    }
  }
};

const NAVY = "#0B1F4B";
const WHITE = "#FFFFFF";
const TEXT_SOFT = "#8A9BC0";

const StatusOverlay = ({ type, isDarkMode }: { type: string; isDarkMode: boolean }) => {
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
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 rounded-full blur-xl ${isPending ? 'bg-yellow-500/20' : 'bg-[#2155C4]/20'}`}
        />
        
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
  cheeseAmount = "",
  setCheeseAmount,
  selectedDepositAccount = "",
}: {
  showDepositModal: boolean;
  setShowDepositModal: (show: boolean) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  cheeseAmount?: string;
  setCheeseAmount: (amount: string) => void;
  currency?: string;
  setCurrency?: (currency: string) => void;
  convertedAmount?: any;
  selectedDepositAccount?: string;
  usdtAmount?: string;
  setUsdtAmount?: (amount: string) => void;
}) {
  const { isDarkMode } = useTheme();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showDepositToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleManualDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepositAccount || !cheeseAmount || !proofFile) {
      sharedUtils.showToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("account_number", selectedDepositAccount);
      formData.append("amount", cheeseAmount);
      formData.append("payment_method", "Manual Deposit");
      formData.append("notes", "Manual deposit submitted from deposit modal");
      formData.append("proof_file", proofFile);

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

      sharedUtils.showToast(data?.message || "Manual deposit submitted successfully!", "success");
      showDepositToast(data?.message || "Manual deposit submitted successfully!");
      setCheeseAmount("");
      setProofFile(null);
      setTimeout(() => {
        setShowDepositModal(false);
      }, 1500);
    } catch (error: any) {
      sharedUtils.showToast(error?.message || "Failed to submit deposit request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {showDepositModal && (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
          {showToast && (
            <div className={`fixed top-6 right-6 font-bold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 border z-[999999] animate-in fade-in slide-in-from-top-4 duration-300 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-[#e0b01d] shadow-slate-950/20'
                : 'bg-[#0b226a] border-[#2450b7] text-[#f0b91f] shadow-black/20'
            }`}>
              <Check size={18} />
              <span>{toastMessage}</span>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && setShowDepositModal(false)}
            className={`absolute inset-0 ${isDarkMode ? 'bg-black/60' : 'bg-slate-950/50'} backdrop-blur-xl`}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative flex w-full max-w-2xl max-h-[90vh] md:max-h-none flex-col overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] border shadow-2xl ${isDarkMode ? 'bg-[#111b3d] border-white/10' : 'bg-[#F4F7FD] border-[#E8EEF9]'}`}
          >
            <div className={`h-1.5 md:h-2 shrink-0 ${isDarkMode ? 'bg-gradient-to-r from-[#2155C4] via-[#4A7DE8] to-[#1A3A8C]' : 'bg-gradient-to-r from-[#2155C4] via-[#6fa0ff] to-[#1A3A8C]'}`} />

            <AnimatePresence mode="wait">
              {isSubmitting && (
                <StatusOverlay key="status" type="pending" isDarkMode={isDarkMode} />
              )}
            </AnimatePresence>

            <div className="absolute -top-20 right-[-2rem] h-44 w-44 rounded-full bg-[#d3a11a]/10 blur-3xl pointer-events-none" />

            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <div>
                  <h2 className="text-xl md:text-3xl font-black text-white">Deposit Funds</h2>
                  <p className="text-xs md:text-xs mt-1 font-bold text-blue-300">Upload proof to fund your live account manually</p>
                  {selectedDepositAccount ? (
                    <div className="flex items-center gap-2 mt-2">
                      <ShieldCheck className="h-4 w-4 text-green-400" />
                      <span className="text-[11px] md:text-xs font-bold text-blue-100/70">
                        Account ID: <span className="font-mono text-[#8bb4ff]">{selectedDepositAccount}</span>
                      </span>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="p-2 md:p-3 rounded-full transition-all bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 hover:scale-105"
                >
                  <X size={18} className="md:w-5 md:h-5" />
                </button>
              </div>

              <form onSubmit={handleManualDepositSubmit} className="grid grid-cols-1 gap-3 md:gap-4">
                <div className="sm:col-span-2 rounded-2xl md:rounded-3xl bg-white/[0.04] border border-white/10 p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A227]/15 text-[#C9A227]">
                      <Info className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-[9px] md:text-xs font-black uppercase tracking-widest text-blue-100/70">Instructions</h4>
                      <p className="mt-1 text-xs md:text-sm font-medium leading-relaxed text-blue-100/70">
                        For secure transfers, please contact our <span className="text-[#d3a11a] underline cursor-pointer">Live Support</span> to receive the official verified details.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Deposit Amount (USDT)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-[#d3a11a] opacity-75" />
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
                      className="w-full rounded-xl md:rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] py-2.5 md:py-3 pl-12 pr-4 text-xs md:text-sm font-bold text-white placeholder-blue-200/30 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all duration-200 hover:border-[#6b8de8] focus:border-[#d3a11a] focus:ring-2 focus:ring-[#d3a11a]/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Upload Transaction Proof</label>
                  <label className={`group relative flex cursor-pointer items-center gap-3 rounded-xl md:rounded-2xl border px-4 py-3 transition-all ${proofFile ? 'border-[#d3a11a]/40 bg-white/5' : 'border-white/10 bg-white/[0.03] hover:border-[#6b8de8]'}`}>
                    {proofFile ? (
                      <>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{proofFile.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80">Selected</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-[#8bb4ff] transition-colors group-hover:bg-white/10">
                          <UploadCloud className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Click to upload file</p>
                          <p className="text-[10px] font-black uppercase tracking-wider text-blue-100/50">JPG, PNG, PDF (Max 5MB)</p>
                        </div>
                      </>
                    )}
                    <input type="file" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setProofFile(e.target.files[0]); }} accept="image/*,.pdf" />
                  </label>
                </div>

                <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row gap-2 md:gap-3 pt-2 md:pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(false)}
                    className="w-full sm:flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all border bg-white/5 border-white/10 text-blue-100 hover:bg-white/10 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSubmitting}
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-[2] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm text-white shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70 bg-[#2155C4]"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Deposit'}
                    <Send className="h-4 w-4 inline ml-2" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
