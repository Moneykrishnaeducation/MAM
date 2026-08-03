import React, { useState, useEffect, useRef } from "react";
import { Search, Filter, X, Plus, ChevronDown, FileText } from "lucide-react";
import { useTheme } from 'next-themes';
import { fetchClientTickets } from '@/lib/apiClient';

type TicketMessage = {
  id: string;
  content?: string;
  sender_name?: string;
  sender?: { username?: string } | string;
  created_at?: string | null;
  createdAt?: string | null;
  file?: string | null;
  file_url?: string | null;
};

type TicketAttachment = {
  id: string;
  file?: string | null;
  file_url?: string | null;
};

type ClientTicketApi = {
  id: number | string;
  subject?: string | null;
  priority?: string | null;
  status?: string | null;
  date?: string | null;
};

interface Ticket {
  id: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
  created_by: string;
  description: string;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  _normalizedMessages?: TicketMessage[];
  _normalizedAttachments?: TicketAttachment[];
}

const toAbsoluteUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return url.startsWith('http') ? url : url;
};

const toIsoDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const normalizeTicket = (ticket: ClientTicketApi, index: number, createdBy: string): Ticket => {
  const priority = String(ticket.priority || 'Normal');

  return {
    id: String(ticket.id ?? `ticket-${index}`),
    subject: String(ticket.subject || 'Untitled ticket'),
    priority,
    status: String(ticket.status || 'open'),
    created_at: toIsoDateTime(ticket.date),
    created_by: createdBy,
    description: `${priority} priority ticket loaded from the live endpoint.`,
    messages: [],
    attachments: [],
  };
};

const normalizeMessages = (messages: TicketMessage[] = []) =>
  (Array.isArray(messages) ? messages : []).map((message, index) => ({
    ...message,
    file: toAbsoluteUrl(message?.file || message?.file_url || null),
    content: message?.content ?? '',
    sender_name:
      message?.sender_name ||
      (typeof message?.sender === 'string' ? message.sender : message?.sender?.username) ||
      'System',
    created_at: message?.created_at || message?.createdAt || null,
    id: message?.id || `message-${index}`,
  }));

const getMessagePreview = (message?: TicketMessage | null) => {
  if (!message) return '';
  const text = typeof message.content === 'string' ? message.content.trim() : '';
  if (text) return text;
  if (message.file) {
    const fileName = message.file.split('/').pop() || 'Attachment';
    return `[Attachment] ${fileName}`;
  }
  return 'No content';
};

const getTicketPreview = (ticket?: Ticket | null) => {
  if (!ticket) return 'No description provided.';
  const description = typeof ticket.description === 'string' ? ticket.description.trim() : '';
  if (description) return description;

  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const latestMessage = messages[messages.length - 1];
  if (latestMessage) return getMessagePreview(latestMessage);

  const ticketWithExtras = ticket as Ticket & { file?: string | null; file_url?: string | null };
  const file = ticketWithExtras.file || ticketWithExtras.file_url;
  if (file) {
    const fileName = file.split('/').pop() || 'Attachment';
    return `[Attachment] ${fileName}`;
  }

  return 'No description provided.';
};

