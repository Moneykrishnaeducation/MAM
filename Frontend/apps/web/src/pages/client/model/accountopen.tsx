import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const PALETTE = {
  primary: '#2155C4',
  primaryHover: '#1A3A8C',
  royal: '#1e3a8a',
  textSoft: '#8A9BC0',
};

interface AccountOpenModalProps {
  showModal?: boolean;
  setShowModal?: (show: boolean) => void;
  isDarkMode?: boolean;
}

export default function AccountOpenModal({ 
  showModal = true, // Default to true for testing if rendered as a page
  setShowModal = () => {},
  isDarkMode = true 
}: AccountOpenModalProps) {
  const pageVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.14 } },
  };

  const panelVariants: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1] as const,
        when: 'beforeChildren',
        staggerChildren: 0.06,
      },
    },
    exit: { opacity: 0, y: 18, scale: 0.98, transition: { duration: 0.16 } },
  };

  const childVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
  };

  const fieldBaseClass =
    'w-full rounded-xl md:rounded-2xl border bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold text-white placeholder-blue-200/30 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all duration-200 hover:border-[#6b8de8] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.05)_100%)] focus:border-[#d3a11a] focus:ring-2 focus:ring-[#d3a11a]/20 disabled:cursor-not-allowed disabled:opacity-60';

  const passwordFieldClass =
    `${fieldBaseClass} font-mono tracking-[0.08em] bg-[#06142f]/80 border-white/10`;

  const selectFieldClass =
    `${fieldBaseClass} appearance-none border-white/10`;

  const initialForm = {
    account_name: '',
    profit_percentage: '',
    risk_level: 'Medium',
    leverage: '100x',
    payout_frequency: 'Monthly',
    master_password: '',
    investor_password: '',
  };

  const [form, setForm] = useState({
    ...initialForm,
  });

  const [showMasterPwd, setShowMasterPwd] = useState(false);
  const [showInvestorPwd, setShowInvestorPwd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/client/accounts/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'master',
          accountName: form.account_name.trim(),
          profitShare: Number(form.profit_percentage),
          riskLevel: form.risk_level,
          leverage: form.leverage,
          payoutFrequency: form.payout_frequency,
          masterPassword: form.master_password,
          investorPassword: form.investor_password,
        }),
      });

      const data = await response.json().catch(() => null);
      const message = data?.message || 'Failed to create master account';

      if (!response.ok || data?.status === 'error') {
        throw new Error(message);
      }

      toast.success(data?.message || 'Master account created successfully');
      setForm(initialForm);
      setShowModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create master account';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-[110] p-4 sm:p-6 md:p-8"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className={`absolute inset-0 ${isDarkMode ? 'bg-black/60' : 'bg-slate-950/50'} backdrop-blur-xl`}
          onClick={() => setShowModal(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
        <motion.div
          className="relative w-full max-w-2xl max-h-[90vh] md:max-h-none rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#1745b3] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] flex flex-col"
          variants={panelVariants}
        >
          <motion.div
            className="absolute -top-20 right-[-2rem] h-44 w-44 rounded-full bg-[#d3a11a]/10 blur-3xl pointer-events-none"
            animate={{ opacity: [0.3, 0.55, 0.3], scale: [1, 1.08, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="h-1.5 md:h-2 bg-gradient-to-r from-[#2155C4] via-[#4A7DE8] to-[#1A3A8C] shrink-0" />
          <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
            <motion.div className="flex justify-between items-center mb-6 md:mb-8" variants={childVariants}>
              <div>
                <h2 className="text-xl md:text-3xl font-black text-white">Establish MAM</h2>
                <p className="text-xs md:text-xs mt-1 font-bold text-blue-300">Create a new master trading node</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 md:p-3 rounded-full transition-all bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 hover:scale-105"
              >
                <X size={18} className="md:w-5 md:h-5" />
              </button>
            </motion.div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <motion.div className="sm:col-span-2 space-y-2" variants={childVariants}>
                <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Account Name</label>
                <input
                  type="text" id="account_name" value={form.account_name} onChange={handleChange} required
                  className={fieldBaseClass}
                  placeholder="e.g., Global Alpha MAM"
                  disabled={isSubmitting}
                />
              </motion.div>

              <motion.div className="space-y-1.5" variants={childVariants}>
                <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Profit Share (%)</label>
                <input
                  type="number" id="profit_percentage" value={form.profit_percentage} onChange={handleChange} required
                  className={fieldBaseClass}
                  placeholder="20"
                  min="0"
                  disabled={isSubmitting}
                />
              </motion.div>

              <motion.div className="space-y-1.5" variants={childVariants}>
                <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Risk Level</label>
                <select
                  id="risk_level" value={form.risk_level} onChange={handleChange}
                  className={selectFieldClass}
                  disabled={isSubmitting}
                >
                  {['Low', 'Medium', 'High'].map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </motion.div>

              <motion.div className="space-y-1.5" variants={childVariants}>
                <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Leverage</label>
                <select
                  id="leverage" value={form.leverage} onChange={handleChange}
                  className={selectFieldClass}
                  disabled={isSubmitting}
                >
                  {['10x','50x', '100x', '200x', '500x'].map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </motion.div>

              <motion.div className="space-y-1.5" variants={childVariants}>
                <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Payout Frequency</label>
                <select
                  id="payout_frequency" value={form.payout_frequency} onChange={handleChange}
                  className={selectFieldClass}
                  disabled={isSubmitting}
                >
                  {['Weekly', 'Monthly', 'Quarterly', 'Half-Yearly'].map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </motion.div>

              <motion.div className="sm:col-span-2 pt-1 md:pt-2" variants={childVariants}>
                <div className="p-4 md:p-5 rounded-2xl md:rounded-3xl bg-white/[0.04] border border-white/10 space-y-3">
                  <div className="space-y-1.5">
                    <label className="flex justify-between items-center">
                      <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-blue-100/70">Master Password</span>
                      <button type="button" onClick={() => setShowMasterPwd(!showMasterPwd)} className="text-blue-300 text-[9px] md:text-xs font-black uppercase hover:text-white hover:underline" disabled={isSubmitting}>{showMasterPwd ? 'Hide' : 'Show'}</button>
                    </label>
                    <input type={showMasterPwd ? "text" : "password"} id="master_password" value={form.master_password} onChange={handleChange} className={passwordFieldClass} required disabled={isSubmitting} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex justify-between items-center">
                      <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-blue-100/70">Investor Password</span>
                      <button type="button" onClick={() => setShowInvestorPwd(!showInvestorPwd)} className="text-blue-300 text-[9px] md:text-xs font-black uppercase hover:text-white hover:underline" disabled={isSubmitting}>{showInvestorPwd ? 'Hide' : 'Show'}</button>
                    </label>
                    <input type={showInvestorPwd ? "text" : "password"} id="investor_password" value={form.investor_password} onChange={handleChange} className={passwordFieldClass} required disabled={isSubmitting} />
                  </div>
                </div>
              </motion.div>

              {submitError && (
                <motion.div className="sm:col-span-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-200" variants={childVariants}>
                  {submitError}
                </motion.div>
              )}

              <motion.div className="sm:col-span-2 flex flex-col-reverse sm:flex-row gap-2 md:gap-3 pt-2 md:pt-4" variants={childVariants}>
                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all border bg-white/5 border-white/10 text-blue-100 hover:bg-white/10 hover:scale-[1.01]" disabled={isSubmitting}>Dismiss</button>
                <button type="submit" className="w-full sm:flex-[2] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm text-white shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70" style={{ backgroundColor: PALETTE.primary }} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Master Account'}
                </button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
