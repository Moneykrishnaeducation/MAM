import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Activity,
  ChevronRight,
  UserPlus,
  PlusCircle,
  FileText,
  DollarSign,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

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

const iconMap: Record<string, any> = {
  'Users': Users,
  'GraduationCap': GraduationCap,
  'TrendingUp': TrendingUp,
  'DollarSign': DollarSign,
  'Activity': Activity
};

function getInitials(name: string) {
  if (!name || name === '-') return 'USR';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function AdminDashboard() {
  const [adminRole, setAdminRole] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    setAdminRole(getAdminRole());
  }, []);

  const isViewer = useMemo(() => isViewerOnly(adminRole) || adminRole.toLowerCase() === 'viewer', [adminRole]);

  const loadDashboardData = (silent = false) => {
    if (!silent) setLoadingData(true);
    fetch('/api/admin/dashboard', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setDashboard(data.dashboard);
          setLastSyncTime(new Date().toLocaleTimeString());
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error("Failed to load dashboard data:", err);
        setIsLoaded(true);
      })
      .finally(() => {
        setLoadingData(false);
      });
  };

  // Real-time auto-polling every 6 seconds for live server status & metrics
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const cards = dashboard?.cards || [
    { title: 'Total Clients', value: '1,248', icon: 'Users' },
    { title: 'Active Investors', value: '852', icon: 'GraduationCap' },
    { title: 'MAM Accounts', value: '142', icon: 'TrendingUp' },
    { title: 'Total Assets', value: '$4,850,200', icon: 'DollarSign' }
  ];
  
  const enrollments = dashboard?.recent_registrations || [];

  const systemHealth = dashboard?.system_health || {
    status: 'Operational',
    status_code: 'online',
    api_server_response_ms: 14.2,
    database_load_pct: 24,
    uptime_percent: 99.9,
    mt5_bridge_status: 'Connected',
    engine_mode: 'Zero-Queue Parallel',
    cached_dedupe_keys: 0
  };

  const isOperational = systemHealth.status_code === 'online' || systemHealth.status === 'Operational';
  const apiLatency = Number(systemHealth.api_server_response_ms || 14.2).toFixed(1);
  const dbLoad = Number(systemHealth.database_load_pct || 24).toFixed(1);
  const apiBarWidth = Math.min(100, Math.max(10, (1 - Number(apiLatency) / 200) * 100));

  return (
    <>
      <Head>
        <title>Admin Dashboard | Money Krishna Education Portal</title>
        <meta name="description" content="MAM Education Admin Management Portal" />
      </Head>

      <div className="w-full min-h-screen bg-[#0c1c59] text-white font-sans antialiased relative overflow-hidden">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className={`p-3 sm:p-4 relative z-10 space-y-3.5 transition-all duration-300 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          

          {/* KEY METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.map((stat: any, index: number) => {
              const IconComponent = iconMap[stat.icon] || Users;
              // Alternate glow colors based on index for a dynamic look
              const glowColor = index % 2 === 0 ? "bg-blue-500" : "bg-[#d4af37]";
              const iconBoxBg = index % 2 === 0 ? "bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "bg-[#d4af37]/15 border-[#d4af37]/30 text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.2)]";

              return (
                <div 
                  key={index} 
                  className="bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] border border-[#113b95] shadow-[0_12px_40px_rgba(4,15,54,0.3)] rounded-[2rem] p-6 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform min-h-[120px]"
                >
                  <div className={`absolute -top-10 -right-10 w-40 h-40 ${glowColor}/10 rounded-full blur-3xl group-hover:${glowColor}/20 transition-all pointer-events-none`} />
                  <div className="relative z-10">
                    <div className="text-blue-300 text-[10px] font-black uppercase tracking-widest mb-1.5">{stat.title}</div>
                    <div className="text-3xl font-black text-white">{stat.value}</div>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 relative z-10 ${iconBoxBg} group-hover:scale-110 transition-transform`}>
                    <IconComponent size={24} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            
            {/* RECENT REGISTRATIONS TABLE */}
            <div className="lg:col-span-2 bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] border border-[#113b95]/60 backdrop-blur-xl rounded-xl p-3.5 sm:p-4 shadow-xl">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#113b95]/60">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <Users size={16} className="text-[#d4af37]" />
                    Recent Client Registrations
                  </h2>
                  <p className="text-[10px] text-blue-300">Newly registered trading accounts and investor profiles</p>
                </div>
                <Link 
                  href="/admin/users" 
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:text-white transition-colors bg-[#040f33]/80 px-2.5 py-1 rounded-lg border border-[#113b95]/60"
                >
                  <span>View Users</span>
                  <ChevronRight size={13} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-blue-300 font-black uppercase tracking-wider text-[9px] border-b border-[#113b95]/60 pb-2">
                      <th className="pb-2 px-2.5">User</th>
                      <th className="pb-2 px-2.5">Country</th>
                      <th className="pb-2 px-2.5">Joined Date</th>
                      <th className="pb-2 px-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#113b95]/60">
                    {enrollments.length > 0 ? (
                      enrollments.map((item: any, idx: number) => {
                        const initials = getInitials(item.name);
                        return (
                          <tr key={idx} className="hover:bg-[#040f33]/40 transition-colors group">
                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-[#113b95]/60 flex items-center justify-center font-bold text-blue-100 text-[9px] shrink-0 group-hover:border-[#d4af37]/40 transition-colors">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-xs">{item.name}</div>
                                  <div className="text-[10px] text-blue-300 font-mono">{item.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-blue-200 font-semibold text-xs flex items-center gap-1.5 mt-1">
                              <Globe size={12} className="text-blue-400" />
                              {item.country || 'N/A'}
                            </td>
                            <td className="py-2.5 px-2.5 text-blue-300 font-mono text-[10px]">{item.joined || item.date || 'Recent'}</td>
                            <td className="py-2.5 px-2.5 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                item.status === 'Completed' || item.status === 'Active'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${item.status === 'Completed' || item.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-blue-300 text-xs">
                          No recent registrations recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SIDEBAR: QUICK ACTIONS & SYSTEM HEALTH */}
            <div className="space-y-3.5">
              
              {/* QUICK ADMIN ACTIONS (Mutating buttons hidden for Viewer role) */}
              <div className="bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] border border-[#113b95]/60 backdrop-blur-xl rounded-xl p-3.5 sm:p-4 shadow-xl">
                <h2 className="text-sm font-bold text-white uppercase tracking-tight mb-0.5 flex items-center gap-2">
                  <Zap size={15} className="text-[#d4af37]" />
                  Quick Navigation
                </h2>
                <p className="text-[10px] text-blue-300 mb-3">Operational administrative shortcuts</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {!isViewer && (
                    <Link 
                      href="/admin/users" 
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 border border-[#113b95]/40 hover:border-[#d4af37]/40 hover:bg-[#040f33]/60 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                        <UserPlus size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-100 group-hover:text-white">Add New Client</div>
                        <div className="text-[10px] text-blue-400">Register new client user</div>
                      </div>
                    </Link>
                  )}

                  {!isViewer && (
                    <Link 
                      href="/admin/admin-users" 
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 border border-[#113b95]/40 hover:border-[#d4af37]/40 hover:bg-[#040f33]/60 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] shrink-0 group-hover:scale-105 transition-transform">
                        <PlusCircle size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-100 group-hover:text-white">New Admin User</div>
                        <div className="text-[10px] text-blue-400">Create administrator account</div>
                      </div>
                    </Link>
                  )}

                  <Link 
                    href="/admin/activity" 
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 border border-[#113b95]/40 hover:border-[#d4af37]/40 hover:bg-[#040f33]/60 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-100 group-hover:text-white">Audit Activity Logs</div>
                      <div className="text-[10px] text-blue-400">Inspect system operation feed</div>
                    </div>
                  </Link>

                  <Link 
                    href="/admin/requests" 
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 border border-[#113b95]/40 hover:border-[#d4af37]/40 hover:bg-[#040f33]/60 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-100 group-hover:text-white">Pending Requests</div>
                      <div className="text-[10px] text-blue-400">Approvals & verification queue</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* DYNAMIC REAL-TIME SERVER NODE STATUS CARD */}
              <div className="bg-[linear-gradient(180deg,#071a57_0%,#0a205f_100%)] border border-[#113b95]/60 backdrop-blur-xl rounded-xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#113b95]/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                      <Server size={14} className="text-[#d4af37]" /> Live Server Status
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadDashboardData(true)}
                      title="Refresh real-time server metrics"
                      className="p-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white transition-all border border-blue-500/20 active:scale-95"
                    >
                      <RefreshCw size={12} className={loadingData ? "animate-spin text-[#d4af37]" : ""} />
                    </button>

                    <span className={`inline-flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${
                      isOperational 
                        ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' 
                        : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOperational ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                      {systemHealth.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 text-xs">
                  {/* API RESPONSE LATENCY BAR */}
                  <div>
                    <div className="flex justify-between text-blue-200 text-[11px] font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Zap size={11} className="text-blue-400" /> API Server Response
                      </span>
                      <span className={`font-mono font-bold ${Number(apiLatency) < 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {apiLatency} ms
                      </span>
                    </div>
                    <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden border border-blue-500/10">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          Number(apiLatency) < 50 
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' 
                            : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        }`}
                        style={{ width: `${apiBarWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* DATABASE MEMORY LOAD BAR */}
                  <div>
                    <div className="flex justify-between text-blue-200 text-[11px] font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Activity size={11} className="text-[#d4af37]" /> Database Load
                      </span>
                      <span className="text-[#d4af37] font-mono font-bold">{dbLoad}%</span>
                    </div>
                    <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden border border-blue-500/10">
                      <div 
                        className="bg-gradient-to-r from-[#d4af37] to-[#b38728] h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                        style={{ width: `${Math.min(100, Math.max(5, Number(dbLoad)))}%` }}
                      />
                    </div>
                  </div>

                  {/* MT5 COPY ENGINE BRIDGE STATUS */}
                  <div className="pt-2 border-t border-[#113b95]/40 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 text-blue-300">
                      <ShieldCheck size={12} className="text-emerald-400" />
                      <span>MT5 Bridge:</span>
                      <span className="font-bold text-white">{systemHealth.mt5_bridge_status || 'Connected'}</span>
                    </div>
                    {systemHealth.cached_dedupe_keys !== undefined && (
                      <div className="bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 text-blue-300 font-mono">
                        {systemHealth.cached_dedupe_keys} Cached Keys
                      </div>
                    )}
                  </div>

                  {/* REAL-TIME SYNC FOOTER */}
                  <div className="flex items-center justify-between text-[9px] text-blue-400/80 pt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></span>
                      Live Auto-Refresh (6s)
                    </span>
                    {lastSyncTime && <span>Updated: {lastSyncTime}</span>}
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </>
  );
}

  