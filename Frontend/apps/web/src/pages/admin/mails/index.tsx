import React, { useState, useRef, useEffect, useMemo } from 'react';
import Head from 'next/head';
import {
  Mail, Search, Send, Star, Inbox, Trash2, X, ChevronDown,
  Bold, Italic, Underline, List, Link2, Paperclip, AlertCircle,
  Plus, Minimize2, Maximize2, RefreshCw, Sparkles, CheckCircle2,
  Clock, User, Check
} from 'lucide-react';
import proxy from '@/lib/proxy';

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
  subject: string;
  snippet: string;
  time: string;
  unread: boolean;
}

type Priority = 'normal' | 'high' | 'urgent';

/* ─── Sample data ────────────────────────────────────────── */
const fallbackMails: MailItem[] = [
  { id: 1, sender: 'Alex Rivera', subject: 'Inquiry regarding Course Valuation module', snippet: 'Hello Admin, I had a quick question regarding module 4 access and performance statistics...', time: '10:45 AM', unread: true },
  { id: 2, sender: 'Apex Education Ventures', subject: 'Q3 Financial Distribution Report', snippet: 'Attached is the quarterly investment summary for review and management validation...', time: 'Yesterday', unread: true },
  { id: 3, sender: 'System Audit Bot', subject: 'Weekly Automated Backup Status: Success', snippet: 'All database tables successfully backed up to cloud storage without warnings...', time: 'Jul 29', unread: false },
];

/* ─── Compose Modal ──────────────────────────────────────── */
interface ComposeModalProps {
  onClose: () => void;
  onSent: () => void;
}