const ReplySection = ({ onSendMessage, inputClass, goldButtonClass, softTextClass }: { onSendMessage: (message: string) => void, inputClass: string, goldButtonClass: string, softTextClass: string }) => {
  const [localMessage, setLocalMessage] = useState("");
  return (
    <div>
      <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${softTextClass}`}>
        Reply to Ticket
      </label>
      <textarea
        value={localMessage}
        onChange={(e) => {
          setLocalMessage(e.target.value);
        }}
        placeholder="Type your message here..."
        rows={3}
        className={`w-full p-4 rounded-2xl border outline-none transition-all font-medium mb-4 focus:border-[#3aa0ff] ${inputClass}`}
      />
      <button
        onClick={() => {
          if (localMessage.trim()) {
            onSendMessage(localMessage);
            setLocalMessage("");
          }
        }}
        disabled={!localMessage.trim()}
        className={`w-full py-4 rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 ${goldButtonClass}`}
      >
        Send Message
      </button>
    </div>
  );
};

const Tickets = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const [activePage, setActivePage] = useState<string>("view");
  const [userId, setUserId] = useState<string>("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<{ status: string; dateRange: string }>({
    status: "",
    dateRange: "",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const panelClass = isDarkMode
    ? "border-slate-800 bg-slate-900"
    : "border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)]";
  const inputClass = isDarkMode
    ? "bg-white/10 border-white/10 text-white placeholder:text-gray-500"
    : "border-[#214fbf] bg-[#081d5f] text-[#dbe8ff] placeholder:text-[#6f92e7]";
  const softTextClass = isDarkMode ? "text-gray-400" : "text-[#8fb8ff]";
  const headingTextClass = isDarkMode ? "text-white" : "text-white";
  const borderMutedClass = isDarkMode ? "border-white/10" : "border-[#1745b3]";
  const goldButtonClass =
    "bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_16px_30px_rgba(201,149,8,0.28)]";

  

  const fetchTickets = async (status = "all") => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchClientTickets();
      const createdBy = String(response?.user_id || userId || '');
      const liveTickets = Array.isArray(response?.tickets)
        ? response.tickets.map((ticket: ClientTicketApi, index: number) => normalizeTicket(ticket, index, createdBy))
        : [];

      setTickets(liveTickets);
      setSelectedStatus(status.toLowerCase());
      setFilters((prev) => ({
        ...prev,
        status: status === "all" ? "" : status,
      }));
      setUserId(createdBy);
      if (liveTickets.length === 0) {
        setError("No live tickets are available.");
      }
    } catch {
      setError("Failed to load tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets("all");
  }, []);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);

  // Apply filters and search term to tickets
  useEffect(() => {
    let result = [...tickets];

    // Filter by search term
    if (searchTerm.trim()) {
      result = result.filter(ticket =>
        [
          ticket.id,
          ticket.subject,
          ticket.priority,
          ticket.status,
          ticket.created_at,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase())
      );
    }

    // Filter by status
    const activeStatusFilter = (filters.status || selectedStatus).trim().toLowerCase();
    if (activeStatusFilter && activeStatusFilter !== "all") {
      result = result.filter(ticket =>
        ticket.status && ticket.status.toLowerCase() === activeStatusFilter
      );
    }


    // Filter by date range
    if (filters.dateRange) {
      const now = new Date();
      result = result.filter(ticket => {
        if (!ticket.created_at) return true;
        const created = new Date(ticket.created_at);
        if (filters.dateRange === "This Week") {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          return created >= startOfWeek;
        } else if (filters.dateRange === "This Month") {
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        } else if (filters.dateRange === "Last 3 Months") {
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return created >= threeMonthsAgo;
        }
        return true;
      });
    }

    setFilteredTickets(result);
  }, [tickets, searchTerm, filters]);

  const applyFilters = () => {
    setShowFilters(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const subject = formData.get('subject');
    const description = formData.get('description');

    const newTicket: Ticket = {
      id: `${Date.now()}`,
      subject: typeof subject === 'string' ? subject : '',
      priority: 'Normal',
      status: 'open',
      created_at: new Date().toISOString(),
      created_by: userId || '',
      description: typeof description === 'string' ? description : '',
      messages: [],
      attachments: [],
    };

    setTickets((prev) => [newTicket, ...prev]);
    alert("Ticket submitted successfully!");
    setActivePage("view");
    setSelectedStatus('open');
    setFilters((prev) => ({ ...prev, status: 'open' }));
  };

  const options: Record<"status" | "dateRange", string[]> = {
    status: ["All", "Open", "Pending", "Closed"],
    dateRange: ["This Week", "This Month", "Last 3 Months"],
  };

  const handleSelect = (key: "status" | "dateRange", value: string) => {
    setFilters({ ...filters, [key]: value });
    if (key === 'status') {
      setSelectedStatus(value.toLowerCase());
    }
    setOpenDropdown(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!content || !content.trim()) return;
    if (!selectedTicket) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      content,
      sender_name: 'You',
      sender: selectedTicket.created_by,
      created_at: new Date().toISOString(),
    };

    setSelectedTicket((prev) => {
      if (!prev) return prev;
      const updatedMessages = [...(prev._normalizedMessages || prev.messages || []), newMessage];
      return { ...prev, _normalizedMessages: updatedMessages, messages: updatedMessages };
    });

    alert("Message sent successfully!");
  };

  const openTicketDetail = async (ticketId: string) => {
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      alert('Ticket not found.');
      return;
    }

    const normalizedMessages = normalizeMessages(ticket.messages || []);
    const attachments = (ticket.attachments || []).map((a) => ({
      id: a.id,
      file: toAbsoluteUrl(a.file),
    }));

    setSelectedTicket({
      ...ticket,
      _normalizedMessages: normalizedMessages,
      _normalizedAttachments: attachments,
      messages: normalizedMessages,
    });
    setShowViewModal(true);
  };



  const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className={`${panelClass} rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border`}>
        <div className={`flex items-center justify-between p-6 border-b ${borderMutedClass}`}>
          <h3 className={`text-xl font-bold ${headingTextClass}`}>
            {title}
          </h3>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? "text-gray-400 hover:bg-white/5 hover:text-white" : "border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]"}`}>
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`overflow-x-hidden bg-[radial-gradient(circle_at_bottom,rgba(22,55,157,0.18),transparent_25%),linear-gradient(180deg,#050f35_0%,#081846_100%)] transition-all duration-300 p-4 md:p-8`}>
      {/* ===================== PAGE HEADER ===================== */}
      <div className="text-center mb-8">
        <h1 className={`text-4xl font-black tracking-tighter ${headingTextClass} mb-2`}>
          Support <span className="text-[#f0b91f]">Tickets</span>
        </h1>
        {/* <p className={`text-sm font-bold ${softTextClass}`}>
          Manage your inquiries and support requests
        </p> */}
      </div>
      
      {/* Tabs + Controls Row */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center justify-between mb-8">
        {/* Left: Status Tabs */}
        <div className="flex gap-2 p-2 rounded-[2rem] border border-[#1747b8] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] shadow-[0_10px_32px_rgba(4,15,54,0.22)] w-full lg:w-auto">
          {["all", "open", "pending", "closed"].map((status) => (
            <button
              key={status}
              onClick={() => fetchTickets(status)}
              className={`flex items-center gap-3 px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex-1 lg:flex-none ${
                selectedStatus === status
                  ? "border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)] scale-[1.02]"
                  : "border border-[#113b95] bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] text-[#d8e4ff] hover:border-[#1c4fc3] hover:text-white"
              }`}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>

        {/* Right: Search + Filter + New Ticket */}
        <div className="flex items-center gap-4 flex-shrink-0 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8db5ff]" size={18} />
            <input
              type="text"
              placeholder="Search by Ticket ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 rounded-[1.1rem] border outline-none transition-all font-medium focus:border-[#3aa0ff] ${inputClass}`}
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`p-3 rounded-[1rem] border transition-all ${isDarkMode ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "border-[#2450b7] bg-[#0b226a] text-[#f0b91f] hover:bg-[#123283]"}`}
          >
            <Filter size={20} />
          </button>
          <button
            onClick={() => setActivePage("create")}
            className={`px-6 py-3 rounded-[1rem] font-black text-sm hover:scale-105 transition-all flex items-center gap-2 ${goldButtonClass}`}
          >
            <Plus size={18} />
            New Ticket
          </button>
        </div>
      </div>

      {/* ===================== VIEW TICKETS PAGE ===================== */}
      {activePage === "view" && (
        <div className={`${panelClass} rounded-[2.5rem] border overflow-hidden`}>
          
          {/* Simplified Table Header */}
          <div className={`p-8 border-b ${borderMutedClass}`}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-[linear-gradient(180deg,#f0b91f_0%,#c99508_100%)]"></div>
              <h2 className={`text-xl font-bold ${headingTextClass}`}>Ticket History</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={isDarkMode ? "bg-white/5" : "bg-[#0b226a]"}>
                  {["Date", "Ticket ID", "Subject", "Status", "Description", "Actions"].map((head) => (
                    <th key={head} className={`px-6 py-4 text-left text-xs font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-[#9ec0ff]"}`}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={isDarkMode ? "divide-y divide-white/5" : "divide-y divide-[#153d9f]"}>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#2450b7] border-t-[#f0b91f] rounded-full animate-spin mb-4"></div>
                        <p className={`font-bold ${softTextClass}`}>Fetching tickets...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? "bg-gray-800" : "bg-[#0b226a]"}`}>
                        <Search className={isDarkMode ? "text-gray-400" : "text-[#8db5ff]"} size={32} />
                      </div>
                      <p className={`text-lg font-bold ${softTextClass}`}>No tickets found</p>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const status = (ticket.status || selectedStatus).toLowerCase();
                    const statusColor = 
                      status === "open" ? "bg-green-500/10 text-green-500" : 
                      status === "pending" ? "bg-amber-500/10 text-amber-500" : 
                      "bg-gray-500/10 text-gray-500";

                    return (
                      <tr key={ticket.id} className={`group ${isDarkMode ? "hover:bg-white/5" : "text-[#dbe8ff] hover:bg-[#0a205f]"} transition-colors`}>
                        <td className="px-6 py-5">
                          <span className={`font-bold ${isDarkMode ? "text-gray-300" : "text-[#dbe8ff]"}`}>
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`font-mono font-bold px-3 py-1 rounded-lg ${isDarkMode ? "bg-white/5 text-royal-400" : "border border-[#2450b7] bg-[#0b226a] text-[#f0b91f]"}`}>
                            #{ticket.id}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`font-bold ${isDarkMode ? "text-white" : "text-white"}`}>{ticket.subject}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className={`text-sm truncate max-w-xs ${isDarkMode ? "text-gray-400" : "text-[#9ec0ff]"}`}>
                            {getTicketPreview(ticket)}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <button
                            onClick={() => openTicketDetail(ticket.id)}
                            className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all duration-200 ${isDarkMode ? "bg-royal/10 text-royal hover:bg-royal hover:text-white border-royal/20" : "border-[#2858cd] bg-[#0b226a] text-[#d7e5ff] hover:bg-[#102c7c]"}`}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== CREATE TICKET PAGE ===================== */}
      {activePage === "create" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
          <div className={`${panelClass} p-8 rounded-[2.5rem] border`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className={`text-2xl font-black ${headingTextClass}`}>
                  Raise New <span className="text-[#f0b91f]">Ticket</span>
                </h2>
                <p className={`text-sm font-bold ${softTextClass}`}>
                  Please provide details about your inquiry
                </p>
              </div>
              <button
                onClick={() => setActivePage("view")}
                className={`p-2 rounded-full shadow-sm transition-all ${isDarkMode ? "bg-white/5 hover:bg-white/10" : "border border-[#2a58c9] bg-[#11358f] text-white hover:bg-[#1845af]"}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${softTextClass}`}>
                    Account ID
                  </label>
                  <div className={`p-4 rounded-2xl border font-bold ${isDarkMode ? "bg-white/5 border-white/10 text-white" : "border-[#214fbf] bg-[#081d5f] text-[#dbe8ff]"}`}>
                    {userId || "Auto Fetch"}
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${softTextClass}`}>
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="subject"
                    type="text"
                    placeholder="Enter ticket subject"
                    required
                    className={`w-full p-4 rounded-2xl border outline-none transition-all font-medium focus:border-[#3aa0ff] ${inputClass}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${softTextClass}`}>
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  placeholder="Describe the issue in detail"
                  required
                  rows={4}
                  className={`w-full p-4 rounded-2xl border outline-none transition-all font-medium focus:border-[#3aa0ff] ${inputClass}`}
                ></textarea>
              </div>

              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${softTextClass}`}>
                  Supporting Documents (Optional)
                </label>
                <div
                  className={`border-2 border-dashed rounded-[2rem] text-center py-10 cursor-pointer transition-all duration-300 ${isDarkMode ? "border-white/10 hover:border-royal/50 hover:bg-white/5" : "border-[#214fbf] bg-[#081d5f] hover:border-[#3aa0ff] hover:bg-[#0b226a]"}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-[#0b226a] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#2450b7]">
                    <Plus className="text-[#f0b91f]" size={32} />
                  </div>
                  <p className={`text-lg font-bold ${headingTextClass}`}>
                    Click to attach files
                  </p>
                  <p className={`text-sm font-medium ${softTextClass}`}>
                    JPG, PNG, PDF (Max: 1MB per file)
                  </p>
                  <input
                    type="file"
                    name="documents"
                    ref={fileInputRef}
                    hidden
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-6 flex flex-wrap justify-center gap-2 px-4">
                      {selectedFiles.map((file, i) => (
                        <span key={i} className={`px-3 py-1 text-white text-xs font-bold rounded-lg flex items-center gap-2 ${goldButtonClass}`}>
                          {file.name}
                          <X size={14} className="cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                          }} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className={`px-10 py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all ${goldButtonClass}`}
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== FILTER MODAL ===================== */}
      {showFilters && (
        <Modal title="Filter Tickets" onClose={() => setShowFilters(false)}>
          <div className="space-y-6">
            {(["status", "dateRange"] as const).map((key) => (
              <div key={key} className="relative">
                <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${softTextClass}`}>
                  {key === "dateRange" ? "Date Range" : key}
                </label>

                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
                  className={`w-full flex justify-between items-center p-4 rounded-2xl border font-bold transition-all ${isDarkMode ? "bg-white/10 border-white/10 text-white" : "border-[#214fbf] bg-[#081d5f] text-[#dbe8ff]"}`}
                >
                  <span className="capitalize">{filters[key as keyof typeof filters] || "Select"}</span>
                  <ChevronDown
                    size={18}
                    className={`transition-transform duration-300 ${openDropdown === key ? "rotate-180 text-[#f0b91f]" : "text-[#8db5ff]"}`}
                  />
                </button>

                {openDropdown === key && (
                  <div className={`absolute z-20 w-full mt-2 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? "bg-navy border-white/10" : "border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)]"}`}>
                    {options[key].map((opt: string) => (
                      <div
                        key={opt}
                        onClick={() => handleSelect(key, opt)}
                        className={`p-4 cursor-pointer font-bold text-sm transition-colors ${isDarkMode ? "hover:bg-white/5 text-gray-300 hover:text-white" : "text-[#dbe8ff] hover:bg-[#0a205f]"}`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => { setFilters({ status: "", dateRange: "" }); setShowFilters(false); }}
                className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${isDarkMode ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white" : "border border-[#2858cd] bg-[#0b226a] text-[#d7e5ff] hover:bg-[#102c7c]"}`}
              >
                Reset Filters
              </button>
              <button
                onClick={applyFilters}
                className={`flex-1 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all ${goldButtonClass}`}
              >
                Apply
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================== VIEW MODAL ===================== */}
      {showViewModal && selectedTicket && (
        <Modal title="Ticket Details" onClose={() => { setShowViewModal(false); }}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1 ${softTextClass}`}>
                  Subject
                </label>
                <p className={`font-bold ${headingTextClass}`}>{selectedTicket.subject}</p>
              </div>
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1 ${softTextClass}`}>
                  Created At
                </label>
                <p className={`font-bold ${headingTextClass}`}>{new Date(selectedTicket.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1 ${softTextClass}`}>
                  Status
                </label>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  selectedTicket.status === "open" ? "bg-green-500/10 text-green-500" : 
                  selectedTicket.status === "pending" ? "bg-amber-500/10 text-amber-500" : 
                  "bg-gray-500/10 text-gray-500"
                }`}>
                  {selectedTicket.status}
                </span>
              </div>
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1 ${softTextClass}`}>
                  Ticket ID
                </label>
                <p className={`font-mono font-bold ${headingTextClass}`}>#{selectedTicket.id}</p>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-black uppercase tracking-widest mb-1 ${softTextClass}`}>
                Description
              </label>
              <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-white/5 border-white/5" : "border-[#214fbf] bg-[#081d5f]"}`}>
                <p className={`text-sm font-medium whitespace-pre-wrap ${isDarkMode ? "text-gray-300" : "text-[#9ec0ff]"}`}>
                  {selectedTicket.description || "No description provided."}
                </p>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${softTextClass}`}>
                Message History
              </label>
              {selectedTicket._normalizedMessages && selectedTicket._normalizedMessages.length > 0 ? (
                <div 
                  className="flex flex-col gap-3 p-6 rounded-2xl border border-[#202c33] bg-[#0b141a] max-h-[450px] overflow-y-auto custom-scrollbar"
                  style={{
                    backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                  }}
                >
                  {selectedTicket._normalizedMessages.map((message) => {
                    const isSelf = String(message.sender) === String(selectedTicket.created_by);
                    const date = message.created_at ? new Date(message.created_at) : null;
                    const timeString = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions) : "";
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex w-full ${isSelf ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 shadow-md relative ${
                            isSelf
                              ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                              : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                          }`}
                        >
                          {!isSelf && (
                            <span className="text-xs font-bold text-[#53bdeb] block mb-1">
                              {message.sender_name}
                            </span>
                          )}
                          
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-12">
                            {getMessagePreview(message)}
                          </div>
                          
                          {message.file && (
                            <div className="mt-2 bg-[#111b21] hover:bg-[#182229] transition-colors p-2.5 rounded-lg border border-white/5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={18} className="text-[#00a884] shrink-0" />
                                <span className="text-xs font-semibold truncate text-[#e9edef] max-w-[120px]">
                                  {message.file.split("/").pop() || "Document"}
                                </span>
                              </div>
                              <a
                                href={message.file}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-[#00a884] hover:text-[#00c298] transition-colors shrink-0"
                              >
                                Download
                              </a>
                            </div>
                          )}

                          <div className="absolute bottom-1 right-2 flex items-center gap-1">
                            <span className="text-[10px] text-[#8696a0] font-medium leading-none">
                              {timeString}
                            </span>
                            {isSelf && (
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
                <p className={`text-sm font-bold ${softTextClass}`}>No messages found for this ticket.</p>
              )}
            </div>

            <div>
              <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${softTextClass}`}>
                Attachments
              </label>
              {(selectedTicket._normalizedAttachments && selectedTicket._normalizedAttachments.length > 0) ? (
                <div className="flex flex-wrap gap-3">
                  {selectedTicket._normalizedAttachments.map((a) => {
                    const fileUrl = a?.file || null;
                    const safeFileUrl = fileUrl ?? undefined;
                    const isImage = safeFileUrl && /\.(jpg|jpeg|png|gif)$/i.test(safeFileUrl);
                    return (
                      <div key={a.id} className="group relative">
                        {isImage ? (
                          <a href={safeFileUrl} target="_blank" rel="noreferrer" className={`block w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${isDarkMode ? "border-white/10" : "border-[#2450b7] hover:border-[#3aa0ff]"}`}>
                            <img src={safeFileUrl} alt="Attachment" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <a href={safeFileUrl} target="_blank" rel="noreferrer" className={`flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 transition-all ${isDarkMode ? "border-white/10 bg-white/5" : "border-[#2450b7] bg-[#0b226a] hover:border-[#3aa0ff]"}`}>
                            <Plus className={`mb-1 ${isDarkMode ? "text-royal" : "text-[#f0b91f]"}`} size={20} />
                            <span className="text-[10px] font-bold text-center px-2 truncate w-full">File</span>
                          </a>
                        )}
                        <a href={safeFileUrl} download className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)]">
                          <Plus size={14} className="rotate-45" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-sm font-bold ${softTextClass}`}>No attachments</p>
              )}
            </div>

            <div className={`pt-4 border-t ${borderMutedClass}`}>
              <ReplySection 
                onSendMessage={handleSendMessage}
                inputClass={inputClass}
                goldButtonClass={goldButtonClass}
                softTextClass={softTextClass}
              />
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Tickets;
