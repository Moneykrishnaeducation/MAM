import React, { useState } from 'react';
import { 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Users, 
  DollarSign
} from 'lucide-react';

export type FinancialModalType = 'deposit' | 'withdraw' | 'credit-in' | 'credit-out' | 'history' | 'transaction' | 'investors_list' | 'position' | null;

export interface FinancialUserTarget {
  id: string;
  name: string;
  email: string;
  accountId: string;
  balance: string;
  credit?: string;
  equity?: string;
  profit?: string;
  investors?: Array<{ id: string; name: string; email: string; invested: string; profit: string }>;
}

interface HistoryLogItem {
  id: string;
  type: string;
  amount: string;
  status: string;
  date: string;
  account?: string;
  approved_by?: string;
  approval_date?: string;
  description?: string;
  source?: string;
  role?: string;
  payment_method?: string;
  email?: string;
  transaction_type?: string;
}

function formatHistorySource(item: HistoryLogItem): string {
  const source = String(item.source ?? '').trim();
  if (source) {
    const lowered = source.toLowerCase();
    if (lowered !== 'admin' && lowered !== 'admin operation') {
      return lowered.startsWith('admin ') ? source.slice(6).trim() : source;
    }
  }

  const action = String(item.type || item.transaction_type || item.payment_method || 'Transaction')
    .trim()
    .replace(/\s+/g, ' ');
  return [item.role?.trim(), action || 'Transaction'].filter(Boolean).join(' ') || 'Transaction';
}

interface FinancialActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: FinancialUserTarget | null;
  modalType: FinancialModalType;
  onConfirmAction: (actionType: string, amount: string, note: string) => Promise<boolean> | void;
}

