import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { getClientData, getAdminManagers } from '@/lib/mockDataLoader';

const riskBadge = (risk: string) => {
  if (risk === 'Low')
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  if (risk === 'Medium')
    return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
  return 'bg-red-500/15 text-red-400 border border-red-500/30';
};

export default function ClientAvailablePage() {
  const clientData = getClientData();
  const managerInfo = clientData.assignedManager;
  const allManagers = getAdminManagers();

  const [query, setQuery] = useState('');
  const [perPage, setPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<(typeof displayManagers)[number] | null>(null);
  const [investmentPassword, setInvestmentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const filteredManagers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allManagers;
    return allManagers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.accountId.toLowerCase().includes(q),
    );
  }, [query, allManagers]);

  const displayManagers = useMemo(() => {
    return filteredManagers.map((m, idx) => {
      const ageDays = 90 + ((idx * 37) % 410);
      const growth = idx % 2 === 0 ? m.profit : `+${m.profit}`;
      return {
        ...m,
        loginId: m.id,
        equity: m.balance,
        age: `${ageDays} days`,
        growth,
      };
    });
  }, [filteredManagers]);

  const hasQuery = query.trim().length > 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(displayManagers.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedManagers = displayManagers.slice(
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

  const openInvestModal = (manager: (typeof displayManagers)[number]) => {
    setSelectedManager(manager);
    setInvestmentPassword('');
    setConfirmPassword('');
    setIsInvestModalOpen(true);
  };

  const closeInvestModal = () => {
    setIsInvestModalOpen(false);
    setSelectedManager(null);
    setInvestmentPassword('');
    setConfirmPassword('');
  };

  const handleCreateInvestorAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    closeInvestModal();
  };

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('client-invest-modal-toggle', {
        detail: { isOpen: isInvestModalOpen },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent('client-invest-modal-toggle', {
          detail: { isOpen: false },
        })
      );
    };
  }, [isInvestModalOpen]);


  // Only show a highlighted card when user is actively searching
  const highlightedManager =
    hasQuery && filteredManagers.length > 0 ? filteredManagers[0] : null;

  // Check if the highlighted manager is the client's assigned manager
  const isAssigned =
    highlightedManager?.name === managerInfo.name ||
    highlightedManager?.email === managerInfo.email;

  return (
    <>
      <Head>
        <title>Available MAM Managers | Client Portal</title>
      </Head>

      {/* ── Invest in Manager Modal ── */}
      {isInvestModalOpen && selectedManager && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl overflow-hidden border border-blue-900/40 bg-[#0c1636] shadow-2xl my-auto">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-blue-900/30 bg-[#0f1b42]">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-[11px] font-bold tracking-wider uppercase mb-3">
                  <DollarSign size={12} /> Invest in Manager
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Invest in Manager</h2>
                <p className="text-sm text-blue-200/60 mt-1">
                  Complete the investor account setup for the selected manager.
                </p>
              </div>
              <button
                onClick={closeInvestModal}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close invest modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvestorAccount} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Manager Name</p>
                  <p className="mt-2 text-lg font-extrabold text-white">
                    {`(${selectedManager.accountId})-MAM`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{selectedManager.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Profit Share</p>
                  <p className="mt-2 text-lg font-extrabold text-emerald-400">
                    {selectedManager.share || '20%'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Investor allocation details</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Investment Password</span>
                  <input
                    type="password"
                    value={investmentPassword}
                    onChange={(e) => setInvestmentPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full rounded-2xl bg-[#0a1330] border border-blue-900/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirm Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="w-full rounded-2xl bg-[#0a1330] border border-blue-900/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-blue-900/25">
                <p className="text-xs text-slate-500">
                  Make sure both passwords match before creating the investor account.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeInvestModal}
                    className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 text-sm font-black shadow-lg shadow-yellow-500/20 hover:opacity-95 transition-opacity"
                  >
                    <Users size={15} /> Create Investor Account
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

        <div className="p-6 md:p-8 space-y-8">
          {/* ── Page Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <UserCheck size={13} /> Available Managers
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Explore Available MAM Managers
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Search, view and connect with your dedicated MAM relationship
                manager.
              </p>
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Invested', value: '$0.00', meta: 'USD', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Total Profit', value: '$0.00', meta: 'USD', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Active Nodes', value: '0', meta: 'Live', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            ].map((item) => (
              <div
                key={item.label}
                className={`relative overflow-hidden rounded-3xl border bg-slate-900/70 shadow-xl p-5 ${item.bg}`}
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className={`text-3xl font-black tracking-tight ${item.color}`}>{item.value}</span>
                  <span className="text-xs font-semibold text-slate-500 pb-1">{item.meta}</span>
                </div>
              </div>
            ))}
          </div>

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

          {/* ── Manager Profile Card — only when actively searching ── */}
          {hasQuery && highlightedManager ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50 border border-slate-700/60 rounded-3xl shadow-2xl">
              {/* Subtle glow accent */}
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="relative flex flex-col md:flex-row gap-6 p-6 md:p-8">
                {/* Avatar + status */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="relative">
                    <img
                      src={
                        isAssigned
                          ? managerInfo.avatar
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(highlightedManager.name)}&background=1e293b&color=34d399&size=128&bold=true`
                      }
                      alt={highlightedManager.name}
                      className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-xl"
                    />
                    <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow" />
                  </div>
                  {isAssigned && (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 tracking-wide uppercase">
                      Featured
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white leading-tight">
                      {highlightedManager.name}
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
                        {highlightedManager.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                      <Hash size={14} className="text-blue-400 shrink-0" />
                      <span className="text-slate-300 font-medium">
                        {highlightedManager.id}
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
                        className={`font-semibold ${highlightedManager.risk === 'Low' ? 'text-emerald-400' : highlightedManager.risk === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}
                      >
                        {highlightedManager.risk} Risk
                      </span>
                    </div>
                  </div>

                  {/* Mini stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: 'AUM Balance',
                        value: highlightedManager.balance,
                        icon: <DollarSign size={14} />,
                        color: 'text-emerald-400',
                        bg: 'bg-emerald-500/10 border-emerald-500/20',
                      },
                      {
                        label: 'Total Profit',
                        value: highlightedManager.profit,
                        icon: <TrendingUp size={14} />,
                        color: 'text-blue-400',
                        bg: 'bg-blue-500/10 border-blue-500/20',
                      },
                      {
                        label: 'Performance Fee',
                        value: highlightedManager.share,
                        icon: <Percent size={14} />,
                        color: 'text-purple-400',
                        bg: 'bg-purple-500/10 border-purple-500/20',
                      },
                      {
                        label: 'Total Investors',
                        value: highlightedManager.investorsCount,
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
                  {isAssigned && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        id="btn-send-message"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-all shadow-md hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <MessageSquare size={15} /> Send Message
                      </button>
                      <button
                        id="btn-schedule-session"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Calendar size={15} /> Schedule Session
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : hasQuery && filteredManagers.length === 0 ? (
            /* ── No Results — only shown when searching ── */
            <div className="flex flex-col items-center justify-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl">
              <Search size={40} className="text-slate-700 mb-3" />
              <p className="text-slate-400 font-semibold text-sm">
                No available manager found for &quot;{query}&quot;
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Try a different name or email address.
              </p>
            </div>
          ) : null}

          {/* ── Manager Details Table ── */}
          <div className="bg-[#0b1736] border border-blue-900/60 rounded-3xl overflow-hidden shadow-xl">
            {/* Table header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/60">
              <div>
                <h3 className="text-base font-bold text-white">
                  All Available Managers
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
                  available manager{filteredManagers.length !== 1 ? 's' : ''}
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
                      'Manager Name',
                      'Login ID',
                      'Balance',
                      'Equity',
                      'Profit Share',
                      'Age',
                      'Growth',
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
                      <td colSpan={8} className="text-center py-12 text-slate-600 text-sm">
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
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={isClientManager ? managerInfo.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(mgr.name)}&background=1e293b&color=34d399&size=64&bold=true`}
                                alt={mgr.name}
                                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                              />
                              <div>
                                <div className="font-semibold text-slate-100 text-sm leading-tight">{mgr.name}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{mgr.email}</div>
                              </div>
                              {isClientManager && (
                                <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 tracking-wide">Yours</span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-2 py-1 rounded-lg">{mgr.loginId}</span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-bold text-emerald-400">{mgr.balance}</span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-semibold text-blue-400">{mgr.equity}</span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-purple-400 font-semibold">{mgr.share}</span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-slate-100 font-semibold">{mgr.age.split(' ')[0]}</span>
                              <span className="text-xs text-blue-400 font-semibold mt-0.5">{mgr.age.split(' ')[1]}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-bold text-emerald-400">{mgr.growth}</span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-3">
                              <button className="px-5 py-1.5 rounded-full border border-blue-700 bg-blue-900/30 text-blue-100 hover:bg-blue-800/80 text-xs font-semibold transition-colors shadow-sm">View</button>
                              <button onClick={() => openInvestModal(mgr)} className="px-5 py-1.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-bold transition-colors shadow-md shadow-yellow-500/20">Invest</button>
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
            {hasQuery && highlightedManager && highlightedManager.investorsList?.length > 0 && (
              <div className="border-t border-slate-800 px-6 py-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Investors under{' '}
                  <span className="text-emerald-400">
                    {highlightedManager.name}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {highlightedManager.investorsList.map((inv) => (
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