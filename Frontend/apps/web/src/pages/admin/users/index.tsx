import React, { useState, useRef, useMemo, useEffect } from 'react';
import Head from 'next/head';
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
} from 'lucide-react';
import { getAdminUsers } from '@/lib/mockDataLoader';
import CreateUserModalForm from '@/components/Admin/CreateUserModalForm';
import { type CreateUserFormData, type UserData, type KycDocument, type TradingAccount } from '@/types/user';
import { type UserModalType } from '@/types/userModal';

/* ─────────────────────────────────────────────────────────────
   Small UI helpers
───────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    uploaded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    missing: 'bg-slate-600/20 text-slate-400 border-slate-600/20',
    suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const cls = map[status.toLowerCase()] ?? 'bg-slate-700/20 text-slate-400 border-slate-700/20';
  const Icon = {
    approved: CheckCircle2,
    verified: CheckCircle2,
    active: CheckCircle2,
    pending: Clock,
    uploaded: FileText,
    rejected: Ban,
    missing: AlertCircle,
    suspended: XCircle,
  }[status.toLowerCase()] ?? AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${cls}`}>
      <Icon size={11} />
      {status}
    </span>
  );
}

function SectionTitle({ icon: Icon, label, color = 'text-blue-400' }: { icon: React.ElementType; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
      <Icon size={17} className={color} />
      <h4 className="font-bold text-white text-sm">{label}</h4>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
      <span className={`text-sm font-semibold text-white ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-slate-600 italic text-xs">Not set</span>}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL 1 — Verify / KYC Documents
───────────────────────────────────────────────────────────── */
const DOC_TYPES: { type: KycDocument['type']; label: string }[] = [
  { type: 'address_proof', label: 'Passport' },
  { type: 'id_proof', label: 'National ID' }
];

