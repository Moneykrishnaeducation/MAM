import React, { useState } from 'react';
import { X } from 'lucide-react';

const PALETTE = {
  textDark: '#1e293b',
  textSoft: '#64748b',
  gold: '#EAB308',
  royal: '#1e3a8a',
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowModal(false)} />
      <div className={`relative w-full max-w-2xl max-h-[90vh] md:max-h-none rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10 ${isDarkMode ? 'bg-[#111b3d]' : 'bg-white'} flex flex-col`}>
        <div className="h-1.5 md:h-2 bg-gradient-to-r from-blue-700 via-blue-500 to-yellow-500 shrink-0" />
        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <div>
              <h2 className={`text-xl md:text-3xl font-black ${isDarkMode ? 'text-white' : PALETTE.textDark}`}>Establish MAM</h2>
              <p className={`text-xs md:text-xs mt-1 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Create a new master trading node</p>
            </div>
            <button onClick={() => setShowModal(false)} className={`p-2 md:p-3 rounded-full transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-red-500' : 'bg-gray-100 text-gray-500 hover:text-white hover:bg-red-500'}`}>
              <X size={18} className="md:w-5 md:h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="sm:col-span-2 space-y-2">
              <label className={`text-xs md:text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? "text-gray-400" : PALETTE.textSoft}`}>Account Name</label>
              <input
                type="text" id="account_name" value={form.account_name} onChange={handleChange} required
                className={`w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border ${isDarkMode ? "bg-[#1e293b] border-white/10 text-white" : "bg-sky-50 border-[#1e3a8a]/10 text-[#1e3a8a]"} outline-none focus:ring-2 ring-[#1e3a8a]/20 transition-all font-bold text-xs md:text-sm`}
                placeholder="e.g., Global Alpha MAM"
              />
            </div>

            <div className="space-y-2">
              <label className={`text-xs md:text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? "text-gray-400" : PALETTE.textSoft}`}>Profit Share (%)</label>
              <input
                type="number" id="profit_percentage" value={form.profit_percentage} onChange={handleChange} required
                className={`w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border ${isDarkMode ? "bg-[#1e293b] border-white/10 text-white" : "bg-sky-50 border-[#1e3a8a]/10 text-[#1e3a8a]"} outline-none focus:ring-2 ring-[#1e3a8a]/20 transition-all font-bold text-xs md:text-sm`}
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <label className={`text-xs md:text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? "text-gray-400" : PALETTE.textSoft}`}>Risk Level</label>
              <select
                id="risk_level" value={form.risk_level} onChange={handleChange}
                className={`w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border ${isDarkMode ? "bg-[#1e293b] border-white/10 text-white" : "bg-sky-50 border-[#1e3a8a]/10 text-[#1e3a8a]"} outline-none focus:ring-2 ring-[#1e3a8a]/20 transition-all font-bold text-xs md:text-sm`}
              >
                {['Low', 'Medium', 'High'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-xs md:text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? "text-gray-400" : PALETTE.textSoft}`}>Leverage</label>
              <select
                id="leverage" value={form.leverage} onChange={handleChange}
                className={`w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border ${isDarkMode ? "bg-[#1e293b] border-white/10 text-white" : "bg-sky-50 border-[#1e3a8a]/10 text-[#1e3a8a]"} outline-none focus:ring-2 ring-[#1e3a8a]/20 transition-all font-bold text-xs md:text-sm`}
              >
                {['10x','50x', '100x', '200x', '500x'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-xs md:text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? "text-gray-400" : PALETTE.textSoft}`}>Payout Frequency</label>
              <select
                id="payout_frequency" value={form.payout_frequency} onChange={handleChange}
                className={`w-full px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border ${isDarkMode ? "bg-[#1e293b] border-white/10 text-white" : "bg-sky-50 border-[#1e3a8a]/10 text-[#1e3a8a]"} outline-none focus:ring-2 ring-[#1e3a8a]/20 transition-all font-bold text-xs md:text-sm`}
              >
                {['Weekly', 'Monthly', 'Quarterly', 'Half-Yearly'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 pt-2 md:pt-4">
              <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-sky-50 border border-[#1e3a8a]/10'} space-y-4`}>
                <div className="space-y-2">
                  <label className="flex justify-between items-center">
                    <span className={`text-[9px] md:text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : PALETTE.textSoft}`}>Master Password</span>
                    <button type="button" onClick={() => setShowMasterPwd(!showMasterPwd)} className="text-[#EAB308] text-[9px] md:text-xs font-black uppercase hover:underline">{showMasterPwd ? 'Hide' : 'Show'}</button>
                  </label>
                  <input type={showMasterPwd ? "text" : "password"} id="master_password" value={form.master_password} onChange={handleChange} className={`w-full px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border-none font-mono text-xs md:text-sm ${isDarkMode ? 'bg-[#0a1128] text-white' : 'bg-white text-[#1e3a8a]'} shadow-inner`} />
                </div>
                <div className="space-y-2">
                  <label className="flex justify-between items-center">
                    <span className={`text-[9px] md:text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : PALETTE.textSoft}`}>Investor Password</span>
                    <button type="button" onClick={() => setShowInvestorPwd(!showInvestorPwd)} className="text-[#EAB308] text-[9px] md:text-xs font-black uppercase hover:underline">{showInvestorPwd ? 'Hide' : 'Show'}</button>
                  </label>
                  <input type={showInvestorPwd ? "text" : "password"} id="investor_password" value={form.investor_password} onChange={handleChange} className={`w-full px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border-none font-mono text-xs md:text-sm ${isDarkMode ? 'bg-[#0a1128] text-white' : 'bg-white text-[#1e3a8a]'} shadow-inner`} />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row gap-3 md:gap-4 pt-4 md:pt-6">
              <button type="button" onClick={() => setShowModal(false)} className={`w-full sm:flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-[#1e3a8a]/10 text-[#1e3a8a] hover:bg-gray-50'}`}>Dismiss</button>
              <button type="submit" className="w-full sm:flex-[2] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm text-white shadow-xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-0.95 transition-all" style={{ backgroundColor: PALETTE.gold }}>Create Master Account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
