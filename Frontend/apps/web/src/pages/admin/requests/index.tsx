import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  FileText, 
  User, 
  Building, 
  Wallet, 
  Search, 
  ExternalLink,
  ShieldAlert,
  DollarSign,
  Eye,
  Check,
  X,
  Sparkles,
  FileCheck,
  CreditCard
} from 'lucide-react';

export type RequestTab = 'deposit' | 'withdraw' | 'documents' | 'profile' | 'bank' | 'crypto';

interface BaseRequest {
  id: string;
  requesterName: string;
  requesterEmail: string;
  avatar: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  priority?: 'High' | 'Normal';
}

interface DepositRequest extends BaseRequest {
  amount: string;
  method: 'Bank Wire Transfer' | 'USDT-TRC20' | 'Credit Card';
  referenceNo: string;
  proofUrl?: string;
}

interface WithdrawRequest extends BaseRequest {
  amount: string;
  availableBalance: string;
  payoutDestination: string;
  method: 'Bank Transfer' | 'Crypto USDT';
}

interface DocumentRequest extends BaseRequest {
  documentType: 'Passport' | 'National ID' | 'Utility Bill' | 'Proof of Address';
  docNumber: string;
  fileName: string;
}

interface ProfileRequest extends BaseRequest {
  fieldToUpdate: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
}

interface BankRequest extends BaseRequest {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  swiftCode: string;
}

interface CryptoRequest extends BaseRequest {
  network: 'USDT-TRC20' | 'USDT-ERC20' | 'BTC Network';
  walletAddress: string;
  label: string;
}

export type SelectedRequestUnion = 
  | { type: 'deposit'; data: DepositRequest }
  | { type: 'withdraw'; data: WithdrawRequest }
  | { type: 'documents'; data: DocumentRequest }
  | { type: 'profile'; data: ProfileRequest }
  | { type: 'bank'; data: BankRequest }
  | { type: 'crypto'; data: CryptoRequest }
  | null;