function VerifyModal({
  user,
  onVerify,
}: {
  user: UserData;
  onVerify: (userId: string, verified: boolean) => void;
}) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /* Build display doc list — merge backend docs with required set */
  const docs: KycDocument[] = DOC_TYPES.map((dt) => {
    const existing = (user.documents || []).find((d) => d.type === dt.type);
    return existing ?? { id: `${dt.type}-new`, type: dt.type, label: dt.label, status: 'missing' };
  });

  const [docStates, setDocStates] = useState<KycDocument[]>(docs);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (type: KycDocument['type'], file: File) => {
    const url = URL.createObjectURL(file);
    setDocStates((prev) =>
      prev.map((d) =>
        d.type === type
          ? { ...d, status: 'uploaded', fileUrl: url, fileName: file.name, uploadedAt: new Date().toLocaleString() }
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
      await fetch(`/api/admin/users/${user.id}/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: docStates }),
      });
    } catch {}
    finally { setSaving(false); }
  };

  const allApproved = docStates.every((d) => d.status === 'approved');

  return (
    <div className="space-y-5 text-xs">
      <SectionTitle icon={ShieldCheck} label="Identity Verification & KYC Documents" color="text-blue-400" />

      {/* Overall KYC Status */}
      <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-4">
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Overall KYC Status</p>
          <StatusBadge status={user.verified ? 'Verified' : 'Pending'} />
        </div>
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
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {docStates.map((doc) => {
          const isUploaded = doc.status === 'uploaded' || doc.status === 'approved' || doc.status === 'rejected';
          return (
            <div key={doc.type} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
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

              {/* File info or missing */}
              {isUploaded ? (
                <div className="flex items-center gap-2 text-slate-400 bg-slate-900 rounded-xl p-2.5">
                  <FileText size={13} className="text-blue-400 shrink-0" />
                  <span className="truncate text-[11px]">{doc.fileName || 'document.pdf'}</span>
                  {doc.fileUrl && (
                    <button
                      onClick={() => setPreviewUrl(doc.fileUrl!)}
                      className="ml-auto shrink-0 text-blue-400 hover:text-blue-300"
                    >
                      <Eye size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-[11px] italic px-1">No document uploaded</div>
              )}

              {/* Upload / Re-upload button */}
              <div className="flex gap-2">
                <button
                  onClick={() => fileRefs.current[doc.type]?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition-all"
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

              {doc.uploadedAt && (
                <p className="text-slate-600 text-[10px]">Uploaded: {doc.uploadedAt}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-10 right-0 text-white hover:text-slate-300">
              <X size={24} />
            </button>
            {previewUrl.endsWith('.pdf') ? (
              <iframe src={previewUrl} className="w-full h-[70vh] rounded-2xl" />
            ) : (
              <img src={previewUrl} alt="Document Preview" className="w-full max-h-[70vh] object-contain rounded-2xl" />
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
        {allApproved && !user.verified && (
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
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-4 text-xs">
      <SectionTitle icon={TrendingUp} label="Trading Accounts" color="text-emerald-400" />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-bold transition-all ${
              filter === f.key
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === f.key ? `bg-slate-700 ${f.color}` : 'bg-slate-800 text-slate-500'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Account table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <Layers size={36} className="mx-auto mb-3 opacity-30" />
          <p>No {filter} accounts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((acc, idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Account Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${acc.accountRole === 'manager' ? 'bg-purple-500/10' : 'bg-emerald-500/10'}`}>
                    {acc.accountRole === 'manager'
                      ? <Layers size={14} className="text-purple-400" />
                      : <TrendingUp size={14} className="text-emerald-400" />}
                  </div>
                  <span className="font-mono font-bold text-blue-400">{acc.accNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    acc.accountRole === 'manager'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {acc.accountRole === 'manager' ? 'Manager' : 'Investor'}
                  </span>
                  <StatusBadge status={acc.status ?? 'Active'} />
                </div>
              </div>

              {/* Account Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                <div>
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Type</p>
                  <p className="text-slate-300 font-semibold text-[11px]">{acc.type}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Balance</p>
                  <p className="text-emerald-400 font-bold">{acc.balance}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Equity</p>
                  <p className="text-blue-400 font-bold">{acc.equity}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Leverage</p>
                  <p className="text-purple-400 font-bold">{acc.leverage}</p>
                </div>
                {acc.server && (
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Server</p>
                    <p className="text-slate-300 font-semibold text-[11px] flex items-center gap-1">
                      <Server size={11} /> {acc.server}
                    </p>
                  </div>
                )}
                {acc.currency && (
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Currency</p>
                    <p className="text-slate-300 font-semibold text-[11px]">{acc.currency}</p>
                  </div>
                )}
                {acc.marginFree && (
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Free Margin</p>
                    <p className="text-amber-400 font-bold">{acc.marginFree}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Active Trades</p>
                  <p className={`font-bold ${acc.activeTrades > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {acc.activeTrades}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
}: {
  user: UserData;
  onSave: (userId: string, data: Partial<UserData>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
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

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleAvatarChange = (file: File) => {
    const url = URL.createObjectURL(file);
    setForm((p) => ({ ...p, avatar: url }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      onSave(user.id, form);
      setIsEditing(false);
    } catch {}
    finally { setSaving(false); }
  };

  const Field = ({
    label, field, icon: Icon, disabled = false, type = 'text',
  }: {
    label: string;
    field: keyof typeof form;
    icon: React.ElementType;
    disabled?: boolean;
    type?: string;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
        <Icon size={11} className={(disabled || !isEditing) ? 'text-slate-600' : 'text-slate-400'} /> {label}
      </label>
      <input
        type={type}
        value={form[field] as string}
        disabled={disabled || !isEditing}
        onChange={(e) => set(field, e.target.value)}
        className={`px-3 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
          (disabled || !isEditing)
            ? 'bg-slate-900/50 text-slate-400 border-slate-800/80 cursor-not-allowed'
            : 'bg-slate-950 text-white border-slate-800 focus:border-blue-500'
        }`}
      />
      {disabled && isEditing && (
        <p className="text-[10px] text-slate-600">Email cannot be changed (identity field)</p>
      )}
    </div>
  );

  return (
    <div className="space-y-5 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <SectionTitle icon={User} label="Client Profile" color="text-purple-400" />
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            isEditing
              ? 'bg-slate-800 text-slate-300 border-slate-700'
              : 'bg-purple-600/10 text-purple-400 border-purple-500/30 hover:bg-purple-600 hover:text-white'
          }`}
        >
          {isEditing ? 'Cancel Edit' : 'Edit Details'}
        </button>
      </div>

      {/* Avatar Editor */}
      <div className="flex items-center gap-5 bg-slate-950 border border-slate-800 rounded-2xl p-4">
        <div className="relative group">
          <img
            src={form.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=1e3a5f&color=7dd3fc&size=96`}
            alt={form.name}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-slate-700"
          />
          {isEditing && (
            <>
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
          {isEditing && (
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
        <Field label="Full Name" field="name" icon={User} />
        <Field label="Email Address" field="email" icon={Mail} disabled />
        <Field label="Phone Number" field="phone" icon={Phone} />
        <Field label="Country" field="country" icon={Globe} />
        <Field label="Date of Birth" field="dateOfBirth" icon={Calendar} type="date" />
        <Field label="City" field="city" icon={MapPin} />
        <Field label="Address" field="address" icon={MapPin} />
        <Field label="Postal Code" field="postalCode" icon={MapPin} />
      </div>

      {/* Tier & KYC Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
            <Shield size={11} /> Account Tier
          </label>
          <select
            value={form.tier}
            disabled={!isEditing}
            onChange={(e) => set('tier', e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              !isEditing
                ? 'bg-slate-900/50 text-slate-400 border-slate-800 cursor-not-allowed'
                : 'bg-slate-950 text-white border-slate-800'
            }`}
          >
            {['Standard', 'Premium', 'VIP', 'VIP Premium', 'Elite'].map((t) => (
              <option key={t} value={t} className="bg-slate-900">{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
            <ShieldCheck size={11} /> KYC Status
          </label>
          <select
            value={form.kycStatus}
            disabled={!isEditing}
            onChange={(e) => set('kycStatus', e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              !isEditing
                ? 'bg-slate-900/50 text-slate-400 border-slate-800 cursor-not-allowed'
                : 'bg-slate-950 text-white border-slate-800'
            }`}
          >
            {['Pending', 'Verified', 'Rejected', 'Under Review'].map((s) => (
              <option key={s} value={s} className="bg-slate-900">{s}</option>
            ))}
          </select>
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-60 transition-all"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Save Profile
          </button>
        </div>
      )}
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

function BankCryptoModal({ user }: { user: UserData }) {
  const [isEditing, setIsEditing] = useState(false);
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
      await fetch(`/api/admin/users/${user.id}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setIsEditing(false);
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <SectionTitle icon={CreditCard} label="Bank & Crypto Payment Details" color="text-amber-400" />
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            isEditing
              ? 'bg-slate-800 text-slate-300 border-slate-700'
              : 'bg-amber-600/10 text-amber-400 border-amber-500/30 hover:bg-amber-600 hover:text-white'
          }`}
        >
          {isEditing ? 'Cancel Edit' : 'Edit Details'}
        </button>
      </div>

      {/* Type Toggle */}
      <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
        <button
          onClick={() => setPayType('bank')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
            payType === 'bank' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
          } disabled:opacity-50`}
        >
          <Building2 size={14} className={payType === 'bank' ? 'text-amber-400' : 'text-slate-500'} />
          Bank Transfer
        </button>
        <button
          onClick={() => setPayType('crypto')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
            payType === 'crypto' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
          } disabled:opacity-50`}
        >
          <Bitcoin size={14} className={payType === 'crypto' ? 'text-orange-400' : 'text-slate-500'} />
          Cryptocurrency
        </button>
      </div>

      {/* ── Bank Fields ── */}
      {payType === 'bank' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-amber-500/10 rounded-2xl p-5 space-y-4">
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
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</label>
                  <input
                    value={(bank as any)[key]}
                    disabled={!isEditing}
                    onChange={(e) => setBank((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={`px-3 py-2.5 rounded-xl bg-slate-900 text-white border outline-none text-xs transition-all ${
                      !isEditing
                        ? 'border-slate-800/80 text-slate-400 bg-slate-900/50 cursor-not-allowed'
                        : 'border-slate-800 focus:border-amber-500'
                    } ${mono ? 'font-mono uppercase' : ''}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Crypto Fields — networks from backend ── */}
      {payType === 'crypto' && (
        <div className="bg-slate-950 border border-orange-500/10 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bitcoin size={16} className="text-orange-400" />
              <span className="font-bold text-white">Crypto Wallet Details</span>
            </div>
            {netLoading && <RefreshCw size={13} className="animate-spin text-slate-500" />}
          </div>

          {/* Network Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
              <Bitcoin size={11} className="text-slate-400" /> Network / Coin Type
            </label>
            <input
              type="text"
              value={crypto.network}
              disabled={!isEditing}
              onChange={(e) => setCrypto((p) => ({ ...p, network: e.target.value }))}
              placeholder="e.g. USDT-TRC20, BTC, ERC20"
              className={`px-3 py-2.5 rounded-xl bg-slate-900 text-white border outline-none text-xs font-mono transition-all ${
                !isEditing
                  ? 'border-slate-800/80 text-slate-400 bg-slate-900/50 cursor-not-allowed'
                  : 'border-slate-800 focus:border-orange-500'
              }`}
            />
          </div>

          {/* Wallet Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Wallet Address
            </label>
            <input
              value={crypto.cryptoAddress}
              disabled={!isEditing}
              onChange={(e) => setCrypto((p) => ({ ...p, cryptoAddress: e.target.value }))}
              placeholder="e.g. 0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
              className={`px-3 py-2.5 rounded-xl bg-slate-900 text-white border outline-none text-xs font-mono transition-all ${
                !isEditing
                  ? 'border-slate-800/80 text-slate-400 bg-slate-900/50 cursor-not-allowed'
                  : 'border-slate-800 focus:border-orange-500'
              }`}
            />
          </div>

        </div>
      )}

      {isEditing && (
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
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
        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
          <Icon size={11} className="text-slate-400" /> {label}
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          title="Regenerate & copy strong password"
          className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border transition-all ${
            copied
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 hover:text-blue-400 hover:border-blue-500/40 border-slate-700'
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
          className={`w-full pl-3 pr-10 py-2.5 rounded-xl text-xs font-mono bg-slate-950 text-white border outline-none transition-all ${
            value ? 'border-blue-500/40' : 'border-slate-800'
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
                  : 'bg-slate-800'
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
      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
        <Icon size={11} className="text-slate-400" /> {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-950 text-white border border-slate-800 focus:border-blue-500 outline-none appearance-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-slate-900">{o}</option>
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
    const master = generatePassword(16);
    const investor = generatePassword(16);
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
      <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('manager')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'manager'
              ? 'bg-slate-800 text-white shadow'
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
              ? 'bg-slate-800 text-white shadow'
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
          <div className="bg-slate-950 border border-purple-500/10 rounded-2xl p-5 space-y-4">
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
                className="px-3 py-2.5 rounded-xl text-xs bg-slate-900 text-white border border-slate-800 focus:border-purple-500 outline-none"
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
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl text-xs bg-slate-900 text-white border border-slate-800 focus:border-purple-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
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
                <div key={item.label} className="flex flex-col items-center gap-0.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
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
          <div className="bg-slate-950 border border-emerald-500/10 rounded-2xl p-5 space-y-4">
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
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus-within:border-emerald-500 transition-colors">
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
                    <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
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
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0"
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
                <div className="flex flex-col gap-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Account</span>
                  <span className="font-mono font-bold text-blue-400 text-xs">{selectedManager.tradingAccount?.accNumber}</span>
                </div>
                <div className="flex flex-col gap-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Profit Share</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    {selectedManager.tradingAccount?.type?.includes('20') ? '20%' : '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Leverage</span>
                  <span className="font-bold text-purple-400 text-xs">{selectedManager.tradingAccount?.leverage}</span>
                </div>
              </div>
            )}

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
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
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
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
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('USR-001');

  const [activeModalUser, setActiveModalUser] = useState<UserData | null>(null);
  const [activeModalType, setActiveModalType] = useState<UserModalType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulate minor network delay for smooth skeleton loader feel
    const timer = setTimeout(() => {
      fetch('/api/admin/users')
        .then((res) => res.json())
        .then((data) => {
          if (data?.users && Array.isArray(data.users)) setUsers(data.users);
          else setUsers(getAdminUsers() as UserData[]);
        })
        .catch(() => {
          setUsers(getAdminUsers() as UserData[]);
        })
        .finally(() => setLoading(false));
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(null);
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
          role: formData.role || 'Client User',
          country: formData.country || 'United States',
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

  const toggleUserActiveStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        const updated = { ...u, status: nextStatus as UserData['status'] };
        if (activeModalUser?.id === userId) setActiveModalUser(updated);
        showToast(`User ${u.name} status changed to ${nextStatus}`);
        return updated;
      }),
    );
  };

  const toggleVerification = (userId: string, verified: boolean) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated = { ...u, verified };
        if (activeModalUser?.id === userId) setActiveModalUser(updated);
        showToast(`User ${u.name} KYC ${verified ? 'Verified' : 'Revoked'}`);
        return updated;
      }),
    );
  };

  const handleProfileSave = (userId: string, data: Partial<UserData>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated = { ...u, ...data };
        if (activeModalUser?.id === userId) setActiveModalUser(updated);
        showToast(`Profile for ${updated.name} saved`);
        return updated;
      }),
    );
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    closeModal();
    showToast(`User ${userName} deleted successfully`);
  };

  const handleAddAccountSubmit = (userName: string) => {
    closeModal();
    showToast(`New MT5 Live Account initialized for ${userName}`);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  return (
    <>
      <Head>
        <title>Users Directory | Admin Portal</title>
      </Head>

      <div className="p-6 md:p-8">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <Users size={13} /> User Management
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Users Directory</h1>
            <p className="text-slate-400 text-sm mt-1">
              Expand rows to manage KYC, trading accounts, profile, bank/crypto and more.
            </p>
          </div>
          <button
            onClick={() => openSubRowModal(null, 'create_user')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto"
          >
            <Plus size={16} /> Add New User
          </button>
        </div>

        {/* ── Floating Animated Toast Notification ── */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full bg-slate-900 border border-blue-500/30 text-blue-300 p-4 rounded-2xl shadow-2xl shadow-black/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <span className="flex items-center gap-2.5 text-xs font-bold">
              <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
              {toastMessage}
            </span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-2.5 rounded-2xl w-72 md:w-96 border border-slate-700/50">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or user ID..."
                className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Total: <strong className="text-white">{loading ? '...' : filteredUsers.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="pb-3 pl-2 font-semibold">User ID</th>
                  <th className="pb-3 font-semibold">Name &amp; Email</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Verification</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Joined</th>
                  <th className="pb-3 pr-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  /* ── Pulsating Skeleton Rows ── */
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 pl-2">
                        <div className="h-4 w-14 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-800 rounded-xl" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-24 bg-slate-800 rounded-lg" />
                            <div className="h-3 w-32 bg-slate-800 rounded-lg" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-20 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-5 w-16 bg-slate-800/60 rounded-full" />
                      </td>
                      <td className="py-4">
                        <div className="h-5 w-16 bg-slate-800/60 rounded-full" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-16 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <div className="inline-block h-7 w-20 bg-slate-800 rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No users match the search filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isExpanded = expandedRowId === u.id;
                    return (
                      <React.Fragment key={u.id}>
                        <tr
                          onClick={() => toggleDropdownRow(u.id)}
                          className={`cursor-pointer transition-colors ${isExpanded ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
                        >
                          <td className="py-4 pl-2 font-mono text-blue-400 font-bold">{u.id}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=1e3a5f&color=7dd3fc&size=80`}
                                alt={u.name}
                                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                              />
                              <div>
                                <div className="font-bold text-slate-100">{u.name}</div>
                                <div className="text-[11px] text-slate-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-slate-300 font-medium">{u.role}</td>
                          <td className="py-4">
                            <StatusBadge status={u.verified ? 'Verified' : 'Pending'} />
                          </td>
                          <td className="py-4">
                            <StatusBadge status={u.status} />
                          </td>
                          <td className="py-4 text-slate-400">{u.joined}</td>
                          <td className="py-4 pr-2 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleDropdownRow(u.id); }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                            >
                              <span>Actions</span>
                              {isExpanded ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                      {/* ── Expanded Sub-Row ── */}
                      {isExpanded && (
                        <tr className="bg-slate-900/90 border-b border-slate-800">
                          <td colSpan={7} className="p-4 sm:p-5">
                            <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-inner">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                <span>Actions for <strong className="text-white">{u.name}</strong></span>
                                <span className="text-slate-600">•</span>
                                <span className="text-blue-400">Click to open modal</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2.5">
                                <button onClick={() => openSubRowModal(u, 'verifi')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all">
                                  <ShieldCheck size={15} className="text-blue-400" /> KYC Verify
                                </button>
                                <button onClick={() => openSubRowModal(u, 'trading')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600/20 text-slate-200 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold transition-all">
                                  <TrendingUp size={15} className="text-emerald-400" /> Trading
                                </button>
                                <button onClick={() => openSubRowModal(u, 'profile')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-purple-600/20 text-slate-200 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40 text-xs font-semibold transition-all">
                                  <User size={15} className="text-purple-400" /> Profile
                                </button>
                                <button onClick={() => openSubRowModal(u, 'bank_crypto')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-amber-600/20 text-slate-200 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold transition-all">
                                  <CreditCard size={15} className="text-amber-400" /> Bank/Crypto
                                </button>
                                <button onClick={() => openSubRowModal(u, 'transactions')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-teal-600/20 text-slate-200 hover:text-teal-300 border border-slate-800 hover:border-teal-500/40 text-xs font-semibold transition-all">
                                  <ArrowUpRight size={15} className="text-teal-400" /> Transactions
                                </button>
                                <button onClick={() => openSubRowModal(u, 'tickets')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600/20 text-slate-200 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 text-xs font-semibold transition-all">
                                  <Ticket size={15} className="text-indigo-400" /> Tickets ({u.tickets?.length || 0})
                                </button>
                                <button onClick={() => openSubRowModal(u, 'add_account')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all">
                                  <PlusCircle size={15} /> Add Account
                                </button>
                                <button
                                  onClick={() => openSubRowModal(u, 'account_active')}
                                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    u.status === 'Active'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                                  }`}
                                >
                                  <Power size={15} /> {u.status === 'Active' ? 'Active' : 'Suspended'}
                                </button>
                                <button onClick={() => openSubRowModal(u, 'delete_user')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold transition-all">
                                  <Trash2 size={15} /> Delete
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {activeModalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              {activeModalUser ? (
                <div className="flex items-center gap-3">
                  <img
                    src={activeModalUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeModalUser.name)}&background=1e3a5f&color=7dd3fc&size=88`}
                    alt={activeModalUser.name}
                    className="w-11 h-11 rounded-xl object-cover ring-2 ring-blue-500/40"
                  />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {MODAL_TITLES[activeModalType as string] ?? activeModalType}
                    </h3>
                    <p className="text-xs text-slate-400">{activeModalUser.id} • {activeModalUser.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <PlusCircle size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Add New User</h3>
                    <p className="text-xs text-slate-400">Create a new client profile & trading account</p>
                  </div>
                </div>
              )}
              <button onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
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
                    <VerifyModal user={activeModalUser} onVerify={toggleVerification} />
                  )}

                  {activeModalType === 'trading' && (
                    <TradingModal user={activeModalUser} />
                  )}

                  {activeModalType === 'profile' && (
                    <ProfileModal user={activeModalUser} onSave={handleProfileSave} />
                  )}

                  {activeModalType === 'bank_crypto' && (
                    <BankCryptoModal user={activeModalUser} />
                  )}

                  {activeModalType === 'transactions' && (
                    <div className="space-y-4">
                      <SectionTitle icon={ArrowUpRight} label="Transaction History" color="text-teal-400" />
                      {(activeModalUser.transactions || []).length === 0 ? (
                        <div className="text-center py-10">
                          <ArrowDownUp size={32} className="mx-auto mb-3 text-slate-700" />
                          <p className="text-slate-500 text-xs">No transactions found.</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-800 overflow-hidden">
                          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Tx ID</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Amount</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap hidden sm:table-cell">Date</th>
                                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                                {(activeModalUser.transactions || []).map((tx) => (
                                  <tr key={tx.id} className="hover:bg-slate-900/60 transition-colors">
                                    <td className="px-4 py-3 font-mono text-blue-400 font-bold whitespace-nowrap">{tx.id}</td>
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
                                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell whitespace-nowrap">{tx.date}</td>
                                    <td className="px-4 py-3 text-right">
                                      <StatusBadge status={tx.status} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">
                              {(activeModalUser.transactions || []).length} transaction{(activeModalUser.transactions || []).length !== 1 ? 's' : ''}
                            </span>
                            <span className={`text-[10px] font-bold ${
                              (activeModalUser.transactions || []).reduce((s, t) =>
                                t.type === 'Deposit' ? s + 1 : s - 1, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              Net: {(activeModalUser.transactions || []).filter(t => t.type === 'Deposit').length}D /
                              {(activeModalUser.transactions || []).filter(t => t.type === 'Withdrawal').length}W
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeModalType === 'tickets' && (
                    <div className="space-y-4">
                      <SectionTitle icon={Ticket} label="Support Tickets" color="text-indigo-400" />
                      <div className="space-y-2">
                        {(!activeModalUser.tickets || activeModalUser.tickets.length === 0) ? (
                          <p className="text-slate-500 text-xs">No tickets found.</p>
                        ) : (
                          activeModalUser.tickets.map((t) => (
                            <div key={t.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                              <div>
                                <p className="font-mono text-blue-400 font-bold text-xs">{t.id}</p>
                                <p className="text-slate-300 text-[11px] mt-0.5">{t.subject}</p>
                                <p className="text-slate-500 text-[10px]">{t.date}</p>
                              </div>
                              <StatusBadge status={t.status} />
                            </div>
                          ))
                        )}
                      </div>
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
                      <SectionTitle icon={Power} label="Account Status" color="text-slate-400" />
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Current Status</p>
                          <StatusBadge status={activeModalUser.status} />
                        </div>
                        <button
                          onClick={() => { toggleUserActiveStatus(activeModalUser.id); closeModal(); }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeModalUser.status === 'Active'
                              ? 'bg-red-600/15 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30'
                              : 'bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30'
                          }`}
                        >
                          <Power size={14} />
                          {activeModalUser.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeModalType === 'delete_user' && (
                    <div className="space-y-4">
                      <SectionTitle icon={Trash2} label="Delete User" color="text-red-400" />
                      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                        <p className="text-red-400 font-bold text-sm">⚠ This action is irreversible</p>
                        <p className="text-slate-400 text-xs mt-1">
                          Permanently delete <strong className="text-white">{activeModalUser.name}</strong> ({activeModalUser.email}) and all associated data?
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(activeModalUser.id, activeModalUser.name)}
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
            {activeModalType !== 'create_user' && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
                <button onClick={closeModal} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all">
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
