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
  documentType: string;
  docNumber: string;
  fileName: string;
  previewUrl?: string | null;
}

interface ProfileRequest extends BaseRequest {
  fieldToUpdate: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
  profileFields?: Array<{ label: string; value: string }>;
  profileSummary?: string;
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

const REQUEST_ENDPOINTS: Record<RequestTab, string> = {
  deposit: '/api/admin/requests/deposits',
  withdraw: '/api/admin/requests/withdrawals',
  documents: '/api/admin/requests/documents',
  profile: '/api/admin/requests/profiles',
  bank: '/api/admin/requests/banks',
  crypto: '/api/admin/requests/cryptos',
};

type RequestCounts = Record<RequestTab, number>;

export default function AdminPendingRequestsPage() {
  const [activeTab, setActiveTab] = useState<RequestTab>('deposit');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [requestCounts, setRequestCounts] = useState<RequestCounts>({
    deposit: 0,
    withdraw: 0,
    documents: 0,
    profile: 0,
    bank: 0,
    crypto: 0,
  });

  // Selected Detail Modal State
  const [selectedDetail, setSelectedDetail] = useState<SelectedRequestUnion>(null);

  const getDocumentPreviewKind = (value: string | null | undefined) => {
    const lower = String(value || '').toLowerCase();
    if (lower.endsWith('.pdf')) {
      return 'pdf';
    }
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower)) {
      return 'image';
    }
    return 'other';
  };

  const loadActiveTabData = async (tab: RequestTab = activeTab) => {
    try {
      const endpoint = REQUEST_ENDPOINTS[tab];
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      const requests = data.status === 'ok' ? data.requests || [] : [];

      if (tab === 'deposit') {
        setDeposits(requests);
      } else if (tab === 'withdraw') {
        setWithdrawals(requests);
      } else if (tab === 'documents') {
        setDocuments(requests);
      } else if (tab === 'profile') {
        setProfiles(requests);
      } else if (tab === 'bank') {
        setBanks(requests);
      } else if (tab === 'crypto') {
        setCryptos(requests);
      }
    } catch (err) {
      console.error(`Failed to load ${tab} requests data:`, err);
    }
  };

  const loadRequestCounts = async () => {
    try {
      const res = await fetch('/api/admin/requests/summary', { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'ok') {
        setRequestCounts({
          deposit: Number(data.summary?.deposit || 0),
          withdraw: Number(data.summary?.withdraw || 0),
          documents: Number(data.summary?.documents || 0),
          profile: Number(data.summary?.profile || 0),
          bank: Number(data.summary?.bank || 0),
          crypto: Number(data.summary?.crypto || 0),
        });
      }
    } catch (err) {
      console.error('Failed to load requests summary:', err);
    }
  };

  React.useEffect(() => {
    void loadRequestCounts();
  }, []);

  React.useEffect(() => {
    void loadActiveTabData(activeTab);
  }, [activeTab]);

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

  const formatRequestTypeLabel = (type: RequestTab) => {
    switch (type) {
      case 'deposit':
        return 'Deposit Request';
      case 'withdraw':
        return 'Withdrawal Request';
      case 'documents':
        return 'Document Request';
      case 'profile':
        return 'Profile Update';
      case 'bank':
        return 'Bank Account';
      case 'crypto':
        return 'Crypto Wallet';
      default:
        return 'Request';
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    newStatus: 'Approved' | 'Rejected',
    updateState: (status: 'Approved' | 'Rejected') => void,
    successMessage: string,
  ) => {
    try {
      const response = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}/decision`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to update request status.');
      }

      updateState((data?.request?.status as 'Approved' | 'Rejected' | undefined) || newStatus);
      await Promise.all([loadRequestCounts(), loadActiveTabData()]);
      closeModal();
      showToast(data?.message || successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update request status.';
      showToast(message);
    }
  };

  // Status handlers with Toast and Modal dismissal
  const updateDepositStatus = (id: string, newStatus: 'Approved' | 'Rejected') =>
    updateRequestStatus(
      id,
      newStatus,
      (status) => setDeposits(prev => prev.map(item => item.id === id ? { ...item, status } : item)),
      `Deposit ${id} ${newStatus.toLowerCase()} successfully.`,
    );

  const updateWithdrawStatus = (id: string, newStatus: 'Approved' | 'Rejected') =>
    updateRequestStatus(
      id,
      newStatus,
      (status) => setWithdrawals(prev => prev.map(item => item.id === id ? { ...item, status } : item)),
      `Withdrawal ${id} ${newStatus.toLowerCase()} successfully.`,
    );

  const updateDocStatus = (id: string, newStatus: 'Approved' | 'Rejected') =>
    updateRequestStatus(
      id,
      newStatus,
      (status) => setDocuments(prev => prev.map(item => item.id === id ? { ...item, status } : item)),
      `Document ${id} ${newStatus.toLowerCase()} successfully.`,
    );

  const updateProfileStatus = (id: string, newStatus: 'Approved' | 'Rejected') =>
    updateRequestStatus(
      id,
      newStatus,
      (status) => setProfiles(prev => prev.map(item => item.id === id ? { ...item, status } : item)),
      `Profile edit request ${id} ${newStatus.toLowerCase()}.`,
    );

  const updateBankStatus = (id: string, newStatus: 'Approved' | 'Rejected') =>
    updateRequestStatus(
      id,
      newStatus,
      (status) => setBanks(prev => prev.map(item => item.id === id ? { ...item, status } : item)),
      `Bank account binding ${id} ${newStatus.toLowerCase()}.`,
    );

  const updateCryptoStatus = (id: string, newStatus: 'Approved' | 'Rejected') =>
    updateRequestStatus(
      id,
      newStatus,
      (status) => setCryptos(prev => prev.map(item => item.id === id ? { ...item, status } : item)),
      `Crypto wallet binding ${id} ${newStatus.toLowerCase()}.`,
    );

  // Counts for tab badges
  const pendingDeposits = requestCounts.deposit;
  const pendingWithdrawals = requestCounts.withdraw;
  const pendingDocs = requestCounts.documents;
  const pendingProfiles = requestCounts.profile;
  const pendingBanks = requestCounts.bank;
  const pendingCryptos = requestCounts.crypto;

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

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 mx-auto text-slate-100 max-w-7xl">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0b91f]/10 border border-[#f0b91f]/20 text-[#f0b91f] text-xs font-semibold mb-3">
                <Clock size={13} /> Approvals & Verification Queue
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-[linear-gradient(180deg,#f0b91f_0%,#c99508_100%)]"></div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Pending Requests</h1>
              </div>
              <p className="text-[#8db5ff] text-sm mt-2">Review requests across tabs. Click "View Details" to inspect full data and approve or reject.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-[#081d5f] px-4 py-2.5 rounded-2xl border border-[#214fbf] focus-within:border-[#3aa0ff] transition-all">
                <Search size={16} className="text-[#8db5ff] shrink-0" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search request ID or user..."
                  className="bg-transparent border-none text-xs text-white outline-none w-48 placeholder-[#8db5ff]" 
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
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <div className="bg-[#040f2d] border border-[#153d9f] rounded-[2rem] p-6 shadow-xl flex items-center justify-between transition-all hover:bg-[#0a205f]">
              <div>
                <div className="text-[#8db5ff] text-xs font-bold uppercase tracking-widest">Total Pending</div>
                <div className="text-3xl font-black text-white mt-1">{totalPending}</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-[#040f2d] border border-[#153d9f] rounded-[2rem] p-6 shadow-xl flex items-center justify-between transition-all hover:bg-[#0a205f]">
              <div>
                <div className="text-[#8db5ff] text-xs font-bold uppercase tracking-widest">Pending Deposits</div>
                <div className="text-3xl font-black text-white mt-1">{formatVal(totalDepositAmount)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ArrowDownCircle size={24} />
              </div>
            </div>

            <div className="bg-[#040f2d] border border-[#153d9f] rounded-[2rem] p-6 shadow-xl flex items-center justify-between transition-all hover:bg-[#0a205f]">
              <div>
                <div className="text-[#8db5ff] text-xs font-bold uppercase tracking-widest">Pending Withdraws</div>
                <div className="text-3xl font-black text-white mt-1">{formatVal(totalWithdrawAmount)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <ArrowUpCircle size={24} />
              </div>
            </div>

            <div className="bg-[#040f2d] border border-[#153d9f] rounded-[2rem] p-6 shadow-xl flex items-center justify-between transition-all hover:bg-[#0a205f]">
              <div>
                <div className="text-[#8db5ff] text-xs font-bold uppercase tracking-widest">KYC Documents</div>
                <div className="text-3xl font-black text-white mt-1">{pendingDocs}</div>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FileText size={24} />
              </div>
            </div>
          </div> */}

          {/* MAIN TAB NAVIGATION BAR */}
          <div className="bg-[#040f2d] border border-[#153d9f] rounded-3xl p-2 mb-8 shadow-xl">
            <div className="flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
              
              {/* TAB 1: DEPOSIT */}
              <button
                onClick={() => setActiveTab('deposit')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border ${
                  activeTab === 'deposit' 
                    ? 'bg-[#0b226a] border-[#2858cd] text-white shadow-lg' 
                    : 'border-transparent text-[#8db5ff] hover:text-white hover:bg-[#0b226a]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowDownCircle size={16} />
                  <span>Deposit</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'deposit' ? 'bg-[#2858cd] text-white' : 'bg-[#0b226a] text-[#8db5ff]'}`}>
                  {pendingDeposits}
                </span>
              </button>

              {/* TAB 2: WITHDRAW */}
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border ${
                  activeTab === 'withdraw' 
                    ? 'bg-[#0b226a] border-[#2858cd] text-white shadow-lg' 
                    : 'border-transparent text-[#8db5ff] hover:text-white hover:bg-[#0b226a]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowUpCircle size={16} />
                  <span>Withdraw</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'withdraw' ? 'bg-[#2858cd] text-white' : 'bg-[#0b226a] text-[#8db5ff]'}`}>
                  {pendingWithdrawals}
                </span>
              </button>

              {/* TAB 3: DOCUMENTS */}
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border ${
                  activeTab === 'documents' 
                    ? 'bg-[#0b226a] border-[#2858cd] text-white shadow-lg' 
                    : 'border-transparent text-[#8db5ff] hover:text-white hover:bg-[#0b226a]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCheck size={16} />
                  <span>Documents</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'documents' ? 'bg-[#2858cd] text-white' : 'bg-[#0b226a] text-[#8db5ff]'}`}>
                  {pendingDocs}
                </span>
              </button>

              {/* TAB 4: PROFILE */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border ${
                  activeTab === 'profile' 
                    ? 'bg-[#0b226a] border-[#2858cd] text-white shadow-lg' 
                    : 'border-transparent text-[#8db5ff] hover:text-white hover:bg-[#0b226a]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span>Profile</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'profile' ? 'bg-[#2858cd] text-white' : 'bg-[#0b226a] text-[#8db5ff]'}`}>
                  {pendingProfiles}
                </span>
              </button>

              {/* TAB 5: BANK */}
              <button
                onClick={() => setActiveTab('bank')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border ${
                  activeTab === 'bank' 
                    ? 'bg-[#0b226a] border-[#2858cd] text-white shadow-lg' 
                    : 'border-transparent text-[#8db5ff] hover:text-white hover:bg-[#0b226a]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building size={16} />
                  <span>Bank Accounts</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'bank' ? 'bg-[#2858cd] text-white' : 'bg-[#0b226a] text-[#8db5ff]'}`}>
                  {pendingBanks}
                </span>
              </button>

              {/* TAB 6: CRYPTO */}
              <button
                onClick={() => setActiveTab('crypto')}
                className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border ${
                  activeTab === 'crypto' 
                    ? 'bg-[#0b226a] border-[#2858cd] text-white shadow-lg' 
                    : 'border-transparent text-[#8db5ff] hover:text-white hover:bg-[#0b226a]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet size={16} />
                  <span>Crypto Wallets</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'crypto' ? 'bg-[#2858cd] text-white' : 'bg-[#0b226a] text-[#8db5ff]'}`}>
                  {pendingCryptos}
                </span>
              </button>

            </div>
          </div>

          {/* TAB LIST CARDS WITH VIEW DETAILS BUTTON */}

          {/* 1. DEPOSIT LIST */}
          {activeTab === 'deposit' && (
            <div className="overflow-x-auto bg-[#040f2d] rounded-3xl border border-[#153d9f] shadow-xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0b226a]">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">User / ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Method / Ref</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Date</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Amount</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#153d9f]">
                  {deposits.filter(d => d.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toLowerCase().includes(searchTerm.toLowerCase())).map((d) => (
                    <tr key={d.id} className="text-[#dbe8ff] hover:bg-[#0a205f] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={d.avatar} alt={d.requesterName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#153d9f] shrink-0" />
                          <div>
                            <div className="font-bold text-white text-sm">{d.requesterName}</div>
                            <div className="text-[11px] font-mono text-[#f0b91f]">{d.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0b226a] text-[#8db5ff] border border-[#214fbf] font-semibold text-xs mb-1 inline-block">
                          {d.method}
                        </span>
                        <div className="text-[11px] font-mono text-[#8db5ff]">{d.referenceNo}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#8db5ff]">{d.date}</td>
                      <td className="px-6 py-4 text-sm font-black text-white">{d.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${d.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : d.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedDetail({ type: 'deposit', data: d })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all bg-[#0b226a] hover:bg-[#102c7c] text-[#d7e5ff] border border-[#2858cd]"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {deposits.filter(d => d.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#8db5ff] text-sm">No deposits found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. WITHDRAW LIST */}
          {activeTab === 'withdraw' && (
            <div className="overflow-x-auto bg-[#040f2d] rounded-3xl border border-[#153d9f] shadow-xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0b226a]">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">User / ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Destination</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Date</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Amount</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#153d9f]">
                  {withdrawals.filter(w => w.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || w.id.toLowerCase().includes(searchTerm.toLowerCase())).map((w) => (
                    <tr key={w.id} className="text-[#dbe8ff] hover:bg-[#0a205f] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={w.avatar} alt={w.requesterName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#153d9f] shrink-0" />
                          <div>
                            <div className="font-bold text-white text-sm">{w.requesterName}</div>
                            <div className="text-[11px] font-mono text-[#f0b91f]">{w.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0b226a] text-[#8db5ff] border border-[#214fbf] font-semibold text-xs mb-1 inline-block">
                          {w.method}
                        </span>
                        <div className="text-[11px] font-mono text-[#8db5ff]">{w.payoutDestination}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#8db5ff]">{w.date}</td>
                      <td className="px-6 py-4 text-sm font-black text-white">{w.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${w.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : w.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedDetail({ type: 'withdraw', data: w })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all bg-[#0b226a] hover:bg-[#102c7c] text-[#d7e5ff] border border-[#2858cd]"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {withdrawals.filter(w => w.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || w.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#8db5ff] text-sm">No withdrawals found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. DOCUMENTS LIST */}
          {activeTab === 'documents' && (
            <div className="overflow-x-auto bg-[#040f2d] rounded-3xl border border-[#153d9f] shadow-xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0b226a]">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">User / ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Doc Type</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Doc Number</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#153d9f]">
                  {documents.filter(doc => doc.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
                    <tr key={doc.id} className="text-[#dbe8ff] hover:bg-[#0a205f] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={doc.avatar} alt={doc.requesterName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#153d9f] shrink-0" />
                          <div>
                            <div className="font-bold text-white text-sm">{doc.requesterName}</div>
                            <div className="text-[11px] font-mono text-[#f0b91f]">{doc.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0b226a] text-[#8db5ff] border border-[#214fbf] font-semibold text-xs inline-block">
                          {doc.documentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-white">{doc.docNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${doc.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : doc.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedDetail({ type: 'documents', data: doc })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all bg-[#0b226a] hover:bg-[#102c7c] text-[#d7e5ff] border border-[#2858cd]"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {documents.filter(doc => doc.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#8db5ff] text-sm">No documents found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. PROFILE LIST */}
          {activeTab === 'profile' && (
            <div className="overflow-x-auto bg-[#040f2d] rounded-3xl border border-[#153d9f] shadow-xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0b226a]">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">User / ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Field</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Requested Change</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#153d9f]">
                  {profiles.filter(p => p.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                    <tr key={p.id} className="text-[#dbe8ff] hover:bg-[#0a205f] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={p.avatar} alt={p.requesterName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#153d9f] shrink-0" />
                          <div>
                            <div className="font-bold text-white text-sm">{p.requesterName}</div>
                            <div className="text-[11px] font-mono text-[#f0b91f]">{p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0b226a] text-[#8db5ff] border border-[#214fbf] font-semibold text-xs inline-block">
                          {p.fieldToUpdate}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-400 font-bold">{p.profileSummary || p.requestedValue}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${p.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : p.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedDetail({ type: 'profile', data: p })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all bg-[#0b226a] hover:bg-[#102c7c] text-[#d7e5ff] border border-[#2858cd]"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {profiles.filter(p => p.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#8db5ff] text-sm">No profile requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. BANK LIST */}
          {activeTab === 'bank' && (
            <div className="overflow-x-auto bg-[#040f2d] rounded-3xl border border-[#153d9f] shadow-xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0b226a]">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">User / ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Bank Name</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Account Mask</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#153d9f]">
                  {banks.filter(b => b.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase())).map((b) => (
                    <tr key={b.id} className="text-[#dbe8ff] hover:bg-[#0a205f] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={b.avatar} alt={b.requesterName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#153d9f] shrink-0" />
                          <div>
                            <div className="font-bold text-white text-sm">{b.requesterName}</div>
                            <div className="text-[11px] font-mono text-[#f0b91f]">{b.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0b226a] text-[#8db5ff] border border-[#214fbf] font-semibold text-xs inline-block">
                          {b.bankName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-white">{b.accountNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${b.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : b.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedDetail({ type: 'bank', data: b })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all bg-[#0b226a] hover:bg-[#102c7c] text-[#d7e5ff] border border-[#2858cd]"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {banks.filter(b => b.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#8db5ff] text-sm">No bank accounts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. CRYPTO LIST */}
          {activeTab === 'crypto' && (
            <div className="overflow-x-auto bg-[#040f2d] rounded-3xl border border-[#153d9f] shadow-xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0b226a]">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">User / ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Network</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Wallet Address</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#9ec0ff]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#153d9f]">
                  {cryptos.filter(c => c.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                    <tr key={c.id} className="text-[#dbe8ff] hover:bg-[#0a205f] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={c.avatar} alt={c.requesterName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#153d9f] shrink-0" />
                          <div>
                            <div className="font-bold text-white text-sm">{c.requesterName}</div>
                            <div className="text-[11px] font-mono text-[#f0b91f]">{c.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0b226a] text-[#8db5ff] border border-[#214fbf] font-semibold text-xs inline-block">
                          {c.network}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-white">{c.walletAddress}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${c.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : c.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedDetail({ type: 'crypto', data: c })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all bg-[#0b226a] hover:bg-[#102c7c] text-[#d7e5ff] border border-[#2858cd]"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cryptos.filter(c => c.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#8db5ff] text-sm">No crypto wallets found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>

      {/* POPUP MODAL FOR REQUEST DETAIL VIEW & APPROVE / REJECT ACTIONS */}
      {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020817]/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#040f2d] border border-[#153d9f] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(11,34,106,0.3)]">
              <div className="sticky top-0 bg-[#040f2d]/95 backdrop-blur-sm border-b border-[#153d9f] px-6 py-5 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 rounded-full bg-[linear-gradient(180deg,#f0b91f_0%,#c99508_100%)]"></div>
                  <div>
                    <h2 className="text-lg font-black text-white">{formatRequestTypeLabel(selectedDetail.type)}</h2>
                    <p className="text-[#8db5ff] text-[11px] mt-0.5">ID: {selectedDetail.data.id}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-[#0b226a] rounded-full transition-colors text-[#8db5ff] hover:text-white">
                  <X size={20} />
                </button>
              </div>

            {/* POPUP BODY FOR EACH TYPE */}
            <div className="p-6 text-xs space-y-4">
              
              {/* DEPOSIT MODAL BODY */}
              {selectedDetail.type === 'deposit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Deposit Amount</div>
                      <div className="text-lg font-black text-white">{selectedDetail.data.amount}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Method</div>
                      <div className="text-sm font-bold text-white">{selectedDetail.data.method}</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                    <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Reference Number</div>
                    <div className="text-sm font-mono text-white break-all">{selectedDetail.data.referenceNo}</div>
                  </div>
                </div>
              )}

              {/* WITHDRAW MODAL BODY */}
              {selectedDetail.type === 'withdraw' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Requested Amount</div>
                      <div className="text-lg font-black text-white">{selectedDetail.data.amount}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Available Balance</div>
                      <div className="text-sm font-bold text-[#f0b91f]">{selectedDetail.data.availableBalance}</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                    <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Payout Destination ({selectedDetail.data.method})</div>
                    <div className="text-sm font-mono text-white break-all">{selectedDetail.data.payoutDestination}</div>
                  </div>
                </div>
              )}

              {/* DOCUMENTS MODAL BODY */}
              {selectedDetail.type === 'documents' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                    <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Preview Attached</span>
                      <a href={selectedDetail.data.previewUrl!} target="_blank" rel="noopener noreferrer" className="text-xs text-[#f0b91f] hover:underline flex items-center gap-1">
                        <ExternalLink size={12} /> Open Full
                      </a>
                    </div>
                    <div className="rounded-xl overflow-hidden bg-black/40 flex items-center justify-center min-h-[120px] p-2 border border-white/5">
                      {getDocumentPreviewKind(selectedDetail.data.previewUrl) === 'image' ? (
                        <img src={selectedDetail.data.previewUrl!} alt="Document Preview" className="max-h-64 object-contain rounded-lg" />
                      ) : (
                        <div className="text-center p-6">
                          <FileText size={32} className="text-[#8db5ff] mx-auto mb-2 opacity-60" />
                          <span className="text-xs text-white break-all">{selectedDetail.data.fileName}</span>
                          <a href={selectedDetail.data.previewUrl!} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b226a] hover:bg-[#102c7c] text-white text-xs font-bold border border-[#2858cd]">
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PROFILE MODAL BODY */}
              {selectedDetail.type === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f] flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Current Value</div>
                        <div className="text-sm text-[#8db5ff]/80 line-through">{selectedDetail.data.currentValue}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Requested Value</div>
                        <div className="text-sm font-bold text-emerald-400">{selectedDetail.data.requestedValue}</div>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Reason for change</div>
                      <div className="text-sm text-white italic">"{selectedDetail.data.reason}"</div>
                    </div>
                  </div>
                </div>
              )}

              {/* BANK MODAL BODY */}
              {selectedDetail.type === 'bank' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Bank Name</div>
                      <div className="text-sm font-black text-white">{selectedDetail.data.bankName}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Account Holder</div>
                      <div className="text-sm font-bold text-white">{selectedDetail.data.accountHolder}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Account Number</div>
                      <div className="text-sm font-mono text-[#f0b91f]">{selectedDetail.data.accountNumber}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">SWIFT / BIC</div>
                      <div className="text-sm font-mono text-white">{selectedDetail.data.swiftCode}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CRYPTO MODAL BODY */}
              {selectedDetail.type === 'crypto' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Network</div>
                      <div className="text-sm font-black text-white">{selectedDetail.data.network}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                      <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Tag / Label</div>
                      <div className="text-sm font-bold text-white">{selectedDetail.data.label}</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0b226a]/30 border border-[#153d9f]">
                    <div className="text-[10px] text-[#8db5ff] uppercase tracking-wider mb-1">Wallet Address</div>
                    <div className="text-sm font-mono text-[#f0b91f] break-all">{selectedDetail.data.walletAddress}</div>
                  </div>
                </div>
              )}

            </div>

            {/* POPUP FOOTER WITH APPROVE / REJECT BUTTONS */}
            <div className="p-6 bg-[#040f2d] border-t border-[#153d9f] rounded-b-3xl">
              <div className="flex items-center justify-end gap-3">
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
                  className="flex items-center gap-1.5 bg-[#0b226a] hover:bg-[#102c7c] text-[#d7e5ff] hover:text-red-400 border border-[#2858cd] hover:border-red-500/40 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md"
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
                  className="flex items-center gap-1.5 bg-[linear-gradient(180deg,#f0b91f_0%,#c99508_100%)] hover:opacity-90 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg"
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
