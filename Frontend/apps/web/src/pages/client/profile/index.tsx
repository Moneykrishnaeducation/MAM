import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import { useTheme } from 'next-themes';
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
  RefreshCw,
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
  X,
  Edit
} from 'lucide-react';
import { ProfileSkeleton } from '@/components/client-page-skeletons';

type ProfileTab = 'personal' | 'security' | 'activity' | 'documents' | 'payments';

type DocumentSlotId = 'identity' | 'address';
type DocumentStatus = 'approved' | 'pending' | 'rejected';

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

const EMPTY_DOCUMENT_CARD = (slot: DocumentSlotId): DocumentCard => ({
  id: slot,
  title: slot === 'identity' ? 'Identity Document' : 'Residential Proof',
  description: slot === 'identity' ? 'Identity verification file' : 'Proof of address file',
  helperText: 'No document uploaded yet.',
  status: 'pending',
  fileName: null,
  fileSize: null,
  uploadedAt: null,
});

const INITIAL_DOCUMENTS: Record<DocumentSlotId, DocumentCard> = {
  identity: EMPTY_DOCUMENT_CARD('identity'),
  address: EMPTY_DOCUMENT_CARD('address'),
};

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  approved: 'Approved',
  pending: 'Pending Review',
  rejected: 'Rejected',
};

const DOCUMENT_STATUS_CLASSES = (status: DocumentStatus, isDarkMode: boolean): string => {
  const mapping: Record<DocumentStatus, string> = {
    approved: isDarkMode ? 'border-amber-500/25 bg-amber-500/10 text-amber-400' : 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    pending: isDarkMode ? 'border-slate-800 bg-slate-800 text-slate-400' : 'border-slate-500/20 bg-slate-500/10 text-slate-300',
    rejected: isDarkMode ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-red-500/20 bg-red-500/10 text-red-300',
  };
  return mapping[status];
};

type PaymentEditTarget = 'bank' | 'crypto';
type PaymentStatus = 'approved' | 'pending' | 'rejected';

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

type ClientProfileApi = {
  user_id?: number | string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  tier?: string | null;
  kyc_status?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  avatar?: string | null;
};

type ClientPaymentDetailsApi = {
  paymentType?: PaymentEditTarget | string | null;
  bank?: {
    account_holder?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    ifsc_swift?: string | null;
    branch?: string | null;
    country?: string | null;
    status?: string | null;
  } | null;
  crypto?: {
    network?: string | null;
    wallet_address?: string | null;
    currency?: string | null;
    status?: string | null;
  } | null;
};

type ClientDocumentApi = {
  file_name?: string | null;
  file_path?: string | null;
  status?: string | null;
  uploaded_at?: string | null;
};

type ClientDocumentsApi = {
  identity?: ClientDocumentApi | null;
  address?: ClientDocumentApi | null;
};

type ActivityLogEntry = {
  id: number | string;
  action: string;
  details: string;
  ip_address: string;
  time: string | null;
};

const INITIAL_PAYMENT_DETAILS: PaymentDetails = {
  bank: {
    bankName: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
    status: 'pending',
  },
  crypto: {
    address: '',
    currency: '',
    status: 'pending',
  },
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  approved: 'text-amber-400',
  pending: 'text-cyan-400',
  rejected: 'text-red-400',
};

const normalizePaymentStatus = (value: unknown): PaymentStatus =>
  (() => {
    const normalized = String(value || 'pending').trim().toLowerCase();
    if (normalized === 'approved' || normalized === 'pending' || normalized === 'rejected') {
      return normalized;
    }
    return 'pending';
  })();

