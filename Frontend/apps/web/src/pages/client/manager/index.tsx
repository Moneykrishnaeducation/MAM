import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import {
  UserCheck,
  Mail,
  Phone,
  Search,
  MessageSquare,
  Calendar,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  X,
  Percent,
  Hash,
  ChevronRight,
  ChevronLeft,
  Settings,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { getClientData, getAdminManagers } from '@/lib/mockDataLoader';
import DepositModal from '../model/depositmodel';
import WithdrawalModal from '../model/withdrawal';

const riskBadge = (risk: string) => {
  if (risk === 'Low')
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  if (risk === 'Medium')
    return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
  return 'bg-red-500/15 text-red-400 border border-red-500/30';
};

export default function ClientManagerPage() {
  const clientData = getClientData();
  const managerInfo = clientData.assignedManager;
  const allManagers = getAdminManagers();

  const [query, setQuery] = useState('');
  const [perPage, setPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const [showInvestorListModal, setShowInvestorListModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [activeDepositTab, setActiveDepositTab] = useState('cheesepay');
  const [cheeseAmount, setCheeseAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState<any>(null);
  const [newLeverage, setNewLeverage] = useState<string>('500');
  const [passwordType, setPasswordType] = useState<'Investor' | 'Manager' | 'None'>('Investor');
  const [selectedManager, setSelectedManager] = useState<any | null>(null);

  const filteredManagers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allManagers;
    return allManagers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q),
    );
  }, [query, allManagers]);

  const hasQuery = query.trim().length > 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredManagers.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedManagers = filteredManagers.slice(
    (safePage - 1) * perPage,
    safePage * perPage,
  );

  const handlePerPageChange = (val: number) => {
    setPerPage(val);
    setCurrentPage(1);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  // Only show a highlighted card when user is actively searching
  const highlightedManager =
    hasQuery && filteredManagers.length > 0 ? filteredManagers[0] : null;

  // Active manager may be from an explicit selection (selectedManager)
  // or from the current search highlight (highlightedManager)
  const activeManager =
    selectedManager ?? (hasQuery && highlightedManager ? highlightedManager : null);
  const showActiveManager = Boolean(activeManager);

  // Check if the active manager is the client's assigned manager
  const isAssigned =
    activeManager?.name === managerInfo.name ||
    activeManager?.email === managerInfo.email;

  return (
    <>
      <Head>
        <title>My Manager | Client Portal</title>
      </Head>
        <div className="p-6 md:p-8 space-y-8">
          {/* ── Page Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <UserCheck size={13} /> Relationship Manager
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Your Assigned Manager
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Search, view and connect with your dedicated MAM relationship
                manager.
              </p>
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-500" />
            </div>
            <input
              id="manager-search"
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by manager name, email or ID…"
              className="w-full bg-[#0b1736] border border-blue-900/50 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 text-slate-100 placeholder-slate-500 rounded-2xl pl-11 pr-11 py-3.5 text-sm outline-none transition-all shadow-lg"
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* ── Manager Profile Card / Details — show when search highlight or explicit selection ── */}
          {showActiveManager && activeManager ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50 border border-slate-700/60 rounded-3xl shadow-2xl">
              {/* Subtle glow accent */}
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <button
                type="button"
                onClick={() => setSelectedManager(null)}
                className="absolute top-4 right-4 rounded-full border border-blue-500/30 bg-blue-900/70 p-2 text-blue-100 hover:bg-blue-800 transition"
              >
                <X size={18} />
              </button>

              <div className="relative flex flex-col md:flex-row gap-6 p-6 md:p-8">
                {/* Avatar + status */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="relative">
                    <img
                      src={
                          isAssigned
                            ? managerInfo.avatar
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(activeManager.name)}&background=1e293b&color=34d399&size=128&bold=true`
                        }
                        alt={activeManager.name}
                      className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-xl"
                    />
                    <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow" />
                  </div>
                  {isAssigned && (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 tracking-wide uppercase">
                      Your Manager
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white leading-tight">
                      {activeManager.name}
                    </h2>
                    <p className="text-sm text-emerald-400 font-semibold mt-0.5">
                      {isAssigned
                        ? managerInfo.role
                        : 'MAM Portfolio Manager'}
                    </p>
                    {isAssigned && (
                      <p className="text-xs text-slate-400 mt-1">
                        {managerInfo.experience}
                      </p>
                    )}
                  </div>

                  {/* Contact chips */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                      <Mail size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-slate-300 font-medium">
                        {activeManager.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                      <Hash size={14} className="text-blue-400 shrink-0" />
                      <span className="text-slate-300 font-medium">
                        {activeManager.id}
                      </span>
                    </div>
                    {isAssigned && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                        <Phone
                          size={14}
                          className="text-purple-400 shrink-0"
                        />
                        <span className="text-slate-300 font-medium">
                          {managerInfo.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                      <Shield size={14} className="text-amber-400 shrink-0" />
                      <span
                        className={`font-semibold ${activeManager.risk === 'Low' ? 'text-emerald-400' : activeManager.risk === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}
                      >
                        {activeManager.risk} Risk
                      </span>
                    </div>
                  </div>

                  {/* Mini stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: 'Balance',
                        value: activeManager.balance,
                        icon: <DollarSign size={14} />,
                        color: 'text-emerald-400',
                        bg: 'bg-emerald-500/10 border-emerald-500/20',
                      },
                      {
                        label: 'Profit Share',
                        value: activeManager.profit,
                        icon: <TrendingUp size={14} />,
                        color: 'text-blue-400',
                        bg: 'bg-blue-500/10 border-blue-500/20',
                      },
                      {
                        label: 'Performance Fee',
                        value: activeManager.share,
                        icon: <Percent size={14} />,
                        color: 'text-purple-400',
                        bg: 'bg-purple-500/10 border-purple-500/20',
                      },
                      {
                        label: 'Total Investors',
                        value: activeManager.investorsCount,
                        icon: <Users size={14} />,
                        color: 'text-amber-400',
                        bg: 'bg-amber-500/10 border-amber-500/20',
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={`flex flex-col gap-1.5 p-3 rounded-2xl border ${stat.bg}`}
                      >
                        <div className={`${stat.color}`}>{stat.icon}</div>
                        <div className={`text-base font-extrabold ${stat.color}`}>
                          {stat.value}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  
                </div>
              </div>
              
              {/* ── Detailed Dashboard Content (from image.png) ── */}
              <div className="p-6 md:p-8 pt-0 space-y-6">
                
                {/* NET BALANCE Banner */}
                <div className="rounded-2xl bg-[#0a1435] border border-blue-900/40 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">Net Balance</div>
                    <div className="text-4xl font-black text-white mt-1 leading-none tracking-tight">
                      $0.00 <span className="text-sm font-extrabold text-white/70 ml-1">USD</span>
                    </div>
                    <div className="mt-5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowDepositModal(true)}
                        className="px-5 py-2.5 rounded-lg font-bold bg-[#d9aa2b] hover:bg-[#eabb3a] text-amber-950 transition-colors shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2"
                      >
                        <span>+</span> Quick Fund
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowWithdrawalModal(true)}
                        className="px-5 py-2.5 rounded-lg border border-blue-700/50 hover:bg-blue-800/30 text-white font-bold transition-colors text-sm flex items-center gap-2"
                      >
                        <Wallet size={16} /> Withdraw
                      </button>
                    </div>
                  </div>
                  <div className="flex-none w-full md:w-auto">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                      <div className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">Total Profit</div>
                      <div className="text-[15px] font-extrabold text-white text-right">$0</div>
                      <div className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">Profit Share</div>
                      <div className="text-[15px] font-extrabold text-white text-right">5.00%</div>
                      <div className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">Risk Profile</div>
                      <div className="text-[15px] font-extrabold text-white text-right">medium</div>
                      <div className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">Leverage</div>
                      <div className="text-[15px] font-extrabold text-white text-right">1:500</div>
                    </div>
                  </div>
                </div>

                {/* Three Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* MAM CONFIGURATION */}
                  <div className="p-6 rounded-[20px] bg-[#0a1435] border border-blue-900/40">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-blue-200 mb-5">MAM Configuration</h4>
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center"><span className="text-blue-200/80 font-semibold">Account Name</span><span className="font-extrabold text-white">Naveen Test</span></div>
                      <div className="flex justify-between items-center"><span className="text-blue-200/80 font-semibold">Payout Cycle</span><span className="font-extrabold text-white">weekly</span></div>
                      <div className="flex justify-between items-center"><span className="text-blue-200/80 font-semibold">Algo Trading</span><span className="font-extrabold text-white">Manual</span></div>
                      <div className="flex justify-between items-center"><span className="text-blue-200/80 font-semibold">Status</span><span className="font-extrabold text-white">Active</span></div>
                    </div>
                  </div>

                  {/* Master Security */}
                  <div className="p-6 rounded-[20px] bg-[#0a1435] border border-blue-900/40 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                      <Settings size={24} />
                    </div>
                    <h4 className="text-[16px] font-extrabold tracking-wide text-white mb-5">Master Security</h4>
                    <div className="w-full space-y-3">
                        <button
                        type="button"
                        onClick={() => setShowAccountSettingsModal(true)}
                        className="w-full py-3 rounded-xl bg-[#2962ff] hover:bg-[#1e4ed8] text-white font-extrabold transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Settings size={16} /> Account Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInvestorListModal(true)}
                        className="w-full py-3 rounded-xl bg-[#2962ff] hover:bg-[#1e4ed8] text-white font-extrabold transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Users size={16} /> Investor List
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-6 rounded-[20px] bg-[#0a1435] border border-blue-900/40">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-blue-200 mb-5">Quick Actions</h4>
                    <div className="w-full space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowPerformanceModal(true)}
                        className="w-full py-3 rounded-xl bg-[#2962ff] hover:bg-[#1e4ed8] text-white font-extrabold transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <TrendingUp size={16} /> Performance
                      </button>
                      <button className="w-full py-3 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold transition-colors text-sm flex items-center justify-center gap-2">
                        <RefreshCw size={16} /> Deactivate
                      </button>
                    </div>
                  </div>
                </div>

                {/* PROFIT SHARE WALLET */}
                <div className="p-6 rounded-[20px] bg-[#0a1435] border border-blue-900/40">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-blue-200">Profit Share Wallet</h4>
                    <button className="px-4 py-2 rounded-lg font-bold bg-[#d9aa2b] hover:bg-[#eabb3a] text-amber-950 transition-colors text-[11px] uppercase tracking-wider flex items-center gap-2">
                      <DollarSign size={14} /> Trigger Settlement
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 rounded-xl bg-[#071333] border border-blue-900/30">
                      <div className="text-[10px] font-extrabold text-blue-200/70 uppercase tracking-widest mb-1">Pending Wallet</div>
                      <div className="text-2xl font-black text-[#d9aa2b]">$0.00</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#071333] border border-blue-900/30">
                      <div className="text-[10px] font-extrabold text-blue-200/70 uppercase tracking-widest mb-1">Total Settled</div>
                      <div className="text-2xl font-black text-white">$0.00</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#071333] border border-blue-900/30">
                      <div className="text-[10px] font-extrabold text-blue-200/70 uppercase tracking-widest mb-1">Trades Processed</div>
                      <div className="text-2xl font-black text-white">0</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : hasQuery && filteredManagers.length === 0 ? (
            /* ── No Results — only shown when searching ── */
            <div className="flex flex-col items-center justify-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl">
              <Search size={40} className="text-slate-700 mb-3" />
              <p className="text-slate-400 font-semibold text-sm">
                No manager found for &quot;{query}&quot;
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Try a different name or email address.
              </p>
            </div>
          ) : null}

          {showAccountSettingsModal && activeManager && (
            <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xl">
              <div className="w-full max-w-md rounded-[32px] border border-blue-500/20 bg-[#071429] shadow-2xl shadow-blue-950/40 overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-6 py-5 bg-blue-950/95 border-b border-blue-500/10">
                  <div>
                    <h3 className="text-xl font-black text-white">Account Settings</h3>
                    <p className="text-sm text-blue-200/80 mt-1">Manage leverage and security for {activeManager.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAccountSettingsModal(false)}
                    className="rounded-full border border-blue-500/30 bg-blue-900/70 p-2 text-blue-100 hover:bg-blue-800 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-5 px-6 py-6 bg-[#08132a]">
                  <div className="rounded-3xl border border-blue-500/10 bg-blue-950/10 p-4">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-blue-200/70">Leverage Control</div>
                        <div className="text-sm font-black text-white">Current Active</div>
                      </div>
                      <div className="rounded-2xl bg-blue-900/80 px-3 py-2 text-blue-100 text-sm font-black">{newLeverage}</div>
                    </div>
                    <select
                      value={newLeverage}
                      onChange={(e) => setNewLeverage(e.target.value)}
                      className="w-full rounded-2xl border border-blue-500/20 bg-[#071127] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    >
                      {['100','200','300','400','500','600','700','800','900','1000'].map((val) => (
                        <option key={val} value={val} className="bg-[#071127] text-white">{val}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:opacity-95 transition"
                    >
                      Update Leverage
                    </button>
                  </div>

                  <div className="rounded-3xl border border-blue-500/10 bg-blue-950/5 p-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-blue-200/70">Security Access</div>
                        <div className="text-sm font-black text-white">Choose Password Type</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {['Investor', 'Manager', 'None'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPasswordType(type as 'Investor' | 'Manager' | 'None')}
                          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${passwordType === type ? 'border-blue-400 bg-blue-900/80 text-white shadow-lg shadow-blue-500/10' : 'border-blue-500/20 bg-[#071127] text-blue-100 hover:border-blue-400 hover:bg-blue-900/40'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{type} Password</span>
                            {passwordType === type ? <span className="text-blue-200 text-xs uppercase tracking-[0.24em]">Selected</span> : null}
                          </div>
                          {type === 'Investor' && (
                            <p className="mt-2 text-xs text-blue-200/70">Use this password for investor access controls.</p>
                          )}
                          {type === 'Manager' && (
                            <p className="mt-2 text-xs text-blue-200/70">Use this password for manager-level secure changes.</p>
                          )}
                          {type === 'None' && (
                            <p className="mt-2 text-xs text-blue-200/70">Disable password access for now.</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAccountSettingsModal(false)}
                      className="flex-1 rounded-2xl border border-blue-500/20 bg-[#071127] px-4 py-3 text-sm font-bold text-blue-100 hover:bg-blue-900/30 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAccountSettingsModal(false)}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:opacity-95 transition"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showInvestorListModal && activeManager && (
            <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xl">
              <div className="w-full max-w-3xl rounded-[32px] border border-blue-500/20 bg-[#071429] shadow-2xl shadow-blue-950/40 overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-6 py-5 bg-blue-950/95 border-b border-blue-500/10">
                  <div>
                    <h3 className="text-xl font-black text-white">Investor List</h3>
                    <p className="text-sm text-blue-200/80 mt-1">Active investors linked to {activeManager.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInvestorListModal(false)}
                    className="rounded-full border border-blue-500/30 bg-blue-900/70 p-2 text-blue-100 hover:bg-blue-800 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 bg-[#08132a]">
                  {activeManager.investorsList?.length ? (
                    <div className="grid gap-4">
                      {activeManager.investorsList.map((inv) => (
                        <div key={inv.id} className="rounded-3xl border border-blue-500/10 bg-blue-950/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-white">{inv.name}</div>
                            <div className="text-xs text-blue-200/70 mt-1">ID: {inv.id} · {inv.invested || 'Active'}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-blue-900/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100 border border-blue-500/20">{inv.profit}</span>
                            <span className="text-xs text-slate-300">{inv.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-blue-500/10 bg-blue-950/5 p-10 text-center">
                      <div className="text-xl font-black text-white mb-3">No Investors Found</div>
                      <p className="text-sm text-blue-200/70">There are no active investors linked to this manager account yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showPerformanceModal && activeManager && (
            <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xl">
              <div className="w-full max-w-3xl rounded-[32px] border border-blue-500/20 bg-[#071429] shadow-2xl shadow-blue-950/40 overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-6 py-5 bg-blue-950/95 border-b border-blue-500/10">
                  <div>
                    <h3 className="text-xl font-black text-white">Open Positions</h3>
                    <p className="text-sm text-blue-200/80 mt-1">Real-time trading activity for Account #{activeManager.accountId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPerformanceModal(false)}
                    className="rounded-full border border-blue-500/30 bg-blue-900/70 p-2 text-blue-100 hover:bg-blue-800 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 bg-[#08132a]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-blue-100">
                      <thead>
                        <tr className="text-xs uppercase tracking-[0.18em] text-blue-200 border-b border-blue-700/50">
                          {['# TICKET','SYMBOL','TYPE','VOLUME','OPEN PRICE','CURRENT','PROFIT','SWAP','OPEN TIME','COMMENT'].map((label) => (
                            <th key={label} className="px-3 py-3 text-blue-100">{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-blue-700/40">
                          <td className="px-3 py-5 text-blue-200" colSpan={10}>
                            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-800 text-blue-200">
                                <TrendingUp size={20} />
                              </span>
                              <div className="text-sm font-semibold text-blue-200">No open positions found</div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-xs text-blue-200">
                    <div className="inline-flex items-center gap-2 text-blue-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> LIVE FEED
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition shadow-[0_10px_30px_-20px_rgba(59,130,246,0.7)]"
                      onClick={() => setShowPerformanceModal(false)}
                    >
                      Close Panel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DepositModal
            showDepositModal={showDepositModal}
            setShowDepositModal={setShowDepositModal}
            activeTab={activeDepositTab}
            setActiveTab={setActiveDepositTab}
            cheeseAmount={cheeseAmount}
            setCheeseAmount={setCheeseAmount}
            currency={currency}
            setCurrency={setCurrency}
            convertedAmount={convertedAmount}
            selectedDepositAccount={activeManager?.accountId || activeManager?.id || 'MAM-84930'}
            usdtAmount={usdtAmount}
            setUsdtAmount={setUsdtAmount}
          />

          {showWithdrawalModal && (
            <WithdrawalModal
              onClose={() => setShowWithdrawalModal(false)}
              isDarkMode={true}
              currentAccount={activeManager?.accountId || activeManager?.id || 'MAM-84930'}
            />
          )}

          {/* ── Manager Details Table ── */}
          <div className="bg-[#0b1736] border border-blue-900/60 rounded-3xl overflow-hidden shadow-xl">
            {/* Table header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/60">
              <div>
                <h3 className="text-base font-bold text-white">
                  All Manager Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing{' '}
                  <span className="text-slate-300 font-semibold">
                    {filteredManagers.length === 0
                      ? 0
                      : (safePage - 1) * perPage + 1}
                    –{Math.min(safePage * perPage, filteredManagers.length)}
                  </span>{' '}
                  of{' '}
                  <span className="text-slate-300 font-semibold">
                    {filteredManagers.length}
                  </span>{' '}
                  manager{filteredManagers.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Data
              </div>
            </div>

            {/* Scrollable table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#0e2152]">
                  <tr className="border-b border-blue-900/40">
                    {[
                      'Manager',
                      'Account ID',
                      'Balance',
                      'Profit Share',
                      'Performance Fee',
                      'Investors',
                      'Actions',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paginatedManagers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-12 text-slate-600 text-sm"
                      >
                        No managers match your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedManagers.map((mgr, idx) => {
                      const isClientManager =
                        mgr.name === managerInfo.name ||
                        mgr.email === managerInfo.email;
                      return (
                        <tr
                          key={mgr.id}
                          className={`group transition-colors hover:bg-[#11255e] ${isClientManager ? 'bg-emerald-500/10' : idx % 2 === 0 ? 'bg-[#0b1736]' : 'bg-[#0e2152]/30'}`}
                        >
                          {/* Manager name + avatar */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  isClientManager
                                    ? managerInfo.avatar
                                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(mgr.name)}&background=1e293b&color=34d399&size=64&bold=true`
                                }
                                alt={mgr.name}
                                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                              />
                              <div>
                                <div className="font-semibold text-slate-100 text-sm leading-tight">
                                  {mgr.name}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {mgr.email}
                                </div>
                              </div>
                            
                            </div>
                          </td>


                          {/* Account ID */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
                              {mgr.accountId}
                            </span>
                          </td>

                          {/* Balance */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-bold text-emerald-400">
                              {mgr.balance}
                            </span>
                          </td>

                          {/* Profit */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-semibold text-blue-400">
                              {mgr.profit}
                            </span>
                          </td>

                          {/* Share */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-purple-400 font-semibold">
                              {mgr.share}
                            </span>
                          </td>

                          {/* Investors count */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Users
                                size={13}
                                className="text-amber-400 shrink-0"
                              />
                              <span className="font-semibold">
                                {mgr.investorsCount}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-2 min-w-[160px]">
                              <button
                                type="button"
                                onClick={() => setSelectedManager(mgr)}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-2 text-slate-200 opacity-80 hover:opacity-100 hover:bg-slate-700 transition duration-200"
                              >
                                <ChevronRight size={14} />
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDepositModal(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-full bg-blue-600/95 px-3 py-2 text-white opacity-90 hover:opacity-100 hover:bg-blue-500 transition duration-200"
                              >
                                <DollarSign size={14} />
                                Fund
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination Footer ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-blue-900/60 bg-[#0b1736]">
              {/* Per-page selector */}
              <div className="flex items-center gap-2 order-2 sm:order-1">
                <label htmlFor="per-page" className="text-xs text-slate-500 whitespace-nowrap">
                  Rows per page:
                </label>
                <select
                  id="per-page"
                  value={perPage}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                  className="bg-[#0e2152] border border-blue-900/50 text-blue-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                >
                  {[5, 10, 25, 50, 100, 250, 500].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">
                  — Page{' '}
                  <span className="text-slate-300 font-semibold">{safePage}</span>
                  {' '}of{' '}
                  <span className="text-slate-300 font-semibold">{totalPages}</span>
                </span>
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                {/* Prev */}
                <button
                  id="pagination-prev"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={13} /> Prev
                </button>

                {/* Page number pills */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const isEllipsis =
                    totalPages > 5 &&
                    page !== 1 &&
                    page !== totalPages &&
                    Math.abs(page - safePage) > 1;
                  if (isEllipsis) {
                    if (page === safePage - 2 || page === safePage + 2) {
                      return (
                        <span key={page} className="text-slate-600 px-1 text-xs select-none">
                          …
                        </span>
                      );
                    }
                    return null;
                  }
                  return (
                    <button
                      key={page}
                      id={`pagination-page-${page}`}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all border ${
                        page === safePage
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                {/* Next */}
                <button
                  id="pagination-next"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Table footer with investors sub-list for highlighted manager */}
            {hasQuery && activeManager && activeManager.investorsList?.length > 0 && (
              <div className="border-t border-slate-800 px-6 py-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Investors under{' '}
                  <span className="text-emerald-400">
                    {activeManager.name}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeManager.investorsList.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                        {inv.name.charAt(0)}
                      </div>
                      <span className="text-slate-300 font-medium">
                        {inv.name}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-emerald-400 font-semibold">
                        {inv.profit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
    </>
  );
}