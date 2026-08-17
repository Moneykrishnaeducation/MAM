import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { 
  Mail, 
  Send, 
  Users, 
  ShieldAlert, 
  Type, 
  MessageSquare, 
  User, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Search,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Lock,
  Radio,
  Clock,
  Filter,
  Plus,
  Paperclip,
  Trash2,
  Tag,
  CheckSquare,
  Square,
  Eye,
  X,
  Sparkles,
  ArrowLeft,
  Minus,
  Maximize2,
  Minimize2,
  CornerUpLeft,
  MoreVertical,
  Star,
  Printer,
  Code,
  Menu,
  Edit2
} from "lucide-react";

// Category Configuration & Colors
const CATEGORIES = [
  { id: 'all', label: 'All Mail', icon: Inbox, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'deposit', label: 'Deposits', icon: ArrowDownLeft, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'withdrawal', label: 'Withdrawals', icon: ArrowUpRight, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'trade_report', label: 'Trade Reports', icon: TrendingUp, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'account', label: 'Account System', icon: FileText, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'security', label: 'Security & Verification', icon: Lock, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { id: 'broadcast', label: 'Broadcasts & Single', icon: Radio, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
];

const MailPage = () => {
  const router = useRouter();

  // Email Queue State
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [dynamicCategoriesList, setDynamicCategoriesList] = useState<any[]>([]);

  // Gmail Reader State (full in-page email view)
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [renderingHtml, setRenderingHtml] = useState<boolean>(false);
  const [showJsonDebugger, setShowJsonDebugger] = useState<boolean>(false);

  // Gmail Compose Box State (bottom-right floating dock)
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [isComposeMinimized, setIsComposeMinimized] = useState<boolean>(false);
  const [isComposeMaximized, setIsComposeMaximized] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const [sendingLoading, setSendingLoading] = useState<boolean>(false);
  const [broadcastLoading, setBroadcastLoading] = useState<boolean>(false);

  // Stats & Toast
  const [toast, setToast] = useState<{message: string, variant: string} | null>(null);
  const [activeUsersCount, setActiveUsersCount] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Icon & Color map for dynamic categories
  const getCategoryMeta = (catId: string) => {
    switch (catId) {
      case 'all': return { icon: Inbox, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'deposit': return { icon: ArrowDownLeft, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'withdrawal': return { icon: ArrowUpRight, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'trade_report': return { icon: TrendingUp, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'account': return { icon: FileText, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'security': return { icon: Lock, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'broadcast': return { icon: Radio, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      default: return { icon: Tag, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    }
  };

  // Fetch Emails from API
  const fetchEmails = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        status: selectedStatus,
        search: searchQuery,
        from: fromDate,
        to: toDate,
        page: page.toString(),
        page_size: '15'
      });

      const res = await fetch(`/api/admin/mails?${params.toString()}`);
      if (res.status === 403 || res.status === 401) {
          router.push('/admin');
          return;
      }
      const data = await res.json();
      
      setEmails(data.messages || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
      setCurrentPage(data.current_page || 1);
      setCategoryCounts(data.categories || {});
      setStatusCounts(data.summary || {});
    } catch (err: any) {
      console.error("Failed to fetch email queue:", err);
      setError(err.message || "Failed to load emails from database.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch rendered HTML template when an email is selected
  useEffect(() => {
    if (!selectedEmail) {
      setRenderedHtml(null);
      return;
    }
    setRenderingHtml(true);
    setRenderedHtml(selectedEmail.html_body || null);
    setRenderingHtml(false);
  }, [selectedEmail]);

  // Fetch emails whenever category, status, search, or page changes
  useEffect(() => {
    fetchEmails(currentPage);
  }, [selectedCategory, selectedStatus, currentPage, fromDate, toDate]);

  // Handle Search Input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchEmails(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Active Users Count
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (data.users) {
          setActiveUsersCount(data.users.length);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  function showToast(message: string, variant: 'success' | 'error' = 'success', duration: number = 4000) {
    setToast({ message, variant });
    setTimeout(() => setToast(null), duration);
  }

  // Handle Send Direct Email
  const handleSendDirect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.subject || !formData.message || !formData.email) {
      showToast('Recipient, subject, and message are required', 'error');
      return;
    }
    setSendingLoading(true);
    try {
      const recipients = formData.email.split(',').map(s => s.trim()).filter(Boolean);
      const payload = { to: recipients, subject: formData.subject, message: formData.message, send_now: true };
      const res = await fetch('/api/admin/mails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send');
      showToast(data.message || 'Email queued successfully', 'success');
      setFormData({ email: '', subject: '', message: '' });
      setIsComposeOpen(false);
      setIsComposeMinimized(false);
      setIsComposeMaximized(false);
      fetchEmails(1);
    } catch (err: any) {
      showToast(err.message || 'Failed to send email', 'error');
    } finally {
      setSendingLoading(false);
    }
  };

  // Handle Send Broadcast Email
  const handleSendBroadcast = async () => {
    if (!formData.subject || !formData.message) {
      showToast('Subject and message are required for broadcast', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to send this broadcast to all ${activeUsersCount ?? ''} active users?`)) {
      return;
    }

    setBroadcastLoading(true);
    try {
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      const allEmails = (usersData.users || []).map((u: any) => u.email).filter(Boolean);
      
      const payload = { subject: formData.subject, message: formData.message, to: allEmails, send_now: true };
      const res = await fetch('/api/admin/mails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send broadcast');
      showToast(data.message || 'Broadcast queued successfully', 'success');
      setFormData({ email: '', subject: '', message: '' });
      setIsComposeOpen(false);
      setIsComposeMinimized(false);
      setIsComposeMaximized(false);
      fetchEmails(1);
    } catch (err: any) {
      showToast(err.message || 'Failed to send broadcast', 'error');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // Formatting date
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper badge style by status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Sent</span>;
      case 'queued':
      case 'pending':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Pending</span>;
      case 'failed':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> Failed</span>;
      case 'sending':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> Sending</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-gray-500/15 text-gray-400 border border-gray-500/30">{status}</span>;
    }
  };

  return (
    <>
      {/* Main Gmail-like Interface */}
      <div className="w-full h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] flex flex-col bg-transparent text-white overflow-hidden md:p-6 relative">
        
        {/* Top Gmail Header & Action Bar */}
        {/* Mobile Search Header (Gmail Dark) */}
        <div className="md:hidden px-4 pt-3 pb-1 bg-transparent flex-shrink-0">
          <div className="flex items-center bg-[#081942]/80 border border-[#1D3B8A] rounded-full px-4 py-3 shadow-md backdrop-blur-md">
            <Menu 
              className="w-6 h-6 text-[#8FB8FF] mr-4 cursor-pointer" 
              onClick={() => setIsMobileMenuOpen(true)} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in mail"
              className="flex-1 bg-transparent border-none text-[15px] text-gray-200 outline-none placeholder:text-gray-400"
            />
            <Sparkles className="w-5 h-5 text-gray-300 ml-2" />
            <div className="w-8 h-8 bg-[#ff5722] rounded-full flex items-center justify-center text-white font-bold text-sm ml-4">
              N
            </div>
          </div>
          <h2 className="text-gray-200 text-xs font-semibold tracking-wide mt-5 mb-1 px-1">Inbox</h2>
        </div>

        <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-[#081942]/90 p-4 rounded-3xl border border-[#1D3B8A] shadow-xl backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0e2a78] to-[#081942] border border-[#244eb5] text-[#E0B01D]">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Mail Hub <Sparkles className="w-4 h-4 text-[#E0B01D]" />
              </h1>
              <p className="text-xs font-semibold text-[#8FB8FF]">
                Live Dispatch Logs & Email Management
              </p>
            </div>
          </div>

          {/* Filters Row: Search & Date Pickers */}
          <div className="flex-1 max-w-2xl mx-0 md:mx-6 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FB8FF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by recipient email, subject, or type..."
                className="w-full pl-11 pr-4 py-2.5 text-xs font-semibold rounded-2xl border border-[#1D3B8A] bg-[#051336] focus:border-[#E0B01D] text-white placeholder:text-[#8FB8FF]/50 outline-none transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                className="w-full sm:w-[130px] px-3 py-2 text-xs font-semibold rounded-xl border border-[#1D3B8A] bg-[#051336] focus:border-[#E0B01D] text-[#8FB8FF] outline-none transition-all cursor-pointer"
                title="From Date"
              />
              <span className="text-[#8FB8FF] text-xs font-bold">-</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className="w-full sm:w-[130px] px-3 py-2 text-xs font-semibold rounded-xl border border-[#1D3B8A] bg-[#051336] focus:border-[#E0B01D] text-[#8FB8FF] outline-none transition-all cursor-pointer"
                title="To Date"
              />
            </div>
          </div>

          {/* Top Buttons: Compose Email & Refresh */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchEmails(currentPage)}
              className="p-2.5 rounded-2xl bg-[#051336] border border-[#1D3B8A] text-[#8FB8FF] hover:text-white hover:border-[#244eb5] transition-all"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => { setIsComposeOpen(true); setIsComposeMinimized(false); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-[#E0B01D] to-[#C99508] text-[#030a1c] hover:brightness-110 shadow-lg shadow-[#E0B01D]/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Compose Mail
            </button>
          </div>
        </div>

        {/* Main 2-Column Dashboard Layout */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          
          {/* Left Sidebar - Gmail Navigation Categories */}
          <div className="w-64 hidden lg:flex flex-col gap-2 p-3 bg-[#081942]/80 rounded-3xl border border-[#1D3B8A] backdrop-blur-md overflow-y-auto flex-shrink-0">
            
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8FB8FF] px-3 py-2">
              Categories by Type
            </div>

            {(dynamicCategoriesList.length > 0 ? dynamicCategoriesList : CATEGORIES).map((cat: any) => {
              const meta = getCategoryMeta(cat.id);
              const IconComp = cat.icon || meta.icon;
              const colorClass = cat.color || meta.color;
              const isSelected = selectedCategory === cat.id;
              const count = cat.count ?? categoryCounts[cat.id] ?? 0;

              return (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedEmail(null); setCurrentPage(1); }}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isSelected 
                      ? 'bg-gradient-to-r from-[#0d286d] to-[#081f59] text-white border border-[#244eb5] shadow-lg' 
                      : 'text-[#8FB8FF] hover:bg-[#051336]/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-xl border ${colorClass}`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{cat.label}</span>
                  </div>
                  {count > 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-[#E0B01D] text-[#030a1c]' : 'bg-[#051336] text-[#8FB8FF] border border-[#1D3B8A]'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="my-2 border-t border-[#1D3B8A]/60" />

            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8FB8FF] px-3 py-1">
              Filter by Status
            </div>

            {['all', 'queued', 'sent', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => { setSelectedStatus(st); setSelectedEmail(null); setCurrentPage(1); }}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  selectedStatus === st
                    ? 'bg-[#051336] text-[#E0B01D] border border-[#E0B01D]/40'
                    : 'text-[#8FB8FF]/80 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    st === 'sent' ? 'bg-emerald-400' : st === 'queued' ? 'bg-amber-400' : st === 'failed' ? 'bg-rose-400' : 'bg-blue-400'
                  }`} />
                  {st}
                </span>
                <span className="text-[10px] opacity-60 font-semibold">
                  {st === 'all' ? totalCount : statusCounts[st] ?? 0}
                </span>
              </button>
            ))}


          </div>

          {/* Right Display Pane: Main Mail List OR Full In-Page Email Reader (Gmail style) */}
          <div className="flex-1 flex flex-col bg-transparent md:bg-[#081942]/90 md:rounded-3xl md:border border-[#1D3B8A] backdrop-blur-xl overflow-hidden md:shadow-2xl">
            
            {selectedEmail ? (
              /* GMAIL FULL IN-PAGE EMAIL READER VIEW */
              <div className="flex-1 flex flex-col h-full bg-[#081942] animate-in fade-in">
                
                {/* Gmail Reader Header Action Toolbar */}
                <div className="p-3 sm:p-4 border-b border-[#1D3B8A] bg-[#051336] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px]">
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#081942] border border-[#1D3B8A] text-[#8FB8FF] hover:text-white hover:border-[#E0B01D] transition-all flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold"
                      title="Back to inbox list"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Back
                    </button>
                    <div className="h-4 sm:h-6 w-[1px] bg-[#1D3B8A]" />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#E0B01D] truncate max-w-[140px] sm:max-w-none">
                      {selectedEmail.source || 'Admin'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="scale-90 sm:scale-100 origin-right">
                      {getStatusBadge(selectedEmail.status)}
                    </div>
                    <button
                      onClick={() => setShowJsonDebugger(!showJsonDebugger)}
                      className={`hidden sm:flex p-2 rounded-xl border transition-all text-xs font-bold items-center gap-1.5 ${
                        showJsonDebugger ? 'bg-[#E0B01D] text-[#030a1c] border-[#E0B01D]' : 'bg-[#081942] border-[#1D3B8A] text-[#8FB8FF] hover:text-white'
                      }`}
                      title="Toggle JSON Payload Inspection"
                    >
                      <Code className="w-4 h-4" />
                      <span>JSON</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="hidden sm:flex p-2 rounded-xl bg-[#081942] border border-[#1D3B8A] text-[#8FB8FF] hover:text-white"
                      title="Print Email"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="hidden sm:flex p-2 rounded-xl bg-[#081942] border border-[#1D3B8A] text-[#8FB8FF] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Gmail Reader Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
                  
                  {/* Subject Line */}
                  <div className="border-b border-[#1D3B8A]/60 pb-4 sm:pb-5">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                      {selectedEmail.subject || '(No Subject)'}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] sm:text-xs font-medium text-[#8FB8FF]/60">
                        Queue ID: #{selectedEmail.id}
                      </span>
                    </div>
                  </div>

                  {/* Sender & Recipient Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-[#051336] border border-[#1D3B8A]">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#0e2a78] to-[#081942] border border-[#E0B01D] flex items-center justify-center text-base sm:text-lg font-black text-[#E0B01D]">
                        {(selectedEmail.to && selectedEmail.to[0]) ? selectedEmail.to[0].charAt(0).toUpperCase() : 'V'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-white truncate max-w-full">{(selectedEmail.to && selectedEmail.to.join(', ')) || 'No recipients'}</span>
                          {(selectedEmail.cc && selectedEmail.cc.length > 0) && (
                            <span className="text-[10px] sm:text-xs font-semibold text-[#8FB8FF] truncate">CC: {selectedEmail.cc.join(', ')}</span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs font-medium text-[#8FB8FF] mt-0.5 truncate">
                          To: <span className="text-white">{(selectedEmail.to && selectedEmail.to.join(', ')) || ''}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-[10px] sm:text-xs font-semibold text-[#8FB8FF] pl-14 sm:pl-0">
                      <div>{formatDate(selectedEmail.created_at)}</div>
                      {selectedEmail.sent_at && (
                        <div className="text-[10px] text-emerald-400 mt-0.5 sm:mt-1">Sent: {formatDate(selectedEmail.sent_at)}</div>
                      )}
                    </div>
                  </div>

                  {/* Error Box if delivery failed */}
                  {selectedEmail.error_message && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">Delivery Failure Log</p>
                        <p className="text-xs font-medium mt-0.5">{selectedEmail.error_message}</p>
                      </div>
                    </div>
                  )}

                  {/* EXACT HTML CLIENT EMAIL VIEW (Rendered HTML template iframe) */}
                  <div className="rounded-2xl border border-[#1D3B8A] overflow-hidden shadow-2xl min-h-[600px] flex flex-col">
                    {renderingHtml ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-16 text-[#081942]">
                        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-[#E0B01D]" />
                        <p className="text-xs font-black uppercase tracking-wider text-[#081942]">Rendering email preview...</p>
                      </div>
                    ) : renderedHtml ? (
                      <iframe
                        title="Client Email HTML Render"
                        srcDoc={renderedHtml}
                        className="w-full min-h-[650px] flex-1 border-none bg-white"
                        sandbox="allow-popups allow-same-origin"
                      />
                    ) : (
                      <div className="p-8 text-slate-800 text-sm font-medium bg-white whitespace-pre-wrap min-h-[650px]">
                        {selectedEmail.body || "No preview available for this email."}
                      </div>
                    )}
                  </div>

                  {/* Optional JSON Debugger (toggled via button) */}
                  {showJsonDebugger && (
                    <div className="p-6 rounded-2xl bg-[#051336]/80 border border-[#1D3B8A]">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8FB8FF] mb-2">
                        Structured Context Data (JSON Payload)
                      </h4>
                      <pre className="p-4 rounded-2xl bg-[#030a1c] border border-[#1D3B8A] text-[#8FB8FF] font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedEmail.payload, null, 2)}
                      </pre>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              /* MAIN MAIL LIST VIEW */
              <>
                {/* Category selector pill bar for Mobile screens */}
                <div className="hidden md:flex lg:hidden overflow-x-auto gap-2 p-3 border-b border-[#1D3B8A] scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-[#E0B01D] text-[#030a1c]'
                          : 'bg-[#051336] text-[#8FB8FF] border border-[#1D3B8A]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Mail Items Table List */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#1D3B8A]/50 scrollbar-thin scrollbar-thumb-[#1D3B8A] scrollbar-track-transparent">
                  {loading ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center text-[#8FB8FF]">
                      <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#E0B01D]" />
                      <p className="text-sm font-bold">Loading email database records...</p>
                    </div>
                  ) : error ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center text-rose-400">
                      <AlertCircle className="w-10 h-10 mb-3" />
                      <p className="text-sm font-bold">{error}</p>
                      <button onClick={() => fetchEmails(currentPage)} className="mt-4 px-4 py-2 rounded-xl bg-rose-500/20 text-white font-bold text-xs">
                        Try Again
                      </button>
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center text-[#8FB8FF]">
                      <Inbox className="w-12 h-12 mb-4 text-[#1D3B8A]" />
                      <h3 className="text-base font-black text-white">No Emails Found</h3>
                      <p className="text-xs font-medium text-[#8FB8FF]/70 max-w-sm mt-1">
                        No email records matched your category filter or search query.
                      </p>
                    </div>
                  ) : (
                    emails.map((mail: any) => (
                      <div
                        key={mail.id}
                        onClick={() => setSelectedEmail(mail)}
                        className="group flex flex-row items-start justify-between p-4 md:p-4 md:hover:bg-[#0d286d]/40 transition-all cursor-pointer gap-3"
                      >
                        {/* Left Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-11 h-11 md:w-9 md:h-9 rounded-full md:rounded-2xl bg-[#ff6b6b] md:bg-[#051336] md:border border-[#1D3B8A] flex items-center justify-center text-lg md:text-xs font-normal md:font-black text-black md:text-[#E0B01D] transition-all">
                            {(mail.to && mail.to[0]) ? mail.to[0].charAt(0).toUpperCase() : 'M'}
                          </div>
                        </div>

                        {/* Mobile Text Block */}
                        <div className="md:hidden flex-1 min-w-0 ml-1">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <p className="text-[15px] font-bold text-gray-100 truncate pr-2">
                              {(mail.to && mail.to[0]) || 'No recipient'}
                            </p>
                            <span className="text-[11px] text-gray-400 shrink-0">
                              {formatDate(mail.created_at)}
                            </span>
                          </div>
                          <p className="text-[14px] font-bold text-gray-200 truncate mb-0.5">
                            {mail.subject || '(No Subject)'}
                          </p>
                          <div className="flex justify-between items-start">
                            <p className="text-[13px] text-gray-400 truncate pr-2">
                              {mail.body?.substring(0, 80) || ''}
                            </p>
                            <Star className="w-5 h-5 text-gray-500 shrink-0" />
                          </div>
                        </div>

                        {/* Desktop Text Block (Original Layout but wrapped) */}
                        <div className="hidden md:flex flex-1 min-w-0 items-center justify-between">
                          <div className="flex items-center gap-3 w-1/4 min-w-0">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {(mail.to && mail.to.join(', ')) || 'No recipients'}
                              </p>
                              <span className="inline-block text-[9px] font-black uppercase tracking-wider text-[#8FB8FF]/80">
                                {mail.source || 'Admin'}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 px-4">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white truncate group-hover:text-[#E0B01D] transition-colors">
                                {mail.subject || '(No Subject)'}
                              </p>
                            </div>
                            <p className="text-[11px] font-medium text-[#8FB8FF]/60 truncate mt-0.5">
                              {mail.body?.substring(0, 80) || ''}
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-4 flex-shrink-0">
                            <div>{getStatusBadge(mail.status)}</div>
                            <span className="text-[11px] font-semibold text-[#8FB8FF]/70 whitespace-nowrap">
                              {formatDate(mail.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Pagination Footer */}
                <div className="p-4 border-t border-[#1D3B8A] bg-[#051336]/60 flex items-center justify-between text-xs font-semibold text-[#8FB8FF]">
                  <div>
                    Showing {emails.length} of <span className="font-black text-white">{totalCount}</span> total emails
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      className="p-2 rounded-xl bg-[#081942] border border-[#1D3B8A] disabled:opacity-30 text-white hover:border-[#E0B01D] transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="px-3 py-1 rounded-xl bg-[#081942] border border-[#1D3B8A] text-white font-bold text-xs">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage >= totalPages || loading}
                      className="p-2 rounded-xl bg-[#081942] border border-[#1D3B8A] disabled:opacity-30 text-[#8FB8FF] text-white hover:border-[#E0B01D] transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* COMPOSE OVERLAY BACKDROP */}
        {isComposeOpen && !isComposeMinimized && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] animate-in fade-in"
            onClick={() => {
              // Only close if we are not maximized or doing something else, but standard modals often close on outside click.
              // We'll leave it without onClick closing for safety to prevent accidental loss of draft.
            }}
          />
        )}

        {/* FLOATING GMAIL-STYLE COMPOSE WIDGET */}
        {isComposeOpen && (
          <div
            className={`fixed z-50 transition-all duration-300 shadow-2xl border border-[#244eb5] overflow-hidden bg-[#081942] flex flex-col ${
              isComposeMaximized
                ? 'inset-0 sm:inset-6 rounded-none sm:rounded-3xl transform-none'
                : isComposeMinimized
                ? 'bottom-0 right-0 sm:right-6 w-full sm:w-80 h-12 rounded-t-2xl sm:rounded-t-3xl transform-none'
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-full sm:max-w-xl h-[85vh] sm:h-[600px] rounded-2xl sm:rounded-3xl'
            }`}
          >
            {/* Compose Header Bar */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#071536] to-[#0d286d] border-b border-[#1D3B8A] flex items-center justify-between flex-shrink-0 cursor-pointer"
              onClick={() => { if (isComposeMinimized) setIsComposeMinimized(false); }}
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#E0B01D]" />
                <span className="text-xs font-black text-white">New Communication</span>
              </div>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setIsComposeMinimized(!isComposeMinimized)}
                  className="p-1 rounded-lg hover:bg-white/10 text-[#8FB8FF] hover:text-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setIsComposeMaximized(!isComposeMaximized); setIsComposeMinimized(false); }}
                  className="p-1 rounded-lg hover:bg-white/10 text-[#8FB8FF] hover:text-white"
                >
                  {isComposeMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setIsComposeOpen(false); setIsComposeMinimized(false); setIsComposeMaximized(false); }}
                  className="p-1 rounded-lg hover:bg-white/10 text-[#8FB8FF] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Compose Body (Hidden when Minimized) */}
            {!isComposeMinimized && (
              <form onSubmit={handleSendDirect} className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#8FB8FF] block mb-1">
                    To: (Recipients)
                  </label>
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com, user2@example.com... (Leave blank to Broadcast)"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#1D3B8A] bg-[#051336] focus:border-[#E0B01D] text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#8FB8FF] block mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Subject line..."
                    required
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-[#1D3B8A] bg-[#051336] focus:border-[#E0B01D] text-white outline-none"
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#8FB8FF] block mb-1">
                    Message Content
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write your email body here..."
                    required
                    className="w-full flex-1 p-3 text-xs leading-relaxed rounded-xl border border-[#1D3B8A] bg-[#051336] focus:border-[#E0B01D] text-white outline-none resize-none min-h-[140px]"
                  />
                </div>

                {/* Gmail-Style Bottom Bar Buttons */}
                <div className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 border-t border-[#1D3B8A]/60">
                  <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 flex-1">
                    <button
                      type="submit"
                      disabled={sendingLoading || broadcastLoading || !formData.email}
                      className="px-4 py-3 sm:px-5 sm:py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-[#E0B01D] to-[#C99508] text-[#030a1c] disabled:opacity-40 hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-[#E0B01D]/20 active:scale-95 transition-all w-full sm:w-auto"
                    >
                      {sendingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Direct
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleSendBroadcast}
                      disabled={sendingLoading || broadcastLoading}
                      className="px-4 py-3 sm:py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-[#0d286d] text-white border border-[#244eb5] hover:bg-[#123283] flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                    >
                      {broadcastLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5 text-yellow-400" />}
                      Broadcast All ({activeUsersCount ?? '--'})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData({ email: '', subject: '', message: '' })}
                    className="p-3 sm:p-2 rounded-xl text-[#8FB8FF]/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all self-end sm:self-auto hidden sm:block"
                    title="Discard draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>

      
      {/* Mobile Floating Compose Button */}
      <button 
        className="md:hidden fixed bottom-20 right-5 pl-4 pr-5 py-3.5 bg-[#c2e7ff] text-[#001d35] rounded-2xl flex items-center gap-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-10 hover:bg-[#a6d5fa] transition-colors"
        onClick={() => { setIsComposeOpen(true); setIsComposeMinimized(false); setIsComposeMaximized(true); }}
      >
        <Edit2 className="w-5 h-5" />
        <span className="font-semibold text-[15px]">Compose</span>
      </button>

      {/* Toast Notification */}

      {toast && (
        <div className="fixed top-20 right-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 ${
            toast.variant === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-green-600 border-green-500 text-white'
          }`}>
            {toast.variant === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="text-sm font-black tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Sidebar Panel */}
          <div className="relative w-[280px] max-w-[80%] bg-[#081942] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 border-r border-[#1D3B8A]">
            <div className="p-5 border-b border-[#1D3B8A] flex items-center gap-3">
              <Mail className="w-6 h-6 text-[#E0B01D]" />
              <h2 className="text-xl font-bold text-white">Mail Hub</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 scrollbar-none flex flex-col gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8FB8FF] px-3 py-2">
                Categories by Type
              </div>
              
              {(dynamicCategoriesList.length > 0 ? dynamicCategoriesList : CATEGORIES).map(cat => {
                const meta = getCategoryMeta(cat.id);
                const IconComp = cat.icon || meta.icon;
                const colorClass = cat.color || meta.color;
                const isSelected = selectedCategory === cat.id;
                const count = cat.count ?? categoryCounts[cat.id] ?? 0;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setCurrentPage(1);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                      isSelected 
                        ? 'bg-gradient-to-r from-[#0d286d] to-[#081f59] text-white border border-[#244eb5] shadow-lg' 
                        : 'text-[#8FB8FF] hover:bg-[#051336]/60 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-xl border ${colorClass}`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{cat.label}</span>
                    </div>
                    {count > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-[#E0B01D] text-[#030a1c]' : 'bg-[#051336] text-[#8FB8FF] border border-[#1D3B8A]'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="my-2 border-t border-[#1D3B8A]/60" />

              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8FB8FF] px-3 py-1">
                Filter by Status
              </div>
              
              {['all', 'queued', 'sent', 'failed'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSelectedStatus(st);
                    setCurrentPage(1);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    selectedStatus === st
                      ? 'bg-[#051336] text-[#E0B01D] border border-[#E0B01D]/40'
                      : 'text-[#8FB8FF]/80 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      st === 'sent' ? 'bg-emerald-400' : st === 'queued' ? 'bg-amber-400' : st === 'failed' ? 'bg-rose-400' : 'bg-blue-400'
                    }`} />
                    {st}
                  </span>
                  <span className="text-[10px] opacity-60 font-semibold">
                    {st === 'all' ? totalCount : statusCounts[st] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MailPage;