export default function FinancialActionModal({
  isOpen,
  onClose,
  targetUser,
  modalType,
  onConfirmAction,
}: FinancialActionModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [historyLogs, setHistoryLogs] = useState<HistoryLogItem[]>([]);
  const [investorsList, setInvestorsList] = useState<Array<{ id: string; name: string; email: string; invested: string; profit: string }>>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'position'>('history');
  const [positions, setPositions] = useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      if (modalType === 'position') setActiveTab('position');
      else if (modalType === 'history' || modalType === 'transaction') setActiveTab('history');
    }
  }, [isOpen, modalType]);

  React.useEffect(() => {
    if (!isOpen || !targetUser || !modalType) return;

    if (modalType === 'history' || modalType === 'transaction' || modalType === 'position') {
      if (activeTab === 'position') {
        setFetchingData(true);
        setFetchError(null);
        fetch(`/api/admin/open-positions/${targetUser.accountId}`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data.positions && Array.isArray(data.positions)) {
              setPositions(data.positions);
            } else {
              setPositions([]);
              if (data.error) setFetchError(data.error);
            }
          })
          .catch(() => setFetchError("Failed to load MT5 positions."))
          .finally(() => setFetchingData(false));
      } else {
        setFetchingData(true);
        setFetchError(null);
        fetch(`/api/admin/managers/${targetUser.accountId}/history`, { credentials: 'include' })
          .then(res => res.json())
          .then(async (data) => {
            if (data.status === 'ok' && Array.isArray(data.history) && data.history.length > 0) {
              setHistoryLogs(data.history);
            } else {
              // Try investor history endpoint if manager endpoint returned no records
              const invRes = await fetch(`/api/admin/investors/${targetUser.accountId}/history`, { credentials: 'include' });
              const invData = await invRes.json();
              if (invData.status === 'ok' && Array.isArray(invData.history)) {
                setHistoryLogs(invData.history);
              } else {
                setHistoryLogs([]);
                if (invData.message) setFetchError(invData.message);
              }
            }
          })
          .catch(async () => {
            try {
              const invRes = await fetch(`/api/admin/investors/${targetUser.accountId}/history`, { credentials: 'include' });
              const invData = await invRes.json();
              if (invData.status === 'ok' && Array.isArray(invData.history)) {
                setHistoryLogs(invData.history);
              } else {
                setFetchError("Failed to load history.");
              }
            } catch {
              setFetchError("Failed to load history.");
            }
          })
          .finally(() => setFetchingData(false));
      }
    } else if (modalType === 'investors_list') {
      setFetchingData(true);
      setFetchError(null);
      fetch(`/api/admin/managers/${targetUser.accountId}/investors`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'ok' && Array.isArray(data.investors)) {
            setInvestorsList(data.investors);
          } else {
            setInvestorsList(targetUser.investors || []);
            if (data.message) setFetchError(data.message);
          }
        })
        .catch(err => {
          console.error("Failed to fetch investors list:", err);
          setInvestorsList(targetUser.investors || []);
        })
        .finally(() => setFetchingData(false));
    }
  }, [isOpen, targetUser, modalType, activeTab]);

  if (!isOpen || !targetUser || !modalType) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType !== 'history' && modalType !== 'investors_list' && (!amount || Number(amount) <= 0)) {
      alert('Please enter a valid amount.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await onConfirmAction(modalType, amount, note);
      if (success !== false) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setAmount('');
          setNote('');
          onClose();
        }, 3200);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (modalType) {
      case 'deposit': return 'Manual Deposit Entry';
      case 'withdraw': return 'Process Withdrawal Payout';
      case 'credit-in': return 'Apply Credit-In (Bonus)';
      case 'credit-out': return 'Apply Credit-Out (Deduction)';
      case 'history':
      case 'transaction': return 'Account Transaction & Credit History';
      case 'position': return 'MT5 Open Positions';
      case 'investors_list': return 'Assigned Investors List';
      default: return '';
    }
  };

  const getIcon = () => {
    switch (modalType) {
      case 'deposit': return <ArrowDownCircle size={20} className="text-emerald-400" />;
      case 'withdraw': return <ArrowUpCircle size={20} className="text-blue-400" />;
      case 'credit-in': return <PlusCircle size={20} className="text-purple-400" />;
      case 'credit-out': return <MinusCircle size={20} className="text-amber-400" />;
      case 'history': 
      case 'transaction': return <History size={20} className="text-indigo-400" />;
      case 'position': return <DollarSign size={20} className="text-[#00ffcc]" />;
      case 'investors_list': return <Users size={20} className="text-teal-400" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#040f33]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      
      {/* SUCCESS VIDEO OVERLAY POPUP */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#040f33]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] border border-emerald-500/50 rounded-3xl p-8 shadow-[0_0_80px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center text-center animate-in zoom-in-50 duration-500 max-w-sm w-full relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
             <video src="/success.webm" autoPlay muted playsInline className="w-40 h-40 object-contain mb-4 z-10 filter drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
             <h2 className="text-2xl font-black text-white tracking-wider mb-2 z-10 uppercase">Success!</h2>
             <p className="text-emerald-300/80 font-bold text-xs uppercase tracking-widest z-10">
               {modalType?.replace('-', ' ')} Processed
             </p>
          </div>
        </div>
      )}

      <div className="bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] border border-[#113b95] rounded-[2rem] w-full max-w-[900px] shadow-[0_24px_60px_rgba(4,15,54,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden animate-in zoom-in-95 duration-150 my-auto relative">  
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* MODAL HEADER */}
        <div className="p-6 border-b border-[#113b95]/60 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
              {getIcon()}
            </div>
            <div>
              <h3 className="font-black text-white text-lg tracking-wide">
                {getTitle()}
              </h3>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-blue-300/70 mt-1">
                Account: <span className="text-blue-400 font-mono font-bold ml-1 mr-2">{targetUser.accountId}</span> • <span className="ml-2 text-white">{targetUser.name}</span> ({targetUser.id})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-xl text-blue-300 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* USER BALANCE SUMMARY BAR */}
        <div className="px-6 py-4 bg-black/10 border-b border-[#113b95]/60 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-blue-300/70 font-black uppercase tracking-wider text-[10px]">Current Balance:</span> <strong className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{targetUser.balance}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-300/70 font-black uppercase tracking-wider text-[10px]">Current Credit:</span> <strong className="text-amber-400 font-bold text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{targetUser.credit || '$0.00'}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-300/70 font-black uppercase tracking-wider text-[10px]">Current Equity:</span> <strong className="text-cyan-400 font-bold text-sm bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{targetUser.equity || targetUser.balance}</strong>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 text-xs">
          
          {/* HISTORY VIEW - TABLE FORMAT */}
          {(modalType === 'history' || modalType === 'transaction' || modalType === 'position') && (
            <div className="space-y-4">
              {/* Tab Navigation */}
              {(modalType === 'transaction' || modalType === 'position' || modalType === 'history') && (
                <div className="flex items-center gap-2 border-b border-[#24358a]/60 pb-3 mb-2">
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'history' 
                        ? 'bg-[#d4af37] text-slate-950 shadow-md' 
                        : 'bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    History
                  </button>
                  <button
                    onClick={() => setActiveTab('position')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'position' 
                        ? 'bg-[#d4af37] text-slate-950 shadow-md' 
                        : 'bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    Position
                  </button>
                </div>
              )}

              {activeTab === 'history' ? (
                <>
                  {/* Header section with summary stats */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#24358a]/80">
                    <div>
                      <h4 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                        Transaction & Credit Logs
                      </h4>
                      <p className="text-xs text-blue-300 mt-0.5">Audit history and balance movements for this account</p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#0f2a7a]/80 border border-[#24358a] px-3 py-1.5 rounded-xl shadow-inner">
                      <span className="text-[11px] text-blue-300 font-medium">Total Records:</span>
                      <span className="text-xs font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        {historyLogs.length}
                      </span>
                    </div>
                  </div>
                  
                  {fetchingData ? (
                    <div className="py-16 text-center">
                      <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm text-blue-300 font-medium">Loading history logs from database...</p>
                    </div>
                  ) : fetchError ? (
                    <div className="py-8 px-4 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                      <p className="text-sm text-rose-400 font-medium">{fetchError}</p>
                    </div>
                  ) : historyLogs.length === 0 ? (
                    <div className="py-16 text-center bg-[#0f2a7a]/40 rounded-2xl border border-[#24358a]/60">
                      <svg className="w-12 h-12 mx-auto text-blue-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-blue-300 font-medium text-sm">No transaction or credit records found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#24358a]/80 bg-[#0a1a54]/40 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#0b1329] border-b border-[#24358a] text-[11px] font-bold uppercase tracking-wider text-blue-300 z-10">
                          <tr>
                            <th scope="col" className="py-3 px-4">Type / ID</th>
                            <th scope="col" className="py-3 px-4">Account</th>
                            <th scope="col" className="py-3 px-4">Description</th>
                            <th scope="col" className="py-3 px-4">Approval Date</th>
                            <th scope="col" className="py-3 px-4">Approved By</th>
                            <th scope="col" className="py-3 px-4">Source</th>
                            <th scope="col" className="py-3 px-4">Role</th>
                            <th scope="col" className="py-3 px-4 text-right">Amount</th>
                            <th scope="col" className="py-3 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#24358a]/60 text-xs">
                          {historyLogs.map((item: any) => {
                            const amountStr = String(item.amount || "0");
                            const isPositive = !amountStr.startsWith("-");
                            const typeRaw = (item.type || item.transaction_type || "").toLowerCase();

                            let badgeStyle = "bg-purple-500/10 text-purple-400 border-purple-500/30";
                            if (typeRaw.includes("deposit")) {
                              badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                            } else if (typeRaw.includes("credit-in") || typeRaw.includes("in")) {
                              badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/30";
                            } else if (typeRaw.includes("credit-out") || typeRaw.includes("out") || typeRaw.includes("withdraw")) {
                              badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30";
                            }

                            const statusRaw = String(item.status || "").toLowerCase();
                            const isCompleted = ["completed", "approved"].includes(statusRaw);
                            const isRejected = ["rejected", "failed"].includes(statusRaw);

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-[#0f2a7a]/60 transition-colors duration-150 group"
                              >
                                {/* Type & ID */}
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                        isPositive
                                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                          : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                      }`}
                                    >
                                      {isPositive ? "↗" : "↘"}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border inline-block w-max leading-none ${badgeStyle}`}>
                                        {item.type || "LOG"}
                                      </span>
                                      <span className="text-[10px] font-mono text-blue-400 mt-1">
                                        #{item.id}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Account */}
                                <td className="py-3.5 px-4 whitespace-nowrap text-blue-200 font-mono">
                                  {item.account || "-"}
                                </td>

                                {/* Description */}
                                <td className="py-3.5 px-4 min-w-[180px]">
                                  <p className="text-blue-100 font-medium leading-snug line-clamp-2">
                                    {item.description || "-"}
                                  </p>
                                  {item.email && item.email !== "N/A" && (
                                    <p className="text-[11px] text-blue-400 truncate mt-0.5">
                                      {item.email}
                                    </p>
                                  )}
                                </td>

                                {/* Approval Date */}
                                <td className="py-3.5 px-4 whitespace-nowrap text-blue-300">
                                  <p className="text-xs text-blue-200 font-medium">{item.approval_date || item.date || "-"}</p>
                                </td>

                                {/* Approved By */}
                                <td className="py-3.5 px-4 whitespace-nowrap text-blue-200 font-medium">
                                  {item.approved_by || "-"}
                                </td>

                                {/* Source */}
                                <td className="py-3.5 px-4 whitespace-nowrap text-blue-200">
                                  <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-300">
                                    {formatHistorySource(item)}
                                  </span>
                                </td>

                                {/* Role */}
                                <td className="py-3.5 px-4 whitespace-nowrap text-blue-200 font-medium">
                                  {item.role || "-"}
                                </td>

                                {/* Amount */}
                                <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono font-bold text-sm">
                                  <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                                    {item.amount}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border leading-none ${
                                    isRejected
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                      : isCompleted
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  }`}>
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isRejected
                                          ? "bg-rose-400"
                                          : isCompleted
                                            ? "bg-emerald-400"
                                            : "bg-amber-400 animate-pulse"
                                      }`}
                                    />
                                    {item.status || "Pending"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#24358a]/80">
                    <div>
                      <h4 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                        MT5 Open Positions
                      </h4>
                      <p className="text-xs text-blue-300 mt-0.5">Live trades for this account from MT5</p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#0f2a7a]/80 border border-[#24358a] px-3 py-1.5 rounded-xl shadow-inner">
                      <span className="text-[11px] text-blue-300 font-medium">Open Trades:</span>
                      <span className="text-xs font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        {positions.length}
                      </span>
                    </div>
                  </div>

                  {fetchingData ? (
                    <div className="py-16 text-center">
                      <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm text-blue-300 font-medium">Fetching live MT5 positions...</p>
                    </div>
                  ) : fetchError ? (
                    <div className="py-8 px-4 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                      <p className="text-sm text-rose-400 font-medium">{fetchError}</p>
                    </div>
                  ) : positions.length === 0 ? (
                    <div className="py-16 text-center bg-[#0f2a7a]/40 rounded-2xl border border-[#24358a]/60">
                      <svg className="w-12 h-12 mx-auto text-blue-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <p className="text-blue-300 font-medium text-sm">No open positions in MT5 found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#24358a]/80 bg-[#0a1a54]/40 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#0b1329] border-b border-[#24358a] text-[11px] font-bold uppercase tracking-wider text-blue-300 z-10">
                          <tr>
                            <th scope="col" className="py-3 px-4">Ticket</th>
                            <th scope="col" className="py-3 px-4">Symbol</th>
                            <th scope="col" className="py-3 px-4">Type</th>
                            <th scope="col" className="py-3 px-4 text-right">Volume</th>
                            <th scope="col" className="py-3 px-4 text-right">Open Price</th>
                            <th scope="col" className="py-3 px-4 text-right">Current Price</th>
                            <th scope="col" className="py-3 px-4 text-right">S/L & T/P</th>
                            <th scope="col" className="py-3 px-4 text-right">Profit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#24358a]/60 text-xs">
                          {positions.map((pos: any) => {
                            const isBuy = (pos.type && pos.type.toLowerCase() === 'buy') || pos.action === 0;
                            const profitVal = parseFloat(pos.profit || "0");
                            const isPositiveProfit = profitVal >= 0;

                            return (
                              <tr key={pos.ticket} className="hover:bg-[#0f2a7a]/60 transition-colors duration-150 group">
                                <td className="py-3.5 px-4 font-mono text-blue-200">
                                  #{pos.ticket}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-white">
                                  {pos.symbol}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border inline-block leading-none ${
                                    isBuy ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  }`}>
                                    {isBuy ? "BUY" : "SELL"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-blue-200">
                                  {Number(pos.volume).toFixed(2)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-blue-200">
                                  {pos.open_price || pos.price_open}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-blue-200">
                                  {pos.current_price || pos.price_current}
                                </td>
                                <td className="py-3.5 px-4 text-right text-blue-300">
                                  <div className="flex flex-col text-[10px]">
                                    <span>SL: {pos.sl > 0 ? pos.sl : '-'}</span>
                                    <span>TP: {pos.tp > 0 ? pos.tp : '-'}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                                  <span className={isPositiveProfit ? "text-emerald-400" : "text-rose-400"}>
                                    {profitVal.toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* INVESTORS LIST VIEW (FOR MANAGER) */}
          {modalType === 'investors_list' && (
            <div className="space-y-3">
              <h4 className="font-bold text-blue-100 flex items-center gap-2">
                <Users size={16} className="text-teal-400" /> Assigned Investors under {targetUser.name}
              </h4>
              {fetchingData ? (
                <div className="py-8 text-center text-blue-300 font-medium">Loading investors from backend...</div>
              ) : fetchError && investorsList.length === 0 ? (
                <div className="py-4 text-center text-rose-400 font-medium">{fetchError}</div>
              ) : investorsList.length === 0 ? (
                <div className="py-8 text-center text-blue-400 font-medium">No assigned investors found for this manager.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-blue-300 border-b border-[#24358a]">
                        <th className="pb-2 font-semibold">Investor ID</th>
                        <th className="pb-2 font-semibold">Name & Email</th>
                        <th className="pb-2 font-semibold">Invested</th>
                        <th className="pb-2 text-right font-semibold">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24358a]">
                      {investorsList.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#24358a]/40">
                          <td className="py-2.5 font-mono text-blue-400">{inv.id}</td>
                          <td className="py-2.5">
                            <div className="font-bold text-blue-100">{inv.name}</div>
                            <div className="text-[11px] text-blue-300">{inv.email}</div>
                          </td>
                          <td className="py-2.5 text-blue-100 font-semibold">{inv.invested}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-400">{inv.profit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ACTION FORM FOR DEPOSIT, WITHDRAW, CREDIT-IN, CREDIT-OUT */}
          {(modalType === 'deposit' || modalType === 'withdraw' || modalType === 'credit-in' || modalType === 'credit-out') && (
            <form onSubmit={handleSubmit} className="space-y-5 mt-2">
              <div>
                <label className="block text-blue-200 text-[11px] font-black uppercase tracking-wider mb-2 ml-1">
                  Amount ($ USD)
                </label>
                <div className="flex items-center gap-2 bg-[#040f33]/60 border border-[#113b95]/60 rounded-xl px-4 py-3 transition-all hover:bg-[#113b95]/40 hover:border-[#113b95] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 shadow-[inset_0_2px_10px_rgba(4,15,54,0.5)] group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-focus-within:bg-blue-500/20 transition-all pointer-events-none" />
                  <DollarSign size={18} className="text-blue-400/60 group-focus-within:text-blue-400 transition-colors z-10" />
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent border-none text-white outline-none w-full text-base font-mono font-bold placeholder:text-blue-300/40 z-10 relative"
                  />
                </div>
              </div>

              <div>
                <label className="block text-blue-200 text-[11px] font-black uppercase tracking-wider mb-2 ml-1">
                  Admin Note / Reference Reason
                </label>
                <textarea 
                  rows={3}
                  placeholder={`Enter details for ${modalType} operation...`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-[#040f33]/60 border border-[#113b95]/60 rounded-xl p-4 text-white outline-none text-sm transition-all hover:bg-[#113b95]/40 hover:border-[#113b95] focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 shadow-[inset_0_2px_10px_rgba(4,15,54,0.5)] placeholder:text-blue-300/40 custom-scrollbar relative z-10"
                />
              </div>

              <div className="pt-4 border-t border-[#113b95]/60 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/5 text-blue-300 hover:bg-white/10 hover:text-white font-bold text-xs transition-colors border border-transparent hover:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed filter grayscale' : ''
                  } ${
                    modalType === 'deposit' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40' :
                    modalType === 'withdraw' ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/25 hover:shadow-amber-500/40' :
                    modalType === 'credit-in' ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-blue-500/25 hover:shadow-blue-500/40' :
                    'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-rose-500/25 hover:shadow-rose-500/40'
                  }`}
                >
                  {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  {isSubmitting ? 'Processing...' : `Confirm ${modalType}`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* MODAL FOOTER FOR NON-FORM VIEWS */}
        {(modalType === 'history' || modalType === 'transaction' || modalType === 'position' || modalType === 'investors_list') && (
          <div className="p-5 bg-black/10 border-t border-[#113b95]/60 flex justify-end relative z-10">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