function ComposeModal({ onClose, onSent }: ComposeModalProps) {
  const [manualTo, setManualTo] = useState('');
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [recipientMode, setRecipientMode] = useState<'manual' | 'client' | 'admin' | 'both'>('manual');
  const [recipientSummary, setRecipientSummary] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recipientLoading, setRecipientLoading] = useState<'client' | 'admin' | 'both' | ''>('');
  const [recipientMessage, setRecipientMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [visible, setVisible] = useState(false);

  /* mount animation */
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function execFormat(cmd: string) {
    bodyRef.current?.focus();
    document.execCommand(cmd);
  }

  function normalizeEmails(rows: unknown[]): string[] {
    const emails = (rows as Array<{ email?: unknown }>).map((row) => String(row?.email || '').trim().toLowerCase()).filter(Boolean);
    return Array.from(new Set(emails));
  }

  function loadRecipients(kind: 'client' | 'admin' | 'both') {
    if (recipientLoading) return;
    setRecipientLoading(kind);
    setRecipientMessage('');

    const loadClientRecipients = () =>
      proxy.get('/api/admin/users').then((response) => (
        Array.isArray(response.data?.users) ? response.data.users : []
      ));

    const loadAdminRecipients = () =>
      proxy.get('/api/admin/admin-users').then((response) => (
        Array.isArray(response.data?.admin_users) ? response.data.admin_users : []
      ));

    const requests = kind === 'client'
      ? [loadClientRecipients()]
      : kind === 'admin'
        ? [loadAdminRecipients()]
        : [loadClientRecipients(), loadAdminRecipients()];

    Promise.all(requests)
      .then((results) => {
        const emails = normalizeEmails(results.flat());
        setRecipientEmails(emails);
        setRecipientMode(kind);
        setRecipientSummary(
          emails.length
            ? `${kind === 'both' ? 'Both' : kind === 'client' ? 'Client' : 'Admin'} recipients loaded: ${emails.length}`
            : `${kind === 'both' ? 'Both' : kind === 'client' ? 'Client' : 'Admin'} recipients loaded`,
        );
        if (kind === 'both') {
          setRecipientMessage(
            emails.length
              ? `Loaded ${emails.length} total recipient(s) from client and admin tables.`
              : 'No recipients found in client or admin tables.',
          );
          return;
        }
        const label = kind === 'client' ? 'client' : 'admin';
        setRecipientMessage(
          emails.length
            ? `Loaded ${emails.length} ${label} recipient(s).`
            : `No ${label} recipients found.`,
        );
      })
      .catch((err) => {
        setRecipientMessage(err?.message || `Unable to load ${kind} recipients`);
      })
      .finally(() => {
        setRecipientLoading('');
      });
  }

  function handleSend() {
    const resolvedTo = recipientMode === 'manual'
      ? manualTo
      : recipientEmails.join(', ');

    if (!resolvedTo.trim() || !subject.trim() || sending || sent) return;
    setSending(true);
    setErrorMessage('');

    proxy.post('/api/admin/mails', {
      to: resolvedTo.split(',').map(part => part.trim()).filter(Boolean),
      cc: cc.split(',').map(part => part.trim()).filter(Boolean),
      bcc: bcc.split(',').map(part => part.trim()).filter(Boolean),
      subject,
      body,
      html_body: body ? body.replace(/\n/g, '<br />') : '',
      send_now: true,
    })
      .then(() => {
        setSending(false);
        setSent(true);
        onSent();
        setTimeout(() => handleClose(), 1200);
      })
      .catch((err) => {
        setSending(false);
        setErrorMessage(err?.message || 'Failed to send message');
      });
  }

  function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments(prev => [...prev, ...files.map(f => f.name)]);
  }

  const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
    normal:  { label: 'Normal',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    high:    { label: 'High',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
    urgent:  { label: 'Urgent',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  };
  const { label: prLabel, color: prColor, bg: prBg } = priorityConfig[priority];

  const charCount = body.length;
  const resolvedTo = recipientMode === 'manual' ? manualTo : recipientEmails.join(', ');
  const canSend = resolvedTo.trim() && subject.trim() && !sending && !sent;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(5, 12, 30, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        padding: '1.25rem',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: 580,
          borderRadius: '1.5rem',
          background: 'linear-gradient(155deg, #0b1736 0%, #08122c 60%, #050b1e 100%)',
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 32px 80px -16px rgba(0,0,0,0.8), 0 0 40px rgba(212,175,55,0.1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
          transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          maxHeight: minimised ? 56 : 620,
        } as React.CSSProperties}
      >
        {/* Header bar */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1.1rem',
            background: 'linear-gradient(90deg, rgba(212,175,55,0.12), rgba(37,99,235,0.12))',
            borderBottom: minimised ? 'none' : '1px solid rgba(255,255,255,0.08)',
            cursor: minimised ? 'pointer' : 'default',
            userSelect: 'none',
          }}
          onClick={() => minimised && setMinimised(false)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,rgba(212,175,55,0.25),rgba(37,99,235,0.2))',
              border: '1px solid rgba(212,175,55,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Send size={12} style={{ color: '#d4af37' }} />
            </div>
            <span style={{ color: '#f8fafc', fontWeight: 800, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Compose New Message
            </span>
            {priority !== 'normal' && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
                padding: '2px 7px', borderRadius: 999,
                background: prBg, color: prColor,
                border: `1px solid ${prColor}40`,
              }}>
                {prLabel}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setMinimised(v => !v)}
              style={{ padding: '4px 6px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              className="hover:bg-slate-800 transition-colors"
              title={minimised ? 'Expand' : 'Minimise'}
            >
              {minimised ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>
            <button
              onClick={handleClose}
              style={{ padding: '4px 6px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              className="hover:bg-slate-800 hover:text-red-400 transition-colors"
              title="Discard"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {!minimised && (
          <>
            {/* Address fields */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 1.1rem' }}>
              {/* To */}
              <FieldRow label="To">
                <input
                  id="compose-to"
                  value={recipientMode === 'manual' ? manualTo : recipientSummary}
                  onChange={e => {
                    setRecipientMode('manual');
                    setRecipientEmails([]);
                    setRecipientSummary('');
                    setManualTo(e.target.value);
                  }}
                  placeholder="Recipient email addresses..."
                  style={fieldInputStyle}
                />
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    onClick={() => loadRecipients('client')}
                    disabled={recipientLoading === 'admin'}
                    style={ccBtnStyle}
                  >
                    {recipientLoading === 'client' ? 'Loading...' : 'Client List'}
                  </button>
                  <button
                    onClick={() => loadRecipients('admin')}
                    disabled={recipientLoading === 'client'}
                    style={ccBtnStyle}
                  >
                    {recipientLoading === 'admin' ? 'Loading...' : 'Admin List'}
                  </button>
                  <button
                    onClick={() => loadRecipients('both')}
                    disabled={recipientLoading === 'client' || recipientLoading === 'admin'}
                    style={ccBtnStyle}
                  >
                    {recipientLoading === 'both' ? 'Loading...' : 'Both'}
                  </button>
                </div>
              </FieldRow>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#64748b' }}>
                  Click buttons to auto-fill recipient lists from database.
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {!showCc && <button onClick={() => setShowCc(true)} style={ccBtnStyle}>Cc</button>}
                  {!showBcc && <button onClick={() => setShowBcc(true)} style={ccBtnStyle}>Bcc</button>}
                </div>
              </div>

              {recipientMessage && (
                <div style={{ paddingBottom: 6, fontSize: 10, color: recipientMessage.startsWith('Loaded') ? '#60a5fa' : '#f87171' }}>
                  {recipientMessage}
                </div>
              )}

              {showCc && (
                <FieldRow label="Cc">
                  <input value={cc} onChange={e => setCc(e.target.value)} placeholder="Cc..." style={fieldInputStyle} />
                  <button onClick={() => { setShowCc(false); setCc(''); }} style={ccBtnStyle}><X size={11} /></button>
                </FieldRow>
              )}

              {showBcc && (
                <FieldRow label="Bcc">
                  <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="Bcc..." style={fieldInputStyle} />
                  <button onClick={() => { setShowBcc(false); setBcc(''); }} style={ccBtnStyle}><X size={11} /></button>
                </FieldRow>
              )}

              {/* Subject */}
              <FieldRow label="Subject" last>
                <input
                  id="compose-subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject line..."
                  style={{ ...fieldInputStyle, fontWeight: 700 }}
                />
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowPriorityMenu(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 8, border: `1px solid ${prColor}40`,
                      background: prBg, color: prColor,
                      fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <AlertCircle size={11} />
                    {prLabel}
                    <ChevronDown size={10} />
                  </button>
                  {showPriorityMenu && (
                    <div style={{
                      position: 'absolute', right: 0, top: '110%', zIndex: 10,
                      background: '#0a1636', border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: 10, overflow: 'hidden', minWidth: 110,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}>
                      {(Object.keys(priorityConfig) as Priority[]).map(p => (
                        <button
                          key={p}
                          onClick={() => { setPriority(p); setShowPriorityMenu(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            width: '100%', padding: '8px 12px',
                            background: priority === p ? priorityConfig[p].bg : 'transparent',
                            border: 'none', cursor: 'pointer',
                            color: priorityConfig[p].color,
                            fontSize: 11, fontWeight: 600, textAlign: 'left',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityConfig[p].color, flexShrink: 0 }} />
                          {priorityConfig[p].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </FieldRow>
            </div>

            {/* Formatting toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              padding: '5px 1.1rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {[
                { icon: <Bold size={13} />, cmd: 'bold', title: 'Bold' },
                { icon: <Italic size={13} />, cmd: 'italic', title: 'Italic' },
                { icon: <Underline size={13} />, cmd: 'underline', title: 'Underline' },
              ].map(({ icon, cmd, title }) => (
                <button key={cmd} onClick={() => execFormat(cmd)} title={title} style={toolbarBtnStyle}>
                  {icon}
                </button>
              ))}
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <button onClick={() => execFormat('insertUnorderedList')} title="Bullet list" style={toolbarBtnStyle}>
                <List size={13} />
              </button>
              <button title="Insert link" style={toolbarBtnStyle}>
                <Link2 size={13} />
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={() => fileRef.current?.click()} title="Attach file" style={toolbarBtnStyle}>
                <Paperclip size={13} />
              </button>
              <input ref={fileRef} type="file" multiple hidden onChange={handleAttach} />
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <textarea
                ref={bodyRef}
                id="compose-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your email body message here..."
                style={{
                  flex: 1,
                  resize: 'none',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#cbd5e1',
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  padding: '0.85rem 1.1rem',
                  fontFamily: 'inherit',
                  minHeight: 160,
                }}
              />

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 1.1rem 0.5rem' }}>
                  {attachments.map((name, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px', borderRadius: 999,
                        background: 'rgba(212,175,55,0.12)',
                        border: '1px solid rgba(212,175,55,0.3)',
                        color: '#e6c687', fontSize: 10, fontWeight: 600,
                      }}
                    >
                      <Paperclip size={9} />
                      {name}
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div style={{ padding: '6px 1.1rem', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 11, fontWeight: 600, borderTop: '1px solid rgba(239,68,68,0.3)' }}>
                {errorMessage}
              </div>
            )}

            {/* Footer / Send bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.65rem 1.1rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(5,11,30,0.8)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  id="compose-send-btn"
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', borderRadius: 10,
                    background: sent
                      ? 'linear-gradient(135deg,#16a34a,#15803d)'
                      : canSend
                        ? 'linear-gradient(135deg,#d4af37,#b38728)'
                        : 'rgba(212,175,55,0.2)',
                    border: 'none',
                    color: canSend || sent ? '#0f172a' : '#475569',
                    fontSize: 12, fontWeight: 900, cursor: canSend ? 'pointer' : 'not-allowed',
                    boxShadow: canSend && !sent ? '0 4px 14px rgba(212,175,55,0.3)' : 'none',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {sending ? (
                    <>
                      <RefreshCw size={12} className="animate-spin text-slate-900" />
                      Sending...
                    </>
                  ) : sent ? (
                    <>✓ Message Sent!</>
                  ) : (
                    <><Send size={12} strokeWidth={2.5} /> Dispatch Mail</>
                  )}
                </button>

                {!sent && (
                  <button
                    onClick={handleClose}
                    style={{
                      padding: '8px 12px', borderRadius: 10,
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                    className="hover:border-red-500/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} /> Discard
                  </button>
                )}
              </div>

              <span style={{ fontSize: 10, color: charCount > 4000 ? '#f87171' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                {charCount.toLocaleString()} chars
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Shared Sub-components ────────────────────────────────── */
function FieldRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 44, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

const fieldInputStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: '#f8fafc', fontSize: 12, fontFamily: 'inherit',
};

const ccBtnStyle: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 6,
  background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)',
  color: '#e6c687', fontSize: 10, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 3,
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '4px 6px', borderRadius: 6,
  background: 'transparent', border: 'none',
  color: '#94a3b8', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

/* ─── Main Page Component ─────────────────────────────────── */
export default function AdminMailsPage() {
  const [adminRole, setAdminRole] = useState('');
  const [selectedMail, setSelectedMail] = useState<number>(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [mails, setMails] = useState<MailItem[]>(fallbackMails);
  const [loadingMails, setLoadingMails] = useState(false);
  const [mailError, setMailError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  const isViewer = useMemo(() => isViewerOnly(adminRole) || adminRole.toLowerCase() === 'viewer', [adminRole]);

  const currentMail = useMemo(() => {
    return mails.find(m => m.id === selectedMail) || mails[0] || fallbackMails[0];
  }, [mails, selectedMail]);

  const loadMailsData = (silent = false) => {
    if (!silent) setLoadingMails(true);

    proxy.get('/api/admin/mails')
      .then((response) => {
        const apiMails = Array.isArray(response.data?.messages) ? response.data.messages : [];
        const normalized: MailItem[] = apiMails.map((mail: any, index: number) => ({
          id: Number(mail.id || index + 1),
          sender: Array.isArray(mail.to) && mail.to.length ? mail.to[0] : 'Admin Mail',
          subject: mail.subject || 'No subject',
          snippet: (mail.body || '').slice(0, 120) || 'No message body',
          time: mail.sent_at || mail.created_at || 'Just now',
          unread: mail.status !== 'sent',
        }));
        setMails(normalized.length ? normalized : fallbackMails);
        setSelectedMail((current) => {
          if (normalized.some((mail: MailItem) => mail.id === current)) {
            return current;
          }
          return normalized[0]?.id ?? fallbackMails[0].id;
        });
        setMailError('');
      })
      .catch((err) => {
        setMailError(err?.message || 'Unable to load mail messages');
        setMails(fallbackMails);
      })
      .finally(() => {
        setLoadingMails(false);
      });
  };

  useEffect(() => {
    loadMailsData();
  }, []);

  const filteredMails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mails;
    return mails.filter(
      (m) =>
        m.sender.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q)
    );
  }, [mails, searchQuery]);

  const getInitials = (name: string) => {
    if (!name || name === '-') return 'ML';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleSendReply = () => {
    if (!replyText.trim() || replySending || isViewer) return;
    setReplySending(true);

    proxy.post('/api/admin/mails', {
      to: [currentMail.sender],
      subject: `Re: ${currentMail.subject}`,
      body: replyText,
      send_now: true,
    })
      .then(() => {
        setReplyText('');
        showToast('Reply dispatched successfully!', 'success');
        loadMailsData(true);
      })
      .catch((err) => {
        showToast(err?.message || 'Failed to dispatch reply', 'error');
      })
      .finally(() => {
        setReplySending(false);
      });
  };

  return (
    <>
      <Head>
        <title>Mails &amp; Messages | Admin Portal</title>
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
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#e6c687] text-[9px] font-black uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" /> Internal Messaging Hub
                </div>
                <h1 className="text-lg font-black tracking-tight text-white uppercase">
                  Admin Communication Inbox
                </h1>
                <p className="text-[11px] text-slate-400">
                  Manage corporate broadcasts, user inquiries, and queued SMTP email dispatches.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadMailsData()}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all hover:border-[#d4af37]/40"
              >
                <RefreshCw size={13} className={loadingMails ? "animate-spin text-[#d4af37]" : ""} />
                <span>Sync Mail</span>
              </button>

              {!isViewer && (
                <button
                  id="compose-mail-btn"
                  onClick={() => setComposeOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-gold-glow active:scale-95 shrink-0"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  Compose Mail
                </button>
              )}
            </div>
          </div>

          {/* MAIN MAIL CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 sm:p-4 shadow-xl min-h-[480px]">
            
            {/* MAIL LIST SIDEBAR */}
            <div className="lg:border-r border-white/10 lg:pr-3 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search inbox..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {loadingMails && (
                <div className="text-[11px] font-semibold text-slate-400 px-1 py-2 flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin text-[#d4af37]" /> Syncing messages...
                </div>
              )}

              {mailError && (
                <div className="text-[11px] text-red-400 font-semibold px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  {mailError}
                </div>
              )}

              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {filteredMails.length === 0 && !loadingMails && (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    <Inbox className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                    No emails match search criteria.
                  </div>
                )}

                {filteredMails.map((m) => {
                  const isSelected = selectedMail === m.id;
                  const initials = getInitials(m.sender);

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMail(m.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-slate-800/90 border-[#d4af37]/50 shadow-md'
                          : 'bg-slate-950/40 border-white/5 hover:bg-slate-800/50 hover:border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-slate-200 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-300 text-[9px] shrink-0">
                            {initials}
                          </div>
                          {m.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse shrink-0" />}
                          <span className="truncate max-w-[120px]">{m.sender}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{m.time}</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-100 truncate mb-0.5">{m.subject}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{m.snippet}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MAIL DETAIL VIEW */}
            <div className="lg:col-span-2 lg:pl-3 flex flex-col justify-between">
              {currentMail ? (
                <>
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                      <div>
                        <h2 className="text-base font-bold text-white tracking-tight">{currentMail.subject}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">From:</span>
                          <span className="text-xs text-[#d4af37] font-bold font-mono">{currentMail.sender}</span>
                          <span className="text-[10px] text-slate-500 font-mono ml-2">• {currentMail.time}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400">
                        <button className="p-1.5 hover:bg-slate-800 hover:text-[#d4af37] rounded-lg transition-colors" title="Bookmark">
                          <Star size={15} />
                        </button>
                        <button className="p-1.5 hover:bg-slate-800 hover:text-red-400 rounded-lg transition-colors" title="Delete email">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 space-y-3 leading-relaxed p-4 rounded-xl bg-slate-950/60 border border-white/5">
                      <p>{currentMail.snippet}</p>
                      <p className="text-slate-400">
                        This communication was dispatched via the VTIndex secure SMTP mail relay. Please ensure response protocols are followed.
                      </p>
                      <div className="pt-4 text-slate-500 font-mono text-[11px] border-t border-white/5">
                        Regards,<br />
                        <span className="text-slate-300 font-bold">{currentMail.sender}</span>
                      </div>
                    </div>
                  </div>

                  {/* REPLY BAR */}
                  <div className="mt-6 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-white/10 focus-within:border-[#d4af37]/50 transition-all">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={isViewer || replySending}
                        placeholder={isViewer ? "Viewer mode: reply restricted..." : `Quick reply to ${currentMail.sender}...`}
                        className="bg-transparent border-none text-xs text-white outline-none flex-1 px-2 placeholder:text-slate-500 disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                      />
                      {!isViewer && (
                        <button 
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || replySending}
                          className="bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 font-black p-2 rounded-lg transition-all hover:shadow-gold-glow disabled:opacity-50"
                        >
                          {replySending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Mail className="w-10 h-10 mb-2 text-slate-600" />
                  Select an email from the inbox to read.
                </div>
              )}
            </div>

          </div>

        </div>

        {/* COMPOSE MODAL (Hidden for Viewer) */}
        {composeOpen && !isViewer && (
          <ComposeModal onClose={() => setComposeOpen(false)} onSent={() => loadMailsData(true)} />
        )}

        {/* TOAST CONTAINER */}
        {toast && (
          <div className="fixed top-20 right-8 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`w-auto max-w-sm px-5 py-4 rounded-2xl flex items-start gap-3 border shadow-2xl backdrop-blur-xl ${
              toast.variant === 'error' 
                ? 'bg-red-950/90 border-red-500/60 text-red-100 shadow-red-500/20' 
                : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-500/20'
            }`}>
              {toast.variant === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="text-xs font-black uppercase tracking-wider mb-0.5">
                  {toast.variant === 'error' ? 'Dispatch Error' : 'Success'}
                </div>
                <div className="text-xs font-medium text-slate-200">{toast.message}</div>
              </div>
              <button 
                type="button" 
                onClick={() => setToast(null)} 
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
