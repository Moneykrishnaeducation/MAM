import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { toast } from 'sonner';
import {
    Clock,
    ArrowRight,
    CheckCircle2,
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
    } catch { }
    return '';
}

const isViewerOnly = (role: string) => role.toLowerCase() === 'viewer';

export type RequestTab = 'deposit' | 'withdraw' | 'documents' | 'profile' | 'bank' | 'crypto';

interface BaseRequest {
    id: string;
    userId?: string | number;
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
    previewUrl?: string;
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
    branchName?: string;
    ifscCode?: string;
    currency?: string;
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
    const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);

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
            if (data.status === 'ok' && data.summary) {
                const s = data.summary;
                setRequestCounts({
                    deposit: s.deposit ?? s.deposits ?? 0,
                    withdraw: s.withdraw ?? s.withdrawals ?? 0,
                    documents: s.documents ?? 0,
                    profile: s.profile ?? s.profiles ?? 0,
                    bank: s.bank ?? s.banks ?? 0,
                    crypto: s.crypto ?? s.cryptos ?? 0,
                });
            }
        } catch (err) {
            console.error('Failed to load requests counts:', err);
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

    const showToast = (msg: string, isError = false) => {
        setToastMessage(msg);
        if (isError) {
            toast.error(msg);
        } else {
            toast.success(msg);
        }
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
            const isRejection = newStatus === 'Rejected';
            showToast(data?.message || successMessage, isRejection);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to update request status.';
            showToast(message, true);
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
    // Use the maximum of the API summary count or the currently loaded table data
    const pendingDeposits = Math.max(requestCounts.deposit, deposits.length);
    const pendingWithdrawals = Math.max(requestCounts.withdraw, withdrawals.length);
    const pendingDocs = Math.max(requestCounts.documents, documents.length);
    const pendingProfiles = Math.max(requestCounts.profile, profiles.length);
    const pendingBanks = Math.max(requestCounts.bank, banks.length);
    const pendingCryptos = Math.max(requestCounts.crypto, cryptos.length);

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

            <div className="relative min-h-screen bg-[#0c1c59] p-6 md:p-10 space-y-12 overflow-hidden font-sans text-white antialiased">
                {/* Ambient background glows */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
                    <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] float-anim-slow" />
                    <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px] float-anim-2" />
                    <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-600/8 blur-[90px] float-anim-3" />
                </div>

                <div className="relative z-10 space-y-8">

                    {/* SEARCH FILTER */}
                    <div className="relative group w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={16} className="text-blue-300 group-focus-within:text-white transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search user or ID..."
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[2rem] pl-11 pr-10 py-3 text-sm text-white placeholder:text-blue-300/70 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all shadow-[0_8px_32px_rgba(4,15,54,0.3)] backdrop-blur-md"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* TAB NAVIGATION BAR */}
                    <div className="flex justify-center">
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center items-center gap-2 p-2 rounded-[2rem] border shadow-[0_10px_32px_rgba(4,15,54,0.22)] border-[#1747b8] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] w-full max-w-5xl">

                        <button
                            onClick={() => setActiveTab('deposit')}
                            className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-3xl font-black text-xs uppercase tracking-[0.12em] transition-all whitespace-nowrap ${activeTab === 'deposit'
                                    ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)]'
                                    : 'border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] text-[#d8e4ff] hover:border-[#1c4fc3] hover:text-white'
                                }`}
                        >
                            <ArrowDownCircle size={14} />
                            <span>Deposits</span>
                            
                        </button>

                        <button
                            onClick={() => setActiveTab('withdraw')}
                            className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-3xl font-black text-xs uppercase tracking-[0.12em] transition-all whitespace-nowrap ${activeTab === 'withdraw'
                                    ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)]'
                                    : 'border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] text-[#d8e4ff] hover:border-[#1c4fc3] hover:text-white'
                                }`}
                        >
                            <ArrowUpCircle size={14} />
                            <span>Withdrawals</span>
                            
                        </button>

                        <button
                            onClick={() => setActiveTab('documents')}
                            className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-3xl font-black text-xs uppercase tracking-[0.12em] transition-all whitespace-nowrap ${activeTab === 'documents'
                                    ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)]'
                                    : 'border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] text-[#d8e4ff] hover:border-[#1c4fc3] hover:text-white'
                                }`}
                        >
                            <FileCheck size={14} />
                            <span>Documents</span>
                           
                        </button>

                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-3xl font-black text-xs uppercase tracking-[0.12em] transition-all whitespace-nowrap ${activeTab === 'profile'
                                    ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)]'
                                    : 'border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] text-[#d8e4ff] hover:border-[#1c4fc3] hover:text-white'
                                }`}
                        >
                            <User size={14} />
                            <span>Profile</span>
                            
                        </button>

                        <button
                            onClick={() => setActiveTab('bank')}
                            className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-3xl font-black text-xs uppercase tracking-[0.12em] transition-all whitespace-nowrap ${activeTab === 'bank'
                                    ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)]'
                                    : 'border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] text-[#d8e4ff] hover:border-[#1c4fc3] hover:text-white'
                                }`}
                        >
                            <Building size={14} />
                            <span>Bank</span>
                           
                        </button>

                        <button
                            onClick={() => setActiveTab('crypto')}
                            className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-3xl font-black text-xs uppercase tracking-[0.12em] transition-all whitespace-nowrap ${activeTab === 'crypto'
             
                                ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)]'
                                    : 'border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] text-[#d8e4ff] hover:border-[#1c4fc3] hover:text-white'
                                }`}
                        >
                            <Wallet size={14} />
                            <span>Crypto</span>
                           
                        </button>
                    </div>
                </div>

                {/* MAIN DATA TABLES */}
                    <div className="rounded-[2.5rem] border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)] p-6 md:p-8 overflow-hidden">
                        <div className="overflow-x-auto">

                            {/* 1. DEPOSITS */}
                            {activeTab === 'deposit' && (
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                        <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#24358a] pb-2">
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
                                            <tr key={d.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-2.5 px-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0">
                                                            {getInitials(d.requesterName)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white">{d.requesterName}</div>
                                                            <div className="text-[9px] font-mono text-[#b38728]">{d.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-2.5">
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30 font-semibold text-[10px] inline-block mb-0.5">
                                                        {d.method}
                                                    </span>
                                                    <div className="text-[10px] font-mono text-blue-300">{d.referenceNo}</div>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 font-mono text-[10px]">{d.date}</td>
                                                <td className="py-2.5 px-2.5 text-sm font-black text-white">{d.amount}</td>
                                                <td className="py-2.5 px-2.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${d.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : d.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'Approved' ? 'bg-emerald-500' : d.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                                                        {d.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-right">
                                                    <button
                                                        onClick={() => setSelectedDetail({ type: 'deposit', data: d })}
                                                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#d8e4ff] border border-white/10 hover:border-white/20 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                                                    >
                                                        <Eye size={13} className="text-[#d4af37]" /> Inspect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {deposits.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-blue-300 text-xs">No deposit requests found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* 2. WITHDRAWALS */}
                            {activeTab === 'withdraw' && (
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                        <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#24358a] pb-2">
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
                                            <tr key={w.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-2.5 px-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0">
                                                            {getInitials(w.requesterName)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white">{w.requesterName}</div>
                                                            <div className="text-[9px] font-mono text-[#b38728]">{w.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-2.5">
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30 font-semibold text-[10px] inline-block mb-0.5">
                                                        {w.method}
                                                    </span>
                                                    <div className="text-[10px] font-mono text-blue-300">{w.payoutDestination}</div>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 font-mono text-[10px]">{w.date}</td>
                                                <td className="py-2.5 px-2.5 text-sm font-black text-white">{w.amount}</td>
                                                <td className="py-2.5 px-2.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${w.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : w.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'Approved' ? 'bg-emerald-500' : w.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                                                        {w.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-right">
                                                    <button
                                                        onClick={() => setSelectedDetail({ type: 'withdraw', data: w })}
                                                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#d8e4ff] border border-white/10 hover:border-white/20 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                                                    >
                                                        <Eye size={13} className="text-[#d4af37]" /> Inspect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {withdrawals.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-blue-300 text-xs">No withdrawal requests found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* 3. DOCUMENTS */}
                            {activeTab === 'documents' && (
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                        <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#24358a] pb-2">
                                            <th className="pb-2 px-2.5">User ID</th>
                                            <th className="pb-2 px-2.5">User Name</th>
                                            <th className="pb-2 px-2.5">Email</th>
                                            <th className="pb-2 px-2.5">ID Proof</th>
                                            <th className="pb-2 px-2.5">Address Proof</th>
                                            <th className="pb-2 px-2.5">Uploaded At</th>
                                            <th className="pb-2 px-2.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {documents.filter(doc => doc.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
                                            <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-2.5 px-2.5 font-mono text-blue-200 text-[10px]">
                                                    {doc.userId || '-'}
                                                </td>
                                                <td className="py-2.5 px-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0">
                                                            {getInitials(doc.requesterName)}
                                                        </div>
                                                        <div className="font-bold text-white text-xs">{doc.requesterName}</div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 text-[10px]">
                                                    {doc.requesterEmail}
                                                </td>
                                                <td className="py-2.5 px-2.5">
                                                    {doc.documentType.toLowerCase().includes('ident') ? (
                                                        <button onClick={() => setDocumentPreviewUrl(doc.previewUrl || null)} className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 text-xs font-semibold inline-flex items-center gap-1 transition-all">
                                                            <ExternalLink size={13} /> View
                                                        </button>
                                                    ) : (
                                                        <span className="text-white/20">-</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2.5">
                                                    {doc.documentType.toLowerCase().includes('address') ? (
                                                        <button onClick={() => setDocumentPreviewUrl(doc.previewUrl || null)} className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 text-xs font-semibold inline-flex items-center gap-1 transition-all">
                                                            <ExternalLink size={13} /> View
                                                        </button>
                                                    ) : (
                                                        <span className="text-white/20">-</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 font-mono text-[10px]">
                                                    {doc.date}
                                                </td>
                                                <td className="py-2.5 px-2.5 text-right">
                                                    <button
                                                        onClick={() => setSelectedDetail({ type: 'documents', data: doc })}
                                                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#d8e4ff] border border-white/10 hover:border-white/20 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                                                    >
                                                        <Eye size={13} className="text-[#d4af37]" /> Inspect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {documents.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-blue-300 text-xs">No verification documents found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* 4. PROFILE */}
                            {activeTab === 'profile' && (
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                        <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#24358a] pb-2">
                                            <th className="pb-2 px-2.5">User / ID</th>
                                            <th className="pb-2 px-2.5">Full Name</th>
                                            <th className="pb-2 px-2.5">Email</th>
                                            <th className="pb-2 px-2.5">Phone</th>
                                            <th className="pb-2 px-2.5">Country</th>
                                            <th className="pb-2 px-2.5">Requested Changes</th>
                                            <th className="pb-2 px-2.5">Status</th>
                                            <th className="pb-2 px-2.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {profiles.filter(p => p.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                                            <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-2.5 px-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0">
                                                            {getInitials(p.requesterName)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white">{p.requesterName}</div>
                                                            <div className="text-[9px] font-mono text-[#d4af37]">{p.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-xs text-emerald-400 font-bold">
                                                    {p.profileFields?.find(f => f.label === 'Full Name')?.value || '-'}
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 text-xs">
                                                    {p.profileFields?.find(f => f.label === 'Email')?.value || p.requesterEmail || '-'}
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 font-mono text-[10px]">
                                                    {p.profileFields?.find(f => f.label === 'Phone')?.value || '-'}
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 text-[10px]">
                                                    {p.profileFields?.find(f => f.label === 'Country')?.value || '-'}
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-200 text-xs align-top">
                                                    {p.profileSummary ? (
                                                        <div className="max-w-[250px] whitespace-pre-line text-[10px] leading-[1.4] text-blue-100">
                                                            {p.profileSummary}
                                                        </div>
                                                    ) : (
                                                        <div className="max-w-[250px] text-[10px]">
                                                            <span className="text-blue-300 font-semibold">{p.fieldToUpdate}:</span> <span className="text-white">{p.requestedValue}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${p.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : p.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'Approved' ? 'bg-emerald-400' : p.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-right">
                                                    <button
                                                        onClick={() => setSelectedDetail({ type: 'profile', data: p })}
                                                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#d8e4ff] border border-white/10 hover:border-white/20 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                                                    >
                                                        <Eye size={13} className="text-[#d4af37]" /> Inspect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {profiles.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-blue-300 text-xs">No profile edit requests found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* 5. BANK ACCOUNTS */}
                            {activeTab === 'bank' && (
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                        <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#24358a] pb-2">
                                            <th className="pb-2 px-2.5">User / ID</th>
                                            <th className="pb-2 px-2.5">Email</th>
                                            <th className="pb-2 px-2.5">Bank Name</th>
                                            <th className="pb-2 px-2.5">Account Mask</th>
                                            <th className="pb-2 px-2.5">Branch</th>
                                            <th className="pb-2 px-2.5">IFSC Code</th>
                                            <th className="pb-2 px-2.5">Status</th>
                                            <th className="pb-2 px-2.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {banks.filter(b => b.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase())).map((b) => (
                                            <tr key={b.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-2.5 px-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0">
                                                            {getInitials(b.requesterName)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white">{b.requesterName}</div>
                                                            <div className="text-[9px] font-mono text-[#d4af37]">{b.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-2.5 font-mono text-blue-200 text-xs max-w-[120px] truncate" title={b.requesterEmail}>{b.requesterEmail}</td>
                                                <td className="py-2.5 px-2.5">
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30 font-semibold text-[10px] inline-block">
                                                        {b.bankName}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2.5 font-mono text-blue-200 text-xs">{b.accountNumber}</td>
                                                <td className="py-2.5 px-2.5 text-blue-200 text-xs">{b.branchName || '-'}</td>
                                                <td className="py-2.5 px-2.5 font-mono text-blue-200 text-xs">{b.ifscCode || b.swiftCode || '-'}</td>
                                                <td className="py-2.5 px-2.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${b.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : b.status === 'Rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Approved' ? 'bg-emerald-400' : b.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-right">
                                                    <button
                                                        onClick={() => setSelectedDetail({ type: 'bank', data: b })}
                                                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#d8e4ff] border border-white/10 hover:border-white/20 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                                                    >
                                                        <Eye size={13} className="text-[#d4af37]" /> Inspect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {banks.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="py-8 text-center text-blue-300 text-xs">No bank account requests found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* 6. CRYPTO WALLETS */}
                            {activeTab === 'crypto' && (
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                        <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#24358a] pb-2">
                                            <th className="pb-2 px-2.5">ID</th>
                                            <th className="pb-2 px-2.5">User ID</th>
                                            <th className="pb-2 px-2.5">User Name</th>
                                            <th className="pb-2 px-2.5">Email</th>
                                            <th className="pb-2 px-2.5">Wallet Address</th>
                                            <th className="pb-2 px-2.5">Exchange</th>
                                            <th className="pb-2 px-2.5">Created At</th>
                                            <th className="pb-2 px-2.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {cryptos.filter(c => c.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                                            <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-2.5 px-2.5 font-mono text-[#d4af37] text-[10px]">{c.id}</td>
                                                <td className="py-2.5 px-2.5 font-mono text-blue-200 text-[10px]">{c.userId || '-'}</td>
                                                <td className="py-2.5 px-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0">
                                                            {getInitials(c.requesterName)}
                                                        </div>
                                                        <div className="font-bold text-white text-xs">{c.requesterName}</div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 text-[10px]">{c.requesterEmail}</td>
                                                <td className="py-2.5 px-2.5 font-mono text-blue-200 text-[10px]">{c.walletAddress}</td>
                                                <td className="py-2.5 px-2.5">
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30 font-semibold text-[10px] inline-block">
                                                        {c.label || c.network}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2.5 text-blue-300 font-mono text-[10px]">{c.date}</td>
                                                <td className="py-2.5 px-2.5 text-right">
                                                    <button
                                                        onClick={() => setSelectedDetail({ type: 'crypto', data: c })}
                                                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#d8e4ff] border border-white/10 hover:border-white/20 text-xs font-semibold inline-flex items-center gap-1 transition-all hover:border-[#d4af37]/40"
                                                    >
                                                        <Eye size={13} className="text-[#d4af37]" /> Inspect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {cryptos.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="py-8 text-center text-blue-300 text-xs">No crypto wallet requests found.</td>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] border border-[#113b95] rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_32px_64px_rgba(4,15,54,0.6)] relative overflow-hidden">
                            <div className="sticky top-0 bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex items-center justify-between z-40">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center text-[#d4af37]">
                                        <Eye size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-white uppercase tracking-tight">{formatRequestTypeLabel(selectedDetail.type)}</h2>
                                        <p className="text-[10px] font-mono text-[#d4af37]">Ref ID #{selectedDetail.data.id}</p>
                                    </div>
                                </div>
                                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-white/5 text-blue-300 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* POPUP BODY */}
                            <div className="p-5 text-xs space-y-3.5">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm flex items-center justify-between relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity opacity-0 group-hover:opacity-100"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-full bg-[linear-gradient(135deg,#0a205f_0%,#113b95_100%)] border border-blue-400/30 flex items-center justify-center shadow-inner shrink-0">
                                            <User size={20} className="text-blue-200" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-1.5"><Sparkles size={10} /> Requester</div>
                                            <div className="font-black text-white text-lg leading-none mb-1 truncate">{selectedDetail.data.requesterName}</div>
                                            <div className="text-[11px] text-blue-300 font-mono truncate">{selectedDetail.data.requesterEmail}</div>
                                        </div>
                                    </div>
                                    <div className="relative z-10 shrink-0 ml-2">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg ${selectedDetail.data.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_4px_12px_rgba(16,185,129,0.15)]' : selectedDetail.data.status === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_4px_12px_rgba(244,63,94,0.15)]' : 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_4px_12px_rgba(245,158,11,0.15)]'
                                            }`}>
                                            {selectedDetail.data.status === 'Approved' && <CheckCircle2 size={12} />}
                                            {selectedDetail.data.status === 'Rejected' && <X size={12} />}
                                            {selectedDetail.data.status === 'Pending' && <Clock size={12} />}
                                            {selectedDetail.data.status}
                                        </span>
                                    </div>
                                </div>

                                {/* DEPOSIT DETAILS */}
                                {selectedDetail.type === 'deposit' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Card 1: Initiated On & Reference/Account ID */}
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm relative overflow-hidden">
                                                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#12206a]/50 flex items-center justify-center text-blue-300">
                                                    <Clock size={14} />
                                                </div>
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5 font-bold flex items-center gap-1.5">
                                                    INITIATED ON
                                                </div>
                                                <div className="text-sm font-black text-white mb-3">{selectedDetail.data.date || 'Recent'}</div>
                                                
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5 font-bold">
                                                    REFERENCE NO / ID
                                                </div>
                                                <div className="text-xs font-mono text-[#d4af37] font-bold flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]"></span>
                                                    {selectedDetail.data.referenceNo || selectedDetail.data.id}
                                                </div>
                                            </div>

                                            {/* Card 2: Deposit Amount & Type */}
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm relative overflow-hidden">
                                                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#12206a]/50 flex items-center justify-center text-blue-300">
                                                    <CheckCircle2 size={14} />
                                                </div>
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5 font-bold flex items-center gap-1.5">
                                                    DEPOSIT AMOUNT
                                                </div>
                                                <div className="text-lg font-black text-[#d4af37] mb-3 flex items-center">
                                                    {selectedDetail.data.amount} <span className="text-[10px] text-blue-300 font-bold ml-1.5">USD</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5 font-bold">TYPE</div>
                                                        <div className="text-xs font-bold text-white">{selectedDetail.data.method}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description Card */}
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm relative">
                                            <div className="absolute top-3 right-3 text-blue-400">
                                                <FileText size={14} />
                                            </div>
                                            <div className="text-[10px] text-white font-bold mb-2">Description</div>
                                            <div className="p-2.5 rounded-lg bg-[#12206a]/50 text-blue-100 text-xs">
                                                Manual deposit request
                                            </div>
                                        </div>

                                        {/* Attached Document Card */}
                                        {(selectedDetail.data.previewUrl || selectedDetail.data.proofUrl) && (
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[10px] text-white font-bold mb-2 flex items-center justify-between">
                                                    Attached Document
                                                    <span className="text-[9px] text-blue-300 uppercase tracking-wider font-bold">PREVIEW</span>
                                                </div>
                                                <div className="rounded-xl overflow-hidden bg-blue-500/20 border border-blue-500/30 flex items-center justify-center p-2 min-h-[150px]">
                                                    <img 
                                                        src={selectedDetail.data.previewUrl || selectedDetail.data.proofUrl} 
                                                        alt="Deposit Proof" 
                                                        className="max-h-48 object-contain rounded-lg shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* WITHDRAW DETAILS */}
                                {selectedDetail.type === 'withdraw' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Requested Amount</div>
                                                <div className="text-base font-black text-white">{selectedDetail.data.amount}</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Available Balance</div>
                                                <div className="text-xs font-bold text-[#d4af37]">{selectedDetail.data.availableBalance}</div>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                            <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Payout Destination ({selectedDetail.data.method})</div>
                                            <div className="text-xs font-mono text-blue-100 break-all">{selectedDetail.data.payoutDestination}</div>
                                        </div>
                                    </div>
                                )}

                                {/* DOCUMENTS DETAILS */}
                                {selectedDetail.type === 'documents' && (
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                            <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                <span>Attached Verification Document</span>
                                                {selectedDetail.data.previewUrl && (
                                                    <a href={selectedDetail.data.previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#d4af37] hover:underline flex items-center gap-1">
                                                        <ExternalLink size={12} /> Open Full
                                                    </a>
                                                )}
                                            </div>
                                            <div className="rounded-xl overflow-hidden bg-black/50 flex items-center justify-center min-h-[100px] p-2 border border-blue-50">
                                                {getDocumentPreviewKind(selectedDetail.data.previewUrl) === 'image' ? (
                                                    <img src={selectedDetail.data.previewUrl!} alt="Document Preview" className="max-h-56 object-contain rounded-lg" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <FileText size={28} className="text-[#d4af37] mx-auto mb-1.5" />
                                                        <span className="text-xs text-blue-100 break-all">{selectedDetail.data.fileName}</span>
                                                        {selectedDetail.data.previewUrl && (
                                                            <a href={selectedDetail.data.previewUrl} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f1d5f] hover:bg-[#12206a]/50 text-white text-xs font-bold border border-[#24358a]">
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
                                    <div className="space-y-4">

                                        {selectedDetail.data.profileSummary && (
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
                                                <div className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-2 flex items-center gap-1.5"><FileText size={10} /> Requested Changes Summary</div>
                                                <div className="text-sm text-blue-100 whitespace-pre-wrap relative z-10">
                                                    {selectedDetail.data.profileSummary}
                                                </div>
                                            </div>
                                        )}

                                       

                                        {selectedDetail.data.profileFields && selectedDetail.data.profileFields.length > 0 && (
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
                                                <div className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-1.5"><User size={10} /> Full Profile Data</div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                                                    {selectedDetail.data.profileFields.map((field, idx) => (
                                                        <div key={idx} className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                                                            <div className="text-[9px] text-blue-300/70 uppercase mb-0.5">{field.label}</div>
                                                            <div className="text-xs text-white font-medium truncate" title={field.value}>{field.value || '-'}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* BANK DETAILS */}
                                {selectedDetail.type === 'bank' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Bank Name</div>
                                                <div className="text-xs font-bold text-white">{selectedDetail.data.bankName}</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Account Holder</div>
                                                <div className="text-xs font-bold text-white">{selectedDetail.data.accountHolder}</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Account Number</div>
                                                <div className="text-xs font-mono text-[#d4af37] font-bold">{selectedDetail.data.accountNumber}</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">SWIFT / BIC</div>
                                                <div className="text-xs font-mono text-blue-100">{selectedDetail.data.swiftCode}</div>
                                            </div>
                                            {selectedDetail.data.ifscCode && (
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                    <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">IFSC Code</div>
                                                    <div className="text-xs font-mono text-blue-100">{selectedDetail.data.ifscCode}</div>
                                                </div>
                                            )}
                                            {selectedDetail.data.branchName && (
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                    <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Branch</div>
                                                    <div className="text-xs font-bold text-white">{selectedDetail.data.branchName}</div>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                )}

                                {/* CRYPTO DETAILS */}
                                {selectedDetail.type === 'crypto' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Network</div>
                                                <div className="text-xs font-bold text-white">{selectedDetail.data.network}</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                                <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Tag / Label</div>
                                                <div className="text-xs font-bold text-white">{selectedDetail.data.label}</div>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-sm">
                                            <div className="text-[9px] text-blue-300 uppercase tracking-wider mb-0.5">Wallet Address</div>
                                            <div className="text-xs font-mono text-[#d4af37] break-all font-bold">{selectedDetail.data.walletAddress}</div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* POPUP FOOTER (Approve/Reject buttons hidden for Viewer role) */}
                            <div className="p-4 bg-[#0f1d5f] border-t border-[#24358a] rounded-b-2xl">
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
                                            className="flex items-center gap-1 bg-[#0f1d5f] hover:bg-red-500/20 text-blue-200 hover:text-red-400 border border-[#24358a] hover:border-red-500/30 font-bold px-4 py-2 rounded-xl text-xs transition-all"
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
                                            className="flex items-center gap-1 bg-[#d4af37] text-slate-950 font-black px-5 py-2 rounded-xl text-xs transition-all shadow-md hover:shadow-lg"
                                        >
                                            <Check size={15} /> Approve Request
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono text-blue-300">
                                            Viewer Role: Approval & Rejection actions restricted
                                        </span>
                                        <button
                                            onClick={closeModal}
                                            className="px-4 py-1.5 rounded-xl bg-[#0f1d5f] text-blue-100 text-xs font-semibold border border-[#24358a] hover:bg-[#12206a]/50 transition-colors"
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
            {documentPreviewUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-white z-10 shrink-0">
                            <div>
                                <h3 className="text-[#0a1551] font-black text-xl uppercase tracking-wider leading-none">
                                    DOCUMENT PREVIEW
                                </h3>
                                <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                                    REVIEWING USER VERIFICATION PROOF
                                </p>
                            </div>
                            <button 
                                onClick={() => setDocumentPreviewUrl(null)}
                                className="text-gray-400 hover:text-gray-800 transition-colors p-1"
                            >
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex justify-center items-start custom-scrollbar">
                            {getDocumentPreviewKind(documentPreviewUrl) === 'image' ? (
                                <img 
                                    src={documentPreviewUrl} 
                                    alt="Verification Document" 
                                    className="max-w-full rounded-xl shadow-sm border border-gray-200" 
                                />
                            ) : (
                                <iframe 
                                    src={documentPreviewUrl} 
                                    className="w-full h-full min-h-[65vh] rounded-xl shadow-sm bg-white border border-gray-200" 
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
