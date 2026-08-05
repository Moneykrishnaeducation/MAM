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
  Globe
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

  const handleManualDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepositAccount || !cheeseAmount || !proofFile) {
      sharedUtils.showToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/client/deposit", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number: selectedDepositAccount,
          amount: Number(cheeseAmount),
          payment_method: "Manual Deposit",
          proof_name: proofFile.name,
          notes: `Manual deposit submitted from deposit modal`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to submit deposit request");
      }

      sharedUtils.showToast(data?.message || "Manual deposit submitted successfully!", "success");
      setShowDepositModal(false);
      setCheeseAmount("");
      setProofFile(null);
    } catch (error: any) {
      sharedUtils.showToast(error?.message || "Failed to submit deposit request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {showDepositModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && setShowDepositModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full max-w-[580px] overflow-hidden rounded-[32px] border shadow-2xl ${isDarkMode ? 'bg-[#111b3d] border-white/10' : 'bg-[#F4F7FD] border-[#E8EEF9]'}`}
          >
            <AnimatePresence mode="wait">
              {isSubmitting && (
                <StatusOverlay key="status" type="pending" isDarkMode={isDarkMode} />
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
                  {selectedDepositAccount ? (
                    <div className="flex items-center gap-2 mt-1">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-[13px] font-bold" style={{ color: TEXT_SOFT }}>
                        Account ID: <span className="font-mono text-[#2155C4]">{selectedDepositAccount}</span>
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

            <div className="max-h-[60vh] overflow-y-auto p-8 pt-6">
              <AnimatePresence mode="wait">
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
                        <input type="file" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setProofFile(e.target.files[0]); }} accept="image/*,.pdf" />
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
