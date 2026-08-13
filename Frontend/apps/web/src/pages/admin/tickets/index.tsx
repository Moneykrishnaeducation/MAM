import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  FileText, 
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  RefreshCw,
  X,
  Plus
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

type TicketStatus = 'Open' | 'Pending' | 'Closed';
type TicketTabFilter = 'open' | 'pending' | 'closed';

interface TicketAttachment {
  id: string;
  name?: string;
  file?: string;
  file_url?: string;
}

interface AdminTicket {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: TicketStatus;
  description: string | null;
  date: string | null;
  attachments: TicketAttachment[];
  messages?: any[];
  user_id: string;
  user_name: string;
  user_email: string;
}

interface TicketsSummary {
  total_tickets: number;
  open_count: number;
  pending_count: number;
  closed_count: number;
}

function getAdminRole(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find((row) => row.startsWith('role='));
  return match ? decodeURIComponent(match.split('=')[1] || '').trim() : '';
}

function isViewerOnly(role: string): boolean {
  return role.toLowerCase() === 'viewer';
}

const getMessagePreview = (message: any) => {
  if (!message) return "";
  const text = typeof message.content === "string" ? message.content.trim() : "";
  if (text) return text;
  if (message.file) {
    const fileName = message.file.split("/").pop() || "Attachment";
    return `[Attachment] ${fileName}`;
  }
  return "No content";
};

const getTicketPreview = (ticket: AdminTicket) => {
  if (!ticket) return "";
  const description = typeof ticket.description === "string" ? ticket.description.trim() : "";
  if (description) return description;
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const latestMessage = messages[messages.length - 1];
  if (latestMessage) return getMessagePreview(latestMessage);
  return "No description provided.";
};

const TicketModal = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
    <div
      className="bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] rounded-[2.5rem] shadow-[0_30px_80px_rgba(4,15,54,0.45)] w-full max-w-2xl overflow-hidden border border-[#2450b7] text-white animate-in zoom-in-95 duration-200"
    >
      <div className="flex items-center justify-between p-8 border-b border-[#1745b3]">
        <h3 className="text-xl md:text-2xl font-black tracking-tighter uppercase text-white">
          {title}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-[#1845af] rounded-full transition-colors text-[#8fb8ff] hover:text-white" type="button">
          <X size={24} />
        </button>
      </div>
      <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);


