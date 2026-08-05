import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
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

const activityTabs: Array<{
  id: ActivityCategory;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'all', label: 'All', icon: Activity },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'client', label: 'Client', icon: Users },
  { id: 'error', label: 'Error', icon: AlertTriangle },
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
        className: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
      };
    case 'client':
      return {
        label: 'Client',
        className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      };
    case 'error':
      return {
        label: 'Error',
        className: 'bg-red-500/10 text-red-300 border-red-500/20',
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

export default function AdminActivityPage() {
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

  useEffect(() => {
    let active = true;

    const readEndpoint = async (endpoint: string) => {
      const res = await fetch(endpoint);
      const data = (await res.json().catch(() => ({}))) as { activities?: ActivityApiItem[]; message?: string };

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to load activity logs');
      }

      return mapActivityRows(data.activities);
    };

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const rows = await readEndpoint(ACTIVITY_ENDPOINTS[activeTab]);
        if (!active) return;

        setLogs(rows);
        setLogsByTab((prev) => ({ ...prev, [activeTab]: rows }));

        setLastUpdated(new Date());
      } catch (err) {
        if (!active) return;
        setLogs([]);
        setError(err instanceof Error ? err.message : 'Failed to load activity logs');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [activeTab, reloadToken]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, perPage]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      if (!query) {
        return true;
      }

      return [
        log.id,
        log.userName,
        log.userRole,
        log.actionType,
        log.moduleName,
        log.recordId,
        log.ipAddress,
        log.userAgent,
        log.time,
        log.category,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [logs, searchTerm]);

  const tabCounts = useMemo(() => {
    return {
      all: logsByTab.all?.length ?? 0,
      admin: logsByTab.admin?.length ?? 0,
      client: logsByTab.client?.length ?? 0,
      error: logsByTab.error?.length ?? 0,
    };
  }, [logsByTab]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const showingStart = filteredLogs.length > 0 ? (safePage - 1) * perPage + 1 : 0;
  const showingEnd = filteredLogs.length > 0 ? Math.min(showingStart + perPage - 1, filteredLogs.length) : 0;

  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredLogs.slice(start, start + perPage);
  }, [filteredLogs, perPage, safePage]);

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

  return (
    <>
      <Head>
        <title>Audit Logs & Activity | Admin Portal</title>
      </Head>

      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <Activity size={13} /> Real-Time Audit
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">System Activity Logs</h1>
            <p className="text-slate-400 text-sm mt-1">
              Browse audit events by tab, with the activity table now aligned to the new audit schema.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all self-start md:self-auto"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {activityTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition border ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md border-blue-500/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/15 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  {formatTabCount(count)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800/60 px-4 py-2.5 rounded-2xl w-full md:w-96 border border-slate-700/50">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by user, role, action, module, record..."
                  className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Total: <strong className="text-white">{loading ? '...' : filteredLogs.length}</strong>
              </span>
            </div>

            <div className="text-xs text-slate-500">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for data'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="pb-3 pl-2 font-semibold whitespace-nowrap">Log ID</th>
                  <th className="pb-3 font-semibold whitespace-nowrap">Time</th>
                  <th className="pb-3 font-semibold whitespace-nowrap">User</th>
                  <th className="pb-3 font-semibold whitespace-nowrap">Role</th>
                  <th className="pb-3 font-semibold whitespace-nowrap">Action Type</th>
                  <th className="pb-3 font-semibold whitespace-nowrap">Module</th>
                  <th className="pb-3 font-semibold whitespace-nowrap">Record ID</th>
                  <th className="pb-3 font-semibold whitespace-nowrap">Category</th>
                  <th className="pb-3 font-semibold whitespace-nowrap hidden md:table-cell">IP Address</th>
                  <th className="pb-3 font-semibold whitespace-nowrap hidden lg:table-cell">User Agent</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="py-4 pl-2">
                        <div className="h-4 w-20 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-32 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-32 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-5 w-16 bg-slate-800/60 rounded-full" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-28 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-24 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-24 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4">
                        <div className="h-5 w-16 bg-slate-800/60 rounded-full" />
                      </td>
                      <td className="py-4 hidden md:table-cell">
                        <div className="h-4 w-28 bg-slate-800 rounded-lg" />
                      </td>
                      <td className="py-4 hidden lg:table-cell">
                        <div className="h-4 w-40 bg-slate-800 rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-red-300">
                      {error}
                    </td>
                  </tr>
                ) : paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => {
                    const meta = getCategoryMeta(log.category);

                    return (
                      <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-4 pl-2 font-mono text-blue-400 font-semibold whitespace-nowrap">{log.id}</td>
                        <td className="py-4 whitespace-nowrap text-slate-300">
                          <div className="inline-flex items-center gap-1">
                            <Clock size={11} />
                            {log.time}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="text-slate-100 font-semibold">{log.userName}</div>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.className}`}>
                            {log.userRole}
                          </span>
                        </td>
                        <td className="py-4 text-slate-100 font-semibold">{log.actionType}</td>
                        <td className="py-4 text-slate-300">{log.moduleName}</td>
                        <td className="py-4 font-mono text-blue-300">{log.recordId}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.className}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-4 text-slate-400 hidden md:table-cell whitespace-nowrap">{log.ipAddress}</td>
                        <td className="py-4 hidden lg:table-cell text-slate-400 truncate max-w-[240px]">{log.userAgent}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="mx-auto max-w-sm">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 mb-3">
                          <Activity size={22} />
                        </div>
                        <h3 className="text-sm font-semibold text-white">No activity found</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {searchTerm || activeTab !== 'all'
                            ? 'Try another tab or clear the search to see more logs.'
                            : 'No audit records were returned from the server.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-800 px-0 pt-4 mt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Showing {showingStart} to {showingEnd} of {filteredLogs.length}
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end lg:flex-row lg:items-center lg:gap-6">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor="activity-per-page">
                  Rows per page
                </label>
                <select
                  id="activity-per-page"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 outline-none transition-all hover:bg-slate-700"
                >
                  {perPageOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                <button
                  id="pagination-prev"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={13} /> Prev
                </button>

                {paginationItems.map((pageItem, index) =>
                  pageItem === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="text-slate-600 px-1 text-xs select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageItem}
                      id={`pagination-page-${pageItem}`}
                      onClick={() => setCurrentPage(pageItem)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all border ${
                        pageItem === safePage
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {pageItem}
                    </button>
                  ),
                )}

                <button
                  id="pagination-next"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
