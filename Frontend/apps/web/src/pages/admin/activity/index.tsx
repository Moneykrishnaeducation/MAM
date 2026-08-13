import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
  Copy,
  Check,
  Terminal,
  Eye,
  FileText,
  Globe
} from 'lucide-react';

type ActivityCategory = 'all' | 'admin' | 'client' | 'error';

type ActivityLogRow = {
  id: string;
  userName: string;
  userRole: string;
  actionType: string;
  moduleName: string;
  recordId: string;
  ipAddress: string;
  userAgent: string;
  time: string;
  category: Exclude<ActivityCategory, 'all'>;
};

type ActivityApiItem = {
  id?: string | number;
  user_name?: string | null;
  user_role?: string | null;
  action_type?: string | null;
  module_name?: string | null;
  record_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  timestamp?: string | null;
  time?: string | null;
  category?: string | null;
};

// Helper to get role cookie value
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

const activityTabs: Array<{
  id: ActivityCategory;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'all', label: 'All', icon: Activity },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'client', label: 'Client', icon: Users },
  { id: 'error', label: 'Errors', icon: AlertTriangle },
];

const ACTIVITY_ENDPOINTS: Record<ActivityCategory, string> = {
  all: '/api/admin/activity/all',
  admin: '/api/admin/activity/admin',
  client: '/api/admin/activity/client',
  error: '/api/admin/activity/error',
};

const perPageOptions = [10, 25, 50, 100];

