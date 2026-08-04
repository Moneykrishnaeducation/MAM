import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import {
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Key, 
  Bell, 
  BookOpen, 
  Lock, 
  Check, 
  Upload, 
  Activity, 
  Sliders,
  Sparkles,
  File,
  IdCard,
  House,
  Building2,
  Bitcoin,
  CreditCard,
  PencilLine,
  Info,
  X
} from 'lucide-react';

type ProfileTab = 'personal' | 'security' | 'activity' | 'documents' | 'payments';

type DocumentSlotId = 'identity' | 'address';
type DocumentStatus = 'verified' | 'pending' | 'uploaded';

type DocumentCard = {
  id: DocumentSlotId;
  title: string;
  description: string;
  helperText: string;
  status: DocumentStatus;
  fileName: string | null;
  fileSize: string | null;
  uploadedAt: string | null;
};

const DOCUMENT_ORDER: DocumentSlotId[] = ['identity', 'address'];
const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';

const INITIAL_DOCUMENTS: Record<DocumentSlotId, DocumentCard> = {
  identity: {
    id: 'identity',
    title: 'Identity Document',
    description: 'Aadhaar, Passport or License',
    helperText: 'Verified on Nov 02, 2025',
    status: 'verified',
    fileName: 'Passport.pdf',
    fileSize: '2.4 MB',
    uploadedAt: 'Nov 02, 2025',
  },
  address: {
    id: 'address',
    title: 'Residential Proof',
    description: 'Utility bills or statements',
    helperText: 'Pending review',
    status: 'pending',
    fileName: null,
    fileSize: null,
    uploadedAt: null,
  },
};

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  verified: 'Approved',
  pending: 'Pending Review',
  uploaded: 'Uploaded',
};

const DOCUMENT_STATUS_CLASSES: Record<DocumentStatus, string> = {
  verified: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  pending: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
  uploaded: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
};

type PaymentEditTarget = 'bank' | 'crypto';
type PaymentStatus = 'approved' | 'pending';

type PaymentDetails = {
  bank: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    status: PaymentStatus;
  };
  crypto: {
    address: string;
    currency: string;
    status: PaymentStatus;
  };
};

type PaymentFormState = {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  bankStatus: PaymentStatus;
  cryptoAddress: string;
  cryptoCurrency: string;
  cryptoStatus: PaymentStatus;
};

const INITIAL_PAYMENT_DETAILS: PaymentDetails = {
  bank: {
    bankName: 'ICICI',
    accountNumber: '****7895',
    ifsc: 'ICICIN878876',
    branch: '',
    status: 'approved',
  },
  crypto: {
    address: '0x7aB9c4F8d3E2a1b0C6D9f4A8e2C1b7d9F0A6',
    currency: 'USDTs',
    status: 'pending',
  },
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
};

const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  approved: 'text-emerald-400',
  pending: 'text-cyan-400',
};

const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const formatUploadedAt = () =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

