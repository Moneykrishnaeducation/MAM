import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import {
  Mail, Search, Send, Star, Inbox, Trash2, X, ChevronDown,
  Bold, Italic, Underline, List, Link2, Paperclip, AlertCircle,
  Plus, Minimize2, Maximize2, RotateCcw,
} from 'lucide-react';

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
const mails: MailItem[] = [
  { id: 1, sender: 'Alex Rivera', subject: 'Inquiry regarding Course Valuation module', snippet: 'Hello Admin, I had a quick question regarding module 4 access...', time: '10:45 AM', unread: true },
  { id: 2, sender: 'Apex Education Ventures', subject: 'Q3 Financial Distribution Report', snippet: 'Attached is the quarterly investment summary for review...', time: 'Yesterday', unread: true },
  { id: 3, sender: 'System Audit Bot', subject: 'Weekly Automated Backup Status: Success', snippet: 'All database tables successfully backed up to cloud storage...', time: 'Jul 29', unread: false },
];

/* ─── Compose Modal ──────────────────────────────────────── */
interface ComposeModalProps {
  onClose: () => void;
}

function ComposeModal({ onClose }: ComposeModalProps) {
  const [to, setTo] = useState('');
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
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
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

  function handleSend() {
    if (!to.trim() || !subject.trim()) return;
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); }, 1800);
    setTimeout(() => handleClose(), 3000);
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
  const canSend = to.trim() && subject.trim() && !sending && !sent;

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        padding: '1.5rem',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.28s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Modal window */}
      <div
        ref={modalRef}
        style={{
          width: '100%', maxWidth: 580,
          borderRadius: '1.5rem',
          background: 'linear-gradient(155deg, #0d1f4e 0%, #0b1a40 60%, #091535 100%)',
          border: '1px solid rgba(59,130,246,0.22)',
          boxShadow: '0 32px 80px -16px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
          transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1)',
          maxHeight: minimised ? 60 : 640,
          transition2: 'max-height 0.3s ease',
        } as React.CSSProperties}
      >
        {/* ── Header bar ── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.85rem 1.1rem',
            background: 'linear-gradient(90deg, rgba(37,99,235,0.18), rgba(30,64,175,0.1))',
            borderBottom: minimised ? 'none' : '1px solid rgba(59,130,246,0.15)',
            cursor: minimised ? 'pointer' : 'default',
            userSelect: 'none',
          }}
          onClick={() => minimised && setMinimised(false)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg,rgba(59,130,246,0.3),rgba(37,99,235,0.2))',
              border: '1px solid rgba(59,130,246,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Send size={13} style={{ color: '#93c5fd' }} />
            </div>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>
              New Message
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
              style={{ padding: '5px 7px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              className="hover:bg-slate-800 transition-colors"
              title={minimised ? 'Expand' : 'Minimise'}
            >
              {minimised ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button
              onClick={handleClose}
              style={{ padding: '5px 7px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              className="hover:bg-slate-800 hover:text-red-400 transition-colors"
              title="Discard"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {!minimised && (
          <>
            {/* ── Address fields ── */}
            <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '0 1.1rem' }}>
              {/* To */}
              <FieldRow label="To">
                <input
                  id="compose-to"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="Recipients…"
                  style={fieldInputStyle}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  {!showCc && (
                    <button onClick={() => setShowCc(true)} style={ccBtnStyle}>Cc</button>
                  )}
                  {!showBcc && (
                    <button onClick={() => setShowBcc(true)} style={ccBtnStyle}>Bcc</button>
                  )}
                </div>
              </FieldRow>

              {/* Cc */}
              {showCc && (
                <FieldRow label="Cc">
                  <input value={cc} onChange={e => setCc(e.target.value)} placeholder="Cc…" style={fieldInputStyle} />
                  <button onClick={() => { setShowCc(false); setCc(''); }} style={ccBtnStyle}><X size={11} /></button>
                </FieldRow>
              )}

              {/* Bcc */}
              {showBcc && (
                <FieldRow label="Bcc">
                  <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="Bcc…" style={fieldInputStyle} />
                  <button onClick={() => { setShowBcc(false); setBcc(''); }} style={ccBtnStyle}><X size={11} /></button>
                </FieldRow>
              )}

              {/* Subject */}
              <FieldRow label="Subject" last>
                <input
                  id="compose-subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject…"
                  style={{ ...fieldInputStyle, fontWeight: 600 }}
                />
                {/* Priority picker */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowPriorityMenu(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 9px', borderRadius: 8, border: `1px solid ${prColor}40`,
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
                      background: '#0f2060', border: '1px solid rgba(59,130,246,0.25)',
                      borderRadius: 10, overflow: 'hidden', minWidth: 110,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
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

            {/* ── Formatting toolbar ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              padding: '6px 1.1rem',
              borderBottom: '1px solid rgba(59,130,246,0.08)',
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
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
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

            {/* ── Body ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <textarea
                ref={bodyRef}
                id="compose-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message here…"
                style={{
                  flex: 1,
                  resize: 'none',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#cbd5e1',
                  fontSize: 13,
                  lineHeight: 1.7,
                  padding: '1rem 1.1rem',
                  fontFamily: 'inherit',
                  minHeight: 180,
                }}
              />

              {/* Attachments chips */}
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 1.1rem 0.6rem' }}>
                  {attachments.map((name, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 9px', borderRadius: 999,
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.25)',
                        color: '#93c5fd', fontSize: 10, fontWeight: 600,
                      }}
                    >
                      <Paperclip size={9} />
                      {name}
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, lineHeight: 1 }}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer / Send bar ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1.1rem',
              borderTop: '1px solid rgba(59,130,246,0.1)',
              background: 'rgba(9,21,53,0.6)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Send button */}
                <button
                  id="compose-send-btn"
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 20px', borderRadius: 12,
                    background: sent
                      ? 'linear-gradient(135deg,#16a34a,#15803d)'
                      : canSend
                        ? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
                        : 'rgba(37,99,235,0.25)',
                    border: 'none',
                    color: canSend || sent ? '#fff' : '#475569',
                    fontSize: 12, fontWeight: 700, cursor: canSend ? 'pointer' : 'not-allowed',
                    boxShadow: canSend && !sent ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                    transition: 'all 0.25s ease',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* shimmer sweep on hover handled via inline onMouseEnter/Leave */}
                  {sending ? (
                    <>
                      <span style={{
                        width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite', display: 'inline-block',
                      }} />
                      Sending…
                    </>
                  ) : sent ? (
                    <>✓ Sent!</>
                  ) : (
                    <><Send size={13} strokeWidth={2.5} /> Send</>
                  )}
                </button>

                {/* Discard button */}
                {!sent && (
                  <button
                    onClick={handleClose}
                    style={{
                      padding: '9px 14px', borderRadius: 12,
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#64748b', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    className="hover:border-red-500/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} /> Discard
                  </button>
                )}
              </div>

              {/* Char count */}
              <span style={{ fontSize: 10, color: charCount > 4000 ? '#f87171' : '#475569', fontVariantNumeric: 'tabular-nums' }}>
                {charCount.toLocaleString()} chars
              </span>
            </div>

            {/* Sending shimmer bar */}
            {sending && (
              <div style={{ height: 2, background: 'rgba(37,99,235,0.15)', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg,transparent,#3b82f6,transparent)',
                  animation: 'shimmerBar 1.2s ease-in-out infinite',
                }} />
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmerBar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .hover\\:bg-slate-800:hover { background: rgba(30,41,59,0.7) !important; }
        .hover\\:border-red-500\\/30:hover { border-color: rgba(239,68,68,0.3) !important; }
        .hover\\:text-red-400:hover { color: #f87171 !important; }
        .transition-colors { transition: color 0.2s, background 0.2s, border-color 0.2s; }
      `}</style>
    </div>
  );
}

/* ── Shared sub-components ────────────────────────────────── */
function FieldRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px solid rgba(59,130,246,0.08)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', width: 46, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

const fieldInputStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit',
};

const ccBtnStyle: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 6,
  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
  color: '#60a5fa', fontSize: 10, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 3,
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '5px 7px', borderRadius: 7,
  background: 'transparent', border: 'none',
  color: '#64748b', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s, color 0.15s',
};

/* ─── Main page ──────────────────────────────────────────── */
export default function AdminMailsPage() {
  const [selectedMail, setSelectedMail] = useState<number>(1);
  const [composeOpen, setComposeOpen] = useState(false);

  const currentMail = mails.find(m => m.id === selectedMail) || mails[0];

  return (
    <>
      <Head>
        <title>Mails &amp; Messages | Admin Portal</title>
      </Head>

      <div className="p-6 md:p-8 flex-1 flex flex-col">
        {/* ── Page header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <Mail size={13} /> Internal Communications
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Inbox</h1>
            <p className="text-slate-400 text-sm mt-1">Manage incoming inquiries, user messages, and system notifications.</p>
          </div>

          <button
            id="compose-mail-btn"
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto"
          >
            <Plus size={15} strokeWidth={2.5} />
            Compose Mail
          </button>
        </div>

        {/* ── Mail panel ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl min-h-[500px]">
          {/* Mail List */}
          <div className="border-r border-slate-800 pr-4 space-y-2">
            <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50 mb-4">
              <Search size={15} className="text-slate-400" />
              <input type="text" placeholder="Search emails..." className="bg-transparent border-none text-xs text-white outline-none w-full" />
            </div>

            {mails.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMail(m.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all ${
                  selectedMail === m.id
                    ? 'bg-blue-600/15 border border-blue-500/40'
                    : 'bg-slate-800/40 border border-slate-800/80 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    {m.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                    {m.sender}
                  </span>
                  <span className="text-[11px] text-slate-400">{m.time}</span>
                </div>
                <h4 className="text-xs font-semibold text-blue-400 truncate mb-1">{m.subject}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">{m.snippet}</p>
              </div>
            ))}
          </div>

          {/* Mail Detail */}
          <div className="lg:col-span-2 pl-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">{currentMail.subject}</h2>
                  <p className="text-xs text-slate-400">From: <span className="text-slate-200 font-semibold">{currentMail.sender}</span></p>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <button className="p-2 hover:bg-slate-800 rounded-xl"><Star size={16} /></button>
                  <button className="p-2 hover:bg-slate-800 hover:text-red-400 rounded-xl"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>{currentMail.snippet}</p>
                <p>Please review the details and let us know if additional documentation or authorization is required.</p>
                <p className="text-slate-400 mt-6">Best regards,<br />{currentMail.sender}</p>
              </div>
            </div>

            {/* Reply box */}
            <div className="mt-8 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                <input
                  type="text"
                  placeholder={`Reply to ${currentMail.sender}…`}
                  className="bg-transparent border-none text-xs text-white outline-none flex-1"
                />
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compose modal ── */}
      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} />}
    </>
  );
}
