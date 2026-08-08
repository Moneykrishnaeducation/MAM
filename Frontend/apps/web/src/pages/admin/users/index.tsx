import React, { useState, useRef, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  TrendingUp,
  User,
  CreditCard,
  ArrowUpRight,
  Ticket,
  PlusCircle,
  Trash2,
  Power,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Upload,
  Eye,
  RotateCcw,
  FileText,
  Camera,
  Building2,
  Bitcoin,
  CheckCheck,
  Ban,
  Clock,
  RefreshCw,
  Server,
  Layers,
  Globe,
  Phone,
  MapPin,
  Calendar,
  Mail,
  Shield,
  EyeOff,
  KeyRound,
  Percent,
  BarChart2,
  Zap,
  CalendarClock,
  UserCheck,
  ArrowDownUp,
  Sparkles,
  Paperclip,
} from 'lucide-react';
import { getAdminUsers } from '@/lib/mockDataLoader';
import CreateUserModalForm from '@/components/Admin/CreateUserModalForm';
import {
  type AdminKycDocument,
  type AdminUserKycDetails,
  type CreateUserFormData,
  type KycDocument,
  type UserTicket,
  type UserTransaction,
  type TradingAccount,
  type UserData,
} from '@/types/user';
import { type UserModalType } from '@/types/userModal';

/* ─────────────────────────────────────────────────────────────
   Small UI helpers
───────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const map: Record<string, string> = {
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    uploaded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    missing: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
    inactive: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const cls = map[normalized] ?? 'bg-blue-500/10 text-blue-300 border-blue-500/20';
  const Icon = {
    approved: CheckCircle2,
    verified: CheckCircle2,
    active: CheckCircle2,
    pending: Clock,
    uploaded: FileText,
    rejected: Ban,
    missing: AlertCircle,
    suspended: XCircle,
    inactive: XCircle,
  }[normalized] ?? AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${cls}`}>
      <Icon size={11} />
      {status}
    </span>
  );
}

function isAccountActive(status?: string | null) {
  return String(status ?? '').trim().toLowerCase() === 'active';
}

function getAccountStatusLabel(status?: string | null) {
  return isAccountActive(status) ? 'Active' : 'Inactive';
}

function isViewerRole(role?: string | null) {
  return String(role ?? '').trim().toLowerCase() === 'viewer';
}

function getAdminRole(): string {
  try {
    const nameEQ = 'role=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i += 1) {
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

function getAdminUserApiId(user?: Pick<UserData, 'id' | 'user_id'> | null) {
  if (!user) return '';
  if (typeof user.user_id === 'number' && Number.isFinite(user.user_id)) {
    return String(user.user_id);
  }

  const match = String(user.id ?? '').match(/(\d+)(?!.*\d)/);
  if (match?.[1]) {
    return String(Number(match[1]));
  }

  return String(user.id ?? '');
}

function SectionTitle({ icon: Icon, label, color = 'text-blue-400' }: { icon: React.ElementType; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#1745b3] pb-3 mb-4">
      <Icon size={17} className={color} />
      <h4 className="font-bold text-white text-sm">{label}</h4>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-[#8fb8ff] font-semibold">{label}</span>
      <span className={`text-sm font-semibold text-white ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-slate-600 italic text-xs">Not set</span>}
      </span>
    </div>
  );
}

type ProfileFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ElementType;
  disabled?: boolean;
  type?: string;
  className?: string;
  placeholder?: string;
  editing: boolean;
};

function ProfileField({
  label,
  value,
  onChange,
  icon: Icon,
  disabled = false,
  type = 'text',
  className = '',
  placeholder,
  editing,
}: ProfileFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#8fb8ff] font-semibold">
        <Icon size={11} className={(disabled || !editing) ? 'text-[#4d7fe0]' : 'text-[#8fb8ff]'} />
        {label}
      </label>
      <div className="relative">
        <span className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${(disabled || !editing) ? 'text-[#4d7fe0]' : 'text-[#8fb8ff]'}`}>
          <Icon size={12} />
        </span>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled || !editing}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border bg-[#0b226a]/70 py-3 pl-9 pr-3 text-[12px] font-medium outline-none transition-all ${
            (disabled || !editing)
              ? 'border-[#1745b3]/70 text-[#8fb8ff] cursor-not-allowed'
              : 'border-[#2456c9] text-white placeholder:text-[#5e82d8] focus:border-[#5f8bff] focus:ring-2 focus:ring-[#5f8bff]/15'
          }`}
        />
      </div>
      {disabled && editing && (
        <p className="text-[10px] text-slate-500">Email cannot be changed (identity field)</p>
      )}
    </div>
  );
}

type ProfileSelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ElementType;
  options: string[];
  helper?: string;
  className?: string;
  editing: boolean;
};

function ProfileSelectField({
  label,
  value,
  onChange,
  icon: Icon,
  options,
  helper,
  className = '',
  editing,
}: ProfileSelectFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#8fb8ff] font-semibold">
        <Icon size={11} className={!editing ? 'text-[#4d7fe0]' : 'text-[#8fb8ff]'} />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          disabled={!editing}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-2xl border bg-[#0b226a]/70 py-3 pl-3 pr-9 text-[12px] font-medium outline-none transition-all ${
            !editing
              ? 'border-[#1745b3]/70 text-[#8fb8ff] cursor-not-allowed'
              : 'border-[#2456c9] text-white focus:border-[#5f8bff] focus:ring-2 focus:ring-[#5f8bff]/15'
          }`}
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#0b226a]">
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${editing ? 'text-[#8fb8ff]' : 'text-[#4d7fe0]'}`} />
      </div>
      {helper && <p className="text-[10px] text-slate-500">{helper}</p>}
    </div>
  );
}

type PaymentFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  editing: boolean;
  mono?: boolean;
  type?: string;
};

function PaymentField({
  label,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  editing,
  mono = false,
  type = 'text',
}: PaymentFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</label>
      <input
        type={type}
        value={value}
        disabled={!editing || disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`px-3 py-2.5 rounded-xl bg-[#0b226a] text-white border outline-none text-xs transition-all ${
          !editing || disabled
            ? 'border-[#1745b3]/80 text-slate-400 bg-[#0b226a]/50 cursor-not-allowed'
            : 'border-[#1745b3] focus:border-amber-500'
        } ${mono ? 'font-mono uppercase' : ''}`}
      />
    </div>
  );
}

function normalizeKycDoc(doc?: AdminKycDocument | null) {
  return {
    file_name: doc?.file_name ?? null,
    file_path: doc?.file_path ?? null,
    status: (doc?.status ?? 'missing').toLowerCase(),
    uploaded_at: doc?.uploaded_at ?? null,
  };
}

function mapAdminDocToKycDocument(
  doc: AdminKycDocument | null | undefined,
  fallback: KycDocument,
): KycDocument {
  const normalized = normalizeKycDoc(doc);
  const statusMap: Record<string, KycDocument['status']> = {
    approved: 'approved',
    pending: 'pending',
    rejected: 'rejected',
    uploaded: 'uploaded',
    missing: 'missing',
  };

  return {
    ...fallback,
    status: statusMap[normalized.status] ?? fallback.status,
    fileName: normalized.file_name ?? fallback.fileName,
    fileUrl: normalized.file_path ?? fallback.fileUrl,
    uploadedAt: normalized.uploaded_at ?? fallback.uploadedAt,
  };
}

function getDocumentPreviewKind(fileName?: string | null, fileUrl?: string | null): 'image' | 'pdf' | 'other' {
  const source = String(fileName || fileUrl || '').toLowerCase();
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/.test(source) || source.startsWith('blob:')) {
    return 'image';
  }
  if (source.endsWith('.pdf')) {
    return 'pdf';
  }
  return 'other';
}

function mergeAdminDocs(
  primary?: AdminKycDocument | null,
  secondary?: AdminKycDocument | null,
): AdminKycDocument | null {
  if (!primary && !secondary) {
    return null;
  }

  return {
    file_name: primary?.file_name ?? secondary?.file_name ?? null,
    file_path: primary?.file_path ?? secondary?.file_path ?? null,
    status: primary?.status ?? secondary?.status ?? null,
    uploaded_at: primary?.uploaded_at ?? secondary?.uploaded_at ?? null,
  };
}

function normalizeKycDetails(payload: unknown, fallback?: AdminUserKycDetails): AdminUserKycDetails {
  const raw = (payload ?? {}) as AdminUserKycDetails;
  const documentDetail = raw.document_detail ?? fallback?.document_detail;
  const mergedIdentity = mergeAdminDocs(documentDetail?.identity, raw.documents?.identity ?? fallback?.documents?.identity);
  const mergedAddress = mergeAdminDocs(documentDetail?.address, raw.documents?.address ?? fallback?.documents?.address);
  return {
    status: fallback?.status ?? undefined,
    kyc_status: raw.kyc_status ?? raw.profile?.kyc_status ?? fallback?.kyc_status ?? fallback?.profile?.kyc_status ?? undefined,
    user: raw.user ?? fallback?.user,
    profile: raw.profile ?? fallback?.profile,
    document_detail: mergedIdentity || mergedAddress
      ? {
          identity: normalizeKycDoc(mergedIdentity),
          address: normalizeKycDoc(mergedAddress),
        }
      : undefined,
    document_status: raw.document_status ?? fallback?.document_status,
    documents: {
      identity: normalizeKycDoc(mergedIdentity ?? raw.documents?.identity ?? fallback?.documents?.identity),
      address: normalizeKycDoc(mergedAddress ?? raw.documents?.address ?? fallback?.documents?.address),
    },
  };
}

type AdminTransactionApiItem = {
  id: string | number;
  transaction_type?: string | null;
  type?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  method?: string | null;
  account?: string | null;
  role?: string | null;
  approved_by?: string | null;
  approval_date?: string | null;
  description?: string | null;
  source?: string | null;
  account_number?: string | null;
  account_id_from?: string | null;
  account_id_to?: string | null;
  status?: string | null;
  created_at?: string | null;
  date?: string | null;
};

type AdminTransactionApiSummary = {
  total_transactions?: number;
  pending_count?: number;
  total_volume?: number;
  deposit_count?: number;
  withdrawal_count?: number;
};

type AdminTransactionModalState = {
  loading: boolean;
  error: string | null;
  transactions: UserTransaction[];
  summary: AdminTransactionApiSummary | null;
};

type AdminTicketApiItem = {
  id: string | number;
  subject?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  description?: string | null;
  date?: string | null;
  created_at?: string | null;
  attachments?: unknown[];
  messages?: any[];
};

type AdminTicketApiSummary = {
  total_tickets?: number;
  open_count?: number;
  pending_count?: number;
  closed_count?: number;
};

type AdminTicketModalState = {
  loading: boolean;
  error: string | null;
  tickets: UserTicket[];
  summary: AdminTicketApiSummary | null;
};

function normalizeTransactionType(type?: string | null): 'Deposit' | 'Withdrawal' {
  const value = String(type ?? '').trim().toLowerCase();
  return value === 'withdrawal' || value === 'withdraw' ? 'Withdrawal' : 'Deposit';
}

function normalizeTransactionStatus(status?: string | null): 'Completed' | 'Pending' {
  const value = String(status ?? '').trim().toLowerCase();
  return ['pending', 'processing'].includes(value) ? 'Pending' : 'Completed';
}

function normalizeTransactionAmount(amount?: number | string | null): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0.00';
  }

  const numeric = Number(amount);
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return String(amount);
}

function formatTransactionSource(tx: Pick<AdminTransactionApiItem, 'source' | 'transaction_type' | 'type' | 'payment_method' | 'role'>): string {
  const source = String(tx.source ?? '').trim();
  if (source) {
    const lowered = source.toLowerCase();
    if (lowered !== 'admin' && lowered !== 'admin operation') {
      return lowered.startsWith('admin ') ? source.slice(6).trim() : source;
    }
  }

  const action = String(tx.transaction_type ?? tx.type ?? tx.payment_method ?? 'Transaction')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
  return [tx.role?.trim(), action || 'Transaction'].filter(Boolean).join(' ') || 'Transaction';
}

function normalizeTransactionRecord(tx: AdminTransactionApiItem): UserTransaction {
  const account = String(
    tx.account ?? tx.account_number ?? tx.account_id_from ?? tx.account_id_to ?? 'N/A'
  );
  const approvalDate = String(tx.approval_date ?? tx.created_at ?? tx.date ?? '');
  const approvedBy = String(tx.approved_by ?? '').trim();
  return {
    id: String(tx.id),
    type: normalizeTransactionType(tx.transaction_type ?? tx.type),
    amount: normalizeTransactionAmount(tx.amount),
    account,
    approvedBy: approvedBy && approvedBy.toLowerCase() !== 'admin' ? approvedBy : undefined,
    approvalDate,
    description: String(tx.description ?? tx.type ?? tx.transaction_type ?? ''),
    source: formatTransactionSource(tx),
    status: normalizeTransactionStatus(tx.status),
    date: String(tx.created_at ?? tx.date ?? ''),
  };
}

function normalizeTicketStatus(status?: string | null): UserTicket['status'] {
  const value = String(status ?? '').trim().toLowerCase();
  if (['closed', 'resolved', 'completed', 'done'].includes(value)) return 'Closed';
  if (['open', 'new', 'active'].includes(value)) return 'Open';
  return 'In Progress';
}

function normalizeTicketRecord(ticket: AdminTicketApiItem): UserTicket {
  return {
    id: String(ticket.id),
    subject: ticket.subject ?? 'No subject',
    status: normalizeTicketStatus(ticket.status),
    date: String(ticket.date ?? ticket.created_at ?? ''),
    category: ticket.category ?? undefined,
    priority: ticket.priority ?? undefined,
    description: ticket.description,
    attachments: ticket.attachments,
    messages: ticket.messages,
  };
}

function KycDocumentCard({
  title,
  doc,
}: {
  title: string;
  doc?: AdminKycDocument | null;
}) {
  const normalized = normalizeKycDoc(doc);
  const status = normalized.status ?? 'missing';
  const fileName = normalized.file_name || 'No document uploaded';
  const filePath = normalized.file_path || null;
  const previewKind = getDocumentPreviewKind(fileName, filePath);

  return (
    <div className="rounded-2xl border border-[#1745b3] bg-[#081d5f]/80 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-100">{title}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      {filePath && previewKind !== 'other' && (
        <div className="overflow-hidden rounded-xl border border-[#1745b3] bg-[#0b226a]/60">
          <div className="border-b border-[#1745b3] px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Preview
          </div>
          <div className="flex items-center justify-center bg-[#071a57]/40 p-3">
            {previewKind === 'image' ? (
              <img src={filePath} alt={fileName} className="max-h-48 w-full rounded-lg object-contain" />
            ) : (
              <iframe
                src={filePath}
                title={fileName}
                className="h-56 w-full rounded-lg bg-[#081d5f]"
              />
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-xl border border-[#1745b3] bg-[#0b226a]/60 px-3 py-2 text-[11px] text-slate-300">
        <FileText size={13} className="text-blue-400 shrink-0" />
        {filePath ? (
          <a href={filePath} target="_blank" rel="noreferrer" className="truncate text-blue-300 hover:text-blue-200">
            {fileName}
          </a>
        ) : (
          <span className="truncate text-slate-400">{fileName}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="uppercase tracking-wider font-semibold">Path</span>
        <span className="truncate max-w-[180px] text-slate-400">{filePath || 'Not configured'}</span>
      </div>
      {normalized.uploaded_at && (
        <div className="text-[10px] text-slate-500">Uploaded: {normalized.uploaded_at}</div>
      )}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   MODAL 1 — Verify / KYC Documents
───────────────────────────────────────────────────────────── */
const DOC_TYPES: { type: KycDocument['type']; label: string }[] = [
  { type: 'address_proof', label: 'Address Proof' },
  { type: 'id_proof', label: 'ID Proof' }
];

