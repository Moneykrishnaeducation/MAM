import React, { useState, useEffect, useMemo } from 'react';
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
  Eye,
  Check,
  X,
  Sparkles,
  FileCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

/* ─── Cookie & Role Helpers ────────────────────────────── */
function getAdminRole(): string {
  try {
    const nameEQ = 'role=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        try {
          return decodeURIComponent(cookie.substring(nameEQ.length)).trim();
        } catch {
          return cookie.substring(nameEQ.length).trim();
        }
      }
    }
  } catch {}
  return '';
}

const isViewerOnly = (role: string) => role.toLowerCase() === 'viewer';

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
  const [adminRole, setAdminRole] = useState('');
  const [activeTab, setActiveTab] = useState<RequestTab>('deposit');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  const isViewer = useMemo(() => isViewerOnly(adminRole) || adminRole.toLowerCase() === 'viewer', [adminRole]);

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
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  useEffect(() => {
    void loadRequestCounts();
  }, []);

  useEffect(() => {
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
        return 'Document Verification';
      case 'profile':
        return 'Profile Update Request';
      case 'bank':
        return 'Bank Account Binding';
      case 'crypto':
        return 'Crypto Wallet Binding';
      default:
        return 'Pending Request';
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    newStatus: 'Approved' | 'Rejected',
    updateState: (status: 'Approved' | 'Rejected') => void,
    successMessage: string,
  ) => {
    if (isViewer) return;
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

  const getInitials = (name: string) => {
    if (!name || name === '-') return 'REQ';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <Head>
        <title>Pending Approvals & Verification Requests | Admin Portal</title>
      </Head>

      <div className="w-full text-slate-100 font-sans antialiased">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto p-3 sm:p-4 relative z-10 space-y-3.5">
          
          {/* HEADER BANNER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-blue-600/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-inner shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#e6c687] text-[9px] font-black uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" /> Approval Engine
                </div>
                <h1 className="text-lg font-black tracking-tight text-white uppercase">
                  Pending Request Management
                </h1>
                <p className="text-[11px] text-slate-400">
                  Review client deposit/withdrawal submissions, KYC identity proofs, profile edits, and payment destination updates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user or ID..."
                  className="bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37] transition-all w-48 sm:w-56" 
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { void loadRequestCounts(); void loadActiveTabData(activeTab); }}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all hover:border-[#d4af37]/40"
              >
                <RefreshCw size={13} className={loading ? "animate-spin text-[#d4af37]" : ""} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          {/* TAB NAVIGATION BAR */}
          <div className="flex items-center gap-1 p-1 rounded-xl border bg-slate-900/90 border-white/10 w-fit backdrop-blur-md overflow-x-auto max-w-full">
            
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'deposit' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ArrowDownCircle size={14} className={activeTab === 'deposit' ? 'text-[#d4af37]' : ''} />
              <span>Deposits</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${activeTab === 'deposit' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {pendingDeposits}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'withdraw' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ArrowUpCircle size={14} className={activeTab === 'withdraw' ? 'text-[#d4af37]' : ''} />
              <span>Withdrawals</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${activeTab === 'withdraw' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {pendingWithdrawals}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'documents' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileCheck size={14} className={activeTab === 'documents' ? 'text-[#d4af37]' : ''} />
              <span>Documents</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${activeTab === 'documents' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {pendingDocs}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'profile' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <User size={14} className={activeTab === 'profile' ? 'text-[#d4af37]' : ''} />
              <span>Profile Edits</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${activeTab === 'profile' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {pendingProfiles}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'bank' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Building size={14} className={activeTab === 'bank' ? 'text-[#d4af37]' : ''} />
              <span>Bank Accounts</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${activeTab === 'bank' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {pendingBanks}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('crypto')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'crypto' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Wallet size={14} className={activeTab === 'crypto' ? 'text-[#d4af37]' : ''} />
              <span>Crypto Wallets</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${activeTab === 'crypto' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {pendingCryptos}
              </span>
            </button>

          </div>

          {/* MAIN DATA TABLES */}
          <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 sm:p-4 shadow-xl">
            <div className="overflow-x-auto">
              
              {/* 1. DEPOSITS */}
              {activeTab === 'deposit' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                      <th className="pb-2 px-2.5">User / ID</th>
                      <th className="pb-2 px-2.5">Method & Ref</th>
                      <th className="pb-2 px-2.5">Date</th>
                      <th className="pb-2 px-2.5">Amount</th>
                      <th className="pb-2 px-2.5">Status</th>
                      <th className="pb-2 px-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {deposits.filter(d => d.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toLowerCase().includes(searchTerm.toLowerCase())).map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0">
                              {getInitials(d.requesterName)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100">{d.requesterName}</div>
                              <div className="text-[9px] font-mono text-[#d4af37]">{d.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-white/10 font-semibold text-[10px] inline-block mb-0.5">
                            {d.method}
                          </span>
                          <div className="text-[10px] font-mono text-slate-400">{d.referenceNo}</div>
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-400 font-mono text-[10px]">{d.date}</td>
                        <td className="py-2.5 px-2.5 text-sm font-black text-white">{d.amount}</td>
                        <td className="py-2.5 px-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            d.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : d.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'Approved' ? 'bg-emerald-400' : d.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <button 
                            onClick={() => setSelectedDetail({ type: 'deposit', data: d })}
                            className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                          >
                            <Eye size={13} className="text-[#d4af37]" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                    {deposits.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">No deposit requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 2. WITHDRAWALS */}
              {activeTab === 'withdraw' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                      <th className="pb-2 px-2.5">User / ID</th>
                      <th className="pb-2 px-2.5">Destination</th>
                      <th className="pb-2 px-2.5">Date</th>
                      <th className="pb-2 px-2.5">Amount</th>
                      <th className="pb-2 px-2.5">Status</th>
                      <th className="pb-2 px-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {withdrawals.filter(w => w.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || w.id.toLowerCase().includes(searchTerm.toLowerCase())).map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0">
                              {getInitials(w.requesterName)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100">{w.requesterName}</div>
                              <div className="text-[9px] font-mono text-[#d4af37]">{w.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-white/10 font-semibold text-[10px] inline-block mb-0.5">
                            {w.method}
                          </span>
                          <div className="text-[10px] font-mono text-slate-400">{w.payoutDestination}</div>
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-400 font-mono text-[10px]">{w.date}</td>
                        <td className="py-2.5 px-2.5 text-sm font-black text-white">{w.amount}</td>
                        <td className="py-2.5 px-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            w.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : w.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'Approved' ? 'bg-emerald-400' : w.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                            {w.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <button 
                            onClick={() => setSelectedDetail({ type: 'withdraw', data: w })}
                            className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                          >
                            <Eye size={13} className="text-[#d4af37]" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                    {withdrawals.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">No withdrawal requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 3. DOCUMENTS */}
              {activeTab === 'documents' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                      <th className="pb-2 px-2.5">User / ID</th>
                      <th className="pb-2 px-2.5">Doc Type</th>
                      <th className="pb-2 px-2.5">Doc Number</th>
                      <th className="pb-2 px-2.5">Status</th>
                      <th className="pb-2 px-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {documents.filter(doc => doc.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0">
                              {getInitials(doc.requesterName)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100">{doc.requesterName}</div>
                              <div className="text-[9px] font-mono text-[#d4af37]">{doc.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-white/10 font-semibold text-[10px] inline-block">
                            {doc.documentType}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-300 text-xs">{doc.docNumber}</td>
                        <td className="py-2.5 px-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            doc.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : doc.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${doc.status === 'Approved' ? 'bg-emerald-400' : doc.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <button 
                            onClick={() => setSelectedDetail({ type: 'documents', data: doc })}
                            className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                          >
                            <Eye size={13} className="text-[#d4af37]" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">No verification documents found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 4. PROFILE */}
              {activeTab === 'profile' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                      <th className="pb-2 px-2.5">User / ID</th>
                      <th className="pb-2 px-2.5">Field</th>
                      <th className="pb-2 px-2.5">Requested Change</th>
                      <th className="pb-2 px-2.5">Status</th>
                      <th className="pb-2 px-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {profiles.filter(p => p.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0">
                              {getInitials(p.requesterName)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100">{p.requesterName}</div>
                              <div className="text-[9px] font-mono text-[#d4af37]">{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-white/10 font-semibold text-[10px] inline-block">
                            {p.fieldToUpdate}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-xs text-emerald-400 font-bold">{p.profileSummary || p.requestedValue}</td>
                        <td className="py-2.5 px-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            p.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : p.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'Approved' ? 'bg-emerald-400' : p.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <button 
                            onClick={() => setSelectedDetail({ type: 'profile', data: p })}
                            className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                          >
                            <Eye size={13} className="text-[#d4af37]" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                    {profiles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">No profile edit requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 5. BANK ACCOUNTS */}
              {activeTab === 'bank' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                      <th className="pb-2 px-2.5">User / ID</th>
                      <th className="pb-2 px-2.5">Bank Name</th>
                      <th className="pb-2 px-2.5">Account Mask</th>
                      <th className="pb-2 px-2.5">Status</th>
                      <th className="pb-2 px-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {banks.filter(b => b.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase())).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0">
                              {getInitials(b.requesterName)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100">{b.requesterName}</div>
                              <div className="text-[9px] font-mono text-[#d4af37]">{b.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-white/10 font-semibold text-[10px] inline-block">
                            {b.bankName}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-300 text-xs">{b.accountNumber}</td>
                        <td className="py-2.5 px-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            b.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : b.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Approved' ? 'bg-emerald-400' : b.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <button 
                            onClick={() => setSelectedDetail({ type: 'bank', data: b })}
                            className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                          >
                            <Eye size={13} className="text-[#d4af37]" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                    {banks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">No bank account requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 6. CRYPTO WALLETS */}
              {activeTab === 'crypto' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                      <th className="pb-2 px-2.5">User / ID</th>
                      <th className="pb-2 px-2.5">Network</th>
                      <th className="pb-2 px-2.5">Wallet Address</th>
                      <th className="pb-2 px-2.5">Status</th>
                      <th className="pb-2 px-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {cryptos.filter(c => c.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0">
                              {getInitials(c.requesterName)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100">{c.requesterName}</div>
                              <div className="text-[9px] font-mono text-[#d4af37]">{c.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-white/10 font-semibold text-[10px] inline-block">
                            {c.network}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-300 text-xs">{c.walletAddress}</td>
                        <td className="py-2.5 px-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            c.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : c.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Approved' ? 'bg-emerald-400' : c.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <button 
                            onClick={() => setSelectedDetail({ type: 'crypto', data: c })}
                            className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                          >
                            <Eye size={13} className="text-[#d4af37]" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cryptos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">No crypto wallet requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

            </div>
          </div>

        </div>

        {/* POPUP MODAL FOR REQUEST DETAIL VIEW & APPROVE / REJECT ACTIONS */}
        {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center text-[#d4af37]">
                    <Eye size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-tight">{formatRequestTypeLabel(selectedDetail.type)}</h2>
                    <p className="text-[10px] font-mono text-[#d4af37]">Ref ID #{selectedDetail.data.id}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* POPUP BODY */}
              <div className="p-5 text-xs space-y-3.5">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Requester</div>
                    <div className="font-bold text-slate-100 text-sm">{selectedDetail.data.requesterName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{selectedDetail.data.requesterEmail}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    selectedDetail.data.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : selectedDetail.data.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {selectedDetail.data.status}
                  </span>
                </div>

                {/* DEPOSIT DETAILS */}
                {selectedDetail.type === 'deposit' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Deposit Amount</div>
                        <div className="text-base font-black text-white">{selectedDetail.data.amount}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Payment Method</div>
                        <div className="text-xs font-bold text-slate-200">{selectedDetail.data.method}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Reference Number</div>
                      <div className="text-xs font-mono text-[#d4af37] break-all font-bold">{selectedDetail.data.referenceNo}</div>
                    </div>
                  </div>
                )}

                {/* WITHDRAW DETAILS */}
                {selectedDetail.type === 'withdraw' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Requested Amount</div>
                        <div className="text-base font-black text-white">{selectedDetail.data.amount}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Available Balance</div>
                        <div className="text-xs font-bold text-[#d4af37]">{selectedDetail.data.availableBalance}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Payout Destination ({selectedDetail.data.method})</div>
                      <div className="text-xs font-mono text-slate-200 break-all">{selectedDetail.data.payoutDestination}</div>
                    </div>
                  </div>
                )}

                {/* DOCUMENTS DETAILS */}
                {selectedDetail.type === 'documents' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Attached Verification Document</span>
                        {selectedDetail.data.previewUrl && (
                          <a href={selectedDetail.data.previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#d4af37] hover:underline flex items-center gap-1">
                            <ExternalLink size={12} /> Open Full
                          </a>
                        )}
                      </div>
                      <div className="rounded-xl overflow-hidden bg-black/50 flex items-center justify-center min-h-[100px] p-2 border border-white/5">
                        {getDocumentPreviewKind(selectedDetail.data.previewUrl) === 'image' ? (
                          <img src={selectedDetail.data.previewUrl!} alt="Document Preview" className="max-h-56 object-contain rounded-lg" />
                        ) : (
                          <div className="text-center p-4">
                            <FileText size={28} className="text-[#d4af37] mx-auto mb-1.5" />
                            <span className="text-xs text-slate-200 break-all">{selectedDetail.data.fileName}</span>
                            {selectedDetail.data.previewUrl && (
                              <a href={selectedDetail.data.previewUrl} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-white/10">
                                View File
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PROFILE DETAILS */}
                {selectedDetail.type === 'profile' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/5">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Current Value</div>
                        <div className="text-xs text-slate-400 line-through">{selectedDetail.data.currentValue}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-emerald-400 uppercase tracking-wider mb-0.5">Requested Value</div>
                        <div className="text-xs font-bold text-emerald-400">{selectedDetail.data.requestedValue}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Reason for change</div>
                      <div className="text-xs text-slate-200 italic">"{selectedDetail.data.reason}"</div>
                    </div>
                  </div>
                )}

                {/* BANK DETAILS */}
                {selectedDetail.type === 'bank' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Bank Name</div>
                        <div className="text-xs font-bold text-white">{selectedDetail.data.bankName}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Account Holder</div>
                        <div className="text-xs font-bold text-white">{selectedDetail.data.accountHolder}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Account Number</div>
                        <div className="text-xs font-mono text-[#d4af37] font-bold">{selectedDetail.data.accountNumber}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">SWIFT / BIC</div>
                        <div className="text-xs font-mono text-slate-200">{selectedDetail.data.swiftCode}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CRYPTO DETAILS */}
                {selectedDetail.type === 'crypto' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Network</div>
                        <div className="text-xs font-bold text-white">{selectedDetail.data.network}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Tag / Label</div>
                        <div className="text-xs font-bold text-white">{selectedDetail.data.label}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Wallet Address</div>
                      <div className="text-xs font-mono text-[#d4af37] break-all font-bold">{selectedDetail.data.walletAddress}</div>
                    </div>
                  </div>
                )}

              </div>

              {/* POPUP FOOTER (Approve/Reject buttons hidden for Viewer role) */}
              <div className="p-4 bg-slate-950/80 border-t border-white/10 rounded-b-2xl">
                {!isViewer ? (
                  <div className="flex items-center justify-end gap-2.5">
                    <button 
                      onClick={() => {
                        if (selectedDetail.type === 'deposit') updateDepositStatus(selectedDetail.data.id, 'Rejected');
                        if (selectedDetail.type === 'withdraw') updateWithdrawStatus(selectedDetail.data.id, 'Rejected');
                        if (selectedDetail.type === 'documents') updateDocStatus(selectedDetail.data.id, 'Rejected');
                        if (selectedDetail.type === 'profile') updateProfileStatus(selectedDetail.data.id, 'Rejected');
                        if (selectedDetail.type === 'bank') updateBankStatus(selectedDetail.data.id, 'Rejected');
                        if (selectedDetail.type === 'crypto') updateCryptoStatus(selectedDetail.data.id, 'Rejected');
                      }}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                    >
                      <X size={15} /> Reject
                    </button>

                    <button 
                      onClick={() => {
                        if (selectedDetail.type === 'deposit') updateDepositStatus(selectedDetail.data.id, 'Approved');
                        if (selectedDetail.type === 'withdraw') updateWithdrawStatus(selectedDetail.data.id, 'Approved');
                        if (selectedDetail.type === 'documents') updateDocStatus(selectedDetail.data.id, 'Approved');
                        if (selectedDetail.type === 'profile') updateProfileStatus(selectedDetail.data.id, 'Approved');
                        if (selectedDetail.type === 'bank') updateBankStatus(selectedDetail.data.id, 'Approved');
                        if (selectedDetail.type === 'crypto') updateCryptoStatus(selectedDetail.data.id, 'Approved');
                      }}
                      className="flex items-center gap-1 bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 font-black px-5 py-2 rounded-xl text-xs transition-all shadow-md hover:shadow-gold-glow"
                    >
                      <Check size={15} /> Approve Request
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      Viewer Role: Approval & Rejection actions restricted
                    </span>
                    <button
                      onClick={closeModal}
                      className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-white/10 hover:bg-slate-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}
