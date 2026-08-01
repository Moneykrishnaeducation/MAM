"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Landmark, 
  Clock,
  Activity, 
  Settings, 
  Mail,
  ShieldCheck,
  UserPlus,
  LogOut,
  Search,
  Bell,
  Sparkles
} from 'lucide-react';

export default function AdminSidebar() {
  const router = useRouter();
  const currentPath = router.pathname;
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-admin-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-admin-sidebar', handleToggle);
  }, []);

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/requests', label: 'Pending Requests', icon: Clock, badge: '5' },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/managers', label: 'Managers', icon: UserCheck },
    { href: '/admin/investors', label: 'Investors', icon: Landmark },
    { href: '/admin/mails', label: 'Mails', icon: Mail, badge: '3' },
    { href: '/admin/activity', label: 'Activity', icon: Activity },
    { href: '/admin/admin-users', label: 'Admin Users', icon: ShieldCheck },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside 
        className={`flex flex-col h-screen border-r border-slate-200 z-50 transition-all duration-300 shadow-sm
          fixed md:sticky top-0 left-0
          ${isOpen 
            ? 'w-64 p-5 translate-x-0 opacity-100' 
            : 'w-0 p-0 overflow-hidden opacity-0 -translate-x-full md:translate-x-0 md:w-0 md:p-0 border-none'
          }
        `} 
        style={{ backgroundColor: '#eef4fc' }}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black py-2 px-3.5 rounded-2xl text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] tracking-wider">
              MAM
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">Admin Portal</h2>
              <p className="text-xs text-blue-600 font-medium">Money Krishna Edu</p>
            </div>
          </div>

          {/* Search & Status (Header elements inside Sidebar) */}
          <div className="px-2 mb-6 space-y-3">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 focus-within:border-blue-500/80 transition-all shadow-sm">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none text-slate-800 outline-none w-full text-xs placeholder-slate-400 font-sans"
              />
            </div>
            
            {/* Status & Notifications Row */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
                <Sparkles size={11} className="animate-pulse" />
                <span>MT5: Optimal</span>
              </div>
              
              <button className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-55 px-2 py-1 rounded-lg relative cursor-pointer shadow-sm">
                <Bell size={11} />
                <span>Alerts</span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5">
            <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Admin Menu
            </div>
            {navItems.map((item) => {
              const isActive = currentPath === item.href || (item.href === '/admin/dashboard' && currentPath === '/admin');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-blue-600 border border-slate-200 border-l-4 border-l-blue-500 shadow-md font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:translate-x-1'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon size={19} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin User Card at bottom */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Admin Avatar"
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/20"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-800 truncate">Super Admin</h4>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <ShieldCheck size={12} className="text-blue-500" />
                <span className="truncate">Administrator</span>
              </div>
            </div>
            <button className="text-slate-500 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/60" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