function VerifyModal({
  user,
  onVerify,
  onSaved,
  isViewerAdmin = false,
}: {
  user: UserData;
  onVerify: (userId: string, verified: boolean) => void;
  onSaved: (userId: string, payload: AdminUserKycDetails) => void;
  isViewerAdmin?: boolean;
}) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [kycPayload, setKycPayload] = useState<AdminUserKycDetails | null>(user.kyc ?? null);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycError, setKycError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setKycLoading(true);
    setKycError(null);

    fetch(`/api/admin/users/${getAdminUserApiId(user)}/kyc`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load KYC data');
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        setKycPayload(normalizeKycDetails(data, user.kyc ?? undefined));
      })
      .catch((err) => {
        if (!active) return;
        setKycError(err instanceof Error ? err.message : 'Failed to load KYC data');
        setKycPayload(user.kyc ?? null);
      })
      .finally(() => {
        if (active) setKycLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  /* Build display doc list from the live KYC payload */
  const sourceDocs = {
    identity: mergeAdminDocs(kycPayload?.document_detail?.identity, kycPayload?.documents?.identity),
    address: mergeAdminDocs(kycPayload?.document_detail?.address, kycPayload?.documents?.address),
  };
  const docs: KycDocument[] = DOC_TYPES.map((dt) => {
    const fallback: KycDocument = {
      id: `${dt.type}-new`,
      type: dt.type,
      label: dt.label,
      status: 'missing',
    };
    if (dt.type === 'id_proof') {
      return mapAdminDocToKycDocument(sourceDocs.identity, fallback);
    }
    return mapAdminDocToKycDocument(sourceDocs.address, fallback);
  });

  const [docStates, setDocStates] = useState<KycDocument[]>(docs);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDocStates(docs);
  }, [user.id, kycPayload]);

  const handleFileChange = (type: KycDocument['type'], file: File) => {
    const url = URL.createObjectURL(file);
    setDocStates((prev) =>
      prev.map((d) =>
        d.type === type
          ? { ...d, status: 'uploaded', fileUrl: url, fileName: file.name, uploadedAt: new Date().toLocaleString(), file }
          : d,
      ),
    );
  };

  const changeDocStatus = (type: KycDocument['type'], status: KycDocument['status']) => {
    setDocStates((prev) => prev.map((d) => (d.type === type ? { ...d, status } : d)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append(
        'documents',
        JSON.stringify(
          docStates.map(({ file, ...doc }) => ({
            ...doc,
            file: undefined,
          })),
        ),
      );
      docStates.forEach((doc) => {
        if (doc.file) {
          formData.append(doc.type, doc.file);
        }
      });

      const res = await fetch(`/api/admin/users/${getAdminUserApiId(user)}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to save document status');
      }

      const nextKyc = normalizeKycDetails(data?.kyc ?? data, kycPayload ?? user.kyc ?? undefined);
      setKycPayload(nextKyc);
      onSaved(user.id, nextKyc);
    } catch (err) {
      setKycError(err instanceof Error ? err.message : 'Failed to save document status');
    } finally {
      setSaving(false);
    }
  };

  const allApproved = docStates.every((d) => d.status === 'approved');
  const canEdit = !isViewerAdmin;

  return (
    <div className="space-y-5 text-xs">
      <SectionTitle icon={ShieldCheck} label="Identity Verification & KYC Documents" color="text-blue-400" />
      {kycLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-[#1745b3] bg-[#081d5f]/80 px-3 py-2 text-slate-400 text-[11px]">
          <RefreshCw size={13} className="animate-spin text-blue-400" />
          Loading verified KYC data from the database...
        </div>
      )}
      {kycError && !kycLoading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
          {kycError}
        </div>
      )}

      {/* Overall KYC Status */}
      <div className="flex items-center justify-between bg-[#081d5f] border border-[#1745b3] rounded-2xl p-4">
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Overall KYC Status</p>
          <StatusBadge status={String(kycPayload?.kyc_status ?? kycPayload?.profile?.kyc_status ?? sourceDocs?.identity?.status ?? user.kycStatus ?? (user.verified ? 'Verified' : 'Pending'))} />
        </div>
        {canEdit && (
          <button
            onClick={() => onVerify(user.id, !user.verified)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              user.verified
                ? 'bg-red-600/15 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30'
                : 'bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30'
            }`}
          >
            {user.verified ? <><Ban size={14} /> Revoke Verification</> : <><CheckCheck size={14} /> Approve KYC</>}
          </button>
        )}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {docStates.map((doc) => {
          const isUploaded = doc.status === 'uploaded' || doc.status === 'approved' || doc.status === 'rejected';
          const previewKind = getDocumentPreviewKind(doc.fileName, doc.fileUrl);
          return (
            <div key={doc.type} className="bg-[#081d5f] border border-[#1745b3] rounded-2xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-200">
                    {DOC_TYPES.find((d) => d.type === doc.type)?.label ?? doc.type}
                  </span>
                </div>
                <StatusBadge status={doc.status} />
              </div>

              {/* Preview / file info */}
              {isUploaded && doc.fileUrl ? (
                <div className="overflow-hidden rounded-xl border border-[#1745b3] bg-[#0b226a]/70">
                  <div className="border-b border-[#1745b3] px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center justify-between">
                    <span>Preview</span>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-300 hover:text-blue-200 normal-case tracking-normal font-medium"
                    >
                      Open
                    </a>
                  </div>
                  <div className="p-3 bg-[#071a57]/40">
                    {previewKind === 'image' ? (
                      <img
                        src={doc.fileUrl}
                        alt={doc.fileName || doc.type}
                        className="max-h-56 w-full rounded-lg object-contain"
                      />
                    ) : previewKind === 'pdf' ? (
                      <iframe
                        src={doc.fileUrl}
                        title={doc.fileName || doc.type}
                        className="h-56 w-full rounded-lg bg-[#081d5f]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <FileText size={13} className="text-blue-400 shrink-0" />
                        <span className="truncate text-[11px]">{doc.fileName || 'document.pdf'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-[11px] italic px-1">No document uploaded</div>
              )}

              {isUploaded && doc.fileUrl && (
                <div className="flex items-center gap-2 rounded-xl border border-[#1745b3] bg-[#0b226a]/60 px-3 py-2 text-[11px] text-slate-300">
                  <FileText size={13} className="text-blue-400 shrink-0" />
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-blue-300 hover:text-blue-200"
                  >
                    {doc.fileName || 'document.pdf'}
                  </a>
                </div>
              )}

              {/* Upload / Re-upload button */}
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRefs.current[doc.type]?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b226a] hover:bg-[#102c7c] text-slate-300 text-[11px] font-semibold border border-[#1745b3] transition-all"
                  >
                    {isUploaded ? <RotateCcw size={12} /> : <Upload size={12} />}
                    {isUploaded ? 'Re-upload' : 'Upload'}
                  </button>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    ref={(el) => { fileRefs.current[doc.type] = el; }}
                    onChange={(e) => e.target.files?.[0] && handleFileChange(doc.type, e.target.files[0])}
                  />

                  {/* Approve / Reject buttons (only if uploaded) */}
                  {(doc.status === 'uploaded' || doc.status === 'pending') && (
                    <>
                      <button
                        onClick={() => changeDocStatus(doc.type, 'approved')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[11px] font-bold border border-emerald-500/30 transition-all"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        onClick={() => changeDocStatus(doc.type, 'rejected')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white text-[11px] font-bold border border-red-500/30 transition-all"
                      >
                        <Ban size={12} /> Reject
                      </button>
                    </>
                  )}
                  {doc.status === 'approved' && (
                    <button
                      onClick={() => changeDocStatus(doc.type, 'rejected')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600/15 text-red-400 text-[11px] font-bold border border-red-500/30 transition-all hover:bg-red-600 hover:text-white"
                    >
                      <Ban size={12} /> Reject
                    </button>
                  )}
                  {doc.status === 'rejected' && (
                    <button
                      onClick={() => changeDocStatus(doc.type, 'approved')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/15 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 transition-all hover:bg-emerald-600 hover:text-white"
                    >
                      <CheckCircle2 size={12} /> Approve
                    </button>
                  )}
                </div>
              )}

              {doc.uploadedAt && (
                <p className="text-slate-600 text-[10px]">Uploaded: {doc.uploadedAt}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-[#1745b3]">
        {canEdit && allApproved && !user.verified && (
          <button
            onClick={() => onVerify(user.id, true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            <Shield size={14} /> Mark KYC Verified
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-60 transition-all"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          Save Document Status
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL 2 — Trading Accounts (Manager + Investor tables)
───────────────────────────────────────────────────────────── */
type TradingFilter = 'all' | 'manager' | 'investor';

function TradingModal({ user }: { user: UserData }) {
  const [filter, setFilter] = useState<TradingFilter>('all');

  /* Build unified list from both sources */
  const allAccounts: TradingAccount[] = user.tradingAccounts?.length
    ? user.tradingAccounts
    : [{ ...user.tradingAccount, accountRole: user.role.toLowerCase().includes('manager') ? 'manager' : 'investor' }];

  const filtered = allAccounts.filter((a) => filter === 'all' || a.accountRole === filter);

  const managerCount = allAccounts.filter((a) => a.accountRole === 'manager').length;
  const investorCount = allAccounts.filter((a) => a.accountRole === 'investor').length;

  const FILTERS: { key: TradingFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All Accounts', count: allAccounts.length, color: 'text-white' },
    { key: 'manager', label: 'Manager', count: managerCount, color: 'text-purple-400' },
    { key: 'investor', label: 'Investor', count: investorCount, color: 'text-emerald-400' },
  ];
  const selectedFilterLabel = FILTERS.find((f) => f.key === filter)?.label ?? 'All Accounts';

  return (
    <div className="space-y-4 text-xs">
      {/* Filter Select */}
      <div className="flex flex-col gap-2 rounded-2xl border border-[#1745b3] bg-[#081d5f] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#8fb8ff] font-semibold">Filter accounts</p>
          <p className="text-[11px] text-slate-500">Switch between all trading accounts, managers, and investors</p>
        </div>
        <div className="relative w-full sm:w-64">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TradingFilter)}
            className="w-full appearance-none rounded-xl border border-[#1745b3] bg-[#0b226a] px-3.5 py-2.5 pr-10 text-[11px] font-bold text-white outline-none transition-colors focus:border-[#2f64e0]"
            aria-label="Trading account filter"
          >
            {FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label} ({f.count})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8fb8ff]" />
        </div>
      </div>

      {/* Account table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <Layers size={36} className="mx-auto mb-3 opacity-30" />
          <p>{filter === 'all' ? 'No trading accounts found' : `No ${selectedFilterLabel} accounts found`}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1745b3] bg-[#081d5f] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0b226a] border-b border-[#1745b3] text-[#9ec0ff]">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Account</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Balance</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Equity</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Leverage</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Server</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Currency</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Free Margin</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Active Trades</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#153d9f]/60 bg-[#071a57]">
                {filtered.map((acc, idx) => {
                  const roleLabel = acc.accountRole === 'manager' ? 'Manager' : 'Investor';

                  return (
                    <tr key={`${acc.accNumber}-${idx}`} className="hover:bg-[#0a2267] transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${acc.accountRole === 'manager' ? 'bg-purple-500/10' : 'bg-emerald-500/10'}`}>
                            {acc.accountRole === 'manager'
                              ? <Layers size={14} className="text-purple-400" />
                              : <TrendingUp size={14} className="text-emerald-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-blue-400 truncate">{acc.accNumber}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">MT5 account</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                          acc.accountRole === 'manager'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-200 font-semibold">{acc.type || '-'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-emerald-400">{acc.balance || '-'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-blue-400">{acc.equity || '-'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-purple-400">{acc.leverage || '-'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-200">
                        {acc.server ? (
                          <span className="inline-flex items-center gap-1">
                            <Server size={11} className="text-[#8fb8ff]" />
                            {acc.server}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-200">{acc.currency || '-'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-amber-400">{acc.marginFree || '-'}</td>
                      <td className={`px-4 py-3.5 whitespace-nowrap font-bold ${acc.activeTrades > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {acc.activeTrades ?? 0}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex justify-end">
                          <StatusBadge status={acc.status ?? 'Active'} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL 3 — Profile (all ClientProfile fields, email disabled)
───────────────────────────────────────────────────────────── */
function ProfileModal({
  user,
  onSave,
  isViewerAdmin = false,
}: {
  user: UserData;
  onSave: (userId: string, data: Partial<UserData>) => void;
  isViewerAdmin?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,        // read-only
    phone: user.phone,
    country: user.country,
    dateOfBirth: user.dateOfBirth ?? '',
    address: user.address ?? '',
    city: user.city ?? '',
    postalCode: user.postalCode ?? '',
    tier: user.tier ?? 'Standard',
    kycStatus: user.kycStatus ?? 'Pending',
    avatar: user.avatar,
  });
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const canEdit = !isViewerAdmin;
  const editingEnabled = isEditing && canEdit;

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    let active = true;
    setLoadingProfile(true);

    fetch(`/api/admin/users/${getAdminUserApiId(user)}/profile/details`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'Unable to load profile data.');
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        const profile = data?.profile ?? {};
        setForm({
          name: data?.user?.name ?? profile.full_name ?? user.name,
          email: data?.user?.email ?? profile.email ?? user.email,
          phone: data?.user?.phone ?? profile.phone ?? user.phone,
          country: data?.user?.country ?? profile.country ?? user.country,
          dateOfBirth: profile.dateOfBirth ?? user.dateOfBirth ?? '',
          address: profile.address ?? user.address ?? '',
          city: profile.city ?? user.city ?? '',
          postalCode: profile.postalCode ?? user.postalCode ?? '',
          tier: profile.tier ?? user.tier ?? 'Standard',
          kycStatus: profile.kyc_status ?? user.kycStatus ?? 'Pending',
          avatar: data?.user?.avatar ?? user.avatar,
        });
      })
      .catch((error) => {
        if (!active) return;
        console.error('Failed to load profile data:', error);
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  const handleAvatarChange = (file: File) => {
    const url = URL.createObjectURL(file);
    setForm((p) => ({ ...p, avatar: url }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${getAdminUserApiId(user)}/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to submit profile update.');
      }
      const nextProfile = data?.profile ?? {};
      onSave(user.id, {
        ...form,
        name: data?.user?.name ?? nextProfile.full_name ?? form.name,
        email: data?.user?.email ?? nextProfile.email ?? form.email,
        phone: data?.user?.phone ?? nextProfile.phone ?? form.phone,
        country: data?.user?.country ?? nextProfile.country ?? form.country,
        dateOfBirth: nextProfile.dateOfBirth ?? form.dateOfBirth,
        address: nextProfile.address ?? form.address,
        city: nextProfile.city ?? form.city,
        postalCode: nextProfile.postalCode ?? form.postalCode,
        tier: nextProfile.tier ?? form.tier,
        kycStatus: nextProfile.kyc_status ?? form.kycStatus,
        avatar: data?.user?.avatar ?? form.avatar,
      });
      setIsEditing(false);
      window.dispatchEvent(new Event('admin-user-updated'));
    } catch (error) {
      console.error('Failed to submit profile update:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Avatar Editor */}
      {loadingProfile && (
        <div className="rounded-xl border border-[#1745b3] bg-[#081d5f]/70 px-3 py-2 text-[11px] text-slate-400">
          Loading profile data...
        </div>
      )}
      <div className="flex items-center gap-5 bg-[#081d5f] border border-[#1745b3] rounded-2xl p-4">
        <div className="relative group">
          <img
            src={form.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=1e3a5f&color=7dd3fc&size=96`}
            alt={form.name}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#214fbf]"
          />
          {editingEnabled && (
            <>
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-[#081d5f]/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera size={20} className="text-white" />
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
              />
            </>
          )}
        </div>
        <div>
          <p className="font-bold text-white text-sm">{form.name}</p>
          <p className="text-slate-400 text-xs mt-0.5">{form.email}</p>
          {editingEnabled && (
            <button
              onClick={() => avatarRef.current?.click()}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
            >
              <Camera size={12} /> Change Photo
            </button>
          )}
        </div>
        <div className="ml-auto flex flex-col items-end gap-2">
          <StatusBadge status={user.verified ? 'Verified' : 'Pending'} />
          <StatusBadge status={user.status} />
        </div>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProfileField
          label="Full Name"
          value={form.name}
          onChange={(value) => set('name', value)}
          icon={User}
          placeholder="Enter full name"
          editing={editingEnabled}
        />
        <ProfileField
          label="Email Address"
          value={form.email}
          onChange={(value) => set('email', value)}
          icon={Mail}
          disabled
          editing={editingEnabled}
        />
        <ProfileField
          label="Phone Number"
          value={form.phone}
          onChange={(value) => set('phone', value)}
          icon={Phone}
          placeholder="+1 555 123 4567"
          editing={editingEnabled}
        />
        <ProfileField
          label="Country"
          value={form.country}
          onChange={(value) => set('country', value)}
          icon={Globe}
          placeholder="Country"
          editing={editingEnabled}
        />
        <ProfileField
          label="Date of Birth"
          value={form.dateOfBirth}
          onChange={(value) => set('dateOfBirth', value)}
          icon={Calendar}
          type="date"
          className="sm:col-span-2"
          editing={editingEnabled}
        />
        <ProfileField
          label="City"
          value={form.city}
          onChange={(value) => set('city', value)}
          icon={MapPin}
          placeholder="City"
          editing={editingEnabled}
        />
        <ProfileField
          label="Address"
          value={form.address}
          onChange={(value) => set('address', value)}
          icon={MapPin}
          placeholder="Street address"
          editing={editingEnabled}
        />
        <ProfileField
          label="Postal Code"
          value={form.postalCode}
          onChange={(value) => set('postalCode', value)}
          icon={MapPin}
          placeholder="Postal code"
          className="sm:col-span-2"
          editing={editingEnabled}
        />
      </div>

      {/* Tier & KYC Status */}
      <div className="grid grid-cols-2 gap-4">
        <ProfileSelectField
          label="Account Tier"
          value={form.tier}
          onChange={(value) => set('tier', value)}
          icon={Shield}
          options={['Standard', 'Premium', 'VIP', 'VIP Premium', 'Elite']}
          helper="Controls the visible client tier and access level."
          editing={editingEnabled}
        />
        <ProfileSelectField
          label="KYC Status"
          value={form.kycStatus}
          onChange={(value) => set('kycStatus', value)}
          icon={ShieldCheck}
          options={['Pending', 'Verified', 'Rejected', 'Under Review']}
          helper="Tracks the current identity verification state."
          editing={editingEnabled}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-[1.6rem] border border-[#1745b3] bg-[#081d5f]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-white">
            {isEditing ? 'Finish your changes before closing.' : 'Open edit mode to update this profile.'}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {isEditing
              ? 'Save the profile when you are ready, or cancel to keep the current data.'
              : 'Use Edit Details to unlock the fields below.'}
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-2 sm:justify-end">
          {canEdit && (
            <button
              onClick={() => setIsEditing((prev) => !prev)}
              className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all ${
                isEditing
                  ? 'bg-[#0b226a] text-[#dbe8ff] border-[#1745b3] hover:bg-[#102c7c]'
                  : 'bg-purple-600/10 text-purple-400 border-purple-500/30 hover:bg-purple-600 hover:text-white'
              }`}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Details'}
            </button>
          )}
          {canEdit && isEditing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed_0%,#f0b91f_100%)] px-5 py-2.5 text-xs font-black text-white shadow-[0_16px_34px_rgba(124,58,237,0.24)] transition-all hover:scale-[1.01] disabled:opacity-60"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Save Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL 4 — Bank / Crypto (type-aware layout)
───────────────────────────────────────────────────────────── */
/* Crypto network icons meta */
const NETWORK_META: Record<string, { color: string; bg: string; symbol: string }> = {
  'USDT-TRC20': { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', symbol: '₮' },
  'USDT-ERC20': { color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       symbol: '₮' },
  'USDT-BEP20': { color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20',   symbol: '₮' },
  'USDT-SOL':   { color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20',   symbol: '₮' },
  'BTC':        { color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20',   symbol: '₿' },
  'ETH':        { color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20',   symbol: 'Ξ' },
  'BNB':        { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     symbol: 'B' },
  'SOL':        { color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20',   symbol: '◎' },
  'XRP':        { color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/20',         symbol: '✕' },
  'LTC':        { color: 'text-slate-300',   bg: 'bg-slate-500/10 border-slate-500/20',     symbol: 'Ł' },
  'TRX':        { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         symbol: 'T' },
  'DOGE':       { color: 'text-yellow-300',  bg: 'bg-yellow-400/10 border-yellow-400/20',   symbol: 'Ð' },
};
const FALLBACK_NETWORKS = Object.keys(NETWORK_META);

function BankCryptoModal({ user, isViewerAdmin = false }: { user: UserData; isViewerAdmin?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const canEdit = !isViewerAdmin;
  /* Determine type from backend or legacy field */
  const initType: 'bank' | 'crypto' = (() => {
    if (user.paymentDetails?.paymentType) return user.paymentDetails.paymentType;
    if (user.bankCrypto.cryptoWallet && user.bankCrypto.cryptoWallet !== 'Not Configured') return 'crypto';
    return 'bank';
  })();

  const [payType, setPayType] = useState<'bank' | 'crypto'>(initType);

  /* Bank form */
  const [bank, setBank] = useState({
    accountHolder: (user.paymentDetails as any)?.accountHolder ?? user.name,
    accountNumber: (user.paymentDetails as any)?.accountNumber ?? user.bankCrypto.accountMask ?? '',
    bankName: (user.paymentDetails as any)?.bankName ?? user.bankCrypto.bankName ?? '',
    ifscSwift: (user.paymentDetails as any)?.ifscSwift ?? '',
    branch: (user.paymentDetails as any)?.branch ?? '',
    country: (user.paymentDetails as any)?.country ?? user.country,
  });

  /* Crypto form — network fetched from backend */
  const initNetwork = (user.paymentDetails as any)?.network ?? user.bankCrypto.cryptoWallet?.match(/\(([^)]+)\)/)?.[1] ?? 'USDT-TRC20';
  const [crypto, setCrypto] = useState({
    cryptoAddress: (user.paymentDetails as any)?.cryptoAddress ?? (user.bankCrypto.cryptoWallet ?? '').replace(/\s*\([^)]+\)/, '').trim(),
    network: initNetwork,
  });
  const [networks, setNetworks]     = useState<string[]>(FALLBACK_NETWORKS);
  const [netLoading, setNetLoading] = useState(false);
  const [saving, setSaving]         = useState(false);
  const bankDirtyRef = useRef(false);
  const cryptoDirtyRef = useRef(false);

  useEffect(() => {
    let active = true;
    bankDirtyRef.current = false;
    cryptoDirtyRef.current = false;
    setLoadingPayment(true);

    fetch(`/api/admin/users/${getAdminUserApiId(user)}/payment/details`, { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(data?.message || 'Unable to load payment details.');
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        const payment = data?.payment_details ?? {};
        const bankData = payment?.bank ?? {};
        const cryptoData = payment?.crypto ?? {};
        const nextType: 'bank' | 'crypto' = payment?.paymentType === 'crypto'
          ? 'crypto'
          : payment?.paymentType === 'bank'
            ? 'bank'
            : (cryptoData?.wallet_address ? 'crypto' : 'bank');
        setPayType(nextType);
        if (!bankDirtyRef.current) {
          setBank({
            accountHolder: bankData?.account_holder ?? user.name,
            accountNumber: bankData?.account_number ?? '',
            bankName: bankData?.bank_name ?? '',
            ifscSwift: bankData?.ifsc_swift ?? '',
            branch: bankData?.branch ?? '',
            country: bankData?.country ?? user.country,
          });
        }
        if (!cryptoDirtyRef.current) {
          setCrypto({
            cryptoAddress: cryptoData?.wallet_address ?? '',
            network: cryptoData?.network ?? 'USDT-TRC20',
          });
        }
      })
      .catch((error) => {
        if (!active) return;
        console.error('Failed to load payment details:', error);
      })
      .finally(() => {
        if (active) setLoadingPayment(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  /* Fetch supported networks from backend on mount */
  useEffect(() => {
    setNetLoading(true);
    fetch('/api/crypto-networks')
      .then((r) => r.json())
      .then((data: { networks?: string[] }) => {
        if (data.networks?.length) setNetworks(data.networks);
      })
      .catch(() => {})
      .finally(() => setNetLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = payType === 'bank'
      ? { paymentType: 'bank', ...bank }
      : { paymentType: 'crypto', ...crypto };
    try {
      const response = await fetch(`/api/admin/users/${getAdminUserApiId(user)}/payment`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to submit payment details.');
      }
      setIsEditing(false);
      window.dispatchEvent(new Event('admin-user-updated'));
    } catch (error) {
      console.error('Failed to submit payment details:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="flex items-center justify-between border-b border-[#1745b3] pb-3 mb-4">
        <SectionTitle icon={CreditCard} label="Bank & Crypto Payment Details" color="text-amber-400" />
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isEditing
                ? 'bg-[#0b226a] text-[#dbe8ff] border-[#1745b3]'
                : 'bg-amber-600/10 text-amber-400 border-amber-500/30 hover:bg-amber-600 hover:text-white'
            }`}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Details'}
          </button>
        )}
      </div>

      {loadingPayment && (
        <div className="rounded-xl border border-[#1745b3] bg-[#081d5f]/70 px-3 py-2 text-[11px] text-slate-400">
          Loading payment details...
        </div>
      )}

      {/* Type Toggle */}
      <div className="flex items-center gap-2 p-1 bg-[#081d5f] rounded-2xl border border-[#1745b3]">
        <button
          type="button"
          onClick={() => setPayType('bank')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
            payType === 'bank' ? 'bg-[#0b226a] text-white shadow' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Building2 size={14} className={payType === 'bank' ? 'text-amber-400' : 'text-slate-500'} />
          Bank Transfer
        </button>
        <button
          type="button"
          onClick={() => setPayType('crypto')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
            payType === 'crypto' ? 'bg-[#0b226a] text-white shadow' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Bitcoin size={14} className={payType === 'crypto' ? 'text-orange-400' : 'text-slate-500'} />
          Cryptocurrency
        </button>
      </div>

      {/* ── Bank Fields ── */}
      {payType === 'bank' && (
        <div className="space-y-4">
          <div className="bg-[#081d5f] border border-[#1745b3]/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-amber-400" />
              <span className="font-bold text-white">Bank Account Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'accountHolder', label: 'Account Holder Name', placeholder: 'e.g. Alex Rivera',              mono: false },
                { key: 'accountNumber', label: 'Account Number',       placeholder: 'e.g. 6548 9456',               mono: true  },
                { key: 'bankName',      label: 'Bank Name',            placeholder: 'e.g. HDFC Bank',               mono: false },
                { key: 'ifscSwift',     label: 'IFSC / SWIFT Code',    placeholder: 'e.g. HDFC0002323 or HDFCINBB', mono: true  },
                { key: 'branch',        label: 'Branch (optional)',     placeholder: 'e.g. Mumbai Main Branch',      mono: false },
                { key: 'country',       label: 'Bank Country',          placeholder: 'e.g. India',                   mono: false },
              ].map(({ key, label, placeholder, mono }) => (
                <PaymentField
                  key={key}
                  label={label}
                  value={(bank as any)[key]}
                  onChange={(value) => {
                    bankDirtyRef.current = true;
                    setBank((p) => ({ ...p, [key]: value }));
                  }}
                  placeholder={placeholder}
                  mono={mono}
                  editing={canEdit && isEditing}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Crypto Fields — networks from backend ── */}
      {payType === 'crypto' && (
        <div className="bg-[#081d5f] border border-[#1745b3]/30 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bitcoin size={16} className="text-orange-400" />
              <span className="font-bold text-white">Crypto Wallet Details</span>
            </div>
            {netLoading && <RefreshCw size={13} className="animate-spin text-slate-500" />}
          </div>

          {/* Network Input */}
          <PaymentField
            label="Network / Coin Type"
            value={crypto.network}
            onChange={(value) => {
              cryptoDirtyRef.current = true;
              setCrypto((p) => ({ ...p, network: value }));
            }}
            placeholder="e.g. USDT-TRC20, BTC, ERC20"
            mono
            editing={canEdit && isEditing}
          />

          {/* Wallet Address */}
          <PaymentField
            label="Wallet Address"
            value={crypto.cryptoAddress}
            onChange={(value) => {
              cryptoDirtyRef.current = true;
              setCrypto((p) => ({ ...p, cryptoAddress: value }));
            }}
            placeholder="e.g. 0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
            mono
            editing={canEdit && isEditing}
          />

        </div>
      )}

      {canEdit && isEditing && (
        <div className="flex justify-end pt-2 border-t border-[#1745b3]">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs disabled:opacity-60 transition-all"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Save Payment Details
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL 5 — Add Account (Manager tab | Investor tab)
───────────────────────────────────────────────────────────── */
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Very High'];
const LEVERAGE_OPTIONS = ['50x', '100x', '200x', '300x', '500x', '1000x'];
const PAYOUT_FREQUENCIES = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'];

/* ── Secure password generator ── */
function generatePassword(length = 16): string {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$%&!?';
  const all = upper + lower + digits + special;
  let pwd = [
    upper [Math.floor(Math.random() * upper.length)],
    lower [Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = pwd.length; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pwd.sort(() => Math.random() - 0.5).join('');
}

function PasswordInput({
  label,
  value,
  onChange,
  placeholder = '••••••••',
  icon: Icon = KeyRound,
  generateLength = 16,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  generateLength?: number;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const pwd = generatePassword(generateLength);
    onChange(pwd);
    setShow(true);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pwd).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-wider text-[#8fb8ff] font-semibold flex items-center gap-1">
          <Icon size={11} className="text-[#8fb8ff]" /> {label}
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          title="Regenerate & copy strong password"
          className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border transition-all ${
            copied
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-[#0b226a] text-[#8fb8ff] hover:text-blue-300 hover:border-blue-500/40 border-[#1745b3]'
          }`}
        >
          {copied ? <CheckCircle2 size={10} /> : <RefreshCw size={10} />}
          {copied ? 'Copied!' : 'Regenerate'}
        </button>
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-3 pr-10 py-2.5 rounded-xl text-xs font-mono bg-[#0b226a] text-white border outline-none transition-all ${
            value ? 'border-blue-500/40' : 'border-[#1745b3]'
          } focus:border-blue-500`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {/* Strength bar */}
      {value && (
        <div className="flex gap-1 mt-0.5">
          {[8, 12, 16].map((threshold, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-all ${
                value.length >= threshold
                  ? i === 0 ? 'bg-red-500' : i === 1 ? 'bg-amber-400' : 'bg-emerald-400'
                  : 'bg-[#1745b3]'
              }`}
            />
          ))}
          <span className="text-[9px] text-slate-500 ml-1">
            {value.length < 8 ? 'Weak' : value.length < 12 ? 'Fair' : value.length < 16 ? 'Good' : 'Strong'}
          </span>
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-wider text-[#8fb8ff] font-semibold flex items-center gap-1">
        <Icon size={11} className="text-[#8fb8ff]" /> {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2.5 rounded-xl text-xs font-medium bg-[#0b226a] text-white border border-[#1745b3] focus:border-blue-500 outline-none appearance-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0b226a]">{o}</option>
        ))}
      </select>
    </div>
  );
}

function AddAccountModal({
  user,
  allUsers,
  onSubmit,
}: {
  user: UserData;
  allUsers: UserData[];
  onSubmit: (userName: string) => void;
}) {
  type AccountTab = 'manager' | 'investor';
  const [activeTab, setActiveTab] = useState<AccountTab>('manager');
  const [saving, setSaving] = useState(false);

  /* ── Manager form ── */
  const [mgr, setMgr] = useState({
    accountName: '',
    profitShare: '20',
    riskLevel: 'Medium',
    leverage: '500x',
    payoutFrequency: 'Weekly',
    masterPassword: '',
    investorPassword: '',
  });

  /* ── Investor form ── */
  const [managerSearch, setManagerSearch] = useState('');
  const [selectedManager, setSelectedManager] = useState<UserData | null>(null);
  const [inv, setInv] = useState({
    investmentPassword: '',
    confirmPassword: '',
  });
  const [showManagerDrop, setShowManagerDrop] = useState(false);

  /* Automatically pre-generate secure passwords on mount */
  useEffect(() => {
    const master = generatePassword(8);
    const investor = generatePassword(8);
    setMgr((p) => ({
      ...p,
      masterPassword: master,
      investorPassword: investor,
    }));

    const invest = generatePassword(16);
    setInv({
      investmentPassword: invest,
      confirmPassword: invest,
    });
  }, [activeTab]);

  /* Build manager list from allUsers where tradingAccount.type or role implies manager */
  const managerUsers = useMemo(() => {
    return allUsers.filter(
      (u) =>
        u.role?.toLowerCase().includes('manager') ||
        (u.tradingAccounts || []).some((a) => a.accountRole === 'manager') ||
        u.tradingAccount?.type?.toLowerCase().includes('master') ||
        u.tradingAccount?.type?.toLowerCase().includes('mam'),
    );
  }, [allUsers]);

  const filteredManagers = useMemo(() => {
    const q = managerSearch.toLowerCase();
    return managerUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.tradingAccount?.accNumber?.toLowerCase().includes(q),
    );
  }, [managerUsers, managerSearch]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload =
        activeTab === 'manager'
          ? { type: 'manager', userId: user.id, ...mgr }
          : {
              type: 'investor',
              userId: user.id,
              managerId: selectedManager?.id,
              managerAccNumber: selectedManager?.tradingAccount?.accNumber,
              profitShare: selectedManager?.tradingAccount?.type,
              investmentPassword: inv.investmentPassword,
            };
      await fetch('/api/admin/accounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      onSubmit(user.name);
    } catch {}
    finally { setSaving(false); }
  };

  const isManagerValid = mgr.accountName.trim() && mgr.masterPassword && mgr.investorPassword;
  const isInvestorValid =
    selectedManager && inv.investmentPassword && inv.investmentPassword === inv.confirmPassword;

  return (
    <div className="space-y-5 text-xs">
      <SectionTitle icon={PlusCircle} label="Create MT5 Account" color="text-emerald-400" />

      {/* ── Account Type Toggle ── */}
      <div className="flex items-center gap-2 p-1 bg-[#081d5f] rounded-2xl border border-[#1745b3]">
        <button
          onClick={() => setActiveTab('manager')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'manager'
              ? 'bg-[#0b226a] text-white shadow'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Layers size={14} className={activeTab === 'manager' ? 'text-purple-400' : 'text-slate-500'} />
          Manager Account
        </button>
        <button
          onClick={() => setActiveTab('investor')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'investor'
              ? 'bg-[#0b226a] text-white shadow'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserCheck size={14} className={activeTab === 'investor' ? 'text-emerald-400' : 'text-slate-500'} />
          Investor Account
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          MANAGER TAB
      ═══════════════════════════════════════════ */}
      {activeTab === 'manager' && (
        <div className="space-y-4">
          <div className="bg-[#081d5f] border border-purple-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers size={15} className="text-purple-400" />
              <span className="font-bold text-white">Manager Account Setup</span>
              <span className="ml-auto text-[10px] text-slate-500">for {user.name}</span>
            </div>

            {/* Account Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                <BarChart2 size={11} className="text-slate-400" /> Account Name
              </label>
              <input
                type="text"
                value={mgr.accountName}
                onChange={(e) => setMgr((p) => ({ ...p, accountName: e.target.value }))}
                placeholder="e.g. Global Alpha MAM"
                className="px-3 py-2.5 rounded-xl text-xs bg-[#0b226a] text-white border border-[#1745b3] focus:border-purple-500 outline-none"
              />
            </div>

            {/* Profit Share */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                <Percent size={11} className="text-slate-400" /> Profit Share (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={mgr.profitShare}
                  onChange={(e) => setMgr((p) => ({ ...p, profitShare: e.target.value }))}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl text-xs bg-[#0b226a] text-white border border-[#1745b3] focus:border-purple-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">%</span>
              </div>
            </div>

            {/* Row: Risk + Leverage */}
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Risk Level"
                value={mgr.riskLevel}
                onChange={(v) => setMgr((p) => ({ ...p, riskLevel: v }))}
                options={RISK_LEVELS}
                icon={Zap}
              />
              <SelectField
                label="Leverage"
                value={mgr.leverage}
                onChange={(v) => setMgr((p) => ({ ...p, leverage: v }))}
                options={LEVERAGE_OPTIONS}
                icon={TrendingUp}
              />
            </div>

            {/* Payout Frequency */}
            <SelectField
              label="Payout Frequency"
              value={mgr.payoutFrequency}
              onChange={(v) => setMgr((p) => ({ ...p, payoutFrequency: v }))}
              options={PAYOUT_FREQUENCIES}
              icon={CalendarClock}
            />

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1745b3]">
              <PasswordInput
                label="Master Password"
                value={mgr.masterPassword}
                onChange={(v) => setMgr((p) => ({ ...p, masterPassword: v }))}
                placeholder="Master password"
              />
              <PasswordInput
                label="Investor Password"
                value={mgr.investorPassword}
                onChange={(v) => setMgr((p) => ({ ...p, investorPassword: v }))}
                placeholder="Investor (read-only) password"
              />
            </div>
          </div>

          {/* Preview strip */}
          {mgr.accountName && (
            <div className="flex flex-wrap gap-3 px-1">
              {[
                { label: 'Name', val: mgr.accountName, color: 'text-white' },
                { label: 'Profit', val: `${mgr.profitShare}%`, color: 'text-emerald-400' },
                { label: 'Risk', val: mgr.riskLevel, color: 'text-amber-400' },
                { label: 'Leverage', val: mgr.leverage, color: 'text-purple-400' },
                { label: 'Payout', val: mgr.payoutFrequency, color: 'text-blue-400' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-0.5 bg-[#081d5f] border border-[#1745b3] rounded-xl px-3 py-2">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">{item.label}</span>
                  <span className={`font-bold text-xs ${item.color}`}>{item.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          INVESTOR TAB
      ═══════════════════════════════════════════ */}
      {activeTab === 'investor' && (
        <div className="space-y-4">
          <div className="bg-[#081d5f] border border-emerald-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck size={15} className="text-emerald-400" />
              <span className="font-bold text-white">Investor Account Setup</span>
              <span className="ml-auto text-[10px] text-slate-500">linked to {user.name}</span>
            </div>

            {/* Manager Select with Search */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                <Layers size={11} className="text-slate-400" /> Select Manager Account
              </label>

              {/* Selected chip */}
              {selectedManager && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <img
                    src={selectedManager.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedManager.name)}&background=1e3a5f&color=7dd3fc&size=40`}
                    className="w-7 h-7 rounded-lg object-cover"
                    alt={selectedManager.name}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-xs truncate">{selectedManager.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{selectedManager.tradingAccount?.accNumber}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    {selectedManager.tradingAccount?.type?.substring(0, 16) ?? 'MAM'}
                  </span>
                  <button
                    onClick={() => { setSelectedManager(null); setManagerSearch(''); }}
                    className="text-slate-500 hover:text-red-400 shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Search input */}
              {!selectedManager && (
                <div className="relative">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0b226a] border border-[#1745b3] focus-within:border-emerald-500 transition-colors">
                    <Search size={13} className="text-slate-500 shrink-0" />
                    <input
                      type="text"
                      value={managerSearch}
                      onChange={(e) => { setManagerSearch(e.target.value); setShowManagerDrop(true); }}
                      onFocus={() => setShowManagerDrop(true)}
                      onBlur={() => setTimeout(() => setShowManagerDrop(false), 180)}
                      placeholder="Search manager by name or account..."
                      className="bg-transparent outline-none text-xs text-white placeholder-slate-500 flex-1"
                    />
                  </div>

                  {/* Dropdown */}
                  {showManagerDrop && (
                    <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-[#0b226a] border border-[#1745b3] rounded-2xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
                      {filteredManagers.length === 0 ? (
                        <div className="px-4 py-6 text-center text-slate-500 text-xs">
                          No managers found
                        </div>
                      ) : (
                        filteredManagers.map((m) => (
                          <button
                            key={m.id}
                            onMouseDown={() => {
                              setSelectedManager(m);
                              setManagerSearch('');
                              setShowManagerDrop(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#102c7c] transition-colors text-left border-b border-[#1745b3] last:border-0"
                          >
                            <img
                              src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1e3a5f&color=7dd3fc&size=40`}
                              className="w-8 h-8 rounded-xl object-cover shrink-0"
                              alt={m.name}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-xs truncate">{m.name}</p>
                              <p className="text-[10px] text-slate-400">{m.email}</p>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <span className="font-mono text-blue-400 text-[10px] font-bold">{m.tradingAccount?.accNumber}</span>
                              <span className="text-[9px] text-emerald-400 font-bold">
                                Profit: {m.tradingAccount?.leverage ?? '—'}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profit Share display (auto from selected manager) */}
            {selectedManager && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 bg-[#0b226a] border border-[#1745b3] rounded-xl px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Account</span>
                  <span className="font-mono font-bold text-blue-400 text-xs">{selectedManager.tradingAccount?.accNumber}</span>
                </div>
                <div className="flex flex-col gap-1 bg-[#0b226a] border border-[#1745b3] rounded-xl px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Profit Share</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    {selectedManager.tradingAccount?.type?.includes('20') ? '20%' : '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 bg-[#0b226a] border border-[#1745b3] rounded-xl px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Leverage</span>
                  <span className="font-bold text-purple-400 text-xs">{selectedManager.tradingAccount?.leverage}</span>
                </div>
              </div>
            )}

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1745b3]">
              <PasswordInput
                label="Investment Password"
                value={inv.investmentPassword}
                onChange={(v) => setInv((p) => ({ ...p, investmentPassword: v }))}
                placeholder="Set investment password"
                icon={KeyRound}
              />
              <PasswordInput
                label="Confirm Password"
                value={inv.confirmPassword}
                onChange={(v) => setInv((p) => ({ ...p, confirmPassword: v }))}
                placeholder="Confirm password"
                icon={KeyRound}
              />
            </div>

            {/* Password mismatch warning */}
            {inv.confirmPassword && inv.investmentPassword !== inv.confirmPassword && (
              <div className="flex items-center gap-2 text-red-400 text-[11px] px-1">
                <AlertCircle size={12} /> Passwords do not match
              </div>
            )}
            {inv.confirmPassword && inv.investmentPassword === inv.confirmPassword && inv.investmentPassword && (
              <div className="flex items-center gap-2 text-emerald-400 text-[11px] px-1">
                <CheckCircle2 size={12} /> Passwords match
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1745b3]">
        <p className="text-[10px] text-slate-500">
          {activeTab === 'manager'
            ? 'Creates a new MAM master account with specified settings'
            : 'Links investor to an existing MAM manager account'}
        </p>
        <button
          onClick={handleSubmit}
          disabled={saving || (activeTab === 'manager' ? !isManagerValid : !isInvestorValid)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <PlusCircle size={13} />}
          Create {activeTab === 'manager' ? 'Manager' : 'Investor'} Account
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ReplySection
───────────────────────────────────────────────────────────── */
const ReplySection = ({ onSendMessage, isSubmitting }: { onSendMessage: (message: string, file: File | null) => void, isSubmitting: boolean }) => {
  const [localMessage, setLocalMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="mt-4">
      <div className="p-2 rounded-xl border transition-all focus-within:border-indigo-500/50 border-[#1745b3] bg-[#0b226a]/50 flex flex-col">
        <textarea
          value={localMessage}
          onChange={(e) => setLocalMessage(e.target.value)}
          placeholder="Compose a response..."
          rows={3}
          className="w-full p-2 bg-transparent text-[11px] text-[#dbe8ff] outline-none font-medium resize-none placeholder:text-[#6f92e7]"
        />
        
        {selectedFile && (
          <div className="relative group rounded-lg overflow-hidden border border-[#1745b3] shadow-lg bg-[#081d5f] p-2 max-w-[120px] mb-2 mx-2">
            {selectedFile.type.startsWith('image/') ? (
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt={selectedFile.name} 
                className="w-full h-16 object-cover rounded-md mb-2" 
                onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
              />
            ) : (
              <div className="w-full h-16 bg-[#1745b3]/30 rounded-md mb-2 flex flex-col items-center justify-center text-[#8fb8ff]">
                <FileText size={20} />
                <span className="text-[8px] uppercase tracking-wider mt-1 font-bold px-1 truncate w-full text-center">{selectedFile.name.split('.').pop()}</span>
              </div>
            )}
            <p className="text-[9px] text-[#8fb8ff] truncate w-full px-1 mb-1">{selectedFile.name}</p>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X size={10} />
            </button>
          </div>
        )}
        
        <div className="flex justify-between items-center px-2 pt-2 border-t border-[#1745b3]">
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setSelectedFile(e.target.files[0]);
              }
            }}
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg transition-colors hover:bg-[#1745b3] text-[#8fb8ff] hover:text-[#dbe8ff] flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          >
            <Plus size={14} /> Attachment
          </button>
          <button
            onClick={() => {
              if (localMessage.trim() || selectedFile) {
                onSendMessage(localMessage, selectedFile);
                setLocalMessage("");
                setSelectedFile(null);
              }
            }}
            disabled={(!localMessage.trim() && !selectedFile) || isSubmitting}
            className="px-4 py-1.5 rounded-lg text-[10px] font-black hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 bg-indigo-500 text-white"
          >
            {isSubmitting ? 'Sending...' : 'Send Secure Message'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const [adminRole, setAdminRole] = useState(() => {
    if (typeof document === 'undefined') {
      return '';
    }
    return getAdminRole();
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('USR-001');

  const [activeModalUser, setActiveModalUser] = useState<UserData | null>(null);
  const [activeModalType, setActiveModalType] = useState<UserModalType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const [kycDetailsByUserId, setKycDetailsByUserId] = useState<
    Record<string, { loading: boolean; error: string | null; data: AdminUserKycDetails | null }>
  >({});
  const [transactionDetailsByUserId, setTransactionDetailsByUserId] = useState<
    Record<string, AdminTransactionModalState>
  >({});
  const [ticketDetailsByUserId, setTicketDetailsByUserId] = useState<
    Record<string, AdminTicketModalState>
  >({});
  const [activeTicketTab, setActiveTicketTab] = useState<'Open' | 'Pending' | 'Close'>('Open');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [statusSavingByUserId, setStatusSavingByUserId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  const isViewerAdmin = useMemo(() => isViewerRole(adminRole), [adminRole]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (page) params.set('page', String(page));
      if (perPage) params.set('per_page', String(perPage));
      if (searchTerm) params.set('search', searchTerm);
      fetch(`/api/admin/users?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (!active) return;
          if (data?.users && Array.isArray(data.users)) {
            setUsers(data.users);
            if (data.pagination) {
              setTotal(Number(data.pagination.total ?? data.users.length));
              setTotalPages(Number(data.pagination.total_pages ?? Math.ceil((data.pagination.total ?? data.users.length) / perPage)));
            } else {
              setTotal(data.users.length);
              setTotalPages(1);
            }
          } else {
            // fallback to mock data
            const mock = getAdminUsers() as UserData[];
            const filteredMock = mock.filter(
              (u) =>
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setTotal(filteredMock.length);
            setTotalPages(Math.max(1, Math.ceil(filteredMock.length / perPage)));
            setUsers(filteredMock.slice((page - 1) * perPage, page * perPage));
          }
        })
        .catch(() => {
          if (!active) return;
          const mock = getAdminUsers() as UserData[];
          const filteredMock = mock.filter(
            (u) =>
              u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
              u.id.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setTotal(filteredMock.length);
          setTotalPages(Math.max(1, Math.ceil(filteredMock.length / perPage)));
          setUsers(filteredMock.slice((page - 1) * perPage, page * perPage));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, perPage, searchTerm]);

  const showToast = (msg: string, isError = false) => {
    setToastMessage(null);
    if (isError) {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
    // Use timeout to allow React to trigger animation redraw
    setTimeout(() => {
      setToastMessage(msg);
    }, 50);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!expandedRowId) return;

    const activeUser = users.find((user) => user.id === expandedRowId);
    if (!activeUser) return;

    const controller = new AbortController();
    setKycDetailsByUserId((prev) => ({
      ...prev,
      [expandedRowId]: {
        loading: true,
        error: null,
        data: prev[expandedRowId]?.data ?? activeUser.kyc ?? null,
      },
    }));

    fetch(`/api/admin/users/${getAdminUserApiId(activeUser)}/kyc`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load KYC data');
        }
        return data;
      })
      .then((data) => {
        setKycDetailsByUserId((prev) => ({
          ...prev,
          [expandedRowId]: {
            loading: false,
            error: null,
            data: normalizeKycDetails(data, activeUser.kyc),
          },
        }));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setKycDetailsByUserId((prev) => ({
          ...prev,
          [expandedRowId]: {
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load KYC data',
            data: prev[expandedRowId]?.data ?? activeUser.kyc ?? null,
          },
        }));
      });

    return () => controller.abort();
  }, [expandedRowId, users]);

  useEffect(() => {
    if (activeModalType !== 'transactions' || !activeModalUser) return;

    const controller = new AbortController();
    const userId = activeModalUser.id;

    setTransactionDetailsByUserId((prev) => ({
      ...prev,
      [userId]: {
        loading: true,
        error: null,
        transactions: prev[userId]?.transactions ?? (activeModalUser.transactions ?? []),
        summary: prev[userId]?.summary ?? null,
      },
    }));

    const apiUserId = getAdminUserApiId(activeModalUser);

    fetch(`/api/admin/users/${apiUserId}/transactions/details`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load transaction history');
        }
        return data as {
          summary?: AdminTransactionApiSummary;
          transactions?: AdminTransactionApiItem[];
        };
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const transactions = Array.isArray(data?.transactions)
          ? data.transactions.map(normalizeTransactionRecord)
          : [];
        setTransactionDetailsByUserId((prev) => ({
          ...prev,
          [userId]: {
            loading: false,
            error: null,
            transactions,
            summary: data?.summary ?? null,
          },
        }));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setTransactionDetailsByUserId((prev) => ({
          ...prev,
          [userId]: {
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load transaction history',
            transactions: prev[userId]?.transactions ?? (activeModalUser.transactions ?? []),
            summary: prev[userId]?.summary ?? null,
          },
        }));
      });

    return () => controller.abort();
  }, [activeModalType, activeModalUser?.id]);

  useEffect(() => {
    if (activeModalType !== 'tickets' || !activeModalUser) return;

    const controller = new AbortController();
    const userId = activeModalUser.id;

    setTicketDetailsByUserId((prev) => ({
      ...prev,
      [userId]: {
        loading: true,
        error: null,
        tickets: prev[userId]?.tickets ?? (activeModalUser.tickets ?? []),
        summary: prev[userId]?.summary ?? null,
      },
    }));

    const apiUserId = getAdminUserApiId(activeModalUser);

    fetch(`/api/admin/users/${apiUserId}/tickets`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load ticket history');
        }
        return data as {
          summary?: AdminTicketApiSummary;
          tickets?: AdminTicketApiItem[];
        };
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const tickets = Array.isArray(data?.tickets)
          ? data.tickets.map(normalizeTicketRecord)
          : [];
        setTicketDetailsByUserId((prev) => ({
          ...prev,
          [userId]: {
            loading: false,
            error: null,
            tickets,
            summary: data?.summary ?? null,
          },
        }));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setTicketDetailsByUserId((prev) => ({
          ...prev,
          [userId]: {
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load ticket history',
            tickets: prev[userId]?.tickets ?? (activeModalUser.tickets ?? []),
            summary: prev[userId]?.summary ?? null,
          },
        }));
      });

    return () => controller.abort();
  }, [activeModalType, activeModalUser?.id]);

  const handleTicketSendMessage = async (ticketId: string, content: string, file: File | null) => {
    if (!activeModalUser) return;
    if (isViewerAdmin) {
      toast.error('Viewer accounts do not have permission to send messages.');
      return;
    }

    setIsSendingMessage(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      if (file) {
        formData.append("documents", file);
      }
      
      const res = await fetch(`/api/admin/tickets/${ticketId}/message`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to send message");
      }

      const newMessage = data.new_message;
      
      setTicketDetailsByUserId((prev) => {
        const userTickets = prev[activeModalUser.id]?.tickets || [];
        const updatedTickets = userTickets.map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              messages: [...(t.messages || []), newMessage],
            };
          }
          return t;
        });

        return {
          ...prev,
          [activeModalUser.id]: {
            ...prev[activeModalUser.id],
            tickets: updatedTickets,
          }
        };
      });

      toast.success("Message sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "Error sending message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    if (activeModalType !== 'account_active' || !activeModalUser) return;

    const controller = new AbortController();
    const userId = activeModalUser.id;

    const apiUserId = getAdminUserApiId(activeModalUser);

    fetch(`/api/admin/users/${apiUserId}/kyc`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load account status');
        }
        return data as { user?: { status?: string | null } };
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const nextStatus = data?.user?.status ? String(data.user.status) : activeModalUser.status;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  status: nextStatus as UserData['status'],
                }
              : u,
          ),
        );
        setActiveModalUser((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus as UserData['status'],
              }
            : prev,
        );
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Failed to refresh account status:', err);
      });

    return () => controller.abort();
  }, [activeModalType, activeModalUser?.id]);

  const toggleDropdownRow = (userId: string) =>
    setExpandedRowId((prev) => (prev === userId ? null : userId));

  const openSubRowModal = (user: UserData | null, type: UserModalType) => {
    setActiveModalUser(user);
    setActiveModalType(type);
  };

  const closeModal = () => {
    setActiveModalUser(null);
    setActiveModalType(null);
  };

  const handleCreateUserSubmit = async (formData: CreateUserFormData) => {
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || '',
          country: formData.country || 'United States',
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || 'Failed to create user'); return; }
      setUsers((prev) => [data.user, ...prev]);
      closeModal();
      showToast(`User ${data.user.name} created successfully!`);
    } catch {
      showToast('Network error — could not create user');
    }
  };

  const toggleUserActiveStatus = async (userId: string) => {
    const currentUser = users.find((u) => u.id === userId) ?? activeModalUser;
    const nextStatus = isAccountActive(currentUser?.status) ? 'Inactive' : 'Active';

    setStatusSavingByUserId((prev) => ({ ...prev, [userId]: true }));
    try {
      const apiUserId = getAdminUserApiId(currentUser);
      const res = await fetch(`/api/admin/users/${apiUserId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update user status');
      }

      const nextUser = data?.user ?? {};
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                status: (nextUser.status ?? nextStatus) as UserData['status'],
              }
            : u,
        ),
      );
      if (activeModalUser?.id === userId) {
        setActiveModalUser((prev) =>
          prev
            ? {
                ...prev,
                status: (nextUser.status ?? nextStatus) as UserData['status'],
              }
            : prev,
        );
      }
      showToast(`User ${currentUser?.name ?? userId} status updated to ${nextStatus}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setStatusSavingByUserId((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const toggleVerification = (userId: string, verified: boolean) => {
    const apiUserId = getAdminUserApiId(users.find((u) => u.id === userId) ?? activeModalUser);
    fetch(`/api/admin/users/${apiUserId}/kyc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to update KYC status');
        }
        return data;
      })
      .then((data) => {
        const nextKyc = normalizeKycDetails(data?.kyc ?? data, activeModalUser?.kyc ?? undefined);
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== userId) return u;
            const updated = {
              ...u,
              verified: Boolean(data?.user?.verified ?? verified),
              kycStatus: data?.kyc?.kyc_status ?? data?.kyc_status ?? (verified ? 'Verified' : 'Pending'),
              kyc: nextKyc,
            };
            if (activeModalUser?.id === userId) setActiveModalUser(updated);
            showToast(`User ${u.name} KYC ${verified ? 'Verified' : 'Revoked'}`, !verified);
            return updated;
          }),
        );
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Failed to update KYC status');
      });
  };

  const handleDocumentsSaved = (userId: string, kyc: AdminUserKycDetails) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated = {
          ...u,
          verified: Boolean(kyc.user?.verified ?? u.verified),
          kycStatus: kyc.kyc_status ?? u.kycStatus,
          kyc,
        };
        if (activeModalUser?.id === userId) setActiveModalUser(updated);
        showToast(`Document status for ${u.name} saved successfully`);
        return updated;
      }),
    );
  };

  const handleProfileSave = (userId: string, data: Partial<UserData>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated = {
          ...u,
          ...data,
          profile: u.profile
            ? {
                ...u.profile,
                full_name: data.name ?? u.profile.full_name,
                email: data.email ?? u.profile.email,
                phone: data.phone ?? u.profile.phone,
                country: data.country ?? u.profile.country,
                dateOfBirth: data.dateOfBirth ?? u.profile.dateOfBirth,
                address: data.address ?? u.profile.address,
                city: data.city ?? u.profile.city,
                postalCode: data.postalCode ?? u.profile.postalCode,
                tier: data.tier ?? u.profile.tier,
                kyc_status: data.kycStatus ?? u.profile.kyc_status,
              }
            : u.profile,
        };
        if (activeModalUser?.id === userId) setActiveModalUser(updated);
        return updated;
      }),
    );
    const user = users.find((u) => u.id === userId);
    showToast(`Profile for ${user?.name || userId} updated successfully`);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const apiUserId = getAdminUserApiId(users.find((u) => u.id === userId) ?? activeModalUser);
      const res = await fetch(`/api/admin/users/${apiUserId}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (activeModalUser?.id === userId) {
        setActiveModalUser(null);
      }
      closeModal();
      showToast(`User ${userName} deleted successfully`);
      refreshUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const refreshUsers = () => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => {
        if (data?.users && Array.isArray(data.users)) setUsers(data.users);
      })
      .catch(() => {});
  };

  const handleAddAccountSubmit = (userName: string) => {
    closeModal();
    showToast(`New MT5 Live Account initialized for ${userName}`);
    refreshUsers();
  };

  // users state already contains the paginated and filtered list of users for the current page
  const renderedUsers = users;

  const MODAL_TITLES: Record<string, string> = {
    verifi: 'KYC & Document Verification',
    trading: 'Trading Accounts',
    profile: 'Client Profile',
    bank_crypto: 'Bank & Crypto Details',
    transactions: 'Transaction History',
    tickets: 'Support Tickets',
    add_account: 'Add New Account',
    account_active: 'Account Status',
    delete_user: 'Delete User',
  };
  const modalWidthClass = activeModalType === 'trading' ? 'w-[95vw] max-w-7xl' : 'w-full max-w-2xl';

  return (
    <>
      <Head>
        <title>Users Directory | Admin Portal</title>
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
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#e6c687] text-[9px] font-black uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" /> User Management Engine
                </div>
                <h1 className="text-lg font-black tracking-tight text-white uppercase">
                  Users Directory
                </h1>
                <p className="text-[11px] text-slate-400">
                  Manage user profiles, identity verification (KYC), payment details, and trading account statuses.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refreshUsers()}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all hover:border-[#d4af37]/40"
              >
                <RefreshCw size={13} className={loading ? "animate-spin text-[#d4af37]" : ""} />
                <span>Sync Directory</span>
              </button>

              {!isViewerAdmin && (
                <button
                  onClick={() => openSubRowModal(null, 'create_user')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Plus size={14} /> Add New User
                </button>
              )}
            </div>
          </div>

          {/* SUMMARY KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Total Registered</div>
                <div className="text-xl font-black text-white mt-0.5">{users.length} <span className="text-[9px] text-slate-500 font-semibold uppercase">Users</span></div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Users size={16} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Verified Clients</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {users.filter(u => u.verified || u.kycStatus === 'Verified' || u.kycStatus === 'Approved').length}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck size={16} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Active Accounts</div>
                <div className="text-xl font-black text-[#d4af37] mt-0.5">
                  {users.filter(u => isAccountActive(u.status)).length}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] shrink-0">
                <UserCheck size={16} />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Pending Verification</div>
                <div className="text-xl font-black text-amber-400 mt-0.5">
                  {users.filter(u => !u.verified && u.kycStatus !== 'Verified' && u.kycStatus !== 'Approved').length}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Clock size={16} />
              </div>
            </div>

          </div>

          {/* TOAST NOTIFICATION */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          {/* MAIN TABLE CONTAINER */}
          <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 sm:p-4 shadow-xl">
            
            {/* TOOLBAR SEARCH */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-white/10">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search user ID, name, email, or country..." 
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37] transition-all" 
                />
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(''); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-400 font-bold">
                Total clients: <span className="text-[#d4af37] font-mono">{total ?? users.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                    <th className="pb-2 px-2.5">User ID</th>
                    <th className="pb-2 px-2.5">Name</th>
                    <th className="pb-2 px-2.5">Email</th>
                    <th className="pb-2 px-2.5">Phone</th>
                    <th className="pb-2 px-2.5">Role</th>
                    <th className="pb-2 px-2.5">Verification</th>
                    <th className="pb-2 px-2.5">Status</th>
                    <th className="pb-2 px-2.5">Registered</th>
                    <th className="pb-2 px-2.5">Country</th>
                    <th className="pb-2 px-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {loading ? (
                  /* ── Pulsating Skeleton Rows ── */
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 pl-2">
                        <div className="h-4 w-14 bg-[#102c7c] rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#102c7c] rounded-xl" />
                          <div className="h-3.5 w-24 bg-[#102c7c] rounded-lg" />
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="h-3 w-32 bg-[#102c7c] rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-20 bg-[#102c7c] rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-5 w-16 bg-[#102c7c]/60 rounded-full" />
                      </td>
                      <td className="py-4">
                        <div className="h-5 w-16 bg-[#102c7c]/60 rounded-full" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-16 bg-[#102c7c] rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-20 bg-[#102c7c] rounded-lg" />
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <div className="inline-block h-7 w-20 bg-[#102c7c] rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : total === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      No users match the search filter.
                    </td>
                  </tr>
                ) : (
                  renderedUsers.map((u) => {
                    const isExpanded = expandedRowId === u.id;
                    const isViewer = isViewerAdmin;
                    const kycState = kycDetailsByUserId[u.id];
                    const rowKyc = kycState?.data ?? u.kyc ?? null;
                    return (
                      <React.Fragment key={u.id}>
                        <tr
                          onClick={() => toggleDropdownRow(u.id)}
                          className={`cursor-pointer transition-colors group ${
                            isExpanded ? 'bg-slate-800/60' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-2.5 font-mono text-xs font-bold text-[#d4af37]">
                            {u.user_id}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0f224a&color=d4af37&size=80`}
                                alt={u.name}
                                className="w-7 h-7 rounded-md object-cover border border-white/10 group-hover:border-[#d4af37]/40 transition-colors"
                              />
                              <span className="font-bold text-slate-100 text-xs">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-xs text-slate-300 font-mono">
                            {u.email}
                          </td>
                          <td className="py-2.5 px-2.5 text-xs text-slate-300 font-mono">
                            {u.phone}
                          </td>
                          <td className="py-2.5 px-2.5 font-bold text-white text-xs">{u.role}</td>
                          <td className="py-2.5 px-2.5">
                            <StatusBadge status={String(rowKyc?.status ?? u.kycStatus ?? (u.verified ? 'Verified' : 'Pending'))} />
                          </td>
                          <td className="py-2.5 px-2.5" onClick={(e) => e.stopPropagation()}>
                            {isViewer ? (
                              <StatusBadge status={u.status} />
                            ) : (
                              <button
                                onClick={() => { void toggleUserActiveStatus(u.id); }}
                                disabled={Boolean(statusSavingByUserId[u.id])}
                                title={`Click to set account ${isAccountActive(u.status) ? 'Inactive' : 'Active'}`}
                                className="inline-flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
                              >
                                {statusSavingByUserId[u.id] ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-500/20 bg-blue-500/10 text-blue-300">
                                    <RefreshCw size={11} className="animate-spin" /> Saving...
                                  </span>
                                ) : (
                                  <StatusBadge status={u.status} />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 font-medium text-slate-400 text-xs">{u.joined}</td>
                          <td className="py-2.5 px-2.5 font-bold text-slate-200 text-xs">{u.country || 'United States'}</td>
                          <td className="py-2.5 px-2.5 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleDropdownRow(u.id); }}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                                isExpanded 
                                  ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 border-transparent font-black shadow-md' 
                                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-[#d4af37]/40'
                              }`}
                            >
                              <span>{isExpanded ? 'Hide Menu' : 'Actions'}</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </td>
                        </tr>

                      {/* ── EXPANDED SUB-ROW DRAWER ── */}
                      {isExpanded && (
                        <tr className="bg-slate-950/60 border-b border-white/10">
                          <td colSpan={10} className="p-3 sm:p-4">
                            <div className="bg-slate-900 border border-white/10 rounded-xl p-3.5 shadow-2xl space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                                <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                  <Sparkles size={14} className="text-[#d4af37]" />
                                  <span>User Management Console — <strong className="text-[#d4af37]">{u.name}</strong></span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  User Ref: <strong className="text-[#d4af37]">{u.id}</strong>
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button onClick={() => openSubRowModal(u, 'verifi')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all shadow-sm">
                                  <ShieldCheck size={14} className="text-[#d4af37]" /> KYC Verify
                                </button>
                                <button onClick={() => openSubRowModal(u, 'trading')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all shadow-sm">
                                  <TrendingUp size={14} className="text-emerald-400" /> Trading
                                </button>
                                <button onClick={() => openSubRowModal(u, 'profile')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all shadow-sm">
                                  <User size={14} className="text-purple-300" /> Profile
                                </button>
                                <button onClick={() => openSubRowModal(u, 'bank_crypto')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all shadow-sm">
                                  <CreditCard size={14} className="text-amber-300" /> Bank/Crypto
                                </button>
                                <button onClick={() => openSubRowModal(u, 'transactions')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all shadow-sm">
                                  <ArrowUpRight size={14} className="text-teal-300" /> Transactions
                                </button>
                                <button onClick={() => openSubRowModal(u, 'tickets')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-[#d4af37]/40 text-xs font-bold transition-all shadow-sm">
                                  <Ticket size={14} className="text-indigo-300" /> Tickets ({u.tickets?.length || 0})
                                </button>
                                {!isViewer && (
                                  <>
                                    <button onClick={() => openSubRowModal(u, 'add_account')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 border border-transparent text-xs font-black uppercase tracking-wider transition-all shadow-md">
                                      <PlusCircle size={14} /> Add Account
                                    </button>
                                    <button
                                      onClick={() => openSubRowModal(u, 'account_active')}
                                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                        isAccountActive(u.status)
                                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                          : 'bg-red-500/15 text-red-300 border-red-500/30'
                                      }`}
                                    >
                                      <Power size={14} /> {getAccountStatusLabel(u.status)}
                                    </button>
                                    <button onClick={() => openSubRowModal(u, 'delete_user')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all">
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 border-t border-white/5 pt-4">
            <div className="flex flex-wrap items-center gap-4">
              {total !== null ? (
                <span>
                  Showing <strong className="text-white">{(page - 1) * perPage + 1}</strong> - <strong className="text-white">{Math.min(page * perPage, total)}</strong> of <strong className="text-white">{total}</strong> users
                </span>
              ) : (
                <span>Showing results</span>
              )}

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Rows per page:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#d4af37]/60 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                Previous
              </button>

              <span className="text-xs text-slate-400">
                Page <strong className="text-white">{page}</strong> {totalPages ? `of ${totalPages}` : ''}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || totalPages === null || page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* ── MODAL ── */} 
      {activeModalType && (
        <div className="fixed inset-0 z-50 bg-[#040f36]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className={`border border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.50)] rounded-[2rem] ${modalWidthClass} overflow-hidden my-6`}>
            {/* Modal Header */}
            <div className="p-5 bg-[#0b226a] border-b border-[#1745b3] flex items-center justify-between">
              {activeModalUser ? (
                <div className="flex items-center gap-3">
                  <img
                    src={activeModalUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeModalUser.name)}&background=1e3a5f&color=7dd3fc&size=88`}
                    alt={activeModalUser.name}
                    className="w-11 h-11 rounded-xl object-cover ring-2 ring-[#214fbf]"
                  />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {MODAL_TITLES[activeModalType as string] ?? activeModalType}
                    </h3>
                    <p className="text-xs text-[#8fb8ff]">{activeModalUser.id} • {activeModalUser.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#0b226a] border border-[#214fbf] flex items-center justify-center text-[#f0b91f]">
                    <PlusCircle size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Add New User</h3>
                    <p className="text-xs text-[#8fb8ff]">Create a new client profile & trading account</p>
                  </div>
                </div>
              )}
              <button onClick={closeModal} className="p-2 rounded-xl border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {activeModalType === 'create_user' && (
                <CreateUserModalForm onSubmit={handleCreateUserSubmit} onCancel={closeModal} />
              )}

              {activeModalUser && (
                <>
                  {activeModalType === 'verifi' && (
                    <VerifyModal
                      user={activeModalUser}
                      onVerify={toggleVerification}
                      onSaved={handleDocumentsSaved}
                      isViewerAdmin={isViewerAdmin}
                    />
                  )}

                  {activeModalType === 'trading' && (
                    <TradingModal user={activeModalUser} />
                  )}

                  {activeModalType === 'profile' && (
                    <ProfileModal user={activeModalUser} onSave={handleProfileSave} isViewerAdmin={isViewerAdmin} />
                  )}

                  {activeModalType === 'bank_crypto' && (
                    <BankCryptoModal user={activeModalUser} isViewerAdmin={isViewerAdmin} />
                  )}

                  {activeModalType === 'transactions' && (
                    <div className="space-y-4">
                      <SectionTitle icon={ArrowUpRight} label="Transaction History" color="text-teal-400" />
                      {transactionDetailsByUserId[activeModalUser.id]?.loading && (
                        <div className="rounded-xl border border-[#1745b3] bg-[#081d5f] px-3 py-2 text-[11px] text-[#8fb8ff] flex items-center gap-2">
                          <RefreshCw size={13} className="animate-spin text-[#f0b91f]" />
                          Loading transaction history from the database...
                        </div>
                      )}
                      {transactionDetailsByUserId[activeModalUser.id]?.error && !transactionDetailsByUserId[activeModalUser.id]?.loading && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
                          {transactionDetailsByUserId[activeModalUser.id]?.error}
                        </div>
                      )}
                      {!transactionDetailsByUserId[activeModalUser.id]?.loading && (transactionDetailsByUserId[activeModalUser.id]?.transactions ?? []).length === 0 ? (
                        <div className="text-center py-10">
                          <ArrowDownUp size={32} className="mx-auto mb-3 text-[#1745b3]" />
                          <p className="text-[#6f92e7] text-xs">No transactions found.</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[#1745b3] overflow-hidden">
                          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="sticky top-0 z-10">
                                <tr className="bg-[#0b226a] border-b border-[#1745b3] text-[#9ec0ff]">
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Tx ID</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Account</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Amount</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Approved By</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Approval Date</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Description</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Source</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#153d9f]/60 bg-[#071a57]">
                                {(transactionDetailsByUserId[activeModalUser.id]?.transactions ?? []).map((tx) => (
                                  <tr key={tx.id} className="hover:bg-[#0a205f]/60 transition-colors">
                                    <td className="px-4 py-3 font-mono text-blue-400 font-bold whitespace-nowrap">{tx.id}</td>
                                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{tx.account || 'N/A'}</td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                        tx.type === 'Deposit'
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                                      }`}>
                                        <ArrowUpRight size={10} className={tx.type !== 'Deposit' ? 'rotate-180' : ''} />
                                        {tx.type}
                                      </span>
                                    </td>
                                    <td className={`px-4 py-3 font-bold ${
                                      tx.type === 'Deposit' ? 'text-emerald-400' : 'text-red-400'
                                    }`}>{tx.amount}</td>
                                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{tx.approvedBy || '-'}</td>
                                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{tx.approvalDate || tx.date}</td>
                                    <td className="px-4 py-3 text-slate-300">
                                      <div className="max-w-[240px] truncate" title={tx.description || tx.type}>
                                        {tx.description || tx.type}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{tx.source || tx.type}</td>
                                    <td className="px-4 py-3 text-right">
                                      <StatusBadge status={tx.status} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-4 py-2.5 bg-[#0b226a] border-t border-[#1745b3] flex items-center justify-between">
                            <span className="text-[10px] text-[#6f92e7]">
                              {(transactionDetailsByUserId[activeModalUser.id]?.transactions ?? []).length} transaction{(transactionDetailsByUserId[activeModalUser.id]?.transactions ?? []).length !== 1 ? 's' : ''}
                            </span>
                            <span className={`text-[10px] font-bold ${
                              (transactionDetailsByUserId[activeModalUser.id]?.transactions ?? []).reduce((s, t) =>
                                t.type === 'Deposit' ? s + 1 : s - 1, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              Net: {(transactionDetailsByUserId[activeModalUser.id]?.transactions ?? []).filter(t => t.type === 'Deposit').length}D /
                              {(transactionDetailsByUserId[activeModalUser.id]?.transactions ?? []).filter(t => t.type === 'Withdrawal').length}W
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeModalType === 'tickets' && (
                    <div className="space-y-4">
                      <SectionTitle icon={Ticket} label="Support Tickets" color="text-indigo-400" />
                      {ticketDetailsByUserId[activeModalUser.id]?.loading && (
                        <div className="rounded-xl border border-[#1745b3] bg-[#081d5f] px-3 py-2 text-[11px] text-[#8fb8ff] flex items-center gap-2">
                          <RefreshCw size={13} className="animate-spin text-[#f0b91f]" />
                          Loading ticket history from the database...
                        </div>
                      )}
                      {ticketDetailsByUserId[activeModalUser.id]?.error && !ticketDetailsByUserId[activeModalUser.id]?.loading && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
                          {ticketDetailsByUserId[activeModalUser.id]?.error}
                        </div>
                      )}
                      {!ticketDetailsByUserId[activeModalUser.id]?.loading && (ticketDetailsByUserId[activeModalUser.id]?.tickets ?? []).length === 0 ? (
                        <p className="text-[#6f92e7] text-xs">No tickets found.</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex bg-[#081d5f] p-1 rounded-xl w-full border border-[#1745b3]">
                            {['Open', 'Pending', 'Close'].map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setActiveTicketTab(tab as any)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                                  activeTicketTab === tab
                                    ? 'bg-[#1745b3] text-white shadow-sm'
                                    : 'text-[#8fb8ff] hover:text-[#dbe8ff] hover:bg-[#1745b3]/50'
                                }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                          
                          <div className="space-y-2">
                            {(ticketDetailsByUserId[activeModalUser.id]?.tickets ?? [])
                              .filter((t) => {
                                if (activeTicketTab === 'Open') return t.status === 'Open';
                                if (activeTicketTab === 'Pending') return t.status === 'In Progress' ;
                                if (activeTicketTab === 'Close') return t.status === 'Closed';
                                return true;
                              })
                              .map((t) => (
                              <div key={t.id} className="rounded-xl bg-[#081d5f] border border-[#1745b3] overflow-hidden transition-all duration-200">
                                <div 
                                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#1745b3]/20"
                                  onClick={() => setExpandedTicketId(expandedTicketId === t.id ? null : t.id)}
                                >
                                  <div>
                                    <p className="font-mono text-blue-400 font-bold text-xs">{t.id} | {t.subject}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                      <StatusBadge status={t.status} />
                                      <span className="text-[#6f92e7] text-[10px] flex items-center gap-1">
                                        <Clock size={10} /> {t.date}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-[#8fb8ff]">
                                    {expandedTicketId === t.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </div>
                                </div>
                                
                                {expandedTicketId === t.id && (
                                  <div className="p-4 border-t border-[#1745b3] bg-[#040f33]">
                                    {t.description && (
                                      <div className="mb-4">
                                        <h4 className="text-[10px] uppercase tracking-wider text-[#8fb8ff] font-bold mb-1">Description</h4>
                                        <div className="text-[11px] text-[#dbe8ff] bg-[#0b226a]/50 p-3 rounded-xl border border-[#1745b3] whitespace-pre-wrap">
                                          {t.description}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {t.attachments && t.attachments.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-[10px] uppercase tracking-wider text-[#8fb8ff] font-bold mb-1.5">Attachments</h4>
                                        <div className="flex flex-wrap gap-2">
                                          {t.attachments.map((att: any, idx: number) => (
                                            <a
                                              key={att.id || idx}
                                              href={att.file_url || att.file || '#'}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1745b3]/30 border border-[#1745b3] hover:bg-[#1745b3] text-[10px] text-[#dbe8ff] transition-colors"
                                            >
                                              <FileText size={12} className="text-blue-400" />
                                              <span>{att.name || `Attachment #${idx + 1}`}</span>
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {t.messages && t.messages.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-[10px] uppercase tracking-wider text-[#8fb8ff] font-bold mb-2">Communication History</h4>
                                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                          {t.messages.map((msg: any) => {
                                            const isAdmin = msg.sender === 'admin';
                                            return (
                                              <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                                <div className={`text-[9px] mb-0.5 font-bold ${isAdmin ? 'text-indigo-400' : 'text-blue-400'}`}>
                                                  {msg.sender_name} • {new Date(msg.created_at).toLocaleString()}
                                                </div>
                                                <div className={`p-2.5 rounded-xl max-w-[90%] text-[11px] ${
                                                  isAdmin 
                                                    ? 'bg-indigo-500/20 border border-indigo-500/30 text-[#dbe8ff] rounded-tr-sm' 
                                                    : 'bg-[#1745b3]/30 border border-[#1745b3] text-[#dbe8ff] rounded-tl-sm'
                                                }`}>
                                                  {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                                                  {msg.file && (
                                                    <div className="mt-1.5">
                                                      <a href={msg.file} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-bold ${isAdmin ? 'bg-indigo-500/30 text-indigo-300' : 'bg-[#1745b3] text-blue-300'}`}>
                                                        <Paperclip size={10} />
                                                        Attachment
                                                      </a>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {!isViewerAdmin && (
                                      <ReplySection 
                                        onSendMessage={(msg, file) => handleTicketSendMessage(t.id, msg, file)} 
                                        isSubmitting={isSendingMessage} 
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {(ticketDetailsByUserId[activeModalUser.id]?.tickets ?? [])
                              .filter((t) => {
                                if (activeTicketTab === 'Open') return t.status === 'Open';
                                if (activeTicketTab === 'Pending') return t.status === 'In Progress';
                                if (activeTicketTab === 'Close') return t.status === 'Closed';
                                return true;
                              }).length === 0 && !ticketDetailsByUserId[activeModalUser.id]?.loading && (
                                <p className="text-[#6f92e7] text-xs text-center py-4">No {activeTicketTab.toLowerCase()} tickets found.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeModalType === 'add_account' && (
                    <AddAccountModal
                      user={activeModalUser}
                      allUsers={users}
                      onSubmit={handleAddAccountSubmit}
                    />
                  )}

                  {activeModalType === 'account_active' && (
                    <div className="space-y-4">
                      <SectionTitle icon={Power} label="Account Status" color="text-[#9ec0ff]" />
                      <div className="bg-[#081d5f] border border-[#1745b3] rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[#8fb8ff] text-[10px] uppercase tracking-wider mb-1">Current Status</p>
                          <StatusBadge status={activeModalUser.status} />
                        </div>
                        <button
                          onClick={() => { void toggleUserActiveStatus(activeModalUser.id); }}
                          disabled={Boolean(statusSavingByUserId[activeModalUser.id])}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isAccountActive(activeModalUser.status)
                              ? 'bg-red-600/15 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30'
                              : 'bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          {statusSavingByUserId[activeModalUser.id] ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Power size={14} />
                          )}
                          {isAccountActive(activeModalUser.status) ? 'Set Inactive' : 'Set Active'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeModalType === 'delete_user' && (
                    <div className="space-y-4">
                      <SectionTitle icon={Trash2} label="Delete User" color="text-red-400" />
                      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                        <p className="text-red-400 font-bold text-sm">⚠ This action is irreversible</p>
                        <p className="text-[#8fb8ff] text-xs mt-1">
                          Permanently delete <strong className="text-white">{activeModalUser.name}</strong> ({activeModalUser.email}) and all associated data?
                        </p>
                      </div>
                      <button
                        onClick={() => { void handleDeleteUser(activeModalUser.id, activeModalUser.name); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all"
                      >
                        <Trash2 size={14} /> Confirm Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {activeModalType !== 'create_user' && activeModalType !== 'profile' && (
              <div className="p-4 bg-[#0b226a] border-t border-[#1745b3] flex justify-end">
                <button onClick={closeModal} className="px-4 py-2 rounded-xl border border-[#2a58c9] bg-[#11358f] hover:bg-[#1845af] text-white font-bold text-xs transition-all">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
