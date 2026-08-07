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
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Sparkles,
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const cards = dashboard?.cards || [
    { title: 'Total Clients', value: '1,248', icon: 'Users' },
    { title: 'Active Investors', value: '852', icon: 'GraduationCap' },
    { title: 'MAM Accounts', value: '142', icon: 'TrendingUp' },
    { title: 'Total Assets', value: '$4,850,200', icon: 'DollarSign' }
  ];
  
  const enrollments = dashboard?.recent_registrations || [];

  return (
    <>
      <Head>
        <title>Admin Dashboard | Money Krishna Education Portal</title>
        <meta name="description" content="MAM Education Admin Management Portal" />
      </Head>

      <div className="w-full text-slate-100 font-sans antialiased">
        {/* Ambient decorative glow rings */}
        <div className="fixed top-12 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-12 right-1/3 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className={`max-w-7xl mx-auto p-3 sm:p-4 relative z-10 space-y-3.5 transition-all duration-300 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          
          {/* HEADER BANNER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-blue-600/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-inner shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#e6c687] text-[9px] font-black uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" /> Real-Time Command Center
                </div>
                <h1 className="text-lg font-black tracking-tight text-white uppercase">
                  Executive Dashboard
                </h1>
                <p className="text-[11px] text-slate-400">
                  Platform operational metrics, client onboarding flow, and gateway node status.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadDashboardData()}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all hover:border-[#d4af37]/40"
              >
                <RefreshCw size={13} className={loadingData ? "animate-spin text-[#d4af37]" : ""} />
                <span>Refresh Metrics</span>
              </button>
            </div>
          </div>

          {/* KEY METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.map((stat: any, index: number) => {
              const IconComponent = iconMap[stat.icon] || Users;
              return (
                <div 
                  key={index} 
                  className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3.5 shadow-lg flex items-center justify-between group hover:border-[#d4af37]/40 transition-all"
                >
                  <div>
                    <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">{stat.title}</div>
                    <div className="text-xl font-black text-white mt-0.5">{stat.value}</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-[#d4af37] shrink-0 group-hover:scale-105 transition-transform">
                    <IconComponent size={18} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            
            {/* RECENT REGISTRATIONS TABLE */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3.5 sm:p-4 shadow-xl">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <Users size={16} className="text-[#d4af37]" />
                    Recent Client Registrations
                  </h2>
                  <p className="text-[10px] text-slate-400">Newly registered trading accounts and investor profiles</p>
                </div>
                <Link 
                  href="/admin/users" 
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:text-white transition-colors bg-slate-800/80 px-2.5 py-1 rounded-lg border border-white/10"
                >
                  <span>View Users</span>
                  <ChevronRight size={13} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase tracking-wider text-[9px] border-b border-white/10 pb-2">
                      <th className="pb-2 px-2.5">User</th>
                      <th className="pb-2 px-2.5">Country</th>
                      <th className="pb-2 px-2.5">Joined Date</th>
                      <th className="pb-2 px-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {enrollments.length > 0 ? (
                      enrollments.map((item: any, idx: number) => {
                        const initials = getInitials(item.name);
                        return (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-slate-200 text-[9px] shrink-0 group-hover:border-[#d4af37]/40 transition-colors">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-100 text-xs">{item.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{item.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-300 font-semibold text-xs flex items-center gap-1.5 mt-1">
                              <Globe size={12} className="text-slate-500" />
                              {item.country || 'N/A'}
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-400 font-mono text-[10px]">{item.joined || item.date || 'Recent'}</td>
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
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
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
              <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3.5 sm:p-4 shadow-xl">
                <h2 className="text-sm font-bold text-white uppercase tracking-tight mb-0.5 flex items-center gap-2">
                  <Zap size={15} className="text-[#d4af37]" />
                  Quick Navigation
                </h2>
                <p className="text-[10px] text-slate-400 mb-3">Operational administrative shortcuts</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {!isViewer && (
                    <Link 
                      href="/admin/users" 
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-[#d4af37]/40 hover:bg-slate-800/60 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                        <UserPlus size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-white">Add New Client</div>
                        <div className="text-[10px] text-slate-500">Register new client user</div>
                      </div>
                    </Link>
                  )}

                  {!isViewer && (
                    <Link 
                      href="/admin/admin-users" 
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-[#d4af37]/40 hover:bg-slate-800/60 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] shrink-0 group-hover:scale-105 transition-transform">
                        <PlusCircle size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-white">New Admin User</div>
                        <div className="text-[10px] text-slate-500">Create administrator account</div>
                      </div>
                    </Link>
                  )}

                  <Link 
                    href="/admin/activity" 
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-[#d4af37]/40 hover:bg-slate-800/60 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-white">Audit Activity Logs</div>
                      <div className="text-[10px] text-slate-500">Inspect system operation feed</div>
                    </div>
                  </Link>

                  <Link 
                    href="/admin/requests" 
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-[#d4af37]/40 hover:bg-slate-800/60 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-white">Pending Requests</div>
                      <div className="text-[10px] text-slate-500">Approvals & verification queue</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* SYSTEM HEALTH METRICS CARD */}
              <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-xl p-3.5 sm:p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Server size={14} className="text-[#d4af37]" /> Server Node Status
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black text-emerald-400 tracking-widest bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Operational
                  </span>
                </div>
                
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] font-semibold mb-1">
                      <span>API Server Response</span>
                      <span className="text-emerald-400 font-mono">18 ms</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full w-[95%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] font-semibold mb-1">
                      <span>Database Memory</span>
                      <span className="text-[#d4af37] font-mono">32%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#d4af37] to-[#b38728] h-1.5 rounded-full w-[32%]"></div>
                    </div>
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
