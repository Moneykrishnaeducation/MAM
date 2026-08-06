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

export type FinancialModalType = 'deposit' | 'withdraw' | 'credit-in' | 'credit-out' | 'history' | 'investors_list' | null;

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

interface FinancialActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: FinancialUserTarget | null;
  modalType: FinancialModalType;
  onConfirmAction: (actionType: string, amount: string, note: string) => void;
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
  const [historyLogs, setHistoryLogs] = useState<Array<{ id: string; type: string; amount: string; status: string; date: string }>>([]);
  const [investorsList, setInvestorsList] = useState<Array<{ id: string; name: string; email: string; invested: string; profit: string }>>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !targetUser || !modalType) return;

    if (modalType === 'history') {
      setFetchingData(true);
      setFetchError(null);
      fetch(`/api/admin/managers/${targetUser.accountId}/history`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'ok' && Array.isArray(data.history)) {
            setHistoryLogs(data.history);
          } else {
            setHistoryLogs([]);
            if (data.message) setFetchError(data.message);
          }
        })
        .catch(err => {
          console.error("Failed to fetch history:", err);
          setFetchError("Failed to load history.");
        })
        .finally(() => setFetchingData(false));
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
  }, [isOpen, targetUser, modalType]);

  if (!isOpen || !targetUser || !modalType) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType !== 'history' && modalType !== 'investors_list' && (!amount || Number(amount) <= 0)) {
      alert('Please enter a valid amount.');
      return;
    }
    onConfirmAction(modalType, amount, note);
    setAmount('');
    setNote('');
  };

  const getTitle = () => {
    switch (modalType) {
      case 'deposit': return 'Manual Deposit Entry';
      case 'withdraw': return 'Process Withdrawal Payout';
      case 'credit-in': return 'Apply Credit-In (Bonus)';
      case 'credit-out': return 'Apply Credit-Out (Deduction)';
      case 'history': return 'Account Transaction & Credit History';
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
      case 'history': return <History size={20} className="text-indigo-400" />;
      case 'investors_list': return <Users size={20} className="text-teal-400" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
<div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[900px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">  
        {/* MODAL HEADER */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              {getIcon()} {getTitle()}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Account: <span className="text-blue-400 font-mono font-semibold">{targetUser.accountId}</span> • {targetUser.name} ({targetUser.id})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* USER BALANCE SUMMARY BAR */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400">Current Balance:</span> <strong className="text-emerald-400 font-bold text-sm ml-1">{targetUser.balance}</strong>
          </div>
          <div>
            <span className="text-slate-400">Current Credit:</span> <strong className="text-amber-400 font-bold text-sm ml-1">{targetUser.credit || '$0.00'}</strong>
          </div>
          <div>
            <span className="text-slate-400">Current Equity:</span> <strong className="text-cyan-400 font-bold text-sm ml-1">{targetUser.equity || targetUser.balance}</strong>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 text-xs">
          
          {/* HISTORY VIEW - TABLE FORMAT */}
          {modalType === 'history' && (
            <div className="space-y-4">
              {/* Header section with summary stats */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div>
                  <h4 className="font-bold text-slate-100 text-base tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                    Transaction & Credit Logs
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Audit history and balance movements for this account</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner">
                  <span className="text-[11px] text-slate-400 font-medium">Total Records:</span>
                  <span className="text-xs font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                    {historyLogs.length}
                  </span>
                </div>
              </div>
              
              {fetchingData ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Loading history logs from database...</p>
                </div>
              ) : fetchError ? (
                <div className="py-8 px-4 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                  <p className="text-sm text-rose-400 font-medium">{fetchError}</p>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
                  <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-400 font-medium text-sm">No transaction or credit records found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0b1329] border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 z-10">
                      <tr>
                        <th scope="col" className="py-3 px-4">Type / ID</th>
                        <th scope="col" className="py-3 px-4">Description</th>
                        <th scope="col" className="py-3 px-4">Date</th>
                        <th scope="col" className="py-3 px-4">Role</th>
                        <th scope="col" className="py-3 px-4 text-right">Amount</th>
                        <th scope="col" className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
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

                        const isCompleted = item.status?.toLowerCase() === "completed";

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-900/60 transition-colors duration-150 group"
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
                                  <span className="text-[10px] font-mono text-slate-500 mt-1">
                                    #{item.id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Description */}
                            <td className="py-3.5 px-4 min-w-[180px]">
                              <p className="text-slate-200 font-medium leading-snug line-clamp-2">
                                {item.description || "-"}
                              </p>
                              {item.email && item.email !== "N/A" && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {item.email}
                                </p>
                              )}
                            </td>

                            {/* Date & Payment Method */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                              <p className="text-xs text-slate-300 font-medium">{item.date || "-"}</p>
                              {item.payment_method && (
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  {item.payment_method}
                                </span>
                              )}
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-medium">
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
                                isCompleted
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
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
            </div>
          )}

          {/* INVESTORS LIST VIEW (FOR MANAGER) */}
          {modalType === 'investors_list' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <Users size={16} className="text-teal-400" /> Assigned Investors under {targetUser.name}
              </h4>
              {fetchingData ? (
                <div className="py-8 text-center text-slate-400 font-medium">Loading investors from backend...</div>
              ) : fetchError && investorsList.length === 0 ? (
                <div className="py-4 text-center text-rose-400 font-medium">{fetchError}</div>
              ) : investorsList.length === 0 ? (
                <div className="py-8 text-center text-slate-500 font-medium">No assigned investors found for this manager.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="pb-2 font-semibold">Investor ID</th>
                        <th className="pb-2 font-semibold">Name & Email</th>
                        <th className="pb-2 font-semibold">Invested</th>
                        <th className="pb-2 text-right font-semibold">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {investorsList.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 font-mono text-blue-400">{inv.id}</td>
                          <td className="py-2.5">
                            <div className="font-bold text-slate-200">{inv.name}</div>
                            <div className="text-[11px] text-slate-400">{inv.email}</div>
                          </td>
                          <td className="py-2.5 text-slate-200 font-semibold">{inv.invested}</td>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Amount ($ USD)
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
                  <DollarSign size={16} className="text-slate-400" />
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent border-none text-white outline-none w-full text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Admin Note / Reference Reason
                </label>
                <textarea 
                  rows={3}
                  placeholder={`Enter details for ${modalType} operation...`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                    modalType === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20' :
                    modalType === 'withdraw' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20' :
                    modalType === 'credit-in' ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20' :
                    'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                  }`}
                >
                  Confirm {modalType.toUpperCase()}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* MODAL FOOTER FOR NON-FORM VIEWS */}
        {(modalType === 'history' || modalType === 'investors_list') && (
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
            <button 
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