export default function AdminTicketsPage() {
  const [adminRole, setAdminRole] = useState('');
  const [activeTab, setActiveTab] = useState<TicketTabFilter>('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [summary, setSummary] = useState<TicketsSummary>({
    total_tickets: 0,
    open_count: 0,
    pending_count: 0,
    closed_count: 0,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);

  // Reply state
  const [replyMessage, setReplyMessage] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  const isViewer = useMemo(() => isViewerOnly(adminRole), [adminRole]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', activeTab);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      params.append('page', String(page));
      params.append('per_page', String(perPage));

      const res = await fetch(`/api/admin/tickets?${params.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.message || 'Failed to load support tickets');

      setTickets(data?.tickets || []);
      if (data?.summary) setSummary(data.summary);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.total_pages ?? 1);
    } catch (err: any) {
      sonnerToast.error(err.message || 'Error fetching tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, searchTerm, page, perPage]);

  const handleUpdateStatus = async (ticketId: number, newStatus: TicketStatus) => {
    if (isViewer) {
      sonnerToast.error('Viewer accounts do not have permission to modify ticket status.');
      return;
    }
    setStatusUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update ticket status');

      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)));
      if (selectedTicket?.id === ticketId) setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      void fetchTickets();
    } catch (err: any) {
      sonnerToast.error(err.message || 'Error updating status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || (!replyMessage.trim() && !replyFile)) return;
    if (isViewer) return sonnerToast.error('Viewer accounts do not have permission to send messages.');
    
    setReplyLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", replyMessage);
      if (replyFile) formData.append("documents", replyFile);
      
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/message`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to send message");

      const newMessage = data.new_message;
      setSelectedTicket((prev) => prev ? { ...prev, messages: [...(prev.messages || []), newMessage] } : prev);
      setTickets((prev) => prev.map(t => t.id === selectedTicket.id ? { ...t, messages: [...(t.messages || []), newMessage] } : t));
      
      setReplyMessage("");
      setReplyFile(null);
      sonnerToast.success("Message sent successfully!");
    } catch (err: any) {
      sonnerToast.error(err.message || "Error sending message");
    } finally {
      setReplyLoading(false);
    }
  };


  return (
    <>
      <Head>
        <title>Tickets Directory | Admin Portal</title>
      </Head>

      <div className="w-full min-h-screen bg-[#0c1c59] text-white font-sans antialiased relative overflow-hidden">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-8 relative z-10 space-y-6 md:space-y-8">
          
          {/* HEADER ROW WITH TABS AND SEARCH */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2450b7] pb-6">
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#081d5f] w-full md:w-fit border border-[#2450b7] shadow-[0_20px_60px_rgba(4,15,54,0.2)]">
              {(['open', 'pending', 'closed'] as TicketTabFilter[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center justify-center gap-2 md:gap-3 px-4 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all duration-300 ${
                    activeTab === tab
                      ? "bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-xl shadow-[#d4af37]/20 scale-[1.02] flex-1 md:flex-none"
                      : "text-[#8fb8ff] hover:text-white hover:bg-[#123283] flex-none"
                  }`}
                >
                  {tab === "open" && <Clock size={14} />}
                  {tab === "pending" && <MessageSquare size={14} />}
                  {tab === "closed" && <CheckCircle size={14} />}
                  <span className={activeTab === tab ? "inline" : "hidden md:inline"}>
                    {tab === 'open' ? 'Open' : tab}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d4af37] transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search Ticket ID or Subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#2450b7] bg-[#081d5f] text-white outline-none focus:border-[#d4af37] transition-all font-bold text-sm shadow-sm placeholder:text-[#8fb8ff]/60"
              />
            </div>
          </div>

          {/* MAIN TABLE CONTAINER */}
          <div className="bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] border border-[#2450b7] rounded-[2.5rem] shadow-[0_30px_80px_rgba(4,15,54,0.25)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <FileText size={160} className="text-[#d4af37]" />
            </div>

            <div className="relative z-10">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#081d5f]">
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Timestamp</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Identity</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Subject</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Status</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Preview</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2450b7]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-20 text-center">
                          <div className="w-12 h-12 border-4 border-white/10 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-4" />
                          <p className="font-black uppercase text-xs tracking-widest text-[#8fb8ff]">Synchronizing channels...</p>
                        </td>
                      </tr>
                    ) : tickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-24 text-center opacity-60">
                          <div className="w-20 h-20 bg-[#081d5f] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2450b7]">
                            <Search className="text-[#8fb8ff]" size={32} />
                          </div>
                          <p className="text-2xl font-black uppercase tracking-tighter mb-2 text-white">No Records Found</p>
                          <p className="text-xs text-[#8fb8ff] font-bold uppercase tracking-widest">System standby — awaiting inquiries</p>
                        </td>
                      </tr>
                    ) : (
                      tickets.map((ticket, i) => {
                        const status = (ticket.status || "Open").toLowerCase();
                        const statusStyle = 
                          status === "open" ? "bg-blue-500/10 text-blue-500" : 
                          status === "pending" ? "bg-[#d4af37]/10 text-[#d4af37]" : 
                          "bg-emerald-500/10 text-emerald-500";

                        return (
                          <tr key={ticket.id} className="group hover:bg-white/5 transition-colors">
                            <td className="px-8 py-6">
                              <p className="font-black text-sm text-white">{ticket.date || 'N/A'}</p>
                            </td>
                            <td className="px-8 py-6">
                              <span className="font-bold block text-white">{ticket.user_name || "Anonymous"}</span>
                              <span className="text-[10px] font-black text-[#d4af37] uppercase tracking-tighter">UID: {ticket.user_id || "N/A"}</span>
                            </td>
                            <td className="px-8 py-6">
                              <span className="font-bold block truncate max-w-[150px] text-white">
                                {ticket.subject}
                              </span>
                              <span className="text-[10px] font-mono text-[#8fb8ff]">#TID-{ticket.id}</span>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusStyle}`}>
                                {status === 'open' ? 'Waiting' : status}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-xs font-medium truncate max-w-[200px] text-[#8fb8ff]">
                                {getTicketPreview(ticket)}
                              </p>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button
                                onClick={() => setSelectedTicket(ticket)}
                                className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-[#081d5f] text-white hover:bg-[#123283] transition-all duration-300 shadow-lg shadow-blue-900/20 border border-[#2450b7]"
                              >
                                Access
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="p-6 md:p-8 bg-[#081d5f] border-t border-[#2450b7] flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">
                    Entries <span className="text-white">{tickets.length}</span> of <span className="text-white">{total}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Rows</span>
                    <select
                      value={perPage}
                      onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                      className="bg-[#081d5f] border border-[#2450b7] rounded-lg px-2 py-1 text-[10px] font-black text-[#d4af37] outline-none"
                    >
                      {[10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-3 rounded-xl border border-[#2450b7] hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-[#081d5f] text-[#8fb8ff]"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="px-4 font-black text-[#8fb8ff] text-xs">
                    PAGE {page} OF {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-3 rounded-xl border border-[#2450b7] hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-[#081d5f] text-[#8fb8ff]"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {selectedTicket && (
        <TicketModal title={`TID-${selectedTicket.id} | ${selectedTicket.subject}`} onClose={() => { setSelectedTicket(null); setReplyMessage(""); setReplyFile(null); }}>
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-[#081d5f] p-6 rounded-3xl border border-[#2450b7] shadow-[0_20px_60px_rgba(4,15,54,0.18)]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] mb-1">Status</p>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                  (selectedTicket.status || "").toLowerCase() === "open" ? "bg-blue-500/10 text-blue-300" : 
                  (selectedTicket.status || "").toLowerCase() === "pending" ? "bg-amber-500/10 text-amber-500" : 
                  "bg-emerald-500/10 text-emerald-500"
                }`}>
                  {selectedTicket.status || "Open"}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] mb-1">Client</p>
                <p className="font-bold text-sm truncate text-white">{selectedTicket.user_name || "System"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] mb-1">Created</p>
                <p className="font-bold text-sm text-white">{selectedTicket.date || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] mb-1">Category</p>
                <p className="font-bold text-sm uppercase text-white">{selectedTicket.category || "General"}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] mb-3 ml-2">Original Inquiry</p>
              <div className="p-6 rounded-[2rem] bg-[#081d5f] border border-[#2450b7]">
                <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-white">
                  {selectedTicket.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* MESSAGES */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] mb-3 ml-2">Message History</p>
              {Array.isArray(selectedTicket.messages) && selectedTicket.messages.length > 0 ? (
                <div 
                  className="flex flex-col gap-3 p-6 rounded-[2rem] border border-[#202c33] bg-[#0b141a] max-h-[450px] overflow-y-auto custom-scrollbar"
                  style={{
                    backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                  }}
                >
                  {selectedTicket.messages.map((msg: any, idx: number) => {
                    const isAdmin = msg.sender === 'admin';
                    const date = msg.created_at ? new Date(msg.created_at) : null;
                    const timeString = date && !isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                    
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex w-full ${isAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 shadow-md relative ${
                            isAdmin
                              ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                              : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                          }`}
                        >
                          {!isAdmin && (
                            <span className="text-xs font-bold text-[#53bdeb] block mb-1">
                              {msg.sender_name || "User"}
                            </span>
                          )}
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-12">
                            {msg.content || ""}
                          </div>
                          
                          {msg.file && (
                            <div className="mt-2 bg-[#111b21] hover:bg-[#182229] transition-colors p-2.5 rounded-lg border border-white/5 flex items-center justify-between gap-3 cursor-pointer" onClick={() => window.open(msg.file, '_blank')}>
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={18} className="text-[#00a884] shrink-0" />
                                <span className="text-xs font-semibold truncate text-[#e9edef] max-w-[150px]">
                                  {msg.file.split("/").pop() || "Document"}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute bottom-1 right-2 flex items-center gap-1">
                            <span className="text-[10px] text-[#8696a0] font-medium leading-none">
                              {timeString}
                            </span>
                            {isAdmin && (
                              <span className="text-[#53bdeb] text-xs font-bold leading-none select-none">
                                ✓✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-[2rem] border border-dashed border-[#2450b7] bg-[#081d5f] text-[#8fb8ff] text-sm font-medium">
                  No messages found for this ticket.
                </div>
              )}
            </div>

            {/* SECURE ATTACHMENTS */}
            {Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff] mb-3 ml-2">Secure Attachments</p>
                <div className="flex flex-wrap gap-4 p-4 rounded-[2rem] border border-[#2450b7] bg-[#081d5f]">
                  {selectedTicket.attachments.map((att: any, idx: number) => {
                    const fileUrl = att.file_url || att.file || '';
                    if (!fileUrl) return null;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
                    return (
                      <div key={att.id || idx} className="group relative">
                        {isImage ? (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="block w-24 h-24 rounded-xl overflow-hidden border border-[#2450b7] hover:border-[#d4af37] transition-all shadow-lg">
                            <img src={fileUrl} alt={att.name || 'Attachment'} className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center w-24 h-24 rounded-xl border border-[#2450b7] hover:border-[#d4af37] transition-all shadow-lg bg-[#040f33]">
                            <FileText className="text-[#d4af37] mb-2" size={20} />
                            <span className="text-[9px] font-black uppercase tracking-tighter text-[#8fb8ff] text-center px-2 truncate w-full">
                              {att.name || 'Document'}
                            </span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            {!isViewer && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#1745b3]">
                {selectedTicket.status === "Open" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, "Pending")}
                    className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-[#081d5f] text-[#8fb8ff] border border-[#2450b7] shadow-xl hover:bg-[#123283] hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Clock size={16} /> Mark as In-Progress
                  </button>
                )}
                {selectedTicket.status !== "Closed" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, "Closed")}
                    className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-xl shadow-[#d4af37]/20 hover:brightness-105 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} /> Resolve & Close
                  </button>
                )}
                {selectedTicket.status === "Closed" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, "Open")}
                    className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-[#081d5f] text-[#8fb8ff] border border-[#2450b7] shadow-xl hover:bg-[#123283] hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} /> Reopen Ticket
                  </button>
                )}
              </div>
            )}

            {/* REPLY SECTION */}
            {!isViewer && (
              <div className="space-y-4 pt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] mb-3 ml-2">Official Channel Communication</p>
                <div className="relative">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Compose a secure response to the client..."
                    rows={4}
                    className="w-full p-6 pb-12 rounded-[2rem] border border-[#2450b7] bg-[#081d5f] text-white outline-none focus:border-[#d4af37] transition-all font-medium text-sm shadow-inner placeholder:text-[#8fb8ff]/60 custom-scrollbar"
                  />
                  <div className="absolute bottom-4 left-6 flex items-center gap-2">
                    <input type="file" ref={fileInputRef} hidden onChange={(e) => setReplyFile(e.target.files?.[0] || null)} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#8fb8ff] transition-colors border border-white/5">
                      <Plus size={14} /> {replyFile ? replyFile.name : "Attach File"}
                    </button>
                    {replyFile && (
                      <button onClick={() => setReplyFile(null)} className="text-red-400 hover:text-red-300 p-1"><X size={14}/></button>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={(!replyMessage.trim() && !replyFile) || replyLoading}
                  className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-900 bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] border border-[#d4af37]/30 shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {replyLoading ? "Transmitting..." : "Send Secure Message"}
                </button>
              </div>
            )}
          </div>
        </TicketModal>
      )}
    </>
  );
}