export default function ClientProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [showToast, setShowToast] = useState(false);
  const [riskTolerance, setRiskTolerance] = useState(70);
  const [avatarSrc, setAvatarSrc] = useState('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80');
  const [isPersonalEditing, setIsPersonalEditing] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex.rivera@example.com',
    phone: '+1 (555) 019-2834',
    country: 'United States',
    timezone: 'America/New_York (EST)',
  });
  const [documents, setDocuments] = useState<Record<DocumentSlotId, DocumentCard>>(INITIAL_DOCUMENTS);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(INITIAL_PAYMENT_DETAILS);
  const [paymentEditTarget, setPaymentEditTarget] = useState<PaymentEditTarget | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    bankName: INITIAL_PAYMENT_DETAILS.bank.bankName,
    accountNumber: INITIAL_PAYMENT_DETAILS.bank.accountNumber,
    ifsc: INITIAL_PAYMENT_DETAILS.bank.ifsc,
    branch: INITIAL_PAYMENT_DETAILS.bank.branch,
    bankStatus: INITIAL_PAYMENT_DETAILS.bank.status,
    cryptoAddress: INITIAL_PAYMENT_DETAILS.crypto.address,
    cryptoCurrency: INITIAL_PAYMENT_DETAILS.crypto.currency,
    cryptoStatus: INITIAL_PAYMENT_DETAILS.crypto.status,
  });
  const documentInputRefs = useRef<Record<DocumentSlotId, HTMLInputElement | null>>({
    identity: null,
    address: null,
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const triggerSaveToast = (e: React.FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    if (!uploadNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUploadNotice(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [uploadNotice]);

  useEffect(() => {
    if (activeTab !== 'personal') {
      setIsPersonalEditing(false);
    }
  }, [activeTab]);

  const activityLog = [
    { event: 'Logged in from New Device', device: 'Chrome / Windows (192.168.1.45)', time: 'Today, 4:32 PM', status: 'Success' },
    { event: 'Enrolled in Course', device: 'Advanced Financial Analysis', time: 'Yesterday, 11:20 AM', status: 'Completed' },
    { event: 'MAM Risk Preference Updated', device: 'Set to High Growth (70%)', time: '3 days ago', status: 'Success' },
    { event: 'Password Changed', device: 'IP: 182.43.22.10', time: 'July 15, 2026', status: 'Verified' },
  ];

  const openDocumentPicker = (slot: DocumentSlotId) => {
    documentInputRefs.current[slot]?.click();
  };

  const openAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePersonalSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPersonalEditing) {
      return;
    }

    setIsPersonalEditing(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const openPaymentEditor = (target: PaymentEditTarget) => {
    setPaymentForm({
      bankName: paymentDetails.bank.bankName,
      accountNumber: paymentDetails.bank.accountNumber,
      ifsc: paymentDetails.bank.ifsc,
      branch: paymentDetails.bank.branch,
      bankStatus: paymentDetails.bank.status,
      cryptoAddress: paymentDetails.crypto.address,
      cryptoCurrency: paymentDetails.crypto.currency,
      cryptoStatus: paymentDetails.crypto.status,
    });
    setPaymentEditTarget(target);
  };

  const closePaymentEditor = () => {
    setPaymentEditTarget(null);
  };

  const savePaymentEditor = () => {
    setPaymentDetails((prev) => ({
      bank: {
        bankName: paymentForm.bankName.trim() || prev.bank.bankName,
        accountNumber: paymentForm.accountNumber.trim() || prev.bank.accountNumber,
        ifsc: paymentForm.ifsc.trim() || prev.bank.ifsc,
        branch: paymentForm.branch.trim() || prev.bank.branch,
        status: paymentForm.bankStatus,
      },
      crypto: {
        address: paymentForm.cryptoAddress.trim() || prev.crypto.address,
        currency: paymentForm.cryptoCurrency.trim() || prev.crypto.currency,
        status: paymentForm.cryptoStatus,
      },
    }));
    closePaymentEditor();
  };

  const personalFullName = `${personalForm.firstName} ${personalForm.lastName}`.trim();

  const handleDocumentChange = (slot: DocumentSlotId, file: File | undefined) => {
    if (!file) {
      return;
    }

    const uploadedAt = formatUploadedAt();
    setDocuments((prev) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        status: 'pending',
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        uploadedAt,
        helperText: 'Uploaded successfully. Waiting for admin review.',
      },
    }));

    setUploadNotice(`${file.name} uploaded and sent for review.`);
  };

  const documentStats = DOCUMENT_ORDER.reduce(
    (stats, slot) => {
      const document = documents[slot];
      stats.total += 1;
      stats[document.status] += 1;
      return stats;
    },
    { total: 0, verified: 0, pending: 0, uploaded: 0 },
  );

  return (
    <>
      <Head>
        <title>My Profile | Client Portal</title>
        <meta name="description" content="View and manage your student profile and MAM preferences" />
      </Head>

      <div className="relative isolate flex-1 overflow-hidden p-6 md:p-8">
        {/* Decorative background glows - Emerald and Teal to match Client Sidebar active theme */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/12 blur-[160px] z-0"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[140px] z-0"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-teal-600/10 blur-[120px] z-0"
          aria-hidden="true"
        />

        <div className="relative z-10">
          {/* Toast Notification (Emerald theme) */}
          {showToast && (
            <div className="fixed bottom-6 right-6 bg-emerald-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 border border-emerald-400 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Check size={18} />
              <span>Profile Settings saved successfully!</span>
            </div>
          )}

          


          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - User Summary Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="relative overflow-hidden rounded-[30px] border border-sky-500/10 bg-[linear-gradient(180deg,rgba(13,31,69,0.98)_0%,rgba(8,22,59,0.99)_100%)] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.35)]">
                <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl" />

                <div className="flex flex-col items-center text-center">
                  <div className="group relative mb-4">
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      className="h-28 w-28 rounded-3xl border-4 border-emerald-500/40 object-cover shadow-xl transition-all duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={openAvatarPicker}
                      className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-xl border-4 border-[#081433] bg-emerald-500 text-slate-950 shadow-md transition-colors hover:bg-emerald-400"
                      title="Change Avatar"
                    >
                      <Upload size={14} />
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        handleAvatarChange(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                  </div>

                  <h3 className="mb-1 text-xl font-bold text-white">{personalFullName}</h3>
                  <p className="mb-4 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <Mail size={11} />
                    {personalForm.email}
                  </p>

                  <div className="w-full border-t border-slate-800/80 pt-4 text-left text-xs">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Account ID</span>
                        <span className="font-mono text-slate-200">#MAM-84920</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Register Date</span>
                        <span className="text-slate-200">Oct 14, 2025</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Account Type</span>
                        <span className="text-slate-200">Individual Trader</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[30px] border border-sky-500/10 bg-[linear-gradient(180deg,rgba(13,31,69,0.98)_0%,rgba(8,22,59,0.99)_100%)] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.35)]">
                <h4 className="text-sm font-bold text-white">Account Security Status</h4>

                <div className="mt-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check size={12} />
                      </div>
                      <div className="text-xs">
                        <p className="font-medium text-slate-200">Email Verified</p>
                        <p className="text-slate-400">{personalForm.email}</p>
                      </div>
                    </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check size={12} />
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-slate-200">Identity (KYC) Verified</p>
                      <p className="text-slate-400">Passport verified on Nov 02, 2025</p>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute -bottom-8 left-1/2 w-[220px] -translate-x-1/2 text-emerald-400/20">
                  <Shield size={180} strokeWidth={1.25} />
                </div>
              </div>
            </div>

            {/* Right Column - Navigation & Tabs Form */}
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-[30px] border border-sky-500/10 bg-[linear-gradient(180deg,rgba(13,31,69,0.98)_0%,rgba(8,22,59,0.99)_100%)] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.35)]">
                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-800 gap-6 mb-6 overflow-x-auto pb-1 scrollbar-hide">
                  <button 
                    onClick={() => setActiveTab('personal')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'personal' 
                        ? 'border-emerald-500 text-emerald-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User size={15} /> Personal Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'security' 
                        ? 'border-emerald-500 text-emerald-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield size={15} /> Password & Security
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'activity' 
                        ? 'border-emerald-500 text-emerald-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity size={15} /> Activity Log
                  </button>

                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'documents'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <File size={15} /> Documents
                  </button>

                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'payments'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CreditCard size={15} /> Payments
                  </button>
                </div>

                {/* Tab: Personal Info */}
                {activeTab === 'personal' && (
                  <form onSubmit={handlePersonalSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">First Name</label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
                            isPersonalEditing
                              ? 'border-slate-700/60 bg-slate-800/40 focus-within:border-emerald-500'
                              : 'border-slate-800/60 bg-slate-900/30'
                          }`}
                        >
                          <User size={15} className="text-slate-400" />
                          <input
                            type="text"
                            value={personalForm.firstName}
                            readOnly={!isPersonalEditing}
                            onChange={(event) =>
                              setPersonalForm((prev) => ({ ...prev, firstName: event.target.value }))
                            }
                            className={`w-full border-none bg-transparent text-xs outline-none ${
                              isPersonalEditing ? 'text-slate-100' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Last Name</label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
                            isPersonalEditing
                              ? 'border-slate-700/60 bg-slate-800/40 focus-within:border-emerald-500'
                              : 'border-slate-800/60 bg-slate-900/30'
                          }`}
                        >
                          <User size={15} className="text-slate-400" />
                          <input
                            type="text"
                            value={personalForm.lastName}
                            readOnly={!isPersonalEditing}
                            onChange={(event) =>
                              setPersonalForm((prev) => ({ ...prev, lastName: event.target.value }))
                            }
                            className={`w-full border-none bg-transparent text-xs outline-none ${
                              isPersonalEditing ? 'text-slate-100' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Email Address</label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
                            isPersonalEditing
                              ? 'border-slate-700/60 bg-slate-800/40 focus-within:border-emerald-500'
                              : 'border-slate-800/60 bg-slate-900/30'
                          }`}
                        >
                          <Mail size={15} className="text-slate-400" />
                          <input
                            type="email"
                            value={personalForm.email}
                            readOnly
                            tabIndex={-1}
                            className="w-full cursor-not-allowed border-none bg-transparent text-xs text-slate-300 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Phone Number</label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
                            isPersonalEditing
                              ? 'border-slate-700/60 bg-slate-800/40 focus-within:border-emerald-500'
                              : 'border-slate-800/60 bg-slate-900/30'
                          }`}
                        >
                          <Phone size={15} className="text-slate-400" />
                          <input
                            type="text"
                            value={personalForm.phone}
                            readOnly={!isPersonalEditing}
                            onChange={(event) =>
                              setPersonalForm((prev) => ({ ...prev, phone: event.target.value }))
                            }
                            className={`w-full border-none bg-transparent text-xs outline-none ${
                              isPersonalEditing ? 'text-slate-100' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Country / Region</label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
                            isPersonalEditing
                              ? 'border-slate-700/60 bg-slate-800/40 focus-within:border-emerald-500'
                              : 'border-slate-800/60 bg-slate-900/30'
                          }`}
                        >
                          <MapPin size={15} className="text-slate-400" />
                          <input
                            type="text"
                            value={personalForm.country}
                            readOnly={!isPersonalEditing}
                            onChange={(event) =>
                              setPersonalForm((prev) => ({ ...prev, country: event.target.value }))
                            }
                            className={`w-full border-none bg-transparent text-xs outline-none ${
                              isPersonalEditing ? 'text-slate-100' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Local Timezone</label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
                            isPersonalEditing
                              ? 'border-slate-700/60 bg-slate-800/40 focus-within:border-emerald-500'
                              : 'border-slate-800/60 bg-slate-900/30'
                          }`}
                        >
                          <Calendar size={15} className="text-slate-400" />
                          <input
                            type="text"
                            value={personalForm.timezone}
                            readOnly={!isPersonalEditing}
                            onChange={(event) =>
                              setPersonalForm((prev) => ({ ...prev, timezone: event.target.value }))
                            }
                            className={`w-full border-none bg-transparent text-xs outline-none ${
                              isPersonalEditing ? 'text-slate-100' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-sky-500/10 bg-[linear-gradient(180deg,rgba(15,35,88,0.55)_0%,rgba(8,22,59,0.72)_100%)] px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-400/30 bg-sky-400/10 text-sky-300">
                          <Info size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">Keep your information up to date</p>
                          <p className="mt-1 max-w-xl text-xs text-slate-400">
                            Ensure your personal information is accurate to avoid any interruptions in your trading activities.
                          </p>
                        </div>
                      </div>

                      <div className="hidden items-end gap-1.5 md:flex">
                        <div className="h-14 w-14 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(123,189,255,0.55)_0%,rgba(99,102,241,0.55)_100%)] shadow-inner shadow-black/20" />
                        <div className="-ml-5 h-10 w-10 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(99,102,241,0.65)_0%,rgba(67,56,202,0.55)_100%)]" />
                        <div className="-ml-3 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/80 text-slate-950 shadow-md">
                          <Check size={14} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPersonalEditing(true)}
                        className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-300 hover:to-cyan-300"
                      >
                        <Check size={14} className="mr-2" />
                        Edit
                      </button>
                      <button
                        type="submit"
                        disabled={!isPersonalEditing}
                        className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-300 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check size={14} className="mr-2" />
                        Save Changes
                      </button>
                    </div>
                  </form>
                )}

                {/* Tab: Security */}
                {activeTab === 'security' && (
                  <form onSubmit={triggerSaveToast} className="space-y-6">
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Current Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Lock size={15} className="text-slate-400" />
                          <input type="password" placeholder="••••••••" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">New Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Key size={15} className="text-slate-400" />
                          <input type="password" placeholder="Min. 8 characters" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Confirm New Password</label>
                        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition-colors">
                          <Key size={15} className="text-slate-400" />
                          <input type="password" placeholder="Must match new password" className="bg-transparent border-none text-slate-100 outline-none w-full text-xs" />
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md">
                      Update Security Settings
                    </button>
                  </form>
                )}

                {/* Tab: Documents */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">Document Vault</h4>
                        <p className="text-[11px] text-slate-400 mt-1">Review the latest identity and address verification files.</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {documentStats.total} documents
                      </span>
                    </div>

                    {uploadNotice && (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                        {uploadNotice}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="rounded-[30px] border border-sky-500/10 bg-[linear-gradient(180deg,rgba(15,35,88,0.97)_0%,rgba(8,22,59,0.99)_100%)] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.35)]">
                        <div className="flex min-h-[300px] flex-col items-center text-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-amber-400 shadow-inner shadow-black/20">
                            <IdCard size={34} strokeWidth={2.1} />
                          </div>

                          <p className="mt-6 text-[18px] font-black uppercase tracking-[0.16em] text-slate-50">
                            {documents.identity.title}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            {documents.identity.description}
                          </p>

                          <div className={`mt-8 flex w-full items-center justify-center rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-[0.28em] ${DOCUMENT_STATUS_CLASSES[documents.identity.status]}`}>
                            Status: {DOCUMENT_STATUS_LABELS[documents.identity.status].toUpperCase()}
                          </div>

                          <button
                            type="button"
                            onClick={() => openDocumentPicker('identity')}
                            className="mt-4 w-full rounded-2xl bg-[#274aab] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-[#335fce]"
                          >
                            Update Document
                          </button>

                          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {documents.identity.fileName
                              ? `${documents.identity.fileName} - ${documents.identity.fileSize}`
                              : documents.identity.helperText}
                          </p>

                          <input
                            ref={(el) => {
                              documentInputRefs.current.identity = el;
                            }}
                            type="file"
                            accept={DOCUMENT_ACCEPT}
                            className="hidden"
                            onChange={(event) => {
                              handleDocumentChange('identity', event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </div>
                      </div>

                      <div className="rounded-[30px] border border-sky-500/10 bg-[linear-gradient(180deg,rgba(15,35,88,0.97)_0%,rgba(8,22,59,0.99)_100%)] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.35)]">
                        <div className="flex min-h-[300px] flex-col items-center text-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-amber-400 shadow-inner shadow-black/20">
                            <House size={34} strokeWidth={2.1} />
                          </div>

                          <p className="mt-6 text-[18px] font-black uppercase tracking-[0.16em] text-slate-50">
                            {documents.address.title}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            {documents.address.description}
                          </p>

                          <div className={`mt-8 flex w-full items-center justify-center rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-[0.28em] ${DOCUMENT_STATUS_CLASSES[documents.address.status]}`}>
                            Status: {DOCUMENT_STATUS_LABELS[documents.address.status].toUpperCase()}
                          </div>

                          <button
                            type="button"
                            onClick={() => openDocumentPicker('address')}
                            className="mt-4 w-full rounded-2xl bg-[#274aab] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-[#335fce]"
                          >
                            Update Document
                          </button>

                          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {documents.address.fileName
                              ? `${documents.address.fileName} - ${documents.address.fileSize}`
                              : documents.address.helperText}
                          </p>

                          <input
                            ref={(el) => {
                              documentInputRefs.current.address = el;
                            }}
                            type="file"
                            accept={DOCUMENT_ACCEPT}
                            className="hidden"
                            onChange={(event) => {
                              handleDocumentChange('address', event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Tab: Payments */}
                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">Saved Payment Methods</h4>
                        <p className="text-[11px] text-slate-400 mt-1">Manage the bank and crypto details used for funding requests.</p>
                      </div>
                      <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                        2 methods
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div className="relative overflow-hidden rounded-[30px] border border-sky-500/10 bg-[linear-gradient(180deg,rgba(15,35,88,0.97)_0%,rgba(8,22,59,0.99)_100%)] p-5 shadow-[0_30px_80px_rgba(2,6,23,0.35)]">
                        <div className="pointer-events-none absolute right-5 top-4 text-white/5">
                          <Building2 size={84} strokeWidth={1.4} />
                        </div>
                        <button
                          type="button"
                          onClick={() => openPaymentEditor('bank')}
                          className="absolute right-5 top-5 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-amber-400 shadow-inner shadow-black/20 transition-all hover:bg-white/10 hover:scale-105"
                          aria-label="Edit bank account"
                        >
                          <PencilLine size={15} strokeWidth={2.3} />
                        </button>

                        <div className="relative flex min-h-[255px] flex-col">
                          <p className="text-[16px] font-black uppercase tracking-[0.18em] text-slate-50">
                            Bank Account
                          </p>

                          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                Bank Name
                              </p>
                              <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-50">
                                {paymentDetails.bank.bankName}
                              </p>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                Account Number
                              </p>
                              <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-50">
                                {paymentDetails.bank.accountNumber}
                              </p>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                IFSC
                              </p>
                              <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-50">
                                {paymentDetails.bank.ifsc}
                              </p>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                Branch
                              </p>
                              <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-50">
                                {paymentDetails.bank.branch || 'Not set'}
                              </p>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4 text-right sm:col-span-2">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                Status
                              </p>
                              <p className={`mt-2 text-[15px] font-black uppercase tracking-[0.12em] ${PAYMENT_STATUS_CLASSES[paymentDetails.bank.status]}`}>
                                {PAYMENT_STATUS_LABELS[paymentDetails.bank.status]}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-[30px] border border-sky-500/10 bg-[linear-gradient(180deg,rgba(15,35,88,0.97)_0%,rgba(8,22,59,0.99)_100%)] p-5 shadow-[0_30px_80px_rgba(2,6,23,0.35)]">
                        <div className="pointer-events-none absolute right-5 top-4 text-white/5">
                          <Bitcoin size={84} strokeWidth={1.4} />
                        </div>
                        <button
                          type="button"
                          onClick={() => openPaymentEditor('crypto')}
                          className="absolute right-5 top-5 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-amber-400 shadow-inner shadow-black/20 transition-all hover:bg-white/10 hover:scale-105"
                          aria-label="Edit crypto wallet"
                        >
                          <PencilLine size={15} strokeWidth={2.3} />
                        </button>

                        <div className="relative flex min-h-[255px] flex-col">
                          <p className="text-[16px] font-black uppercase tracking-[0.18em] text-slate-50">
                            Crypto Wallet
                          </p>

                          <div className="mt-7 space-y-4">
                            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                Address
                              </p>
                              <p className="mt-2 break-all text-[15px] font-black tracking-[0.04em] leading-6 text-slate-50">
                                {paymentDetails.crypto.address}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                  Currency
                                </p>
                                <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-50">
                                  {paymentDetails.crypto.currency}
                                </p>
                              </div>

                              <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4 text-right">
                                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                  Status
                                </p>
                                <p className={`mt-2 text-[15px] font-black uppercase tracking-[0.12em] ${PAYMENT_STATUS_CLASSES[paymentDetails.crypto.status]}`}>
                                  {PAYMENT_STATUS_LABELS[paymentDetails.crypto.status]}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentEditTarget && (
                  <div
                    className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/90 px-4 py-6 backdrop-blur-2xl"
                    onClick={closePaymentEditor}
                  >
                    <div
                      className="my-auto w-full max-w-[520px] max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-[28px] border border-white/10 bg-[#081433] shadow-[0_35px_100px_rgba(2,6,23,0.55)]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-300">Edit Payment</p>
                          <h4 className="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">
                            {paymentEditTarget === 'bank' ? 'Bank Account' : 'Crypto Wallet'}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={closePaymentEditor}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                          aria-label="Close payment editor"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="px-6 py-6 space-y-6">
                        <div className="space-y-4">
                          {paymentEditTarget === 'bank' ? (
                            <>
                              <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                  Bank Name
                                </label>
                                <input
                                  value={paymentForm.bankName}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, bankName: event.target.value }))
                                  }
                                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/50"
                                  placeholder="Bank name"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                  Account Number
                                </label>
                                <input
                                  value={paymentForm.accountNumber}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, accountNumber: event.target.value }))
                                  }
                                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/50"
                                  placeholder="Account number"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                  IFSC
                                </label>
                                <input
                                  value={paymentForm.ifsc}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, ifsc: event.target.value }))
                                  }
                                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/50"
                                  placeholder="IFSC code"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                  Branch Name
                                </label>
                                <input
                                  value={paymentForm.branch}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, branch: event.target.value }))
                                  }
                                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/50"
                                  placeholder="Branch name"
                                />
                              </div>

                              
                            </>
                          ) : (
                            <>
                              <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                  Wallet Address
                                </label>
                                <textarea
                                  value={paymentForm.cryptoAddress}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, cryptoAddress: event.target.value }))
                                  }
                                  rows={4}
                                  className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/50"
                                  placeholder="Wallet address"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                  Currency
                                </label>
                                <input
                                  value={paymentForm.cryptoCurrency}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, cryptoCurrency: event.target.value }))
                                  }
                                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/50"
                                  placeholder="Currency"
                                />
                              </div>

                              
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={closePaymentEditor}
                            className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={savePaymentEditor}
                            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition-colors ${
                              paymentEditTarget === 'crypto'
                                ? 'bg-amber-400 hover:bg-amber-300'
                                : 'bg-emerald-500 hover:bg-emerald-400'
                            }`}
                          >
                            <Check size={14} />
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Activity Log */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-slate-100">Audit History Log</h4>
                      <button className="text-[10px] text-emerald-400 hover:underline">Clear list</button>
                    </div>

                    <div className="border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800">
                      {activityLog.map((log, idx) => (
                        <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs hover:bg-slate-800/20 transition-colors">
                          <div>
                            <p className="font-semibold text-slate-200">{log.event}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5">{log.device}</p>
                          </div>
                          <div className="md:text-right flex items-center md:flex-col gap-2 md:gap-0.5 justify-between">
                            <span className="text-slate-300 text-[11px]">{log.time}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              {log.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
  );
}