function getCategoryMeta(category: Exclude<ActivityCategory, 'all'>) {
  switch (category) {
    case 'admin':
      return {
        label: 'Admin',
        style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        dot: 'bg-blue-400',
      };
    case 'client':
      return {
        label: 'Client',
        style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    case 'error':
      return {
        label: 'Error',
        style: 'bg-red-500/15 text-red-300 border-red-500/30',
        dot: 'bg-red-400 animate-pulse',
      };
  }
}

function normalizeActivityCategory(category?: string | null): Exclude<ActivityCategory, 'all'> {
  if (category === 'client' || category === 'error') {
    return category;
  }
  return 'admin';
}

function formatTabCount(count: number) {
  return count.toLocaleString();
}

function mapActivityRows(items: ActivityApiItem[] | undefined): ActivityLogRow[] {
  return (Array.isArray(items) ? items : []).map((item) => {
    const userRole = String(item.user_role ?? 'Admin');
    const actionType = String(item.action_type ?? 'Unknown action');
    const moduleName = String(item.module_name ?? 'general');
    const timestamp = String(item.timestamp ?? item.time ?? 'Recently');

    return {
      id: String(item.id ?? `${actionType}-${moduleName}-${timestamp}`),
      userName: String(item.user_name ?? 'System'),
      userRole,
      actionType,
      moduleName,
      recordId: String(item.record_id ?? 'N/A'),
      ipAddress: String(item.ip_address ?? 'N/A'),
      userAgent: String(item.user_agent ?? 'N/A'),
      time: timestamp,
      category: normalizeActivityCategory(item.category),
    };
  });
}

function getInitials(name: string) {
  if (!name || name === 'System') return 'SYS';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function AdminActivityPage() {
  const [adminRole, setAdminRole] = useState('');
  const [activeTab, setActiveTab] = useState<ActivityCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [reloadToken, setReloadToken] = useState(0);
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [logsByTab, setLogsByTab] = useState<Partial<Record<ActivityCategory, ActivityLogRow[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  // Inspection Modal State
  const [inspectRow, setInspectRow] = useState<ActivityLogRow | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  useEffect(() => {
    const role = getAdminRole();
    setAdminRole(role);
    const roleLower = role.toLowerCase();
    if (roleLower === 'viewer') {
      setActiveTab('client');
    } else if (roleLower === 'admin' && activeTab === 'error') {
      setActiveTab('all');
    }
  }, []);

  const allowedTabs = useMemo(() => {
    const roleLower = adminRole.toLowerCase();
    if (roleLower === 'viewer') {
      // Hide error, admin, and all tabs for viewer -> only show client log
      return activityTabs.filter((t) => t.id === 'client');
    }
    if (roleLower === 'admin') {
      // Hide error log for admin -> show all, admin, client
      return activityTabs.filter((t) => t.id !== 'error');
    }
    // SuperAdmin sees all 4 tabs
    return activityTabs;
  }, [adminRole]);

  useEffect(() => {
    let active = true;

    const readEndpoint = async (endpoint: string, pg: number, pp: number, search: string) => {
      const params = new URLSearchParams();
      params.set('page', String(pg));
      params.set('per_page', String(pp));
      if (search) params.set('search', search);
      const res = await fetch(`${endpoint}?${params.toString()}`, { credentials: 'include' });
      const data = (await res.json().catch(() => ({}))) as { activities?: ActivityApiItem[]; pagination?: { total?: number; total_pages?: number; page?: number; per_page?: number; has_next?: boolean; has_previous?: boolean }; message?: string };

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to load activity logs');
      }

      return { rows: mapActivityRows(data.activities), pagination: data.pagination };
    };

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { rows, pagination } = await readEndpoint(ACTIVITY_ENDPOINTS[activeTab], currentPage, perPage, searchTerm);
        if (!active) return;

        setLogs(rows);
        setLogsByTab((prev) => ({ ...prev, [activeTab]: rows }));
        setLastUpdated(new Date());
        if (pagination) {
          setServerTotal(pagination.total ?? rows.length);
          setServerTotalPages(pagination.total_pages ?? 1);
        } else {
          setServerTotal(rows.length);
          setServerTotalPages(1);
        }
      } catch (err) {
        if (!active) return;
        setLogs([]);
        setError(err instanceof Error ? err.message : 'Failed to load activity logs');
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void loadData();
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeTab, currentPage, perPage, searchTerm, reloadToken]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, perPage]);


  const tabCounts = useMemo(() => {
    return {
      all: logsByTab.all?.length ?? logs.length,
      admin: logsByTab.admin?.length ?? logs.filter(l => l.category === 'admin').length,
      client: logsByTab.client?.length ?? logs.filter(l => l.category === 'client').length,
      error: logsByTab.error?.length ?? logs.filter(l => l.category === 'error').length,
    };
  }, [logsByTab, logs]);

  const totalPages = serverTotalPages;
  const safePage = Math.min(currentPage, totalPages);
  const showingStart = logs.length > 0 ? (safePage - 1) * perPage + 1 : 0;
  const showingEnd = logs.length > 0 ? Math.min(showingStart + perPage - 1, serverTotal) : 0;

  // Server already paginates - use logs directly
  const paginatedLogs = logs;


  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {}
  };

  return (
    <>
      <Head>
        <title>Audit Logs & System Activity | Admin Portal</title>
      </Head>

      <div className="w-full min-h-screen bg-[#0c1c59] text-white font-sans antialiased relative overflow-hidden">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-8 relative z-10 space-y-6 md:space-y-8">
          
          {/* HEADER ROW WITH TABS AND SEARCH */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2450b7] pb-6">
            {allowedTabs.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#081d5f] w-full md:w-fit border border-[#2450b7] shadow-[0_20px_60px_rgba(4,15,54,0.2)]">
                {allowedTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const count = tabCounts[tab.id];

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-center gap-2 md:gap-3 px-4 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all duration-300 ${
                        isActive
                          ? "bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-xl shadow-[#d4af37]/20 scale-[1.02] flex-1 md:flex-none"
                          : "text-[#8fb8ff] hover:text-white hover:bg-[#123283] flex-none"
                      }`}
                    >
                      <Icon size={14} />
                      <span className={isActive ? "inline" : "hidden md:inline"}>
                        {tab.label}
                      </span>
                      
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d4af37] transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search user, action, module..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#2450b7] bg-[#081d5f] text-white outline-none focus:border-[#d4af37] transition-all font-bold text-sm shadow-sm placeholder:text-[#8fb8ff]/60"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8fb8ff] hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReloadToken((token) => token + 1)}
                className="p-3 rounded-2xl bg-[#081d5f] border border-[#2450b7] hover:bg-[#123283] hover:text-white text-[#8fb8ff] transition-all shrink-0"
              >
                <RefreshCw size={18} className={loading ? "animate-spin text-[#d4af37]" : ""} />
              </button>
            </div>
          </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* MAIN TABLE CONTAINER */}
          <div className="bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] border border-[#2450b7] rounded-[2.5rem] shadow-[0_30px_80px_rgba(4,15,54,0.25)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Activity size={160} className="text-[#d4af37]" />
            </div>

            <div className="relative z-10">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#081d5f]">
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Log ID</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Time</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">User & Role</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Action Type</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Module</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Record ID</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Category</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2450b7]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-20 text-center">
                        <div className="w-12 h-12 border-4 border-white/10 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Loading audit records...</p>
                      </td>
                    </tr>
                  ) : paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-20 text-center">
                        <Activity className="mx-auto mb-4 text-[#8fb8ff]/30 w-16 h-16" strokeWidth={1} />
                        <p className="mb-2 text-sm font-bold text-white uppercase tracking-widest">No activity records found</p>
                        <p className="text-xs text-[#8fb8ff]">Refine search criteria or select another log category.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const meta = getCategoryMeta(log.category);
                      const initials = getInitials(log.userName);

                      return (
                        <tr key={log.id} className="hover:bg-[#123283]/40 transition-colors group">
                          <td className="px-6 py-4 border-b border-[#2450b7] font-mono text-xs font-bold text-[#d4af37]">
                            #{log.id}
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <div className="inline-flex items-center gap-1.5 text-white text-[11px] font-mono">
                              <Clock size={12} className="text-[#8fb8ff]" />
                              {log.time}
                            </div>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-[#081d5f] border border-[#2450b7] flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs">{log.userName}</div>
                                <div className="text-[10px] text-[#8fb8ff] font-mono uppercase">{log.userRole}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7] font-bold text-white text-xs">
                            {log.actionType}
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <span className="px-2.5 py-1 rounded-lg bg-[#081d5f] text-white border border-[#2450b7] font-mono text-[10px] inline-block">
                              {log.moduleName}
                            </span>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7] font-mono text-[11px] text-[#d4af37]">
                            {log.recordId}
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7]">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border ${meta.style}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>

                          <td className="px-6 py-4 border-b border-[#2450b7] text-right">
                            <button
                              type="button"
                              onClick={() => setInspectRow(log)}
                              className="px-3 py-1.5 rounded-xl bg-[#081d5f] hover:bg-[#123283] text-[#8fb8ff] hover:text-white border border-[#2450b7] transition-all flex items-center gap-1.5 text-[11px] font-bold ml-auto"
                            >
                              <Eye size={12} className="text-[#d4af37]" />
                              <span>Inspect</span>
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
                  Entries <span className="text-white">{showingStart}-{showingEnd}</span> of <span className="text-white">{serverTotal}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Rows</span>
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-[#081d5f] border border-[#2450b7] rounded-lg px-2 py-1 text-[10px] font-black text-[#d4af37] outline-none"
                  >
                    {perPageOptions.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="p-3 rounded-xl border border-[#2450b7] hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-[#081d5f] text-[#8fb8ff]"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="px-4 font-black text-[#8fb8ff] text-xs">
                  PAGE {safePage} OF {totalPages}
                </span>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="p-3 rounded-xl border border-[#2450b7] hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-[#081d5f] text-[#8fb8ff]"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          </div>

        </div>

        {/* AUDIT INSPECTION MODAL */}
        {inspectRow && (
          <div className="fixed inset-0 z-50 bg-[#040f33]/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0c1c59] border border-[#2450b7] rounded-[2rem] p-6 max-w-lg w-full shadow-[0_30px_80px_rgba(4,15,54,0.5)] relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#2450b7]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#081d5f] border border-[#2450b7] flex items-center justify-center text-[#d4af37] shadow-inner">
                    <Terminal size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Audit Event Inspector</h3>
                    <p className="text-[10px] font-mono text-[#d4af37]">Log ID #{inspectRow.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setInspectRow(null)} 
                  className="text-[#8fb8ff] hover:text-white p-2 rounded-xl hover:bg-[#123283] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#081d5f] border border-[#2450b7] shadow-inner">
                  <div>
                    <div className="text-[9px] font-black uppercase text-[#8fb8ff] tracking-widest mb-1">User</div>
                    <div className="font-bold text-white text-xs">{inspectRow.userName}</div>
                    <div className="text-[9px] text-[#8fb8ff] font-mono uppercase mt-0.5">{inspectRow.userRole}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase text-[#8fb8ff] tracking-widest mb-1">Action</div>
                    <div className="font-bold text-white text-xs">{inspectRow.actionType}</div>
                    <div className="text-[9px] text-[#8fb8ff] font-mono uppercase mt-0.5">Module: {inspectRow.moduleName}</div>
                  </div>
                </div>

                <div className="space-y-2.5 px-1">
                  <div className="flex items-center justify-between text-[#8fb8ff]">
                    <span className="font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"><Globe className="w-4 h-4 text-[#d4af37]" /> IP Address</span>
                    <span className="font-mono text-white text-[11px]">{inspectRow.ipAddress}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8fb8ff]">
                    <span className="font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"><FileText className="w-4 h-4 text-[#d4af37]" /> Record Reference</span>
                    <span className="font-mono text-[#d4af37] font-bold text-[11px]">{inspectRow.recordId}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8fb8ff]">
                    <span className="font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"><Clock className="w-4 h-4 text-[#d4af37]" /> Timestamp</span>
                    <span className="font-mono text-white text-[11px]">{inspectRow.time}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#8fb8ff] mb-2 px-1">User Agent Header</div>
                  <div className="p-4 rounded-2xl bg-[#081d5f] border border-[#2450b7] font-mono text-[10px] text-white break-all leading-relaxed max-h-32 overflow-y-auto shadow-inner">
                    {inspectRow.userAgent}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2450b7] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => copyToClipboard(`ID: ${inspectRow.id}\nUser: ${inspectRow.userName}\nAction: ${inspectRow.actionType}\nIP: ${inspectRow.ipAddress}`)}
                  className="px-4 py-3 rounded-xl bg-[#081d5f] hover:bg-[#123283] border border-[#2450b7] text-[#8fb8ff] hover:text-white uppercase font-black text-[10px] tracking-widest transition-all flex items-center gap-2"
                >
                  {copiedIp ? <Check className="w-4 h-4 text-[#d4af37]" /> : <Copy className="w-4 h-4 text-[#d4af37]" />}
                  <span>{copiedIp ? 'Copied' : 'Copy Log Info'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectRow(null)}
                  className="px-6 py-3 rounded-xl bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white uppercase font-black text-[10px] tracking-widest shadow-xl shadow-[#d4af37]/20 hover:scale-[1.02] transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