const normalizePaymentDetails = (details: ClientPaymentDetailsApi | null | undefined): PaymentDetails => ({
  bank: {
    bankName: String(details?.bank?.bank_name || INITIAL_PAYMENT_DETAILS.bank.bankName),
    accountNumber: String(details?.bank?.account_number || INITIAL_PAYMENT_DETAILS.bank.accountNumber),
    ifsc: String(details?.bank?.ifsc_swift || INITIAL_PAYMENT_DETAILS.bank.ifsc),
    branch: String(details?.bank?.branch || INITIAL_PAYMENT_DETAILS.bank.branch),
    status: normalizePaymentStatus(details?.bank?.status),
  },
  crypto: {
    address: String(details?.crypto?.wallet_address || INITIAL_PAYMENT_DETAILS.crypto.address),
    currency: String(details?.crypto?.currency || INITIAL_PAYMENT_DETAILS.crypto.currency),
    status: normalizePaymentStatus(details?.crypto?.status),
  },
});

const normalizeDocumentStatus = (value: unknown): DocumentStatus => {
  const normalized = String(value || 'pending').trim().toLowerCase();
  if (normalized === 'approved' || normalized === 'pending' || normalized === 'rejected') {
    return normalized;
  }
  return 'pending';
};

const normalizeDocumentCards = (documents: ClientDocumentsApi | null | undefined): Record<DocumentSlotId, DocumentCard> => ({
  identity: {
    ...EMPTY_DOCUMENT_CARD('identity'),
    fileName: String(documents?.identity?.file_name || '') || null,
    fileSize: null,
    uploadedAt: String(documents?.identity?.uploaded_at || '') || null,
    status: normalizeDocumentStatus(documents?.identity?.status),
    helperText: 'No document uploaded yet.',
  },
  address: {
    ...EMPTY_DOCUMENT_CARD('address'),
    fileName: String(documents?.address?.file_name || '') || null,
    fileSize: null,
    uploadedAt: String(documents?.address?.uploaded_at || '') || null,
    status: normalizeDocumentStatus(documents?.address?.status),
    helperText: 'No document uploaded yet.',
  },
});

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
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Profile Settings saved successfully!');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileTier, setProfileTier] = useState('');
  const [profileKycStatus, setProfileKycStatus] = useState('');
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [isPersonalEditing, setIsPersonalEditing] = useState(false);
  const [isPersonalSaving, setIsPersonalSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    timezone: '',
  });
  const [documents, setDocuments] = useState<Record<DocumentSlotId, DocumentCard>>(INITIAL_DOCUMENTS);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isDocumentSaving, setIsDocumentSaving] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(INITIAL_PAYMENT_DETAILS);
  const [paymentEditTarget, setPaymentEditTarget] = useState<PaymentEditTarget | null>(null);
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    bankName: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
    bankStatus: 'pending',
    cryptoAddress: '',
    cryptoCurrency: '',
    cryptoStatus: 'pending',
  });
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSecuritySaving, setIsSecuritySaving] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const documentInputRefs = useRef<Record<DocumentSlotId, HTMLInputElement | null>>({
    identity: null,
    address: null,
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const panelClass = isDarkMode
    ? 'border-slate-800 bg-slate-900 shadow-xl'
    : 'border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)]';
  const inputClass = isDarkMode
    ? 'bg-white/10 border-white/10 text-white placeholder:text-gray-500'
    : 'border-[#214fbf] bg-[#081d5f] text-[#dbe8ff] placeholder:text-[#6f92e7]';
  const softTextClass = isDarkMode ? 'text-gray-400' : 'text-[#8fb8ff]';
  const headingTextClass = isDarkMode ? 'text-white' : 'text-white';
  const borderMutedClass = isDarkMode ? 'border-white/10' : 'border-[#1745b3]';
  const goldButtonClass =
    'bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_16px_30px_rgba(201,149,8,0.28)]';

  const showProfileToast = (message: string) => {
    setToastMessage(message);
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

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setProfileLoading(true);

      try {
        const [profileResponse, documentsResponse] = await Promise.all([
          fetch('/api/client/profile', {
            credentials: 'include',
            headers: {
              Accept: 'application/json',
            },
          }),
          fetch('/api/client/documents', {
            credentials: 'include',
            headers: {
              Accept: 'application/json',
            },
          }),
        ]);

        if (!profileResponse.ok) {
          return;
        }

        const data = (await profileResponse.json()) as { profile?: ClientProfileApi; payment_details?: ClientPaymentDetailsApi };
        const documentData = documentsResponse.ok ? ((await documentsResponse.json()) as { documents?: ClientDocumentsApi }) : null;
        const profile = data.profile ?? null;

        if (!isMounted || !profile) {
          return;
        }

        const fullName = String(profile.full_name || '').trim();
        const [firstName = '', ...restName] = fullName.split(/\s+/).filter(Boolean);
        const lastName = restName.join(' ');

        setPersonalForm((prev) => ({
          ...prev,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          email: String(profile.email || prev.email),
          phone: String(profile.phone || prev.phone),
          country: String(profile.country || prev.country),
        }));

        setProfileUserId(profile.user_id != null ? String(profile.user_id) : null);
        setProfileTier(String(profile.tier || ''));
        setProfileKycStatus(String(profile.kyc_status || ''));
        if (profile.avatar) {
          setAvatarSrc(profile.avatar);
        }
        setPaymentDetails(normalizePaymentDetails(data.payment_details));
        if (documentData?.documents) {
          setDocuments(normalizeDocumentCards(documentData.documents));
        }
        setPaymentForm((prev) => ({
          ...prev,
          bankName: String(data.payment_details?.bank?.bank_name || prev.bankName),
          accountNumber: String(data.payment_details?.bank?.account_number || prev.accountNumber),
          ifsc: String(data.payment_details?.bank?.ifsc_swift || prev.ifsc),
          branch: String(data.payment_details?.bank?.branch || prev.branch),
          bankStatus: normalizePaymentStatus(data.payment_details?.bank?.status),
          cryptoAddress: String(data.payment_details?.crypto?.wallet_address || prev.cryptoAddress),
          cryptoCurrency: String(data.payment_details?.crypto?.currency || prev.cryptoCurrency),
          cryptoStatus: normalizePaymentStatus(data.payment_details?.crypto?.status),
        }));
      } catch {
        if (isMounted) {
          setProfileUserId(null);
          setProfileTier('');
          setProfileKycStatus('');
          setPaymentDetails(INITIAL_PAYMENT_DETAILS);
          setDocuments(INITIAL_DOCUMENTS);
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'activity') {
      return;
    }

    let isMounted = true;

    const loadActivityLogs = async () => {
      setActivityLoading(true);

      try {
        const response = await fetch('/api/client/activity-logs', {
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load activity logs (${response.status})`);
        }

        const data = (await response.json()) as { activity_logs?: ActivityLogEntry[] };

        if (isMounted) {
          setActivityLogs(Array.isArray(data.activity_logs) ? data.activity_logs : []);
        }
      } catch {
        if (isMounted) {
          setActivityLogs([]);
        }
      } finally {
        if (isMounted) {
          setActivityLoading(false);
        }
      }
    };

    void loadActivityLogs();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const openDocumentPicker = (slot: DocumentSlotId) => {
    documentInputRefs.current[slot]?.click();
  };

  const openAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarSrc(reader.result);
        window.dispatchEvent(
          new CustomEvent('client-avatar-update', {
            detail: { avatar: reader.result },
          })
        );
      }
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('avatarFile', file);

      const response = await fetch('/api/client/profile/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to upload profile picture.');
      }

      if (data?.avatar) {
        setAvatarSrc(data.avatar);
        window.dispatchEvent(
          new CustomEvent('client-avatar-update', {
            detail: { avatar: data.avatar },
          })
        );
      }
      showProfileToast('Profile picture updated successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload profile picture.';
      showProfileToast(message);
    }
  };

  const handlePersonalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPersonalEditing) {
      return;
    }

    setIsPersonalSaving(true);

    try {
      const response = await fetch('/api/client/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${personalForm.firstName} ${personalForm.lastName}`.trim(),
          email: personalForm.email,
          phone: personalForm.phone,
          country: personalForm.country,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to submit profile changes.');
      }

      const profile = data?.profile as ClientProfileApi | undefined;
      if (profile) {
        const fullName = String(profile.full_name || '').trim();
        const [firstName = '', ...restName] = fullName.split(/\s+/).filter(Boolean);
        const lastName = restName.join(' ');

        setPersonalForm((prev) => ({
          ...prev,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          email: String(profile.email || prev.email),
          phone: String(profile.phone || prev.phone),
          country: String(profile.country || prev.country),
        }));
      }

      setIsPersonalEditing(false);
      showProfileToast(data?.message || 'Profile details submitted for approval.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit profile changes.';
      showProfileToast(message);
    } finally {
      setIsPersonalSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <>
        <Head>
          <title>My Profile | Client Portal</title>
        </Head>
        <ProfileSkeleton />
      </>
    );
  }

  const handleSecuritySave = async () => {
    if (!securityForm.currentPassword || !securityForm.newPassword || !securityForm.confirmPassword) {
      showProfileToast('Please fill all password fields.');
      return;
    }

    setIsSecuritySaving(true);

    try {
      const response = await fetch('/api/client/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: securityForm.currentPassword,
          new_password: securityForm.newPassword,
          confirm_password: securityForm.confirmPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to update password.');
      }

      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showProfileToast(data?.message || 'Password updated successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update password.';
      showProfileToast(message);
    } finally {
      setIsSecuritySaving(false);
    }
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

  const savePaymentEditor = async () => {
    if (!paymentEditTarget) {
      return;
    }

    setIsPaymentSaving(true);

    try {
      const payload =
        paymentEditTarget === 'bank'
          ? {
              paymentType: 'bank',
              accountHolder: `${personalForm.firstName} ${personalForm.lastName}`.trim() || personalForm.email,
              bankName: paymentForm.bankName.trim(),
              accountNumber: paymentForm.accountNumber.trim(),
              ifscSwift: paymentForm.ifsc.trim(),
              branch: paymentForm.branch.trim(),
              bankStatus: paymentForm.bankStatus,
              country: personalForm.country,
            }
          : {
              paymentType: 'crypto',
              cryptoAddress: paymentForm.cryptoAddress.trim(),
              cryptoCurrency: paymentForm.cryptoCurrency.trim(),
              cryptoStatus: paymentForm.cryptoStatus,
            };

      const response = await fetch('/api/client/payment-details', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to save payment details.');
      }

      setPaymentDetails(normalizePaymentDetails(data?.payment_details));
      setPaymentForm((prev) => ({
        ...prev,
        bankName: String(data?.payment_details?.bank?.bank_name || prev.bankName),
        accountNumber: String(data?.payment_details?.bank?.account_number || prev.accountNumber),
        ifsc: String(data?.payment_details?.bank?.ifsc_swift || prev.ifsc),
        branch: String(data?.payment_details?.bank?.branch || prev.branch),
        bankStatus: normalizePaymentStatus(data?.payment_details?.bank?.status),
        cryptoAddress: String(data?.payment_details?.crypto?.wallet_address || prev.cryptoAddress),
        cryptoCurrency: String(data?.payment_details?.crypto?.currency || prev.cryptoCurrency),
        cryptoStatus: normalizePaymentStatus(data?.payment_details?.crypto?.status),
      }));
      showProfileToast(data?.message || 'Payment details saved successfully.');
      closePaymentEditor();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save payment details.';
      showProfileToast(message);
    } finally {
      setIsPaymentSaving(false);
    }
  };

  const personalFullName = `${personalForm.firstName} ${personalForm.lastName}`.trim();
  const profileIdLabel = profileUserId ? `#MAM-${profileUserId}` : 'Not assigned';
  const avatarInitials =
    personalFullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';

  const handleDocumentChange = async (slot: DocumentSlotId, file: File | undefined) => {
    if (!file) {
      return;
    }

    setIsDocumentSaving(true);
    setDocuments((prev) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        status: 'pending',
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        uploadedAt: formatUploadedAt(),
        helperText: 'Uploaded successfully. Waiting for admin review.',
      },
    }));

    try {
      const formData = new FormData();
      formData.append('documentType', slot);
      formData.append('documentFile', file);

      const response = await fetch('/api/client/documents', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to submit document.');
      }

      if (data?.documents) {
        setDocuments(normalizeDocumentCards(data.documents));
      }

      setUploadNotice(`${file.name} uploaded and sent for review.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit document.';
      showProfileToast(message);
      setDocuments((prev) => ({
        ...prev,
        [slot]: EMPTY_DOCUMENT_CARD(slot),
      }));
    } finally {
      setIsDocumentSaving(false);
    }
  };

  const documentStats = DOCUMENT_ORDER.reduce(
    (stats, slot) => {
      const document = documents[slot];
      if (document.fileName || document.uploadedAt) {
        stats.total += 1;
      }
      stats[document.status] += document.fileName || document.uploadedAt ? 1 : 0;
      return stats;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 },
  );
  const paymentMethodsCount = [
    paymentDetails.bank.bankName,
    paymentDetails.bank.accountNumber,
    paymentDetails.bank.ifsc,
    paymentDetails.bank.branch,
  ].some(Boolean)
    ? 1
    : 0;
  const cryptoMethodsCount = [paymentDetails.crypto.address, paymentDetails.crypto.currency].some(Boolean) ? 1 : 0;

  return (
    <>
      <Head>
        <title>My Profile | Client Portal</title>
        <meta name="description" content="View and manage your student profile and MAM preferences" />
      </Head>

      <div className="relative isolate flex-1 overflow-hidden p-6 md:p-10 space-y-12">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-600/5 blur-[90px]" />
        </div>

        <div className="relative z-10">
          {showToast && (
            <div className="fixed bottom-6 right-6 bg-amber-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center gap-2 border border-amber-400 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Check size={18} />
              <span>{toastMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className={`relative overflow-hidden rounded-[2.5rem] border p-6 ${panelClass}`}>
                <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />

                <div className="flex flex-col items-center text-center">
                  <div className="group relative mb-4">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="Avatar"
                        className="h-28 w-28 rounded-3xl border-4 border-amber-500/40 object-cover shadow-xl transition-all duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-amber-500/40 bg-white/5 text-3xl font-black text-amber-400 shadow-xl transition-all duration-300 group-hover:scale-105">
                        {avatarInitials}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={openAvatarPicker}
                      className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-xl border-4 border-[#081433] bg-amber-500 text-slate-950 shadow-md transition-colors hover:bg-amber-400"
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

                  <h3 className={`mb-1 text-xl font-bold ${headingTextClass}`}>{personalFullName}</h3>
                  <p className="mb-4 inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    <Mail size={11} />
                    {personalForm.email || 'Not set'}
                  </p>

                  <div className={`w-full border-t ${borderMutedClass} pt-4 text-left text-xs`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={softTextClass}>Account ID</span>
                        <span className={`font-mono font-bold ${headingTextClass}`}>{profileIdLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={softTextClass}>Register Date</span>
                        <span className={`font-bold ${headingTextClass}`}>Not available</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={softTextClass}>Account Type</span>
                        <span className={`font-bold ${headingTextClass}`}>{profileTier || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`relative overflow-hidden rounded-[2.5rem] border p-6 ${panelClass}`}>
                <h4 className={`text-sm font-bold ${headingTextClass}`}>Account Security Status</h4>

                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <Check size={12} />
                    </div>
                    <div className="text-xs">
                      <p className={`font-medium ${headingTextClass}`}>Email Verified</p>
                      <p className={softTextClass}>{personalForm.email || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <Check size={12} />
                    </div>
                    <div className="text-xs">
                      <p className={`font-medium ${headingTextClass}`}>Identity (KYC) Verified</p>
                      <p className={softTextClass}>{profileKycStatus || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute -bottom-8 left-1/2 w-[220px] -translate-x-1/2 text-amber-400/20">
                  <Shield size={180} strokeWidth={1.25} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className={`rounded-[2.5rem] border p-6 ${panelClass}`}>
                <div className={`flex border-b ${borderMutedClass} gap-6 mb-6 overflow-x-auto pb-1 scrollbar-hide`}>
                  <button 
                    onClick={() => setActiveTab('personal')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'personal' 
                        ? 'border-amber-500 text-amber-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User size={15} /> Personal Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'security' 
                        ? 'border-amber-500 text-amber-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield size={15} /> Password & Security
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'activity' 
                        ? 'border-amber-500 text-amber-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity size={15} /> Activity Log
                  </button>

                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'documents'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <File size={15} /> Documents
                  </button>

                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex items-center gap-2 pb-3.5 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                      activeTab === 'payments'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CreditCard size={15} /> Payments
                  </button>
                </div>

                {activeTab === 'personal' && (
                  <form onSubmit={handlePersonalSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>First Name</label>
                        <div
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all ${inputClass} ${
                            isPersonalEditing
                              ? 'border-[#3aa0ff]'
                              : borderMutedClass
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
                            className={`w-full border-none bg-transparent text-xs outline-none text-white ${
                              isPersonalEditing ? '' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>Last Name</label>
                        <div
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all ${inputClass} ${
                            isPersonalEditing
                              ? 'border-[#3aa0ff]'
                              : borderMutedClass
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
                            className={`w-full border-none bg-transparent text-xs outline-none text-white ${
                              isPersonalEditing ? '' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>Email Address</label>
                        <div
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all cursor-not-allowed ${inputClass} ${borderMutedClass}`}
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
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>Phone Number</label>
                        <div
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all ${inputClass} ${
                            isPersonalEditing
                              ? 'border-[#3aa0ff]'
                              : borderMutedClass
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
                            className={`w-full border-none bg-transparent text-xs outline-none text-white ${
                              isPersonalEditing ? '' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>Country / Region</label>
                        <div
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all ${inputClass} ${
                            isPersonalEditing
                              ? 'border-[#3aa0ff]'
                              : borderMutedClass
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
                            className={`w-full border-none bg-transparent text-xs outline-none text-white ${
                              isPersonalEditing ? '' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>Local Timezone</label>
                        <div
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all ${inputClass} ${
                            isPersonalEditing
                              ? 'border-[#3aa0ff]'
                              : borderMutedClass
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
                            className={`w-full border-none bg-transparent text-xs outline-none text-white ${
                              isPersonalEditing ? '' : 'cursor-not-allowed text-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between gap-4 rounded-[22px] border ${borderMutedClass} bg-white/[0.02] px-5 py-4`}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300">
                          <Info size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">Keep your information up to date</p>
                          <p className={`mt-1 max-w-xl text-xs ${softTextClass}`}>
                            Ensure your personal information is accurate to avoid any interruptions in your trading activities.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPersonalEditing(true)}
                        className={`inline-flex items-center rounded-xl px-6 py-3 text-xs font-black transition-all uppercase tracking-widest hover:scale-105 ${goldButtonClass}`}
                      >
                        <Edit size={14} className="mr-2" />
                        Edit
                      </button>
                      <button
                        type="submit"
                        disabled={!isPersonalEditing || isPersonalSaving}
                        className={`inline-flex items-center rounded-xl px-6 py-3 text-xs font-black transition-all uppercase tracking-widest hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${goldButtonClass}`}
                      >
                        <Check size={14} className="mr-2" />
                        {isPersonalSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'security' && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSecuritySave();
                    }}
                    className="space-y-6"
                  >
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>Current Password</label>
                        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all ${inputClass} ${borderMutedClass} focus-within:border-[#3aa0ff]`}>
                          <Lock size={15} className="text-slate-400" />
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={securityForm.currentPassword}
                            onChange={(event) => setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                            className="bg-transparent border-none text-slate-100 outline-none w-full text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>New Password</label>
                        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all ${inputClass} ${borderMutedClass} focus-within:border-[#3aa0ff]`}>
                          <Key size={15} className="text-slate-400" />
                          <input
                            type="password"
                            placeholder="Min. 8 characters"
                            value={securityForm.newPassword}
                            onChange={(event) => setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                            className="bg-transparent border-none text-slate-100 outline-none w-full text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`text-[11px] font-black uppercase tracking-widest block mb-2 ${softTextClass}`}>Confirm New Password</label>
                        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all ${inputClass} ${borderMutedClass} focus-within:border-[#3aa0ff]`}>
                          <Key size={15} className="text-slate-400" />
                          <input
                            type="password"
                            placeholder="Must match new password"
                            value={securityForm.confirmPassword}
                            onChange={(event) => setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                            className="bg-transparent border-none text-slate-100 outline-none w-full text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSecuritySave()}
                      disabled={isSecuritySaving}
                      className={`px-6 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${goldButtonClass}`}
                    >
                      {isSecuritySaving ? 'Updating...' : 'Update Security Settings'}
                    </button>
                  </form>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">Document Vault</h4>
                        <p className="text-[11px] text-slate-400 mt-1">Review the latest identity and address verification files.</p>
                      </div>
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {documentStats.total} documents
                      </span>
                    </div>

                    {uploadNotice && (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 font-bold">
                        {uploadNotice}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className={`rounded-[2rem] border p-6 ${panelClass}`}>
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

                          <div className={`mt-8 flex w-full items-center justify-center rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-[0.28em] ${DOCUMENT_STATUS_CLASSES(documents.identity.status, isDarkMode)}`}>
                            Status: {DOCUMENT_STATUS_LABELS[documents.identity.status].toUpperCase()}
                          </div>

                          <button
                            type="button"
                            onClick={() => openDocumentPicker('identity')}
                            disabled={isDocumentSaving}
                            className="mt-4 w-full rounded-2xl bg-[#274aab] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-[#335fce] shadow-md border border-[#274aab]"
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
                              void handleDocumentChange('identity', event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </div>
                      </div>

                      <div className={`rounded-[2rem] border p-6 ${panelClass}`}>
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

                          <div className={`mt-8 flex w-full items-center justify-center rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-[0.28em] ${DOCUMENT_STATUS_CLASSES(documents.address.status, isDarkMode)}`}>
                            Status: {DOCUMENT_STATUS_LABELS[documents.address.status].toUpperCase()}
                          </div>

                          <button
                            type="button"
                            onClick={() => openDocumentPicker('address')}
                            disabled={isDocumentSaving}
                            className="mt-4 w-full rounded-2xl bg-[#274aab] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-[#335fce] shadow-md border border-[#274aab]"
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
                              void handleDocumentChange('address', event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">Saved Payment Methods</h4>
                        <p className="text-[11px] text-slate-400 mt-1">Manage the bank and crypto details used for funding requests.</p>
                      </div>
                      <span className="rounded-full border border-sky-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3aa0ff]">
                        {paymentMethodsCount + cryptoMethodsCount} methods
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div className={`relative overflow-hidden rounded-[2rem] border p-5 ${panelClass}`}>
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
                                {paymentDetails.bank.bankName || 'Not set'}
                              </p>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                Account Number
                              </p>
                              <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-50">
                                {paymentDetails.bank.accountNumber || 'Not set'}
                              </p>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                IFSC
                              </p>
                              <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-50">
                                {paymentDetails.bank.ifsc || 'Not set'}
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

                      <div className={`relative overflow-hidden rounded-[2rem] border p-5 ${panelClass}`}>
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
                              <p className="mt-2 break-all text-[15px] font-black tracking-[0.04em] leading-6 text-slate-50 font-mono">
                                {paymentDetails.crypto.address || 'Not set'}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                                  Currency
                                </p>
                                <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-50">
                                  {paymentDetails.crypto.currency || 'Not set'}
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

                {paymentEditTarget && typeof document !== 'undefined'
                  ? createPortal(
                  <div
                    className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-md px-4 py-6"
                    onClick={closePaymentEditor}
                  >
                    <div
                      className={`my-auto w-full max-w-[520px] max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-[2rem] border shadow-2xl ${panelClass}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className={`flex items-start justify-between border-b ${borderMutedClass} px-6 py-5`}>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3aa0ff]">Edit Payment</p>
                          <h4 className={`mt-2 text-lg font-black uppercase tracking-[0.16em] ${headingTextClass}`}>
                            {paymentEditTarget === 'bank' ? 'Bank Account' : 'Crypto Wallet'}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={closePaymentEditor}
                          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                            isDarkMode
                              ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                              : 'border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]'
                          }`}
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
                                <label className={`mb-2 block text-[10px] font-black uppercase tracking-[0.24em] ${softTextClass}`}>
                                  Bank Name
                                </label>
                                <input
                                  value={paymentForm.bankName}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, bankName: event.target.value }))
                                  }
                                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${inputClass}`}
                                  placeholder="Bank name"
                                />
                              </div>

                              <div>
                                <label className={`mb-2 block text-[10px] font-black uppercase tracking-[0.24em] ${softTextClass}`}>
                                  Account Number
                                </label>
                                <input
                                  value={paymentForm.accountNumber}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, accountNumber: event.target.value }))
                                  }
                                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${inputClass}`}
                                  placeholder="Account number"
                                />
                              </div>

                              <div>
                                <label className={`mb-2 block text-[10px] font-black uppercase tracking-[0.24em] ${softTextClass}`}>
                                  IFSC
                                </label>
                                <input
                                  value={paymentForm.ifsc}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, ifsc: event.target.value }))
                                  }
                                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${inputClass}`}
                                  placeholder="IFSC code"
                                />
                              </div>

                              <div>
                                <label className={`mb-2 block text-[10px] font-black uppercase tracking-[0.24em] ${softTextClass}`}>
                                  Branch Name
                                </label>
                                <input
                                  value={paymentForm.branch}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, branch: event.target.value }))
                                  }
                                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${inputClass}`}
                                  placeholder="Branch name"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <label className={`mb-2 block text-[10px] font-black uppercase tracking-[0.24em] ${softTextClass}`}>
                                  Wallet Address
                                </label>
                                <textarea
                                  value={paymentForm.cryptoAddress}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, cryptoAddress: event.target.value }))
                                  }
                                  rows={4}
                                  className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition-colors font-mono ${inputClass}`}
                                  placeholder="Wallet address"
                                />
                              </div>

                              <div>
                                <label className={`mb-2 block text-[10px] font-black uppercase tracking-[0.24em] ${softTextClass}`}>
                                  Currency
                                </label>
                                <input
                                  value={paymentForm.cryptoCurrency}
                                  onChange={(event) =>
                                    setPaymentForm((prev) => ({ ...prev, cryptoCurrency: event.target.value }))
                                  }
                                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${inputClass}`}
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
                            disabled={isPaymentSaving}
                            className={`flex-1 rounded-2xl border px-4 py-3 text-xs font-bold transition-all hover:scale-105 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white`}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void savePaymentEditor()}
                            disabled={isPaymentSaving}
                            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70 ${goldButtonClass}`}
                          >
                            {isPaymentSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                            {isPaymentSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body,
                )
                  : null}

                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-slate-100">Audit History Log</h4>
                      <button className="text-[10px] text-amber-400 hover:underline font-bold uppercase tracking-wider">Clear list</button>
                    </div>

                    <div className={`border ${borderMutedClass} rounded-2xl overflow-hidden divide-y divide-white/5`}>
                      {activityLoading ? (
                        <div className="p-5 text-xs font-semibold text-slate-400">
                          Loading recent activity...
                        </div>
                      ) : activityLogs.length > 0 ? (
                        activityLogs.map((log) => (
                          <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs hover:bg-white/5 transition-colors">
                            <div>
                              <p className={`font-semibold ${headingTextClass}`}>{log.action}</p>
                              <p className={`${softTextClass} text-[11px] mt-0.5`}>{log.details || 'No details provided'}</p>
                            </div>
                            <div className="md:text-right flex items-center md:flex-col gap-2 md:gap-0.5 justify-between">
                              <span className={`${softTextClass} text-[11px]`}>
                                {log.time ? new Date(log.time.replace(' ', 'T')).toLocaleString() : 'N/A'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase tracking-wide">
                                {log.ip_address}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-5 text-xs font-semibold text-slate-400">
                          No recent activity found for this client.
                        </div>
                      )}
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

