import React, { useState } from 'react';
import { X } from 'lucide-react';

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
  const [form, setForm] = useState({
    account_name: '',
    profit_percentage: '',
    risk_level: 'Medium',
    leverage: '100x',
    payout_frequency: 'Monthly',
    master_password: '',
    investor_password: '',
  });

  const [showMasterPwd, setShowMasterPwd] = useState(false);
  const [showInvestorPwd, setShowInvestorPwd] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', form);
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[110] p-4 sm:p-6 md:p-8">
      <div
        className={`absolute inset-0 ${isDarkMode ? 'bg-black/60' : 'bg-slate-950/50'} backdrop-blur-xl`}
        onClick={() => setShowModal(false)}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] md:max-h-none rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10 bg-[#111b3d] flex flex-col">
        <div className="h-1.5 md:h-2 bg-gradient-to-r from-[#2155C4] via-[#4A7DE8] to-[#1A3A8C] shrink-0" />
        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white">Establish MAM</h2>
              <p className="text-xs md:text-xs mt-1 font-bold text-blue-300">Create a new master trading node</p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="p-2 md:p-3 rounded-full transition-all bg-white/5 text-slate-400 hover:text-white hover:bg-blue-600/80"
            >
              <X size={18} className="md:w-5 md:h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Account Name</label>
              <input
                type="text" id="account_name" value={form.account_name} onChange={handleChange} required
                className="w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border bg-[#0b183f] border-blue-900/40 text-white placeholder-blue-300/40 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-xs md:text-sm"
                placeholder="e.g., Global Alpha MAM"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Profit Share (%)</label>
              <input
                type="number" id="profit_percentage" value={form.profit_percentage} onChange={handleChange} required
                className="w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border bg-[#0b183f] border-blue-900/40 text-white placeholder-blue-300/40 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-xs md:text-sm"
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Risk Level</label>
              <select
                id="risk_level" value={form.risk_level} onChange={handleChange}
                className="w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border bg-[#0b183f] border-blue-900/40 text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-xs md:text-sm"
              >
                {['Low', 'Medium', 'High'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Leverage</label>
              <select
                id="leverage" value={form.leverage} onChange={handleChange}
                className="w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border bg-[#0b183f] border-blue-900/40 text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-xs md:text-sm"
              >
                {['10x','50x', '100x', '200x', '500x'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-xs font-black uppercase tracking-widest ml-1 text-blue-100/70">Payout Frequency</label>
              <select
                id="payout_frequency" value={form.payout_frequency} onChange={handleChange}
                className="w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border bg-[#0b183f] border-blue-900/40 text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-xs md:text-sm"
              >
                {['Weekly', 'Monthly', 'Quarterly', 'Half-Yearly'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 pt-2 md:pt-4">
              <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-[#0b183f] border border-blue-900/40 space-y-4">
                <div className="space-y-2">
                  <label className="flex justify-between items-center">
                    <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-blue-100/70">Master Password</span>
                    <button type="button" onClick={() => setShowMasterPwd(!showMasterPwd)} className="text-blue-300 text-[9px] md:text-xs font-black uppercase hover:text-white hover:underline">{showMasterPwd ? 'Hide' : 'Show'}</button>
                  </label>
                  <input type={showMasterPwd ? "text" : "password"} id="master_password" value={form.master_password} onChange={handleChange} className="w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border bg-[#06142f] border-blue-900/40 text-white placeholder-blue-300/40 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-xs md:text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="flex justify-between items-center">
                    <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-blue-100/70">Investor Password</span>
                    <button type="button" onClick={() => setShowInvestorPwd(!showInvestorPwd)} className="text-blue-300 text-[9px] md:text-xs font-black uppercase hover:text-white hover:underline">{showInvestorPwd ? 'Hide' : 'Show'}</button>
                  </label>
                  <input type={showInvestorPwd ? "text" : "password"} id="investor_password" value={form.investor_password} onChange={handleChange} className="w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border bg-[#06142f] border-blue-900/40 text-white placeholder-blue-300/40 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-xs md:text-sm" />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row gap-3 md:gap-4 pt-4 md:pt-6">
              <button type="button" onClick={() => setShowModal(false)} className="w-full sm:flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all border bg-[#0b183f] border-blue-900/40 text-blue-100 hover:bg-[#0f1b42]">Dismiss</button>
              <button type="submit" className="w-full sm:flex-[2] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm text-white shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all" style={{ backgroundColor: PALETTE.primary }}>Create Master Account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
