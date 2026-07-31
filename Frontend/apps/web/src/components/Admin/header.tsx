import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Bell, Shield, Sparkles } from 'lucide-react';

export default function AdminHeader() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notifications = [
    { id: 1, text: 'New MAM Account deposit request ($10,000.00)', time: '10m ago', unread: true },
    { id: 2, text: 'MT5 Server trade sync & profit allocation completed', time: '1h ago', unread: true },
    { id: 3, text: 'Manager "Robert Vance" requested leverage adjustment', time: '3h ago', unread: false },
  ];

  return (
    <header className="h-20 flex items-center justify-between px-6 md:px-8 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-30 w-full">
      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-2.5 rounded-2xl w-64 md:w-96 border border-slate-700/50 transition-all duration-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-inner">
        <Search size={18} className="text-slate-400 shrink-0" />
        <input 
          type="text" 
          placeholder="Search MAM accounts, managers, investors..." 
          className="bg-transparent border-none text-slate-100 outline-none w-full text-sm placeholder-slate-400 font-sans"
        />
      </div>

      {/* Right Action Icons & Badges */}
      <div className="flex items-center gap-4">
        {/* System Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Sparkles size={14} className="animate-pulse" />
          <span>MT5 Server: Optimal</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="bg-slate-800/70 border border-slate-700/60 text-slate-300 cursor-pointer relative transition-all duration-200 p-2.5 rounded-xl hover:text-slate-50 hover:bg-slate-800 hover:border-slate-600"
            aria-label="Notifications"
          >
            <Bell size={19} />
            <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] font-bold h-4 min-w-4 rounded-full flex items-center justify-center px-1 ring-2 ring-slate-900">
              2
            </span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-100">Notifications</h3>
                <span className="text-xs text-blue-400 font-medium cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="divide-y divide-slate-700/50 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3.5 hover:bg-slate-700/40 transition-colors text-xs ${n.unread ? 'bg-blue-500/5' : ''}`}>
                    <p className="text-slate-200 font-medium mb-1">{n.text}</p>
                    <span className="text-slate-400">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge / User Profile */}
        <Link 
          href="/admin/profile"
          className="flex items-center gap-3 pl-3 border-l border-slate-800 hover:opacity-80 transition-opacity cursor-pointer decoration-none"
        >
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold text-slate-200">MAM Super Admin</div>
            <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
              <Shield size={11} className="text-blue-400" /> Full Access
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
            alt="Admin Profile" 
            className="w-9 h-9 rounded-xl border-2 border-blue-500/60 object-cover shadow-sm"
          />
        </Link>
      </div>
    </header>
  );
}
