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
  Sparkles,
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
  { id: 'all', label: 'All Events', icon: Activity },
  { id: 'admin', label: 'Admin Log', icon: ShieldCheck },
  { id: 'client', label: 'Client Log', icon: Users },
  { id: 'error', label: 'System Errors', icon: AlertTriangle },
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

  const paginationItems = useMemo<Array<number | 'ellipsis'>>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items: Array<number | 'ellipsis'> = [1];
    const leftSibling = Math.max(2, safePage - 1);
    const rightSibling = Math.min(totalPages - 1, safePage + 1);

    if (leftSibling > 2) {
      items.push('ellipsis');
    }

    for (let page = leftSibling; page <= rightSibling; page += 1) {
      items.push(page);
    }

    if (rightSibling < totalPages - 1) {
      items.push('ellipsis');
    }

    items.push(totalPages);
    return items;
  }, [safePage, totalPages]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {}
  };

  const roleLower = adminRole.toLowerCase();
  const isViewer = roleLower === 'viewer';
  const isAdmin = roleLower === 'admin';

  return (
    <>
      <Head>
        <title>Audit Logs & System Activity | Admin Portal</title>
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
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#e6c687] text-[9px] font-black uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" /> Real-Time Audit Engine
                </div>
                <h1 className="text-lg font-black tracking-tight text-white uppercase">
                  {isViewer ? 'Client Activity Audit Logs' : 'System Audit Logs'}
                </h1>
                <p className="text-[11px] text-slate-400">
                  {isViewer 
                    ? 'Inspect client activity events and operational API logs.'
                    : 'Inspect administrative actions, client API calls, security events, and system errors.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReloadToken((token) => token + 1)}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all hover:border-[#d4af37]/40"
              >
                <RefreshCw size={13} className={loading ? "animate-spin text-[#d4af37]" : ""} />
                <span>Refresh Logs</span>
              </button>
            </div>
          </div>

          {/* SUMMARY STAT CARDS */}
          <div className={`grid gap-3 ${
            isViewer ? 'grid-cols-1 max-w-xs' : isAdmin ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
          }`}>
            {!isViewer && (
              <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Total Audit Events</div>
                  <div className="text-lg font-black text-white mt-0.5">{tabCounts.all} <span className="text-[9px] text-slate-500 font-semibold uppercase">Logs</span></div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Activity size={16} />
                </div>
              </div>
            )}

            {!isViewer && (
              <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Admin Operations</div>
                  <div className="text-lg font-black text-[#d4af37] mt-0.5">{tabCounts.admin} <span className="text-[9px] text-slate-500 font-semibold uppercase">Actions</span></div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] shrink-0">
                  <ShieldCheck size={16} />
                </div>
              </div>
            )}

            <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Client Events</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">{tabCounts.client} <span className="text-[9px] text-slate-500 font-semibold uppercase">Events</span></div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Users size={16} />
              </div>
            </div>

            {!isViewer && !isAdmin && (
              <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-md flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">System Errors</div>
                  <div className="text-lg font-black text-red-400 mt-0.5">{tabCounts.error} <span className="text-[9px] text-slate-500 font-semibold uppercase">Logged</span></div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle size={16} />
                </div>
              </div>
            )}
          </div>

          {/* TAB BAR (Render only allowed tabs for current role) */}
          {allowedTabs.length > 1 && (
            <div className="flex items-center gap-1 p-1 rounded-xl border bg-slate-900/90 border-white/10 w-fit backdrop-blur-md overflow-x-auto max-w-full">
              {allowedTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id];

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md font-bold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon size={13} className={isActive ? "text-[#d4af37]" : ""} />
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {formatTabCount(count)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* MAIN TABLE CONTAINER */}
          <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3 sm:p-4 shadow-xl">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-white/10">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user, action, module, IP, record ID..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37] transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[10px] text-slate-400 font-mono px-2.5 py-1 rounded-lg bg-slate-950/40 border border-white/5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#d4af37]" />
                  {lastUpdated ? `Refreshed ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Syncing...'}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                    <th className="pb-2 px-2.5">Log ID</th>
                    <th className="pb-2 px-2.5">Time</th>
                    <th className="pb-2 px-2.5">User & Role</th>
                    <th className="pb-2 px-2.5">Action Type</th>
                    <th className="pb-2 px-2.5">Module</th>
                    <th className="pb-2 px-2.5">Record ID</th>
                    <th className="pb-2 px-2.5">Category</th>
                    <th className="pb-2 px-2.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading audit records...</p>
                      </td>
                    </tr>
                  ) : paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <Activity className="mx-auto mb-1.5 text-slate-600 h-6 w-6" />
                        <p className="mb-0.5 text-xs font-bold text-white">No activity records found</p>
                        <p className="text-[10px] text-slate-500">Refine search criteria or select another log category.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const meta = getCategoryMeta(log.category);
                      const initials = getInitials(log.userName);

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="py-2 px-2.5 font-mono text-xs font-bold text-[#d4af37]">
                            #{log.id}
                          </td>

                          <td className="py-2 px-2.5">
                            <div className="inline-flex items-center gap-1 text-slate-300 text-[10px] font-mono">
                              <Clock size={11} className="text-slate-500" />
                              {log.time}
                            </div>
                          </td>

                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0 group-hover:border-[#d4af37]/40 transition-colors">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-100 text-xs">{log.userName}</div>
                                <div className="text-[9px] text-slate-400 font-mono uppercase">{log.userRole}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-2 px-2.5 font-bold text-slate-100 text-xs">
                            {log.actionType}
                          </td>

                          <td className="py-2 px-2.5">
                            <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-white/10 font-mono text-[10px] inline-block">
                              {log.moduleName}
                            </span>
                          </td>

                          <td className="py-2 px-2.5 font-mono text-[10px] text-[#d4af37]">
                            {log.recordId}
                          </td>

                          <td className="py-2 px-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${meta.style}`}>
                              <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>

                          <td className="py-2 px-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectRow(log)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 text-[11px] font-semibold ml-auto hover:border-[#d4af37]/40"
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

            {/* PAGINATION FOOTER */}
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3 mt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
              <div className="text-slate-400 font-mono text-[10px]">
                Showing <span className="font-bold text-slate-200">{showingStart}</span> to <span className="font-bold text-slate-200">{showingEnd}</span> of <span className="font-bold text-slate-200">{serverTotal}</span> entries
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[10px] font-semibold">Rows:</span>
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950/80 px-2 py-0.5 text-xs font-bold text-slate-200 outline-none transition-all cursor-pointer"
                  >
                    {perPageOptions.map((size) => (
                      <option key={size} value={size} className="bg-slate-900 text-slate-200">
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safePage === 1}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>

                  {paginationItems.map((pageItem, index) =>
                    pageItem === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className="text-slate-600 px-1 text-xs select-none">
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageItem}
                        onClick={() => setCurrentPage(pageItem)}
                        className={`w-6 h-6 rounded-lg text-xs font-bold transition-all border ${
                          pageItem === safePage
                            ? 'bg-gradient-to-r from-[#d4af37] to-[#b38728] border-transparent text-slate-950 font-black shadow-md'
                            : 'bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {pageItem}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safePage === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* AUDIT INSPECTION MODAL */}
        {inspectRow && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center text-[#d4af37]">
                    <Terminal size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight">Audit Event Inspector</h3>
                    <p className="text-[10px] font-mono text-[#d4af37]">Log ID #{inspectRow.id}</p>
                  </div>
                </div>
                <button onClick={() => setInspectRow(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                  <div>
                    <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5">User</div>
                    <div className="font-bold text-slate-100">{inspectRow.userName}</div>
                    <div className="text-[9px] text-slate-500 font-mono">{inspectRow.userRole}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Action</div>
                    <div className="font-bold text-slate-100">{inspectRow.actionType}</div>
                    <div className="text-[9px] text-slate-500 font-mono">Module: {inspectRow.moduleName}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#d4af37]" /> IP Address</span>
                    <span className="font-mono text-slate-200">{inspectRow.ipAddress}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#d4af37]" /> Record Reference</span>
                    <span className="font-mono text-[#d4af37] font-bold">{inspectRow.recordId}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#d4af37]" /> Timestamp</span>
                    <span className="font-mono text-slate-200">{inspectRow.time}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">User Agent Header</div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5 font-mono text-[10px] text-slate-300 break-all leading-relaxed max-h-24 overflow-y-auto">
                    {inspectRow.userAgent}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-2.5 border-t border-white/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(`ID: ${inspectRow.id}\nUser: ${inspectRow.userName}\nAction: ${inspectRow.actionType}\nIP: ${inspectRow.ipAddress}`)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedIp ? 'Copied' : 'Copy Log Info'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectRow(null)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 font-black text-xs shadow-md transition-all"
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