export default function AdminPendingRequestsPage() {
  const [activeTab, setActiveTab] = useState<RequestTab>('deposit');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Detail Modal State
  const [selectedDetail, setSelectedDetail] = useState<SelectedRequestUnion>(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const fetchTab = async (endpoint: string) => {
          const res = await fetch(endpoint);
          const data = await res.json();
          return data.status === 'ok' ? data.requests || [] : [];
        };

        const [deps, withs, docs, profs, bnks, cryps] = await Promise.all([
          fetchTab('/api/admin/requests/deposits'),
          fetchTab('/api/admin/requests/withdrawals'),
          fetchTab('/api/admin/requests/documents'),
          fetchTab('/api/admin/requests/profiles'),
          fetchTab('/api/admin/requests/banks'),
          fetchTab('/api/admin/requests/cryptos'),
        ]);

        setDeposits(deps);
        setWithdrawals(withs);
        setDocuments(docs);
        setProfiles(profs);
        setBanks(bnks);
        setCryptos(cryps);
      } catch (err) {
        console.error("Failed to load requests data:", err);
      }
    };
    loadData();
  }, []);

  // State for all 6 request categories
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [profiles, setProfiles] = useState<ProfileRequest[]>([]);
  const [banks, setBanks] = useState<BankRequest[]>([]);
  const [cryptos, setCryptos] = useState<CryptoRequest[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const closeModal = () => setSelectedDetail(null);

  // Status handlers with Toast and Modal dismissal
  const updateDepositStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setDeposits(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    closeModal();
    showToast(`Deposit ${id} ${newStatus.toLowerCase()} successfully.`);
  };

  const updateWithdrawStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setWithdrawals(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    closeModal();
    showToast(`Withdrawal ${id} ${newStatus.toLowerCase()} successfully.`);
  };

  const updateDocStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setDocuments(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    closeModal();
    showToast(`Document ${id} ${newStatus.toLowerCase()} successfully.`);
  };

  const updateProfileStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setProfiles(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    closeModal();
    showToast(`Profile edit request ${id} ${newStatus.toLowerCase()}.`);
  };

  const updateBankStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setBanks(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    closeModal();
    showToast(`Bank account binding ${id} ${newStatus.toLowerCase()}.`);
  };

  const updateCryptoStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setCryptos(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    closeModal();
    showToast(`Crypto wallet binding ${id} ${newStatus.toLowerCase()}.`);
  };

  // Counts for tab badges
  const pendingDeposits = deposits.filter(d => d.status === 'Pending').length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending').length;
  const pendingDocs = documents.filter(doc => doc.status === 'Pending').length;
  const pendingProfiles = profiles.filter(p => p.status === 'Pending').length;
  const pendingBanks = banks.filter(b => b.status === 'Pending').length;
  const pendingCryptos = cryptos.filter(c => c.status === 'Pending').length;

  const totalPending = pendingDeposits + pendingWithdrawals + pendingDocs + pendingProfiles + pendingBanks + pendingCryptos;

  const totalDepositAmount = deposits
    .filter(d => d.status === 'Pending')
    .reduce((sum, d) => {
      const num = parseFloat(d.amount.replace(/[^0-9.-]+/g,""));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  const totalWithdrawAmount = withdrawals
    .filter(w => w.status === 'Pending')
    .reduce((sum, w) => {
      const num = parseFloat(w.amount.replace(/[^0-9.-]+/g,""));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  const formatVal = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <>
      <Head>
        <title>Pending Requests | Admin Portal</title>
      </Head>

        <div className="p-6 md:p-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
                <Clock size={13} /> Approvals & Verification Queue
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Pending Requests</h1>
              <p className="text-slate-400 text-sm mt-1">Review requests across tabs. Click "View Details" to inspect full data and approve or reject.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search request ID or user..."
                  className="bg-transparent border-none text-xs text-white outline-none w-48 placeholder-slate-500" 
                />
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">Total Pending Items</div>
                <div className="text-3xl font-black text-amber-400 mt-1">{totalPending} Items</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">Pending Deposits</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">{formatVal(totalDepositAmount)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ArrowDownCircle size={24} />
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">Pending Withdrawals</div>
                <div className="text-3xl font-black text-blue-400 mt-1">{formatVal(totalWithdrawAmount)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <ArrowUpCircle size={24} />
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">KYC Documents</div>
                <div className="text-3xl font-black text-purple-400 mt-1">{pendingDocs} Verification</div>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FileText size={24} />
              </div>
            </div>
          </div>

          {/* MAIN TAB NAVIGATION BAR */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-2 mb-8 shadow-xl">
            <div className="flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
              
              {/* TAB 1: DEPOSIT */}
              <button
                onClick={() => setActiveTab('deposit')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
                  activeTab === 'deposit' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowDownCircle size={16} />
                  <span>Deposit</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'deposit' ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'}`}>
                  {pendingDeposits}
                </span>
              </button>

              {/* TAB 2: WITHDRAW */}
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
                  activeTab === 'withdraw' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowUpCircle size={16} />
                  <span>Withdraw</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'withdraw' ? 'bg-white/20 text-white' : 'bg-slate-800 text-blue-400'}`}>
                  {pendingWithdrawals}
                </span>
              </button>

              {/* TAB 3: DOCUMENTS */}
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
                  activeTab === 'documents' 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>Documents</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'documents' ? 'bg-white/20 text-white' : 'bg-slate-800 text-purple-400'}`}>
                  {pendingDocs}
                </span>
              </button>

              {/* TAB 4: PROFILE */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
                  activeTab === 'profile' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span>Profile</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'profile' ? 'bg-white/20 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                  {pendingProfiles}
                </span>
              </button>

              {/* TAB 5: BANK */}
              <button
                onClick={() => setActiveTab('bank')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
                  activeTab === 'bank' 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building size={16} />
                  <span>Bank</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'bank' ? 'bg-white/20 text-white' : 'bg-slate-800 text-teal-400'}`}>
                  {pendingBanks}
                </span>
              </button>

              {/* TAB 6: CRYPTO */}
              <button
                onClick={() => setActiveTab('crypto')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
                  activeTab === 'crypto' 
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet size={16} />
                  <span>Crypto</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'crypto' ? 'bg-white/20 text-white' : 'bg-slate-800 text-amber-400'}`}>
                  {pendingCryptos}
                </span>
              </button>

            </div>
          </div>

          {/* TAB LIST CARDS WITH VIEW DETAILS BUTTON */}

          {/* 1. DEPOSIT LIST */}
          {activeTab === 'deposit' && (
            <div className="space-y-4">
              {deposits.filter(d => d.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toLowerCase().includes(searchTerm.toLowerCase())).map((d) => (
                <div 
                  key={d.id}
                  className={`bg-slate-900/70 border rounded-3xl p-6 shadow-xl transition-all ${
                    d.status === 'Approved' ? 'border-emerald-500/40 bg-emerald-500/5' : d.status === 'Rejected' ? 'border-red-500/40 bg-red-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-xs">
                    <div className="flex items-start gap-4">
                      <img src={d.avatar} alt={d.requesterName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-white text-base">{d.requesterName}</span>
                          <span className="font-mono text-blue-400">({d.id})</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            {d.method}
                          </span>
                        </div>
                        <p className="text-slate-300 mb-2">Reference: <strong className="text-slate-100 font-mono">{d.referenceNo}</strong></p>
                        <div className="text-[11px] text-slate-400">Submitted {d.date}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end lg:self-center">
                      <div className="text-right">
                        <div className="text-slate-400 text-[11px]">Deposit Amount</div>
                        <div className="text-2xl font-black text-emerald-400">{d.amount}</div>
                      </div>

                      {d.status === 'Pending' ? (
                        <button 
                          onClick={() => setSelectedDetail({ type: 'deposit', data: d })}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
                        >
                          <Eye size={16} /> View Details & Action
                        </button>
                      ) : (
                        <span className={`px-4 py-2 rounded-xl font-bold border ${d.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                          {d.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. WITHDRAW LIST */}
          {activeTab === 'withdraw' && (
            <div className="space-y-4">
              {withdrawals.filter(w => w.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || w.id.toLowerCase().includes(searchTerm.toLowerCase())).map((w) => (
                <div 
                  key={w.id}
                  className={`bg-slate-900/70 border rounded-3xl p-6 shadow-xl transition-all ${
                    w.status === 'Approved' ? 'border-emerald-500/40 bg-emerald-500/5' : w.status === 'Rejected' ? 'border-red-500/40 bg-red-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-xs">
                    <div className="flex items-start gap-4">
                      <img src={w.avatar} alt={w.requesterName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-white text-base">{w.requesterName}</span>
                          <span className="font-mono text-blue-400">({w.id})</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                            {w.method}
                          </span>
                        </div>
                        <p className="text-slate-300 mb-1">Destination: <strong className="text-slate-100">{w.payoutDestination}</strong></p>
                        <div className="text-[11px] text-slate-400">Submitted {w.date}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end lg:self-center">
                      <div className="text-right">
                        <div className="text-slate-400 text-[11px]">Requested Payout</div>
                        <div className="text-2xl font-black text-blue-400">{w.amount}</div>
                      </div>

                      {w.status === 'Pending' ? (
                        <button 
                          onClick={() => setSelectedDetail({ type: 'withdraw', data: w })}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
                        >
                          <Eye size={16} /> View Details & Action
                        </button>
                      ) : (
                        <span className={`px-4 py-2 rounded-xl font-bold border ${w.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                          {w.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. DOCUMENTS LIST */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {documents.filter(doc => doc.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
                <div 
                  key={doc.id}
                  className={`bg-slate-900/70 border rounded-3xl p-6 shadow-xl transition-all ${
                    doc.status === 'Approved' ? 'border-emerald-500/40 bg-emerald-500/5' : doc.status === 'Rejected' ? 'border-red-500/40 bg-red-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-xs">
                    <div className="flex items-start gap-4">
                      <img src={doc.avatar} alt={doc.requesterName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-white text-base">{doc.requesterName}</span>
                          <span className="font-mono text-blue-400">({doc.id})</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                            {doc.documentType}
                          </span>
                        </div>
                        <p className="text-slate-300 mb-1">Doc Number: <strong className="text-slate-100 font-mono">{doc.docNumber}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end lg:self-center">
                      {doc.status === 'Pending' ? (
                        <button 
                          onClick={() => setSelectedDetail({ type: 'documents', data: doc })}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
                        >
                          <Eye size={16} /> View Details & Action
                        </button>
                      ) : (
                        <span className={`px-4 py-2 rounded-xl font-bold border ${doc.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                          {doc.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. PROFILE LIST */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {profiles.filter(p => p.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                <div 
                  key={p.id}
                  className={`bg-slate-900/70 border rounded-3xl p-6 shadow-xl transition-all ${
                    p.status === 'Approved' ? 'border-emerald-500/40 bg-emerald-500/5' : p.status === 'Rejected' ? 'border-red-500/40 bg-red-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-xs">
                    <div className="flex items-start gap-4">
                      <img src={p.avatar} alt={p.requesterName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-white text-base">{p.requesterName}</span>
                          <span className="font-mono text-blue-400">({p.id})</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                            Update {p.fieldToUpdate}
                          </span>
                        </div>
                        <p className="text-slate-300">Requested Change: <strong className="text-emerald-400 font-bold">{p.requestedValue}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end lg:self-center">
                      {p.status === 'Pending' ? (
                        <button 
                          onClick={() => setSelectedDetail({ type: 'profile', data: p })}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
                        >
                          <Eye size={16} /> View Details & Action
                        </button>
                      ) : (
                        <span className={`px-4 py-2 rounded-xl font-bold border ${p.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                          {p.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. BANK LIST */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              {banks.filter(b => b.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase())).map((b) => (
                <div 
                  key={b.id}
                  className={`bg-slate-900/70 border rounded-3xl p-6 shadow-xl transition-all ${
                    b.status === 'Approved' ? 'border-emerald-500/40 bg-emerald-500/5' : b.status === 'Rejected' ? 'border-red-500/40 bg-red-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-xs">
                    <div className="flex items-start gap-4">
                      <img src={b.avatar} alt={b.requesterName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-white text-base">{b.requesterName}</span>
                          <span className="font-mono text-blue-400">({b.id})</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">
                            {b.bankName}
                          </span>
                        </div>
                        <p className="text-slate-300">Account Mask: <strong className="text-slate-100 font-mono">{b.accountNumber}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end lg:self-center">
                      {b.status === 'Pending' ? (
                        <button 
                          onClick={() => setSelectedDetail({ type: 'bank', data: b })}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
                        >
                          <Eye size={16} /> View Details & Action
                        </button>
                      ) : (
                        <span className={`px-4 py-2 rounded-xl font-bold border ${b.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                          {b.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. CRYPTO LIST */}
          {activeTab === 'crypto' && (
            <div className="space-y-4">
              {cryptos.filter(c => c.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                <div 
                  key={c.id}
                  className={`bg-slate-900/70 border rounded-3xl p-6 shadow-xl transition-all ${
                    c.status === 'Approved' ? 'border-emerald-500/40 bg-emerald-500/5' : c.status === 'Rejected' ? 'border-red-500/40 bg-red-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-xs">
                    <div className="flex items-start gap-4">
                      <img src={c.avatar} alt={c.requesterName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-white text-base">{c.requesterName}</span>
                          <span className="font-mono text-blue-400">({c.id})</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                            {c.network}
                          </span>
                        </div>
                        <p className="text-slate-300 font-mono">Address: <strong className="text-emerald-400">{c.walletAddress}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end lg:self-center">
                      {c.status === 'Pending' ? (
                        <button 
                          onClick={() => setSelectedDetail({ type: 'crypto', data: c })}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
                        >
                          <Eye size={16} /> View Details & Action
                        </button>
                      ) : (
                        <span className={`px-4 py-2 rounded-xl font-bold border ${c.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                          {c.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      {/* POPUP MODAL FOR REQUEST DETAIL VIEW & APPROVE / REJECT ACTIONS */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
            
            {/* POPUP HEADER */}
            <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={selectedDetail.data.avatar} alt={selectedDetail.data.requesterName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/40" />
                <div>
                  <h3 className="font-bold text-white text-base">{selectedDetail.data.requesterName}</h3>
                  <p className="text-xs text-slate-400">{selectedDetail.data.id} • {selectedDetail.data.requesterEmail}</p>
                </div>
              </div>

              <button 
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* POPUP BODY FOR EACH TYPE */}
            <div className="p-6 text-xs space-y-4">
              
              {/* DEPOSIT MODAL BODY */}
              {selectedDetail.type === 'deposit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <div className="text-slate-400 text-[11px]">Deposit Method</div>
                      <div className="font-bold text-emerald-400 text-sm">{selectedDetail.data.method}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-[11px]">Deposit Amount</div>
                      <div className="text-2xl font-black text-emerald-400">{selectedDetail.data.amount}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Reference / Tx Hash:</span>
                      <span className="font-mono text-white font-bold">{selectedDetail.data.referenceNo}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Submission Date:</span>
                      <span className="text-slate-200">{selectedDetail.data.date}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Payment Receipt Slip</span>
                    <button className="flex items-center gap-1 text-blue-400 hover:underline font-semibold">
                      <Eye size={14} /> Preview Payment Receipt PDF
                    </button>
                  </div>
                </div>
              )}

              {/* WITHDRAW MODAL BODY */}
              {selectedDetail.type === 'withdraw' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <div className="text-slate-400 text-[11px]">Payout Method</div>
                      <div className="font-bold text-blue-400 text-sm">{selectedDetail.data.method}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-[11px]">Requested Payout</div>
                      <div className="text-2xl font-black text-blue-400">{selectedDetail.data.amount}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">User Available Balance:</span>
                      <span className="font-bold text-emerald-400">{selectedDetail.data.availableBalance}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Payout Destination:</span>
                      <span className="font-bold text-white">{selectedDetail.data.payoutDestination}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCUMENTS MODAL BODY */}
              {selectedDetail.type === 'documents' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Document Type:</span>
                      <span className="font-bold text-purple-400 text-sm">{selectedDetail.data.documentType}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Document Serial / ID:</span>
                      <span className="font-mono text-white font-bold">{selectedDetail.data.docNumber}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">File Name:</span>
                      <span className="text-slate-200">{selectedDetail.data.fileName}</span>
                    </div>
                  </div>

                  <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 border-dashed text-center flex flex-col items-center justify-center gap-2">
                    <FileCheck size={36} className="text-purple-400" />
                    <span className="font-semibold text-slate-200">KYC Document Attachment Loaded</span>
                    <button className="flex items-center gap-1.5 text-blue-400 hover:underline text-xs font-semibold mt-1">
                      <ExternalLink size={14} /> Open High Resolution Document
                    </button>
                  </div>
                </div>
              )}

              {/* PROFILE MODAL BODY */}
              {selectedDetail.type === 'profile' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="text-indigo-400 font-bold text-sm">Update Field: {selectedDetail.data.fieldToUpdate}</div>
                    
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[11px]">Current Old Record:</div>
                      <div className="text-red-400 font-bold line-through">{selectedDetail.data.currentValue}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[11px]">Requested New Record:</div>
                      <div className="text-emerald-400 font-bold text-sm">{selectedDetail.data.requestedValue}</div>
                    </div>

                    <div className="text-slate-400 text-[11px]">User Reason: {selectedDetail.data.reason}</div>
                  </div>
                </div>
              )}

              {/* BANK MODAL BODY */}
              {selectedDetail.type === 'bank' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Bank Name:</span>
                      <span className="font-bold text-teal-400 text-sm">{selectedDetail.data.bankName}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Account Holder Name:</span>
                      <span className="font-bold text-white">{selectedDetail.data.accountHolder}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Account Number / IBAN:</span>
                      <span className="font-mono text-white font-bold">{selectedDetail.data.accountNumber}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">SWIFT / BIC Code:</span>
                      <span className="font-mono text-teal-400 font-bold">{selectedDetail.data.swiftCode}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CRYPTO MODAL BODY */}
              {selectedDetail.type === 'crypto' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Blockchain Network:</span>
                      <span className="font-bold text-amber-400 text-sm">{selectedDetail.data.network}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Wallet Address:</span>
                      <span className="font-mono text-emerald-400 font-bold">{selectedDetail.data.walletAddress}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Wallet Tag / Label:</span>
                      <span className="text-slate-200">{selectedDetail.data.label}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* POPUP FOOTER WITH APPROVE / REJECT BUTTONS */}
            <div className="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
              <button 
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Close Without Action
              </button>

              <div className="flex items-center gap-3">
                {/* REJECT BUTTON */}
                <button 
                  onClick={() => {
                    if (selectedDetail.type === 'deposit') updateDepositStatus(selectedDetail.data.id, 'Rejected');
                    if (selectedDetail.type === 'withdraw') updateWithdrawStatus(selectedDetail.data.id, 'Rejected');
                    if (selectedDetail.type === 'documents') updateDocStatus(selectedDetail.data.id, 'Rejected');
                    if (selectedDetail.type === 'profile') updateProfileStatus(selectedDetail.data.id, 'Rejected');
                    if (selectedDetail.type === 'bank') updateBankStatus(selectedDetail.data.id, 'Rejected');
                    if (selectedDetail.type === 'crypto') updateCryptoStatus(selectedDetail.data.id, 'Rejected');
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all"
                >
                  <X size={16} /> Reject Request
                </button>

                {/* APPROVE BUTTON */}
                <button 
                  onClick={() => {
                    if (selectedDetail.type === 'deposit') updateDepositStatus(selectedDetail.data.id, 'Approved');
                    if (selectedDetail.type === 'withdraw') updateWithdrawStatus(selectedDetail.data.id, 'Approved');
                    if (selectedDetail.type === 'documents') updateDocStatus(selectedDetail.data.id, 'Approved');
                    if (selectedDetail.type === 'profile') updateProfileStatus(selectedDetail.data.id, 'Approved');
                    if (selectedDetail.type === 'bank') updateBankStatus(selectedDetail.data.id, 'Approved');
                    if (selectedDetail.type === 'crypto') updateCryptoStatus(selectedDetail.data.id, 'Approved');
                  }}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20"
                >
                  <Check size={16} /> Approve Request
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
