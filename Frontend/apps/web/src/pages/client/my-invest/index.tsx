import React, { useState } from 'react';
import Head from 'next/head';
import { Wallet, TrendingUp, ShieldCheck } from 'lucide-react';

const Modal: React.FC<{ title: string; onClose: () => void; children?: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
    <div className="relative z-[100000] w-full max-w-[1000px] bg-[#0a1435] rounded-xl border border-blue-900/30 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
      <div className="flex items-center justify-between px-6 py-5 border-b border-blue-900/30">
        <h3 className="text-[17px] font-extrabold text-white tracking-wide">{title}</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="p-6 md:p-8 overflow-y-auto">{children}</div>
    </div>
  </div>
);

export default function ClientMyInvestPage() {
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedInvModal, setSelectedInvModal] = useState<any>(null);

  const openDetailsModal = (inv: any) => {
    setSelectedInvModal(inv);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedInvModal(null);
    setShowDetailsModal(false);
  };

  return (
    <>
      <Head>
        <title>My Investments | Client Portal</title>
      </Head>
        <div className="p-6 md:p-8 space-y-6 relative h-full min-h-screen">
          
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Invested */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-blue-600/80 transition-all duration-500">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                  <Wallet size={22} strokeWidth={2.5} />
                </div>
                <div className="text-emerald-400 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider">Active</div>
              </div>
              <div className="relative z-10">
                <div className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5">Total Invested</div>
                <div className="text-3xl font-black text-white flex items-baseline gap-1.5">
                  $0.00 <span className="text-sm font-bold text-blue-500">USD</span>
                </div>
              </div>
            </div>

            {/* Total Profit */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/30 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-emerald-700/60 transition-all duration-500">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                  <TrendingUp size={22} strokeWidth={2.5} />
                </div>
                <div className="text-emerald-400 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider">+0.00%</div>
              </div>
              <div className="relative z-10">
                <div className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5">Total Profit</div>
                <div className="text-3xl font-black text-white flex items-baseline gap-1.5">
                  $0.00 <span className="text-sm font-bold text-emerald-500">USD</span>
                </div>
              </div>
            </div>

            {/* Active Nodes */}
            <div className="relative overflow-hidden bg-gradient-to-br from-yellow-900/30 via-[#0b183f] to-[#0b183f] border border-blue-800/60 rounded-3xl p-6 shadow-2xl group hover:border-yellow-700/60 transition-all duration-500">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-yellow-500/10 blur-3xl group-hover:bg-yellow-500/20 transition-all duration-500"></div>
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.15)] group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all">
                  <ShieldCheck size={22} strokeWidth={2.5} />
                </div>
                <div className="text-blue-300 text-[11px] font-bold px-3 py-1 bg-blue-900/50 rounded-full border border-blue-700/50 uppercase tracking-wider">Secured</div>
              </div>
              <div className="relative z-10">
                <div className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-1.5">Active Nodes</div>
                <div className="text-3xl font-black text-white">
                  0
                </div>
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="bg-[#0a1435] border border-blue-900/30 rounded-3xl overflow-hidden shadow-2xl mt-8">
            {/* Header */}
            <div className="p-6 border-b border-blue-900/30 flex items-center gap-3 bg-[#0a1435]">
              <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-wide">My Investments</h2>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#0f1d4a]">
                  <tr>
                    {[
                      'ACCOUNT NAME',
                      'LOGIN ID',
                      'BALANCE',
                      'EQUITY',
                      'PROFIT SHARE',
                      'TOTAL PROFIT',
                      'STATUS',
                      'ACTIONS',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-5 text-[11px] font-extrabold text-blue-200 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/30">
                  {[
                    {
                      id: '1',
                      name: 'Devo-Testmam - Investment',
                      loginId: '2141717315',
                      balance: '$0.00',
                      equity: '$0.00',
                      profitShare: '40%',
                      totalProfit: '$-2.28',
                      status: 'ENABLED',
                    },
                    {
                      id: '2',
                      name: 'Devo-Testmam - Investment #2',
                      loginId: '2141718765',
                      balance: '$171.12',
                      equity: '$171.12',
                      profitShare: '40%',
                      totalProfit: '$-128.88',
                      status: 'ENABLED',
                    }
                  ].map((inv) => (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-[#11255e] bg-[#0a1435]"
                    >
                      {/* Account Name */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-900 font-extrabold text-sm shadow-sm shrink-0">
                            {inv.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-bold text-white text-[14px]">
                            {inv.name}
                          </div>
                        </div>
                      </td>

                      {/* Login ID */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-white bg-[#101f4c] px-3 py-1.5 rounded-lg border border-blue-800/50">
                          {inv.loginId}
                        </span>
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-white font-bold text-[14px]">
                          {inv.balance}
                        </span>
                      </td>

                      {/* Equity */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-white font-bold text-[14px]">
                          {inv.equity}
                        </span>
                      </td>

                      {/* Profit Share */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-white font-bold text-[14px]">
                          {inv.profitShare}
                        </span>
                      </td>

                      {/* Total Profit */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-white font-bold text-[14px]">
                          {inv.totalProfit}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#003822] text-[#00e676] tracking-wide uppercase border border-[#005e3a]">
                          {inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openDetailsModal(inv)} className="px-4 py-2 rounded-xl font-bold text-xs bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all">
                            Details
                          </button>
                          <button className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-[#fcd34d] to-[#d97706] text-amber-950 text-xs font-bold transition hover:opacity-90 shadow-lg shadow-amber-500/20">
                            Deposit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-6 py-5 border-t border-blue-900/30 bg-[#0a1435]">
              <div className="text-xs font-bold text-blue-200 uppercase tracking-widest">
                SHOWING 1 TO 2 OF 2
              </div>

              <div className="flex items-center gap-4">
                <button className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-900/60 text-blue-300 hover:bg-[#11255e] hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <span className="text-xs font-bold text-white">Page 1</span>
                <button className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-900/60 text-blue-300 hover:bg-[#11255e] hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            {/* Details Modal (opened from table) */}
            {showDetailsModal && selectedInvModal && (
              <Modal title={`${selectedInvModal.loginId} • ${selectedInvModal.name}`} onClose={closeDetailsModal}>
                <div className="space-y-8">
                  {/* Top section: Balance and Stats (No separate container background, just flex layout) */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
                    {/* Left: Balance */}
                    <div className="flex-1">
                      <div className="text-[11px] font-extrabold text-blue-200 uppercase tracking-widest">Available Balance</div>
                      <div className="text-[40px] font-black text-white mt-1 leading-none tracking-tight">
                        {selectedInvModal.balance || '$0.00'} <span className="text-lg font-extrabold text-white/70 ml-2">USD</span>
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <button className="px-5 py-2.5 rounded-lg font-bold bg-[#d9aa2b] hover:bg-[#eabb3a] text-amber-950 transition-colors shadow-lg shadow-amber-500/20 text-sm">
                          Quick Deposit
                        </button>
                        <button className="px-5 py-2.5 rounded-lg border border-blue-700/50 hover:bg-blue-800/30 text-white font-bold transition-colors text-sm">
                          Pause
                        </button>
                      </div>
                    </div>

                    {/* Right: Stats Grid */}
                    <div className="flex-none w-full md:w-auto">
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div className="text-sm text-white/60">Total Profit</div>
                        <div className="text-[15px] font-extrabold text-white text-right">{selectedInvModal.totalProfit || '$-2.28'}</div>
                        
                        <div className="text-sm text-white/60">Profit Share</div>
                        <div className="text-[15px] font-extrabold text-white text-right">{selectedInvModal.profitShare || '40%'}</div>
                        
                        <div className="text-sm text-white/60">Risk Level</div>
                        <div className="text-[15px] font-extrabold text-white text-right">{selectedInvModal.riskLevel || 'medium'}</div>
                        
                        <div className="text-sm text-white/60">Leverage</div>
                        <div className="text-[15px] font-extrabold text-white text-right">{selectedInvModal.leverage || '500'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Info cards row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Account Configuration */}
                    <div className="p-6 rounded-[20px] bg-[#0b1739] border border-blue-900/40">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">Account Configuration</h4>
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center"><span className="text-white/60">Account ID</span><span className="font-extrabold text-white">{selectedInvModal.loginId}</span></div>
                        <div className="flex justify-between items-center"><span className="text-white/60">Master ID</span><span className="font-extrabold text-white">2141715173</span></div>
                        <div className="flex justify-between items-center"><span className="text-white/60">Account Name</span><span className="font-extrabold text-white text-right max-w-[120px] truncate">{selectedInvModal.name}</span></div>
                        <div className="flex justify-between items-center"><span className="text-white/60">Status</span><span className="font-extrabold text-white">{selectedInvModal.status || 'ENABLED'}</span></div>
                      </div>
                    </div>

                    {/* Account Security */}
                    <div className="p-6 rounded-[20px] bg-[#0b1739] border border-blue-900/40 flex flex-col items-center text-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#122359] flex items-center justify-center mb-4">
                        {/* Custom Lock SVG matching image style */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d9aa2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">Account Security</h4>
                      <div className="w-full space-y-3 mt-1">
                        <button className="w-full py-3 rounded-xl bg-[#2962ff] hover:bg-[#1e4ed8] text-white font-extrabold transition-colors text-sm">Password Settings</button>
                        <button className="w-full py-3 rounded-xl bg-[#2962ff] hover:bg-[#1e4ed8] text-white font-extrabold transition-colors text-sm">Edit Coefficient</button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="p-6 rounded-[20px] bg-[#0b1739] border border-blue-900/40">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-5">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-3 h-[calc(100%-40px)]">
                        <button className="rounded-xl bg-[#122359] hover:bg-[#1a3275] text-white font-bold transition-colors text-[13px] flex items-center justify-center p-3 text-center leading-tight">Investor<br/>Trades</button>
                        <button className="rounded-xl bg-[#122359] hover:bg-[#1a3275] text-white font-bold transition-colors text-[13px] flex items-center justify-center p-3 text-center leading-tight">Manager<br/>Trades</button>
                        <button className="rounded-xl bg-[#122359] hover:bg-[#1a3275] text-white font-bold transition-colors text-[13px] flex items-center justify-center p-3">Withdraw</button>
                        <button className="rounded-xl bg-[#d9aa2b] hover:bg-[#eabb3a] text-amber-950 font-bold transition-colors text-[13px] flex items-center justify-center p-3">Deposit</button>
                      </div>
                    </div>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        </div>
    </>
  );
}
