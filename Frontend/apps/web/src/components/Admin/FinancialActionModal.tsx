import React, { useState } from 'react';
import { 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Users, 
  CheckCircle2, 
  DollarSign, 
  Building, 
  ShieldAlert,
  Wallet
} from 'lucide-react';

export type FinancialModalType = 'deposit' | 'withdraw' | 'credit-in' | 'credit-out' | 'history' | 'investors_list' | null;

export interface FinancialUserTarget {
  id: string;
  name: string;
  email: string;
  accountId: string;
  balance: string;
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

  const dummyHistory = [
    { id: 'TX-101', type: 'Deposit', amount: '+$5,000.00', status: 'Completed', date: 'Jul 20, 2026' },
    { id: 'TX-102', type: 'Credit-In', amount: '+$500.00', status: 'Approved', date: 'Jul 24, 2026' },
    { id: 'TX-103', type: 'Withdrawal', amount: '-$1,200.00', status: 'Completed', date: 'Jul 28, 2026' },
    { id: 'TX-104', type: 'Profit Share', amount: '+$850.00', status: 'Processed', date: 'Jul 30, 2026' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
        
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
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Current Balance:</span> <strong className="text-emerald-400 font-bold text-sm ml-1">{targetUser.balance}</strong>
          </div>
          {targetUser.profit && (
            <div>
              <span className="text-slate-400">Total Profit:</span> <strong className="text-blue-400 font-bold text-sm ml-1">{targetUser.profit}</strong>
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="p-6 text-xs">
          
          {/* HISTORY VIEW */}
          {modalType === 'history' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200">Recent Transaction & Credit Logs</h4>
              <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
                {dummyHistory.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">{item.type} <span className="text-[11px] text-slate-400 font-mono">({item.id})</span></div>
                      <div className="text-[11px] text-slate-400">{item.date}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${item.amount.startsWith('+') ? 'text-emerald-400' : 'text-blue-400'}`}>{item.amount}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVESTORS LIST VIEW (FOR MANAGER) */}
          {modalType === 'investors_list' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <Users size={16} className="text-teal-400" /> Assigned Investors under {targetUser.name}
              </h4>
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
                    {(targetUser.investors || [
                      { id: 'INV-101', name: 'Elena Rostova', email: 'elena.r@example.com', invested: '$25,000', profit: '+$3,400' },
                      { id: 'INV-102', name: 'Apex Edu Capital', email: 'apex@example.com', invested: '$50,000', profit: '+$7,200' },
                    ]).map((inv) => (
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
