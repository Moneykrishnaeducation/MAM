import React, { useState, useRef, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { toast as sonnerToast } from 'sonner';
import {
  Search, Star, Inbox, Trash2, X, ChevronDown, ChevronLeft, ChevronRight,
  Bold, Italic, Underline, Paperclip, Plus, Minimize2, Maximize2, RefreshCw,
  Tag, Archive, Mail as MailIcon, ArrowLeft, CheckSquare, Square,
  FileText, SendHorizontal, ShieldAlert, Send
} from 'lucide-react';
import proxy from '@/lib/proxy';
import mockDataRaw from '@/data/mockData.json';

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

/* ─── Types ─────────────────────────────────────────────── */
interface MailItem {
  id: number;
  sender: string;
  senderEmail?: string;
  subject: string;
  snippet: string;
  time: string;
  unread: boolean;
  starred?: boolean;
  selected?: boolean;
  source?: string;
  category?: MailCategory;
  status?: string;
  to?: string[];
  labels?: string[];
  body?: string;
}

type MailCategory = 'all' | 'draft' | 'deposit' | 'withdrawal' | 'approval' | 'manual' | 'credentials' | 'system' | 'sent' | 'starred' | 'trash';

const MAIL_CATEGORY_META: Record<string, { label: string; badgeBg: string; badgeText: string }> = {
  draft: { label: 'Draft', badgeBg: 'bg-[#d4af37]/10', badgeText: 'text-[#d4af37]' },
  deposit: { label: 'Deposit', badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-300' },
  withdrawal: { label: 'Withdrawal', badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-300' },
  approval: { label: 'Approval/Reject', badgeBg: 'bg-[#1a2a7b]', badgeText: 'text-blue-100' },
  manual: { label: 'Manual', badgeBg: 'bg-[#12206a]', badgeText: 'text-blue-200' },
  credentials: { label: 'Credentials', badgeBg: 'bg-[#12206a]', badgeText: 'text-blue-200' },
  system: { label: 'System', badgeBg: 'bg-[#12206a]', badgeText: 'text-blue-200' },
  other: { label: 'Other', badgeBg: 'bg-[#1a2a7b]', badgeText: 'text-blue-200' },
};

function classifyMail(mail: any): MailCategory {
  const source = String(mail?.source || '').toLowerCase();
  const type = String(mail?.request_type || mail?.type || mail?.category || '').toLowerCase();
  const subject = String(mail?.subject || '').toLowerCase();
  const status = String(mail?.status || '').toLowerCase();

  if (status === 'draft') return 'draft';
  if (source.includes('credential') || subject.includes('credential')) return 'credentials';
  if (source.includes('manual') || source.includes('admin')) return 'manual';
  if (type.includes('deposit')) return status === 'approved' || status === 'rejected' ? 'approval' : 'deposit';
  if (type.includes('withdrawal')) return status === 'approved' || status === 'rejected' ? 'approval' : 'withdrawal';
  if (type.includes('profile') || type.includes('document') || type.includes('bank') || type.includes('crypto') || status === 'approved' || status === 'rejected') return 'approval';
  if (type.includes('welcome') || type.includes('client_user_creation')) return 'system';
  return 'manual';
}

/* ─── Initial Fallback Data ────────────────────────────── */
const fallbackMails: MailItem[] = [
  { id: 1, sender: 'Alex Rivera', senderEmail: 'alex.rivera@example.com', subject: 'Deposit request received - Trading Account #88921', snippet: 'Hello Admin, a new deposit request is waiting for review and approval...', time: '10:45 AM', unread: true, starred: true, source: 'deposit', category: 'deposit', labels: ['Deposit'] },
  { id: 2, sender: 'Apex Education Ventures', senderEmail: 'finance@apexedu.org', subject: 'Withdrawal request rejected', snippet: 'Attached is the withdrawal review note with the rejection reason...', time: 'Yesterday', unread: true, starred: false, source: 'withdrawal', category: 'approval', labels: ['Approval/Reject'] },
  { id: 3, sender: 'System Audit Bot', senderEmail: 'noreply@pam-platform.com', subject: 'MT5 account credentials dispatched', snippet: 'The trading account credential email was dispatched successfully...', time: 'Jul 29', unread: false, starred: false, source: 'credentials', category: 'credentials', labels: ['Credentials'] },
];

/* ─── Gmail Style Compose Modal (Floating Bottom-Right) ─── */
interface ComposeModalProps {
  onClose: () => void;
  onSent: () => void;
  draftMail?: MailItem | null;
}

function ComposeModal({ onClose, onSent, draftMail }: ComposeModalProps) {
  const [manualTo, setManualTo] = useState(draftMail?.to?.join(', ') || '');
  const [manualCc, setManualCc] = useState('');
  const [manualBcc, setManualBcc] = useState('');
  const [recipientEmails, setRecipientEmails] = useState<string[]>(draftMail?.to || []);
  const [recipientMode, setRecipientMode] = useState<'manual' | 'client' | 'admin' | 'both'>('manual');
  const [recipientSummary, setRecipientSummary] = useState(draftMail?.to?.length ? `Draft recipients (${draftMail.to.length})` : '');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(draftMail?.subject && draftMail.subject !== '(no subject)' ? draftMail.subject : '');
  const [body, setBody] = useState(draftMail?.body && draftMail.body !== 'No content.' ? draftMail.body : '');
  const [minimised, setMinimised] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipientLoading, setRecipientLoading] = useState<'client' | 'admin' | 'both' | ''>('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setManualTo(draftMail?.to?.join(', ') || '');
    setRecipientEmails(draftMail?.to || []);
    setRecipientMode('manual');
    setRecipientSummary(draftMail?.to?.length ? `Draft recipients (${draftMail.to.length})` : '');
    setSubject(draftMail?.subject && draftMail.subject !== '(no subject)' ? draftMail.subject : '');
    setBody(draftMail?.body && draftMail.body !== 'No content.' ? draftMail.body : '');
    setManualCc('');
    setManualBcc('');
    setShowCc(false);
    setShowBcc(false);
  }, [draftMail]);

  function normalizeEmails(rows: unknown[]): string[] {
    if (!Array.isArray(rows)) return [];
    const emails: string[] = [];
    rows.forEach((row: any) => {
      if (typeof row === 'string') {
        const trimmed = row.trim().toLowerCase();
        if (trimmed && trimmed.includes('@')) emails.push(trimmed);
      } else if (row && typeof row === 'object') {
        const possibleEmail = row.email || row.user_email || row.recipient || row.email_address;
        if (possibleEmail && typeof possibleEmail === 'string') {
          const trimmed = possibleEmail.trim().toLowerCase();
          if (trimmed && trimmed.includes('@')) emails.push(trimmed);
        }
      }
    });
    return Array.from(new Set(emails));
  }

  function normalizeEmailList(value: string): string[] {
    return Array.from(
      new Set(
        value
          .split(',')
          .map((part) => part.trim().toLowerCase())
          .filter((part) => part && part.includes('@'))
      )
    );
  }

  function saveDraft(afterSave?: () => void) {
    const resolvedTo = recipientMode === 'manual' ? manualTo : recipientEmails.join(', ');
    const hasDraftContent = resolvedTo.trim() || subject.trim() || body.trim() || manualCc.trim() || manualBcc.trim();
    if (!hasDraftContent || sending || sent) {
      onClose();
      return;
    }

    setSending(true);
    proxy.post('/api/admin/mails', {
      to: resolvedTo.split(',').map(part => part.trim()).filter(Boolean),
      cc: normalizeEmailList(manualCc),
      bcc: normalizeEmailList(manualBcc),
      subject: subject.trim() || '(no subject)',
      body: body || '',
      html_body: body ? body.replace(/\n/g, '<br />') : '',
      send_now: false,
      draft_id: draftMail?.id,
    })
      .then(() => {
        setSending(false);
        afterSave?.();
        onClose();
      })
      .catch((err) => {
        setSending(false);
        sonnerToast.error(err?.message || 'Failed to save draft');
        onClose();
      });
  }

  function loadRecipients(kind: 'client' | 'admin' | 'both') {
    if (recipientLoading) return;
    setRecipientLoading(kind);

    const extractEmails = (rows: unknown[], roleFilter?: (row: any) => boolean): string[] => {
      if (!Array.isArray(rows)) return [];

      const emails: string[] = [];
      rows.forEach((row: any) => {
        if (roleFilter && !roleFilter(row)) return;

        const possibleEmails = [
          row?.email,
          row?.user_email,
          row?.recipient,
          row?.email_address,
          row?.contact_email,
        ];

        possibleEmails.forEach((value) => {
          if (typeof value !== 'string') return;
          const trimmed = value.trim().toLowerCase();
          if (trimmed && trimmed.includes('@')) emails.push(trimmed);
        });
      });

      return Array.from(new Set(emails));
    };

    const getMockClientEmails = (): string[] => {
      try {
        const users = mockDataRaw?.admin?.users || [];
        return extractEmails(users, (u: any) => {
          const role = String(u?.role || u?.userType || u?.accountRole || '').toLowerCase();
          return role.includes('client') || role.includes('investor') || role.includes('user') || !role;
        });
      } catch {
        return [];
      }
    };

    const getMockAdminEmails = (): string[] => {
      try {
        const admins = mockDataRaw?.admin?.adminUsers || [];
        return admins
          .map((a: any) => String(a.email || '').trim().toLowerCase())
          .filter((email: string) => email && email.includes('@'));
      } catch {
        return [];
      }
    };

    const loadClientRecipients = () =>
      proxy.get('/api/admin/users').then((response) => {
        const data = response?.data;
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data?.users)) list = data.users;
        else if (Array.isArray(data?.data?.users)) list = data.data.users;
        else if (Array.isArray(data?.data)) list = data.data;
        else if (Array.isArray(data?.results)) list = data.results;

        const clientUsers = list.filter((u: any) => {
          const role = String(u?.role || u?.userType || u?.accountRole || '').toLowerCase();
          return !role || role.includes('client') || role.includes('investor') || role.includes('user');
        });

        const emails = extractEmails(clientUsers.length ? clientUsers : list);
        return emails.length > 0 ? emails : getMockClientEmails();
      }).catch(() => getMockClientEmails());

    const loadAdminRecipients = () =>
      proxy.get('/api/admin/admin-users').then((response) => {
        const data = response?.data;
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data?.admin_users)) list = data.admin_users;
        else if (Array.isArray(data?.admins)) list = data.admins;
        else if (Array.isArray(data?.data)) list = data.data;
        else if (Array.isArray(data?.results)) list = data.results;

        const emails = normalizeEmails(list);
        return emails.length > 0 ? emails : getMockAdminEmails();
      }).catch(() => getMockAdminEmails());

    const requests = kind === 'client'
      ? [loadClientRecipients()]
      : kind === 'admin'
        ? [loadAdminRecipients()]
        : [loadClientRecipients(), loadAdminRecipients()];

    Promise.all(requests)
      .then((results) => {
        const emails = Array.from(new Set(results.flat().filter(Boolean)));
        if (emails.length > 0) {
          const emailString = emails.join(', ');
          setManualTo(emailString);
          setRecipientEmails(emails);
          setRecipientMode('manual');
          setRecipientSummary(`${kind === 'both' ? 'Both' : kind === 'client' ? 'Client' : 'Admin'} list (${emails.length})`);
          sonnerToast.success(`Loaded ${emails.length} ${kind} email(s) from user records.`);
        } else {
          sonnerToast.error(`No ${kind} email records found.`);
        }
      })
      .catch((err) => {
        sonnerToast.error(err?.message || `Unable to load ${kind} recipients`);
      })
      .finally(() => {
        setRecipientLoading('');
      });
  }

  function handleSend() {
    const resolvedTo = recipientMode === 'manual' ? manualTo : recipientEmails.join(', ');
    if (!resolvedTo.trim() || !subject.trim() || sending || sent) return;
    setSending(true);

    proxy.post('/api/admin/mails', {
      draft_id: draftMail?.id,
      to: resolvedTo.split(',').map(part => part.trim()).filter(Boolean),
      cc: normalizeEmailList(manualCc),
      bcc: normalizeEmailList(manualBcc),
      subject,
      body,
      html_body: body ? body.replace(/\n/g, '<br />') : '',
      send_now: true,
    })
      .then(() => { setSending(false); setSent(true); onSent(); setTimeout(() => onClose(), 1000); })
      .catch((err) => { setSending(false); sonnerToast.error(err?.message || 'Failed to send message'); });
  }

  const hasToRecipients = (recipientMode === 'manual' ? manualTo : recipientEmails.length > 0);
  const canSend = hasToRecipients && subject.trim() && body.trim() && !sending && !sent;

  return (
    <div className={`fixed z-50 transition-all duration-200 shadow-[0_24px_80px_rgba(4,9,35,0.55)] rounded-t-2xl bg-[#0b1329] border border-[#24358a] flex flex-col overflow-hidden ${isExpanded ? 'inset-x-12 bottom-0 top-16 max-w-5xl mx-auto' : 'right-6 bottom-0 w-[540px] max-h-[580px]'}`}>
      <div className="bg-[#0f1d5f] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#24358a] cursor-pointer rounded-t-2xl">
        <span className="text-xs font-semibold text-blue-100 font-sans">{draftMail ? 'Edit Draft' : 'New Message'}</span>
        <div className="flex items-center gap-1.5 text-blue-200">
          <button onClick={() => setMinimised(!minimised)} className="p-1 hover:bg-[#12206a] rounded"><Minimize2 size={13} /></button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-[#12206a] rounded"><Maximize2 size={13} /></button>
          <button onClick={() => saveDraft()} className="p-1 hover:bg-[#12206a] hover:text-[#d4af37] rounded"><X size={14} /></button>
        </div>
      </div>
      {!minimised && (
        <div className="flex flex-col flex-1 overflow-hidden bg-[#0f1d5f]">
          <div className="border-b border-[#24358a] px-4 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 flex-1"><span className="text-blue-300 w-8">To</span><input value={recipientMode === 'manual' ? manualTo : recipientSummary} onChange={(e) => {setRecipientMode('manual'); setManualTo(e.target.value);}} placeholder="Recipients" className="w-full outline-none py-1 bg-transparent text-white placeholder:text-blue-300" /></div>
            <div className="flex items-center gap-2 text-blue-300">
              <button onClick={() => setShowCc((prev) => !prev)} className="hover:text-[#d4af37] font-medium">Cc</button>
              <button onClick={() => setShowBcc((prev) => !prev)} className="hover:text-[#d4af37] font-medium">Bcc</button>
              <button onClick={() => loadRecipients('client')} className="hover:text-[#d4af37] font-medium">+Client</button>
              <button onClick={() => loadRecipients('admin')} className="hover:text-[#d4af37] font-medium">+Admin</button>
            </div>
          </div>
          {showCc && (
            <div className="border-b border-[#24358a] px-4 py-1.5 flex items-center text-xs">
              <span className="text-blue-300 w-8">Cc</span>
              <input
                value={manualCc}
                onChange={(e) => setManualCc(e.target.value)}
                placeholder="Cc recipients"
                className="w-full outline-none py-1 bg-transparent text-white placeholder:text-blue-300"
              />
            </div>
          )}
          {showBcc && (
            <div className="border-b border-[#24358a] px-4 py-1.5 flex items-center text-xs">
              <span className="text-blue-300 w-8">Bcc</span>
              <input
                value={manualBcc}
                onChange={(e) => setManualBcc(e.target.value)}
                placeholder="Bcc recipients"
                className="w-full outline-none py-1 bg-transparent text-white placeholder:text-blue-300"
              />
            </div>
          )}
          <div className="border-b border-[#24358a] px-4 py-1.5 flex items-center text-xs"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full outline-none py-1 font-medium bg-transparent text-white placeholder:text-blue-300" /></div>
          <div className="flex-1 p-4 flex flex-col min-h-[180px]"><textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} className="w-full flex-1 resize-none outline-none text-sm bg-transparent text-white placeholder:text-blue-300" /></div>
          <div className="px-4 py-3 border-t border-[#24358a] bg-[#0b1329] flex items-center">
            <button onClick={handleSend} disabled={!canSend} className={`px-5 py-2 rounded-full text-xs font-semibold ${canSend ? 'bg-[#d4af37] text-[#081034]' : 'bg-[#12206a] text-blue-300'}`}>
              {sending ? 'Sending...' : sent ? 'Sent' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Admin Mails Page (Google Mail UI) ──────────────── */
export default function AdminMailsPage() {
  const [adminRole, setAdminRole] = useState('');
  const [mails, setMails] = useState<MailItem[]>(fallbackMails);
  const [selectedMailId, setSelectedMailId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<MailCategory>('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraftMail, setComposeDraftMail] = useState<MailItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMails, setTotalMails] = useState(0);
  const pageSize = 10;
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  const loadMailsData = (category: MailCategory = activeCategory, search = searchQuery, silent = false) => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    const searchText = search.trim();
    if (searchText) params.set('search', searchText);
    params.set('limit', String(pageSize));
    params.set('page', String(currentPage));
    const queryString = params.toString();
    proxy.get(`/api/admin/mails${queryString ? `?${queryString}` : ''}`).then((response) => {
      const apiMails = Array.isArray(response.data?.messages) ? response.data.messages : [];
      const visibleMails = category === 'all'
        ? apiMails.filter((mail: any) => String(mail?.status || '').toLowerCase() !== 'draft')
        : apiMails;
      const totalCount = Number(response.data?.total_count || response.data?.count || visibleMails.length);
      setTotalMails(totalCount);
      setMails(visibleMails.map((mail: any, index: number) => ({
        id: Number(mail.id || index + 1),
        sender: mail.sender || 'Admin Mail',
        subject: mail.subject || '(no subject)',
        snippet: (mail.body || '').slice(0, 100),
        body: mail.body || 'No content.',
        time: '10:00 AM',
        unread: mail.status !== 'sent',
        category: (mail.category as MailCategory) || classifyMail(mail),
        status: mail.status,
        to: Array.isArray(mail.to) ? mail.to : [],
      })));
    }).catch(() => setMails(fallbackMails));
  };

  useEffect(() => {
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = window.setTimeout(() => {
      loadMailsData(activeCategory, searchQuery);
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery, activeCategory, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const filteredMails = useMemo(() => {
    return mails;
  }, [mails]);

  const selectedMail = useMemo(() => mails.find(m => m.id === selectedMailId), [mails, selectedMailId]);
  const totalPages = Math.max(1, Math.ceil(totalMails / pageSize));

  function sendDraftMail(mail: MailItem) {
    if (!mail?.id || mail.status !== 'draft') return;

    proxy.post('/api/admin/mails', {
      draft_id: mail.id,
      to: mail.to || [],
      cc: [],
      bcc: [],
      subject: mail.subject === '(no subject)' ? '' : mail.subject,
      body: mail.body || '',
      html_body: String(mail.body || '').replace(/\n/g, '<br />'),
      send_now: true,
    })
      .then(() => {
        setSelectedMailId(null);
        loadMailsData('draft', searchQuery, true);
        loadMailsData('all', searchQuery, true);
      })
      .catch((err) => sonnerToast.error(err?.message || 'Failed to send draft'));
  }

  function editDraftMail(mail: MailItem) {
    if (!mail?.id || mail.status !== 'draft') return;
    setComposeDraftMail(mail);
    setComposeOpen(true);
  }

  return (
    <>
      <Head>
        <title>Gmail - Admin Inbox</title>
      </Head>
      <div className="h-[94vh] w-full bg-[#0c1c59] pt-5 px-2 text-white flex flex-col overflow-hidden select-none">

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-64 p-3 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <button onClick={() => setComposeOpen(true)} className="flex items-center justify-center gap-3 bg-[#d4af37] text-[#081034] px-6 py-3.5 rounded-2xl w-full font-black hover:shadow-lg hover:shadow-[0_16px_40px_rgba(212,175,55,0.25)] transition-all border border-[#d4af37]/40">
                <Plus size={18} /> Compose
              </button>

              {/* Sidebar Folder Options */}
              <div className="space-y-1 pt-2">
                {[
                  { key: 'all', label: 'All Mail', icon: MailIcon },
                  { key: 'draft', label: 'Drafts', icon: FileText },
                  { key: 'deposit', label: 'Deposit', icon: Tag },
                  { key: 'withdrawal', label: 'Withdrawal', icon: Tag },
                  { key: 'credentials', label: 'Credential', icon: FileText },
                  { key: 'approval', label: 'Approval/Rejected', icon: ShieldAlert },
                  { key: 'manual', label: 'Manual', icon: Inbox },
                ].map(item => (
                  <button key={item.key} onClick={() => { setActiveCategory(item.key as MailCategory); setSelectedMailId(null); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${activeCategory === item.key ? 'bg-[#12206a] text-white shadow-sm ring-1 ring-[#d4af37]/40' : 'text-blue-200 hover:bg-[#0d1a57]/70'}`}>
                    <item.icon size={16} /> {item.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 bg-[#0f1d5f]/92 backdrop-blur rounded-3xl my-2 mr-4 border border-[#24358a]/80 shadow-[0_20px_60px_rgba(4,9,35,0.45)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#24358a] bg-[#0d1a57]/80">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Inbox</h2>
                  <p className="text-xs text-blue-300">{filteredMails.length} conversations</p>
                </div>
                <div className="flex flex-col gap-2 w-full lg:w-[420px]">
                  <div className="relative">
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search inbox"
                      className="w-full rounded-full border border-[#24358a] bg-[#091036] px-10 py-2 text-sm outline-none text-white placeholder:text-blue-300 shadow-sm focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/10"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-300">
                  <span className="px-3 py-1 rounded-full bg-[#12206a] border border-[#24358a]">{activeCategory === 'all' ? 'All mail' : MAIL_CATEGORY_META[activeCategory]?.label || activeCategory}</span>
                    <span className="px-3 py-1 rounded-full bg-[#12206a] border border-[#24358a]">{currentPage}/{totalPages}</span>
                    <span className="px-3 py-1 rounded-full bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20">Live</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedMail ? (
              <div className="p-8 max-w-4xl space-y-6 overflow-y-auto text-white">
                <button onClick={() => setSelectedMailId(null)} className="text-blue-300 flex items-center gap-1 text-xs font-semibold hover:underline">
                  <ArrowLeft size={16}/> Back to list
                </button>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${MAIL_CATEGORY_META[selectedMail.category || 'other']?.badgeBg || 'bg-[#1a2a7b]'} ${MAIL_CATEGORY_META[selectedMail.category || 'other']?.badgeText || 'text-blue-200'}`}>
                      {MAIL_CATEGORY_META[selectedMail.category || 'other']?.label || 'Other'}
                    </span>
                    {selectedMail.status === 'draft' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#d4af37]/10 text-[#d4af37]">Draft</span>
                    )}
                    {selectedMail.unread && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#12206a] text-blue-200">Unread</span>}
                    {selectedMail.starred && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#d4af37]/10 text-[#d4af37]">Starred</span>}
                  </div>
                  <h1 className="text-3xl font-semibold text-white leading-tight">{selectedMail.subject}</h1>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                    {selectedMail.sender[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{selectedMail.sender}</div>
                    <div className="text-xs text-blue-300">{selectedMail.senderEmail || 'no-reply@example.com'} • to me</div>
                  </div>
                </div>
                <div className="p-6 bg-[#091036] rounded-2xl text-sm text-blue-100 leading-relaxed border border-[#24358a] shadow-[0_12px_30px_rgba(4,9,35,0.25)]">
                  {selectedMail.body || selectedMail.snippet}
                </div>
                {selectedMail.status === 'draft' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => editDraftMail(selectedMail)}
                      className="px-4 py-2 rounded-full bg-[#d4af37] text-[#081034] text-xs font-black hover:bg-[#e2c15a] transition-colors"
                    >
                      Edit Draft
                    </button>
                  </div>
                )}
              </div>
            ) : filteredMails.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-[#24358a]/60">
                  {filteredMails.map(mail => (
                  <div
                    key={mail.id}
                    onClick={() => setSelectedMailId(mail.id)}
                    className={`group flex items-center gap-4 px-5 py-4 cursor-pointer text-sm transition-all hover:bg-[#12206a] ${mail.unread ? 'bg-[#12206a]/35' : 'bg-[#0f1d5f]'}`}
                  >
                    <div className="w-11 h-11 rounded-full bg-[#12206a] border border-[#24358a] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {mail.sender[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className={`truncate ${mail.unread ? 'font-bold text-white' : 'font-semibold text-blue-100'}`}>{mail.sender}</span>
                        <span className="text-[11px] text-blue-400 shrink-0">{mail.time}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 min-w-0">
                        <span className={`truncate ${mail.unread ? 'text-white' : 'text-blue-200'}`}>{mail.subject}</span>
                        <span className="hidden md:inline text-blue-400 font-normal truncate">- {mail.snippet}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {(mail.labels || []).slice(0, 2).map((label) => (
                          <span key={label} className="px-2 py-0.5 rounded-full bg-[#1a2a7b] text-blue-200 text-[10px] font-bold uppercase tracking-wide">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-blue-400">
                      {mail.starred && <Star size={15} className="fill-[#d4af37]/40 text-[#d4af37]" />}
                      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 h-full text-blue-300 text-sm">
                <div className="w-20 h-20 rounded-3xl bg-[#12206a] border border-[#24358a] flex items-center justify-center mb-4 shadow-inner">
                  <Inbox size={36} className="text-blue-100" />
                </div>
                <p className="font-semibold text-white">No emails found</p>
                <p className="text-xs text-blue-400 mt-1">Try a different folder or clear your search.</p>
              </div>
            )}
            <div className="px-5 py-3 border-t border-[#24358a] bg-[#0d1a57]/80 flex items-center justify-between text-xs text-blue-300">
              <span>
                Showing {mails.length} of {totalMails} mails
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-full border border-[#24358a] disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-full border border-[#24358a] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </main>
        </div>

        {composeOpen && (
          <ComposeModal
            onClose={() => {
              setComposeOpen(false);
              setComposeDraftMail(null);
            }}
            onSent={() => {
              setComposeOpen(false);
              setComposeDraftMail(null);
              setSelectedMailId(null);
              loadMailsData('draft', searchQuery, true);
              loadMailsData('all', searchQuery, true);
            }}
            draftMail={composeDraftMail}
          />
        )}
      </div>
    </>
  );
}
